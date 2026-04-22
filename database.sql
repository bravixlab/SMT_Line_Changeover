-- ============================================================
-- CHANGEOVER SMT v5.0 — Schema Supabase
-- Execute no SQL Editor: https://supabase.com → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS rooms (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code            TEXT NOT NULL UNIQUE,
  name                 TEXT NOT NULL,
  password             TEXT DEFAULT '',
  line                 TEXT,
  shift                TEXT,
  sku                  TEXT,
  alert_limit_minutes  INTEGER DEFAULT 300,
  created_by           TEXT DEFAULT 'lideranca',
  leader_name          TEXT,
  leader_matricula     TEXT,
  is_active            BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS leader_name TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS leader_matricula TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS sku TEXT;

CREATE TABLE IF NOT EXISTS changeover_sessions (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id               UUID REFERENCES rooms(id) ON DELETE CASCADE,
  tech_name             TEXT NOT NULL,
  sector                TEXT,
  shift                 TEXT NOT NULL,
  product               TEXT,
  changeover_type       TEXT NOT NULL,
  start_time            TIMESTAMPTZ DEFAULT NOW(),
  end_time              TIMESTAMPTZ,
  total_duration_ms     BIGINT,
  status                TEXT DEFAULT 'in_progress',
  setup_start           TIMESTAMPTZ,
  setup_end             TIMESTAMPTZ,
  setup_total_ms        BIGINT,
  adjustment_start      TIMESTAMPTZ,
  adjustment_end        TIMESTAMPTZ,
  adjustment_total_ms   BIGINT,
  validation_start      TIMESTAMPTZ,
  validation_end        TIMESTAMPTZ,
  validation_total_ms   BIGINT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE changeover_sessions ADD COLUMN IF NOT EXISTS setup_start         TIMESTAMPTZ;
ALTER TABLE changeover_sessions ADD COLUMN IF NOT EXISTS setup_end           TIMESTAMPTZ;
ALTER TABLE changeover_sessions ADD COLUMN IF NOT EXISTS setup_total_ms      BIGINT;
ALTER TABLE changeover_sessions ADD COLUMN IF NOT EXISTS adjustment_start    TIMESTAMPTZ;
ALTER TABLE changeover_sessions ADD COLUMN IF NOT EXISTS adjustment_end      TIMESTAMPTZ;
ALTER TABLE changeover_sessions ADD COLUMN IF NOT EXISTS adjustment_total_ms BIGINT;
ALTER TABLE changeover_sessions ADD COLUMN IF NOT EXISTS validation_start    TIMESTAMPTZ;
ALTER TABLE changeover_sessions ADD COLUMN IF NOT EXISTS validation_end      TIMESTAMPTZ;
ALTER TABLE changeover_sessions ADD COLUMN IF NOT EXISTS validation_total_ms BIGINT;
ALTER TABLE changeover_sessions ADD COLUMN IF NOT EXISTS product             TEXT;
ALTER TABLE changeover_sessions ADD COLUMN IF NOT EXISTS sector              TEXT;

CREATE TABLE IF NOT EXISTS machine_times (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id   UUID REFERENCES changeover_sessions(id) ON DELETE CASCADE,
  machine_id   TEXT NOT NULL,
  machine_name TEXT NOT NULL,
  start_time   TIMESTAMPTZ,
  end_time     TIMESTAMPTZ,
  duration_ms  BIGINT,
  observation  TEXT,
  completed    BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rooms                DISABLE ROW LEVEL SECURITY;
ALTER TABLE changeover_sessions  DISABLE ROW LEVEL SECURITY;
ALTER TABLE machine_times        DISABLE ROW LEVEL SECURITY;
GRANT ALL ON rooms               TO anon;
GRANT ALL ON changeover_sessions TO anon;
GRANT ALL ON machine_times       TO anon;
GRANT USAGE ON SCHEMA public     TO anon;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon;

ALTER PUBLICATION supabase_realtime ADD TABLE changeover_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE machine_times;

CREATE INDEX IF NOT EXISTS idx_rooms_code       ON rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_sessions_room    ON changeover_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status  ON changeover_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON changeover_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_machine_session  ON machine_times(session_id);

CREATE TABLE IF NOT EXISTS station_targets (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  station_name  TEXT NOT NULL UNIQUE,
  target_ms     BIGINT NOT NULL DEFAULT 600000,
  display_order INTEGER DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE station_targets DISABLE ROW LEVEL SECURITY;
GRANT ALL ON station_targets TO anon;

INSERT INTO station_targets (station_name, target_ms, display_order) VALUES
  ('Printer',                      600000,  1),
  ('SPI',                          480000,  2),
  ('Desalimentação Pick & Place',  720000,  3),
  ('Alimentação Pick & Place',     720000,  4),
  ('Reflow',                       480000,  5),
  ('AOI',                          900000,  6),
  ('Router',                       360000,  7),
  ('Ajuste de Linha',             1200000,  8),
  ('Validação nos Testes',        1200000,  9),
  ('Qualidade',                    600000, 10),
  ('Wave Solder',                  300000, 11),
  ('Check de Ferramental',         900000, 12)
ON CONFLICT (station_name) DO NOTHING;
