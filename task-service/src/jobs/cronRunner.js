const cron = require("node-cron");
const { refreshTaskCache }  = require("../Services/TaskService.js");


const job = cron.schedule("0 2 * * *", async () => {
  console.log("Cron job started: Refreshing cache");
  await refreshTaskCache();
});

module.exports = job;
