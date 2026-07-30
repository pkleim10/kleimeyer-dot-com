import { getServiceClient } from './db'
import { getScheduledSeasonYear, getSeasonNow } from './season'

// Admin-tools season scope (hit recording, tips queue, etc.).
// Player-facing pages use the sticky per-user selection in selectedSeason.js —
// not this value — so this year's scoring and next year's sealing can coexist.

export async function getSeasonSettings() {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('deadpool_settings')
    .select('season_year')
    .eq('id', 1)
    .maybeSingle()

  if (error) throw error

  const scheduledSeasonYear = getScheduledSeasonYear(getSeasonNow())
  return {
    seasonYear: data ? data.season_year : scheduledSeasonYear,
    scheduledSeasonYear,
  }
}

export async function getActiveSeasonYear() {
  const { seasonYear } = await getSeasonSettings()
  return seasonYear
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
