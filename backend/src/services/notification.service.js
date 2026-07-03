const prisma = require("../utils/prisma");
const { sendEmail } = require("./email.service");

async function queueNotification({ appointmentId, recipientEmail, type, subject, message }) {
  const notification = await prisma.notification.create({
    data: { appointmentId, recipientEmail, type, subject, message }
  });

  try {
    await sendEmail({ to: recipientEmail, subject, message });
    return prisma.notification.update({
      where: { id: notification.id },
      data: { status: "SENT" }
    });
  } catch (error) {
    return prisma.notification.update({
      where: { id: notification.id },
      data: { status: "FAILED", retryCount: 1, lastError: error.message }
    });
  }
}

async function retryFailedNotifications() {
  const failed = await prisma.notification.findMany({
    where: { status: "FAILED", retryCount: { lt: 3 } },
    take: 10
  });

  for (const item of failed) {
    try {
      await sendEmail({ to: item.recipientEmail, subject: item.subject, message: item.message });
      await prisma.notification.update({ where: { id: item.id }, data: { status: "SENT" } });
    } catch (error) {
      await prisma.notification.update({
        where: { id: item.id },
        data: { retryCount: item.retryCount + 1, lastError: error.message }
      });
    }
  }
}

module.exports = { queueNotification, retryFailedNotifications };
