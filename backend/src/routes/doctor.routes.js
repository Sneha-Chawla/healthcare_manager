const express = require("express");
const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(async (req, res) => {
  const specialization = req.query.specialization || undefined;
  const doctors = await prisma.doctorProfile.findMany({
    where: specialization ? { specialization: { contains: specialization } } : {},
    include: { user: { select: { name: true, email: true } } },
    orderBy: { specialization: "asc" }
  });

  res.json(doctors.map((doctor) => ({
    id: doctor.id,
    name: doctor.user.name,
    email: doctor.user.email,
    specialization: doctor.specialization,
    bio: doctor.bio,
    slotDurationMinutes: doctor.slotDurationMinutes,
    workingHours: JSON.parse(doctor.workingHours)
  })));
}));

router.get("/:id/appointments", asyncHandler(async (req, res) => {
  const appointments = await prisma.appointment.findMany({
    where: { doctorId: req.params.id },
    include: { patient: { include: { user: { select: { name: true, email: true } } } } },
    orderBy: { startAt: "asc" }
  });
  res.json(appointments);
}));

module.exports = router;
