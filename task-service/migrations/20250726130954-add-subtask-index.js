'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex("SubTasks", ["task_id"], {
      name: "idx_subtask_task_id",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("SubTasks", "idx_subtask_task_id");
  },
};

