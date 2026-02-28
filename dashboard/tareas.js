// ONCE CORE — Sistema de Tareas
// Bridgerton Edition

// ─── PROTECCIÓN ───────────────────────────────────
if (localStorage.getItem("session") !== "active") {
  window.location.href = "../login/login.html";
}

// ─── ESTADO GLOBAL ────────────────────────────────
let currentTab    = "mias"; // "mias" | "todas"
let selectedPriority = "normal";
let apoyoTarget   = null;   // { tareaId, autorId }

// ─── HELPERS ──────────────────────────────────────
function getProfile() { return JSON.parse(localStorage.getItem("profile")) || {}; }
function getUser()    { return JSON.parse(localStorage.getItem("user"))    || {}; }
function getAllTareas() {
  return JSON.parse(localStorage.getItem("onceTareas") || "[]");
}
function saveTareas(arr) {
  localStorage.setItem("onceTareas", JSON.stringify(arr));
}
function getMessages() {
  return JSON.parse(localStorage.getItem("onceMessages") || "[]");
}
function saveMessages(arr) {
  localStorage.setItem("onceMessages", JSON.stringify(arr));
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function formatDue(isoStr) {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  const now = new Date();
  const todayStr  = now.toDateString();
  const dueStr    = d.toDateString();
  const diffMs    = d - now;
  const diffH     = Math.floor(diffMs / 3600000);

  if (diffMs < 0) return { label: "Venció " + d.toLocaleDateString("es", { day:"numeric", month:"short" }), cls: "vencida" };
  if (dueStr === todayStr) return { label: "Hoy " + d.toLocaleTimeString("es", { hour:"2-digit", minute:"2-digit" }), cls: "vence-hoy" };
  if (diffH < 48) return { label: "Mañana " + d.toLocaleTimeString("es", { hour:"2-digit", minute:"2-digit" }), cls: "" };
  return { label: d.toLocaleDateString("es", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }), cls: "" };
}

function showToast(msg, duration = 2800) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add("hidden"), duration);
}

// ─── INIT ──────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const profile = getProfile();
  const user    = getUser();

  // Sidebar
  const av = document.getElementById("sidebarAvatar");
  const na = document.getElementById("sidebarName");
  const ca = document.getElementById("sidebarCampus");
  const ta = document.getElementById("topbarAvatar");
  if (av) av.src = profile.avatar || "https://via.placeholder.com/80";
  if (ta) ta.src = profile.avatar || "https://via.placeholder.com/38";
  if (na) na.textContent = (typeof getFullName === "function")
    ? getFullName(profile.name || user.email || "Invitada", profile.family)
    : profile.name || "Invitada";
  const fam = (typeof getFamilyById === "function") ? getFamilyById(profile.family) : null;
  if (ca) {
    ca.innerHTML = fam
      ? fam.emoji + " Casa " + fam.surname + '<br><span style="font-size:11px;opacity:.6">' + (profile.campus || "") + "</span>"
      : (profile.campus || "Campus no definido");
  }

  // Nav
