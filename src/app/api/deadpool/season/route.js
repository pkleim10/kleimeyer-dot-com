import { NextResponse } from 'next/server'
import {
  getAvailableSeasonYears,
  getSeasonNow,
  resolveSelectedSeasonYear,
} from '@/apps/deadpool/server/season'
import {
  SEASON_COOKIE_NAME,
  seasonCookieOptions,
} from '@/apps/deadpool/server/selectedSeason'

export async function GET() {
  const now = getSeasonNow()
  return NextResponse.json({
    available: getAvailableSeasonYears(now),
    default: resolveSelectedSeasonYear(undefined, now),
  })
}

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const now = getSeasonNow()
  const available = getAvailableSeasonYears(now)
  const year = Number(body?.seasonYear)
  if (!Number.isInteger(year) || !available.includes(year)) {
    return NextResponse.json(
      { error: `Season must be one of: ${available.join(', ')}` },
      { status: 400 }
    )
  }

  const response = NextResponse.json({ seasonYear: year, available })
  response.cookies.set(SEASON_COOKIE_NAME, String(year), seasonCookieOptions())
  return response
}
