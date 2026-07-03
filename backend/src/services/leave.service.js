const prisma = require("../utils/prisma");
const { queueNotification } = require("./notification.service");
const { deleteCalendarEvent } = require("./calendar.service");

function dayRange(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

async function markDoctorLeave({ doctorId, date, reason }) {
  const { start, end } = dayRange(date);

  const leave = await prisma.doctorLeave.upsert({
    where: { doctorId_date: { doctorId, date: start } },
    update: { reason },
    create: { doctorId, date: start, reason }
  });

  const affected = await prisma.appointment.findMany({
    where: {
      doctorId,
      status: "BOOKED",
      startAt: { gte: start, lt: end }
    },
    include: { patient: { include: { user: true } }, doctor: { include: { user: true } } }
  });

  for (const appointment of affected) {
    await prisma.$transaction(async (tx) => {
      await tx.bookingLock.deleteMany({
        where: { doctorId, startAt: appointment.startAt, endAt: appointment.endAt }
      });
      await tx.appointment.update({
        where: { id: appointment.id },
        data: { status: "CANCELLED_BY_CLINIC", cancellationReason: `Doctor on leave: ${reason || "Leave"}` }
      });
    });

    await deleteCalendarEvent(appointment);
    await queueNotification({
      appointmentId: appointment.id,
      recipientEmail: appointment.patient.user.email,
      type: "DOCTOR_LEAVE_CANCELLATION",
      subject: "Appointment cancelled due to doctor leave",
      message: `${appointment.doctor.user.name} is on leave. Please book another slot.`
    });
  }

  return { leave, affectedCount: affected.length };
}

module.exports = { markDoctorLeave };
