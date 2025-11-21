import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// GET - Fetch medications (optionally filtered by group_id)
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

    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('group_id')

    console.log('Fetching medications:', { userId: user.id, groupId: groupId || 'all' })

    let query = supabaseWithAuth
      .from('medications')
      .select('*')
      .order('created_at', { ascending: false })

    if (groupId) {
      query = query.eq('group_id', groupId)
    }

    const { data: medications, error, count } = await query

    if (error) {
      console.error('Error fetching medications:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId: user.id,
        groupId: groupId || 'none'
      })
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Database tables not found. Please run the migration SQL file in Supabase.' 
        }, { status: 500 })
      }
      return NextResponse.json({ error: `Failed to fetch medications: ${error.message}` }, { status: 500 })
    }

    console.log('Medications query result:', {
      count: medications?.length || 0,
      userId: user.id,
      groupId: groupId || 'all',
      error: error ? { code: error.code, message: error.message } : null,
      medications: medications?.slice(0, 5).map(m => ({ id: m.id, name: m.name, group_id: m.group_id })) || []
    })
    
    // Also check if we can query groups to verify RLS is working
    const { data: groupsCheck } = await supabaseWithAuth
      .from('medication_groups')
      .select('id, name, user_id')
      .limit(5)
    console.log('Groups check (for RLS verification):', groupsCheck?.length || 0, groupsCheck)

    return NextResponse.json({ medications: medications || [] })
  } catch (error) {
    console.error('Error in medications GET:', error)
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

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Medication name is required' }, { status: 400 })
    }

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 })
    }

    // Verify group exists and user has access
    const { data: group, error: groupError } = await supabaseWithAuth
      .from('medication_groups')
      .select('id, accessible_by, user_id')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Check permission for shared groups
    if (group.accessible_by === 'shared' && group.user_id !== user.id) {
      const { data: userPermissions } = await supabaseWithAuth
        .from('user_permissions')
        .select('permission')
        .eq('user_id', user.id)

      const hasPermission = userPermissions?.some(p => 
        p.permission === 'admin:full_access' || 
        p.permission === 'medication:edit_shared_groups'
      )

      if (!hasPermission) {
        return NextResponse.json({ error: 'Permission denied for shared groups' }, { status: 403 })
      }
    }

    const { data: medication, error } = await supabaseWithAuth
      .from('medications')
      .insert({
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
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating medication:', error)
      return NextResponse.json({ error: 'Failed to create medication' }, { status: 500 })
    }

    return NextResponse.json({ medication })
  } catch (error) {
    console.error('Error in medications POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

