import { cookies } from 'next/headers'
import crypto from 'node:crypto'
import { getServiceClient } from './db'
import { getSessionExpiry } from './season'

export const SESSION_COOKIE_NAME = 'deadpool_session'

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// Constant-time compare of the submitted invite code against the real one,
// via fixed-length hash digests so mismatched input lengths can't throw.
export function isValidInviteCode(submitted) {
  const expected = process.env.DEADPOOL_INVITE_CODE
  if (!expected || !submitted) return false

  const submittedHash = crypto.createHash('sha256').update(submitted).digest()
  const expectedHash = crypto.createHash('sha256').update(expected).digest()
  return crypto.timingSafeEqual(submittedHash, expectedHash)
}

export async function createSession(participantId) {
  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashToken(rawToken)
  const expiresAt = getSessionExpiry()

  const supabase = getServiceClient()
  const { error } = await supabase.from('deadpool_sessions').insert({
    participant_id: participantId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  })
  if (error) throw error

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (rawToken) {
    const supabase = getServiceClient()
    await supabase.from('deadpool_sessions').delete().eq('token_hash', hashToken(rawToken))
  }

  cookieStore.delete(SESSION_COOKIE_NAME)
}

async function lookupParticipantByToken(rawToken) {
  if (!rawToken) return null

  const supabase = getServiceClient()
  const tokenHash = hashToken(rawToken)

  const { data: session } = await supabase
    .from('deadpool_sessions')
    .select('participant_id, expires_at')
    .eq('token_hash', tokenHash)
    .single()

  if (!session || new Date(session.expires_at).getTime() < Date.now()) {
    return null
  }

  const { data: participant } = await supabase
    .from('deadpool_participants')
    .select('id, email, display_name')
    .eq('id', session.participant_id)
    .single()

  return participant || null
}

// For Server Components / Server Actions (reads the cookie jar directly).
export async function getCurrentParticipant() {
  const cookieStore = await cookies()
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
  return lookupParticipantByToken(rawToken)
}

// For Route Handlers — every mutating/reading route re-derives identity from
// the request itself rather than trusting anything the client claims.
export async function getParticipantFromRequest(request) {
  const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value
  return lookupParticipantByToken(rawToken)
}
