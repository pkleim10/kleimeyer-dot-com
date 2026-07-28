import { NextResponse } from 'next/server'
import { clearSession } from '@/apps/deadpool/server/session'

export async function POST() {
  await clearSession()
  return NextResponse.json({ ok: true })
}
