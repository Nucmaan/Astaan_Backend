const { DataTypes } = require("sequelize");
const { sequelize }= require("../Database/index.js");
const Task = require("./TasksModel.js");

const SubTask = sequelize.define(
  "SubTask",
  {
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
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
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
      type: DataTypes.FLOAT,
      validate: {
        min: 0.1,
      },
    },

    time_spent: {
      type: DataTypes.FLOAT,
      allowNull: true,   
    },

    assignee_name: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "Not Specified",
    },

    start_time: {
      type: DataTypes.DATE,
    },

    file_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue("file_url");
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue("file_url", JSON.stringify(value));
      },
    },
    completed_at: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
  },
  {
    timestamps: true,
  }
);


module.exports = SubTask;