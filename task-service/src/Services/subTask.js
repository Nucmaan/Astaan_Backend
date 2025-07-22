const SubTask = require("../Model/subTask");
//const redis = require("../utills/redisClient");
const { uploadFileToGCS, deleteFileFromGCS } = require("../utills/gcpSetup");
//const { parseCustomTimeToMinutes } = require("../utills/parseTime.js");

const createSubTask = async (data, file) => {
  let file_url = "";
  if (file) file_url = await uploadFileToGCS(file);

  const subTask = await SubTask.create({ ...data, file_url });

  return subTask;
};

const getAllSubTasks = async () => {
  const result = await SubTask.findAll();
  return result;
};

const getSubTaskById = async (id) => {
  const result = await SubTask.findByPk(id);
  if (result)
   return result;
};

const getSubTasksByTaskId = async (taskId) => {
  const subTasks = await SubTask.findAll({ where: { task_id: taskId } });
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
  return subTask;
};

const deleteSubTask = async (id) => {
  const subTask = await SubTask.findByPk(id);
  if (!subTask) throw new Error("SubTask not found");

  if (subTask.file_url) await deleteFileFromGCS(subTask.file_url);
  await subTask.destroy();

  return true;
};

const countAllSubTasks = async () => {
  const count = await SubTask.count();
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
};
