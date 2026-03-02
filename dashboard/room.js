// ═══════════════════════════════════════════════════════
// ONCE CORE — Room Controller (Supabase Realtime Edition)
// Presencia real • Multiusuario • Persistente
// ═══════════════════════════════════════════════════════


// =========================
// Estado global
// =========================

let user = null;
let profile = null;
let roomId = null;
let room = null;

const roomNameEl = document.getElementById("roomName");


// =========================
// Inicialización
// =========================

async function initializeRoomPage() {

  user = await sbGetUser();

  if (!user) {
    window.location.href = "../login/login.html";
    return;
  }

  profile = await sbGetProfile(user.id);

  roomId = localStorage.getItem("currentRoomId");

  if (!roomId) {
    window.location.href = "rooms.html";
    return;
  }

  await loadRoom();

  await joinRoomPresence();

  subscribeRealtime();

  startSessionTimer();

}


// =========================
// Cargar sala desde Supabase
// =========================

async function loadRoom() {

  const { data, error } = await _supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  room = data;

  if (roomNameEl) {
    roomNameEl.textContent = room.name;
  }

  renderUsers();

}


// =========================
// Unirse a la sala (presencia)
// =========================

async function joinRoomPresence() {

  const memberObj = {

    id: user.id,

    name: profile?.name || user.email,

    avatar: profile?.avatar || "",

    campus: profile?.campus || "",

    family: profile?.family || "",

    status: "Inactiva",

    startTime: null

  };

  await sbJoinRoom(roomId, memberObj);

}


// =========================
// Salir de sala al cerrar
// =========================

window.addEventListener("beforeunload", async () => {

  if (user && roomId) {
    await sbLeaveRoom(roomId, user.id);
  }

});


// =========================
// Render usuarios
// =========================

function renderUsers() {

  const usersList = document.getElementById("usersList");

  if (!usersList || !room) return;

  usersList.innerHTML = "";

  const members = room.members || [];

  members.forEach((member, i) => {

    const isYou = member.id === user.id;

    const isFocus = member.status === "En enfoque";

    const isBreak = member.status === "Descanso";

    let focusMin = 0;

    if (isFocus && member.startTime) {

      focusMin = Math.floor(
        (Date.now() - member.startTime) / 60000
      );

    }

    const card = document.createElement("div");

    card.className =
      "user-card" + (isYou ? " is-you" : "");

    card.style.animationDelay =
      (i * 0.05) + "s";

    card.innerHTML = `

      <div class="user-avatar-wrap">

        <img class="user-avatar"
          src="${member.avatar || "https://via.placeholder.com/46"}">

      </div>

      <div class="user-info">

        <div class="user-name">

          ${escapeHtml(member.name)}

          ${isYou ? '<span class="you-tag">TÚ</span>' : ''}

        </div>

        <div class="user-status-text">

          ${member.status || "Inactiva"}

        </div>

        ${
          isFocus
            ? `<div class="user-focus-time">
                ${focusMin} min concentrada
               </div>`
            : ""
        }

      </div>

    `;

    usersList.appendChild(card);

  });

}


// =========================
// Cambiar estado
// =========================

async function updateMyStatus(newStatus) {

  const members = room.members || [];

  const updatedMembers = members.map(m => {

    if (m.id === user.id) {

      return {

        ...m,

        status: newStatus,

        startTime:
          newStatus === "En enfoque"
            ? Date.now()
            : null

      };

    }

    return m;

  });

  await _supabase
    .from("rooms")
    .update({ members: updatedMembers })
    .eq("id", roomId);

}


// =========================
// Botones
// =========================

document.getElementById("focusBtn")
?.addEventListener("click", () => {

  updateMyStatus("En enfoque");

});

document.getElementById("breakBtn")
?.addEventListener("click", () => {

  updateMyStatus("Descanso");

});

document.getElementById("backBtn")
?.addEventListener("click", () => {

  window.location.href = "rooms.html";

});


// =========================
// Realtime listener
// =========================

function subscribeRealtime() {

  _supabase
    .channel("room-" + roomId)

    .on(
      "postgres_changes",

      {
        event: "*",
        schema: "public",
        table: "rooms",
        filter: "id=eq." + roomId
      },

      payload => {

        room = payload.new;

        renderUsers();

      }

    )

    .subscribe();

}


// =========================
// Timer sesión
// =========================

function startSessionTimer() {

  const el =
    document.getElementById("sessionTimer");

  if (!el) return;

  const start = Date.now();

  setInterval(() => {

    const min = Math.floor(
      (Date.now() - start) / 60000
    );

    el.textContent = min + " min";

  }, 10000);

}


// =========================
// Seguridad
// =========================

function escapeHtml(text) {

  if (!text) return "";

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

}


// =========================
// Start
// =========================

initializeRoomPage();
