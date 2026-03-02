// ═══════════════════════════════════════════════════════
// ONCE CORE — Login Controller (Supabase Edition)
// Auth real • Sesión persistente • Multi-dispositivo
// ═══════════════════════════════════════════════════════


// ─────────────────────────────────────────
// Si ya hay sesión válida en Supabase
// ─────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {

  const user = await sbGetUser();

  if (user) {
    window.location.href = "../dashboard/dashboard.html";
  }

});


// ─────────────────────────────────────────
// Elementos
// ─────────────────────────────────────────
const tabLogin    = document.getElementById("tabLogin");
const tabRegister = document.getElementById("tabRegister");
const formLogin   = document.getElementById("formLogin");
const formRegister= document.getElementById("formRegister");

const loginEmail    = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn      = document.getElementById("loginBtn");

const regEmail          = document.getElementById("regEmail");
const regPassword       = document.getElementById("regPassword");
const regPasswordConfirm= document.getElementById("regPasswordConfirm");
const registerBtn       = document.getElementById("registerBtn");


// ─────────────────────────────────────────
// LOGIN REAL
// ─────────────────────────────────────────
loginBtn?.addEventListener("click", async () => {

  const email = loginEmail.value.trim();
  const pass  = loginPassword.value;

  if (!email || !pass) {
    alert("Completa todos los campos");
    return;
  }

  try {

    await sbSignIn(email, pass);

    window.location.href = "../dashboard/dashboard.html";

  } catch (err) {

    alert("Credenciales incorrectas");

  }

});


// ─────────────────────────────────────────
// REGISTRO REAL
// ─────────────────────────────────────────
registerBtn?.addEventListener("click", async () => {

  const email = regEmail.value.trim();
  const pass  = regPassword.value;
  const pass2 = regPasswordConfirm.value;

  if (!email || !pass || !pass2) {
    alert("Completa todos los campos");
    return;
  }

  if (pass !== pass2) {
    alert("Las contraseñas no coinciden");
    return;
  }

  try {

    await sbSignUp(email, pass);

    alert("Cuenta creada. Ahora inicia sesión.");

    tabLogin.click();

  } catch (err) {

    alert("Error creando cuenta");

  }

});
