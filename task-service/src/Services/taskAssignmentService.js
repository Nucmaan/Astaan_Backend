const TaskAssignment    = require("../Model/task_assignments.js");
const Task              = require("../Model/subTask.js");          
const TaskStatusUpdate  = require("../Model/task_status_updates.js");
const SubTask           = require("../Model/subTask.js");          
const axios             = require("axios");
const { Op }            = require("sequelize");

//const redis   = require("../utills/redisClient");

const { uploadFileToGCS, deleteFileFromGCS } = require("../utills/gcpSetup.js");
//const sendNotification  = require("../utills/sendEmail.js");

const userServiceUrl        = process.env.USER_SERVICE_URL;
const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL;
const subTaskServiceUrl      = process.env.SUBTASK_SERVICE_URL;

 
const getUserFromService = async (userId) => {
 
  try {
    const response = await axios.get(`${userServiceUrl}/api/auth/users/${userId}`);
    return response.data.user;
  } catch (err) {
    console.error("Error fetching user:", err.message);
    if (err.response) {
       console.error("Status:", err.response.status);
    }
    return null;
  }
};


const createAssignment = async (taskId, userId, assignedby_id) => {
  const task = await Task.findByPk(taskId);
  if (!task) throw new Error("Task not found");

  const user = await getUserFromService(userId);
  if (!user) throw new Error("User not found");
 
  const newAssignment = await TaskAssignment.create({ task_id: taskId, user_id: userId, assignedby_id : assignedby_id});

  const newStatusUpdate = await TaskStatusUpdate.create({
    task_id: taskId,
    updated_by: userId,
    status: "To Do",
    assignedby_id : assignedby_id
  });

  await axios.post(`${notificationServiceUrl}/api/notifications/send`, {
    userId,
    message: "New Task Assigned",
  });

  //const emailRes = await sendNotification(user.email);
 // if (!emailRes.success) throw new Error("Failed to send notification email");

  return { newAssignment, newStatusUpdate };
};

const getUserStatusUpdates = async (userId) => {
  const user = await getUserFromService(userId);
  if (!user) throw new Error("User not found");

  const data = await TaskStatusUpdate.findAll({
    where: { updated_by: userId },
    include: [{ model: Task }],
    order: [["updated_at", "DESC"]],
  });

  return data;
};

const getUserAssignments = async (userId) => {

  const user = await getUserFromService(userId);
  if (!user) throw new Error("User not found");

  const assignments = await TaskAssignment.findAll({
    where: { user_id: userId },
    include: [{ model: SubTask }],
  });

  const result = assignments.map((a) => a.SubTask);
  return result;
};

const submitTask = async (taskId, updatedBy,status) => {

  if (!status ) throw new Error("status are required");

  const allowed = ["To Do", "In Progress", "Review", "Completed"];
  if (!allowed.includes(status)) throw new Error("Invalid status");

  const task = await SubTask.findByPk(taskId);

  if (!task) throw new Error("Task not found");

  const user = await getUserFromService(updatedBy);
  if (!user) throw new Error("User not found");


  await SubTask.update(
    {
      status,
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
         const estimated = task.estimated_hours;
        let totalMinutes = 0;
        if (typeof estimated === "number" || typeof estimated === "string") {
          const str = estimated.toString();
          if (str.includes(".")) {
            const [h, m] = str.split(".");
            totalMinutes = parseInt(h, 10) * 60 + parseInt(m, 10);
          } else {
            const value = parseInt(str, 10);
            if (value <= 59) {
              totalMinutes = value;
            } else {
              totalMinutes = value;
            }
          }
        }
        hours = Math.floor(totalMinutes / 60);
        minutes = totalMinutes % 60;
      }
    }
  } 

  const assignment = await TaskAssignment.findOne({ where: { task_id: taskId, user_id: updatedBy } });
  const assignedby_id = assignment ? assignment.assignedby_id : null;

  const taskStatusUpdate = await TaskStatusUpdate.create({
    task_id: taskId,
    updated_by: updatedBy,
    status,
    updated_at: new Date(),
    time_taken_in_hours: hours,
    time_taken_in_minutes: minutes,
    assignedby_id
  });

 
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

  return statusUpdate;
};

