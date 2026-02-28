// ONCE CORE — Mapa del Campus
// Anáhuac Mayab — Bridgerton Edition

// =========================
// Protección de sesión
// =========================
if (localStorage.getItem("session") !== "active") {
  window.location.href = "../login/login.html";
}

// =========================
// DATOS DEL CAMPUS
// Edita esta lista con los lugares reales
// =========================
const CAMPUS_CENTER = [21.1109990418403, -89.61208211850294];

const PLACES = [
  // ── ZONAS DE ESTUDIO ──────────────────────────
  {
    id: 1,
    name: "Biblioteca Central",
    type: "study",
    emoji: "📚",
    typeLabel: "Zona de Estudio",
    desc: "Biblioteca principal del campus. Ambiente silencioso, cubículos individuales y grupales.",
    hours: "Lun–Vie 7:00–21:00 · Sáb 8:00–14:00",
    coords: [21.11155, -89.61180],
  },
  {
    id: 2,
    name: "Sala de Estudio Norte",
    type: "study",
    emoji: "🕯️",
    typeLabel: "Zona de Estudio",
    desc: "Espacio tranquilo con mesas largas, ideal para sesiones de grupo y estudio silencioso.",
    hours: "Lun–Vie 8:00–20:00",
    coords: [21.11090, -89.61290],
  },
  {
    id: 3,
    name: "Sala de Cómputo",
    type: "study",
    emoji: "💻",
    typeLabel: "Zona de Estudio",
    desc: "Laboratorio de computadoras con acceso a internet y software académico.",
    hours: "Lun–Vie 7:30–20:00",
    coords: [21.11070, -89.61150],
  },

  // ── CAFETERÍAS ────────────────────────────────
  {
    id: 4,
    name: "Cafetería Central",
    type: "food",
    emoji: "☕",
    typeLabel: "Cafetería",
    desc: "Cafetería principal del campus. Desayunos, comidas y snacks durante todo el día.",
    hours: "Lun–Vie 7:00–18:00",
    coords: [21.11110, -89.61230],
  },
  {
    id: 5,
    name: "Área de Descanso Sur",
    type: "food",
    emoji: "🌿",
    typeLabel: "Área de Descanso",
    desc: "Jardín con mesas al aire libre. Ideal para comer o descansar entre clases.",
    hours: "Acceso libre",
    coords: [21.11055, -89.61210],
  },

  // ── EDIFICIOS ─────────────────────────────────
  {
    id: 6,
    name: "Edificio A",
    type: "building",
    emoji: "🏛️",
    typeLabel: "Edificio",
    desc: "Salones de clases del área de Negocios y Administración. Pisos 1–3.",
    hours: "Lun–Vie 7:00–21:00",
    coords: [21.11130, -89.61240],
  },
  {
    id: 7,
    name: "Edificio B",
    type: "building",
    emoji: "🏛️",
    typeLabel: "Edificio",
    desc: "Facultad de Ingeniería y Tecnologías de la Información.",
    hours: "Lun–Vie 7:00–20:00",
    coords: [21.11080, -89.61260],
  },
  {
    id: 8,
    name: "Edificio C — Rectoría",
    type: "building",
    emoji: "⚜️",
    typeLabel: "Edificio Administrativo",
    desc: "Rectoría, Servicios Escolares y Oficinas Administrativas.",
    hours: "Lun–Vie 8:00–17:00",
    coords: [21.11120, -89.61190],
  },
  {
    id: 9,
    name: "Auditorio",
    type: "building",
    emoji: "🎭",
    typeLabel: "Auditorio",
    desc: "Espacio para conferencias, presentaciones y eventos académicos.",
    hours: "Según eventos",
    coords: [21.11145, -89.61135],
  },
];

// =========================
// INICIALIZAR MAPA
// =========================
const map = L.map("map", {
  center: CAMPUS_CENTER,
  zoom: 17,
  zoomControl: false,
});

// Mapa base — OpenStreetMap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
  maxZoom: 20,
}).addTo(map);

