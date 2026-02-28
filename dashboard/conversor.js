// ONCE CORE — Convertidor de Archivos
// 100% client-side: jsPDF + PDF.js + Canvas API

if (localStorage.getItem("session") !== "active") {
  window.location.href = "../login/login.html";
}

// ─── CONFIGURACIÓN DE PDF.js ───────────────────────
if (typeof pdfjsLib !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

// ─── ESTADO ────────────────────────────────────────
let currentMode  = "img-pdf";
let selectedFiles = [];

const MODES = {
  "img-pdf": {
    icon: "🖼️",
    desc: "Convierte una o varias imágenes (JPG, PNG, WEBP) en un único archivo PDF",
    accept: "image/jpeg,image/png,image/webp,image/gif",
    multiple: true,
    dzTitle: "Arrastra tus imágenes aquí",
    dzSub: "JPG · PNG · WEBP · GIF",
  },
  "pdf-img": {
    icon: "📄",
    desc: "Extrae cada página de un PDF como imagen PNG de alta calidad",
    accept: "application/pdf",
    multiple: false,
    dzTitle: "Arrastra tu PDF aquí",
    dzSub: "Solo archivos .pdf",
  },
  "img-img": {
    icon: "🔄",
    desc: "Convierte imágenes entre formatos: JPG ↔ PNG ↔ WEBP",
    accept: "image/jpeg,image/png,image/webp",
    multiple: true,
    dzTitle: "Arrastra tus imágenes aquí",
    dzSub: "JPG · PNG · WEBP",
  },
  "pdf-txt": {
    icon: "📝",
    desc: "Extrae todo el texto de un PDF como archivo .txt",
    accept: "application/pdf",
    multiple: false,
    dzTitle: "Arrastra tu PDF aquí",
    dzSub: "Solo archivos .pdf",
  },
  "img-compress": {
    icon: "🗜️",
    desc: "Reduce el tamaño de tus imágenes manteniendo la mayor calidad posible",
    accept: "image/jpeg,image/png,image/webp",
    multiple: true,
    dzTitle: "Arrastra tus imágenes aquí",
    dzSub: "JPG · PNG · WEBP",
  },
  "img-raw": {
    icon: "📷",
    desc: "Convierte imágenes JPG/PNG a formato RAW simulado (.tiff de alta calidad sin compresión) para edición profesional",
    accept: "image/jpeg,image/png,image/webp",
    multiple: true,
    dzTitle: "Arrastra tus imágenes aquí",
    dzSub: "JPG · PNG · WEBP → RAW (TIFF)",
  },
};

// ─── INIT ──────────────────────────────────────────
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

  // Modos
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentMode = btn.dataset.mode;
      selectedFiles = [];
      resetUI();
      applyMode();
    });
  });

  // Drop zone
  const dz    = document.getElementById("dropZone");
  const input = document.getElementById("fileInput");

  dz.addEventListener("click",      () => input.click());
  document.getElementById("dzBtn").addEventListener("click", e => { e.stopPropagation(); input.click(); });

  dz.addEventListener("dragover",  e => { e.preventDefault(); dz.classList.add("drag-over"); });
  dz.addEventListener("dragleave", () => dz.classList.remove("drag-over"));
  dz.addEventListener("drop",      e => {
    e.preventDefault();
    dz.classList.remove("drag-over");
    handleFiles([...e.dataTransfer.files]);
  });
  input.addEventListener("change", () => handleFiles([...input.files]));

  // Convertir
  document.getElementById("convertBtn")?.addEventListener("click", runConversion);

  // Reset
  document.getElementById("resetBtn")?.addEventListener("click", () => {
    selectedFiles = [];
    resetUI();
    applyMode();
  });

  // Init
  applyMode();
});

// ─── APLICAR MODO ──────────────────────────────────
function applyMode() {
  const m = MODES[currentMode];
  document.getElementById("modeDesc").textContent     = m.desc;
  document.getElementById("dzTitle").textContent      = m.dzTitle;
  document.getElementById("dzSub").textContent        = m.dzSub;
  document.getElementById("dzIcon").textContent       = m.icon;
  document.getElementById("fileInput").accept         = m.accept;
  document.getElementById("fileInput").multiple       = m.multiple;
  renderOptions();
}

