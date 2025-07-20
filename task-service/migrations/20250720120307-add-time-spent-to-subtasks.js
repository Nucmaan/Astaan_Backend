'use strict';

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('SubTasks', 'time_spent', {
      type: Sequelize.FLOAT,
      allowNull: true,
      // comment: 'Actual time spent to complete the subtask, in hours', // optional
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('SubTasks', 'time_spent');
  }
};
