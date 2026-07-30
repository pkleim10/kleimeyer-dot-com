-- Dead Pool: sealed lists (public commit–reveal)
--
-- Players keep their pick list in their own file, outside the app. Before the
-- season locks they paste it in, the fingerprint is computed IN THE BROWSER,
-- and only that fingerprint is posted. After the season opens they paste the
-- same list again and the server recomputes the fingerprint to verify it.
--
-- The point of this table is what it does NOT contain: no pick names, and no
-- player secret. If it held the secret alongside the fingerprint, anyone who
-- could read the database could brute-force a short list back out of it — a
-- two or three name list falls quickly against a modest celebrity word list.
-- The secret lives only in the player's own file.
--
-- Fingerprints are readable by every participant on purpose: the commitment is
-- witnessed by the whole pool, so no single one can be quietly altered later.
-- Enforcement of who may read stays in the route handlers, as everywhere else
-- in this app (RLS on, zero policies, service-role client only).

CREATE TABLE IF NOT EXISTS deadpool_seals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES deadpool_participants(id) ON DELETE CASCADE,
  season_year INT NOT NULL,
  fingerprint TEXT NOT NULL CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
  -- Set ONLY at reveal, never before. A commitment scheme is only publicly
  -- verifiable if the nonce is published alongside the revealed value: without
  -- it, the server would be the sole party able to recompute a fingerprint,
  -- which is precisely the trust this design removes. Publishing it after the
  -- reveal is harmless because the list itself is public by then; storing it
  -- any earlier would let anyone reading this table brute-force a short list.
  revealed_secret TEXT,
  revealed_at TIMESTAMP WITH TIME ZONE,
  -- Re-sealing before the lock is allowed and expected: fingerprints are
  -- opaque, so re-sealing gains nobody an advantage, and it turns "I edited my
  -- file" or "I lost it" from fatal into a shrug. Superseded rows are kept so
  -- the seal history stays publicly visible.
  superseded_at TIMESTAMP WITH TIME ZONE,
  sealed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- At most one active seal per participant per season; superseded rows are
-- unconstrained so the history can accumulate.
CREATE UNIQUE INDEX IF NOT EXISTS idx_deadpool_seals_active
  ON deadpool_seals(participant_id, season_year)
  WHERE superseded_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_deadpool_seals_season
  ON deadpool_seals(season_year, sealed_at DESC);

ALTER TABLE deadpool_seals ENABLE ROW LEVEL SECURITY;
