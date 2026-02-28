// ONCE CORE — Room Controller
// Bridgerton Edition

// =========================
// Protección de acceso
// =========================
const session = localStorage.getItem("session");
if (session !== "active") {
  window.location.href = "../login/login.html";
}

// =========================
// Datos base
// =========================
let user    = JSON.parse(localStorage.getItem("user"));
let room    = JSON.parse(localStorage.getItem("currentRoom"));
let profile = JSON.parse(localStorage.getItem("profile"));

if (!room) {
  window.location.href = "dashboard.html";
}

// =========================
// Nombre de la sala
// =========================
const roomNameEl = document.getElementById("roomName");
if (roomNameEl) roomNameEl.textContent = room.name;

// =========================
// Identidad del usuario
// =========================
let userIdentity = {
  email:     user.email,
  name:      profile?.name   || user.email,
  avatar:    profile?.avatar || "https://via.placeholder.com/46",
  campus:    profile?.campus || "",
  family:    profile?.family || "",
  status:    "Inactiva",
  startTime: null
};

// Agregar usuario si no existe
const exists = room.users.find(u => u.email === user.email);
if (!exists) {
  room.users.push(userIdentity);
  localStorage.setItem("currentRoom", JSON.stringify(room));
}

// =========================
// Session timer
// =========================
const sessionStart = Date.now();
const sessionTimerEl = document.getElementById("sessionTimer");

function updateSessionTimer() {
  if (!sessionTimerEl) return;
  const diff = Math.floor((Date.now() - sessionStart) / 60000);
  sessionTimerEl.textContent = diff < 1 ? "0 min" : diff + " min";
}
setInterval(updateSessionTimer, 30000);
updateSessionTimer();

// =========================
// Render usuarios
// =========================
function renderUsers() {
  const usersList = document.getElementById("usersList");
  if (!usersList) return;
  usersList.innerHTML = "";

  room.users.forEach((member, i) => {
    const isYou    = member.email === user.email;
    const isFocus  = member.status === "En enfoque";
    const isBreak  = member.status === "Descanso";

    let focusMin = 0;
    if (isFocus && member.startTime) {
      focusMin = Math.floor((Date.now() - member.startTime) / 60000);
    }

    const ringClass  = isFocus ? "focus" : isBreak ? "break" : "";
    const statusClass = isFocus ? "focus" : isBreak ? "break" : "";
    const statusLabel = isFocus
      ? "En enfoque"
      : isBreak
      ? "En descanso"
      : member.status || "Inactiva";

    const card = document.createElement("div");
    card.className = "user-card" + (isYou ? " is-you" : "");
    card.style.animationDelay = (i * 0.07) + "s";

    // Full name with family surname
    const fullName = (typeof getFullName === "function")
      ? getFullName(member.name, member.family)
      : member.name;

    // Family badge HTML
    const familyBadge = (typeof getFamilyBadgeHTML === "function")
      ? getFamilyBadgeHTML(member.family)
      : "";

    card.innerHTML = `
      <div class="user-avatar-wrap">
        <img class="user-avatar" src="${member.avatar}" alt="${member.name}">
        <div class="user-status-ring ${ringClass}"></div>
      </div>
      <div class="user-info">
        <div class="user-name">
          ${fullName}
          ${isYou ? '<span class="you-tag">TÚ</span>' : ''}
        </div>
        ${familyBadge}
        <div class="user-campus">${member.campus}</div>
        <div class="user-status-text ${statusClass}">${statusLabel}</div>
        ${isFocus && focusMin >= 0
          ? `<div class="user-focus-time">${focusMin} min concentrada</div>`
          : ''}
      </div>
    `;

    usersList.appendChild(card);
  });

  // Actualizar estado propio en banner
  updateMyStatusDisplay();
}

