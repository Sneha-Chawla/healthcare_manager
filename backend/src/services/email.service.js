const env = require("../config/env");

async function sendEmail({ to, subject, message }) {
  if (!env.sendgridKey) {
    console.log("[Email fallback]", { to, subject, message });
    return { sent: true, provider: "console" };
  }

  // Add SendGrid SDK call here for production.
  console.log("[SendGrid placeholder]", { to, subject });
  return { sent: true, provider: "sendgrid" };
}

module.exports = { sendEmail };
