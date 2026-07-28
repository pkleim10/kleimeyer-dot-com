import { NextResponse } from 'next/server'
import { getServiceClient } from '@/apps/deadpool/server/db'
import { createSession, isValidInviteCode } from '@/apps/deadpool/server/session'
import { validateEmail, validateDisplayName } from '@/apps/deadpool/server/validation'

// Doubles as the "login" flow for returning participants: re-submitting the
// same email + the invite code just re-issues a session cookie. Participants
// are permanent identities (one row per email, forever) — which season
// they're "in" is determined by whether they have picks for it, not by
// their registration.
export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { email, displayName, inviteCode } = body || {}

  if (!isValidInviteCode(inviteCode)) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 401 })
  }

  const emailResult = validateEmail(email)
  if (!emailResult.isValid) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }

  const nameResult = validateDisplayName(displayName)
  if (!nameResult.isValid) {
    return NextResponse.json({ error: 'A display name (1-60 characters) is required' }, { status: 400 })
  }

  const supabase = getServiceClient()

  const { data: existing, error: lookupError } = await supabase
    .from('deadpool_participants')
    .select('id, display_name')
    .eq('email_normalized', emailResult.value)
    .maybeSingle()

  if (lookupError) {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }

  let participant = existing

  if (participant) {
    if (participant.display_name !== nameResult.value) {
      const { data: updated, error: updateError } = await supabase
        .from('deadpool_participants')
        .update({ display_name: nameResult.value })
        .eq('id', participant.id)
        .select('id, display_name')
        .single()
      if (updateError) {
        return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
      }
      participant = updated
    }
  } else {
    const { data: created, error: insertError } = await supabase
      .from('deadpool_participants')
      .insert({ email: emailResult.value, display_name: nameResult.value })
      .select('id, display_name')
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        // Race: someone else registered with this email between our lookup and insert.
        const { data: raced } = await supabase
          .from('deadpool_participants')
          .select('id, display_name')
          .eq('email_normalized', emailResult.value)
          .single()
        participant = raced
      } else {
        return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
      }
    } else {
      participant = created
    }
  }

  if (!participant) {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }

  await createSession(participant.id)

  return NextResponse.json({ participant: { id: participant.id, displayName: participant.display_name } })
}
