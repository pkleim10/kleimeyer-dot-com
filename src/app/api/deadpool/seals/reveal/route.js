import { NextResponse } from 'next/server'
import { getServiceClient } from '@/apps/deadpool/server/db'
import { getParticipantFromRequest } from '@/apps/deadpool/server/session'
import { getSelectedSeasonYearFromRequest } from '@/apps/deadpool/server/selectedSeason'
import { areListsPublic } from '@/apps/deadpool/server/season'
import { getActiveSeal, recordReveal } from '@/apps/deadpool/server/seals'
import {
  createGeneralAnnouncement,
  revealAnnouncementCopy,
} from '@/apps/deadpool/server/announcements'
import { validatePickList } from '@/apps/deadpool/server/validation'
import { parseList, computeFingerprint } from '@/apps/deadpool/shared/sealedList'

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

  const seasonYear = getSelectedSeasonYearFromRequest(request)

  // Plaintext is only ever accepted after the lock. Before it, accepting a
  // list here would put names on the server and destroy the guarantee.
  if (!areListsPublic(seasonYear)) {
    return NextResponse.json(
      { error: "Lists can't be revealed until the season opens." },
      { status: 403 }
    )
  }

  const seal = await getActiveSeal(participant.id, seasonYear)
  if (!seal) {
    // No commitment means no entry. Otherwise someone could turn up after the
    // reveal, read everyone's lists, and submit a perfectly informed one.
    return NextResponse.json(
      { error: 'You have no sealed list for this season, so a list cannot be accepted now.' },
      { status: 403 }
    )
  }

  const names = parseList(body?.list)
  const secret = body?.secret

  // Same validation the seal step ran, so an accepted seal can always be
  // revealed — a list that passes there must pass here.
  const validated = validatePickList(names)
  if (validated.error) {
    return NextResponse.json({ error: validated.error }, { status: 400 })
  }

  // Recompute from the submitted plaintext. Comparing a client-supplied
  // fingerprint against the stored one would let anyone post any list
  // alongside their old fingerprint and have it accepted.
  const fingerprint = await computeFingerprint({ names, secret, seasonYear })
  if (fingerprint !== seal.fingerprint) {
    return NextResponse.json(
      {
        error:
          "That doesn't match your sealed list. Check you pasted the same list and secret you sealed with.",
        expected: seal.fingerprint,
        got: fingerprint,
      },
      { status: 409 }
    )
  }

  const supabase = getServiceClient()
  const { data, error } = await supabase.rpc('deadpool_replace_picks', {
    p_participant_id: participant.id,
    p_season_year: seasonYear,
    p_names: validated.names,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to save revealed list' }, { status: 500 })
  }

  // Publish the nonce now that the list is public, so every other player can
  // recompute this fingerprint themselves instead of trusting the server.
  await recordReveal(participant.id, seasonYear, String(secret ?? ''))

  // Reveal succeeds even if the notice can't be posted (missing table, etc.).
  try {
    await createGeneralAnnouncement({
      seasonYear,
      ...revealAnnouncementCopy({ displayName: participant.display_name }),
    })
  } catch (announceError) {
    console.error('Failed to announce reveal:', announceError)
  }

  return NextResponse.json({
    picks: (data || []).map((p) => ({ id: p.id, name: p.name })),
    fingerprint,
  })
}
