// ONCE CORE — Settings Controller
// Bridgerton Edition

// =========================
// Protección de sesión
// =========================
if (localStorage.getItem("session") !== "active") {
  window.location.href = "../login/login.html";
}

// =========================
// Datos guardados
// =========================
let profile  = JSON.parse(localStorage.getItem("profile"))  || {};
let schedule = JSON.parse(localStorage.getItem("schedule")) || [];

// =========================
// Topbar nombre
// =========================
const topbarName = document.getElementById("topbarName");
if (topbarName) topbarName.textContent = profile.name || "Mi perfil";

// =========================
// SECCIÓN PERFIL — cargar
// =========================
const inputName    = document.getElementById("inputName");
const inputCampus  = document.getElementById("inputCampus");
const inputCarrera = document.getElementById("inputCarrera");
const inputSemestre= document.getElementById("inputSemestre");
const avatarPreview= document.getElementById("avatarPreview");

if (inputName)     inputName.value     = profile.name     || "";
if (inputCampus)   inputCampus.value   = profile.campus   || "";
if (inputCarrera)  inputCarrera.value  = profile.carrera  || "";
if (inputSemestre) inputSemestre.value = profile.semestre || "";

// Cargar avatar guardado
if (avatarPreview && profile.avatar) {
  avatarPreview.src = profile.avatar;
}

// File upload — convertir a base64 con FileReader
const inputAvatar = document.getElementById("inputAvatar");
const fileLabel   = document.querySelector(".file-upload-label");
const fileText    = document.getElementById("fileUploadText");

inputAvatar?.addEventListener("change", () => {
  const file = inputAvatar.files[0];
  if (!file) return;

  // Actualizar texto del label
  if (fileText) fileText.textContent = file.name;
  if (fileLabel) fileLabel.classList.add("has-file");

  // Convertir a base64 y mostrar preview
  const reader = new FileReader();
  reader.onload = (e) => {
    if (avatarPreview) avatarPreview.src = e.target.result;
    // Guardar temporalmente para cuando se guarde el perfil
    window._pendingAvatar = e.target.result;
  };
  reader.readAsDataURL(file);
});

// =========================
// GUARDAR PERFIL
// =========================
function showToast(id) {
  const toast = document.getElementById(id);
  if (!toast) return;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

document.getElementById("saveProfileBtn")?.addEventListener("click", () => {
  const newProfile = {
    name:     inputName?.value.trim()    || profile.name    || "",
    family:   window._selectedFamily         || profile.family  || "",
    avatar:   window._pendingAvatar      || profile.avatar  || "",
    campus:   inputCampus?.value         || profile.campus  || "",
    carrera:  inputCarrera?.value.trim() || profile.carrera || "",
    semestre: inputSemestre?.value       || profile.semestre|| "",
    status:   profile.status || "Online",
  };

  localStorage.setItem("profile", JSON.stringify(newProfile));
  profile = newProfile;

  if (topbarName) topbarName.textContent = newProfile.name || "Mi perfil";
  showToast("profileToast");
});

// =========================
// SECCIÓN HORARIO
// =========================

// ── Días picker ──
let selectedDays = [];

document.querySelectorAll(".day-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const day = btn.dataset.day;
    if (selectedDays.includes(day)) {
      selectedDays = selectedDays.filter(d => d !== day);
      btn.classList.remove("selected");
    } else {
      selectedDays.push(day);
      btn.classList.add("selected");
    }
  });
});

// ── Color picker ──
let selectedColor = "#0d9488";

document.querySelectorAll(".color-opt").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".color-opt").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedColor = btn.dataset.color;
  });
});

