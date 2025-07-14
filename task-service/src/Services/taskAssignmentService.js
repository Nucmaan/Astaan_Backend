const TaskAssignment    = require("../Model/task_assignments.js");
const Task              = require("../Model/subTask.js");          // parent “Task” model
const TaskStatusUpdate  = require("../Model/task_status_updates.js");
const SubTask           = require("../Model/subTask.js");          // referenced sub‑task
const axios             = require("axios");
const { Op }            = require("sequelize");

const redis   = require("../utills/redisClient");

const { uploadFileToGCS, deleteFileFromGCS } = require("../utills/gcpSetup.js");
const sendNotification  = require("../utills/sendEmail.js");

const userServiceUrl        = process.env.USER_SERVICE_URL;
const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL;
const subTaskServiceUrl      = process.env.SUBTASK_SERVICE_URL;

const CACHE_EXPIRE = 60 * 60 * 24; // 5 minutes

 const getUserFromService = async (userId) => {
  const cacheKey = `user:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  try {
    const response = await axios.get(`${userServiceUrl}/api/auth/users/${userId}`);
    if (response.data.user) {
      await redis.set(cacheKey, JSON.stringify(response.data.user), "EX", CACHE_EXPIRE);
    }
    return response.data.user;
  } catch (err) {
    console.error("Error fetching user:", err.message);
    return null;
  }
};

const invalidateUserCache = async (userId) => {
  await redis.del(`user:${userId}`);
};

const invalidateUserAssignmentsCache = async (userId) => {
  await redis.del(`userAssignments:${userId}`);
  await redis.del(`userStatusUpdates:${userId}`);
  await redis.del(`userWithTasks:${userId}`);
  await redis.del(`userTaskStats:${userId}`);
  await redis.del(`userCompletedTasks:${userId}`);
  await redis.del(`userActiveAssignments:${userId}`);
};

const invalidateAllStatusUpdatesCache = async () => {
  await redis.del(`allStatusUpdates`);
  await redis.del(`completedTasksStatusUpdates`);
  await redis.del(`usersWithCompletedTasks`);
  await redis.del(`userLeaderboardStats`);
};

const createAssignment = async (taskId, userId) => {
  const task = await Task.findByPk(taskId);
  if (!task) throw new Error("Task not found");

  const user = await getUserFromService(userId);
  if (!user) throw new Error("User not found");

  const newAssignment = await TaskAssignment.create({ task_id: taskId, user_id: userId });

  const newStatusUpdate = await TaskStatusUpdate.create({
    task_id: taskId,
    updated_by: userId,
    status: "To Do",
  });

  await axios.post(`${notificationServiceUrl}/api/notifications/send`, {
    userId,
    message: "New Task Assigned",
  });

  const emailRes = await sendNotification(user.email);
  if (!emailRes.success) throw new Error("Failed to send notification email");

   await invalidateUserAssignmentsCache(userId);
  await invalidateAllStatusUpdatesCache();

  return { newAssignment, newStatusUpdate };
};

const getUserStatusUpdates = async (userId) => {
  const cacheKey = `userStatusUpdates:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const user = await getUserFromService(userId);
  if (!user) throw new Error("User not found");

  const data = await TaskStatusUpdate.findAll({
    where: { updated_by: userId },
    include: [{ model: Task }],
    order: [["updated_at", "DESC"]],
  });

  await redis.set(cacheKey, JSON.stringify(data), "EX", CACHE_EXPIRE);
  return data;
};

