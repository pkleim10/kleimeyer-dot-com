import { NextResponse } from 'next/server'
import { getParticipantFromRequest } from '@/apps/deadpool/server/session'
import { getLeaderboard } from '@/apps/deadpool/server/scoring'
import { getActiveSeasonYear } from '@/apps/deadpool/server/settings'

export async function GET(request) {
  const participant = await getParticipantFromRequest(request)
  if (!participant) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const leaderboard = await getLeaderboard(await getActiveSeasonYear(), 20)
  return NextResponse.json({ leaderboard })
}
