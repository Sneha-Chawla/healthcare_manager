const cron = require("node-cron");
const app = require("./app");
const env = require("./config/env");
const { retryFailedNotifications } = require("./services/notification.service");

cron.schedule("*/5 * * * *", async () => {
  await retryFailedNotifications();
});

app.listen(env.port, () => {
  console.log(`Backend running on http://localhost:${env.port}`);
});
