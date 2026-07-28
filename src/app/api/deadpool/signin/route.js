import { NextResponse } from 'next/server'
import { getServiceClient } from '@/apps/deadpool/server/db'
import { createSession } from '@/apps/deadpool/server/session'
import { validateEmail } from '@/apps/deadpool/server/validation'

// Lightweight sign-in for a returning participant on a new device: email
// only, no invite code. Register (which requires the invite code) still
// works as a fallback sign-in too — this just doesn't force someone to dig
// up the shared code again to use a second device.
export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const emailResult = validateEmail(body?.email)
  if (!emailResult.isValid) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }

  const supabase = getServiceClient()
  const { data: participant, error } = await supabase
    .from('deadpool_participants')
    .select('id, display_name')
    .eq('email_normalized', emailResult.value)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Sign in failed' }, { status: 500 })
  }

  if (!participant) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  await createSession(participant.id)

  return NextResponse.json({ participant: { id: participant.id, displayName: participant.display_name } })
}
