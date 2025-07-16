'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('TaskStatusUpdates', {
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
          model: 'SubTasks', // references SubTask model (table name must match!)
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: false
        // Optionally add FK to Users
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      time_taken_in_hours: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: null
      },
      time_taken_in_minutes: {
        type: Sequelize.INTEGER,
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
    await queryInterface.dropTable('TaskStatusUpdates');
  }
};
