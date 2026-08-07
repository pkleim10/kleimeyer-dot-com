-- Lunar Lander HIGH SCORES (kleimeyer.com /lunar-lander)
-- Anonymous arcade-style leaderboard: 3-letter initials + score.
-- Access only via service-role API routes (no anon policies).

CREATE TABLE IF NOT EXISTS lunar_lander_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initials TEXT NOT NULL CHECK (char_length(initials) = 3 AND initials ~ '^[A-Z]{3}$'),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 9999999),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lunar_lander_scores_rank
  ON lunar_lander_scores (score DESC, created_at ASC);

ALTER TABLE lunar_lander_scores ENABLE ROW LEVEL SECURITY;

-- Intentionally no public policies: reads/writes go through Next.js API with service role.
