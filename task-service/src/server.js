require("dotenv").config();
const app = require("./app.js");
const { connect } = require("./Database/index.js");
require("./Model/associations.js");

const cronJob = require("./jobs/cronRunner.js");
 require("./subTaskCron/subTaskCron.js");
 //require("./taskAssignmentCron/taskAssignmentCron.js");

const PORT = process.env.PORT;

(async () => {
  try {
    await connect();          
    cronJob.start();          

    app.listen(PORT, () => {
      console.log(`Worker ${process.pid} running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();