// ── Navegación ──────────────────────────────────
  const _navMap = {
    "dashBtn":      "dashboard.html",
    "roomsBtn":     "rooms.html",
    "tareasBtn":    "tareas.html",
    "hubBtn":       "hub.html",
    "conversorBtn": "conversor.html",
    "mapBtn":       "map.html",
    "settingsBtn":  "settings.html",
  };
  Object.entries(_navMap).forEach(([id, href]) => {
    document.getElementById(id)?.addEventListener("click", () => window.location.href = href);
  });
  // Marcar botón activo según página actual
  const _curPage = window.location.pathname.split("/").pop() || "dashboard.html";
  Object.entries(_navMap).forEach(([id, href]) => {
    if (href === _curPage) document.getElementById(id)?.classList.add("active");
  });
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    ["session","user","profile","schedule","currentRoom","userStatus","lastActivity"].forEach(k => localStorage.removeItem(k));
    window.location.href = "../login/login.html";
  });

  // Reloj
  function tick() {
    const cl = document.getElementById("liveClock");
    if (!cl) return;
    const n = new Date();
    cl.textContent = n.getHours().toString().padStart(2,"0") + ":" + n.getMinutes().toString().padStart(2,"0");
  }
  setInterval(tick, 1000); tick();

  // Priority selector
  document.querySelectorAll(".priority-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".priority-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedPriority = btn.dataset.p;
    });
  });

  // Tabs
  document.getElementById("tabMias")?.addEventListener("click", () => switchTab("mias"));
  document.getElementById("tabTodas")?.addEventListener("click", () => switchTab("todas"));

  // Publicar tarea
  document.getElementById("publishBtn")?.addEventListener("click", publishTarea);

  // Render inicial
  renderTareas();

  // Escuchar cambios en localStorage (otras pestañas)
  window.addEventListener("storage", e => {
    if (e.key === "onceTareas") renderTareas();
  });

  // Modal apoyo
  initApoyoModal();
});

// ─── TABS ──────────────────────────────────────────
function switchTab(tab) {
  currentTab = tab;
  document.getElementById("tabMias").classList.toggle("active", tab === "mias");
  document.getElementById("tabTodas").classList.toggle("active", tab === "todas");
  renderTareas();
}

// ─── PUBLICAR TAREA ───────────────────────────────
function publishTarea() {
  const title   = document.getElementById("ntTitle")?.value.trim();
  const subject = document.getElementById("ntSubject")?.value.trim();
  const due     = document.getElementById("ntDue")?.value;
  const desc    = document.getElementById("ntDesc")?.value.trim();

  if (!title) { showToast("✦ Escribe el nombre de la tarea"); return; }

  const profile = getProfile();
  const user    = getUser();

  const tarea = {
    id:        uid(),
    title,
    subject:   subject || "General",
    due:       due || null,
    desc:      desc || "",
    priority:  selectedPriority,
    autorId:   user.email || "anon",
    autorName: profile.name || "Anónima",
    autorAvatar: profile.avatar || "",
    autorFamily: profile.family || "",
    suertes:   [],   // array de emails que mandaron suerte
    ayudas:    [],   // array de { email, nombre, mensaje }
    createdAt: Date.now(),
    done:      false,
  };

  const arr = getAllTareas();
  arr.unshift(tarea);
  saveTareas(arr);

  // Limpiar form
  document.getElementById("ntTitle").value   = "";
  document.getElementById("ntSubject").value = "";
  document.getElementById("ntDue").value     = "";
  document.getElementById("ntDesc").value    = "";

  showToast("✦ Tarea publicada");
  renderTareas();
}

// ─── RENDER ────────────────────────────────────────
function renderTareas() {
  const container = document.getElementById("tareasContainer");
  if (!container) return;

  const user    = getUser();
  const myEmail = user.email || "anon";
  let tareas    = getAllTareas();

  if (currentTab === "mias") {
    tareas = tareas.filter(t => t.autorId === myEmail);
  }
  // "todas" muestra todo

  if (tareas.length === 0) {
    container.innerHTML = `
      <div class="tareas-empty">
        <div class="empty-ornament">✦</div>
        ${currentTab === "mias"
          ? "Aún no has publicado ninguna tarea.<br><em>¡Publícala y recibe apoyo de tus compañeras!</em>"
          : "El tablón está vacío en este momento."}
      </div>`;
    return;
  }

  container.innerHTML = tareas.map(t => buildTareaCard(t, myEmail)).join("");

  // Event listeners de las cards
  container.querySelectorAll(".tarea-action-btn.btn-suerte").forEach(btn => {
    btn.addEventListener("click", () => openApoyoModal(btn.dataset.id, "suerte"));
  });
  container.querySelectorAll(".tarea-action-btn.btn-ayuda").forEach(btn => {
    btn.addEventListener("click", () => openApoyoModal(btn.dataset.id, "ayuda"));
  });
  container.querySelectorAll(".tarea-delete-btn").forEach(btn => {
    btn.addEventListener("click", () => deleteTarea(btn.dataset.id));
  });
}

