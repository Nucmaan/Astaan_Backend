const cron = require("node-cron");
const { refreshProjectCache } = require("../Services/ProjectService");

// Run every 24 hours at 2am (change to "*/2 * * * *" for testing)
const job = cron.schedule("0 2 * * *", async () => {
  console.log("🔄 Cron job started: Refreshing project cache");
  await refreshProjectCache();
});

module.exports = job;
