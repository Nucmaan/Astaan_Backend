'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('Tasks', ['project_id'], {
      name: 'idx_task_project_id'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('Tasks', 'idx_task_project_id');
  }
};