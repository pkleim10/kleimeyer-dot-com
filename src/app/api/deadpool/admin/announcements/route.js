import { NextResponse } from 'next/server'
import { requireAdmin } from '@/apps/deadpool/server/adminAuth'
import { getActiveSeasonYear } from '@/apps/deadpool/server/settings'
import {
  createGeneralAnnouncement,
  getGeneralAnnouncements,
} from '@/apps/deadpool/server/announcements'
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

  try {
    const data = await createGeneralAnnouncement({
      seasonYear: await getActiveSeasonYear(),
      title: result.title,
      body: result.body,
      postedBy: user.id,
    })
    if (!data) {
      return NextResponse.json(
        { error: 'Announcements table missing — run migrations/add_deadpool_announcements.sql first.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ announcement: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to post announcement' }, { status: 500 })
  }
}
