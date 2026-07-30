// Season/cutoff math is UTC-based for simplicity, except the pick deadline
// itself, which is anchored to Mountain Standard Time per the rules page.
//
// Players pick a season via a sticky cookie (selectedSeason.js). Availability
// is calendar-based (this year; next year from July 1). Admin tools keep a
// separate season_year in settings.js for hit/tip scope.

/**
 * "Now" for season lock / reveal gating. When DEADPOOL_NOW is a valid ISO
 * timestamp (local/dev only), pretend that instant is the current time so
 * post-Jan-1 flows can be exercised without waiting for the real calendar.
 * Invalid or unset values fall through to the real clock.
 */
export function getSeasonNow(env = process.env) {
  const raw = env.DEADPOOL_NOW
  if (raw == null || String(raw).trim() === '') return new Date()
  const parsed = new Date(String(raw).trim())
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

/**
 * Newest season that becomes selectable on/after 1 July UTC (calendar year + 1).
 * Before July, equals the calendar year.
 */
export function getScheduledSeasonYear(now = getSeasonNow()) {
  const y = now.getUTCFullYear()
  return now.getUTCMonth() >= 6 ? y + 1 : y
}

// One-time hole: there was no 2026 Dead Pool, so never offer it in the picker.
const EXCLUDED_SEASON_YEARS = new Set([2026])

function calendarSeasonYears(now) {
  const y = now.getUTCFullYear()
  return now.getUTCMonth() >= 6 ? [y, y + 1] : [y]
}

/**
 * Seasons a player may select.
 * Jan–Jun: [calendarYear]. Jul–Dec: [calendarYear, calendarYear + 1].
 * Excludes years that never ran a pool (currently just 2026).
 */
export function getAvailableSeasonYears(now = getSeasonNow()) {
  const years = calendarSeasonYears(now).filter((y) => !EXCLUDED_SEASON_YEARS.has(y))
  if (years.length > 0) return years
  // If the only calendar option was excluded (e.g. H1 2026), offer next year.
  const fallback = now.getUTCFullYear() + 1
  return EXCLUDED_SEASON_YEARS.has(fallback) ? [] : [fallback]
}

/**
 * Default selection: the in-progress calendar year when it is offered;
 * otherwise the earliest available year (so H2 2026 defaults to 2027).
 */
export function getDefaultSeasonYear(now = getSeasonNow()) {
  const available = getAvailableSeasonYears(now)
  const cal = now.getUTCFullYear()
  if (available.includes(cal)) return cal
  return available[0] ?? cal
}

/** Validate a sticky/cookie value; fall back to the default available year. */
export function resolveSelectedSeasonYear(raw, now = getSeasonNow()) {
  const year = Number(raw)
  const available = getAvailableSeasonYears(now)
  if (Number.isInteger(year) && available.includes(year)) return year
  return getDefaultSeasonYear(now)
}

// The single boundary instant `T`: 11:59:59pm Mountain Standard Time (UTC-7
// fixed, not Mountain Daylight Time) on Dec 31 of the year *preceding* the
// season, expressed as 06:59:59 UTC on Jan 1 of the season year.
//
// This previously used `seasonYear + 1`, which put the deadline at the end of
// the season instead of just before it — lists went public at the season start
// while picks stayed editable for the following 365 days, so anyone could read
// every list and then change their own. Picks must lock *before* the season.
export function getPickDeadline(seasonYear) {
  return new Date(Date.UTC(seasonYear, 0, 1, 6, 59, 59))
}

export function isPicksEditable(seasonYear, now = getSeasonNow()) {
  return now.getTime() <= getPickDeadline(seasonYear).getTime()
}

// Exact complement of isPicksEditable, deliberately sharing one instant: lists
// become public at precisely the moment picks lock. Any gap between the two
// would be a window in which someone could read other lists and still edit
// their own, which is the hole this whole design exists to close.
export function areListsPublic(seasonYear, now = getSeasonNow()) {
  return !isPicksEditable(seasonYear, now)
}

// The scoring window — the earliest date a death can count. Deliberately
// distinct from `T` and calendar-based: date_of_death is a date-only value that
// parses as UTC midnight, so a death dated Jan 1 must remain valid even though
// `T` falls at 06:59:59 UTC that same day.
export function getSeasonStart(seasonYear) {
  return new Date(Date.UTC(seasonYear, 0, 1, 0, 0, 0))
}

// Chrome (and the emerging cross-browser standard) silently clamps any
// cookie's Expires/Max-Age to 400 days regardless of what a server
// requests — so 400 days is effectively the longest a session can persist
// in practice, not an arbitrary choice. Signing in keeps a device signed
// in for that long; there's no shorter, separate timeout to work around
// when switching devices — that's handled by the Sign In flow instead
// (email only, no invite code needed for a returning participant).
const SESSION_DURATION_DAYS = 400

export function getSessionExpiry(now = new Date()) {
  return new Date(now.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000)
}
