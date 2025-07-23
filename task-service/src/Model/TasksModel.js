const { DataTypes } = require("sequelize");
const  {sequelize } = require("../Database/index.js");

const Task = sequelize.define(
  "Task",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    project_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("To Do", "In Progress", "Review", "Completed"),
      defaultValue: "To Do",
    },
    priority: {
      type: DataTypes.ENUM("Low", "Medium", "High", "Critical"),
      defaultValue: "Medium",
    },
    deadline: {
      type: DataTypes.DATE,
    },
    estimated_hours: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
      },
    },
    file_url: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    completed_at: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
  },
  {
    timestamps: true, 
    indexes: [
      {
        fields: ['project_id'],
        name: 'idx_task_project_id'
      }
    ]
  }
);

module.exports = Task;