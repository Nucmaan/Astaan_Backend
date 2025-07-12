const SubTask = require("../Model/subTask");
const redis   = require("../utills/redisClient");
const { uploadFileToGCS, deleteFileFromGCS } = require("../utills/gcpSetup");

const SUBTASK_CACHE_TTL = 60 * 60 * 24;               
const SUBTASK_COUNT_KEY = "subtasks:count";

 const clearSubTaskCache = async () => {
  const keys = await redis.keys("subtasks:*");
  if (keys.length) await redis.del(...keys);
};

 const refreshSubTaskCache = async () => {
  const count = await SubTask.count();
  const first100 = await SubTask.findAll({ limit: 100, order: [["created_at", "DESC"]] });

  await redis.set(SUBTASK_COUNT_KEY, count, "EX", SUBTASK_CACHE_TTL);
  await redis.set("subtasks:all", JSON.stringify(first100), "EX", SUBTASK_CACHE_TTL);

  console.log("✅ SubTask cache refreshed (cron)");
};

 const createSubTask = async (data, file) => {
  let file_url = "";
  if (file) file_url = await uploadFileToGCS(file);

  const subTask = await SubTask.create({ ...data, file_url });

  await clearSubTaskCache();
  return subTask;
};

 const getAllSubTasks = async () => {
  const key = "subtasks:all";
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const result = await SubTask.findAll();
  await redis.set(key, JSON.stringify(result), "EX", SUBTASK_CACHE_TTL);
  return result;
};

 const getSubTaskById = async (id) => {
  const key = `subtask:${id}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const result = await SubTask.findByPk(id);
  if (result) await redis.set(key, JSON.stringify(result), "EX", SUBTASK_CACHE_TTL);
  return result;
};

 const getSubTasksByTaskId = async (taskId) => {
  const key = `subtasks:task:${taskId}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const subTasks = await SubTask.findAll({ where: { task_id: taskId } });
  await redis.set(key, JSON.stringify(subTasks), "EX", SUBTASK_CACHE_TTL);
  return subTasks;
};

 
const updateSubTask = async (id, data, file) => {
  const subTask = await SubTask.findByPk(id);
  if (!subTask) throw new Error("SubTask not found");

  let file_url = subTask.file_url;
  if (file) {
    file_url = await uploadFileToGCS(file);
    if (subTask.file_url) await deleteFileFromGCS(subTask.file_url);
  }

  await subTask.update({ ...data, file_url });
  await clearSubTaskCache();
  return subTask;
};

 
const deleteSubTask = async (id) => {
  const subTask = await SubTask.findByPk(id);
  if (!subTask) throw new Error("SubTask not found");

  if (subTask.file_url) await deleteFileFromGCS(subTask.file_url);
  await subTask.destroy();

  await clearSubTaskCache();
  return true;
};

 
const countAllSubTasks = async () => {
  const cached = await redis.get(SUBTASK_COUNT_KEY);
  if (cached !== null) return parseInt(cached, 10);

  const count = await SubTask.count();
  await redis.set(SUBTASK_COUNT_KEY, count, "EX", SUBTASK_CACHE_TTL);
  return count;
};

module.exports = {
  createSubTask,
  getAllSubTasks,
  getSubTaskById,
  updateSubTask,
  deleteSubTask,
  getSubTasksByTaskId,
  countAllSubTasks,
  refreshSubTaskCache,  
};
