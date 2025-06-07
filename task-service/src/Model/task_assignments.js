const { DataTypes } = require("sequelize");
const sequelize = require("../Database/index.js");
const Task = require("./subTask.js");  

const TaskAssignment = sequelize.define("TaskAssignment", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  task_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Task,  
      key: 'id',
    },
    onDelete: 'CASCADE', 
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  assigned_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,  
  },
});

Task.hasMany(TaskAssignment, { foreignKey: 'task_id' });

module.exports = TaskAssignment;
