
// ═══════════════════════════════════════════════════
// ONCE CORE — Login Controller (Supabase Edition)
// ═══════════════════════════════════════════════════

// =========================
// Si ya hay sesión activa → ir al dashboard
// =========================
(async () => {
  const session = await sbGetSession();
  if (session) {
    window.location.href = "../dashboard/dashboard.html";
  }
})();

// =========================
// ELEMENTOS
// =========================
const tabLogin         = document.getElementById("tabLogin");
const tabRegister      = document.getElementById("tabRegister");

const formLogin        = document.getElementById("formLogin");
const formRegister     = document.getElementById("formRegister");

const loginEmail       = document.getElementById("loginEmail");
const loginPassword    = document.getElementById("loginPassword");
const loginStatus      = document.getElementById("loginStatus");
const loginBtn         = document.getElementById("loginBtn");

const regEmail         = document.getElementById("regEmail");
const regPassword      = document.getElementById("regPassword");
const regPasswordConfirm = document.getElementById("regPasswordConfirm");
const registerStatus   = document.getElementById("registerStatus");
const registerBtn      = document.getElementById("registerBtn");

// =========================
// UI helpers
// =========================

function setStatus(el, msg, type = "") {
  if (!el) return;
  el.textContent = msg;
  el.className = "status-msg " + type;
}

function clearStatus() {
  setStatus(loginStatus, "");
  setStatus(registerStatus, "");
}

function markError(input) {
  input?.classList.add("error");
}

function markSuccess(input) {
  input?.classList.remove("error");
  input?.classList.add("success");
}

// =========================
// Tabs
// =========================

tabLogin?.addEventListener("click", () => {
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");

  formLogin.classList.remove("hidden");
  formRegister.classList.add("hidden");

  clearStatus();
});

tabRegister?.addEventListener("click", () => {
  tabRegister.classList.add("active");
  tabLogin.classList.remove("active");

  formRegister.classList.remove("hidden");
  formLogin.classList.add("hidden");

  clearStatus();
});

// =========================
// LOGIN REAL
// =========================

loginBtn?.addEventListener("click", async () => {

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    setStatus(loginStatus, "Completa todos los campos.", "error");
    return;
  }

  loginBtn.disabled = true;
  setStatus(loginStatus, "Entrando...", "");

  try {

    const user = await sbSignIn(email, password);

    markSuccess(loginEmail);
    markSuccess(loginPassword);

    setStatus(loginStatus, "✓ Sesión iniciada.", "success");

    setTimeout(() => {
      window.location.href = "../dashboard/dashboard.html";
    }, 700);

  } catch (err) {

    console.error(err);

    setStatus(loginStatus, err.message, "error");

    loginBtn.disabled = false;

  }

});

// =========================
// REGISTRO REAL
// =========================

registerBtn?.addEventListener("click", async () => {

  const email = regEmail.value.trim();
  const password = regPassword.value;
  const password2 = regPasswordConfirm.value;

  if (!email || !password || !password2) {
    setStatus(registerStatus, "Completa todos los campos.", "error");
    return;
  }

  if (password !== password2) {
    setStatus(registerStatus, "Las contraseñas no coinciden.", "error");
    return;
  }

  if (password.length < 6) {
    setStatus(registerStatus, "Mínimo 6 caracteres.", "error");
    return;
  }

  registerBtn.disabled = true;

  setStatus(registerStatus, "Creando cuenta...", "");

  try {

    await sbSignUp(email, password);

    setStatus(registerStatus, "✓ Cuenta creada. Ahora inicia sesión.", "success");

    setTimeout(() => {
      tabLogin.click();
      loginEmail.value = email;
      loginPassword.focus();
      registerBtn.disabled = false;
    }, 1000);

  } catch (err) {

    console.error(err);

    setStatus(registerStatus, err.message, "error");

    registerBtn.disabled = false;

  }

});

