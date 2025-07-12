require("dotenv").config();
const app = require("./app.js");
const { connect } = require("./Database/index.js");
const cronJob = require("./jobs/cronRunner.js");

const PORT = process.env.PORT || 3000;

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
