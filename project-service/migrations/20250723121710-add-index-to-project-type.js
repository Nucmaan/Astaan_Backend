'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('projects', ['project_type'], {
      name: 'idx_project_type'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('projects', 'idx_project_type');
  }
};