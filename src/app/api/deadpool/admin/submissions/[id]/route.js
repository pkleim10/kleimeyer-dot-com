import { NextResponse } from 'next/server'
import { getServiceClient } from '@/apps/deadpool/server/db'
import { requireAdmin } from '@/apps/deadpool/server/adminAuth'

// Dismisses a submission without recording a death. Turning a submission
// INTO a recorded death happens via POST /api/deadpool/admin/hits with a
// submissionId, not here.
export async function PATCH(request, { params }) {
  const { user, error } = await requireAdmin(request)
  if (error) return error

  const { id } = await params
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (body?.status !== 'rejected') {
    return NextResponse.json({ error: 'Only dismissing a submission is supported here' }, { status: 400 })
  }

  const supabase = getServiceClient()
  const { data, error: updateError } = await supabase
    .from('deadpool_submissions')
    .update({ status: 'rejected', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, status')
    .single()

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
  }

  return NextResponse.json({ submission: data })
}
