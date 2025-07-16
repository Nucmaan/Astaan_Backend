'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SubTasks', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      task_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Tasks', // make sure this matches your actual table name
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT
      },
      status: {
        type: Sequelize.ENUM('To Do', 'In Progress', 'Review', 'Completed'),
        defaultValue: 'To Do'
      },
      priority: {
        type: Sequelize.ENUM('Low', 'Medium', 'High', 'Critical'),
        defaultValue: 'Medium'
      },
      deadline: {
        type: Sequelize.DATE
      },
      estimated_hours: {
        type: Sequelize.FLOAT
      },
      start_time: {
        type: Sequelize.DATE
      },
      file_url: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        defaultValue: null
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('SubTasks');
  }
};
