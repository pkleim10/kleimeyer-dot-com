import { NextResponse } from 'next/server'
import { getServiceClient } from '@/apps/deadpool/server/db'
import { requireAdmin } from '@/apps/deadpool/server/adminAuth'
import { getActiveSeasonYear } from '@/apps/deadpool/server/settings'

export async function GET(request) {
  const { error } = await requireAdmin(request)
  if (error) return error

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'pending'

  const supabase = getServiceClient()
  const seasonYear = await getActiveSeasonYear()

  let query = supabase
    .from('deadpool_submissions')
    .select('id, name, note, status, created_at, reviewed_at, deadpool_participants(display_name)')
    .eq('season_year', seasonYear)
    .order('created_at', { ascending: true })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error: queryError } = await query

  if (queryError) {
    return NextResponse.json({ error: 'Failed to load submissions' }, { status: 500 })
  }

  const submissions = (data || []).map((submission) => ({
    id: submission.id,
    name: submission.name,
    note: submission.note,
    status: submission.status,
    createdAt: submission.created_at,
    reviewedAt: submission.reviewed_at,
    submittedBy: submission.deadpool_participants?.display_name || null,
  }))

  return NextResponse.json({ submissions })
}