const getAllStatusUpdates = async () => {
 
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

  return result;
};

const getCompletedTasksStatusUpdates = async () => {
 
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

  return result;
};

const getUsersWithCompletedTasks = async (month, role) => {
   let targetMonth;
  if (!month) {
    const now = new Date();
    targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  } else {
    targetMonth = month;
  }

  let users = [];
  try {
    const response = await axios.get(`${userServiceUrl}/api/auth/users`);
    users = response.data.users || [];
  } catch (err) {
    console.error("Error fetching users:", err.message);
    return [];
  }

   if (role) {
    users = users.filter(u => u.role === role);
  }

   const completedTasks = await getCompletedTasksStatusUpdates();

   const getRateForExperienceLevel = (experienceLevel) => {
    switch (experienceLevel) {
      case "Entry Level":
        return 5.00;
      case "Mid Level":
        return 6.00;
      case "Senior Level":
        return 8.00;
      default:
        return 5.00;
    }
  };

   const userIdToTasks = {};
  completedTasks.forEach(task => {
     const updatedAt = new Date(task.updated_at);
    const taskMonth = `${updatedAt.getFullYear()}-${String(updatedAt.getMonth() + 1).padStart(2, '0')}`;
    if (taskMonth !== targetMonth) return;
    if (!userIdToTasks[task.updated_by]) userIdToTasks[task.updated_by] = [];
    userIdToTasks[task.updated_by].push(task);
  });

   const result = users
    .filter(user => userIdToTasks[user.id] && userIdToTasks[user.id].length > 0)
    .map(user => {
      const userCompletedTasks = userIdToTasks[user.id];
      const totalHours = userCompletedTasks.reduce(
        (sum, t) => sum + (t["SubTask.estimated_hours"] || 0),
        0
      );
      const hourlyRate = getRateForExperienceLevel(user.work_experience_level);
      const monthlyCommission = totalHours * hourlyRate;
      return {
        id: user.id,
        name: user.name,
        role: user.role,
        work_experience_level: user.work_experience_level,
        hourlyRate,
        totalHours,
        monthlyCommission
      };
    });

  return result;
};

const getUserWithTasks = async (userId) => {
 
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

  return result;
};

const getUserLeaderboardStats = async () => {

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

  return result;
};

const getUserTaskStats = async (userId) => {

  const statusUpdates = await TaskStatusUpdate.findAll({
    where: { updated_by: userId },
    include: [{ model: Task }],
    order: [["updatedAt", "DESC"]],
    raw: true,
  });

  const taskUpdatesMap = new Map();
  const uniqueTasks = statusUpdates.filter((task) => {
    const taskKey = `${task.task_id}`;
    if (!taskUpdatesMap.has(taskKey)) {
      taskUpdatesMap.set(taskKey, true);
      return true;
    }
    return false;
  });

  const now = new Date();
  const total = uniqueTasks.length;
  const completed = uniqueTasks.filter((task) => task.status === 'Completed').length;
  const inProgress = uniqueTasks.filter((task) => task.status === 'In Progress').length;
  const toDo = uniqueTasks.filter((task) => task.status === 'To Do').length;
  const overdue = uniqueTasks.filter((task) => {
    const deadline = new Date(task["SubTask.deadline"] || task["Task.deadline"]);
    return deadline < now && task.status !== 'Completed';
  }).length;

  const result = { total, completed, inProgress, toDo, overdue };
  return result;
};

const getUserActiveAssignments = async (userId) => {
  const assignments = await TaskAssignment.findAll({
    where: { user_id: userId },
    include: [{ model: SubTask }],
    raw: true,
  });

  const filtered = assignments.filter(a => a["SubTask.status"] !== 'Completed');

  return filtered;
};

