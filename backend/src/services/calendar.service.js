async function createCalendarEvent(appointment) {
  console.log("[Calendar fallback] Create event for appointment", appointment.id);
  return { status: "CREATED_LOCALLY", externalId: null };
}

async function deleteCalendarEvent(appointment) {
  console.log("[Calendar fallback] Delete event for appointment", appointment.id);
  return { status: "DELETED_LOCALLY" };
}

module.exports = { createCalendarEvent, deleteCalendarEvent };
