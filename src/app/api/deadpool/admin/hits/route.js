import { NextResponse } from 'next/server'
import { getServiceClient } from '@/apps/deadpool/server/db'
import { requireAdmin } from '@/apps/deadpool/server/adminAuth'
import { getActiveSeasonYear } from '@/apps/deadpool/server/settings'
import { validateHit } from '@/apps/deadpool/server/validation'

export async function GET(request) {
  const { error } = await requireAdmin(request)
  if (error) return error

  const supabase = getServiceClient()
  const seasonYear = await getActiveSeasonYear()
  const { data, error: queryError } = await supabase
    .from('deadpool_hits')
    .select('id, display_name, date_of_death, age_at_death, announcement_text, created_at')
    .eq('season_year', seasonYear)
    .order('date_of_death', { ascending: false })

  if (queryError) {
    return NextResponse.json({ error: 'Failed to load hits' }, { status: 500 })
  }

  return NextResponse.json({ hits: data || [] })
}

// Accepts an optional `submissionId` — when present, the corresponding
// deadpool_submissions row is marked approved and linked to the new hit in
// the same request, so "record a death from a tip" is one action.
export async function POST(request) {
  const { user, error } = await requireAdmin(request)
  if (error) return error

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const seasonYear = await getActiveSeasonYear()
  const result = validateHit(seasonYear, body || {})
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const supabase = getServiceClient()

  const { data: hit, error: insertError } = await supabase
    .from('deadpool_hits')
    .insert({
      season_year: seasonYear,
      display_name: result.displayName,
      date_of_death: result.dateOfDeath,
      age_at_death: result.ageAtDeath,
      announcement_text: result.announcementText,
      recorded_by: user.id,
    })
    .select('id, display_name, date_of_death, age_at_death, announcement_text')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      const normalized = result.displayName.trim().toLowerCase()
      const { data: existingHit } = await supabase
        .from('deadpool_hits')
        .select('id, display_name, date_of_death, age_at_death')
        .eq('season_year', seasonYear)
        .eq('name_normalized', normalized)
        .maybeSingle()
      return NextResponse.json(
        { error: 'A death for this name is already recorded this season', existing: existingHit || null },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Failed to record death' }, { status: 500 })
  }

  const submissionId = body?.submissionId
  if (submissionId) {
    await supabase
      .from('deadpool_submissions')
      .update({
        status: 'approved',
        resolved_hit_id: hit.id,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submissionId)
  }

  return NextResponse.json({ hit }, { status: 201 })
}
