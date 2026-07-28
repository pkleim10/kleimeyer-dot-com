-- Dead Pool: settings
--
-- A single persisted setting: which season year new registrations and admin
-- views operate on. Previously this was implicitly "whatever the real
-- calendar year happens to be," which broke as soon as the pool was being
-- recruited for a season that hadn't started yet (e.g. building/marketing
-- the 2027 pool mid-2026) — list privacy is keyed off a season's Jan 1, so
-- an implicit "current year" season is treated as already-started the
-- moment the real calendar rolls into it. This makes the active season an
-- explicit, admin-controlled value instead.
--
-- Singleton-row pattern: id is always 1, enforced by the CHECK constraint,
-- so there's never more than one row to keep in sync.

CREATE TABLE IF NOT EXISTS deadpool_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  season_year INT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO deadpool_settings (id, season_year)
VALUES (1, EXTRACT(YEAR FROM NOW())::INT)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE deadpool_settings ENABLE ROW LEVEL SECURITY;
-- No policies: default-deny, same model as every other deadpool table —
-- reads/writes only happen through the service-role client, gated by
-- requireAdmin() in the Next.js route handler.

CREATE TRIGGER set_deadpool_settings_updated_at
  BEFORE UPDATE ON deadpool_settings
  FOR EACH ROW
  EXECUTE FUNCTION deadpool_set_updated_at();