function buildTareaCard(t, myEmail) {
  const isOwn  = t.autorId === myEmail;
  const fam    = (typeof getFamilyById === "function") ? getFamilyById(t.autorFamily) : null;
  const fullN  = (typeof getFullName   === "function") ? getFullName(t.autorName, t.autorFamily) : t.autorName;
  const due    = formatDue(t.due);
  const nSuerte = t.suertes ? t.suertes.length : 0;
  const nAyuda  = t.ayudas  ? t.ayudas.length  : 0;

  const familyTag = fam
    ? `<span class="tarea-family-tag" style="background:${fam.badge};color:${fam.badgeText}">${fam.emoji} Casa ${fam.surname}</span>`
    : "";

  const dueHtml = due
    ? `<div class="tarea-due ${due.cls}">🕐 Entrega: ${due.label}</div>`
    : "";

  const descHtml = t.desc
    ? `<div class="tarea-desc">"${t.desc}"</div>`
    : "";

  const ownBadge = isOwn ? `<span class="tarea-own-badge">Tuya</span>` : "";

  const deleteBtn = isOwn
    ? `<button class="tarea-delete-btn" data-id="${t.id}" title="Eliminar">✕</button>`
    : "";

  // Si es propia, no mostrar botones de apoyo
  const actions = !isOwn ? `
    <div class="tarea-actions">
      <button class="tarea-action-btn btn-suerte" data-id="${t.id}">
        💛 Suerte ${nSuerte > 0 ? `<span class="action-count">${nSuerte}</span>` : ""}
      </button>
      <button class="tarea-action-btn btn-ayuda" data-id="${t.id}">
        🤝 Ayudar ${nAyuda > 0 ? `<span class="action-count">${nAyuda}</span>` : ""}
      </button>
    </div>
  ` : `
    <div class="tarea-actions">
      <div style="font-family:var(--font-ui);font-size:10px;color:var(--text-muted);letter-spacing:.08em;padding:2px 0;flex:1;text-align:center">
        ${nSuerte > 0 ? `💛 ${nSuerte} suerte${nSuerte>1?"s":""}` : ""}
        ${nSuerte > 0 && nAyuda > 0 ? " · " : ""}
        ${nAyuda > 0  ? `🤝 ${nAyuda} ayuda${nAyuda>1?"s":""}` : ""}
        ${nSuerte === 0 && nAyuda === 0 ? "Sin interacciones aún" : ""}
      </div>
      ${deleteBtn}
    </div>
  `;

  return `
    <div class="tarea-card">
      ${ownBadge}
      <div class="tarea-priority-bar ${t.priority || "normal"}"></div>
      <div class="tarea-body">
        <div class="tarea-meta-row">
          <span class="tarea-subject-badge">${t.subject}</span>
          <span class="priority-tag ${t.priority || "normal"}">${t.priority === "urgente" ? "🔴 Urgente" : t.priority === "alta" ? "🟠 Alta" : "Normal"}</span>
        </div>
        <div class="tarea-title">${t.title}</div>
        ${descHtml}
        ${dueHtml}
      </div>
      <div class="tarea-author-row">
        <img class="tarea-author-avatar" src="${t.autorAvatar || "https://via.placeholder.com/26"}" alt="">
        <div class="tarea-author-info">
          <div class="tarea-author-name">${fullN}</div>
          ${familyTag}
        </div>
      </div>
      ${actions}
    </div>
  `;
}

// ─── ELIMINAR ──────────────────────────────────────
function deleteTarea(id) {
  const arr = getAllTareas().filter(t => t.id !== id);
  saveTareas(arr);
  renderTareas();
  showToast("Tarea eliminada");
}