// ─── MANEJAR ARCHIVOS ──────────────────────────────
function handleFiles(files) {
  const m = MODES[currentMode];
  if (!m.multiple) files = [files[0]];

  // Filtro básico por tipo
  const valid = files.filter(f => {
    if (currentMode.startsWith("img")) return f.type.startsWith("image/");
    if (currentMode.startsWith("pdf")) return f.type === "application/pdf";
    return true;
  });

  if (valid.length === 0) { showToast("Formato no compatible para este modo"); return; }
  if (!m.multiple) {
    selectedFiles = [valid[0]];
  } else {
    selectedFiles = [...selectedFiles, ...valid].slice(0, 20); // máx 20
  }
  renderFileList();
  renderOptions();
  document.getElementById("convertRow").classList.remove("hidden");
}

// ─── RENDER FILE LIST ──────────────────────────────
function renderFileList() {
  const el = document.getElementById("fileList");
  if (selectedFiles.length === 0) { el.classList.add("hidden"); return; }
  el.classList.remove("hidden");

  const iconMap = { "image/jpeg":"🖼️", "image/png":"🖼️", "image/webp":"🖼️", "application/pdf":"📄" };

  el.innerHTML = selectedFiles.map((f, i) => `
    <div class="file-item">
      <span class="file-item-icon">${iconMap[f.type] || "📁"}</span>
      <div class="file-item-info">
        <div class="file-item-name">${f.name}</div>
        <div class="file-item-size">${formatSize(f.size)}</div>
      </div>
      <button class="file-remove-btn" onclick="removeFile(${i})">✕</button>
    </div>
  `).join("");
}

function removeFile(i) {
  selectedFiles.splice(i, 1);
  renderFileList();
  if (selectedFiles.length === 0) document.getElementById("convertRow").classList.add("hidden");
}

// ─── OPCIONES POR MODO ─────────────────────────────
function renderOptions() {
  const el = document.getElementById("convOptions");
  el.innerHTML = "";
  el.classList.remove("hidden");

  if (currentMode === "img-pdf") {
    el.innerHTML = `
      <div class="opt-group">
        <span class="opt-label">Tamaño página</span>
        <select id="pdfSize" class="opt-select">
          <option value="a4">A4</option>
          <option value="letter">Letter</option>
          <option value="fit">Ajustar a imagen</option>
        </select>
        <select id="pdfOrient" class="opt-select">
          <option value="portrait">Vertical</option>
          <option value="landscape">Horizontal</option>
        </select>
      </div>`;
  } else if (currentMode === "img-img") {
    el.innerHTML = `
      <div class="opt-group">
        <span class="opt-label">Formato destino</span>
        <select id="imgFormat" class="opt-select">
          <option value="image/jpeg">JPG</option>
          <option value="image/png">PNG</option>
          <option value="image/webp">WEBP</option>
        </select>
      </div>`;
  } else if (currentMode === "img-compress") {
    el.innerHTML = `
      <div class="opt-group">
        <span class="opt-label">Calidad</span>
        <input type="range" id="compressQ" class="opt-range" min="20" max="95" value="75" oninput="document.getElementById('compressVal').textContent=this.value+'%'">
        <span class="opt-range-val" id="compressVal">75%</span>
      </div>`;
  } else if (currentMode === "pdf-img") {
    el.innerHTML = `
      <div class="opt-group">
        <span class="opt-label">Resolución</span>
        <select id="pdfImgScale" class="opt-select">
          <option value="1.5">Normal (96 dpi)</option>
          <option value="2" selected>Alta (144 dpi)</option>
          <option value="3">Máxima (216 dpi)</option>
        </select>
      </div>`;
  } else {
    el.classList.add("hidden");
  }
}

// ─── CONVERSIÓN PRINCIPAL ──────────────────────────
async function runConversion() {
  if (selectedFiles.length === 0) { showToast("Selecciona archivos primero"); return; }

  setProgress(0, "Iniciando...");
  document.getElementById("progressWrap").classList.remove("hidden");
  document.getElementById("convertRow").classList.add("hidden");
  document.getElementById("resultsWrap").classList.add("hidden");

  try {
    let results = [];
    if      (currentMode === "img-pdf")      results = await convertImgToPdf();
    else if (currentMode === "pdf-img")      results = await convertPdfToImg();
    else if (currentMode === "img-img")      results = await convertImgToImg();
    else if (currentMode === "pdf-txt")      results = await convertPdfToTxt();
    else if (currentMode === "img-compress") results = await compressImages();
    else if (currentMode === "img-raw")      results = await convertToRaw();

    setProgress(100, "¡Listo!");
    setTimeout(() => showResults(results), 300);
  } catch(err) {
    console.error(err);
    showToast("Error al convertir: " + err.message);
    document.getElementById("progressWrap").classList.add("hidden");
    document.getElementById("convertRow").classList.remove("hidden");
  }
}

