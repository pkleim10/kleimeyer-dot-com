-- Dead Pool: make participants season-independent
--
-- Previously deadpool_participants was scoped by season_year (unique per
-- email + season_year), so the same person registering next year got a
-- brand-new row. That made "which season is this participant in" a stale,
-- per-row value that could drift out of sync with the admin's active-season
-- setting (deadpool_settings) — the actual cause of a bug where a returning
-- participant kept seeing a past season's picks indefinitely.
--
-- A participant is now a permanent identity: one row per email, forever.
-- A season's "pool entry" is defined purely by having pick rows for that
-- season in deadpool_picks (which already carries its own independent
-- season_year column). This removes the whole bug class structurally.

BEGIN;

-- Defensive dedupe (a no-op today — live data has no email registered
-- across multiple seasons — but handles the general case correctly):
-- pick one canonical row per email, re-point every FK reference at it,
-- then drop the surplus rows.
CREATE TEMP TABLE deadpool_participant_canonical AS
SELECT DISTINCT ON (email_normalized) id AS canonical_id, email_normalized
FROM deadpool_participants
ORDER BY email_normalized, created_at ASC, id ASC;

UPDATE deadpool_picks pk SET participant_id = c.canonical_id
FROM deadpool_participants p
JOIN deadpool_participant_canonical c ON c.email_normalized = p.email_normalized
WHERE pk.participant_id = p.id AND p.id <> c.canonical_id;

UPDATE deadpool_sessions s SET participant_id = c.canonical_id
FROM deadpool_participants p
JOIN deadpool_participant_canonical c ON c.email_normalized = p.email_normalized
WHERE s.participant_id = p.id AND p.id <> c.canonical_id;

UPDATE deadpool_submissions sub SET participant_id = c.canonical_id
FROM deadpool_participants p
JOIN deadpool_participant_canonical c ON c.email_normalized = p.email_normalized
WHERE sub.participant_id = p.id AND p.id <> c.canonical_id;

DELETE FROM deadpool_participants p
USING deadpool_participant_canonical c
WHERE p.email_normalized = c.email_normalized AND p.id <> c.canonical_id;

DROP TABLE deadpool_participant_canonical;

DROP INDEX IF EXISTS idx_deadpool_participants_email_season;
CREATE UNIQUE INDEX IF NOT EXISTS idx_deadpool_participants_email
  ON deadpool_participants(email_normalized);

ALTER TABLE deadpool_participants DROP COLUMN IF EXISTS season_year;

COMMIT;
