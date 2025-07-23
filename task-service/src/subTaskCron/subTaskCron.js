const cron = require("node-cron");
const { refreshSubTaskCache } = require("../Services/subTask.js");  

 cron.schedule("30 2 * * *", async () => {
  try {
    await refreshSubTaskCache();
  } catch (e) {
    console.error("❌ Failed to refresh SubTask cache:", e.message);
  }
});
