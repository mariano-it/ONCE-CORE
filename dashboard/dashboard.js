// ONCE CORE — Dashboard Controller
// Bridgerton Edition

// ════════════════════════════════════════════════
// Protección de sesión REAL (Supabase)
// ════════════════════════════════════════════════

let CURRENT_USER = null;
let CURRENT_PROFILE = null;

async function requireAuth() {

  const session = await sbGetSession();

  if (!session) {
    window.location.href = "../login/login.html";
    return;
  }

  const user = await sbGetUser();

  if (!user) {
    window.location.href = "../login/login.html";
    return;
  }

  CURRENT_USER = user;

  // Obtener profile desde Supabase
  try {
    CURRENT_PROFILE = await sbGetProfile(user.id);
  } catch {
    CURRENT_PROFILE = null;
  }

}

await requireAuth();

document.addEventListener("DOMContentLoaded", () => {

  // =========================
  // Obtener datos
  // =========================
const profile = CURRENT_PROFILE;
const user    = CURRENT_USER;

  // =========================
  // Sidebar
  // =========================
  const avatarEl  = document.getElementById("sidebarAvatar");
  const nameEl    = document.getElementById("sidebarName");
  const campusEl  = document.getElementById("sidebarCampus");
  const topAvatar = document.getElementById("topbarAvatar");

  if (avatarEl)  avatarEl.src  = profile?.avatar  || "https://via.placeholder.com/80";
  if (topAvatar) topAvatar.src = profile?.avatar  || "https://via.placeholder.com/38";
  // Nombre completo con apellido de familia
  const fullName = (typeof getFullName === "function")
    ? getFullName(profile?.name || user?.email || "Invitada", profile?.family)
    : profile?.name || user?.email || "Invitada";

  if (nameEl)   nameEl.textContent = fullName;

  // Familia en lugar de campus si tiene familia asignada
  const familyData = (typeof getFamilyById === "function") ? getFamilyById(profile?.family) : null;
  if (campusEl) {
    if (familyData) {
      campusEl.innerHTML = familyData.emoji + ' Casa ' + familyData.surname +
        '<br><span style="font-size:11px; opacity:.6">' + (profile?.campus || "") + '</span>';
    } else {
      campusEl.textContent = profile?.campus || "Campus no definido";
    }
  }

  // =========================
  // Modal de perfil
  // =========================
  const profileBtn = document.getElementById("profileBtn");
  const modal      = document.getElementById("profileModal");
  const closeBtn   = document.getElementById("closeProfileBtn");

  if (profileBtn && modal && closeBtn) {
    profileBtn.addEventListener("click", () => {
      // Avatar
      document.getElementById("profileAvatar").src = profile?.avatar || "https://via.placeholder.com/100";

      // Nombre completo con apellido de familia
      const modalFullName = (typeof getFullName === "function")
        ? getFullName(profile?.name || "Invitada", profile?.family)
        : profile?.name || "Invitada";
      document.getElementById("profileName").textContent = modalFullName;

      // Campus + badge de familia
      const campusMod = document.getElementById("profileCampus");
      const modalFamily = (typeof getFamilyById === "function") ? getFamilyById(profile?.family) : null;
      if (campusMod) {
        if (modalFamily) {
          campusMod.innerHTML =
            '<span class="family-badge-modal" style="background:' + modalFamily.badge +
            '; color:' + modalFamily.badgeText + '">' +
            modalFamily.emoji + ' Casa ' + modalFamily.surname + '</span>' +
            (profile?.campus ? '<span class="modal-campus-text">' + profile.campus + '</span>' : '');
        } else {
          campusMod.textContent = profile?.campus || "Campus no definido";
        }
      }

      document.getElementById("profileEmail").textContent  = user?.email     || "Sin email";
      document.getElementById("profileStatus").textContent = profile?.status || "Online";
      modal.style.display = "flex";
    });

    closeBtn.addEventListener("click", () => modal.style.display = "none");
    window.addEventListener("click", e => { if (e.target === modal) modal.style.display = "none"; });
  }

  // =========================
  // Sistema de estados
  // =========================
  const statusDot  = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");

  function setStatus(state) {
    if (!statusDot || !statusText) return;
    statusDot.className = "status-dot";

    const map = {
      online:  { cls: "online",  label: "Online"   },
      focus:   { cls: "focus",   label: "Enfocada"  },
      away:    { cls: "away",    label: "Ausente"   },
    };
    const s = map[state] || { cls: "offline", label: "Offline" };
    statusDot.classList.add(s.cls);
    statusText.textContent = s.label;
    localStorage.setItem("userStatus", state);

    // también actualizar topbar
    const focusEl = document.getElementById("focusStatus");
    if (focusEl) focusEl.textContent = "● " + s.label;
    const currentEl = document.getElementById("currentStatus");
    if (currentEl) currentEl.textContent = s.label;
  }

  setStatus(localStorage.getItem("userStatus") || "online");

  let inactivityTimer;
  function resetInactivity() {
    setStatus("online");
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => setStatus("away"), 60000);
  }
  document.addEventListener("mousemove", resetInactivity);
  document.addEventListener("keydown",   resetInactivity);
  resetInactivity();

  // =========================
  // Bienvenida dinámica
  // =========================
  function updateWelcome() {
    const el = document.getElementById("welcomeText");
    if (!el) return;
    const hour = new Date().getHours();
    let greeting = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";
    el.textContent = greeting + (profile?.name ? ", " + profile.name : "");
  }
  updateWelcome();

  // =========================
  // Reloj en vivo
  // =========================
  function updateClock() {
    const el = document.getElementById("liveClock");
    if (!el) return;
    const now = new Date();
    el.textContent =
      now.getHours().toString().padStart(2,"0") + ":" +
      now.getMinutes().toString().padStart(2,"0");
  }
  setInterval(updateClock, 1000);
  updateClock();

  // =========================
  // Última actividad
  // =========================
  function updateLastActivity() {
    const el   = document.getElementById("lastActivity");
    const last = localStorage.getItem("lastActivity");
    if (!el) return;
    if (!last) { el.textContent = "Ahora mismo"; return; }
    const diff = Math.floor((Date.now() - last) / 60000);
    el.textContent = diff < 1 ? "Ahora mismo"
                   : diff < 60 ? "Hace " + diff + " min"
                   : "Hace " + Math.floor(diff/60) + " h";
  }
  updateLastActivity();
  localStorage.setItem("lastActivity", Date.now());

  // =========================
  // Sesión
  // =========================
  const sessionEl = document.getElementById("sessionTime");
  if (sessionEl) {
    const start = new Date();
    function updateSession() {
      const diff = Math.floor((Date.now() - start) / 60000);
      sessionEl.textContent = diff < 1 ? "Ahora" : diff + " min";
    }
    setInterval(updateSession, 30000);
    updateSession();
  }

  // =========================
  // Navegación del sidebar
  // =========================
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
  }

);

