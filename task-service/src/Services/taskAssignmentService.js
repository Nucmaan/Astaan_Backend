const TaskAssignment = require("../Model/task_assignments.js");
const Task = require("../Model/subTask.js");
const TaskStatusUpdate = require("../Model/task_status_updates.js"); 
const SubTask = require("../Model/subTask.js"); 
const axios = require("axios");
const { Op } = require("sequelize");

const { uploadFileToS3, deleteFileFromS3 } = require("../utills/s3SetUp.js");

const sendNotification = require("../utills/sendEmail.js");

const userServiceUrl = process.env.USER_SERVICE_URL;
const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL;
const subTaskServiceUrl = process.env.SUBTASK_SERVICE_URL;

 const getUserFromService = async (userId) => {
    try {
      const response = await axios.get(`${userServiceUrl}/api/auth/users/${userId}`);
      return response.data.user; 
    } catch (error) {
      console.error("Error fetching user:", error.message);
      return null;
    }
  };
  
  const createAssignment = async (taskId, userId) => {
    try {
       const task = await Task.findByPk(taskId);
      if (!task) throw new Error('Task not found');
  
       const user = await getUserFromService(userId);
      if (!user) throw new Error('User not found');
  
       const newAssignment = await TaskAssignment.create({
        task_id: taskId,
        user_id: userId,
      });
  
       const newStatusUpdate = await TaskStatusUpdate.create({
        task_id: taskId,
        updated_by: userId,
        status: 'To Do',
      });

    await axios.post(`${notificationServiceUrl}/api/notifications/send`,{
      userId : userId,
      message : "New Task Is Assigned "
    });
     
     const emailResponse = await sendNotification(user.email);

    if (!emailResponse.success) throw new Error("Failed to send the Notification Email");
        
  
      return { newAssignment, newStatusUpdate };
    } catch (error) {
      console.error("Error creating task assignment:", error.message);
      throw error; 
    }
  };

  const getUserStatusUpdates = async (userId) => {
    try {
      const user = await getUserFromService(userId);
      if (!user) throw new Error("User not found");
  
      const statusUpdates = await TaskStatusUpdate.findAll({
        where: { updated_by: userId },
        include: [
          {
            model: Task,
          },
        ],
        order: [["updated_at", "DESC"]],
      });
  
      return statusUpdates;
    } catch (error) {
      console.error("Error fetching user status updates:", error.message);
      throw error;
    }
  };

  const getAllStatusUpdates = async () => {
    try {
        const statusUpdates = await TaskStatusUpdate.findAll({
            include: [
                {
                    model: Task,
                },
            ],
            order: [["updatedAt", "DESC"]],
            raw: true,  
        });

        const updatedStatus = await Promise.all(
            statusUpdates.map(async (update) => {
                const user = await getUserFromService(update.updated_by);
                return {
                    ...update, 
                    assigned_user: user ? user.name : "Unknown User",
                    profile_image: user ? user.profile_image : null,
                };
            })
        );

        return updatedStatus;
    } catch (error) {
        console.error("Error fetching all status updates:", error.message);
        throw error;
    }
};

  const getUserAssignments = async (userId) => {
    try {
        const user = await getUserFromService(userId);
      if (!user) throw new Error("User not found");
  
      const assignments = await TaskAssignment.findAll({
        where: { user_id: userId },
        include: [
          {
            model: SubTask,
          },
        ],
      });
  
      return assignments.map((assignment) => assignment.SubTask); 
    } catch (error) {
      console.error("Error fetching user assignments:", error.message);
      throw error;
    }
  };

  const submitTask = async (taskId, updatedBy, status, files) => {
    try {
      if (!files) throw new Error("File is required");
      if (!status) throw new Error("Status is required");
  
      const allowedStatuses = ["To Do", "In Progress", "Review", "Completed"];
      if (!allowedStatuses.includes(status)) throw new Error("Invalid status");
  
      const task = await SubTask.findByPk(taskId);
      if (!task) throw new Error("Task not found");
  
      const user = await getUserFromService(updatedBy);
      if (!user) throw new Error("User not found");
  
      let fileUrls = [];
  
       if (files && files.length > 0) {
        try {
           const uploadPromises = files.map(file => uploadFileToS3(file));
          fileUrls = await Promise.all(uploadPromises);
          
           if (task.file_url) {
            try {
              const oldFileUrls = JSON.parse(task.file_url);
              if (Array.isArray(oldFileUrls)) {
                const deletePromises = oldFileUrls.map(url => deleteFileFromS3(url).catch(err => console.warn('Failed to delete old file:', err)));
                await Promise.all(deletePromises);
              }
            } catch (parseError) {
               if (typeof task.file_url === 'string' && task.file_url.includes('amazonaws.com')) {
                await deleteFileFromS3(task.file_url).catch(err => console.warn('Failed to delete old file:', err));
              }
            }
          }
        } catch (uploadError) {
          console.error("Error uploading files to S3:", uploadError.message);
          throw new Error(`Failed to upload files to S3: ${uploadError.message}`);
        }
      }
  
      let updatedData = {
        status: status,
        file_url: fileUrls.length ? JSON.stringify(fileUrls) : task.file_url,  
        updatedAt: new Date()
      };
  
      await SubTask.update(updatedData, { where: { id: taskId } });
  
       let timeTakenInHours = 0;
      let timeTakenInMinutes = 0;
  
      if (status === "Completed") {
         const completedUpdate = await TaskStatusUpdate.findOne({
          where: { 
            task_id: taskId,
            status: "Completed",
            time_taken_in_hours: { [Op.ne]: null }
          },
        });

         if (!completedUpdate) {
           let progressUpdate = await TaskStatusUpdate.findOne({
            where: { 
              task_id: taskId,
              status: "In Progress"
            },
            order: [["updated_at", "DESC"]],
          });
    
          if (progressUpdate) {
            const timeDifference = new Date() - new Date(progressUpdate.updated_at);
            timeTakenInMinutes = Math.floor(timeDifference / (1000 * 60));
            timeTakenInHours = Math.floor(timeTakenInMinutes / 60);
            timeTakenInMinutes = timeTakenInMinutes % 60;
          }
        }
      }
  
       
      let updatedStatus = await TaskStatusUpdate.create({
        task_id: taskId,
        updated_by: updatedBy,
        status: status,
        updated_at: new Date(),
        time_taken_in_hours: timeTakenInHours,
        time_taken_in_minutes: timeTakenInMinutes,
      });
  
  
      return {
        success: true,
        message: "Task updated successfully",
        task,
        taskStatusUpdate: updatedStatus,
      };
    } catch (error) {
      console.error("Error submitting task:", error.message);
      return {
        success: false,
        message: error.message,
        error: error.stack,
      };
    }
  };  