// ─── IMG → PDF ─────────────────────────────────────
async function convertImgToPdf() {
  const { jsPDF } = window.jspdf;
  const size   = document.getElementById("pdfSize")?.value   || "a4";
  const orient = document.getElementById("pdfOrient")?.value || "portrait";

  const pdf = new jsPDF({ orientation: orient, unit: "mm", format: size === "fit" ? "a4" : size });
  let first = true;

  for (let i = 0; i < selectedFiles.length; i++) {
    setProgress(Math.round((i / selectedFiles.length) * 90), `Procesando imagen ${i+1}/${selectedFiles.length}...`);

    const dataUrl = await fileToDataUrl(selectedFiles[i]);
    const img     = await loadImage(dataUrl);

    let pw, ph;
    if (size === "fit") {
      const scale = 210 / img.width * (orient === "portrait" ? 1 : 297 / 210);
      pw = img.width  * (0.264583) * (210 / img.width);
      ph = img.height * (0.264583) * (210 / img.width);
      pw = 210; ph = img.height * (210 / img.width) * 0.264583 * (1 / 0.264583);
      // simplify
      pw = 210;
      ph = img.height / img.width * 210;
    } else {
      pw = orient === "portrait" ? 210 : 297;
      ph = orient === "portrait" ? 297 : 210;
    }

    if (!first) pdf.addPage(size === "fit" ? [pw, ph] : size, orient);
    first = false;

    const imgW = orient === "portrait" ? pw : ph;
    const imgH = orient === "portrait" ? ph : pw;
    const ratio = Math.min(imgW / img.width, imgH / img.height);
    const drawW = img.width  * ratio;
    const drawH = img.height * ratio;
    const offX  = (imgW - drawW) / 2;
    const offY  = (imgH - drawH) / 2;

    const fmt = selectedFiles[i].type === "image/png" ? "PNG" : "JPEG";
    pdf.addImage(dataUrl, fmt, offX, offY, drawW, drawH);
  }

  const blob = pdf.output("blob");
  return [{ name: "once_core_documento.pdf", blob, type: "application/pdf", icon: "📄" }];
}

// ─── PDF → IMG ─────────────────────────────────────
async function convertPdfToImg() {
  if (typeof pdfjsLib === "undefined") throw new Error("PDF.js no cargado");
  const scale  = parseFloat(document.getElementById("pdfImgScale")?.value || "2");
  const file   = selectedFiles[0];
  const buf    = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
  const total  = pdfDoc.numPages;
  const results = [];
  const baseName = file.name.replace(/\.pdf$/i, "");

  for (let p = 1; p <= total; p++) {
    setProgress(Math.round(((p-1) / total) * 90), `Renderizando página ${p}/${total}...`);
    const page     = await pdfDoc.getPage(p);
    const viewport = page.getViewport({ scale });
    const canvas   = document.createElement("canvas");
    canvas.width   = viewport.width;
    canvas.height  = viewport.height;
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await canvasToBlob(canvas, "image/png");
    results.push({ name: `${baseName}_pagina_${p}.png`, blob, type: "image/png", icon: "🖼️" });
  }
  return results;
}

// ─── IMG → IMG ─────────────────────────────────────
async function convertImgToImg() {
  const fmt  = document.getElementById("imgFormat")?.value || "image/jpeg";
  const ext  = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[fmt];
  const results = [];

  for (let i = 0; i < selectedFiles.length; i++) {
    setProgress(Math.round((i / selectedFiles.length) * 90), `Convirtiendo ${i+1}/${selectedFiles.length}...`);
    const dataUrl = await fileToDataUrl(selectedFiles[i]);
    const img     = await loadImage(dataUrl);
    const canvas  = document.createElement("canvas");
    canvas.width  = img.width;
    canvas.height = img.height;
    canvas.getContext("2d").drawImage(img, 0, 0);
    const blob = await canvasToBlob(canvas, fmt, 0.92);
    const baseName = selectedFiles[i].name.replace(/\.[^.]+$/, "");
    results.push({ name: `${baseName}.${ext}`, blob, type: fmt, icon: "🖼️" });
  }
  return results;
}

