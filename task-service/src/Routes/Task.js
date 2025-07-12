const Router = require("express").Router();
const { createTask, getSingleTask, getAllTasks, deleteTask, getTaskCount, getAllProjectTasks, updateTask } = require("../Controllers/Task.js");
const { TaskUpload } = require("../middleware/taskmiddleware.js");

Router.post("/addTask",TaskUpload.single("file_url"), createTask);
Router.get("/singleTask/:id", getSingleTask);
Router.delete("/deleteSingleTask/:id",deleteTask);
Router.get("/allTasks", getAllTasks);
Router.put("/updateTask/:id",TaskUpload.single("file_url"),updateTask);
Router.get("/projectTasks/:project_id",getAllProjectTasks);
Router.get("/DashboardTasks",getTaskCount);

module.exports = Router;
