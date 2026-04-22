-- ============================================================
-- MIGRATION: v2.0 → v5.0
-- Cole e clique em RUN no SQL Editor do Supabase
-- Seguro: usa ADD COLUMN IF NOT EXISTS (não apaga dados)
-- ============================================================

-- ── ROOMS: colunas novas ───────────────────────────────────
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS leader_name      TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS leader_matricula TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS sku              TEXT;

-- ── CHANGEOVER_SESSIONS: colunas de fase + produto ─────────
ALTER TABLE changeover_sessions ADD COLUMN IF NOT EXISTS setup_start          TIMESTAMPTZ;
ALTER TABLE changeover_sessions ADD COLUMN IF NOT EXISTS setup_end            TIMESTAMPTZ;
ALTER TABLE changeover_sessions ADD COLUMN IF NOT EXISTS setup_total_ms       BIGINT;
ALTER TABLE changeover_sessions ADD COLUMN IF NOT EXISTS adjustment_start     TIMESTAMPTZ;
ALTER TABLE changeover_sessions ADD COLUMN IF NOT EXISTS adjustment_end       TIMESTAMPTZ;
ALTER TABLE changeover_sessions ADD COLUMN IF NOT EXISTS adjustment_total_ms  BIGINT;
ALTER TABLE changeover_sessions ADD COLUMN IF NOT EXISTS validation_start     TIMESTAMPTZ;
ALTER TABLE changeover_sessions ADD COLUMN IF NOT EXISTS validation_end       TIMESTAMPTZ;
ALTER TABLE changeover_sessions ADD COLUMN IF NOT EXISTS validation_total_ms  BIGINT;

-- sector era NOT NULL no v2 — torna opcional (operador não digita mais)
ALTER TABLE changeover_sessions ALTER COLUMN sector    DROP NOT NULL;
ALTER TABLE changeover_sessions ALTER COLUMN product   DROP NOT NULL;

-- ── VERIFICAÇÃO: confirma que deu certo ────────────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('rooms','changeover_sessions')
  AND column_name IN (
    'leader_name','leader_matricula','sku',
    'setup_start','setup_end','setup_total_ms',
    'adjustment_start','adjustment_end','adjustment_total_ms',
    'validation_start','validation_end','validation_total_ms'
  )
ORDER BY table_name, column_name;
