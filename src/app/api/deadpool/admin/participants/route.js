import { NextResponse } from 'next/server'
import { getServiceClient } from '@/apps/deadpool/server/db'
import { requireAdmin } from '@/apps/deadpool/server/adminAuth'
import { getActiveSeasonYear } from '@/apps/deadpool/server/settings'

export async function GET(request) {
  const { error } = await requireAdmin(request)
  if (error) return error

  const supabase = getServiceClient()
  const seasonYear = await getActiveSeasonYear()

  // Participants are permanent identities, not season-scoped, so this lists
  // everyone who's ever registered — inActiveSeason flags who actually has
  // a pick list for the currently active season.
  const [{ data: participants, error: participantsError }, { data: picks, error: picksError }] =
    await Promise.all([
      supabase
        .from('deadpool_participants')
        .select('id, display_name, email, created_at')
        .order('display_name'),
      supabase.from('deadpool_picks').select('participant_id').eq('season_year', seasonYear),
    ])

  if (participantsError || picksError) {
    return NextResponse.json({ error: 'Failed to load participants' }, { status: 500 })
  }

  const activeIds = new Set((picks || []).map((pick) => pick.participant_id))
  const result = (participants || []).map((participant) => ({
    ...participant,
    inActiveSeason: activeIds.has(participant.id),
  }))

  return NextResponse.json({ participants: result })
}
