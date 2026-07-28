// Season/cutoff math is UTC-based for simplicity, except the pick deadline
// itself, which is anchored to Mountain Standard Time per the rules page.
//
// Note: which season_year is "active" right now is an explicit admin
// setting (see server/settings.js), not derived from the real calendar —
// see that module's comment for why.

// 11:59:59pm Mountain Standard Time (UTC-7, fixed — not Mountain Daylight
// Time) on Dec 31 of the given season, expressed as 06:59:59 UTC on Jan 1
// of the following year.
export function getPickDeadline(seasonYear) {
  return new Date(Date.UTC(seasonYear + 1, 0, 1, 6, 59, 59))
}

export function isPicksEditable(seasonYear, now = new Date()) {
  return now.getTime() <= getPickDeadline(seasonYear).getTime()
}

export function getSeasonStart(seasonYear) {
  return new Date(Date.UTC(seasonYear, 0, 1, 0, 0, 0))
}

// Before the season starts, picks are still being made — lists stay
// private so no one can copy another participant's picks and blunt their
// uniqueness bonus. Once the season starts, every list becomes visible.
export function hasSeasonStarted(seasonYear, now = new Date()) {
  return now.getTime() >= getSeasonStart(seasonYear).getTime()
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
