import { NextResponse } from 'next/server'
import { verifyAuth, isAdmin } from '@/utils/roleChecks'

// Reuses the site's real Supabase Auth + user_roles admin check (same
// pattern as src/app/api/admin/users/route.js) — the pool's admin actions
// are gated by the real site owner's login, not the lightweight participant
// session used everywhere else in this app.
export async function requireAdmin(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const token = authHeader.replace('Bearer ', '')
  const authResult = await verifyAuth(token)
  if (!authResult) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (!(await isAdmin(token))) {
    return { error: NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 }) }
  }

  return { user: authResult.user }
}