const getUserAssignments = async (userId) => {
  const cacheKey = `userAssignments:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const user = await getUserFromService(userId);
  if (!user) throw new Error("User not found");

  const assignments = await TaskAssignment.findAll({
    where: { user_id: userId },
    include: [{ model: SubTask }],
  });

  const result = assignments.map((a) => a.SubTask);
  await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_EXPIRE);
  return result;
};

const submitTask = async (taskId, updatedBy, status, files) => {
  if (!files || !status) throw new Error("File and status are required");

  const allowed = ["To Do", "In Progress", "Review", "Completed"];
  if (!allowed.includes(status)) throw new Error("Invalid status");

  const task = await SubTask.findByPk(taskId);
  if (!task) throw new Error("Task not found");

  const user = await getUserFromService(updatedBy);
  if (!user) throw new Error("User not found");

  let fileUrls = [];
  if (files.length) {
    fileUrls = await Promise.all(files.map(uploadFileToGCS));

    // delete old files
    if (task.file_url) {
      try {
        const old = JSON.parse(task.file_url);
        if (Array.isArray(old)) await Promise.all(old.map(deleteFileFromGCS));
      } catch {
        await deleteFileFromGCS(task.file_url).catch(() => {});
      }
    }
  }

  await SubTask.update(
    {
      status,
      file_url: fileUrls.length ? JSON.stringify(fileUrls) : task.file_url,
      updatedAt: new Date(),
    },
    { where: { id: taskId } }
  );

  let hours = 0,
    minutes = 0;
  if (status === "Completed") {
    const alreadyDone = await TaskStatusUpdate.findOne({
      where: { task_id: taskId, status: "Completed", time_taken_in_hours: { [Op.ne]: null } },
    });
    if (!alreadyDone) {
      const inProg = await TaskStatusUpdate.findOne({
        where: { task_id: taskId, status: "In Progress" },
        order: [["updated_at", "DESC"]],
      });
      if (inProg) {
        const diffMin = Math.floor((Date.now() - new Date(inProg.updated_at)) / 60000);
        hours = Math.floor(diffMin / 60);
        minutes = diffMin % 60;
      }
    }
  }

  const taskStatusUpdate = await TaskStatusUpdate.create({
    task_id: taskId,
    updated_by: updatedBy,
    status,
    updated_at: new Date(),
    time_taken_in_hours: hours,
    time_taken_in_minutes: minutes,
  });

  // Invalidate caches related to this user
  await invalidateUserAssignmentsCache(updatedBy);
  await invalidateAllStatusUpdatesCache();

  return { success: true, task, taskStatusUpdate };
};

const updateAssignment = async (taskId, oldUserId, newUserId) => {
  const newUser = await getUserFromService(newUserId);
  if (!newUser) throw new Error("New user not found");

  const assignment = await TaskAssignment.findOne({
    where: { task_id: taskId, user_id: oldUserId },
  });
  if (!assignment) throw new Error("Assignment not found");

  await assignment.update({ user_id: newUserId });

  const newStatus = await TaskStatusUpdate.create({
    task_id: taskId,
    updated_by: newUserId,
    status: "To Do",
  });

  // Invalidate caches for both old and new user
  await invalidateUserAssignmentsCache(oldUserId);
  await invalidateUserAssignmentsCache(newUserId);
  await invalidateAllStatusUpdatesCache();

  return { assignment, newStatus };
};

const editStatusUpdate = async (statusUpdateId, status) => {
  const allowed = ["To Do", "In Progress", "Review", "Completed"];
  if (!allowed.includes(status)) throw new Error("Invalid status");

  const task = await SubTask.findByPk(statusUpdateId);
  if (!task) throw new Error("Task not found");

  await SubTask.update({ status }, { where: { id: statusUpdateId } });

  const statusUpdate = await TaskStatusUpdate.findOne({ where: { task_id: statusUpdateId } });
  if (!statusUpdate) throw new Error("Status update not found");

  let h = 0,
    m = 0;
  if (status === "Completed") {
    const doneAlready = await TaskStatusUpdate.findOne({
      where: { task_id: statusUpdate.task_id, status: "Completed", time_taken_in_hours: { [Op.ne]: null } },
    });
    if (!doneAlready) {
      const inProg = await TaskStatusUpdate.findOne({
        where: { task_id: statusUpdate.task_id, status: "In Progress" },
        order: [["updated_at", "DESC"]],
      });
      if (inProg) {
        const diffMin = Math.floor((Date.now() - new Date(inProg.updated_at)) / 60000);
        h = Math.floor(diffMin / 60);
        m = diffMin % 60;
      }
    }
  }

  await axios.put(`${subTaskServiceUrl}/api/subtasks/UpdateSubTask/${statusUpdate.task_id}`, { status });

  await statusUpdate.update({
    status,
    updated_at: new Date(),
    time_taken_in_hours: h,
    time_taken_in_minutes: m,
  });

  // Invalidate caches for the user who updated this
  await invalidateUserAssignmentsCache(statusUpdate.updated_by);
  await invalidateAllStatusUpdatesCache();

  return statusUpdate;
};

const getAllStatusUpdates = async () => {
  const cacheKey = `allStatusUpdates`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const statusUpdates = await TaskStatusUpdate.findAll({
    include: [{ model: Task }],
    order: [["updatedAt", "DESC"]],
    raw: true,
  });

  const result = await Promise.all(
    statusUpdates.map(async (u) => {
      const user = await getUserFromService(u.updated_by);
      return {
        ...u,
        assigned_user: user ? user.name : "Unknown User",
        profile_image: user ? user.profile_image : null,
      };
    })
  );

  await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_EXPIRE);
  return result;
};

const getCompletedTasksStatusUpdates = async () => {
  const cacheKey = `completedTasksStatusUpdates`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const statusUpdates = await TaskStatusUpdate.findAll({
    include: [{ model: Task }],
    order: [["updatedAt", "DESC"]],
    raw: true,
  });

  const taskUpdatesMap = new Map();
  const uniqueTaskUpdates = statusUpdates.filter((update) => {
    const taskKey = `${update.task_id}-${update.updated_by}`;
    if (!taskUpdatesMap.has(taskKey)) {
      taskUpdatesMap.set(taskKey, true);
      return true;
    }
    return false;
  });

  const completedTasks = uniqueTaskUpdates.filter((task) => task["status"] === "Completed");

  const result = await Promise.all(
    completedTasks.map(async (u) => {
      const user = await getUserFromService(u.updated_by);
      return {
        ...u,
        assigned_user: user ? user.name : "Unknown User",
        profile_image: user ? user.profile_image : null,
      };
    })
  );

  await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_EXPIRE);
  return result;
};

const getUsersWithCompletedTasks = async () => {
  const cacheKey = `usersWithCompletedTasks`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  let users = [];
  try {
    const response = await axios.get(`${userServiceUrl}/api/auth/users`);
    users = response.data.users || [];
  } catch (err) {
    console.error("Error fetching users:", err.message);
    return [];
  }

  const completedTasks = await getCompletedTasksStatusUpdates();

  const userIdToTasks = {};
  completedTasks.forEach(task => {
    if (!userIdToTasks[task.updated_by]) userIdToTasks[task.updated_by] = [];
    userIdToTasks[task.updated_by].push(task);
  });

  const result = users
    .filter(user => userIdToTasks[user.id] && userIdToTasks[user.id].length > 0)
    .map(user => ({
      id: user.id,
      name: user.name,
      profile_image: user.profile_image,
      role : user.role,
      work_experience_level: user.work_experience_level,
      completedTasks: userIdToTasks[user.id],
    }));

  await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_EXPIRE);
  return result;
};

const getUserWithTasks = async (userId) => {
  const cacheKey = `userWithTasks:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  let user = null;
  try {
    const response = await axios.get(`${userServiceUrl}/api/auth/users/${userId}`);
    user = response.data.user;
  } catch (err) {
    throw new Error("User not found");
  }

  const statusUpdates = await TaskStatusUpdate.findAll({
    where: { updated_by: userId },
    include: [{ model: Task }],
    order: [["updatedAt", "DESC"]],
    raw: true,
  });

  const taskUpdatesMap = new Map();
  const uniqueUserTasks = statusUpdates.filter((update) => {
    const taskKey = `${update.task_id}`;
    if (!taskUpdatesMap.has(taskKey)) {
      taskUpdatesMap.set(taskKey, true);
      return true;
    }
    return false;
  });

  const tasksWithUser = uniqueUserTasks.map((u) => ({
    ...u,
    assigned_user: user.name,
    profile_image: user.profile_image,
  }));

  const result = {
    id: user.id,
    name: user.name,
    role: user.role,
    profile_image: user.profile_image,
    work_experience_level: user.work_experience_level,
    tasks: tasksWithUser,
  };

  await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_EXPIRE);
  return result;
};