// =========================
// CALENDARIO DE CLASES
// =========================
(function renderCalendar() {

  const container = document.getElementById("calendarToday");
  if (!container) return;

  const schedule = JSON.parse(localStorage.getItem("schedule")) || [];

  // Día actual en español
  const DAYS_MAP = { 0: "Dom", 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb" };
  const todayKey = DAYS_MAP[new Date().getDay()];

  // Filtrar clases de hoy
  const todayClasses = schedule
    .filter(s => s.days.includes(todayKey))
    .sort((a, b) => a.start.localeCompare(b.start));

  if (todayClasses.length === 0) {
    container.innerHTML = `
      <div class="no-classes">
        <span>✦</span>
        No tienes clases programadas para hoy.
        <a href="settings.html" style="color:var(--gold); text-decoration:none; font-style:normal; margin-left:4px;">Agregar horario →</a>
      </div>
    `;
    return;
  }

  // Helper: "08:30" → minutos desde medianoche
  function toMins(timeStr) {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  }

  function buildClassCard(subject) {
    const now       = new Date();
    const nowMins   = now.getHours() * 60 + now.getMinutes();
    const startMins = toMins(subject.start);
    const endMins   = toMins(subject.end);
    const duration  = endMins - startMins;

    const isActive = nowMins >= startMins && nowMins < endMins;
    const isPast   = nowMins >= endMins;
    const progress = isActive
      ? Math.min(100, Math.round(((nowMins - startMins) / duration) * 100))
      : isPast ? 100 : 0;

    let cardClass = "class-card";
    if (isActive) cardClass += " is-active";
    if (isPast)   cardClass += " is-past";

    const progressBar = isActive ? `
      <div class="class-time-progress">
        <div class="class-time-progress-bar"
             id="progress-${subject.id}"
             style="width:${progress}%; background:${subject.color}">
        </div>
      </div>
    ` : "";

    return `
      <div class="${cardClass}">
        <div class="class-color-bar" style="background:${subject.color}"></div>
        <div class="class-name">${subject.name}</div>
        <div class="class-time">
          🕐 ${subject.start} – ${subject.end}
          ${progressBar}
        </div>
      </div>
    `;
  }

  // Render con timeline visual
  let html = "";
  todayClasses.forEach((subject, i) => {
    const isLast = i === todayClasses.length - 1;
    html += `
      <div class="class-timeline">
        <div class="class-timeline-connector">
          <div class="timeline-dot ${subject.status === 'active' ? 'active' : ''}"></div>
          ${!isLast ? '<div class="timeline-line"></div>' : ''}
        </div>
        ${buildClassCard(subject)}
      </div>
    `;
  });

  container.innerHTML = html;

  // Actualizar barras de progreso cada minuto
  setInterval(() => {
    const now     = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();

    todayClasses.forEach(subject => {
      const bar       = document.getElementById("progress-" + subject.id);
      const startMins = toMins(subject.start);
      const endMins   = toMins(subject.end);
      const duration  = endMins - startMins;
      const isActive  = nowMins >= startMins && nowMins < endMins;

      if (bar && isActive) {
        const p = Math.min(100, Math.round(((nowMins - startMins) / duration) * 100));
        bar.style.width = p + "%";
      }
    });
  }, 60000);

})();

// ════════════════════════════════════════════════
// LADY WHISTLEDOWN — Sistema de publicación secreta
// ════════════════════════════════════════════════

(function initWhistledown() {

  // ── Storage keys ──────────────────────────────
  const KEY_CREDS   = "wd_creds";   // { name, pin } — hasheados
  const KEY_POST    = "wd_post";    // { type, title, body, firma, date }

  // ── Helpers hash simple (no criptográfico, suficiente para este uso) ──
  function simpleHash(str) {
    let h = 0x9e3779b9;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 0x85ebca6b);
      h ^= h >>> 13;
    }
    return (h >>> 0).toString(16).padStart(8, "0");
  }

  function getCreds()  { return JSON.parse(localStorage.getItem(KEY_CREDS) || "null"); }
  function getPost()   { return JSON.parse(localStorage.getItem(KEY_POST)  || "null"); }
  function savePost(p) { localStorage.setItem(KEY_POST, JSON.stringify(p)); }

  // ── Render card (vista pública) ───────────────
  function renderCard() {
    const post    = getPost();
    const content = document.getElementById("wdContent");
    const dateEl  = document.getElementById("wdDate");
    if (!content) return;

    if (!post) {
      content.innerHTML = `<p class="wd-placeholder">Querida Sociedad...<br><em>La columna de esta semana aún no ha sido publicada. La ansiedad de la temporada es palpable.</em></p>`;
      if (dateEl) dateEl.textContent = "—";
      return;
    }

    const TYPE_LABELS = {
      carta:   "📜 Carta semanal",
      anuncio: "📣 Anuncio oficial",
      nota:    "🗒 Nota social",
      chisme:  "🤫 Exclusiva de temporada",
    };

    const d = new Date(post.date);
    const dateStr = d.toLocaleDateString("es", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

    content.innerHTML = `
      <div class="wd-post">
        <span class="wd-post-type-badge">${TYPE_LABELS[post.type] || "📜 Publicación"}</span>
        <div class="wd-post-title">${post.title || ""}</div>
        <div class="wd-post-body">${escapeHtml(post.body)}</div>
        ${post.firma ? `<div class="wd-post-firma">${post.firma}</div>` : ""}
      </div>`;

    if (dateEl) dateEl.textContent = dateStr;
  }

  function escapeHtml(str) {
    return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  // ── Abrir modal ───────────────────────────────
  const modal       = document.getElementById("wdModal");
  const authPhase   = document.getElementById("wdAuthPhase");
  const editorPhase = document.getElementById("wdEditorPhase");

  document.getElementById("wdEditBtn")?.addEventListener("click", () => {
    modal.classList.add("show");
    modal.style.display = "flex";
    showAuthPhase();
  });

  // Cerrar
  document.getElementById("wdCloseBtn")?.addEventListener("click",       closeModal);
  document.getElementById("wdCloseEditorBtn")?.addEventListener("click", closeModal);
  modal?.addEventListener("click", e => { if (e.target === modal) closeModal(); });

  function closeModal() {
    modal.classList.remove("show");
    modal.style.display = "none";
    clearAuthForm();
  }

  // ── Fase auth ─────────────────────────────────
  function showAuthPhase() {
    authPhase.classList.remove("hidden");
    editorPhase.classList.add("hidden");
    clearAuthForm();

    // Si es primera vez, mostrar nota
    const hasCreds = !!getCreds();
    const note = document.getElementById("wdFirstTimeNote");
    if (note) note.classList.toggle("hidden", hasCreds);

    // Auto-focus primer dígito
    setTimeout(() => document.getElementById("wdSecretName")?.focus(), 100);
  }

  function clearAuthForm() {
    document.getElementById("wdSecretName").value = "";
    document.querySelectorAll(".wd-pin-digit").forEach(d => {
      d.value = "";
      d.classList.remove("filled");
    });
    hideAuthError();
  }

  // PIN digits — auto-avance
  document.querySelectorAll(".wd-pin-digit").forEach((digit, i, all) => {
    digit.addEventListener("input", () => {
      digit.value = digit.value.replace(/\D/g,"").slice(-1);
      digit.classList.toggle("filled", digit.value !== "");
      if (digit.value && i < all.length - 1) all[i+1].focus();
    });
    digit.addEventListener("keydown", e => {
      if (e.key === "Backspace" && !digit.value && i > 0) all[i-1].focus();
      if (e.key === "Enter") document.getElementById("wdAuthBtn")?.click();
    });
    digit.addEventListener("paste", e => {
      e.preventDefault();
      const pasted = (e.clipboardData.getData("text")).replace(/\D/g,"").slice(0,6);
      all.forEach((d, idx) => {
        d.value = pasted[idx] || "";
        d.classList.toggle("filled", !!d.value);
      });
      const next = all[Math.min(pasted.length, 5)];
      next?.focus();
    });
  });

  function getPin() {
    return Array.from(document.querySelectorAll(".wd-pin-digit"))
      .map(d => d.value).join("");
  }

  function showAuthError(msg) {
    const el = document.getElementById("wdAuthError");
    if (el) { el.textContent = msg; el.classList.remove("hidden"); }
  }
  function hideAuthError() {
    document.getElementById("wdAuthError")?.classList.add("hidden");
  }

  document.getElementById("wdAuthBtn")?.addEventListener("click", () => {
    const nameVal = document.getElementById("wdSecretName").value.trim();
    const pinVal  = getPin();

    if (!nameVal)         { showAuthError("Escribe tu nombre secreto"); return; }
    if (pinVal.length < 4) { showAuthError("El PIN debe tener al menos 4 dígitos"); return; }

    const creds = getCreds();

    if (!creds) {
      // Primera vez — guardar credenciales hasheadas
      localStorage.setItem(KEY_CREDS, JSON.stringify({
        nameHash: simpleHash(nameVal.toLowerCase()),
        pinHash:  simpleHash(pinVal),
      }));
      openEditor();
    } else {
      // Verificar
      if (simpleHash(nameVal.toLowerCase()) === creds.nameHash &&
          simpleHash(pinVal) === creds.pinHash) {
        openEditor();
      } else {
        // Shake en PIN
        const row = document.getElementById("wdPinRow");
        row?.classList.add("shake");
        setTimeout(() => row?.classList.remove("shake"), 500);
        showAuthError("Credenciales incorrectas. La Sociedad está observando.");
        // Limpiar PIN
        document.querySelectorAll(".wd-pin-digit").forEach(d => {
          d.value = ""; d.classList.remove("filled");
        });
        document.querySelectorAll(".wd-pin-digit")[0]?.focus();
      }
    }
  });

  // ── Fase editor ───────────────────────────────
  let selectedType = "carta";

  function openEditor() {
    authPhase.classList.add("hidden");
    editorPhase.classList.remove("hidden");

    // Cargar post existente
    const post = getPost();
    if (post) {
      document.getElementById("wdEditorTitle").value = post.title || "";
      document.getElementById("wdEditorBody").value  = post.body  || "";
      document.getElementById("wdEditorFirma").value = post.firma || "";
      selectedType = post.type || "carta";
    } else {
      document.getElementById("wdEditorTitle").value = "";
      document.getElementById("wdEditorBody").value  = "";
      document.getElementById("wdEditorFirma").value = "Con afecto, Lady Whistledown";
      selectedType = "carta";
    }

    // Marcar tipo activo
    document.querySelectorAll(".wd-type-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.type === selectedType);
    });

    setTimeout(() => document.getElementById("wdEditorTitle")?.focus(), 100);
  }

  // Type buttons
  document.querySelectorAll(".wd-type-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".wd-type-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedType = btn.dataset.type;
    });
  });

  // Publicar
  document.getElementById("wdPublishEditorBtn")?.addEventListener("click", () => {
    const title = document.getElementById("wdEditorTitle").value.trim();
    const body  = document.getElementById("wdEditorBody").value.trim();
    const firma = document.getElementById("wdEditorFirma").value.trim();

    if (!body) {
      document.getElementById("wdEditorBody").focus();
      document.getElementById("wdEditorBody").style.borderColor = "#b91c1c";
      setTimeout(() => document.getElementById("wdEditorBody").style.borderColor = "", 1500);
      return;
    }

    savePost({ type: selectedType, title, body, firma, date: Date.now() });
    renderCard();
    closeModal();

    // Toast de publicación
    showWdToast("✦ Lady Whistledown ha publicado");
  });

  // Borrar publicación
  document.getElementById("wdDeleteBtn")?.addEventListener("click", () => {
    if (!confirm("¿Borrar esta publicación? La Sociedad no verá nada.")) return;
    localStorage.removeItem(KEY_POST);
    renderCard();
    closeModal();
  });

  // Cambiar credenciales
  document.getElementById("wdChangeCreds")?.addEventListener("click", () => {
    if (!confirm("¿Cambiar PIN y nombre secreto? Tendrás que recordar los nuevos.")) return;
    localStorage.removeItem(KEY_CREDS);
    editorPhase.classList.add("hidden");
    authPhase.classList.remove("hidden");
    clearAuthForm();
    const note = document.getElementById("wdFirstTimeNote");
    if (note) note.classList.remove("hidden");
  });

  // ── Toast Whistledown ─────────────────────────
  function showWdToast(msg) {
    // Reusar el toast del dashboard si existe
    const existing = document.getElementById("toast");
    if (existing) {
      existing.textContent = msg;
      existing.classList.remove("hidden");
      clearTimeout(existing._wd);
      existing._wd = setTimeout(() => existing.classList.add("hidden"), 3000);
      return;
    }
    // Crear propio si no existe
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    el.style.cssText = `position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:var(--navy);color:var(--gold-light);font-family:var(--font-display);font-size:13px;letter-spacing:.07em;padding:10px 24px;border-radius:24px;border:1px solid rgba(201,168,76,0.3);box-shadow:0 8px 28px rgba(0,0,0,0.25);z-index:600`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // ── Init render ───────────────────────────────
  renderCard();

})();
