const { Op, fn, col } = require('sequelize');
const SubTask = require("../Model/subTask");
const redis   = require("../utills/redisClient");
const { uploadFileToGCS, deleteFileFromGCS } = require("../utills/gcpSetup");
const { parseCustomTimeToMinutes } = require("../utills/parseTime.js");

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


// services/subtask.service.js
 

const ALLOWED_FIELDS = [
  'task_id',
  'title',
  'description',
  'status',
  'priority',
  'deadline',
  'estimated_hours',
  'time_spent',
  'assignee_name',
  'assignee_empId',
  'assignee_expLevel',
  'assignee_role',
  'assignedTo_name',
  'assignedTo_empId',
  'assignedTo_expLevel',
  'assignedTo_role',
];

function pickProvided(obj) {
  const out = {};
  for (const key of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
      out[key] = obj[key];
    }
  }
  return out;
}

async function create(payload) {
  const data = pickProvided(payload);
  return SubTask.create(data);
}

async function list(query = {}) {
  const { task_id, status, priority, page = 1, limit = 20 } = query;

  const where = {};
  if (task_id) where.task_id = task_id;
  if (status) where.status = status;
  if (priority) where.priority = priority;

  return SubTask.findAndCountAll({
    where,
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
    order: [['createdAt', 'DESC']],
  });
}

async function getById(id) {
  return SubTask.findByPk(id);
}

async function update(id, payload) {
  const subtask = await SubTask.findByPk(id);
  if (!subtask) return null;

  const data = pickProvided(payload);
  await subtask.update(data);
  return subtask;
}

async function remove(id) {
  const deleted = await SubTask.destroy({ where: { id } });
  return !!deleted;
}

async function getAssignedTasks(empId) {
  return SubTask.findAll({
    where: {
      assignedTo_empId: empId,
      status: { [Op.ne]: "Completed" }   
    },
    order: [['createdAt', 'DESC']]
  });
}


async function getCompletedTasks(empId) {
  return SubTask.findAll({
    where: {
      assignedTo_empId: empId,
      status: "Completed"    
    },
    order: [['updatedAt', 'DESC']]  
  });
}


async function usersWithCompletedSubtasks() {
  return SubTask.findAll({
    attributes: [
      'assignedTo_empId',
      'assignedTo_name',
      'assignedTo_expLevel',
      'assignedTo_role',
      [fn('SUM', col('estimated_hours')), 'total_estimated_hours'],
      [fn('COUNT', col('id')), 'completed_count']
    ],
    where: {
      status: 'Completed',
      assignedTo_empId: { [Op.ne]: null }
    },
    group: [
      'assignedTo_empId',
      'assignedTo_name',
      'assignedTo_expLevel',
      'assignedTo_role'
    ],
    order: [[fn('SUM', col('estimated_hours')), 'DESC']],
    raw: true
  });
}

async function completedTasksByDefaultRole() {
  const defaultRole = 'Admin';  
  return SubTask.findAll({
    attributes: [
      'assignee_empId',
      'assignee_name',
      'assignee_expLevel',
      'assignee_role',
      [fn('SUM', col('estimated_hours')), 'total_estimated_hours'],
      [fn('COUNT', col('id')), 'completed_count']
    ],
    where: {
      status: 'Completed',
      assignee_role: defaultRole
    },
    group: [
      'assignee_empId',
      'assignee_name',
      'assignee_expLevel',
      'assignee_role'
    ],
    order: [[fn('SUM', col('estimated_hours')), 'DESC']],
    raw: true
  });
}


async function getSubtasksByAssignee(empId) {
  return SubTask.findAll({
    attributes: [
      'title',
      'description',
      'status',
      'deadline',
      'estimated_hours',
      'time_spent',
      'assignedTo_name',
      'createdAt',
      'updatedAt'
    ],
    where: {
      assignee_empId: empId
    },
    order: [['createdAt', 'DESC']],
    raw: true
  });
}

async function getStatusCountByAssignedTo(empId) {
  const result = await SubTask.findAll({
    attributes: [
      'status',
      [fn('COUNT', col('id')), 'count']
    ],
    where: {
      assignedTo_empId: empId
    },
    group: ['status'],
    raw: true
  });

   const statusCounts = result.reduce((acc, curr) => {
    acc[curr.status] = parseInt(curr.count, 10);
    return acc;
  }, {});

   const allStatuses = ["To Do", "In Progress", "Review", "Completed"];
  allStatuses.forEach(status => {
    if (!(status in statusCounts)) {
      statusCounts[status] = 0;
    }
  });

  return statusCounts;
}

const finSubTasksByTaksId = async (taskId) => {
  return SubTask.findAll({
    where: { task_id: taskId },
    attributes: [
      "id",
      "title",
      "description",
      "status",
      "priority",
      "deadline",
      "estimated_hours",
      "time_spent",
      "assignee_name",
      "assignedTo_name"
    ],
    order: [["createdAt", "ASC"]],
    raw: true
  });
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

  create, 
  list, 
  getById, 
  update, 
  remove,
  getAssignedTasks,
  getCompletedTasks,
  usersWithCompletedSubtasks,
  completedTasksByDefaultRole,
  getSubtasksByAssignee,
  getStatusCountByAssignedTo,
  finSubTasksByTaksId
};