const getUserLeaderboardStats = async () => {
  const cacheKey = `userLeaderboardStats`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  let users = [];
  try {
    const response = await axios.get(`${userServiceUrl}/api/auth/users`);
    users = response.data.users || [];
  } catch (err) {
    console.error("Error fetching users:", err.message);
    return [];
  }

  const statusUpdates = await TaskStatusUpdate.findAll({
    include: [{ model: Task }],
    order: [["updatedAt", "DESC"]],
    raw: true,
  });

  const taskUpdatesMap = new Map();
  const uniqueTaskUpdates = statusUpdates.filter((update) => {
    const taskKey = `${update.task_id}-${update.updated_by}`;
    if (!taskUpdatesMap.has(taskKey)) {
      taskUpdatesMap.set(taskKey, true);
      return true;
    }
    return false;
  });

  const result = users.map(user => {
    const userTasks = uniqueTaskUpdates.filter(task => task.updated_by === user.id);
    const todoTasks = userTasks.filter(task => task.status === "To Do").length;
    const inProgressTasks = userTasks.filter(task => task.status === "In Progress").length;
    const reviewTasks = userTasks.filter(task => task.status === "Review").length;
    const completedTasks = userTasks.filter(task => task.status === "Completed").length;
    const totalTasks = userTasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return {
      id: user.id,
      name: user.name,
      profile_image: user.profile_image,
      role: user.role,
      work_experience_level: user.work_experience_level,
      todoTasks,
      inProgressTasks,
      reviewTasks,
      completedTasks,
      totalTasks,
      completionRate,
    };
  });

  await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_EXPIRE);
  return result;
};

