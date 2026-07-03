const API_URL = "http://localhost:4000/api";

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

  // Auto-hide
  setTimeout(() => {
    toast.classList.add("translate-y-20");
    setTimeout(() => {
      toast.classList.add("hidden");
    }, 300);
  }, 4000);
}

function redirectUser(role) {
  if (role === "ADMIN") {
    window.location.href = "admin.html";
  } else if (role === "DOCTOR") {
    window.location.href = "doctor.html";
  } else if (role === "PATIENT") {
    window.location.href = "patient.html";
  }
}

function checkSession() {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      redirectUser(user.role);
    } catch (e) {
      localStorage.clear();
    }
  }
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      showToast("Login successful! Redirecting...");
      setTimeout(() => redirectUser(data.user.role), 1000);
    } catch (error) {
      showToast(error.message, true);
    }
  });
}

const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      showToast("Account created successfully! Redirecting...");
      setTimeout(() => redirectUser(data.user.role), 1000);
    } catch (error) {
      showToast(error.message, true);
    }
  });
}

document.querySelectorAll("[data-login]").forEach(button => {
  button.addEventListener("click", () => {
    const email = button.getAttribute("data-login");
    const password = "Password@123";
    
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    
    if (emailInput && passwordInput) {
      emailInput.value = email;
      passwordInput.value = password;
      
      if (loginForm) {
        // Submit using requestSubmit to trigger form submit handler
        loginForm.requestSubmit();
      }
    }
  });
});

document.addEventListener("DOMContentLoaded", checkSession);
