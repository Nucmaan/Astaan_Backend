const Task = require("./TasksModel");      // Your main Task model
const SubTask = require("./subTask");      // Your SubTask model
const TaskAssignment = require("./task_assignments"); // Your TaskAssignment model
const TaskStatusUpdate = require("./task_status_updates"); // Your TaskStatusUpdate model

// Task -> SubTask
Task.hasMany(SubTask, { foreignKey: "task_id", onDelete: "CASCADE" });
SubTask.belongsTo(Task, { foreignKey: "task_id", onDelete: "CASCADE" });

// SubTask -> TaskAssignment
SubTask.hasMany(TaskAssignment, { foreignKey: "task_id", onDelete: "CASCADE" });
TaskAssignment.belongsTo(SubTask, { foreignKey: "task_id", onDelete: "CASCADE" });

// SubTask -> TaskStatusUpdate
SubTask.hasMany(TaskStatusUpdate, { foreignKey: "task_id", onDelete: "CASCADE" });
TaskStatusUpdate.belongsTo(SubTask, { foreignKey: "task_id", onDelete: "CASCADE" });

module.exports = { Task, SubTask, TaskAssignment, TaskStatusUpdate };