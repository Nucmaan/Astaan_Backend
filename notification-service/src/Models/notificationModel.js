const { DataTypes } = require("sequelize");
const sequelize = require("../Config/index.js"); 

 const Notification = sequelize.define(
  "notification",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },  
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "notification",
    timestamps: false,
  }
);

module.exports = Notification;
