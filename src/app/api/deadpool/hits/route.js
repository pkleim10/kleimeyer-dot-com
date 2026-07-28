import { NextResponse } from 'next/server'
import { getParticipantFromRequest } from '@/apps/deadpool/server/session'
import { getHitsWithPickers } from '@/apps/deadpool/server/scoring'
import { getActiveSeasonYear } from '@/apps/deadpool/server/settings'

// Shared data source for the Announcements and Dead So Far pages.
export async function GET(request) {
  const participant = await getParticipantFromRequest(request)
  if (!participant) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const hits = await getHitsWithPickers(await getActiveSeasonYear())
  return NextResponse.json({ hits })
}