const updateAssignment = async (taskId, oldUserId, newUserId) => {

   const user = await getUserFromService(newUserId);
  if (!user) throw new Error("New user not found");

   const assignment = await TaskAssignment.findOne({
      where: { task_id: taskId, user_id: oldUserId },
  });

  if (!assignment) throw new Error("Assignment not found");

   await assignment.update({ user_id: newUserId });

   const newStatusUpdate = await TaskStatusUpdate.create({
      task_id: taskId,
      updated_by: newUserId,
      status: "To Do",
  });

  return { assignment, newStatusUpdate };
};

const editStatusUpdate = async (statusUpdateId, status) => {
  try {
     const allowedStatuses = ["To Do", "In Progress", "Review", "Completed"];
    if (!allowedStatuses.includes(status)) {
      throw new Error("Invalid status");
    }

    const isTaskExist = await SubTask.findByPk(statusUpdateId);
    if (!isTaskExist) {
      throw new Error("Task not found");
    }

    await SubTask.update({status: status}, {where: {id: statusUpdateId}});

    const statusUpdate = await TaskStatusUpdate.findOne({
      where: {
        task_id: statusUpdateId,
      }
    });

    if (!statusUpdate) {
      throw new Error("Status update not found");
    }

    let timeTakenInHours = 0;
    let timeTakenInMinutes = 0;

    if (status === "Completed") {
       const completedUpdate = await TaskStatusUpdate.findOne({
        where: { 
          task_id: statusUpdate.task_id,
          status: "Completed",
          time_taken_in_hours: { [Op.ne]: null }
        },
      });

       if (!completedUpdate) {
         let progressUpdate = await TaskStatusUpdate.findOne({
          where: { 
            task_id: statusUpdate.task_id,
            status: "In Progress"
          },
          order: [["updated_at", "DESC"]],
        });

        if (progressUpdate) {
          const timeDifference = new Date() - new Date(progressUpdate.updated_at);
          timeTakenInMinutes = Math.floor(timeDifference / (1000 * 60));
          timeTakenInHours = Math.floor(timeTakenInMinutes / 60);
          timeTakenInMinutes = timeTakenInMinutes % 60;
        }
      }
    }

    console.log('issue after this line task id ',statusUpdate.task_id);

    await axios.put(`${subTaskServiceUrl}/api/subtasks/UpdateSubTask/${statusUpdate.task_id}`, {
      status
     });

     await statusUpdate.update({
      status,
      updated_at: new Date(),
      time_taken_in_hours: timeTakenInHours,
      time_taken_in_minutes: timeTakenInMinutes,
    });


    return statusUpdate;
  } catch (error) {
    console.error("Error updating task status:", error.message);
    throw error;
  }
};

module.exports = {
    createAssignment,
    updateAssignment,
    getUserAssignments,
    editStatusUpdate,
    getUserStatusUpdates,
    getAllStatusUpdates,
    submitTask
};