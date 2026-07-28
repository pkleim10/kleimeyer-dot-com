import { getServiceClient } from './db'

// The season new registrations and admin views operate on. This is an
// explicit, admin-controlled setting (see migrations/add_deadpool_settings.sql)
// rather than derived from the real calendar date — the pool is often
// recruited for a season that hasn't started yet, and deriving it from
// "today's year" breaks the moment the calendar rolls into that year.
export async function getActiveSeasonYear() {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('deadpool_settings')
    .select('season_year')
    .eq('id', 1)
    .maybeSingle()

  if (error) throw error
  // Falls back to the real calendar year only if the settings row is
  // somehow missing (e.g. migration not yet applied) — this should not
  // happen in normal operation, since the migration seeds the row.
  return data ? data.season_year : new Date().getUTCFullYear()
}

export async function setActiveSeasonYear(seasonYear) {
  const year = Number(seasonYear)
  if (!Number.isInteger(year) || year < 2000 || year > 2999) {
    throw new Error('season year must be a 4-digit year')
  }

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('deadpool_settings')
    .upsert({ id: 1, season_year: year })
    .select('season_year')
    .single()

  if (error) throw error
  return data.season_year
}
