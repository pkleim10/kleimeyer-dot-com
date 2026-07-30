import { NextResponse } from 'next/server'
import { getParticipantFromRequest } from '@/apps/deadpool/server/session'
import { getSelectedSeasonYearFromRequest } from '@/apps/deadpool/server/selectedSeason'
import { isPicksEditable } from '@/apps/deadpool/server/season'
import { getActiveSeal, getSeals, replaceSeal } from '@/apps/deadpool/server/seals'
import {
  createGeneralAnnouncement,
  sealAnnouncementCopy,
} from '@/apps/deadpool/server/announcements'

// Every participant can read every fingerprint. That's the mechanism, not a
// leak: a commitment witnessed by the whole pool can't be quietly altered
// later. Fingerprints reveal nothing about the picks behind them.
export async function GET(request) {
  const participant = await getParticipantFromRequest(request)
  if (!participant) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const seals = await getSeals(getSelectedSeasonYearFromRequest(request))
  return NextResponse.json({ seals })
}

const FINGERPRINT = /^[0-9a-f]{64}$/

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

  // Refuse anything that looks like plaintext picks. The whole guarantee is
  // that names never reach the server before the reveal, so a payload carrying
  // them is rejected outright rather than quietly ignored — that way a client
  // bug can't silently erode the property this feature exists to provide.
  if (body && (body.names !== undefined || body.list !== undefined || body.secret !== undefined)) {
    return NextResponse.json(
      { error: 'Only a fingerprint may be sent when sealing — never the list or secret.' },
      { status: 400 }
    )
  }

  const fingerprint = String(body?.fingerprint || '').trim().toLowerCase()
  if (!FINGERPRINT.test(fingerprint)) {
    return NextResponse.json({ error: 'A valid fingerprint is required' }, { status: 400 })
  }

  const seasonYear = getSelectedSeasonYearFromRequest(request)
  if (!isPicksEditable(seasonYear)) {
    return NextResponse.json(
      { error: 'Sealing has closed for this season.' },
      { status: 403 }
    )
  }

  try {
    // Capture whether this is a first seal or a re-seal before replaceSeal
    // supersedes the prior row — that distinction drives the announcement copy.
    const existing = await getActiveSeal(participant.id, seasonYear)
    const seal = await replaceSeal(participant.id, seasonYear, fingerprint)

    // Sealing succeeds even if the notice can't be posted (missing table, etc.).
    try {
      await createGeneralAnnouncement({
        seasonYear,
        ...sealAnnouncementCopy({
          displayName: participant.display_name,
          resealed: Boolean(existing),
        }),
      })
    } catch (announceError) {
      console.error('Failed to announce seal:', announceError)
    }

    return NextResponse.json({ seal }, { status: 201 })
  } catch (error) {
    if (error?.code === 'PGRST205' || error?.code === '42P01') {
      return NextResponse.json(
        { error: 'Seals table missing — run migrations/add_deadpool_seals.sql first.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: 'Failed to seal list' }, { status: 500 })
  }
}
