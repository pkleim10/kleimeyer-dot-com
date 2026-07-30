import { NextResponse } from 'next/server'
import { getServiceClient } from '@/apps/deadpool/server/db'
import { getParticipantFromRequest } from '@/apps/deadpool/server/session'
import { getPicksForParticipant } from '@/apps/deadpool/server/picks'
import { isPicksEditable, getPickDeadline } from '@/apps/deadpool/server/season'
import { getSelectedSeasonYearFromRequest } from '@/apps/deadpool/server/selectedSeason'
import { validatePickList } from '@/apps/deadpool/server/validation'

export async function GET(request) {
  const participant = await getParticipantFromRequest(request)
  if (!participant) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const seasonYear = getSelectedSeasonYearFromRequest(request)
  const picks = await getPicksForParticipant(participant.id, seasonYear)

  return NextResponse.json({
    picks,
    isEditable: isPicksEditable(seasonYear),
    deadline: getPickDeadline(seasonYear).toISOString(),
  })
}

// Full-list replace: the client always sends the complete desired list, not
// an incremental add/remove — see deadpool_replace_picks() in the migration
// for the atomic delete+insert this calls into.
export async function PUT(request) {
  const participant = await getParticipantFromRequest(request)
  if (!participant) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const seasonYear = getSelectedSeasonYearFromRequest(request)
  if (!isPicksEditable(seasonYear)) {
    return NextResponse.json({ error: 'Picks are locked for this season' }, { status: 403 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const result = validatePickList(body?.names)
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const supabase = getServiceClient()
  const { data, error } = await supabase.rpc('deadpool_replace_picks', {
    p_participant_id: participant.id,
    p_season_year: seasonYear,
    p_names: result.names,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to save picks' }, { status: 500 })
  }

  return NextResponse.json({ picks: (data || []).map((p) => ({ id: p.id, name: p.name })) })
}
