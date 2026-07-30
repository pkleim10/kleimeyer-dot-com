import { getServiceClient } from './db'
import { getHitsWithPickers } from './scoring'

// Migrations here are applied by hand in the Supabase SQL editor, so this
// code can legitimately run before add_deadpool_announcements.sql has been —
// in that window we degrade to "no general notices" rather than breaking the
// whole Announcements page, which would otherwise lose its death notices too.
// Any other error still throws, so real problems aren't silently swallowed.
//
// PGRST205 is what PostgREST returns for a table missing from its schema
// cache (the case that actually fires through supabase-js); 42P01 is
// Postgres's own undefined_table, kept for any path that reaches the DB
// directly.
const MISSING_TABLE_CODES = new Set(['PGRST205', '42P01'])

function isMissingTable(error) {
  return MISSING_TABLE_CODES.has(error?.code)
}

export async function getGeneralAnnouncements(seasonYear) {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('deadpool_announcements')
    .select('id, title, body, created_at')
    .eq('season_year', seasonYear)
    .order('created_at', { ascending: false })

  if (error) {
    if (isMissingTable(error)) return []
    throw error
  }
  return data || []
}

/** Pure copy for the auto-notice posted whenever a team seals or re-seals. */
export function sealAnnouncementCopy({ displayName, resealed }) {
  const name = String(displayName || '').trim() || 'A team'
  if (resealed) {
    return {
      title: 'List re-sealed',
      body: `${name} re-sealed their list. The prior fingerprint is superseded; the new one is on the Sealed Lists page.`,
    }
  }
  return {
    title: 'List sealed',
    body: `${name} sealed their list. The fingerprint is now on the Sealed Lists page.`,
  }
}

/** Pure copy for the auto-notice posted when a sealed list is finally revealed. */
export function revealAnnouncementCopy({ displayName }) {
  const name = String(displayName || '').trim() || 'A team'
  return {
    title: 'List posted',
    body: `${name} posted their sealed list. It is now on Everyone's Lists.`,
  }
}

/**
 * Insert a general (non-death) notice. `postedBy` is the auth user id when a
 * commissioner posts by hand; omit it for system notices (e.g. seal events).
 * Returns null if the announcements table hasn't been migrated yet.
 */
export async function createGeneralAnnouncement({
  seasonYear,
  title,
  body,
  postedBy = null,
}) {
  const supabase = getServiceClient()
  const row = {
    season_year: seasonYear,
    title: title || null,
    body,
  }
  if (postedBy) row.posted_by = postedBy

  const { data, error } = await supabase
    .from('deadpool_announcements')
    .insert(row)
    .select('id, title, body, created_at')
    .single()

  if (error) {
    if (isMissingTable(error)) return null
    throw error
  }
  return data
}

// Pure merge, kept separate from the queries below so it's directly
// unit-testable (same split as computeHitScores in scoring.js).
//
// Each item is tagged with `kind` so the feed component can style the two
// apart, and sorted by the date the card actually displays — a death by its
// date of death, a notice by when it was posted — so the feed's order matches
// the dates a reader sees on it.
export function mergeAnnouncementItems(hits, notices) {
  const items = [
    ...hits.map((hit) => ({
      ...hit,
      kind: 'death',
      // date_of_death is date-only, so this parses as UTC midnight.
      sortAt: new Date(hit.dateOfDeath).getTime(),
    })),
    ...notices.map((notice) => ({
      kind: 'notice',
      sortAt: new Date(notice.created_at).getTime(),
      id: notice.id,
      title: notice.title,
      body: notice.body,
      postedAt: notice.created_at,
    })),
  ]

  items.sort((a, b) => b.sortAt - a.sortAt)
  return items
}

export async function getAnnouncementFeed(seasonYear) {
  const [hits, notices] = await Promise.all([
    getHitsWithPickers(seasonYear),
    getGeneralAnnouncements(seasonYear),
  ])
  return mergeAnnouncementItems(hits, notices)
}

/**
 * Newest "posted" timestamp across deaths and notices for the season.
 * Deaths use hit.created_at (when recorded), not date_of_death — a backdated
 * death still counts as new when the commissioner posts it.
 */
export async function getLatestAnnouncementPostedAt(seasonYear) {
  const supabase = getServiceClient()

  const [hitsResult, noticesResult] = await Promise.all([
    supabase
      .from('deadpool_hits')
      .select('created_at')
      .eq('season_year', seasonYear)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('deadpool_announcements')
      .select('created_at')
      .eq('season_year', seasonYear)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (hitsResult.error && !isMissingTable(hitsResult.error)) throw hitsResult.error
  if (noticesResult.error && !isMissingTable(noticesResult.error)) throw noticesResult.error

  const times = [hitsResult.data?.created_at, noticesResult.data?.created_at]
    .filter(Boolean)
    .map((iso) => new Date(iso).getTime())

  if (times.length === 0) return null
  return new Date(Math.max(...times)).toISOString()
}

/** Pure: should the home-page callout show for a signed-in player? */
export function hasUnseenAnnouncements(latestPostedAt, seenAt) {
  if (!latestPostedAt) return false
  if (!seenAt) return true
  return new Date(latestPostedAt).getTime() > new Date(seenAt).getTime()
}

export async function getAnnouncementsSeenAt(participantId) {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('deadpool_participants')
    .select('announcements_seen_at')
    .eq('id', participantId)
    .maybeSingle()

  if (error) {
    // Column missing until the migration is applied — treat as never seen.
    if (isMissingTable(error) || error.code === '42703' || /announcements_seen_at/i.test(error.message || '')) {
      return null
    }
    throw error
  }
  return data?.announcements_seen_at || null
}

export async function markAnnouncementsSeen(participantId, at = new Date()) {
  const supabase = getServiceClient()
  const { error } = await supabase
    .from('deadpool_participants')
    .update({ announcements_seen_at: at.toISOString() })
    .eq('id', participantId)

  if (error) {
    if (isMissingTable(error) || error.code === '42703' || /announcements_seen_at/i.test(error.message || '')) {
      return false
    }
    throw error
  }
  return true
}
