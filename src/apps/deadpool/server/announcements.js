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

export async function getGeneralAnnouncements(seasonYear) {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('deadpool_announcements')
    .select('id, title, body, created_at')
    .eq('season_year', seasonYear)
    .order('created_at', { ascending: false })

  if (error) {
    if (MISSING_TABLE_CODES.has(error.code)) return []
    throw error
  }
  return data || []
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
