'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('projects', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      project_image: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
      },
      deadline: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: 'Pending',
      },
      priority: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: 'Medium',
      },
      progress: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      project_type: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: 'unknown',
      },
      channel: {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: null,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('projects');
  },
};
