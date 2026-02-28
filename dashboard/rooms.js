// ONCE CORE — Rooms Controller
// Bridgerton Edition

// =========================
// Protección de acceso
// =========================
let user = JSON.parse(localStorage.getItem("user"));
if (!user) {
  window.location.href = "../login/login.html";
}

// =========================
// Mostrar usuario en topbar
// =========================
const profile = JSON.parse(localStorage.getItem("profile"));
const topbarUser = document.getElementById("topbarUser");
if (topbarUser) {
  const fullName = (typeof getFullName === "function")
    ? getFullName(profile?.name || user.email || "Invitada", profile?.family)
    : profile?.name || user.email || "Invitada";
  topbarUser.textContent = fullName;
}

// =========================
// Salas
// =========================
let rooms = JSON.parse(localStorage.getItem("rooms")) || [];
const roomsList = document.getElementById("roomsList");

// =========================
// Render de salas
// =========================
function renderRooms() {
  if (!roomsList) return;
  roomsList.innerHTML = "";

  if (rooms.length === 0) {
    roomsList.innerHTML = `
      <div class="empty-rooms">
        <div class="empty-rooms-icon">🕯️</div>
        <div class="empty-rooms-text">No hay salones disponibles. ¡Sé la primera en abrir uno!</div>
      </div>
    `;
    return;
  }

  rooms.forEach((room, index) => {
    const card = document.createElement("div");
    card.className = "room-card";
    card.style.animationDelay = (index * 0.06) + "s";

    const activeUser = room.users?.find(u => u.status === "En enfoque");
    const memberCount = room.users?.length || 0;
    const isActive = !!activeUser;

    card.innerHTML = `
      <div class="room-card-header">
        <div class="room-name">${room.name}</div>
        <div class="room-badge ${isActive ? 'active' : 'idle'}">
          ${isActive ? 'En sesión' : 'Disponible'}
        </div>
      </div>
      <div class="room-divider"></div>
      <div class="room-members">
        <span class="member-icon">◈</span>
        ${memberCount} ${memberCount === 1 ? 'miembro' : 'miembros'}
      </div>
      <div class="room-status ${isActive ? 'has-focus' : ''}">
        ${isActive
          ? activeUser.name + ' está en enfoque'
          : 'Sin actividad activa'}
      </div>
      <div class="room-enter-hint">ENTRAR →</div>
    `;

    card.addEventListener("click", () => joinRoom(index));
    roomsList.appendChild(card);
  });
}

// =========================
// Crear sala
// =========================
const createRoomBtn = document.getElementById("createRoomBtn");
const roomNameInput = document.getElementById("roomName");

if (createRoomBtn) {
  createRoomBtn.addEventListener("click", () => {
    const name = roomNameInput?.value?.trim();
    if (!name) {
      roomNameInput?.focus();
      return;
    }

    const newRoom = {
      name,
      createdBy: user.email,
      createdAt: Date.now(),
      users: []
    };

    rooms.push(newRoom);
    localStorage.setItem("rooms", JSON.stringify(rooms));

    if (roomNameInput) roomNameInput.value = "";
    renderRooms();
  });
}

// Enter key para crear sala
roomNameInput?.addEventListener("keydown", e => {
  if (e.key === "Enter") createRoomBtn?.click();
});

// =========================
// Entrar a sala
// =========================
function joinRoom(index) {
  const currentRoom = rooms[index];
  localStorage.setItem("currentRoom", JSON.stringify(currentRoom));
  window.location.href = "room.html";
}

// =========================
// Render inicial
// =========================
renderRooms();