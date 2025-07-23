const cron = require("node-cron");
const { refreshUserCache }  = require("../Services/UserService");

 
const job = cron.schedule("0 2 * * *", async () => {
  console.log("Cron job started: Refreshing cache");
  await refreshUserCache();
});

module.exports = job;
