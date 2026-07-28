import { NextResponse } from 'next/server'
import { getServiceClient } from '@/apps/deadpool/server/db'
import { requireAdmin } from '@/apps/deadpool/server/adminAuth'
import { validateAnnouncement } from '@/apps/deadpool/server/validation'

export async function PATCH(request, { params }) {
  const { error } = await requireAdmin(request)
  if (error) return error

  const { id } = await params
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
  const { data, error: updateError } = await supabase
    .from('deadpool_announcements')
    .update({ title: result.title, body: result.body })
    .eq('id', id)
    .select('id, title, body, created_at')
    .maybeSingle()

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
  }

  return NextResponse.json({ announcement: data })
}

export async function DELETE(request, { params }) {
  const { error } = await requireAdmin(request)
  if (error) return error

  const { id } = await params
  const supabase = getServiceClient()
  const { data, error: deleteError } = await supabase
    .from('deadpool_announcements')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
