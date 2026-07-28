-- Dead Pool: participants, sessions, picks, hits, submissions
--
-- RLS is enabled on every table below but NO policies are defined for
-- anon/authenticated roles (default-deny). All reads/writes go through
-- Next.js Route Handlers using the service-role client, with authorization
-- enforced in application code (participant session cookie for pool
-- participants, or the site's real admin role check for admin actions).
-- This avoids needing RLS policies keyed to a non-Supabase-Auth session.

-- Participants ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS deadpool_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INT,
  email TEXT NOT NULL,
  email_normalized TEXT GENERATED ALWAYS AS (lower(trim(email))) STORED,
  display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_deadpool_participants_email_season
  ON deadpool_participants(email_normalized, season_year);

ALTER TABLE deadpool_participants ENABLE ROW LEVEL SECURITY;

-- Sessions ---------------------------------------------------------
-- Cookie carries the raw token; only its sha256 hash is ever stored.

CREATE TABLE IF NOT EXISTS deadpool_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES deadpool_participants(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_deadpool_sessions_token_hash ON deadpool_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_deadpool_sessions_participant ON deadpool_sessions(participant_id);

ALTER TABLE deadpool_sessions ENABLE ROW LEVEL SECURITY;

-- Picks ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS deadpool_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES deadpool_participants(id) ON DELETE CASCADE,
  season_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INT,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0 AND char_length(name) <= 100),
  name_normalized TEXT GENERATED ALWAYS AS (lower(trim(name))) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enforces case-insensitive no-duplicate-picks per participant at the DB layer
CREATE UNIQUE INDEX IF NOT EXISTS idx_deadpool_picks_participant_name
  ON deadpool_picks(participant_id, season_year, name_normalized);
-- Powers the "who else picked this person" uniqueness-bonus lookup
CREATE INDEX IF NOT EXISTS idx_deadpool_picks_season_name ON deadpool_picks(season_year, name_normalized);
CREATE INDEX IF NOT EXISTS idx_deadpool_picks_participant ON deadpool_picks(participant_id, season_year);

ALTER TABLE deadpool_picks ENABLE ROW LEVEL SECURITY;

-- Hits (recorded deaths) ---------------------------------------------------------
-- This one table drives scoring, the Announcements feed, and the Dead So Far
-- recap — recording a hit is the single action that updates all three.

CREATE TABLE IF NOT EXISTS deadpool_hits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INT,
  display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) > 0),
  name_normalized TEXT GENERATED ALWAYS AS (lower(trim(display_name))) STORED,
  date_of_death DATE NOT NULL,
  age_at_death INT NOT NULL CHECK (age_at_death BETWEEN 0 AND 130),
  announcement_text TEXT,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_deadpool_hits_season_name ON deadpool_hits(season_year, name_normalized);
CREATE INDEX IF NOT EXISTS idx_deadpool_hits_season_date ON deadpool_hits(season_year, date_of_death DESC);

ALTER TABLE deadpool_hits ENABLE ROW LEVEL SECURITY;

-- Submissions (participant tip-offs for admin review) --------------------------

CREATE TABLE IF NOT EXISTS deadpool_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES deadpool_participants(id) ON DELETE SET NULL,
  season_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INT,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0 AND char_length(name) <= 100),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  resolved_hit_id UUID REFERENCES deadpool_hits(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deadpool_submissions_status ON deadpool_submissions(season_year, status);
CREATE INDEX IF NOT EXISTS idx_deadpool_submissions_participant ON deadpool_submissions(participant_id);

ALTER TABLE deadpool_submissions ENABLE ROW LEVEL SECURITY;

-- updated_at auto-stamp trigger ---------------------------------------------------------

CREATE OR REPLACE FUNCTION deadpool_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_deadpool_participants_updated_at
  BEFORE UPDATE ON deadpool_participants
  FOR EACH ROW
  EXECUTE FUNCTION deadpool_set_updated_at();

CREATE TRIGGER set_deadpool_picks_updated_at
  BEFORE UPDATE ON deadpool_picks
  FOR EACH ROW
  EXECUTE FUNCTION deadpool_set_updated_at();

CREATE TRIGGER set_deadpool_hits_updated_at
  BEFORE UPDATE ON deadpool_hits
  FOR EACH ROW
  EXECUTE FUNCTION deadpool_set_updated_at();

-- Atomic full-list replace for picks ---------------------------------------------------------
-- Used by PUT /api/deadpool/picks so a partial failure can't leave a
-- participant with an empty list (delete + insert in one transactional call).
-- Not marked SECURITY DEFINER: it runs with the calling role's privileges, so
-- the default-deny RLS on deadpool_picks still applies unless called via the
-- service-role client, which is the only caller in this app.

CREATE OR REPLACE FUNCTION deadpool_replace_picks(
  p_participant_id UUID,
  p_season_year INT,
  p_names TEXT[]
)
RETURNS SETOF deadpool_picks
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM deadpool_picks
  WHERE participant_id = p_participant_id AND season_year = p_season_year;

  RETURN QUERY
  INSERT INTO deadpool_picks (participant_id, season_year, name)
  SELECT p_participant_id, p_season_year, unnest(p_names)
  RETURNING *;
END;
$$;
