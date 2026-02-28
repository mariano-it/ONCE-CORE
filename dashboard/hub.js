// ONCE CORE — Hub Controller

if (localStorage.getItem("session") !== "active") {
  window.location.href = "../login/login.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const profile = JSON.parse(localStorage.getItem("profile")) || {};
  const user    = JSON.parse(localStorage.getItem("user"))    || {};

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

  // Custom links
  renderCustomLinks();

  // Modal agregar enlace
  const modal   = document.getElementById("addLinkModal");
  const addBtn  = document.getElementById("addLinkBtn");
  const closeBtn= document.getElementById("closeAddLink");
  const saveBtn = document.getElementById("saveLinkBtn");

  addBtn?.addEventListener("click",  () => { modal.style.display = "flex"; });
  closeBtn?.addEventListener("click",() => { modal.style.display = "none"; });
  modal?.addEventListener("click",   e => { if (e.target === modal) modal.style.display = "none"; });

  saveBtn?.addEventListener("click", () => {
    const name  = document.getElementById("linkName")?.value.trim();
    const url   = document.getElementById("linkUrl")?.value.trim();
    const emoji = document.getElementById("linkEmoji")?.value.trim() || "🔗";
    if (!name || !url) { showToast("Completa nombre y URL"); return; }
    const links = getCustomLinks();
    links.push({ id: Date.now().toString(36), name, url, emoji });
    saveCustomLinks(links);
    renderCustomLinks();
    modal.style.display = "none";
    document.getElementById("linkName").value  = "";
    document.getElementById("linkUrl").value   = "";
    document.getElementById("linkEmoji").value = "";
    showToast("✦ Enlace guardado");
  });
});

// ─── CUSTOM LINKS ─────────────────────────────────
function getCustomLinks()  { return JSON.parse(localStorage.getItem("onceCustomLinks") || "[]"); }
function saveCustomLinks(a){ localStorage.setItem("onceCustomLinks", JSON.stringify(a)); }

function renderCustomLinks() {
  const container = document.getElementById("customLinks");
  if (!container) return;
  const links = getCustomLinks();

  if (links.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1;font-family:var(--font-body);font-style:italic;color:var(--text-muted);font-size:13px;padding:4px 0;opacity:.7">
        Agrega tus propios accesos rápidos — tutorías, grupos, links de clase...
      </div>`;
    return;
  }

  container.innerHTML = links.map(l => `
    <a class="hub-card mini custom" href="${l.url}" target="_blank" rel="noopener">
      <button class="custom-delete-btn" data-id="${l.id}" title="Eliminar" onclick="event.preventDefault();deleteCustomLink('${l.id}')">✕</button>
      <div class="hc-mini-icon" style="background:linear-gradient(135deg,var(--navy),var(--navy-mid))">${l.emoji}</div>
      <div class="hc-mini-name">${l.name}</div>
      <div class="hc-mini-desc">${new URL(l.url).hostname}</div>
    </a>
  `).join("");
}

function deleteCustomLink(id) {
  const links = getCustomLinks().filter(l => l.id !== id);
  saveCustomLinks(links);
  renderCustomLinks();
}

function showToast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add("hidden"), 2600);
}