// ─── PDF → TXT ─────────────────────────────────────
async function convertPdfToTxt() {
  if (typeof pdfjsLib === "undefined") throw new Error("PDF.js no cargado");
  const file   = selectedFiles[0];
  const buf    = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
  const total  = pdfDoc.numPages;
  let fullText = "";
  const baseName = file.name.replace(/\.pdf$/i, "");

  for (let p = 1; p <= total; p++) {
    setProgress(Math.round(((p-1) / total) * 90), `Extrayendo texto página ${p}/${total}...`);
    const page    = await pdfDoc.getPage(p);
    const content = await page.getTextContent();
    const text    = content.items.map(item => item.str).join(" ");
    fullText += `\n\n─── Página ${p} ───\n\n` + text;
  }

  const blob = new Blob([fullText.trim()], { type: "text/plain;charset=utf-8" });
  return [{ name: `${baseName}_texto.txt`, blob, type: "text/plain", icon: "📝" }];
}

// ─── COMPRIMIR IMÁGENES ─────────────────────────────
async function compressImages() {
  const quality = parseInt(document.getElementById("compressQ")?.value || "75") / 100;
  const results = [];

  for (let i = 0; i < selectedFiles.length; i++) {
    setProgress(Math.round((i / selectedFiles.length) * 90), `Comprimiendo ${i+1}/${selectedFiles.length}...`);
    const dataUrl = await fileToDataUrl(selectedFiles[i]);
    const img     = await loadImage(dataUrl);
    const canvas  = document.createElement("canvas");
    canvas.width  = img.width;
    canvas.height = img.height;
    canvas.getContext("2d").drawImage(img, 0, 0);

    // Siempre exportar como JPEG para compresión real (excepto PNG transparente)
    const isTransparent = selectedFiles[i].type === "image/png";
    const outFmt  = isTransparent ? "image/png" : "image/jpeg";
    const outExt  = isTransparent ? "png" : "jpg";
    const blob    = await canvasToBlob(canvas, outFmt, isTransparent ? undefined : quality);
    const baseName = selectedFiles[i].name.replace(/\.[^.]+$/, "");
    results.push({ name: `${baseName}_comprimido.${outExt}`, blob, type: outFmt, icon: "🗜️" });
  }
  return results;
}

// ─── IMG → RAW (TIFF sin compresión) ──────────────
// RAW real requiere drivers de cámara; en navegador generamos
// TIFF no comprimido (formato abierto, aceptado por Lightroom/Photoshop)
async function convertToRaw() {
  const results = [];

  for (let i = 0; i < selectedFiles.length; i++) {
    setProgress(Math.round((i / selectedFiles.length) * 90), `Convirtiendo a RAW ${i+1}/${selectedFiles.length}...`);
    const dataUrl = await fileToDataUrl(selectedFiles[i]);
    const img     = await loadImage(dataUrl);
    const canvas  = document.createElement("canvas");
    canvas.width  = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    // Extraer datos de píxeles raw (RGBA)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const tiffBlob  = buildTiff(imageData, canvas.width, canvas.height);
    const baseName  = selectedFiles[i].name.replace(/\.[^.]+$/, "");
    results.push({ name: `${baseName}.tiff`, blob: tiffBlob, type: "image/tiff", icon: "📷" });
  }
  return results;
}

