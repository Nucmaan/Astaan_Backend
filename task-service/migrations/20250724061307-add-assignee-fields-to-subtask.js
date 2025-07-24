'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('SubTasks', 'assignee_empId', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "Not Specified",
    });

    await queryInterface.addColumn('SubTasks', 'assignee_expLevel', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "Not Specified",
    });

    await queryInterface.addColumn('SubTasks', 'assignee_role', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "Not Specified",
    });

    await queryInterface.addColumn('SubTasks', 'assignedTo_name', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "Not Specified",
    });

    await queryInterface.addColumn('SubTasks', 'assignedTo_empId', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "Not Specified",
    });

    await queryInterface.addColumn('SubTasks', 'assignedTo_expLevel', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "Not Specified",
    });

    await queryInterface.addColumn('SubTasks', 'assignedTo_role', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "Not Specified",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('SubTasks', 'assignee_empId');
    await queryInterface.removeColumn('SubTasks', 'assignee_expLevel');
    await queryInterface.removeColumn('SubTasks', 'assignee_role');
    await queryInterface.removeColumn('SubTasks', 'assignedTo_name');
    await queryInterface.removeColumn('SubTasks', 'assignedTo_empId');
    await queryInterface.removeColumn('SubTasks', 'assignedTo_expLevel');
    await queryInterface.removeColumn('SubTasks', 'assignedTo_role');
  }
};
