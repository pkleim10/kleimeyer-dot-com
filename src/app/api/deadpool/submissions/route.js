import { NextResponse } from 'next/server'
import { getServiceClient } from '@/apps/deadpool/server/db'
import { getParticipantFromRequest } from '@/apps/deadpool/server/session'
import { validateSubmission } from '@/apps/deadpool/server/validation'
import { getSelectedSeasonYearFromRequest } from '@/apps/deadpool/server/selectedSeason'

export async function POST(request) {
  const participant = await getParticipantFromRequest(request)
  if (!participant) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const result = validateSubmission(body || {})
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('deadpool_submissions')
    .insert({
      participant_id: participant.id,
      season_year: getSelectedSeasonYearFromRequest(request),
      name: result.name,
      note: result.note,
    })
    .select('id, name, note, status, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to submit tip' }, { status: 500 })
  }

  return NextResponse.json({ submission: data }, { status: 201 })
}
