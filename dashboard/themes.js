// ONCE CORE — Theme Controller
// Bridgerton Families Edition

const THEMES = [
  {
    id:       "bridgerton",
    name:     "Bridgerton",
    surname:  "Bridgerton",
    subtitle: "La familia favorita de la temporada",
    primary:  "#1e3a6e",
    accent:   "#b8960c",
    badge:    "#1e3a6e",        // color del badge en tarjetas
    badgeText:"#e8c97a",
    preview:  ["#f0f4fd", "#1e3a6e", "#b8960c"],
    emoji:    "💙",
  },
  {
    id:       "sharma",
    name:     "Sharma",
    surname:  "Sharma",
    subtitle: "Apasionada, valiente, elegante",
    primary:  "#5c1a0f",
    accent:   "#c9622a",
    badge:    "#5c1a0f",
    badgeText:"#f7e4dc",
    preview:  ["#fdf4f0", "#5c1a0f", "#c9622a"],
    emoji:    "❤️",
  },
  {
    id:       "featherington",
    name:     "Featherington",
    surname:  "Featherington",
    subtitle: "Atrevida y siempre llamando la atención",
    primary:  "#0f3d20",
    accent:   "#2e8b4a",
    badge:    "#0f3d20",
    badgeText:"#d8f5de",
    preview:  ["#f2fdf4", "#0f3d20", "#2e8b4a"],
    emoji:    "💚",
  },
  {
    id:       "hastings",
    name:     "Hastings",
    surname:  "Hastings",
    subtitle: "Misterioso, poderoso, irresistible",
    primary:  "#1a1a1a",
    accent:   "#c9a84c",
    badge:    "#1a1a1a",
    badgeText:"#e8c97a",
    preview:  ["#fdf8ee", "#1a1a1a", "#c9a84c"],
    emoji:    "🖤",
  },
  {
    id:       "basset",
    name:     "Basset",
    surname:  "Basset",
    subtitle: "Soñadora, romántica, etérea",
    primary:  "#2d1b4e",
    accent:   "#8b5fbf",
    badge:    "#2d1b4e",
    badgeText:"#ecdff7",
    preview:  ["#f8f4fd", "#2d1b4e", "#8b5fbf"],
    emoji:    "💜",
  },
  {
    id:       "mondrich",
    name:     "Mondrich",
    surname:  "Mondrich",
    subtitle: "Cálida, terrosa, acogedora",
    primary:  "#3d2008",
    accent:   "#b8820a",
    badge:    "#3d2008",
    badgeText:"#f0e0c0",
    preview:  ["#fdf5e8", "#3d2008", "#b8820a"],
    emoji:    "🧡",
  },
  {
    id:       "crane",
    name:     "Crane",
    surname:  "Crane",
    subtitle: "Delicada, sofisticada, romántica",
    primary:  "#4e0a28",
    accent:   "#c94a7a",
    badge:    "#4e0a28",
    badgeText:"#f7dce6",
    preview:  ["#fdf0f4", "#4e0a28", "#c94a7a"],
    emoji:    "🌸",
  },
  {
    id:       "danbury",
    name:     "Lady Danbury",
    surname:  "Danbury",
    subtitle: "Imponente, sabia, la reina de la temporada",
    primary:  "#2a0a3e",
    accent:   "#9a4abf",
    badge:    "#2a0a3e",
    badgeText:"#ecdaf5",
    preview:  ["#faf4fd", "#2a0a3e", "#9a4abf"],
    emoji:    "👑",
  },
];

// =========================
// HELPERS DE FAMILIA
// Disponibles globalmente en todas las páginas
// =========================

// Obtener datos de familia por id
function getFamilyById(familyId) {
  return THEMES.find(t => t.id === familyId) || null;
}

// Obtener familia del perfil actual
function getMyFamily() {
  const profile = JSON.parse(localStorage.getItem("profile")) || {};
  return getFamilyById(profile.family) || null;
}

// Nombre completo con apellido de familia
// "Cristina" + family "sharma" → "Cristina Sharma"
function getFullName(name, familyId) {
  if (!name) return "Invitada";
  const family = getFamilyById(familyId);
  if (!family) return name;
  return name + " " + family.surname;
}

// Generar HTML del badge de familia para tarjetas
function getFamilyBadgeHTML(familyId) {
  const family = getFamilyById(familyId);
  if (!family) return "";
  return `<span class="family-badge" style="background:\${family.badge}; color:\${family.badgeText}">
    \${family.emoji} Casa \${family.surname}
  </span>`;
}

// =========================
// Aplicar tema al documento
// =========================
function applyTheme(themeId) {
  if (themeId && themeId !== "default") {
    document.documentElement.setAttribute("data-theme", themeId);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  localStorage.setItem("theme", themeId || "default");
}

// =========================
// Cargar tema guardado
// =========================
function loadSavedTheme() {
  const saved = localStorage.getItem("theme") || "default";
  applyTheme(saved);
  return saved;
}

// =========================
// Render selector de temas
// =========================
function renderThemeSelector(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const current = localStorage.getItem("theme") || "default";

  // Build all theme data including default
  const allThemes = [
    {
      id:      "default",
      name:    "Clásico",
      subtitle:"El original de Once Core",
      emoji:   "✨",
      preview: ["#fdf6ec", "#1a2744", "#c9a84c"],
    },
    ...THEMES
  ];

  const grid = document.createElement("div");
  grid.className = "theme-grid";

  allThemes.forEach(theme => {
    const card = document.createElement("div");
    card.className = "theme-card" + (current === theme.id ? " active" : "");
    card.dataset.themeId = theme.id;

    card.innerHTML = `
      <div class="theme-preview">
        <div class="preview-bar" style="background:${theme.preview[0]}"></div>
        <div class="preview-bar" style="background:${theme.preview[1]}"></div>
        <div class="preview-bar" style="background:${theme.preview[2]}"></div>
      </div>
      <div class="theme-info">
        <div class="theme-emoji">${theme.emoji}</div>
        <div class="theme-name">${theme.name}</div>
        <div class="theme-sub">${theme.subtitle}</div>
      </div>
      <div class="theme-check">✓</div>
    `;

    card.addEventListener("click", () => selectTheme(theme.id));
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

// =========================
// Seleccionar tema
// =========================
function selectTheme(themeId) {
  applyTheme(themeId);

  // Actualizar UI del selector
  document.querySelectorAll(".theme-card").forEach(card => {
    card.classList.toggle("active", card.dataset.themeId === themeId);
  });

  // Toast de confirmación
  const name = themeId === "default"
    ? "Clásico"
    : THEMES.find(t => t.id === themeId)?.name || themeId;

  showThemeToast(name);
}

// =========================
// Toast de confirmación
// =========================
function showThemeToast(themeName) {
  let toast = document.getElementById("themeToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "themeToast";
    toast.style.cssText = `
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%) translateY(10px);
      background: var(--navy);
      color: var(--gold-light);
      font-family: 'Lato', sans-serif;
      font-size: 12px;
      letter-spacing: .1em;
      padding: 9px 22px;
      border-radius: 20px;
      opacity: 0;
      pointer-events: none;
      transition: opacity .3s, transform .3s;
      z-index: 9999;
      border: 1px solid rgba(255,255,255,0.1);
      white-space: nowrap;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = `✦ Tema ${themeName} aplicado`;
  toast.style.opacity = "1";
  toast.style.transform = "translateX(-50%) translateY(0)";
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(10px)";
  }, 2200);
}

// =========================
// Auto-init al cargar
// =========================
loadSavedTheme();