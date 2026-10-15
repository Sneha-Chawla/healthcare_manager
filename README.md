# Healthcare Appointment & Follow-up Manager
 URL: https://healthcare-manager-frontend.onrender.com
 
This is a placement-round project for a clinic appointment system. It has separate patient, doctor, and admin workflows, safe slot booking, doctor leave handling, LLM summaries, email/calendar integration points, and reminder jobs.

I kept the frontend simple: **HTML, CSS, and JavaScript**. The backend is **Node.js + Express**. The database uses **SQLite + Prisma** so you do not need a complicated database setup.

## Folder Structure

```text
healthcare-appointment-manager/
  backend/
    prisma/
      schema.prisma              Database tables and relationships
      seed.js                    Demo data for admin, doctor, patient
    src/
      app.js                     Express app and route mounting
      server.js                  Starts API server
      config/env.js              Reads environment variables
      middleware/auth.js         JWT auth and role checking
      middleware/error.js        Common error handler
      routes/*.routes.js         REST API route files
      services/*.service.js      Business logic
      utils/prisma.js            Prisma client
  frontend/
    index.html                   Main UI
    patient.html                  Patient portal
    doctor.html                   Doctor portal
    admin.html                    Admin portal
    styles.css                   Responsive design
    app.js                       Login logic
    portal.js                    Portal dashboard logic
  docs/
    API.md                       API documentation
    LLM_PROMPTS.md               LLM prompts and fallback behavior
    SYSTEM_DESIGN.md             Short system design write-up
  .env.example
  package.json
```

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: SQLite
- ORM: Prisma
- Auth: JWT role-based auth
- AI: OpenAI-ready service with fallback summaries
- Email: SendGrid-ready service with fallback logging
- Calendar: Google Calendar-ready service with fallback logging

## What Is Prisma?

Prisma is not a backend. It is an ORM, which means it helps the backend talk to the database using JavaScript.

```js
const doctors = await prisma.doctorProfile.findMany({
  where: { specialization: "Cardiology" }
});
```

In the interview, say:

> I used Prisma as an ORM to define my database schema and safely perform database operations from my Express backend. I used SQLite for easy local demo setup, but the schema can be moved to PostgreSQL for production.

## Setup Steps

1. Install Node.js 18 or 20.
2. Open terminal inside this folder.
3. Install dependencies:

```bash
npm install
```

4. Copy `.env.example` to `.env`, and also copy backend env for Prisma:

```bash
copy .env.example .env
copy backend\.env.example backend\.env
```

5. Create the SQLite database and tables:

```bash
npm run db:migrate
```

6. Add demo data:

```bash
npm run db:seed
```

7. Start the project:

```bash
npm run dev
```

Open:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:4000/api/health
```

## Demo Logins

```text
Admin:   admin@clinic.test   Password@123
Doctor:  doctor@clinic.test  Password@123
Patient: patient@clinic.test Password@123
```

## Interview Explanation

Say this:

> This project is not just a booking form. It solves the real clinic problems: role-based access, doctor availability, double-booking prevention, leave conflicts, AI summaries, email/calendar updates, and reminder reliability.

Important points:

- Patient can search doctors and book a slot.
- Admin can create doctors and mark leave days.
- Doctor can view appointments and submit visit notes.
- Booking uses a database transaction and a unique booking lock to prevent double-booking.
- If a doctor is marked on leave, future appointments are cancelled and patients are notified.
- LLM failures do not break the system. A fallback summary is saved.
- Email and calendar services are separated, so real providers can be plugged in later.

## Best Files To Explain

- `backend/prisma/schema.prisma`: database design
- `backend/src/services/booking.service.js`: double-booking logic
- `backend/src/services/leave.service.js`: doctor leave conflict logic
- `backend/src/services/llm.service.js`: prompts and graceful fallback
- `frontend/app.js`: frontend API calls and dashboard logic

## Google Calendar Setup For Real Deployment

1. Create a Google Cloud project.
2. Enable Google Calendar API.
3. Create OAuth 2.0 credentials.
4. Add redirect URI: `http://localhost:4000/api/calendar/oauth/callback`.
5. Put client id and secret in `.env`.

For this student version, the calendar service logs the event when credentials are missing. This lets the demo work even without Google setup.