// ── Agregar materia ──
document.getElementById("addSubjectBtn")?.addEventListener("click", () => {
  const name  = document.getElementById("subjectName")?.value.trim();
  const start = document.getElementById("subjectStart")?.value;
  const end   = document.getElementById("subjectEnd")?.value;

  if (!name || !start || !end || selectedDays.length === 0) {
    // Highlight campos vacíos
    if (!name)               document.getElementById("subjectName").focus();
    else if (!start)         document.getElementById("subjectStart").focus();
    else if (!end)           document.getElementById("subjectEnd").focus();
    else if (!selectedDays.length) {
      document.querySelectorAll(".day-btn").forEach(b => {
        b.style.borderColor = "rgba(200,149,141,0.7)";
        setTimeout(() => b.style.borderColor = "", 1500);
      });
    }
    return;
  }

  const subject = {
    id:    Date.now(),
    name,
    start,
    end,
    days:  [...selectedDays],
    color: selectedColor,
  };

  schedule.push(subject);
  localStorage.setItem("schedule", JSON.stringify(schedule));

  // Limpiar formulario
  document.getElementById("subjectName").value  = "";
  document.getElementById("subjectStart").value = "";
  document.getElementById("subjectEnd").value   = "";
  selectedDays = [];
  document.querySelectorAll(".day-btn").forEach(b => b.classList.remove("selected"));

  renderSchedule();
  showToast("scheduleToast");
});

// ── Render lista materias ──
function renderSchedule() {
  const container = document.getElementById("subjectsList");
  if (!container) return;
  container.innerHTML = "";

  if (schedule.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:20px 0; font-family:'Cormorant Garamond',serif; font-style:italic; color:var(--text-muted); font-size:15px;">
        ✦ Aún no has agregado materias
      </div>
    `;
    return;
  }

  // Ordenar por hora de inicio
  const sorted = [...schedule].sort((a, b) => a.start.localeCompare(b.start));

  sorted.forEach((subject, i) => {
    const card = document.createElement("div");
    card.className = "subject-card";
    card.style.animationDelay = (i * 0.06) + "s";

    const daysHtml = subject.days
      .map(d => `<span class="subject-day-tag">${d}</span>`)
      .join("");

    card.innerHTML = `
      <div class="subject-color-bar" style="background:${subject.color}"></div>
      <div class="subject-info">
        <div class="subject-name">${subject.name}</div>
        <div class="subject-meta">🕐 ${subject.start} – ${subject.end}</div>
        <div class="subject-days">${daysHtml}</div>
      </div>
      <button class="subject-delete" data-id="${subject.id}" title="Eliminar">✕</button>
    `;

    container.appendChild(card);
  });

  // Botones eliminar
  container.querySelectorAll(".subject-delete").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.id);
      schedule = schedule.filter(s => s.id !== id);
      localStorage.setItem("schedule", JSON.stringify(schedule));
      renderSchedule();
    });
  });
}

// =========================
// Render inicial
// =========================
renderSchedule();

// =========================
// TEMAS — render selector
// =========================
// Esperamos al DOM completo antes de renderizar
document.addEventListener("DOMContentLoaded", () => {
  // Temas
  if (typeof renderThemeSelector === "function") {
    renderThemeSelector("themeSelectorContainer");
  }
  // Familia — corre aquí para garantizar que el DOM esté listo
  renderFamilySelector(profile?.family || "");
  // Preview inicial del nombre
  updateNamePreview();
});

// =========================
// SELECTOR DE FAMILIA (en perfil)
// =========================
window._selectedFamily = profile?.family || "";

function renderFamilySelector(currentFamily) {
  const container = document.getElementById("familySelector");
  if (!container) return;

  window._selectedFamily = currentFamily;

  const allFamilies = [
    { id: "", name: "Sin familia", emoji: "✨" },
    ...THEMES
  ];

  container.innerHTML = "";

  allFamilies.forEach(family => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "family-opt" + (currentFamily === family.id ? " selected" : "");
    btn.dataset.familyId = family.id;

    const badgeStyle = family.badge
      ? 'background:' + family.badge + '; color:' + family.badgeText
      : 'background:rgba(201,168,76,0.1); color:var(--gold-dark)';

    btn.innerHTML =
      '<span class="fo-emoji">' + family.emoji + '</span>' +
      '<span class="fo-name" style="' + badgeStyle + '">' + family.name + '</span>';

    btn.addEventListener("click", () => {
      window._selectedFamily = family.id;
      container.querySelectorAll(".family-opt").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      // preview del nombre completo
      updateNamePreview();
    });

    container.appendChild(btn);
  });
}

function updateNamePreview() {
  const name   = document.getElementById("inputName")?.value.trim();
  const family = window._selectedFamily;
  if (!name) return;
  const full = typeof getFullName === "function" ? getFullName(name, family) : name;
  const preview = document.getElementById("namePreview");
  if (preview) preview.textContent = full;
}

document.getElementById("inputName")?.addEventListener("input", updateNamePreview);