// =========================
// Estado propio en banner
// =========================
function updateMyStatusDisplay() {
  const me = room.users.find(u => u.email === user.email);
  const dot  = document.getElementById("myStatusDot");
  const text = document.getElementById("myStatusText");
  if (!me || !dot || !text) return;

  dot.className = "current-status-dot";

  if (me.status === "En enfoque") {
    dot.classList.add("focus");
    text.textContent = "En Enfoque";
  } else if (me.status === "Descanso") {
    dot.classList.add("break");
    text.textContent = "Descansando";
  } else {
    dot.classList.add("idle");
    text.textContent = "Inactiva";
  }
}

// =========================
// Actualizar estado
// =========================
function updateStatus(newStatus) {
  let freshRoom = JSON.parse(localStorage.getItem("currentRoom"));
  let freshUser = JSON.parse(localStorage.getItem("user"));

  freshRoom.users.forEach(member => {
    if (member.email === freshUser.email) {
      member.status    = newStatus;
      member.startTime = newStatus === "En enfoque" ? Date.now() : null;
    }
  });

  localStorage.setItem("currentRoom", JSON.stringify(freshRoom));
  room = freshRoom;
  renderUsers();
}

// =========================
// Botones
// =========================
document.getElementById("backBtn")?.addEventListener("click", () => {
  window.location.href = "dashboard.html";
});

document.getElementById("focusBtn")?.addEventListener("click", () => {
  updateStatus("En enfoque");
});

document.getElementById("breakBtn")?.addEventListener("click", () => {
  updateStatus("Descanso");
});

// =========================
// Render inicial
// =========================
renderUsers();

// Auto-refresh cada 30s para actualizar tiempos de enfoque
setInterval(() => {
  room = JSON.parse(localStorage.getItem("currentRoom")) || room;
  renderUsers();
}, 30000);

// =========================
// Widget de Tareas en Sala
// =========================
(function loadTareasWidget() {
  const container = document.getElementById("salaTareasList");
  if (!container) return;

  function renderWidget() {
    const tareas  = JSON.parse(localStorage.getItem("onceTareas") || "[]").slice(0, 5);
    const user    = JSON.parse(localStorage.getItem("user"))    || {};
    const myEmail = user.email || "anon";

    if (tareas.length === 0) {
      container.innerHTML = `<div style="font-style:italic;color:var(--text-muted);font-size:13px;padding:8px 0;font-family:var(--font-body)">Sin tareas publicadas aún.</div>`;
      return;
    }

    const PCOLOR = { normal: "var(--sage)", alta: "#d97706", urgente: "#dc2626" };

    container.innerHTML = tareas.map(t => {
      const fullN = (typeof getFullName === "function") ? getFullName(t.autorName, t.autorFamily) : t.autorName;
      const isOwn = t.autorId === myEmail;
      const nSuerte = (t.suertes || []).length;
      return `
        <div class="sala-tarea-item">
          <div class="sala-tarea-dot" style="background:${PCOLOR[t.priority||"normal"]}"></div>
          <div style="flex:1;min-width:0">
            <div class="sala-tarea-name" style="font-family:var(--font-body);font-size:13px;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.title}</div>
            <div style="font-size:10px;color:var(--text-muted);font-family:var(--font-ui);letter-spacing:.04em">${fullN} · ${t.subject}</div>
          </div>
          ${!isOwn ? `<button onclick="window.location.href='tareas.html'" style="background:none;border:1px solid rgba(201,168,76,0.2);border-radius:6px;padding:3px 8px;font-size:12px;cursor:pointer;color:var(--text-muted);transition:all .15s" title="Ir a tareas">💛 ${nSuerte > 0 ? nSuerte : ""}</button>` : `<span style="font-size:10px;color:var(--text-muted);font-family:var(--font-ui)">Tuya</span>`}
        </div>
      `;
    }).join("");
  }

  renderWidget();
  // Actualizar si cambian las tareas (otra pestaña)
  window.addEventListener("storage", e => { if (e.key === "onceTareas") renderWidget(); });
  setInterval(renderWidget, 30000);
})();