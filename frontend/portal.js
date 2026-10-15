const API_URL = "https://healthcare-manager-2-kvry.onrender.com/api";

function checkAuth(allowedRole) {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");
  if (!token || !userStr) {
    window.location.href = "index.html";
    return null;
  }
  try {
    const user = JSON.parse(userStr);
    if (user.role !== allowedRole) {
      window.location.href = "index.html";
      return null;
    }
    return { token, user };
  } catch (e) {
    localStorage.clear();
    window.location.href = "index.html";
    return null;
  }
}

function getHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
}

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  const toastText = document.getElementById("toastText");
  if (!toast || !toastText) return;

  toastText.innerText = message;
  toast.className = "fixed bottom-5 right-5 text-white px-5 py-3.5 rounded-2xl shadow-xl text-sm font-medium flex items-center space-x-3 transition-all duration-300 transform border z-50";

  if (isError) {
    toast.classList.add("bg-rose-600", "border-rose-500");
  } else {
    toast.classList.add("bg-slate-900", "border-slate-800");
  }

  toast.classList.remove("hidden", "translate-y-20");

  setTimeout(() => {
    toast.classList.remove("translate-y-20");
  }, 10);

  setTimeout(() => {
    toast.classList.add("translate-y-20");
    setTimeout(() => {
      toast.classList.add("hidden");
    }, 300);
  }, 4000);
}

