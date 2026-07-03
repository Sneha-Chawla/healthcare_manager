const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function createUser(name, email, role) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name,
      email,
      role,
      passwordHash: await bcrypt.hash("Password@123", 10)
    }
  });
}

async function main() {
  await createUser("Clinic Admin", "admin@clinic.test", "ADMIN");
  const doctorUser = await createUser("Dr. Meera Sharma", "doctor@clinic.test", "DOCTOR");
  const patientUser = await createUser("Aarav Patient", "patient@clinic.test", "PATIENT");

  await prisma.patientProfile.upsert({
    where: { userId: patientUser.id },
    update: {},
    create: { userId: patientUser.id }
  });

  await prisma.doctorProfile.upsert({
    where: { userId: doctorUser.id },
    update: {},
    create: {
      userId: doctorUser.id,
      specialization: "Cardiology",
      bio: "Senior cardiologist with experience in preventive heart care.",
      slotDurationMinutes: 30,
      workingHours: JSON.stringify([
        { dayOfWeek: 1, start: "09:00", end: "17:00" },
        { dayOfWeek: 2, start: "09:00", end: "17:00" },
        { dayOfWeek: 3, start: "09:00", end: "17:00" },
        { dayOfWeek: 4, start: "09:00", end: "17:00" },
        { dayOfWeek: 5, start: "09:00", end: "14:00" }
      ])
    }
  });

  console.log("Demo data created. Password for all demo users: Password@123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
