import { NextResponse } from 'next/server'
import { getServiceClient } from '@/apps/deadpool/server/db'
import { requireAdmin } from '@/apps/deadpool/server/adminAuth'
import { getActiveSeasonYear } from '@/apps/deadpool/server/settings'

// Distinct picked names this season, sorted by pick count — powers an
// autocomplete on the admin death-recording form so a typed name is likely
// to exact-match existing picks (mitigates silent scoring misses from typos).
export async function GET(request) {
  const { error } = await requireAdmin(request)
  if (error) return error

  const supabase = getServiceClient()
  const seasonYear = await getActiveSeasonYear()

  const { data, error: queryError } = await supabase
    .from('deadpool_picks')
    .select('name, name_normalized')
    .eq('season_year', seasonYear)

  if (queryError) {
    return NextResponse.json({ error: 'Failed to load pick names' }, { status: 500 })
  }

  const counts = new Map() // name_normalized -> { name, count }
  for (const pick of data || []) {
    const existing = counts.get(pick.name_normalized)
    if (existing) {
      existing.count += 1
    } else {
      counts.set(pick.name_normalized, { name: pick.name, count: 1 })
    }
  }

  const names = Array.from(counts.values()).sort((a, b) => b.count - a.count)

  return NextResponse.json({ names })
}
