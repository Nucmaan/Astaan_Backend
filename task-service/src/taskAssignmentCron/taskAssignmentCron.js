const cron = require("node-cron");
const { refreshTaskAssignmentCache } = require("../Services/taskAssignmentService.js");  

 cron.schedule("*/2 * * * *", async () => {
  try {
    console.log("Running task assignment cache refresh cron job...");
    await refreshTaskAssignmentCache();
  } catch (e) {
    console.error("❌ Failed to refresh SubTask cache:", e.message);
  }
});
