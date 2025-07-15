// src/Services/ProjectService.js
const Project = require("../Model/Project.js");
const axios   = require("axios");
const { uploadFileToGCS, deleteFileFromGCS } = require("../utills/gcpSetup.js");
const redis   = require("../utills/redisClient.js");

const userServiceUrl = process.env.USER_SERVICE_URL;
const CACHE_TTL      = 60 * 60 * 24;         // 24 h
const PAGE_SIZE_DEF  = 15;
const TYPE_LIST      = ["unknown","Movie","DRAMA","Documentary","Action","Islamic","Cartoon"];
const STATUS_LIST    = ["Pending","In Progress","Completed","Planning","On Hold"];
const PRIORITY_LIST  = ["High","Medium","Low"];

/* ─────────────────────  helpers ───────────────────── */

const getUserFromService = async (userId) => {
  const key = `user:external:${userId}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  try {
    const { data } = await axios.get(`${userServiceUrl}/api/auth/users/${userId}`, { timeout: 3000 });
    if (data?.user) await redis.set(key, JSON.stringify(data.user), "EX", CACHE_TTL);
    return data.user ?? null;
  } catch (e) {
    console.error("User‑service fetch error:", e.message);
    return null;
  }
};

/* ─────────────────────  DB fetchers (no cache) ───────────────────── */

const dbAllProjects = async () => {
  const rows = await Project.findAll({
    attributes: ["id","name","description","deadline","status","priority","progress","project_image",
                 "project_type","channel","created_at","updated_at","created_by"]
  });

  return Promise.all(rows.map(async (p) => {
    const u = await getUserFromService(p.created_by);
    return { ...p.toJSON(),
      creator_id            : u?.id   ?? null,
      creator_name          : u?.name ?? "Unknown",
      creator_email         : u?.email?? "Unknown",
      creator_role          : u?.role ?? "Unknown",
      creator_profile_image : u?.profile_image ?? null
    };
  }));
};

const dbSingleProject = async (id) => {
  const proj = await Project.findByPk(id);
  if (!proj) throw new Error("Project not found");
  const u = await getUserFromService(proj.created_by);
  return { ...proj.toJSON(),
    creator_id            : u?.id   ?? null,
    creator_name          : u?.name ?? "Unknown",
    creator_email         : u?.email?? "Unknown",
    creator_role          : u?.role ?? "Unknown",
    creator_profile_image : u?.profile_image ?? null
  };
};

const dbProjectsByType = async (type, page, size) => {
  const offset = (page - 1) * size;
  const { rows, count } = await Project.findAndCountAll({
    where: { project_type: type },
    offset,
    limit : size,
    attributes: ["id","name","description","deadline","status","priority",
                 "progress","project_image","project_type","channel",
                 "created_at","updated_at","created_by"]
  });
  return { projects: rows, total: count, page, pageSize: size, totalPages: Math.ceil(count/size) };
};

const dbProjectDetails = async () => {
  const res = {};
  for (const t of TYPE_LIST) {
    res[t] = {};
    for (const s of STATUS_LIST) {
      res[t][s] = await Project.count({ where:{ project_type:t, status:s } });
    }
  }
  return res;
};

/* ─────────────────────  cache getters (fallback) ───────────────────── */

const cachedOrBuild = async (key, builder) => {
  const c = await redis.get(key);
  if (c) return JSON.parse(c);
  const fresh = await builder();
  await redis.set(key, JSON.stringify(fresh), "EX", CACHE_TTL);
  return fresh;
};

const getAllProjects      = () => cachedOrBuild("projects:all", dbAllProjects);
const getSingleProject    = (id) => cachedOrBuild(`project:${id}`, () => dbSingleProject(id));
const getProjectsByType   = (t,p=1,s=PAGE_SIZE_DEF) =>
  cachedOrBuild(`projects:type:${t}:page:${p}:size:${s}`, () => dbProjectsByType(t,p,s));
const allProjectDetails   = () => cachedOrBuild("projects:details", dbProjectDetails);
const getProjectCountWithCache = () => cachedOrBuild("projects:count", () => Project.count());

const DashboardData = async () => ({ totalProjects: await getProjectCountWithCache() });

/* ─────────────────────  mutations + cache clear ───────────────────── */

const clearProjectCache = async () => {
  await redis.del("projects:all","projects:count","projects:details");
  const keys = [];
  for (const t of TYPE_LIST) keys.push(`projects:type:${t}:page:1:size:${PAGE_SIZE_DEF}`);
  const projKeys = await redis.keys("project:*"); // clear individual project caches
  await redis.del(...keys, ...projKeys);
};

const createProject = async (body, file) => {
  const { name, description, deadline, created_by,
          status, priority, progress, project_type, channel } = body;

  if (!name || !description || !deadline || !created_by)
    throw new Error("Required fields missing");
  if (isNaN(created_by)) throw new Error("created_by must be numeric");
  const d = new Date(deadline); if (isNaN(d)) throw new Error("Invalid deadline");
  if (status   && !STATUS_LIST.includes(status))     throw new Error("Invalid status");
  if (priority && !PRIORITY_LIST.includes(priority)) throw new Error("Invalid priority");
  const prog = progress===undefined ? 0 : Number(progress);
  if (isNaN(prog) || prog<0 || prog>100) throw new Error("Invalid progress");

  if (!await getUserFromService(created_by)) throw new Error("User not found");

  const img = file ? await uploadFileToGCS(file) : null;

  const project = await Project.create({
    name, description, deadline:d, created_by,
    status: status||"Pending", priority: priority||"Medium",
    progress: prog, project_type: project_type||"unknown",
    channel: channel||null, project_image: img
  });
  await clearProjectCache();
  refreshProjectCache();  // async refresh (no await) to rebuild quickly
  return project;
};

const updateProject = async (id, body, file) => {
  const proj = await Project.findByPk(id);
  if (!proj) throw new Error("Project not found");

  let img = proj.project_image;
  if (file) {
    if (img) await deleteFileFromGCS(img);
    img = await uploadFileToGCS(file);
  }

  await Project.update({
    name        : body.name        ?? proj.name,
    description : body.description ?? proj.description,
    deadline    : body.deadline    ?? proj.deadline,
    status      : body.status      ?? proj.status,
    priority    : body.priority    ?? proj.priority,
    progress    : body.progress    ?? proj.progress,
    project_type: body.project_type?? proj.project_type,
    project_image: img
  },{ where:{ id }});

  await clearProjectCache();
  refreshProjectCache();
  return Project.findByPk(id);
};

const deleteProject = async (id) => {
  const proj = await Project.findByPk(id);
  if (!proj) throw new Error("Project not found");

  if (proj.project_image) await deleteFileFromGCS(proj.project_image);
  await Project.destroy({ where:{ id } });
  await clearProjectCache();
  refreshProjectCache();
  return true;
};

 
const refreshProjectCache = async () => {
  try {
    await Promise.all([
      redis.set("projects:count", await Project.count(), "EX", CACHE_TTL),
      (async () => {
        const all = await dbAllProjects();
        await redis.set("projects:all", JSON.stringify(all), "EX", CACHE_TTL);
      })(),
      (async () => {
        for (const t of TYPE_LIST) {
          const data = await dbProjectsByType(t,1,PAGE_SIZE_DEF);
          await redis.set(`projects:type:${t}:page:1:size:${PAGE_SIZE_DEF}`, JSON.stringify(data), "EX", CACHE_TTL);
        }
      })(),
      (async () => {
        const det = await dbProjectDetails();
        await redis.set("projects:details", JSON.stringify(det), "EX", CACHE_TTL);
      })(),
    ]);
    console.log("✅ Project cache fully rebuilt");
  } catch (e) {
    console.error("Cache rebuild failed:", e.message);
  }
};

const getProjectsByTypePost = async (project_type, page = 1) => {
  const PAGE_SIZE = 50;
  const offset = (page - 1) * PAGE_SIZE;

  const { rows: projects, count: total } = await Project.findAndCountAll({
    where: { project_type: project_type },
    attributes: ["id","name","description","deadline","status","priority",
                 "progress","project_image","project_type","channel",
                 "created_at","updated_at","created_by"],
    limit: PAGE_SIZE,
    offset: offset,
    order: [['created_at', 'DESC']]
  });

  const projectsWithUsers = await Promise.all(projects.map(async (p) => {
    const u = await getUserFromService(p.created_by);
    return { ...p.toJSON(),
      creator_name          : u?.name ?? "Unknown",
    };
  }));

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return {
    projects: projectsWithUsers,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
    project_type
  };
}

 
module.exports = {
  createProject,
  updateProject,
  deleteProject,
  getAllProjects,
  getSingleProject,
  getProjectsByType,
  allProjectDetails,
  DashboardData,
  getProjectsByTypePost,
  refreshProjectCache,
};
