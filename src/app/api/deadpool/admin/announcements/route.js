import { NextResponse } from 'next/server'
import { getServiceClient } from '@/apps/deadpool/server/db'
import { requireAdmin } from '@/apps/deadpool/server/adminAuth'
import { getActiveSeasonYear } from '@/apps/deadpool/server/settings'
import { getGeneralAnnouncements } from '@/apps/deadpool/server/announcements'
import { validateAnnouncement } from '@/apps/deadpool/server/validation'

export async function GET(request) {
  const { error } = await requireAdmin(request)
  if (error) return error

  const announcements = await getGeneralAnnouncements(await getActiveSeasonYear())
  return NextResponse.json({ announcements })
}

export async function POST(request) {
  const { user, error } = await requireAdmin(request)
  if (error) return error

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const result = validateAnnouncement(body || {})
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const supabase = getServiceClient()
  const { data, error: insertError } = await supabase
    .from('deadpool_announcements')
    .insert({
      season_year: await getActiveSeasonYear(),
      title: result.title,
      body: result.body,
      posted_by: user.id,
    })
    .select('id, title, body, created_at')
    .single()

  if (insertError) {
    // Migrations are applied by hand, so surface the likely cause instead of
    // a generic failure the commissioner would have to guess at.
    if (insertError.code === 'PGRST205' || insertError.code === '42P01') {
      return NextResponse.json(
        { error: 'Announcements table missing — run migrations/add_deadpool_announcements.sql first.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: 'Failed to post announcement' }, { status: 500 })
  }

  return NextResponse.json({ announcement: data }, { status: 201 })
}
