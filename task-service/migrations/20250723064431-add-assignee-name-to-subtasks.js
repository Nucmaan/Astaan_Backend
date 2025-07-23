'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('SubTasks', 'assignee_name', {
      type: Sequelize.STRING,
      allowNull: true, 
      defaultValue: "Not Specified",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('SubTasks', 'assignee_name');
  }
};