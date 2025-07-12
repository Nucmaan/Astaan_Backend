const TaskAssignment    = require("../Model/task_assignments.js");
const Task              = require("../Model/subTask.js");          // parent “Task” model
const TaskStatusUpdate  = require("../Model/task_status_updates.js");
const SubTask           = require("../Model/subTask.js");          // referenced sub‑task
const axios             = require("axios");
const { Op }            = require("sequelize");

const { uploadFileToGCS, deleteFileFromGCS } = require("../utills/gcpSetup.js");
const sendNotification  = require("../utills/sendEmail.js");

const userServiceUrl        = process.env.USER_SERVICE_URL;
const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL;
const subTaskServiceUrl      = process.env.SUBTASK_SERVICE_URL;

 
const getUserFromService = async (userId) => {
  try {
    const response = await axios.get(`${userServiceUrl}/api/auth/users/${userId}`);
    return response.data.user;
  } catch (err) {
    console.error("Error fetching user:", err.message);
    return null;
  }
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

  return { newAssignment, newStatusUpdate };
};
 
const getUserStatusUpdates = async (userId) => {
  const user = await getUserFromService(userId);
  if (!user) throw new Error("User not found");

  return TaskStatusUpdate.findAll({
    where: { updated_by: userId },
    include: [{ model: Task }],
    order: [["updated_at", "DESC"]],
  });
};
 
const getAllStatusUpdates = async () => {
  const statusUpdates = await TaskStatusUpdate.findAll({
    include: [{ model: Task }],
    order: [["updatedAt", "DESC"]],
    raw: true,
  });

   return Promise.all(
    statusUpdates.map(async (u) => {
      const user = await getUserFromService(u.updated_by);
      return {
        ...u,
        assigned_user: user ? user.name : "Unknown User",
        profile_image: user ? user.profile_image : null,
      };
    })
  );
};

 
const getUserAssignments = async (userId) => {
  const user = await getUserFromService(userId);
  if (!user) throw new Error("User not found");

  const assignments = await TaskAssignment.findAll({
    where: { user_id: userId },
    include: [{ model: SubTask }],
  });

  return assignments.map((a) => a.SubTask);
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

  /* 2. Update SubTask status + file URL */
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
 

module.exports = {
  createAssignment,
  updateAssignment,
  getUserAssignments,
  editStatusUpdate,
  getUserStatusUpdates,
  getAllStatusUpdates,
  submitTask,
};