const getUserCompletedTasks = async (userId) => {
  const statusUpdates = await TaskStatusUpdate.findAll({
    where: { updated_by: userId, status: 'Completed' },
    include: [{ model: Task }],
    order: [["updatedAt", "DESC"]],
    raw: true,
  });

  const taskUpdatesMap = new Map();
  const latestTasks = statusUpdates.filter((task) => {
    const subtaskId = task["SubTask.id"];
    if (!taskUpdatesMap.has(subtaskId)) {
      taskUpdatesMap.set(subtaskId, true);
      return true;
    }
    return false;
  });

  return latestTasks;
};

const getUsersWithCompletedTasksAssignedBySoundEngineer = async (role = "Sound Engineer") => {
  let users = [];
  try {
    const response = await axios.get(`${userServiceUrl}/api/auth/users`);
    users = response.data.users || [];
  } catch (err) {
    console.error("Error fetching users:", err.message);
    return [];
  }

  const completedTasks = await getCompletedTasksStatusUpdates();

  const assignerCache = {};

  const userIdToTasks = {};
  for (const task of completedTasks) {
    if (!task.assignedby_id) continue;

     if (!assignerCache[task.assignedby_id]) {
      try {
        const assignerRes = await axios.get(`${userServiceUrl}/api/auth/users/${task.assignedby_id}`);
        assignerCache[task.assignedby_id] = assignerRes.data.user;
      } catch (err) {
        assignerCache[task.assignedby_id] = null;
      }
    }
    const assigner = assignerCache[task.assignedby_id];
    if (assigner && assigner.role === role) {
       const assignerInfo = {
        name: assigner.name,
        work_experience_level: assigner.work_experience_level,
        role: assigner.role
      };
       const taskWithAssigner = {
        "SubTask.title": task["SubTask.title"],
        "SubTask.description": task["SubTask.description"],
        "SubTask.status": task["SubTask.status"],
        "SubTask.time_spent": task["SubTask.time_spent"],
        "SubTask.estimated_hours": task["SubTask.estimated_hours"],
        assigner: assignerInfo
      };
      if (!userIdToTasks[task.updated_by]) userIdToTasks[task.updated_by] = [];
      userIdToTasks[task.updated_by].push(taskWithAssigner);
    }
  }

   const result = users
    .filter(user => userIdToTasks[user.id] && userIdToTasks[user.id].length > 0)
    .map(user => ({
      name: user.name,
      completedTasks: userIdToTasks[user.id],
    }));

  return result;
};

const getStatusUpdatesByTaskId = async (taskId) => {
 
  const updates = await TaskStatusUpdate.findAll({
    where: { task_id: taskId },
    order: [["updatedAt", "DESC"]],
    raw: true,
  });
  const latestAssignments = {};
  for (const update of updates) {
    if (
      !latestAssignments[update.task_id] ||
      new Date(update.updatedAt) > new Date(latestAssignments[update.task_id].updatedAt)
    ) {
      const user = await getUserFromService(update.updated_by);
      latestAssignments[update.task_id] = {
        assigned_user: user?.name || "Unknown",
        profile_image: user?.profile_image || null,
        updated_by: update.updated_by,
        updatedAt: update.updatedAt,
      };
    }
  }
   return latestAssignments;
};

const getLatestAssignmentsByTaskId = async (taskId) => {
   const subTasks = await SubTask.findAll({ where: { task_id: taskId }, raw: true });
  const subTaskIds = subTasks.map(st => st.id);

   const latestAssignments = {};
  for (const subTaskId of subTaskIds) {
    const statusUpdate = await TaskStatusUpdate.findOne({
      where: { task_id: subTaskId },
      order: [["updatedAt", "DESC"]],
      raw: true,
    });
    if (statusUpdate) {
      const user = await getUserFromService(statusUpdate.updated_by);
      latestAssignments[subTaskId] = {
        assigned_user: user ? user.name : "Unknown User",
        profile_image: user ? user.profile_image : null,
        updated_by: statusUpdate.updated_by,
        updated_at: statusUpdate.updatedAt,
      };
    }
  }
  return latestAssignments;
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
  getUsersWithCompletedTasksAssignedBySoundEngineer,
  getStatusUpdatesByTaskId,
  getLatestAssignmentsByTaskId
};