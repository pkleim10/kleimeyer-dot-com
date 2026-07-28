import { NextResponse } from 'next/server'
import { getServiceClient } from '@/apps/deadpool/server/db'
import { requireAdmin } from '@/apps/deadpool/server/adminAuth'

// Deleting a participant cascades to their sessions (logs them out) and
// picks (removed from all lists/scoring), and sets participant_id to NULL
// on any submissions they filed — see migrations/create_deadpool_tables.sql.
export async function DELETE(request, { params }) {
  const { error } = await requireAdmin(request)
  if (error) return error

  const { id } = await params
  const supabase = getServiceClient()

  const { data, error: deleteError } = await supabase
    .from('deadpool_participants')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to remove participant' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
