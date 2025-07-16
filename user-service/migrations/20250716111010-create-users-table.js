"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("Users", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      employee_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      mobile: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      password: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      role: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "User",
      },
      profile_image: {
        type: Sequelize.TEXT,
        defaultValue: null,
      },
      isverified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      reset_token: {
        type: Sequelize.TEXT,
        defaultValue: null,
      },
      reset_token_expires: {
        type: Sequelize.DATE,
        defaultValue: null,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      work_experience_level: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "Entry Level",
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("Users");
  },
};
