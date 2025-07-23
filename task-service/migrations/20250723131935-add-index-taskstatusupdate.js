"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex("TaskStatusUpdates", ["task_id"], {
      name: "idx_taskstatusupdate_task_id"
    });

    await queryInterface.addIndex("TaskStatusUpdates", ["task_id", "updated_at"], {
      name: "idx_taskstatusupdate_task_id_updated_at"
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("TaskStatusUpdates", "idx_taskstatusupdate_task_id");
    await queryInterface.removeIndex("TaskStatusUpdates", "idx_taskstatusupdate_task_id_updated_at");
  }
};
