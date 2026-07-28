import { NextResponse } from 'next/server'
import { getParticipantFromRequest } from '@/apps/deadpool/server/session'

// Convenience endpoint for client components to detect a session that
// expired after a mutating call returned 401 — pages themselves gate on the
// server-rendered result of getCurrentParticipant(), not this route.
export async function GET(request) {
  const participant = await getParticipantFromRequest(request)
  if (!participant) {
    return NextResponse.json({ participant: null }, { status: 401 })
  }
  return NextResponse.json({
    participant: { id: participant.id, displayName: participant.display_name },
  })
}