// Zoom control en posición elegante
L.control.zoom({ position: "bottomleft" }).addTo(map);

// =========================
// CREAR MARCADORES CUSTOM
// =========================
function createIcon(type, emoji) {
  return L.divIcon({
    className: "",
    html: `<div class="custom-marker ${type}"><span>${emoji}</span></div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -40],
  });
}

const markers = {};

PLACES.forEach(place => {
  const marker = L.marker(place.coords, {
    icon: createIcon(place.type, place.emoji),
  }).addTo(map);

  // Popup al click en marcador
  marker.bindPopup(`
    <div class="popup-title">${place.emoji} ${place.name}</div>
    <div class="popup-desc">${place.desc}</div>
    <span class="popup-tag ${place.type}">${place.typeLabel}</span>
  `, { maxWidth: 220 });

  marker.on("click", () => selectPlace(place.id));

  markers[place.id] = marker;
});

// =========================
// RENDER LISTA DEL SIDEBAR
// =========================
function renderPlacesList(filter = "all") {
  const container = document.getElementById("placesList");
  container.innerHTML = "";

  const filtered = filter === "all"
    ? PLACES
    : PLACES.filter(p => p.type === filter);

  filtered.forEach((place, i) => {
    const item = document.createElement("div");
    item.className = "place-item";
    item.style.animationDelay = (i * 0.05) + "s";
    item.dataset.id = place.id;

    item.innerHTML = `
      <div class="place-emoji">${place.emoji}</div>
      <div class="place-info">
        <div class="place-name">${place.name}</div>
        <div class="place-type-tag ${place.type}">${place.typeLabel}</div>
      </div>
      <div class="place-arrow">→</div>
    `;

    item.addEventListener("click", () => selectPlace(place.id));
    container.appendChild(item);
  });
}

// =========================
// SELECCIONAR LUGAR
// =========================
let activeId = null;

function selectPlace(id) {
  const place = PLACES.find(p => p.id === id);
  if (!place) return;

  // Actualizar lista
  document.querySelectorAll(".place-item").forEach(el => {
    el.classList.toggle("active", parseInt(el.dataset.id) === id);
  });

  // Volar al marcador
  map.flyTo(place.coords, 18, { animate: true, duration: 1.2 });
  markers[id].openPopup();

  // Mostrar panel de detalle
  document.getElementById("detailIcon").textContent  = place.emoji;
  document.getElementById("detailName").textContent  = place.name;
  document.getElementById("detailType").textContent  = place.typeLabel;
  document.getElementById("detailDesc").textContent  = place.desc;
  document.getElementById("detailHours").textContent = place.hours ? "🕐 " + place.hours : "";
  document.getElementById("detailPanel").classList.add("visible");

  activeId = id;
}

// =========================
// CERRAR DETALLE
// =========================
document.getElementById("detailClose").addEventListener("click", () => {
  document.getElementById("detailPanel").classList.remove("visible");
  document.querySelectorAll(".place-item").forEach(el => el.classList.remove("active"));
  if (activeId) markers[activeId]?.closePopup();
  activeId = null;
});

// =========================
// FILTROS
// =========================
document.querySelectorAll(".filter-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    const filter = tab.dataset.filter;
    renderPlacesList(filter);

    // Mostrar/ocultar marcadores según filtro
    PLACES.forEach(place => {
      const m = markers[place.id];
      if (!m) return;
      if (filter === "all" || place.type === filter) {
        m.addTo(map);
      } else {
        m.remove();
      }
    });
  });
});

// =========================
// RENDER INICIAL
// =========================
renderPlacesList();

// Pequeña pausa para que el mapa cargue antes de hacer el fitBounds
setTimeout(() => {
  // Ajustar vista para que entren todos los marcadores
  const coords = PLACES.map(p => p.coords);
  const bounds = L.latLngBounds(coords);
  map.fitBounds(bounds, { padding: [40, 40] });
}, 300);