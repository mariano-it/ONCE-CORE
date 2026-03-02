// ═══════════════════════════════════════════════════════
// ONCE CORE — Sistema de Tareas
// Supabase Native • Realtime • Bridgerton Aesthetic
// ═══════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────
// Estado global
// ───────────────────────────────────────────────────────
let currentUser    = null;
let currentProfile = null;
let tareasCache    = [];
let currentTab     = "mias";
let selectedPriority = "normal";
let apoyoTarget    = null;
let UI = {};

// ───────────────────────────────────────────────────────
// Init
// ───────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (!window._supabase) { console.error("Supabase no disponible"); return; }

    initUI();

    // Auth — mismo patrón que room.js y rooms.js
    currentUser = await sbGetUser();
    if (!currentUser) { window.location.href = "login.html"; return; }

    currentProfile = await sbGetProfile(currentUser.id) || {};

    setupSidebar();
    setupNav();
    setupClock();
    setupFormEvents();
    initApoyoModal();

    await loadTareas();
    subscribeRealtime();

  } catch(err) {
    console.error("Error inicial tareas:", err);
  }
});

// ───────────────────────────────────────────────────────
// Referencias DOM
// ───────────────────────────────────────────────────────
function initUI() {
  UI = {
    container:  document.getElementById("tareasContainer"),
    publishBtn: document.getElementById("publishBtn"),
    ntTitle:    document.getElementById("ntTitle"),
    ntSubject:  document.getElementById("ntSubject"),
    ntDue:      document.getElementById("ntDue"),
    ntDesc:     document.getElementById("ntDesc"),
    tabMias:    document.getElementById("tabMias"),
    tabTodas:   document.getElementById("tabTodas"),
  };
}

// ───────────────────────────────────────────────────────
// Sidebar — mismo patrón que rooms.js
// ───────────────────────────────────────────────────────
function setupSidebar() {
  const p = currentProfile;
  const av = document.getElementById("sidebarAvatar");
  const ta = document.getElementById("topbarAvatar");
  const na = document.getElementById("sidebarName");
  const ca = document.getElementById("sidebarCampus");

  if (av) av.src = p.avatar || "https://via.placeholder.com/80";
  if (ta) ta.src = p.avatar || "https://via.placeholder.com/38";

  const fullN = (typeof getFullName === "function")
    ? getFullName(p.name || currentUser.email, p.family)
    : (p.name || currentUser.email || "Invitada");
  if (na) na.textContent = fullN;

  const fam = (typeof getFamilyById === "function") ? getFamilyById(p.family) : null;
  if (ca) {
    ca.innerHTML = fam
      ? `${fam.emoji} Casa ${fam.surname}<br><span style="font-size:11px;opacity:.6">${p.campus||""}</span>`
      : (p.campus || "Campus no definido");
  }
}

// ───────────────────────────────────────────────────────
// Nav
// ───────────────────────────────────────────────────────
function setupNav() {
  const navMap = {
    dashBtn:      "dashboard.html",
    roomsBtn:     "rooms.html",
    tareasBtn:    "tareas.html",
    hubBtn:       "hub.html",
    conversorBtn: "conversor.html",
    mapBtn:       "map.html",
    settingsBtn:  "settings.html",
  };
  Object.entries(navMap).forEach(([id, href]) =>
    document.getElementById(id)?.addEventListener("click", () => window.location.href = href)
  );
  const cur = window.location.pathname.split("/").pop() || "tareas.html";
  Object.entries(navMap).forEach(([id, href]) => {
    if (href === cur) document.getElementById(id)?.classList.add("active");
  });

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await sbSignOut().catch(() => {});
    ["session","user","profile","schedule","currentRoomId","currentRoom","userStatus"].forEach(k => localStorage.removeItem(k));
    window.location.href = "login.html";
  });
}

// ───────────────────────────────────────────────────────
// Reloj
// ───────────────────────────────────────────────────────
function setupClock() {
  function tick() {
    const cl = document.getElementById("liveClock");
    if (!cl) return;
    const n = new Date();
    cl.textContent = n.getHours().toString().padStart(2,"0") + ":" + n.getMinutes().toString().padStart(2,"0");
  }
  setInterval(tick, 1000); tick();
}

// ───────────────────────────────────────────────────────
// Eventos formulario
// ───────────────────────────────────────────────────────
function setupFormEvents() {
  UI.publishBtn?.addEventListener("click", publishTarea);

  UI.tabMias?.addEventListener("click",  () => switchTab("mias"));
  UI.tabTodas?.addEventListener("click", () => switchTab("todas"));

  document.querySelectorAll(".priority-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".priority-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedPriority = btn.dataset.p;
    });
  });
}

