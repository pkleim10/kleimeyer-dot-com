import { NextResponse } from 'next/server'
import { requireAdmin } from '@/apps/deadpool/server/adminAuth'
import { getActiveSeasonYear, setActiveSeasonYear } from '@/apps/deadpool/server/settings'

export async function GET(request) {
  const { error } = await requireAdmin(request)
  if (error) return error

  const seasonYear = await getActiveSeasonYear()
  return NextResponse.json({ seasonYear })
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
    return NextResponse.json({ seasonYear })
  } catch {
    return NextResponse.json({ error: 'season year must be a 4-digit year' }, { status: 400 })
  }
}
