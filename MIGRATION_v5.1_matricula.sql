
-- ── MIGRATION v5.1: tech_matricula ──────────────────────────────────────
ALTER TABLE changeover_sessions ADD COLUMN IF NOT EXISTS tech_matricula TEXT;