// ───────────────────────────────────────────────────────
// Publicar tarea
// COLUMNAS EXACTAS de la tabla en Supabase:
//   autor_id | autor_name | autor_avatar | autor_family
//   NO existe autor_email — esa columna la inventó ChatGPT
// ───────────────────────────────────────────────────────
async function publishTarea() {
  const title   = UI.ntTitle?.value.trim();
  const subject = UI.ntSubject?.value.trim();
  const due     = UI.ntDue?.value;
  const desc    = UI.ntDesc?.value.trim();

  if (!title) { showToast("✦ Escribe el nombre de la tarea"); return; }

  const p = currentProfile;

  const tarea = {
    title,
    subject:      subject || "General",
    description:  desc    || "",
    due:          due     || null,
    priority:     selectedPriority,
    // ↓ Columnas reales de la tabla
    autor_id:     currentUser.id,
    autor_name:   p.name   || currentUser.email,
    autor_avatar: p.avatar || "",
    autor_family: p.family || "",
    suertes:      [],
    ayudas:       [],
    done:         false,
  };

  const { error } = await window._supabase.from("tareas").insert(tarea);

  if (error) {
    console.error("[ONCE CORE] Error publicando", error);
    showToast("Error al publicar: " + error.message);
    return;
  }

  // Limpiar form
  if (UI.ntTitle)   UI.ntTitle.value   = "";
  if (UI.ntSubject) UI.ntSubject.value = "";
  if (UI.ntDue)     UI.ntDue.value     = "";
  if (UI.ntDesc)    UI.ntDesc.value    = "";

  showToast("✦ Tarea publicada");
  await loadTareas();
}

// ───────────────────────────────────────────────────────
// Cargar tareas
// ───────────────────────────────────────────────────────
async function loadTareas() {
  const { data, error } = await window._supabase
    .from("tareas")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) { console.error(error); return; }
  tareasCache = data || [];
  renderTareas();
}

// ───────────────────────────────────────────────────────
// Render
// ───────────────────────────────────────────────────────
function renderTareas() {
  if (!UI.container) return;

  let tareas = tareasCache;
  if (currentTab === "mias") tareas = tareas.filter(t => t.autor_id === currentUser.id);

  if (tareas.length === 0) {
    UI.container.innerHTML = `
      <div class="tareas-empty">
        <div class="empty-ornament">✦</div>
        ${currentTab === "mias"
          ? "Aún no has publicado ninguna tarea.<br><em>¡Publícala y recibe apoyo!</em>"
          : "El tablón está vacío en este momento."}
      </div>`;
    return;
  }

  UI.container.innerHTML = tareas.map(t => buildCard(t)).join("");

  // Eventos
  UI.container.querySelectorAll(".btn-suerte").forEach(btn =>
    btn.addEventListener("click", () => openApoyoModal(btn.dataset.id, "suerte")));
  UI.container.querySelectorAll(".btn-ayuda").forEach(btn =>
    btn.addEventListener("click", () => openApoyoModal(btn.dataset.id, "ayuda")));
  UI.container.querySelectorAll(".tarea-delete-btn").forEach(btn =>
    btn.addEventListener("click", () => deleteTarea(btn.dataset.id)));
}

function switchTab(tab) {
  currentTab = tab;
  UI.tabMias?.classList.toggle("active",  tab === "mias");
  UI.tabTodas?.classList.toggle("active", tab === "todas");
  renderTareas();
}

