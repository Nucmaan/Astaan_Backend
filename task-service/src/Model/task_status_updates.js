const { DataTypes, Op } = require("sequelize");
const { sequelize } = require("../Database/index.js");
const Task = require("./subTask.js");

const TaskStatusUpdate = sequelize.define("TaskStatusUpdate", {
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
      key: "id",
    },
    onDelete: "CASCADE",
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      isIn: [["To Do", "In Progress", "Review", "Completed"]],
    },
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  time_taken_in_hours: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: null, 
  },
  time_taken_in_minutes: {
    type: DataTypes.INTEGER,
    defaultValue: null, 
  },
}, {
  timestamps: true, 
});
 

module.exports = TaskStatusUpdate;