// -------------------------------------------------------------------
// PATIENT PORTAL
// -------------------------------------------------------------------
function setupPatientPage() {
  const auth = checkAuth("PATIENT");
  if (!auth) return;
  const { user } = auth;

  // Set Profile Header Details
  const welcomeText = document.getElementById("welcomeText");
  const userAvatar = document.getElementById("userAvatar");
  if (welcomeText) welcomeText.innerText = user.name;
  if (userAvatar) userAvatar.innerText = user.name.charAt(0).toUpperCase();

  let activeHold = null;
  let holdTimer = null;

  async function fetchDoctors(specialization = "") {
    try {
      const url = specialization
        ? `${API_URL}/doctors?specialization=${encodeURIComponent(specialization)}`
        : `${API_URL}/doctors`;
      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch doctors");
      const doctors = await res.json();
      renderDoctors(doctors);
      populateDoctorSelect(doctors);
    } catch (e) {
      showToast(e.message, true);
    }
  }

  function renderDoctors(doctors) {
    const list = document.getElementById("doctorList");
    if (!list) return;
    if (doctors.length === 0) {
      list.innerHTML = `<p class="text-sm text-slate-400">No doctors found.</p>`;
      return;
    }

    list.innerHTML = doctors.map(doc => {
      let workingHoursHtml = "No regular schedule set";
      try {
        const whs = typeof doc.workingHours === "string" ? JSON.parse(doc.workingHours) : doc.workingHours;
        if (Array.isArray(whs)) {
          const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          workingHoursHtml = whs.map(wh => `${days[wh.dayOfWeek]}: ${wh.start}-${wh.end}`).join(", ");
        }
      } catch (e) {}

      return `
        <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between hover:border-blue-400 transition-all cursor-pointer" onclick="selectDoctor('${doc.id}')">
          <div class="space-y-2">
            <div class="flex justify-between items-start">
              <h4 class="font-bold text-slate-900">${doc.name}</h4>
              <span class="bg-blue-50 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-blue-100">${doc.specialization}</span>
            </div>
            <p class="text-xs text-slate-500 line-clamp-2">${doc.bio}</p>
            <div class="pt-1">
              <div class="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1 mb-0.5">
                <i data-lucide="clock" class="h-3 w-3 inline mr-1"></i> Working Hours
              </div>
              <p class="text-[11px] text-slate-600">${workingHoursHtml}</p>
            </div>
          </div>
          <div class="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
            <span class="text-[10px] text-slate-400"><strong class="text-slate-600">${doc.slotDurationMinutes} min</strong> slots</span>
            <button class="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1">
              <span>Select Practitioner</span> <i data-lucide="chevron-right" class="h-3 w-3"></i>
            </button>
          </div>
        </div>
      `;
    }).join("");
    lucide.createIcons();
  }

  function populateDoctorSelect(doctors) {
    const select = document.getElementById("doctorSelect");
    if (!select) return;
    select.innerHTML = '<option value="">-- Choose Practitioner --</option>' +
      doctors.map(doc => `<option value="${doc.id}">${doc.name} (${doc.specialization})</option>`).join("");
  }

  window.selectDoctor = function(doctorId) {
    const select = document.getElementById("doctorSelect");
    if (select) {
      select.value = doctorId;
      triggerHold();
      document.getElementById("bookingForm").scrollIntoView({ behavior: 'smooth' });
    }
  };

  async function triggerHold() {
    const doctorId = document.getElementById("doctorSelect").value;
    const startAt = document.getElementById("startAt").value;
    const endAt = document.getElementById("endAt").value;

    if (!doctorId || !startAt || !endAt) return;

    try {
      if (holdTimer) clearInterval(holdTimer);

      const res = await fetch(`${API_URL}/appointments/hold`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          doctorId,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to hold slot");

      activeHold = data;
      showToast("Slot temporarily held for 5 minutes!");
      startHoldCountdown(new Date(data.expiresAt));
    } catch (e) {
      showToast(e.message, true);
      activeHold = null;
      const submitBtn = document.querySelector("#bookingForm button[type='submit']");
      if (submitBtn) submitBtn.innerHTML = "Confirm Booking";
    }
  }

  function startHoldCountdown(expiryDate) {
    const submitBtn = document.querySelector("#bookingForm button[type='submit']");
    if (!submitBtn) return;
    if (holdTimer) clearInterval(holdTimer);

    holdTimer = setInterval(() => {
      const now = new Date().getTime();
      const distance = expiryDate.getTime() - now;

      if (distance < 0) {
        clearInterval(holdTimer);
        submitBtn.innerHTML = "Confirm Booking";
        submitBtn.disabled = false;
        showToast("Slot hold expired. Please re-select the slot.", true);
        activeHold = null;
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        submitBtn.innerHTML = `Confirm Booking (Hold: ${minutes}m ${seconds}s)`;
      }
    }, 1000);
  }

  // Bind hold triggers
  const startInput = document.getElementById("startAt");
  const endInput = document.getElementById("endAt");
  const doctorSelect = document.getElementById("doctorSelect");

  if (startInput) startInput.addEventListener("change", triggerHold);
  if (endInput) endInput.addEventListener("change", triggerHold);
  if (doctorSelect) doctorSelect.addEventListener("change", triggerHold);

  const bookingForm = document.getElementById("bookingForm");
  if (bookingForm) {
    bookingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const doctorId = document.getElementById("doctorSelect").value;
      const startAt = document.getElementById("startAt").value;
      const endAt = document.getElementById("endAt").value;
      const symptoms = document.getElementById("symptoms").value.trim();

      try {
        const body = {
          doctorId,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          symptoms
        };
        if (activeHold) {
          body.holdId = activeHold.id;
        }

        const res = await fetch(`${API_URL}/appointments`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Booking failed");

        showToast("Appointment booked successfully!");
        bookingForm.reset();
        if (holdTimer) {
          clearInterval(holdTimer);
          holdTimer = null;
        }
        activeHold = null;
        const submitBtn = document.querySelector("#bookingForm button[type='submit']");
        if (submitBtn) submitBtn.innerHTML = "Confirm Booking";

        fetchAppointments();
      } catch (error) {
        showToast(error.message, true);
      }
    });
  }

  async function fetchAppointments() {
    try {
      const res = await fetch(`${API_URL}/appointments/mine`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch appointments");
      const appointments = await res.json();
      renderAppointments(appointments);
    } catch (e) {
      showToast(e.message, true);
    }
  }

  function renderAppointments(appointments) {
    const list = document.getElementById("appointmentList");
    if (!list) return;
    if (appointments.length === 0) {
      list.innerHTML = `<p class="text-sm text-slate-400">No scheduled appointments.</p>`;
      return;
    }

    list.innerHTML = appointments.map(app => {
      const start = new Date(app.startAt).toLocaleString();
      const end = new Date(app.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let statusColor = "bg-blue-50 text-blue-700 border-blue-100";
      if (app.status === "COMPLETED") statusColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
      if (app.status.startsWith("CANCELLED")) statusColor = "bg-rose-50 text-rose-700 border-rose-100";

      let urgencyColor = "bg-slate-100 text-slate-700 border-slate-200";
      if (app.urgencyLevel === "High") urgencyColor = "bg-red-50 text-red-700 border-red-100 animate-pulse";
      if (app.urgencyLevel === "Medium") urgencyColor = "bg-amber-50 text-amber-700 border-amber-100";

      let cancelBtn = "";
      if (app.status === "BOOKED") {
        cancelBtn = `
          <div class="mt-4 pt-3 border-t border-slate-100 flex gap-2 justify-end items-center flex-wrap">
            <input id="cancelReason-${app.id}" placeholder="Cancellation reason (optional)" class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-rose-400 transition-all max-w-[200px]">
            <button onclick="cancelAppointment('${app.id}')" class="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors">
              Cancel Slot
            </button>
          </div>
        `;
      }

      let summaryHtml = "";
      if (app.preVisitSummary) {
        summaryHtml = `
          <div class="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
            <div class="flex items-center space-x-1.5 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <i data-lucide="sparkles" class="h-3 w-3 text-indigo-500"></i>
              <span>AI Pre-visit Diagnostic Triage</span>
            </div>
            <p class="text-slate-600"><span class="font-semibold text-slate-700">Chief Complaint:</span> ${app.preVisitSummary}</p>
          </div>
        `;
      }

      let postVisitHtml = "";
      if (app.status === "COMPLETED") {
        let medicineList = app.prescription || "None";
        postVisitHtml = `
          <div class="mt-4 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-xs space-y-3">
            <div>
              <p class="font-bold text-emerald-800 uppercase tracking-wider text-[10px] mb-1 flex items-center">
                <i data-lucide="sparkles" class="h-3 w-3 mr-1 text-emerald-600"></i> AI Consultation Summary
              </p>
              <p class="text-slate-700 leading-relaxed">${app.postVisitSummary || "No summary available."}</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-emerald-100">
              <div>
                <p class="font-bold text-slate-500 uppercase tracking-wider text-[9px] mb-0.5">Clinical Diagnoses</p>
                <p class="text-slate-600 whitespace-pre-wrap">${app.clinicalNotes || "N/A"}</p>
              </div>
              <div>
                <p class="font-bold text-slate-500 uppercase tracking-wider text-[9px] mb-0.5">Prescribed Treatment</p>
                <p class="text-slate-600 whitespace-pre-wrap">${medicineList}</p>
              </div>
            </div>
            ${app.followUpDate ? `
            <div class="pt-2 border-t border-emerald-100 flex items-center text-slate-600">
              <i data-lucide="calendar" class="h-3 w-3 mr-1.5 text-emerald-600"></i>
              <span>Scheduled Follow-up: <strong class="text-slate-900">${new Date(app.followUpDate).toLocaleDateString()}</strong></span>
            </div>
            ` : ""}
          </div>
        `;
      }

      let cancellationReasonHtml = "";
      if (app.status.startsWith("CANCELLED") && app.cancellationReason) {
        cancellationReasonHtml = `
          <div class="mt-2 text-xs text-rose-600 italic bg-rose-50/50 border border-rose-100 p-2.5 rounded-xl">
            <strong>Cancellation Reason:</strong> ${app.cancellationReason}
          </div>
        `;
      }

      return `
        <div class="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
          <div class="flex flex-wrap justify-between items-start gap-2">
            <div>
              <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">With Practitioner</span>
              <h4 class="font-bold text-base text-slate-900">${app.doctor.user.name} (${app.doctor.specialization})</h4>
              <p class="text-xs text-slate-500 mt-1 flex items-center">
                <i data-lucide="calendar" class="h-3 w-3 mr-1 text-slate-400"></i> ${start} - ${end}
              </p>
            </div>
            <div class="flex space-x-2">
              <span class="${urgencyColor} text-[10px] font-bold px-2 py-0.5 rounded-md border">${app.urgencyLevel || "Normal"} Urgency</span>
              <span class="${statusColor} text-[10px] font-bold px-2.5 py-0.5 rounded-full border">${app.status}</span>
            </div>
          </div>
          <p class="text-xs text-slate-600 mt-3"><span class="font-semibold text-slate-700">Symptoms:</span> ${app.symptoms}</p>
          ${summaryHtml}
          ${postVisitHtml}
          ${cancellationReasonHtml}
          ${cancelBtn}
        </div>
      `;
    }).join("");
    lucide.createIcons();
  }

  window.cancelAppointment = async function(appointmentId) {
    const reasonInput = document.getElementById(`cancelReason-${appointmentId}`);
    const reason = reasonInput ? reasonInput.value.trim() : "Cancelled by patient";

    try {
      const res = await fetch(`${API_URL}/appointments/${appointmentId}/cancel`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to cancel appointment");

      showToast("Appointment cancelled successfully.");
      fetchAppointments();
    } catch (e) {
      showToast(e.message, true);
    }
  };

  const refreshBtn = document.getElementById("refreshAppointments");
  if (refreshBtn) refreshBtn.addEventListener("click", fetchAppointments);

  fetchDoctors();
  fetchAppointments();
}

// -------------------------------------------------------------------
// DOCTOR PORTAL
// -------------------------------------------------------------------
function setupDoctorPage() {
  const auth = checkAuth("DOCTOR");
  if (!auth) return;
  const { user } = auth;

  const welcomeText = document.getElementById("welcomeText");
  const userAvatar = document.getElementById("userAvatar");
  if (welcomeText) welcomeText.innerText = user.name;
  if (userAvatar) userAvatar.innerText = user.name.charAt(0).toUpperCase();

  async function fetchDoctorAppointments() {
    try {
      const res = await fetch(`${API_URL}/appointments/mine`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch appointments");
      const appointments = await res.json();
      renderDoctorAppointments(appointments);
    } catch (e) {
      showToast(e.message, true);
    }
  }

  function renderDoctorAppointments(appointments) {
    const list = document.getElementById("appointmentList");
    if (!list) return;
    if (appointments.length === 0) {
      list.innerHTML = `<p class="text-sm text-slate-400">No appointments scheduled.</p>`;
      return;
    }

    list.innerHTML = appointments.map(app => {
      const start = new Date(app.startAt).toLocaleString();
      const end = new Date(app.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let statusColor = "bg-blue-50 text-blue-700 border-blue-100";
      if (app.status === "COMPLETED") statusColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
      if (app.status.startsWith("CANCELLED")) statusColor = "bg-rose-50 text-rose-700 border-rose-100";

      let urgencyColor = "bg-slate-100 text-slate-700 border-slate-200";
      if (app.urgencyLevel === "High") urgencyColor = "bg-red-50 text-red-700 border-red-100 animate-pulse";
      if (app.urgencyLevel === "Medium") urgencyColor = "bg-amber-50 text-amber-700 border-amber-100";

      let consoleForm = "";
      if (app.status === "BOOKED") {
        consoleForm = `
          <div class="mt-4 pt-4 border-t border-slate-100 space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <h5 class="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
              <i data-lucide="clipboard-list" class="h-3.5 w-3.5 text-emerald-600"></i>
              <span>Consultation Console</span>
            </h5>
            <div>
              <label class="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Clinical Findings & Diagnoses</label>
              <textarea id="notes-${app.id}" rows="2" placeholder="Describe symptoms, vital signs, and clinic findings..." class="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500 transition-all"></textarea>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Prescription Treatment</label>
                <input id="presc-${app.id}" placeholder="e.g. Pantoprazole 40mg once daily for 14 days" class="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500 transition-all">
              </div>
              <div>
                <label class="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Required Follow-up Date</label>
                <input type="date" id="follow-${app.id}" class="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500 transition-all">
              </div>
            </div>
            <button onclick="submitVisitNotes('${app.id}')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center space-x-1">
              <span>Complete Consultation</span>
            </button>
          </div>
        `;
      }

      let aiSummary = "";
      if (app.preVisitSummary) {
        aiSummary = `
          <div class="mt-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs space-y-1">
            <div class="flex items-center space-x-1 mb-1 text-[9px] font-bold text-indigo-500 uppercase tracking-wider">
              <i data-lucide="sparkles" class="h-3 w-3"></i> <span>AI Pre-visit Triage Summary</span>
            </div>
            <p class="text-slate-700"><strong class="text-slate-800">Chief Complaint:</strong> ${app.preVisitSummary}</p>
          </div>
        `;
      }

      let completedSummary = "";
      if (app.status === "COMPLETED") {
        completedSummary = `
          <div class="mt-4 p-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl text-xs space-y-2">
            <p class="font-bold text-emerald-800 uppercase tracking-wider text-[9px] flex items-center">
              <i data-lucide="check-circle" class="h-3.5 w-3.5 mr-1 text-emerald-600"></i> Completed Consultation Records
            </p>
            <p class="text-slate-700"><strong class="text-slate-800">AI Summary:</strong> ${app.postVisitSummary || "N/A"}</p>
            <div class="grid grid-cols-2 gap-4 pt-2 border-t border-emerald-100/50">
              <div>
                <span class="font-semibold text-slate-500 block text-[9px] uppercase">Clinical Notes</span>
                <p class="text-slate-600 whitespace-pre-wrap">${app.clinicalNotes || "N/A"}</p>
              </div>
              <div>
                <span class="font-semibold text-slate-500 block text-[9px] uppercase">Prescriptions</span>
                <p class="text-slate-600 whitespace-pre-wrap">${app.prescription || "N/A"}</p>
              </div>
            </div>
            ${app.followUpDate ? `
            <div class="pt-2 border-t border-emerald-100/50 text-[11px] text-slate-600 flex items-center">
              <i data-lucide="calendar" class="h-3 w-3 mr-1 text-emerald-600"></i>
              <span>Follow-up Scheduled: <strong>${new Date(app.followUpDate).toLocaleDateString()}</strong></span>
            </div>
            ` : ""}
          </div>
        `;
      }

      let cancelledReason = "";
      if (app.status.startsWith("CANCELLED")) {
        cancelledReason = `
          <div class="mt-3 p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-xs text-rose-700 italic">
            <strong>Cancellation reason:</strong> ${app.cancellationReason || "Not provided"}
          </div>
        `;
      }

      return `
        <div class="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
          <div class="flex flex-wrap justify-between items-start gap-2">
            <div>
              <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Patient scheduled</span>
              <h4 class="font-bold text-base text-slate-900">${app.patient.user.name}</h4>
              <p class="text-xs text-slate-500 mt-1 flex items-center">
                <i data-lucide="calendar" class="h-3 w-3 mr-1 text-slate-400"></i> ${start} - ${end}
              </p>
            </div>
            <div class="flex space-x-2">
              <span class="${urgencyColor} text-[10px] font-bold px-2 py-0.5 rounded-md border">${app.urgencyLevel || "Normal"} Urgency</span>
              <span class="${statusColor} text-[10px] font-bold px-2.5 py-0.5 rounded-full border">${app.status}</span>
            </div>
          </div>
          <p class="text-xs text-slate-600 mt-3"><span class="font-semibold text-slate-700">Stated Symptoms:</span> ${app.symptoms}</p>
          ${aiSummary}
          ${completedSummary}
          ${cancelledReason}
          ${consoleForm}
        </div>
      `;
    }).join("");
    lucide.createIcons();
  }

  window.submitVisitNotes = async function(appointmentId) {
    const clinicalNotes = document.getElementById(`notes-${appointmentId}`).value.trim();
    const prescription = document.getElementById(`presc-${appointmentId}`).value.trim();
    const followUpDate = document.getElementById(`follow-${appointmentId}`).value;

    if (!clinicalNotes) {
      showToast("Please write clinical notes first.", true);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/appointments/${appointmentId}/visit-notes`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          clinicalNotes,
          prescription: prescription || null,
          followUpDate: followUpDate || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit notes");

      showToast("Consultation completed!");
      fetchDoctorAppointments();
    } catch (e) {
      showToast(e.message, true);
    }
  };

  fetchDoctorAppointments();
}

// -------------------------------------------------------------------
// ADMIN PORTAL
// -------------------------------------------------------------------
function setupAdminPage() {
  const auth = checkAuth("ADMIN");
  if (!auth) return;
  const { user } = auth;

  const welcomeText = document.getElementById("welcomeText");
  const userAvatar = document.getElementById("userAvatar");
  if (welcomeText) welcomeText.innerText = user.name;
  if (userAvatar) userAvatar.innerText = user.name.charAt(0).toUpperCase();

  async function fetchUsers() {
    try {
      const res = await fetch(`${API_URL}/admin/users`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch users");
      const users = await res.json();
      renderUsers(users);
    } catch (e) {
      showToast(e.message, true);
    }
  }

  function renderUsers(users) {
    const list = document.getElementById("userList");
    if (!list) return;
    if (users.length === 0) {
      list.innerHTML = `<p class="text-sm text-slate-400">No users found.</p>`;
      return;
    }

    list.innerHTML = users.map(u => {
      let roleColor = "bg-blue-50 text-blue-700 border-blue-100";
      if (u.role === "ADMIN") roleColor = "bg-slate-900 text-white border-slate-800";
      if (u.role === "DOCTOR") roleColor = "bg-emerald-50 text-emerald-700 border-emerald-100";

      return `
        <div class="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <h5 class="font-bold text-sm text-slate-900">${u.name}</h5>
            <p class="text-xs text-slate-400">${u.email}</p>
          </div>
          <span class="${roleColor} text-[9px] font-bold px-2.5 py-0.5 rounded-full border">${u.role}</span>
        </div>
      `;
    }).join("");
  }

  async function fetchDoctorsForLeave() {
    try {
      const res = await fetch(`${API_URL}/doctors`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch doctors");
      const doctors = await res.json();
      const select = document.getElementById("leaveDoctorSelect");
      if (select) {
        select.innerHTML = '<option value="">-- Choose Practitioner --</option>' +
          doctors.map(doc => `<option value="${doc.id}">${doc.name} (${doc.specialization})</option>`).join("");
      }
    } catch (e) {
      showToast(e.message, true);
    }
  }

  const createDoctorForm = document.getElementById("createDoctorForm");
  if (createDoctorForm) {
    createDoctorForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("doctorName").value.trim();
      const email = document.getElementById("doctorEmail").value.trim();
      const password = document.getElementById("doctorPassword").value;
      const specialization = document.getElementById("doctorSpecialization").value.trim();
      const bio = document.getElementById("doctorBio").value.trim();
      const slotDuration = document.getElementById("slotDuration").value;

      try {
        const res = await fetch(`${API_URL}/admin/doctors`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            name,
            email,
            password,
            specialization,
            bio: bio || undefined,
            slotDurationMinutes: Number(slotDuration)
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to create doctor profile");

        showToast("Doctor profile created successfully!");
        createDoctorForm.reset();
        fetchUsers();
        fetchDoctorsForLeave();
      } catch (error) {
        showToast(error.message, true);
      }
    });
  }

  const leaveForm = document.getElementById("leaveForm");
  if (leaveForm) {
    leaveForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const doctorId = document.getElementById("leaveDoctorSelect").value;
      const date = document.getElementById("leaveDate").value;
      const reason = document.getElementById("leaveReason").value.trim();

      try {
        const res = await fetch(`${API_URL}/admin/doctors/${doctorId}/leave`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ date, reason })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to log leave");

        showToast(`Leave logged! Cancelled ${data.affectedCount} appointments.`);
        leaveForm.reset();
      } catch (error) {
        showToast(error.message, true);
      }
    });
  }

  fetchUsers();
  fetchDoctorsForLeave();
}