// ───────────────────────────────────────────────────────
// Card HTML — diseño Bridgerton completo
// ───────────────────────────────────────────────────────
function buildCard(t) {
  const isOwn   = t.autor_id === currentUser.id;
  const fam     = (typeof getFamilyById === "function") ? getFamilyById(t.autor_family) : null;
  const fullN   = (typeof getFullName   === "function") ? getFullName(t.autor_name, t.autor_family) : (t.autor_name || "Invitada");
  const due     = formatDue(t.due);
  const nSuerte = (t.suertes || []).length;
  const nAyuda  = (t.ayudas  || []).length;

  const familyTag = fam
    ? `<span class="tarea-family-tag" style="background:${fam.badge};color:${fam.badgeText}">${fam.emoji} Casa ${fam.surname}</span>`
    : "";

  const dueHtml  = due  ? `<div class="tarea-due ${due.cls}">🕐 Entrega: ${due.label}</div>` : "";
  const descHtml = t.description ? `<div class="tarea-desc">"${escapeHtml(t.description)}"</div>` : "";

  const actions = !isOwn
    ? `<div class="tarea-actions">
        <button class="tarea-action-btn btn-suerte" data-id="${t.id}">
          💛 Suerte ${nSuerte > 0 ? `<span class="action-count">${nSuerte}</span>` : ""}
        </button>
        <button class="tarea-action-btn btn-ayuda" data-id="${t.id}">
          🤝 Ayudar ${nAyuda > 0 ? `<span class="action-count">${nAyuda}</span>` : ""}
        </button>
       </div>`
    : `<div class="tarea-actions">
        <div style="font-family:var(--font-ui);font-size:10px;color:var(--text-muted);letter-spacing:.08em;flex:1;text-align:center">
          ${nSuerte > 0 ? `💛 ${nSuerte} suerte${nSuerte>1?"s":""}` : ""}
          ${nSuerte > 0 && nAyuda > 0 ? " · " : ""}
          ${nAyuda  > 0 ? `🤝 ${nAyuda} ayuda${nAyuda>1?"s":""}` : ""}
          ${nSuerte === 0 && nAyuda === 0 ? "Sin interacciones aún" : ""}
        </div>
        <button class="tarea-delete-btn" data-id="${t.id}" title="Eliminar">✕</button>
       </div>`;

  return `
    <div class="tarea-card">
      ${isOwn ? '<span class="tarea-own-badge">Tuya</span>' : ""}
      <div class="tarea-priority-bar ${t.priority || "normal"}"></div>
      <div class="tarea-body">
        <div class="tarea-meta-row">
          <span class="tarea-subject-badge">${escapeHtml(t.subject)}</span>
          <span class="priority-tag ${t.priority || "normal"}">
            ${t.priority === "urgente" ? "🔴 Urgente" : t.priority === "alta" ? "🟠 Alta" : "Normal"}
          </span>
        </div>
        <div class="tarea-title">${escapeHtml(t.title)}</div>
        ${descHtml}${dueHtml}
      </div>
      <div class="tarea-author-row">
        <img class="tarea-author-avatar" src="${t.autor_avatar || "https://via.placeholder.com/26"}" alt="">
        <div class="tarea-author-info">
          <div class="tarea-author-name">${escapeHtml(fullN)}</div>
          ${familyTag}
        </div>
      </div>
      ${actions}
    </div>`;
}

// ───────────────────────────────────────────────────────
// Eliminar
// ───────────────────────────────────────────────────────
async function deleteTarea(id) {
  try {
    const { error } = await window._supabase.from("tareas").delete().eq("id", id);
    if (error) throw error;
    await loadTareas();
    showToast("Tarea eliminada");
  } catch(e) { showToast("Error: " + e.message); }
}

// ───────────────────────────────────────────────────────
// Modal apoyo
// ───────────────────────────────────────────────────────
function initApoyoModal() {
  const overlay = document.getElementById("apoyoModal");
  document.getElementById("closeApoyoBtn")?.addEventListener("click", closeApoyoModal);
  overlay?.addEventListener("click", e => { if (e.target === overlay) closeApoyoModal(); });
  document.getElementById("btnSuerte")?.addEventListener("click", sendSuerte);
  document.getElementById("btnAyuda")?.addEventListener("click",  toggleAyudaForm);
  document.getElementById("sendAyuda")?.addEventListener("click", sendAyuda);
}

function openApoyoModal(tareaId, mode) {
  const tarea = tareasCache.find(t => t.id === tareaId);
  if (!tarea) return;
  apoyoTarget = { tareaId };

  const fullN = (typeof getFullName === "function") ? getFullName(tarea.autor_name, tarea.autor_family) : tarea.autor_name;
  document.getElementById("apoyoAvatar").src             = tarea.autor_avatar || "https://via.placeholder.com/72";
  document.getElementById("apoyoNombre").textContent     = fullN;
  document.getElementById("apoyoTareaTitle").textContent = `"${tarea.title}"`;
  document.getElementById("apoyoConfirm").classList.add("hidden");
  document.getElementById("btnSuerte").style.display     = "";
  document.getElementById("btnAyuda").style.display      = "";
  document.getElementById("ayudaForm").classList.add("hidden");
  document.getElementById("ayudaMensaje").value          = "";

  const overlay = document.getElementById("apoyoModal");
  overlay.classList.add("show"); overlay.style.display = "flex";
  if (mode === "ayuda") setTimeout(toggleAyudaForm, 100);
}

function closeApoyoModal() {
  const overlay = document.getElementById("apoyoModal");
  overlay.classList.remove("show"); overlay.style.display = "none";
  apoyoTarget = null;
}

function toggleAyudaForm() {
  const form = document.getElementById("ayudaForm");
  form.classList.toggle("hidden");
  if (!form.classList.contains("hidden")) document.getElementById("ayudaMensaje").focus();
}

