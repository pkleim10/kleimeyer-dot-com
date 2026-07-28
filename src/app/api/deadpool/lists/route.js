import { NextResponse } from 'next/server'
import { getParticipantFromRequest } from '@/apps/deadpool/server/session'
import { getAllListsAnnotated } from '@/apps/deadpool/server/scoring'
import { hasSeasonStarted } from '@/apps/deadpool/server/season'
import { getActiveSeasonYear } from '@/apps/deadpool/server/settings'

export async function GET(request) {
  const participant = await getParticipantFromRequest(request)
  if (!participant) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const seasonYear = await getActiveSeasonYear()
  const seasonStarted = hasSeasonStarted(seasonYear)
  const lists = await getAllListsAnnotated(seasonYear)

  // Lists stay private to their owner until the season starts.
  const visibleLists = seasonStarted
    ? lists
    : lists.filter((entry) => entry.participantId === participant.id)

  return NextResponse.json({ lists: visibleLists, seasonStarted })
}
