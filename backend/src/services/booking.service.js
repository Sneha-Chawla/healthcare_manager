const prisma = require("../utils/prisma");
const { createPreVisitSummary, createPostVisitSummary } = require("./llm.service");
const { queueNotification } = require("./notification.service");
const { createCalendarEvent, deleteCalendarEvent } = require("./calendar.service");

function sameDateOnly(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isInsideWorkingHours(doctor, startAt, endAt) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const workingHours = JSON.parse(doctor.workingHours);
  const rule = workingHours.find((item) => item.dayOfWeek === start.getDay());
  if (!rule) return false;

  const [startHour, startMinute] = rule.start.split(":").map(Number);
  const [endHour, endMinute] = rule.end.split(":").map(Number);
  const open = new Date(start);
  open.setHours(startHour, startMinute, 0, 0);
  const close = new Date(start);
  close.setHours(endHour, endMinute, 0, 0);

  return start >= open && end <= close;
}

async function holdSlot({ patientId, doctorId, startAt, endAt }) {
  const doctor = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
  if (!doctor) throw Object.assign(new Error("Doctor not found"), { status: 404 });

  if (!isInsideWorkingHours(doctor, startAt, endAt)) {
    throw Object.assign(new Error("Selected slot is outside doctor's working hours"), { status: 400 });
  }

  const lock = await prisma.bookingLock.findFirst({ where: { doctorId, startAt, endAt } });
  if (lock) throw Object.assign(new Error("Slot is already booked"), { status: 409 });

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  return prisma.slotHold.create({
    data: { patientId, doctorId, startAt, endAt, expiresAt }
  });
}

async function bookAppointment({ patientId, doctorId, startAt, endAt, symptoms, holdId }) {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorId },
    include: { user: true }
  });
  if (!doctor) throw Object.assign(new Error("Doctor not found"), { status: 404 });
  if (!isInsideWorkingHours(doctor, startAt, endAt)) {
    throw Object.assign(new Error("Selected slot is outside doctor's working hours"), { status: 400 });
  }

  const leave = await prisma.doctorLeave.findUnique({
    where: { doctorId_date: { doctorId, date: sameDateOnly(startAt) } }
  });
  if (leave) throw Object.assign(new Error("Doctor is on leave for this date"), { status: 409 });

  if (holdId) {
    const hold = await prisma.slotHold.findUnique({ where: { id: holdId } });
    if (!hold || hold.patientId !== patientId || hold.expiresAt < new Date()) {
      throw Object.assign(new Error("Slot hold expired. Please select the slot again."), { status: 409 });
    }
  }

  const preVisit = await createPreVisitSummary(symptoms);

  const appointment = await prisma.$transaction(async (tx) => {
    await tx.bookingLock.create({ data: { doctorId, startAt, endAt } });
    if (holdId) await tx.slotHold.deleteMany({ where: { id: holdId } });

    return tx.appointment.create({
      data: {
        patientId,
        doctorId,
        startAt,
        endAt,
        symptoms,
        preVisitSummary: preVisit.summary,
        urgencyLevel: preVisit.urgencyLevel,
        llmStatus: preVisit.llmStatus
      },
      include: { patient: { include: { user: true } }, doctor: { include: { user: true } } }
    });
  });

  await queueNotification({
    appointmentId: appointment.id,
    recipientEmail: appointment.patient.user.email,
    type: "BOOKING_CONFIRMATION",
    subject: "Appointment confirmed",
    message: `Your appointment with ${appointment.doctor.user.name} is confirmed.`
  });

  await queueNotification({
    appointmentId: appointment.id,
    recipientEmail: appointment.doctor.user.email,
    type: "DOCTOR_NEW_BOOKING",
    subject: "New patient appointment",
    message: `New appointment booked. Pre-visit summary: ${appointment.preVisitSummary}`
  });

  const calendarResult = await createCalendarEvent(appointment);
  await prisma.calendarEvent.create({
    data: {
      appointmentId: appointment.id,
      provider: "GOOGLE",
      externalId: calendarResult.externalId,
      status: calendarResult.status
    }
  });

  return appointment;
}

async function cancelAppointment({ appointmentId, user, reason }) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: { include: { user: true } }, doctor: { include: { user: true } } }
  });
  if (!appointment) throw Object.assign(new Error("Appointment not found"), { status: 404 });

  const isOwner = user.patient && user.patient.id === appointment.patientId;
  const isAdmin = user.role === "ADMIN";
  if (!isOwner && !isAdmin) throw Object.assign(new Error("Not allowed"), { status: 403 });

  const status = isAdmin ? "CANCELLED_BY_CLINIC" : "CANCELLED_BY_PATIENT";
  const updated = await prisma.$transaction(async (tx) => {
    await tx.bookingLock.deleteMany({
      where: { doctorId: appointment.doctorId, startAt: appointment.startAt, endAt: appointment.endAt }
    });
    return tx.appointment.update({
      where: { id: appointmentId },
      data: { status, cancellationReason: reason || "Cancelled" }
    });
  });

  await deleteCalendarEvent(appointment);
  await queueNotification({
    appointmentId: appointment.id,
    recipientEmail: appointment.patient.user.email,
    type: "CANCELLATION",
    subject: "Appointment cancelled",
    message: `Your appointment has been cancelled. Reason: ${reason || "Not specified"}`
  });

  return updated;
}

async function addVisitNotes({ appointmentId, doctorId, clinicalNotes, prescription, followUpDate }) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment || appointment.doctorId !== doctorId) {
    throw Object.assign(new Error("Appointment not found for this doctor"), { status: 404 });
  }

  const postVisit = await createPostVisitSummary(clinicalNotes, prescription);
  return prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      clinicalNotes,
      prescription,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      postVisitSummary: postVisit.summary,
      llmStatus: postVisit.llmStatus,
      status: "COMPLETED"
    }
  });
}

module.exports = { holdSlot, bookAppointment, cancelAppointment, addVisitNotes };
