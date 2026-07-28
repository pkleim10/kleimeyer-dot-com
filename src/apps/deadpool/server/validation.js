import { getSeasonStart } from './season'

export const MAX_PICKS = 20
export const MAX_NAME_LENGTH = 100

export function normalizeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ')
}

export function validateEmail(email) {
  const value = String(email || '').trim().toLowerCase()
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  return { value, isValid }
}

export function validateDisplayName(displayName) {
  const value = normalizeName(displayName)
  return { value, isValid: value.length > 0 && value.length <= 60 }
}

// Trims, drops blanks, case-insensitively dedupes (keeping first occurrence),
// and enforces the per-name length and list-size caps.
export function validatePickList(names) {
  if (!Array.isArray(names)) {
    return { error: 'names must be an array' }
  }

  const seen = new Set()
  const cleaned = []

  for (const raw of names) {
    const name = normalizeName(raw)
    if (!name) continue
    if (name.length > MAX_NAME_LENGTH) {
      return { error: `"${name.slice(0, 40)}" is too long (max ${MAX_NAME_LENGTH} characters)` }
    }
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    cleaned.push(name)
  }

  if (cleaned.length > MAX_PICKS) {
    return { error: `A pick list can have at most ${MAX_PICKS} names` }
  }

  return { names: cleaned }
}

export function validateSubmission({ name, note }) {
  const cleanedName = normalizeName(name)
  if (!cleanedName) return { error: 'A name is required' }
  if (cleanedName.length > MAX_NAME_LENGTH) {
    return { error: `Name is too long (max ${MAX_NAME_LENGTH} characters)` }
  }
  const cleanedNote = note ? String(note).trim().slice(0, 500) : null
  return { name: cleanedName, note: cleanedNote }
}

export const MAX_ANNOUNCEMENT_TITLE = 120
export const MAX_ANNOUNCEMENT_BODY = 2000

// General (non-death) notices posted by the commissioner. Title is optional;
// the body is the notice itself and is required.
export function validateAnnouncement({ title, body }) {
  const cleanedBody = String(body || '').trim()
  if (!cleanedBody) return { error: 'An announcement needs some text' }
  if (cleanedBody.length > MAX_ANNOUNCEMENT_BODY) {
    return { error: `Announcement is too long (max ${MAX_ANNOUNCEMENT_BODY} characters)` }
  }

  const cleanedTitle = normalizeName(title)
  if (cleanedTitle.length > MAX_ANNOUNCEMENT_TITLE) {
    return { error: `Title is too long (max ${MAX_ANNOUNCEMENT_TITLE} characters)` }
  }

  return { title: cleanedTitle || null, body: cleanedBody }
}

export function validateHit(seasonYear, { displayName, dateOfDeath, ageAtDeath, announcementText }) {
  const cleanedName = normalizeName(displayName)
  if (!cleanedName) return { error: 'A name is required' }
  if (cleanedName.length > MAX_NAME_LENGTH) {
    return { error: `Name is too long (max ${MAX_NAME_LENGTH} characters)` }
  }

  const age = Number(ageAtDeath)
  if (!Number.isInteger(age) || age < 0 || age > 130) {
    return { error: 'Age at death must be a whole number between 0 and 130' }
  }

  const date = new Date(dateOfDeath)
  if (Number.isNaN(date.getTime())) {
    return { error: 'A valid date of death is required' }
  }

  // A hit belongs to the season it's recorded under, so its death date can't
  // predate that season's Jan 1 start. This also closes a privacy side-door:
  // pick lists stay private until the season starts, and a hit's `pickedBy`
  // reveals picker identity — without this guard, a hit dated before the
  // season start could leak that identity ahead of schedule.
  if (date.getTime() < getSeasonStart(seasonYear).getTime()) {
    return { error: `Date of death can't be before the ${seasonYear} season starts (Jan 1)` }
  }

  const cleanedAnnouncement = announcementText ? String(announcementText).trim().slice(0, 1000) : null

  return {
    displayName: cleanedName,
    dateOfDeath: date.toISOString().slice(0, 10),
    ageAtDeath: age,
    announcementText: cleanedAnnouncement,
  }
}