async function sendSuerte() {
  if (!apoyoTarget) return;
  try {
    const sent = await sbAddSuerte(apoyoTarget.tareaId, currentUser.id);
    if (!sent) { showToast("Ya le mandaste suerte 💛"); closeApoyoModal(); return; }

    document.getElementById("btnSuerte").style.display  = "none";
    document.getElementById("btnAyuda").style.display   = "none";
    document.getElementById("confirmEmoji").textContent = "💛";
    document.getElementById("confirmText").textContent  = "¡Suerte enviada!";
    document.getElementById("apoyoConfirm").classList.remove("hidden");
    launchLuckyParticles();
    await loadTareas();
    setTimeout(closeApoyoModal, 2200);
  } catch(e) { showToast("Error: " + e.message); }
}

async function sendAyuda() {
  if (!apoyoTarget) return;
  const msg = document.getElementById("ayudaMensaje")?.value.trim();
  if (!msg) { showToast("Escribe un mensaje primero"); return; }

  const p       = currentProfile;
  const myName  = p.name || currentUser.email;
  const myEmail = currentUser.email;

  try {
    const tarea = tareasCache.find(t => t.id === apoyoTarget.tareaId);
    if (!tarea) return;

    await sbAddAyuda(apoyoTarget.tareaId, { email: myEmail, nombre: myName, mensaje: msg, ts: Date.now() });

    // Notificación — el campo "para" usa el autor_id (UUID) de la tarea
    await window._supabase.from("messages").insert({
      tipo:         "ayuda",
      de:           myEmail,
      de_nombre:    myName,
      para:         tarea.autor_id,
      tarea_id:     tarea.id,
      tarea_titulo: tarea.title,
      mensaje:      msg,
      leido:        false,
    }).catch(e => console.warn("Mensaje no guardado:", e.message));

    document.getElementById("btnSuerte").style.display  = "none";
    document.getElementById("btnAyuda").style.display   = "none";
    document.getElementById("ayudaForm").classList.add("hidden");
    document.getElementById("confirmEmoji").textContent = "🤝";
    document.getElementById("confirmText").textContent  = "¡Mensaje enviado!";
    document.getElementById("apoyoConfirm").classList.remove("hidden");
    await loadTareas();
    setTimeout(closeApoyoModal, 2200);
  } catch(e) { showToast("Error: " + e.message); }
}

// ───────────────────────────────────────────────────────
// Realtime
// ───────────────────────────────────────────────────────
function subscribeRealtime() {
  window._supabase
    .channel("tareas_realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "tareas" }, () => loadTareas())
    .subscribe();
}

// ───────────────────────────────────────────────────────
// Partículas 💛
// ───────────────────────────────────────────────────────
function launchLuckyParticles() {
  const canvas = document.getElementById("luckyCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = "block";
  const COLORS = ["#f59e0b","#c9a84c","#fbbf24","#a3e635","#34d399","#60a5fa","#f472b6","#e8c97a"];
  const pieces = Array.from({length: 90}, () => ({
    x: Math.random() * canvas.width, y: -20 - Math.random() * 200,
    w: 6 + Math.random() * 10,       h: 4 + Math.random() * 8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    vx: -2 + Math.random() * 4,      vy: 3 + Math.random() * 4,
    rot: Math.random() * Math.PI * 2, rotV: (Math.random() - .5) * .2, alpha: 1,
  }));
  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rot += p.rotV; p.vy += .06;
      if (frame > 60) p.alpha = Math.max(0, p.alpha - .018);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h); ctx.restore();
    });
    frame++;
    if (frame < 140) requestAnimationFrame(draw);
    else { canvas.style.display = "none"; ctx.clearRect(0,0,canvas.width,canvas.height); }
  }
  draw();
}

// ───────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────
function formatDue(isoStr) {
  if (!isoStr) return null;
  const d = new Date(isoStr), now = new Date();
  const diffMs = d - now;
  if (diffMs < 0) return { label: "Venció " + d.toLocaleDateString("es",{day:"numeric",month:"short"}), cls: "vencida" };
  if (d.toDateString() === now.toDateString()) return { label: "Hoy " + d.toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"}), cls: "vence-hoy" };
  if (diffMs < 172800000) return { label: "Mañana " + d.toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"}), cls: "" };
  return { label: d.toLocaleDateString("es",{day:"numeric",month:"short"}), cls: "" };
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function showToast(msg) {
  const el = document.getElementById("toast");
  if (!el) { console.log("[ONCE CORE]", msg); return; }
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add("hidden"), 2800);
}