// ─── MODAL APOYO ──────────────────────────────────
function initApoyoModal() {
  const overlay = document.getElementById("apoyoModal");
  document.getElementById("closeApoyoBtn")?.addEventListener("click", closeApoyoModal);
  overlay?.addEventListener("click", e => { if (e.target === overlay) closeApoyoModal(); });

  document.getElementById("btnSuerte")?.addEventListener("click", sendSuerte);
  document.getElementById("btnAyuda")?.addEventListener("click", toggleAyudaForm);
  document.getElementById("sendAyuda")?.addEventListener("click", sendAyuda);
}

function openApoyoModal(tareaId, mode) {
  const tareas = getAllTareas();
  const tarea  = tareas.find(t => t.id === tareaId);
  if (!tarea) return;

  apoyoTarget = { tareaId };

  const fam   = (typeof getFamilyById === "function") ? getFamilyById(tarea.autorFamily) : null;
  const fullN = (typeof getFullName   === "function") ? getFullName(tarea.autorName, tarea.autorFamily) : tarea.autorName;

  document.getElementById("apoyoAvatar").src       = tarea.autorAvatar || "https://via.placeholder.com/72";
  document.getElementById("apoyoNombre").textContent       = fullN;
  document.getElementById("apoyoTareaTitle").textContent   = '"' + tarea.title + '"';

  // Reset
  document.getElementById("apoyoConfirm").classList.add("hidden");
  document.getElementById("btnSuerte").style.display  = "";
  document.getElementById("btnAyuda").style.display   = "";
  document.getElementById("ayudaForm").classList.add("hidden");
  document.getElementById("ayudaMensaje").value = "";

  const overlay = document.getElementById("apoyoModal");
  overlay.classList.add("show");
  overlay.style.display = "flex";

  // Si viene del botón ayuda, abre directamente el form
  if (mode === "ayuda") {
    setTimeout(toggleAyudaForm, 100);
  }
}

function closeApoyoModal() {
  const overlay = document.getElementById("apoyoModal");
  overlay.classList.remove("show");
  overlay.style.display = "none";
  apoyoTarget = null;
}

function toggleAyudaForm() {
  const form = document.getElementById("ayudaForm");
  form.classList.toggle("hidden");
  if (!form.classList.contains("hidden")) {
    document.getElementById("ayudaMensaje").focus();
  }
}

function sendSuerte() {
  if (!apoyoTarget) return;
  const user    = getUser();
  const myEmail = user.email || "anon";
  const tareas  = getAllTareas();
  const idx     = tareas.findIndex(t => t.id === apoyoTarget.tareaId);
  if (idx === -1) return;

  if (!tareas[idx].suertes) tareas[idx].suertes = [];

  // Solo una vez por persona
  if (tareas[idx].suertes.includes(myEmail)) {
    showToast("Ya le mandaste suerte 💛");
    closeApoyoModal();
    return;
  }

  tareas[idx].suertes.push(myEmail);
  saveTareas(tareas);

  // UI: mostrar confirmación
  document.getElementById("btnSuerte").style.display = "none";
  document.getElementById("btnAyuda").style.display  = "none";
  document.getElementById("ayudaForm").classList.add("hidden");
  document.getElementById("confirmEmoji").textContent = "💛";
  document.getElementById("confirmText").textContent  = "¡Suerte enviada!";
  document.getElementById("apoyoConfirm").classList.remove("hidden");

  // Partículas
  launchLuckyParticles();

  renderTareas();
  setTimeout(closeApoyoModal, 2200);
}

