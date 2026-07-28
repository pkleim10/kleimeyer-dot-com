import { NextResponse } from 'next/server'
import { getParticipantFromRequest } from '@/apps/deadpool/server/session'
import { getAnnouncementFeed } from '@/apps/deadpool/server/announcements'
import { getActiveSeasonYear } from '@/apps/deadpool/server/settings'

// The combined feed: recorded deaths plus the commissioner's general notices,
// interleaved chronologically. (/api/deadpool/hits stays deaths-only, since
// the Dead So Far recap needs just those.)
export async function GET(request) {
  const participant = await getParticipantFromRequest(request)
  if (!participant) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const items = await getAnnouncementFeed(await getActiveSeasonYear())
  return NextResponse.json({ items })
}
