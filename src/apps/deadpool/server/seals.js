import { getServiceClient } from './db'

// Migrations are applied by hand in the Supabase SQL editor, so this code can
// legitimately run before add_deadpool_seals.sql has been. Degrade to "no
// seals" rather than breaking the pages that show them. PGRST205 is what
// PostgREST returns for a table missing from its schema cache (the case that
// actually fires through supabase-js); 42P01 is Postgres's own undefined_table.
const MISSING_TABLE_CODES = new Set(['PGRST205', '42P01'])

function isMissingTable(error) {
  return MISSING_TABLE_CODES.has(error?.code)
}

/**
 * Every active seal for the season, with its owner's team name.
 *
 * `revealed_secret` is included because a commitment is only publicly
 * verifiable once its nonce is published — that's what lets any player
 * recompute another's fingerprint from the revealed list rather than taking
 * the server's word for it. It is null until that player reveals.
 */
export async function getSeals(seasonYear) {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('deadpool_seals')
    .select(
      'id, participant_id, fingerprint, sealed_at, revealed_secret, revealed_at, deadpool_participants(display_name)'
    )
    .eq('season_year', seasonYear)
    .is('superseded_at', null)
    .order('sealed_at', { ascending: true })

  if (error) {
    if (isMissingTable(error)) return []
    throw error
  }

  return (data || []).map((row) => ({
    id: row.id,
    participantId: row.participant_id,
    displayName: row.deadpool_participants?.display_name || null,
    fingerprint: row.fingerprint,
    sealedAt: row.sealed_at,
    revealedSecret: row.revealed_secret,
    revealedAt: row.revealed_at,
  }))
}

/** Publish the nonce after a successful reveal, making the seal verifiable. */
export async function recordReveal(participantId, seasonYear, secret) {
  const supabase = getServiceClient()
  const { error } = await supabase
    .from('deadpool_seals')
    .update({ revealed_secret: secret, revealed_at: new Date().toISOString() })
    .eq('participant_id', participantId)
    .eq('season_year', seasonYear)
    .is('superseded_at', null)
  if (error) throw error
}

export async function getActiveSeal(participantId, seasonYear) {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('deadpool_seals')
    .select('id, fingerprint, sealed_at')
    .eq('participant_id', participantId)
    .eq('season_year', seasonYear)
    .is('superseded_at', null)
    .maybeSingle()

  if (error) {
    if (isMissingTable(error)) return null
    throw error
  }
  return data || null
}

/**
 * Record a new seal, superseding any existing one. Re-sealing before the lock
 * is deliberately permitted — fingerprints are opaque, so it confers no
 * advantage, and it's the safety valve for a player who edited or lost their
 * file. The superseded row is retained so the history stays public.
 */
export async function replaceSeal(participantId, seasonYear, fingerprint) {
  const supabase = getServiceClient()

  const { error: supersedeError } = await supabase
    .from('deadpool_seals')
    .update({ superseded_at: new Date().toISOString() })
    .eq('participant_id', participantId)
    .eq('season_year', seasonYear)
    .is('superseded_at', null)
  if (supersedeError) throw supersedeError

  const { data, error } = await supabase
    .from('deadpool_seals')
    .insert({ participant_id: participantId, season_year: seasonYear, fingerprint })
    .select('id, fingerprint, sealed_at')
    .single()
  if (error) throw error

  return data
}
