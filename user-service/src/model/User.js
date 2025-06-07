const { DataTypes } = require("sequelize");
const sequelize = require("../Database/index.js"); 

 const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    employee_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    mobile: {
      type: DataTypes.STRING(10),
  allowNull: true,
  unique: false, 
    },
    password: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "User", 
      validate: {
        isIn: [["User", "Admin", "Translator", "Supervisor", "Voice-over Artist", "Sound Engineer", "Editor"]],
      },
    },
    profile_image: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    isverified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    reset_token: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    reset_token_expires: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    work_experience_level: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "Entry Level",
      validate: {
        isIn: [["Entry Level", "Mid Level", "Senior Level"]],
      },
    },
  },
  {
    tableName: "Users",
    timestamps: false,
  }
);

module.exports = User;
