const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");
const env = require("../config/env");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

function signToken(user) {
  return jwt.sign({ userId: user.id, role: user.role }, env.jwtSecret, { expiresIn: "7d" });
}

router.post("/register", asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: "PATIENT" }
  });

  await prisma.patientProfile.create({ data: { userId: user.id } });

  res.status(201).json({ token: signToken(user), user: { id: user.id, name, email, role: user.role } });
}));

router.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({
    where: { email },
    include: { patient: true, doctor: true }
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  res.json({
    token: signToken(user),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      patientId: user.patient && user.patient.id,
      doctorId: user.doctor && user.doctor.id
    }
  });
}));

module.exports = router;