const getUserTaskStats = async (userId) => {
  const cacheKey = `userTaskStats:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 1. Fetch all latest status updates for this user
  const statusUpdates = await TaskStatusUpdate.findAll({
    where: { updated_by: userId },
    include: [{ model: Task }],
    order: [["updatedAt", "DESC"]],
    raw: true,
  });

  // 2. Keep only the latest update per task
  const taskUpdatesMap = new Map();
  const uniqueTasks = statusUpdates.filter((task) => {
    const taskKey = `${task.task_id}`;
    if (!taskUpdatesMap.has(taskKey)) {
      taskUpdatesMap.set(taskKey, true);
      return true;
    }
    return false;
  });

  // 3. Calculate stats
  const now = new Date();
  const total = uniqueTasks.length;
  const completed = uniqueTasks.filter((task) => task.status === 'Completed').length;
  const inProgress = uniqueTasks.filter((task) => task.status === 'In Progress').length;
  const toDo = uniqueTasks.filter((task) => task.status === 'To Do').length;
  const overdue = uniqueTasks.filter((task) => {
    // Check deadline inside included Task or SubTask, adjust accordingly
    const deadline = new Date(task["SubTask.deadline"] || task["Task.deadline"]);
    return deadline < now && task.status !== 'Completed';
  }).length;

  const result = { total, completed, inProgress, toDo, overdue };
  await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_EXPIRE);
  return result;
};

const getUserCompletedTasks = async (userId) => {
  const cacheKey = `userCompletedTasks:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 1. Fetch all status updates for this user with status 'Completed'
  const statusUpdates = await TaskStatusUpdate.findAll({
    where: { updated_by: userId, status: 'Completed' },
    include: [{ model: Task }],
    order: [["updatedAt", "DESC"]],
    raw: true,
  });

  // 2. Keep only the latest update per subtask
  const taskUpdatesMap = new Map();
  const latestTasks = statusUpdates.filter((task) => {
    const subtaskId = task["SubTask.id"];
    if (!taskUpdatesMap.has(subtaskId)) {
      taskUpdatesMap.set(subtaskId, true);
      return true;
    }
    return false;
  });

  await redis.set(cacheKey, JSON.stringify(latestTasks), "EX", CACHE_EXPIRE);
  return latestTasks;
};

const getUserActiveAssignments = async (userId) => {
  const cacheKey = `userActiveAssignments:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Fetch all assignments for the user where status is not 'Completed'
  const assignments = await TaskAssignment.findAll({
    where: { user_id: userId },
    include: [{ model: SubTask }],
    raw: true,
  });

  // Only return assignments where SubTask.status is not 'Completed'
  const filtered = assignments.filter(a => a["SubTask.status"] !== 'Completed');

  await redis.set(cacheKey, JSON.stringify(filtered), "EX", CACHE_EXPIRE);
  return filtered;
};

module.exports = {
  createAssignment,
  updateAssignment,
  getUserAssignments,
  editStatusUpdate,
  getUserStatusUpdates,
  getAllStatusUpdates,
  getCompletedTasksStatusUpdates,  
  getUsersWithCompletedTasks,
  submitTask,
  getUserWithTasks,
  getUserLeaderboardStats,
  getUserTaskStats,
  getUserCompletedTasks,
  getUserActiveAssignments,
};
