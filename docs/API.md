# API Documentation

Base URL: `http://localhost:4000/api`

## Auth

`POST /auth/register`

```json
{ "name": "Asha", "email": "asha@example.com", "password": "Password@123", "role": "PATIENT" }
```

`POST /auth/login`

```json
{ "email": "patient@clinic.test", "password": "Password@123" }
```

## Doctors

`GET /doctors?specialization=Cardiology`

Returns doctors with working hours, slot duration, and next available slots.

## Admin

`POST /admin/doctors`

```json
{
  "userId": "doctor-user-id",
  "specialization": "Cardiology",
  "bio": "10 years of experience",
  "slotDurationMinutes": 30,
  "workingHours": [{ "dayOfWeek": 1, "start": "09:00", "end": "17:00" }]
}
```

`POST /admin/doctors/:doctorId/leave`

```json
{ "date": "2026-07-10", "reason": "Conference" }
```

## Appointments

`POST /appointments/hold`

```json
{ "doctorId": "doctor-id", "startAt": "2026-07-10T10:00:00.000Z", "endAt": "2026-07-10T10:30:00.000Z" }
```

`POST /appointments`

```json
{
  "doctorId": "doctor-id",
  "startAt": "2026-07-10T10:00:00.000Z",
  "endAt": "2026-07-10T10:30:00.000Z",
  "symptoms": "Chest discomfort and shortness of breath",
  "holdId": "optional-hold-id"
}
```

`POST /appointments/:id/visit-notes`

```json
{
  "clinicalNotes": "Mild gastritis suspected. No cardiac symptoms.",
  "prescription": [
    { "medicine": "Pantoprazole", "dosage": "40mg", "frequency": "Once daily", "days": 14 }
  ],
  "followUpDate": "2026-07-24"
}
```

`POST /appointments/:id/cancel`

```json
{ "reason": "Patient unavailable" }
```
