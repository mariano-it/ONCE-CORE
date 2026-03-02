// ═══════════════════════════════════════════════════════
// ONCE CORE — Sistema de Tareas
// Supabase Native • Realtime • Multiusuario • Robusto
// ═══════════════════════════════════════════════════════


// ───────────────────────────────────────────────────────
// Referencias DOM
// ───────────────────────────────────────────────────────

const UI = {

  container: document.getElementById("tareasContainer"),

  publishBtn: document.getElementById("publishBtn"),

  ntTitle: document.getElementById("ntTitle"),
  ntSubject: document.getElementById("ntSubject"),
  ntDue: document.getElementById("ntDue"),
  ntDesc: document.getElementById("ntDesc"),

  tabMias: document.getElementById("tabMias"),
  tabTodas: document.getElementById("tabTodas")

};


// ───────────────────────────────────────────────────────
// Estado global
// ───────────────────────────────────────────────────────

let supabase = null;

let currentUser = null;

let tareasCache = [];

let currentTab = "mias";

let selectedPriority = "normal";


// ───────────────────────────────────────────────────────
// Esperar Supabase
// ───────────────────────────────────────────────────────

function waitForSupabase() {

  return new Promise(resolve => {

    const interval = setInterval(() => {

      if (window._supabase) {

        clearInterval(interval);

        resolve(window._supabase);

      }

    }, 50);

  });

}


// ───────────────────────────────────────────────────────
// Inicialización principal
// ───────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {

  try {

    supabase = await waitForSupabase();

    await loadUser();

    setupUI();

    await loadTareas();

    subscribeRealtime();

    console.log("ONCE CORE tareas inicializado");

  } catch (err) {

    console.error("Error inicializando:", err);

  }

});


// ───────────────────────────────────────────────────────
// Usuario actual
// ───────────────────────────────────────────────────────

async function loadUser() {

  const { data, error } =
    await supabase.auth.getSession();

  if (error || !data.session) {

    window.location.href = "../login/login.html";

    return;

  }

  currentUser = data.session.user;

}


// ───────────────────────────────────────────────────────
// UI setup
// ───────────────────────────────────────────────────────

function setupUI() {

  UI.publishBtn?.addEventListener(
    "click",
    publishTarea
  );

  UI.tabMias?.addEventListener(
    "click",
    () => switchTab("mias")
  );

  UI.tabTodas?.addEventListener(
    "click",
    () => switchTab("todas")
  );

  document
    .querySelectorAll(".priority-btn")
    .forEach(btn => {

      btn.onclick = () => {

        document
          .querySelectorAll(".priority-btn")
          .forEach(b =>
            b.classList.remove("active")
          );

        btn.classList.add("active");

        selectedPriority = btn.dataset.p;

      };

    });

}


// ───────────────────────────────────────────────────────
// Cargar tareas
// ───────────────────────────────────────────────────────

async function loadTareas() {

  const { data, error } =
    await supabase
      .from("tareas")
      .select("*")
      .order("created_at", { ascending: false });

  if (error) {

    console.error(error);

    showToast("Error cargando tareas");

    return;

  }

  tareasCache = data;

  renderTareas();

}


// ───────────────────────────────────────────────────────
// Crear tarea
// ───────────────────────────────────────────────────────

async function publishTarea() {

  const title =
    UI.ntTitle.value.trim();

  if (!title) {

    showToast("Escribe un título");

    return;

  }

  const tarea = {

    title: title,

    subject:
      UI.ntSubject.value || "General",

    description:
      UI.ntDesc.value || "",

    due:
      UI.ntDue.value || null,

    priority:
      selectedPriority,

    autor_id:
      currentUser.id,

    autor_email:
      currentUser.email,

    autor_name:
      currentUser.user_metadata?.name
      || currentUser.email,

    suertes: [],

    ayudas: [],

    done: false

  };

  const { error } =
    await supabase
      .from("tareas")
      .insert(tarea);

  if (error) {

    console.error(error);

    showToast("Error publicando");

    return;

  }

  clearForm();

  showToast("Tarea publicada");

}


// ───────────────────────────────────────────────────────
// Render tareas
// ───────────────────────────────────────────────────────

function renderTareas() {

  if (!UI.container) return;

  let tareas = tareasCache;

  if (currentTab === "mias") {

    tareas =
      tareas.filter(
        t => t.autor_id === currentUser.id
      );

  }

  if (tareas.length === 0) {

    UI.container.innerHTML =
      `<div class="tareas-empty">
        Sin tareas
      </div>`;

    return;

  }

  UI.container.innerHTML =
    tareas.map(buildCard).join("");

  bindEvents();

}


// ───────────────────────────────────────────────────────
// Card HTML
// ───────────────────────────────────────────────────────

function buildCard(t) {

  const isOwn =
    t.autor_id === currentUser.id;

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
        isOwn
        ? `<span>Tuya</span>`
        : `
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
      }

    </div>

  </div>

  `;

}


// ───────────────────────────────────────────────────────
// Eventos botones
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

async function sendSuerte(id) {

  const tarea =
    tareasCache.find(t => t.id == id);

  if (!tarea) return;

  const suertes =
    tarea.suertes || [];

  if (
    suertes.includes(currentUser.id)
  ) return;

  suertes.push(currentUser.id);

  await supabase
    .from("tareas")
    .update({ suertes })
    .eq("id", id);

}


// ───────────────────────────────────────────────────────
// Ayuda
// ───────────────────────────────────────────────────────

async function sendAyuda(id) {

  const tarea =
    tareasCache.find(t => t.id == id);

  if (!tarea) return;

  const ayudas =
    tarea.ayudas || [];

  ayudas.push({

    user_id: currentUser.id,

    email: currentUser.email,

    ts: Date.now()

  });

  await supabase
    .from("tareas")
    .update({ ayudas })
    .eq("id", id);

}


// ───────────────────────────────────────────────────────
// Realtime
// ───────────────────────────────────────────────────────

function subscribeRealtime() {

  supabase
    .channel("tareas_channel")

    .on(

      "postgres_changes",

      {
        event: "*",
        schema: "public",
        table: "tareas"
      },

      () => loadTareas()

    )

    .subscribe();

}


// ───────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────

function switchTab(tab) {

  currentTab = tab;

  renderTareas();

}

function clearForm() {

  UI.ntTitle.value = "";
  UI.ntSubject.value = "";
  UI.ntDue.value = "";
  UI.ntDesc.value = "";

}

function escapeHtml(text) {

  if (!text) return "";

  return text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

}

function showToast(msg) {

  console.log("[ONCE CORE]", msg);

}
