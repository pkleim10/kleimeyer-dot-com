import { NextResponse } from 'next/server'
import { getParticipantFromRequest } from '@/apps/deadpool/server/session'
import { getHitsWithPickers } from '@/apps/deadpool/server/scoring'
import { getSelectedSeasonYearFromRequest } from '@/apps/deadpool/server/selectedSeason'

// Shared data source for the Announcements and Dead So Far pages.
export async function GET(request) {
  const participant = await getParticipantFromRequest(request)
  if (!participant) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const hits = await getHitsWithPickers(getSelectedSeasonYearFromRequest(request))
  return NextResponse.json({ hits })
}
