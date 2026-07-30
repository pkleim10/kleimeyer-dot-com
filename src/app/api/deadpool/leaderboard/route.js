import { NextResponse } from 'next/server'
import { getParticipantFromRequest } from '@/apps/deadpool/server/session'
import { getLeaderboard } from '@/apps/deadpool/server/scoring'
import { getSelectedSeasonYearFromRequest } from '@/apps/deadpool/server/selectedSeason'

export async function GET(request) {
  const participant = await getParticipantFromRequest(request)
  if (!participant) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const leaderboard = await getLeaderboard(getSelectedSeasonYearFromRequest(request), 20)
  return NextResponse.json({ leaderboard })
}
