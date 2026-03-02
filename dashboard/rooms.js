// ═══════════════════════════════════════════════════════
// ONCE CORE — Rooms Controller (Supabase Edition)
// Realtime • Persistente • Multiusuario real
// ═══════════════════════════════════════════════════════

// =========================
// Estado global
// =========================
let user = null;
let profile = null;
let rooms = [];

const roomsList = document.getElementById("roomsList");
const createRoomBtn = document.getElementById("createRoomBtn");
const roomNameInput = document.getElementById("roomName");
const topbarUser = document.getElementById("topbarUser");


// ═══════════════════════════════════════════════════════
// Inicialización segura
// ═══════════════════════════════════════════════════════

async function initializeRoomsPage() {

  // Obtener usuario real desde Supabase
  user = await sbGetUser();

  if (!user) {
    window.location.href = "../login/login.html";
    return;
  }

  // Obtener perfil
  profile = await sbGetProfile(user.id);

  // Mostrar nombre
  if (topbarUser) {
    topbarUser.textContent =
      profile?.name ||
      user.email ||
      "Invitada";
  }

  // Cargar salas
  await loadRooms();

  // Activar realtime
  subscribeRealtime();

}


// ═══════════════════════════════════════════════════════
// Cargar salas desde Supabase
// ═══════════════════════════════════════════════════════

async function loadRooms() {

  try {

    rooms = await sbGetRooms();

    renderRooms();

  } catch (error) {

    console.error("Error cargando salas:", error);

  }

}


// ═══════════════════════════════════════════════════════
// Render de salas
// ═══════════════════════════════════════════════════════

function renderRooms() {

  if (!roomsList) return;

  roomsList.innerHTML = "";

  if (!rooms || rooms.length === 0) {

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

    const card = document.createElement("div");

    card.className = "room-card";

    card.style.animationDelay = (index * 0.05) + "s";


    const members = room.members || [];

    const activeUser = members.find(m => m.status === "En enfoque");

    const memberCount = members.length;

    const isActive = !!activeUser;


    card.innerHTML = `

      <div class="room-card-header">

        <div class="room-name">
          ${escapeHtml(room.name)}
        </div>

        <div class="room-badge ${isActive ? "active" : "idle"}">
          ${isActive ? "En sesión" : "Disponible"}
        </div>

      </div>

      <div class="room-divider"></div>

      <div class="room-members">
        <span class="member-icon">◈</span>
        ${memberCount} ${memberCount === 1 ? "miembro" : "miembros"}
      </div>

      <div class="room-status ${isActive ? "has-focus" : ""}">
        ${
          isActive
            ? escapeHtml(activeUser.name) + " está en enfoque"
            : "Sin actividad activa"
        }
      </div>

      <div class="room-enter-hint">
        ENTRAR →
      </div>

    `;


    card.addEventListener("click", () => enterRoom(room));

    roomsList.appendChild(card);

  });

}


// ═══════════════════════════════════════════════════════
// Crear sala
// ═══════════════════════════════════════════════════════

if (createRoomBtn) {

  createRoomBtn.addEventListener("click", async () => {

    try {

      const name = roomNameInput.value.trim();

      if (!name) {
        roomNameInput.focus();
        return;
      }

      await sbCreateRoom(

        name,

        user.id,

        profile?.name || user.email

      );

      roomNameInput.value = "";

      await loadRooms();

    } catch (error) {

      console.error("Error creando sala:", error);

      alert("Error creando sala");

    }

  });

}


// Enter para crear sala

roomNameInput?.addEventListener("keydown", (e) => {

  if (e.key === "Enter") {

    createRoomBtn.click();

  }

});


// ═══════════════════════════════════════════════════════
// Entrar a sala
// ═══════════════════════════════════════════════════════

function enterRoom(room) {

  localStorage.setItem("currentRoomId", room.id);

  window.location.href = "room.html";

}


// ═══════════════════════════════════════════════════════
// Realtime
// ═══════════════════════════════════════════════════════

function subscribeRealtime() {

  sbSubscribeRooms(() => {

    loadRooms();

  });

}


// ═══════════════════════════════════════════════════════
// Seguridad
// ═══════════════════════════════════════════════════════

function escapeHtml(text) {

  if (!text) return "";

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// ═══════════════════════════════════════════════════════
// Start
// ═══════════════════════════════════════════════════════

initializeRoomsPage();
