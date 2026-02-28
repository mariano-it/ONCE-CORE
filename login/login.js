// ONCE CORE — Login Controller
// Bridgerton Edition

// =========================
// Si ya hay sesión activa → ir al dashboard
// =========================
if (localStorage.getItem("session") === "active") {
  window.location.href = "../dashboard/dashboard.html";
}

// =========================
// ALMACÉN DE USUARIOS
// Los usuarios se guardan en "users" (array)
// separado de la sesión activa "user"
// Así cerrar sesión NUNCA borra las cuentas
// =========================
function getUsers() {
  return JSON.parse(localStorage.getItem("users")) || [];
}

function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}

function findUser(email) {
  return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
}

// =========================
// ELEMENTOS
// =========================
const tabLogin    = document.getElementById("tabLogin");
const tabRegister = document.getElementById("tabRegister");
const formLogin   = document.getElementById("formLogin");
const formRegister= document.getElementById("formRegister");

const loginEmail    = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginStatus   = document.getElementById("loginStatus");
const loginBtn      = document.getElementById("loginBtn");

const regEmail          = document.getElementById("regEmail");
const regPassword       = document.getElementById("regPassword");
const regPasswordConfirm= document.getElementById("regPasswordConfirm");
const registerStatus    = document.getElementById("registerStatus");
const registerBtn       = document.getElementById("registerBtn");

// =========================
// TABS — cambiar entre login y registro
// =========================
tabLogin.addEventListener("click", () => {
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
  formLogin.classList.remove("hidden");
  formRegister.classList.add("hidden");
  clearStatus();
});

tabRegister.addEventListener("click", () => {
  tabRegister.classList.add("active");
  tabLogin.classList.remove("active");
  formRegister.classList.remove("hidden");
  formLogin.classList.add("hidden");
  clearStatus();
});

function clearStatus() {
  setStatus(loginStatus, "", "");
  setStatus(registerStatus, "", "");
  [loginEmail, loginPassword, regEmail, regPassword, regPasswordConfirm]
    .forEach(el => el?.classList.remove("error", "success"));
}

// =========================
// HELPER: mostrar mensaje
// =========================
function setStatus(el, msg, type) {
  if (!el) return;
  el.textContent = msg;
  el.className = "status-msg" + (type ? " " + type : "");
}

function markError(input) {
  input?.classList.add("error");
  input?.classList.remove("success");
}
function markSuccess(input) {
  input?.classList.add("success");
  input?.classList.remove("error");
}

// =========================
// TOGGLE CONTRASEÑA
// =========================
document.getElementById("toggleLoginPass")?.addEventListener("click", () => {
  loginPassword.type = loginPassword.type === "password" ? "text" : "password";
});
document.getElementById("toggleRegPass")?.addEventListener("click", () => {
  regPassword.type = regPassword.type === "password" ? "text" : "password";
});

// =========================
// ENTER para submit
// =========================
[loginEmail, loginPassword].forEach(el => {
  el?.addEventListener("keydown", e => { if (e.key === "Enter") loginBtn.click(); });
});
[regEmail, regPassword, regPasswordConfirm].forEach(el => {
  el?.addEventListener("keydown", e => { if (e.key === "Enter") registerBtn.click(); });
});

// =========================
// LOGIN
// =========================
loginBtn.addEventListener("click", () => {
  const email = loginEmail.value.trim();
  const pass  = loginPassword.value;

  // Validación básica
  if (!email || !pass) {
    if (!email) markError(loginEmail);
    if (!pass)  markError(loginPassword);
    setStatus(loginStatus, "Completa todos los campos.", "error");
    return;
  }

  const user = findUser(email);

  if (!user) {
    markError(loginEmail);
    setStatus(loginStatus, "No existe una cuenta con ese correo.", "error");
    return;
  }

  if (user.password !== pass) {
    markError(loginPassword);
    setStatus(loginStatus, "Contraseña incorrecta.", "error");
    return;
  }

  // Login exitoso
  markSuccess(loginEmail);
  markSuccess(loginPassword);
  setStatus(loginStatus, "✓ Bienvenida de vuelta.", "success");

  // Guardar sesión activa (sin sobreescribir el array de usuarios)
  localStorage.setItem("session", "active");
  localStorage.setItem("user", JSON.stringify({ email: user.email }));

  loginBtn.disabled = true;

  setTimeout(() => {
    window.location.href = "../dashboard/dashboard.html";
  }, 900);
});

// =========================
// REGISTRO
// =========================
registerBtn.addEventListener("click", () => {
  const email = regEmail.value.trim();
  const pass  = regPassword.value;
  const pass2 = regPasswordConfirm.value;

  // Limpiar errores previos
  [regEmail, regPassword, regPasswordConfirm].forEach(el => el.classList.remove("error"));

  // Validaciones
  if (!email || !pass || !pass2) {
    if (!email) markError(regEmail);
    if (!pass)  markError(regPassword);
    if (!pass2) markError(regPasswordConfirm);
    setStatus(registerStatus, "Completa todos los campos.", "error");
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    markError(regEmail);
    setStatus(registerStatus, "Ingresa un correo válido.", "error");
    return;
  }

  if (pass.length < 6) {
    markError(regPassword);
    setStatus(registerStatus, "La contraseña debe tener mínimo 6 caracteres.", "error");
    return;
  }

  if (pass !== pass2) {
    markError(regPassword);
    markError(regPasswordConfirm);
    setStatus(registerStatus, "Las contraseñas no coinciden.", "error");
    return;
  }

  // Verificar si ya existe
  if (findUser(email)) {
    markError(regEmail);
    setStatus(registerStatus, "Ya existe una cuenta con ese correo.", "error");
    return;
  }

  // Crear usuario y agregarlo al array persistente
  const users = getUsers();
  users.push({ email, password: pass });
  saveUsers(users);

  markSuccess(regEmail);
  markSuccess(regPassword);
  markSuccess(regPasswordConfirm);
  setStatus(registerStatus, "✓ Cuenta creada. ¡Ya puedes iniciar sesión!", "success");

  registerBtn.disabled = true;

  // Cambiar al tab de login después de un momento
  setTimeout(() => {
    registerBtn.disabled = false;
    regEmail.value = "";
    regPassword.value = "";
    regPasswordConfirm.value = "";
    tabLogin.click();
    loginEmail.value = email; // pre-llenar el email
    loginEmail.focus();
    setStatus(loginStatus, "Cuenta lista. Ingresa tu contraseña.", "success");
  }, 1400);
});