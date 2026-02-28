-- ═══════════════════════════════════════════════════

-- ── 1. PROFILES ──────────────────────────────────
-- Extiende el auth.users de Supabase con datos del perfil
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT,
  campus      TEXT,
  family      TEXT,
  avatar      TEXT,          -- URL de la imagen (base64 o URL externa)
  semestre    TEXT,
  schedule    JSONB,         -- array de clases [ { id, name, start, end, days, color } ]
  status      TEXT DEFAULT 'Online',
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede ver perfiles (para ver familia/nombre en salas)
CREATE POLICY "Profiles son visibles para usuarios autenticados"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Solo el dueño puede actualizar su perfil
CREATE POLICY "Solo el dueño edita su perfil"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Solo el dueño actualiza su perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);


-- ── 2. ROOMS (Salas de estudio) ───────────────────
CREATE TABLE IF NOT EXISTS public.rooms (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  creator_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_name TEXT,
  members      JSONB DEFAULT '[]'::jsonb,  -- array de { id, name, avatar, family, status, joinedAt }
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados pueden ver las salas
CREATE POLICY "Salas visibles para autenticados"
  ON public.rooms FOR SELECT
  USING (auth.role() = 'authenticated');

-- Cualquier autenticado puede crear salas
CREATE POLICY "Autenticados pueden crear salas"
  ON public.rooms FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Cualquier autenticado puede actualizar salas (para unirse/salir)
CREATE POLICY "Autenticados pueden actualizar salas"
  ON public.rooms FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Cualquier autenticado puede borrar salas (se borra cuando queda vacía)
CREATE POLICY "Autenticados pueden borrar salas vacías"
  ON public.rooms FOR DELETE
  USING (auth.role() = 'authenticated');


-- ── 3. TAREAS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tareas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  subject       TEXT DEFAULT 'General',
  description   TEXT DEFAULT '',
  due           TIMESTAMPTZ,
  priority      TEXT DEFAULT 'normal',   -- normal | alta | urgente
  autor_id      TEXT NOT NULL,           -- user email
  autor_name    TEXT,
  autor_avatar  TEXT,
  autor_family  TEXT,
  suertes       JSONB DEFAULT '[]'::jsonb,   -- array de user emails
  ayudas        JSONB DEFAULT '[]'::jsonb,   -- array de { email, nombre, mensaje, ts }
  done          BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados ven todas las tareas
CREATE POLICY "Tareas visibles para autenticados"
  ON public.tareas FOR SELECT
  USING (auth.role() = 'authenticated');

-- Cualquier autenticado puede crear tareas
CREATE POLICY "Autenticados crean tareas"
  ON public.tareas FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Cualquier autenticado puede actualizar (suertes, ayudas)
CREATE POLICY "Autenticados actualizan tareas"
  ON public.tareas FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Solo el autor puede borrar su tarea
CREATE POLICY "Autor puede borrar su tarea"
  ON public.tareas FOR DELETE
  USING (autor_id = auth.jwt() ->> 'email');


-- ── 4. MESSAGES (Ayudas y suerte) ─────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo          TEXT DEFAULT 'ayuda',    -- ayuda | suerte
  de            TEXT NOT NULL,           -- email del que manda
  de_nombre     TEXT,
  para          TEXT NOT NULL,           -- email del destinatario
  tarea_id      UUID REFERENCES public.tareas(id) ON DELETE CASCADE,
  tarea_titulo  TEXT,
  mensaje       TEXT,
  leido         BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Solo el destinatario ve sus mensajes
CREATE POLICY "Solo destinatario ve sus mensajes"
  ON public.messages FOR SELECT
  USING (para = auth.jwt() ->> 'email');

-- Cualquier autenticado puede enviar mensajes
CREATE POLICY "Autenticados envían mensajes"
  ON public.messages FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Solo el destinatario puede marcar como leído
CREATE POLICY "Destinatario actualiza mensajes"
  ON public.messages FOR UPDATE
  USING (para = auth.jwt() ->> 'email');


-- ── 5. FUNCIÓN: crear perfil automáticamente al registrarse ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, updated_at)
  VALUES (
    NEW.id,
    SPLIT_PART(NEW.email, '@', 1),  -- nombre provisional = parte antes del @
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: se ejecuta cada vez que alguien se registra
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── 6. REALTIME: habilitar para salas y tareas ────
-- Ejecuta esto también en SQL Editor:
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tareas;
