// ONCE CORE — Rooms Controller
// Supabase Edition

// =========================
// Protección de acceso
// =========================
let user = JSON.parse(localStorage.getItem("user"));

if (!user) {
  window.location.href = "../login/login.html";
}

// =========================
// UI refs
// =========================
const roomsList = document.getElementById("roomsList");
const createRoomBtn = document.getElementById("createRoomBtn");
const roomNameInput = document.getElementById("roomName");
const topbarUser = document.getElementById("topbarUser");

// =========================
// Estado
// =========================
let rooms = [];

// =========================
// Mostrar usuario
// =========================
const profile = JSON.parse(localStorage.getItem("profile"));

if (topbarUser) {
  topbarUser.textContent =
    profile?.name ||
    user.email ||
    "Invitada";
}

// =========================
// Render
// =========================
function renderRooms() {

  if (!roomsList) return;

  roomsList.innerHTML = "";

  if (rooms.length === 0) {
    roomsList.innerHTML = `
      <div class="empty-rooms">
        <div class="empty-rooms-icon">🕯️</div>
        <div class="empty-rooms-text">
          No hay salones disponibles. ¡Sé la primera en abrir uno!
        </div>
      </div>
    `;
    return;
  }

  rooms.forEach((room, index) => {

    const members = room.members || [];
    const memberCount = members.length;

    const activeUser = members.find(m => m.status === "En enfoque");

    const card = document.createElement("div");

    card.className = "room-card";

    card.innerHTML = `
      <div class="room-card-header">

        <div class="room-name">
          ${room.name}
        </div>

        <div class="room-badge ${activeUser ? "active" : "idle"}">
          ${activeUser ? "En sesión" : "Disponible"}
        </div>

      </div>

      <div class="room-divider"></div>

      <div class="room-members">
        ◈ ${memberCount} ${memberCount === 1 ? "miembro" : "miembros"}
      </div>

      <div class="room-status">

        ${
          activeUser
            ? activeUser.name + " está en enfoque"
            : "Sin actividad activa"
        }

      </div>

      <div class="room-enter-hint">
        ENTRAR →
      </div>
    `;

    card.onclick = () => joinRoom(room);

    roomsList.appendChild(card);

  });

}

// =========================
// Cargar salas desde Supabase
// =========================
async function loadRooms() {

  try {

    rooms = await sbGetRooms();

    renderRooms();

  }
  catch (err) {

    console.error("Error loading rooms:", err);

  }

}

// =========================
// Crear sala
// =========================
async function createRoom() {

  const name = roomNameInput.value.trim();

  if (!name) return;

  try {

    await sbCreateRoom(
      name,
      user.id,
      profile?.name || user.email
    );

    roomNameInput.value = "";

  }
  catch (err) {

    console.error("Error creating room:", err);

  }

}

// =========================
// Entrar
// =========================
async function joinRoom(room) {

  await sbJoinRoom(room.id, {

    id: user.id,
    name: profile?.name || user.email,
    status: "Disponible"

  });

  localStorage.setItem("currentRoomId", room.id);

  window.location.href = "room.html";

}

// =========================
// Eventos
// =========================
createRoomBtn?.addEventListener(
  "click",
  createRoom
);

roomNameInput?.addEventListener(
  "keydown",
  e => {
    if (e.key === "Enter")
      createRoom();
  }
);

// =========================
// Suscripción realtime
// =========================
sbSubscribeRooms(() => {

  loadRooms();

});

// =========================
// Init
// =========================
loadRooms();
