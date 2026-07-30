import { NextResponse } from 'next/server'
import { getParticipantFromRequest } from '@/apps/deadpool/server/session'
import { getAllListsAnnotated } from '@/apps/deadpool/server/scoring'
import { areListsPublic } from '@/apps/deadpool/server/season'
import { getSelectedSeasonYearFromRequest } from '@/apps/deadpool/server/selectedSeason'

export async function GET(request) {
  const participant = await getParticipantFromRequest(request)
  if (!participant) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const seasonYear = getSelectedSeasonYearFromRequest(request)
  const seasonStarted = areListsPublic(seasonYear)
  const lists = await getAllListsAnnotated(seasonYear)

  // Lists stay private to their owner until the season starts.
  const visibleLists = seasonStarted
    ? lists
    : lists.filter((entry) => entry.participantId === participant.id)

  return NextResponse.json({ lists: visibleLists, seasonStarted })
}
