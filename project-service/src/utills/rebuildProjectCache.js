const { refreshProjectCache } = require('../Services/ProjectService.js');

refreshProjectCache().then(() => {
  console.log("Manual cache rebuild complete.");
  process.exit(0);
});