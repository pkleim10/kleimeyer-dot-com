import { NextResponse } from 'next/server'
import { getServiceClient } from '@/apps/deadpool/server/db'
import { requireAdmin } from '@/apps/deadpool/server/adminAuth'
import { validateHit } from '@/apps/deadpool/server/validation'

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

  const supabase = getServiceClient()

  const { data: existing, error: fetchError } = await supabase
    .from('deadpool_hits')
    .select('season_year')
    .eq('id', id)
    .single()
  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Hit not found' }, { status: 404 })
  }

  const result = validateHit(existing.season_year, body || {})
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const { data, error: updateError } = await supabase
    .from('deadpool_hits')
    .update({
      display_name: result.displayName,
      date_of_death: result.dateOfDeath,
      age_at_death: result.ageAtDeath,
      announcement_text: result.announcementText,
    })
    .eq('id', id)
    .select('id, display_name, date_of_death, age_at_death, announcement_text')
    .single()

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update hit' }, { status: 500 })
  }

  return NextResponse.json({ hit: data })
}

export async function DELETE(request, { params }) {
  const { error } = await requireAdmin(request)
  if (error) return error

  const { id } = await params
  const supabase = getServiceClient()
  const { error: deleteError } = await supabase.from('deadpool_hits').delete().eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete hit' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
