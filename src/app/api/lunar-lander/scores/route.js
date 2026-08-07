import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const TOP_N = 10

function adminClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function fetchTopScores(supabase) {
  const { data, error } = await supabase
    .from('lunar_lander_scores')
    .select('id, initials, score, created_at')
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(TOP_N)

  if (error) throw error
  return data || []
}

/** GET — top 10 scores (highest first). */
export async function GET() {
  try {
    const supabase = adminClient()
    const scores = await fetchTopScores(supabase)
    return NextResponse.json({ scores })
  } catch (err) {
    console.error('lunar-lander scores GET:', err)
    return NextResponse.json({ error: 'Failed to load scores' }, { status: 500 })
  }
}

/**
 * POST — submit a score if it qualifies for the top 10.
 * Body: { initials: "ABC", score: 1234 }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const initials = String(body?.initials || '')
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 3)
    const score = Number(body?.score)

    if (initials.length !== 3) {
      return NextResponse.json({ error: 'Initials must be 3 letters A–Z' }, { status: 400 })
    }
    if (!Number.isInteger(score) || score < 0 || score > 9999999) {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
    }

    const supabase = adminClient()
    const current = await fetchTopScores(supabase)
    const qualifies =
      current.length < TOP_N || score > (current[current.length - 1]?.score ?? 0)

    if (!qualifies) {
      return NextResponse.json({
        accepted: false,
        reason: 'Score does not qualify for top 10',
        scores: current,
      })
    }

    const { error: insertError } = await supabase
      .from('lunar_lander_scores')
      .insert({ initials, score })

    if (insertError) {
      console.error('lunar-lander scores insert:', insertError)
      return NextResponse.json({ error: 'Failed to save score' }, { status: 500 })
    }

    // Trim anything beyond top 10 so the table stays small
    const { data: ranked, error: rankError } = await supabase
      .from('lunar_lander_scores')
      .select('id')
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })

    if (!rankError && ranked && ranked.length > TOP_N) {
      const dropIds = ranked.slice(TOP_N).map((r) => r.id)
      await supabase.from('lunar_lander_scores').delete().in('id', dropIds)
    }

    const scores = await fetchTopScores(supabase)
    return NextResponse.json({ accepted: true, scores })
  } catch (err) {
    console.error('lunar-lander scores POST:', err)
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 })
  }
}
