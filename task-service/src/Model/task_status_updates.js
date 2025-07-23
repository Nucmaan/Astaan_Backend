const { DataTypes, Op } = require("sequelize");
const { sequelize } = require("../Database/index.js");
const SubTask = require("./subTask.js");

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
      model: SubTask,
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
  assignedby_id: {
    type: DataTypes.INTEGER,
    allowNull: true
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
  indexes: [
    { fields: ['task_id'], name: 'idx_taskstatusupdate_task_id' },
    { fields: ['task_id', 'updated_at'], name: 'idx_taskstatusupdate_task_id_updated_at' }
  ]
});
 

module.exports = TaskStatusUpdate;