function sendAyuda() {
  if (!apoyoTarget) return;
  const msg     = document.getElementById("ayudaMensaje")?.value.trim();
  if (!msg) { showToast("Escribe un mensaje primero"); return; }

  const user    = getUser();
  const profile = getProfile();
  const myEmail = user.email || "anon";
  const myName  = profile.name || "Anónima";
  const tareas  = getAllTareas();
  const idx     = tareas.findIndex(t => t.id === apoyoTarget.tareaId);
  if (idx === -1) return;

  if (!tareas[idx].ayudas) tareas[idx].ayudas = [];
  tareas[idx].ayudas.push({
    email: myEmail,
    nombre: myName,
    mensaje: msg,
    ts: Date.now(),
  });
  saveTareas(tareas);

  // Guardar en mensajes globales (notificaciones futuras)
  const msgs = getMessages();
  msgs.push({
    id:        uid(),
    tipo:      "ayuda",
    de:        myEmail,
    deNombre:  myName,
    para:      tareas[idx].autorId,
    tareaId:   tareas[idx].id,
    tareaTitulo: tareas[idx].title,
    mensaje:   msg,
    ts:        Date.now(),
    leido:     false,
  });
  saveMessages(msgs);

  // UI: confirmación
  document.getElementById("btnSuerte").style.display = "none";
  document.getElementById("btnAyuda").style.display  = "none";
  document.getElementById("ayudaForm").classList.add("hidden");
  document.getElementById("confirmEmoji").textContent = "🤝";
  document.getElementById("confirmText").textContent  = "¡Mensaje enviado!";
  document.getElementById("apoyoConfirm").classList.remove("hidden");

  renderTareas();
  setTimeout(closeApoyoModal, 2200);
}

// ─── PARTÍCULAS SUERTE ─────────────────────────────
function launchLuckyParticles() {
  const canvas = document.getElementById("luckyCanvas");
  if (!canvas) return;
  const ctx    = canvas.getContext("2d");

  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = "block";

  const COLORS = ["#f59e0b","#c9a84c","#fbbf24","#a3e635","#34d399","#60a5fa","#f472b6","#e8c97a"];
  const pieces = Array.from({ length: 90 }, () => ({
    x:  Math.random() * canvas.width,
    y:  -20 - Math.random() * 200,
    w:  6  + Math.random() * 10,
    h:  4  + Math.random() * 8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    vx: -2 + Math.random() * 4,
    vy: 3  + Math.random() * 4,
    rot: Math.random() * Math.PI * 2,
    rotV: (Math.random() - .5) * .2,
    alpha: 1,
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x   += p.vx;
      p.y   += p.vy;
      p.rot += p.rotV;
      p.vy  += .06; // gravedad leve
      if (frame > 60) p.alpha = Math.max(0, p.alpha - .018);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle   = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    });
    frame++;
    if (frame < 140) {
      requestAnimationFrame(draw);
    } else {
      canvas.style.display = "none";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  draw();
}

// ─── WIDGET MINI PARA SALA ─────────────────────────
// Exporta función usable desde room.js
window.renderSalaTareasWidget = function(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const tareas = getAllTareas().slice(0, 5); // solo 5 más recientes
  if (tareas.length === 0) {
    container.innerHTML = `<div style="font-style:italic;color:var(--text-muted);font-size:13px;padding:8px 0">Sin tareas publicadas</div>`;
    return;
  }

  const user    = getUser();
  const myEmail = user.email || "anon";

  container.innerHTML = tareas.map(t => {
    const fam   = (typeof getFamilyById === "function") ? getFamilyById(t.autorFamily) : null;
    const fullN = (typeof getFullName   === "function") ? getFullName(t.autorName, t.autorFamily) : t.autorName;
    const isOwn = t.autorId === myEmail;
    const PCOLOR = { normal: "var(--sage)", alta: "#d97706", urgente: "#dc2626" };
    return `
      <div class="sala-tarea-item">
        <div class="sala-tarea-dot" style="background:${PCOLOR[t.priority||"normal"]}"></div>
        <div style="flex:1;min-width:0">
          <div class="sala-tarea-name">${t.title}</div>
          <div style="font-size:10px;color:var(--text-muted);font-family:var(--font-ui)">${fullN}</div>
        </div>
        ${!isOwn ? `<button class="sala-tarea-mini-btn" onclick="window.location.href='tareas.html'">💛</button>` : ""}
      </div>
    `;
  }).join("");
};