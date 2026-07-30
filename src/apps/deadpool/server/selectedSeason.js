import { cookies } from 'next/headers'
import { getSessionExpiry, resolveSelectedSeasonYear } from './season'

export const SEASON_COOKIE_NAME = 'deadpool_season'

export function seasonCookieOptions(expires = getSessionExpiry()) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires,
  }
}

/** Server Components / Server Actions — read the sticky season cookie. */
export async function getSelectedSeasonYear() {
  const cookieStore = await cookies()
  return resolveSelectedSeasonYear(cookieStore.get(SEASON_COOKIE_NAME)?.value)
}

/** Route Handlers — read from the request cookie jar. */
export function getSelectedSeasonYearFromRequest(request) {
  return resolveSelectedSeasonYear(request.cookies.get(SEASON_COOKIE_NAME)?.value)
}
