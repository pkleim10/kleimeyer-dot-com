import { NextResponse } from 'next/server'
import { requireAdmin } from '@/apps/deadpool/server/adminAuth'
import { getSeasonSettings, setActiveSeasonYear } from '@/apps/deadpool/server/settings'

export async function GET(request) {
  const { error } = await requireAdmin(request)
  if (error) return error

  try {
    const settings = await getSeasonSettings()
    return NextResponse.json(settings)
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to load settings' }, { status: 500 })
  }
}

export async function PATCH(request) {
  const { error } = await requireAdmin(request)
  if (error) return error

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const seasonYear = await setActiveSeasonYear(body?.seasonYear)
    const settings = await getSeasonSettings()
    return NextResponse.json({ ...settings, seasonYear })
  } catch {
    return NextResponse.json({ error: 'season year must be a 4-digit year' }, { status: 400 })
  }
}