// Construye un TIFF mínimo no comprimido (Baseline TIFF RGB)
function buildTiff(imageData, width, height) {
  const { data } = imageData; // RGBA uint8

  // Convertir RGBA → RGB
  const rgbSize = width * height * 3;
  const rgbData = new Uint8Array(rgbSize);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
    rgbData[j]   = data[i];
    rgbData[j+1] = data[i+1];
    rgbData[j+2] = data[i+2];
  }

  // TIFF header + IFD
  const IFD_ENTRIES  = 11;
  const IFD_OFFSET   = 8;
  const IFD_SIZE     = 2 + IFD_ENTRIES * 12 + 4; // count + entries + next IFD pointer
  const STRIPOFFSET  = IFD_OFFSET + IFD_SIZE;
  const totalSize    = STRIPOFFSET + rgbSize;

  const buf = new ArrayBuffer(totalSize);
  const view = new DataView(buf);
  const LE = true; // little-endian

  // Byte order: II = little-endian
  view.setUint16(0, 0x4949, LE); // II
  view.setUint16(2, 42,     LE); // magic
  view.setUint32(4, IFD_OFFSET, LE); // offset to first IFD

  let p = IFD_OFFSET;
  view.setUint16(p, IFD_ENTRIES, LE); p += 2;

  function writeEntry(tag, type, count, value) {
    view.setUint16(p,    tag,   LE);
    view.setUint16(p+2,  type,  LE);
    view.setUint32(p+4,  count, LE);
    view.setUint32(p+8,  value, LE);
    p += 12;
  }

  // Tag  | Type        | Count | Value
  // 256 ImageWidth      LONG    1      width
  writeEntry(256, 4, 1, width);
  // 257 ImageLength     LONG    1      height
  writeEntry(257, 4, 1, height);
  // 258 BitsPerSample   SHORT   3      8,8,8 → stored inline as first SHORT
  writeEntry(258, 3, 3, 0x00080008); // 8,8 packed; third 8 skipped (baseline simplification)
  // 259 Compression     SHORT   1      1=no compression
  writeEntry(259, 3, 1, 1);
  // 262 PhotometricInterp SHORT 1      2=RGB
  writeEntry(262, 3, 1, 2);
  // 273 StripOffsets    LONG    1      data offset
  writeEntry(273, 4, 1, STRIPOFFSET);
  // 277 SamplesPerPixel SHORT   1      3
  writeEntry(277, 3, 1, 3);
  // 278 RowsPerStrip    LONG    1      height (single strip)
  writeEntry(278, 4, 1, height);
  // 279 StripByteCounts LONG    1      rgbSize
  writeEntry(279, 4, 1, rgbSize);
  // 282 XResolution     RATIONAL stored later — use inline offset trick (72 dpi)
  writeEntry(282, 5, 1, STRIPOFFSET - 8); // point to last 8 bytes before data
  // 283 YResolution     RATIONAL same
  writeEntry(283, 5, 1, STRIPOFFSET - 8);

  // Next IFD pointer = 0
  view.setUint32(p, 0, LE); p += 4;

  // Write 72/1 rational for XRes/YRes (8 bytes, just before pixel data)
  const resOff = STRIPOFFSET - 8;
  view.setUint32(resOff,   72, LE);
  view.setUint32(resOff+4, 1,  LE);

  // Pixel data
  const uint8 = new Uint8Array(buf);
  uint8.set(rgbData, STRIPOFFSET);

  return new Blob([buf], { type: "image/tiff" });
}

// ─── MOSTRAR RESULTADOS ────────────────────────────
function showResults(results) {
  document.getElementById("progressWrap").classList.add("hidden");
  const wrap = document.getElementById("resultsWrap");
  const list = document.getElementById("resultsList");
  wrap.classList.remove("hidden");

  list.innerHTML = results.map((r, i) => `
    <div class="result-item">
      <span class="result-icon">${r.icon}</span>
      <div class="result-info">
        <div class="result-name">${r.name}</div>
        <div class="result-size">${formatSize(r.blob.size)}</div>
      </div>
      <button class="download-btn" onclick="downloadBlob(${i})">Descargar ↓</button>
    </div>
  `).join("");

  // Guardar blobs accesibles globalmente para descarga
  window._convResults = results;
}

window.downloadBlob = function(i) {
  const r = window._convResults[i];
  if (!r) return;
  const url = URL.createObjectURL(r.blob);
  const a   = document.createElement("a");
  a.href = url; a.download = r.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

// ─── HELPERS ──────────────────────────────────────
function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload  = e => res(e.target.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload  = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise(res => canvas.toBlob(res, type, quality));
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + " KB";
  return (bytes/1024/1024).toFixed(2) + " MB";
}

function setProgress(pct, label) {
  document.getElementById("progressFill").style.width  = pct + "%";
  document.getElementById("progressLabel").textContent = label;
}

function resetUI() {
  document.getElementById("fileList").classList.add("hidden");
  document.getElementById("convOptions").classList.add("hidden");
  document.getElementById("convertRow").classList.add("hidden");
  document.getElementById("progressWrap").classList.add("hidden");
  document.getElementById("resultsWrap").classList.add("hidden");
  document.getElementById("fileInput").value = "";
}

function showToast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add("hidden"), 2800);
}