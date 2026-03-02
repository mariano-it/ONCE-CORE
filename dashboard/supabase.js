// ═══════════════════════════════════════════════════
// ONCE CORE — Supabase Client (Singleton seguro)
// ═══════════════════════════════════════════════════

// Evitar inicialización duplicada
if (!window._supabase) {

  const SUPABASE_URL =
    "https://ahhsobmhtbhaweyibyew.supabase.co";

  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoaHNvYm1odGJoYXdleWlieWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNDc3MjAsImV4cCI6MjA4Nz7823720MH0.to7D-IpREQaHDlLFc2oIlT2MFZaD4zaA1gVigArVoMo";

  window._supabase = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

}

// Alias interno
const _supabase = window._supabase;

// ── Auth helpers ──────────────────────────────────

async function sbSignUp(email, password) {
  const { data, error } = await _supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data.user;
}

async function sbSignIn(email, password) {
  const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

async function sbSignOut() {
  await _supabase.auth.signOut();
}

async function sbGetUser() {
  const { data } = await _supabase.auth.getUser();
  return data?.user || null;
}

async function sbGetSession() {
  const { data } = await _supabase.auth.getSession();
  return data?.session || null;
}

// ── Perfiles ──────────────────────────────────────

async function sbGetProfile(userId) {
  const { data, error } = await _supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

async function sbUpsertProfile(userId, profileData) {
  const { error } = await _supabase
    .from("profiles")
    .upsert({ id: userId, ...profileData, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ── Salas ─────────────────────────────────────────

async function sbGetRooms() {
  const { data, error } = await _supabase
    .from("rooms")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function sbCreateRoom(name, creatorId, creatorName) {
  const { data, error } = await _supabase
    .from("rooms")
    .insert({
      name,
      creator_id:   creatorId,
      creator_name: creatorName,
      members:      [],
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function sbDeleteRoom(roomId) {
  const { error } = await _supabase
    .from("rooms")
    .delete()
    .eq("id", roomId);
  if (error) throw error;
}

async function sbJoinRoom(roomId, memberObj) {
  // Obtener sala actual
  const { data: room, error: fetchErr } = await _supabase
    .from("rooms").select("members").eq("id", roomId).single();
  if (fetchErr) throw fetchErr;

  const members = room.members || [];
  // Quitar si ya estaba (para actualizar status)
  const filtered = members.filter(m => m.id !== memberObj.id);
  filtered.push(memberObj);

  const { error } = await _supabase
    .from("rooms")
    .update({ members: filtered })
    .eq("id", roomId);
  if (error) throw error;
}

async function sbLeaveRoom(roomId, userId) {
  const { data: room, error: fetchErr } = await _supabase
    .from("rooms").select("members").eq("id", roomId).single();
  if (fetchErr) throw fetchErr;

  const members = (room.members || []).filter(m => m.id !== userId);

  if (members.length === 0) {
    // Sala vacía — borrarla
    await sbDeleteRoom(roomId);
  } else {
    const { error } = await _supabase
      .from("rooms")
      .update({ members })
      .eq("id", roomId);
    if (error) throw error;
  }
}

async function sbSubscribeRooms(callback) {
  return _supabase
    .channel("rooms-channel")
    .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, callback)
    .subscribe();
}

// ── Tareas ────────────────────────────────────────

async function sbGetTareas() {
  const { data, error } = await _supabase
    .from("tareas")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function sbCreateTarea(tarea) {
  const { data, error } = await _supabase
    .from("tareas")
    .insert(tarea)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function sbDeleteTarea(tareaId) {
  const { error } = await _supabase
    .from("tareas")
    .delete()
    .eq("id", tareaId);
  if (error) throw error;
}

async function sbAddSuerte(tareaId, userId) {
  // Obtener suertes actuales
  const { data, error: fetchErr } = await _supabase
    .from("tareas").select("suertes").eq("id", tareaId).single();
  if (fetchErr) throw fetchErr;

  const suertes = data.suertes || [];
  if (suertes.includes(userId)) return false; // ya mandó suerte

  suertes.push(userId);
  const { error } = await _supabase
    .from("tareas")
    .update({ suertes })
    .eq("id", tareaId);
  if (error) throw error;
  return true;
}

async function sbAddAyuda(tareaId, ayudaObj) {
  const { data, error: fetchErr } = await _supabase
    .from("tareas").select("ayudas").eq("id", tareaId).single();
  if (fetchErr) throw fetchErr;

  const ayudas = data.ayudas || [];
  ayudas.push(ayudaObj);

  const { error } = await _supabase
    .from("tareas")
    .update({ ayudas })
    .eq("id", tareaId);
  if (error) throw error;
}

async function sbSubscribeTareas(callback) {
  return _supabase
    .channel("tareas-channel")
    .on("postgres_changes", { event: "*", schema: "public", table: "tareas" }, callback)
    .subscribe();
}

// ── Mensajes ──────────────────────────────────────

async function sbGetMessages(userId) {
  const { data, error } = await _supabase
    .from("messages")
    .select("*")
    .eq("para", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function sbCreateMessage(msg) {
  const { error } = await _supabase
    .from("messages")
    .insert(msg);
  if (error) throw error;
}

async function sbMarkMessageRead(msgId) {
  const { error } = await _supabase
    .from("messages")
    .update({ leido: true })
    .eq("id", msgId);
  if (error) throw error;
}
