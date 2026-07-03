const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, allowRoles } = require("../middleware/auth");
const { markDoctorLeave } = require("../services/leave.service");

const router = express.Router();

router.use(requireAuth, allowRoles("ADMIN"));

router.post("/doctors", asyncHandler(async (req, res) => {
  const { userId, name, email, password, specialization, bio, slotDurationMinutes, workingHours } = req.body;
  let doctorUserId = userId;

  if (!doctorUserId) {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: "DOCTOR",
        passwordHash: await bcrypt.hash(password || "Password@123", 10)
      }
    });
    doctorUserId = user.id;
  }

  const doctor = await prisma.doctorProfile.create({
    data: {
      userId: doctorUserId,
      specialization,
      bio: bio || "Doctor profile created by admin.",
      slotDurationMinutes: Number(slotDurationMinutes || 30),
      workingHours: JSON.stringify(workingHours || [
        { dayOfWeek: 1, start: "09:00", end: "17:00" },
        { dayOfWeek: 2, start: "09:00", end: "17:00" },
        { dayOfWeek: 3, start: "09:00", end: "17:00" },
        { dayOfWeek: 4, start: "09:00", end: "17:00" },
        { dayOfWeek: 5, start: "09:00", end: "14:00" }
      ])
    }
  });

  res.status(201).json(doctor);
}));

router.post("/doctors/:doctorId/leave", asyncHandler(async (req, res) => {
  const result = await markDoctorLeave({
    doctorId: req.params.doctorId,
    date: req.body.date,
    reason: req.body.reason
  });
  res.json(result);
}));

router.get("/users", asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { createdAt: "desc" }
  });
  res.json(users);
}));

module.exports = router;
