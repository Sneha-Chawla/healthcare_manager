const express = require("express");
const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, allowRoles } = require("../middleware/auth");
const { holdSlot, bookAppointment, cancelAppointment, addVisitNotes } = require("../services/booking.service");

const router = express.Router();

router.use(requireAuth);

router.get("/mine", asyncHandler(async (req, res) => {
  const where = {};
  if (req.user.role === "PATIENT") where.patientId = req.user.patient.id;
  if (req.user.role === "DOCTOR") where.doctorId = req.user.doctor.id;

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      doctor: { include: { user: { select: { name: true, email: true } } } },
      patient: { include: { user: { select: { name: true, email: true } } } }
    },
    orderBy: { startAt: "desc" }
  });

  res.json(appointments);
}));

router.post("/hold", allowRoles("PATIENT"), asyncHandler(async (req, res) => {
  const hold = await holdSlot({
    patientId: req.user.patient.id,
    doctorId: req.body.doctorId,
    startAt: new Date(req.body.startAt),
    endAt: new Date(req.body.endAt)
  });
  res.status(201).json(hold);
}));

router.post("/", allowRoles("PATIENT"), asyncHandler(async (req, res) => {
  const appointment = await bookAppointment({
    patientId: req.user.patient.id,
    doctorId: req.body.doctorId,
    startAt: new Date(req.body.startAt),
    endAt: new Date(req.body.endAt),
    symptoms: req.body.symptoms,
    holdId: req.body.holdId
  });
  res.status(201).json(appointment);
}));

router.post("/:id/cancel", asyncHandler(async (req, res) => {
  const appointment = await cancelAppointment({
    appointmentId: req.params.id,
    user: req.user,
    reason: req.body.reason
  });
  res.json(appointment);
}));

router.post("/:id/visit-notes", allowRoles("DOCTOR"), asyncHandler(async (req, res) => {
  const appointment = await addVisitNotes({
    appointmentId: req.params.id,
    doctorId: req.user.doctor.id,
    clinicalNotes: req.body.clinicalNotes,
    prescription: req.body.prescription,
    followUpDate: req.body.followUpDate
  });
  res.json(appointment);
}));

module.exports = router;
