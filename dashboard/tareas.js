// ═══════════════════════════════════════════════════════
// ONCE CORE — Sistema de Tareas (Supabase Edition)
// Persistente • Realtime • Multiusuario real
// ═══════════════════════════════════════════════════════


// ───────────────────────────────────────────────────────
// Estado global
// ───────────────────────────────────────────────────────

let currentTab = "mias";
let selectedPriority = "normal";
let apoyoTarget = null;

let currentUser = null;
let currentProfile = null;

let tareasCache = [];


// ───────────────────────────────────────────────────────
// Inicialización
// ───────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {

  await initialize();

  setupUI();

  await loadTareas();

  subscribeRealtime();

});


// ───────────────────────────────────────────────────────
// Inicializar usuario
// ───────────────────────────────────────────────────────

async function initialize() {

  currentUser = await sbGetUser();

  if (!currentUser) {

    window.location.href = "../login/login.html";
    return;

  }

  currentProfile = await sbGetProfile(currentUser.id);

}


// ───────────────────────────────────────────────────────
// Setup UI
// ───────────────────────────────────────────────────────

function setupUI() {

  document.getElementById("publishBtn")
  ?.addEventListener("click", publishTarea);

  document.getElementById("tabMias")
  ?.addEventListener("click", () => switchTab("mias"));

  document.getElementById("tabTodas")
  ?.addEventListener("click", () => switchTab("todas"));

  document.querySelectorAll(".priority-btn")
  .forEach(btn => {

    btn.addEventListener("click", () => {

      document.querySelectorAll(".priority-btn")
      .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");

      selectedPriority = btn.dataset.p;

    });

  });

}


// ───────────────────────────────────────────────────────
// Cargar tareas desde Supabase
// ───────────────────────────────────────────────────────

async function loadTareas() {

  tareasCache = await sbGetTareas();

  renderTareas();

}


// ───────────────────────────────────────────────────────
// Publicar tarea
// ───────────────────────────────────────────────────────

async function publishTarea() {

  const title =
    document.getElementById("ntTitle")?.value.trim();

  if (!title) {
    showToast("Escribe un título");
    return;
  }

  const subject =
    document.getElementById("ntSubject")?.value.trim();

  const due =
    document.getElementById("ntDue")?.value;

  const desc =
    document.getElementById("ntDesc")?.value.trim();

  const tarea = {

    title: title,

    subject: subject || "General",

    description: desc || "",

    due: due || null,

    priority: selectedPriority,

    autor_id: currentUser.email,

    autor_name:
      currentProfile?.name ||
      currentUser.email,

    autor_avatar:
      currentProfile?.avatar || "",

    autor_family:
      currentProfile?.family || "",

    suertes: [],

    ayudas: [],

    done: false

  };

  await sbCreateTarea(tarea);

  clearForm();

  showToast("Tarea publicada");

}


// ───────────────────────────────────────────────────────
// Render
// ───────────────────────────────────────────────────────

function renderTareas() {

  const container =
    document.getElementById("tareasContainer");

  if (!container) return;

  let tareas = tareasCache;

  if (currentTab === "mias") {

    tareas =
      tareas.filter(
        t => t.autor_id === currentUser.email
      );

  }

  if (tareas.length === 0) {

    container.innerHTML =
      `<div class="tareas-empty">
        Sin tareas publicadas
       </div>`;

    return;

  }

  container.innerHTML =
    tareas.map(buildCard).join("");

  bindEvents();

}


// ───────────────────────────────────────────────────────
// Card
// ───────────────────────────────────────────────────────

function buildCard(t) {

  const isOwn =
    t.autor_id === currentUser.email;

  const suertes =
    t.suertes?.length || 0;

  const ayudas =
    t.ayudas?.length || 0;

  return `

    <div class="tarea-card">

      <div class="tarea-title">
        ${escapeHtml(t.title)}
      </div>

      <div class="tarea-author">
        ${escapeHtml(t.autor_name)}
      </div>

      <div class="tarea-actions">

        ${
          !isOwn
          ? `
          <button
            class="btn-suerte"
            data-id="${t.id}">
            💛 ${suertes}
          </button>

          <button
            class="btn-ayuda"
            data-id="${t.id}">
            🤝 ${ayudas}
          </button>
          `
          : `<span>Tuya</span>`
        }

      </div>

    </div>

  `;

}


// ───────────────────────────────────────────────────────
// Eventos
// ───────────────────────────────────────────────────────

function bindEvents() {

  document
  .querySelectorAll(".btn-suerte")
  .forEach(btn => {

    btn.onclick =
      () => sendSuerte(btn.dataset.id);

  });

  document
  .querySelectorAll(".btn-ayuda")
  .forEach(btn => {

    btn.onclick =
      () => sendAyuda(btn.dataset.id);

  });

}


// ───────────────────────────────────────────────────────
// Suerte
// ───────────────────────────────────────────────────────

async function sendSuerte(tareaId) {

  await sbAddSuerte(
    tareaId,
    currentUser.email
  );

}


// ───────────────────────────────────────────────────────
// Ayuda
// ───────────────────────────────────────────────────────

async function sendAyuda(tareaId) {

  const ayuda = {

    email:
      currentUser.email,

    nombre:
      currentProfile?.name,

    mensaje:
      "Apoyo enviado",

    ts:
      Date.now()

  };

  await sbAddAyuda(
    tareaId,
    ayuda
  );

}


// ───────────────────────────────────────────────────────
// Realtime
// ───────────────────────────────────────────────────────

function subscribeRealtime() {

  sbSubscribeTareas(() => {

    loadTareas();

  });

}


// ───────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────

function switchTab(tab) {

  currentTab = tab;

  renderTareas();

}

function clearForm() {

  document.getElementById("ntTitle").value = "";
  document.getElementById("ntSubject").value = "";
  document.getElementById("ntDue").value = "";
  document.getElementById("ntDesc").value = "";

}

function escapeHtml(text) {

  if (!text) return "";

  return text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

}

function showToast(msg) {

  console.log(msg);

}
