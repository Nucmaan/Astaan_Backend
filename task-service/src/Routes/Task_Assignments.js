const { createTaskAssignment, updateAssignedTask, getUserAssignments, editTaskStatusUpdate, getUserTaskStatusUpdates, getAllTaskStatusUpdates, getCompletedTasksStatusUpdates, getUsersWithCompletedTasks, getUserWithTasks, getUserLeaderboardStats, submitTheTask } = require("../Controllers/Task_Assignments.js");
const Router = require("express").Router();
const { upload } = require('../middleware/uploadMiddleware.js'); 

Router.post("/assignTask",createTaskAssignment);
Router.put('/assign/:task_id/:user_id', updateAssignedTask);
Router.get('/userAssignments/:user_id',getUserAssignments);

Router.put('/task_status_update/:status_update_id',editTaskStatusUpdate);
Router.get('/findMyTaskStatusUpdate/:user_id',getUserTaskStatusUpdates);
Router.get('/allTaskStatusUpdates',getAllTaskStatusUpdates);
Router.get('/completedTaskStatusUpdates',getCompletedTasksStatusUpdates);
Router.get('/usersWithCompletedTasks', getUsersWithCompletedTasks);
Router.get('/userWithTasks/:user_id', getUserWithTasks);
Router.get('/userLeaderboardStats', getUserLeaderboardStats);
Router.put('/submitTask/:task_id',upload.array("file_url",5),submitTheTask);


module.exports = Router;
