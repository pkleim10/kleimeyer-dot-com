-- Dead Pool: general (non-death) announcements
--
-- Until now the Announcements page was driven entirely by deadpool_hits, so
-- the only thing the commissioner could post was a recorded death. This adds
-- free-form notices ("picks close in a week", "prize pot is up to X") that
-- appear interleaved with the death notices in the same feed.
--
-- Same security model as every other deadpool table: RLS on with no policies
-- (default-deny), so reads/writes only happen through the service-role client
-- behind requireAdmin() in the route handlers.

CREATE TABLE IF NOT EXISTS deadpool_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_year INT NOT NULL,
  -- Optional headline; the body carries the notice itself.
  title TEXT,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  posted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deadpool_announcements_season
  ON deadpool_announcements(season_year, created_at DESC);

ALTER TABLE deadpool_announcements ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_deadpool_announcements_updated_at
  BEFORE UPDATE ON deadpool_announcements
  FOR EACH ROW
  EXECUTE FUNCTION deadpool_set_updated_at();
