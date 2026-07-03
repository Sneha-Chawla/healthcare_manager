require("dotenv").config();

module.exports = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-this",
  appUrl: process.env.APP_URL || "http://localhost:5173",
  openAiKey: process.env.OPENAI_API_KEY || "",
  sendgridKey: process.env.SENDGRID_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "clinic@example.com"
};
