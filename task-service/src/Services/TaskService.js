const Task = require("../Model/TasksModel.js");
const axios = require("axios");
const redis = require("../utills/redisClient.js");
const { uploadFileToGCS, deleteFileFromGCS } = require("../utills/gcpSetup.js");

const projectServiceUrl = process.env.PROJECT_SERVICE_URL;

const TASK_COUNT_KEY = "tasks:count";
const TASK_CACHE_TTL = 60 * 60 * 24; // 24 hours

const checkProjectExists = async (project_id) => {
  if (!project_id || project_id === "undefined" || isNaN(parseInt(project_id))) {
    return { success: false, message: "Invalid project ID provided" };
  }

  try {
    const response = await axios.get(`${projectServiceUrl}/api/project/singleProject/${project_id}`);
    if (response?.data?.success && response.data.project) {
      return { success: true, project: response.data.project };
    }
    return { success: false, message: "Project not found" };
  } catch (err) {
    return { success: false, message: "Project not found", error: err.message };
  }
};

// 🧹 Clear task cache
const clearTaskCache = async () => {
  const keys = await redis.keys("tasks:*");
  if (keys.length > 0) await redis.del(...keys);
};

// 🔄 Refresh cron (for dashboard or analytics)
const refreshTaskCache = async () => {
  const count = await Task.count();
  await redis.set(TASK_COUNT_KEY, count, "EX", TASK_CACHE_TTL);
};

// 🆕 Create
const createTask = async (data, file) => {
  const { title, description, project_id, status, priority, deadline, estimated_hours } = data;

  if (!title || !project_id) return { success: false, message: "Title and Project ID are required" };
  if (estimated_hours && estimated_hours <= 0)
    return { success: false, message: "Estimated hours must be greater than 0" };

  const projectCheck = await checkProjectExists(project_id);
  if (!projectCheck.success) return { success: false, message: projectCheck.message };

  let file_url = "";
  if (file) file_url = await uploadFileToGCS(file);

  const newTask = await Task.create({
    title,
    description,
    project_id,
    status: status || "To Do",
    priority: priority || "Medium",
    deadline,
    estimated_hours,
    file_url,
  });

  await redis.del(TASK_COUNT_KEY);
  await redis.del("tasks:all");
  await redis.del(`tasks:project:${project_id}`);

  // Invalidate all paginated caches for this project
  const keys = await redis.keys(`tasks:project:${project_id}:page:*:size:*`);
  if (keys.length > 0) await redis.del(...keys);

  return { success: true, message: "Task created successfully", task: newTask };
};

// 🔍 Single Task
const getSingleTask = async (id) => {
  const key = `task:${id}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const task = await Task.findByPk(id);
  if (!task) return { success: false, message: "Task not found" };

  const projectCheck = await checkProjectExists(task.project_id);
  const result = {
    success: true,
    task: {
      ...task.get(),
      project: projectCheck.success ? projectCheck.project : null,
    },
  };

  await redis.set(key, JSON.stringify(result), "EX", TASK_CACHE_TTL);
  return result;
};

// 📋 All Tasks
const getAllTasks = async () => {
  const key = "tasks:all";
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const tasks = await Task.findAll();

  const withProject = await Promise.all(
    tasks.map(async (t) => {
      const p = await checkProjectExists(t.project_id);
      return {
        ...t.get(),
        project: p.success ? p.project : null,
      };
    })
  );

  const result = { success: true, tasks: withProject };
  await redis.set(key, JSON.stringify(result), "EX", TASK_CACHE_TTL);
  return result;
};

// 🧮 Count
const getTaskCount = async () => {
  const cached = await redis.get(TASK_COUNT_KEY);
  if (cached !== null) return parseInt(cached, 10);

  const count = await Task.count();
  await redis.set(TASK_COUNT_KEY, count, "EX", TASK_CACHE_TTL);
  return count;
};

<<<<<<< HEAD
const deleteTask = async (id, page) => {
  const PAGE_SIZE = 50; 

=======
// 🗑️ Delete
const deleteTask = async (id) => {
>>>>>>> parent of 2d23c43 (v0.01)
  const task = await Task.findByPk(id);
  if (!task) return { success: false, message: "Task not found" };

  if (task.file_url) {
    try {
      await deleteFileFromGCS(task.file_url);
    } catch (e) {
      console.warn("Failed to delete file:", e.message);
    }
  }

  await task.destroy();

<<<<<<< HEAD
   await redis.del(`task:${id}`);
=======
  await redis.del(`task:${id}`);
>>>>>>> parent of 2d23c43 (v0.01)
  await redis.del("tasks:all");
  await redis.del(`tasks:project:${task.project_id}`);
  await redis.del(TASK_COUNT_KEY);

  // Invalidate all paginated caches for this project
  const keys = await redis.keys(`tasks:project:${task.project_id}:page:*:size:*`);
  if (keys.length > 0) await redis.del(...keys);

  return { success: true, message: "Task deleted" };
};

// ✏️ Update
const updateTask = async (id, data, file) => {
  const task = await Task.findByPk(id);
  if (!task) return { success: false, message: "Task not found" };

  const { project_id: newProjectId } = data;

  if (newProjectId && newProjectId !== task.project_id) {
    const check = await checkProjectExists(newProjectId);
    if (!check.success) return { success: false, message: check.message };
  }

  let file_url = task.file_url;
  if (file) {
    file_url = await uploadFileToGCS(file);
    if (task.file_url) {
      try {
        await deleteFileFromGCS(task.file_url);
      } catch (err) {
        console.warn("Old file cleanup failed:", err.message);
      }
    }
  }

  await task.update({
    ...data,
    file_url,
  });

  await redis.del(`task:${id}`);
  await redis.del("tasks:all");
  await redis.del(`tasks:project:${task.project_id}`);
  if (newProjectId && newProjectId !== task.project_id) {
    await redis.del(`tasks:project:${newProjectId}`);
     const newKeys = await redis.keys(`tasks:project:${newProjectId}:page:*:size:*`);
    if (newKeys.length > 0) await redis.del(...newKeys);
  }
  await redis.del(TASK_COUNT_KEY);

   const keys = await redis.keys(`tasks:project:${task.project_id}:page:*:size:*`);
  if (keys.length > 0) await redis.del(...keys);

  return { success: true, message: "Task updated", task };
};

// 📦 Project Tasks
const getAllProjectTasks = async (project_id, page = 1) => {
  const PAGE_SIZE = 50;
  const offset = (page - 1) * PAGE_SIZE;
  const key = `tasks:project:${project_id}:page:${page}:size:${PAGE_SIZE}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const check = await checkProjectExists(project_id);
  if (!check.success) return { success: false, message: check.message };

  const { rows: tasks, count: total } = await Task.findAndCountAll({
    where: { project_id },
    limit: PAGE_SIZE,
    offset: offset,
    order: [['id', 'DESC']]
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const result = {
    success: true,
    project: check.project,
    tasks,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1
  };

  await redis.set(key, JSON.stringify(result), "EX", TASK_CACHE_TTL);
  return result;
};

module.exports = {
  createTask,
  getSingleTask,
  getAllTasks,
  getTaskCount,
  deleteTask,
  updateTask,
  getAllProjectTasks,
  refreshTaskCache,
};
