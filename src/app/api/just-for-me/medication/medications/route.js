import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// GET - Fetch all medications for the authenticated user
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    const { data: { user }, error: authError } = await supabaseWithAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch medications - RLS will handle filtering
    const { data: medications, error } = await supabaseWithAuth
      .from('medications')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching medications:', error)
      return NextResponse.json({ error: `Failed to fetch medications: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ medications: medications || [] })
  } catch (error) {
    console.error('Unexpected GET /api/just-for-me/medication/medications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new medication
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    const { data: { user }, error: authError } = await supabaseWithAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      groupId,
      name,
      dosage,
      frequencyType,
      timesPerDay,
      specificTimes,
      frequencyPattern,
      everyXDays,
      specificDays,
      withFood,
      startDate,
      endDate,
      notes,
      numberToTake,
      format,
      indication
    } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 })
    }

    // Verify group belongs to user
    const { data: group, error: groupError } = await supabaseWithAuth
      .from('medication_groups')
      .select('id')
      .eq('id', groupId)
      .eq('user_id', user.id)
      .single()

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found or access denied' }, { status: 403 })
    }

    const insertData = {
      group_id: groupId,
      user_id: user.id,
      name: name.trim(),
      dosage: dosage?.trim() || null,
      frequency_type: frequencyType,
      times_per_day: timesPerDay || null,
      specific_times: specificTimes || null,
      frequency_pattern: frequencyPattern || null,
      every_x_days: everyXDays || null,
      specific_days: specificDays || null,
      with_food: withFood || false,
      start_date: startDate || null,
      end_date: endDate || null,
      notes: notes?.trim() || null,
      number_to_take: numberToTake || 1,
      format: format || null,
      indication: indication?.trim() || null
    }

    const { data: medication, error } = await supabaseWithAuth
      .from('medications')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating medication:', error)
      return NextResponse.json({ error: `Failed to create medication: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ medication }, { status: 201 })
  } catch (error) {
    console.error('Unexpected POST /api/just-for-me/medication/medications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
