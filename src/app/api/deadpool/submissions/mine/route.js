import { NextResponse } from 'next/server'
import { getServiceClient } from '@/apps/deadpool/server/db'
import { getParticipantFromRequest } from '@/apps/deadpool/server/session'
import { getActiveSeasonYear } from '@/apps/deadpool/server/settings'

export async function GET(request) {
  const participant = await getParticipantFromRequest(request)
  if (!participant) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('deadpool_submissions')
    .select('id, name, note, status, created_at, reviewed_at')
    .eq('participant_id', participant.id)
    .eq('season_year', await getActiveSeasonYear())
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to load submissions' }, { status: 500 })
  }

  return NextResponse.json({ submissions: data || [] })
}
