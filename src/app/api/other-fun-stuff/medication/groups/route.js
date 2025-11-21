import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Transform snake_case to camelCase for group data
function transformGroup(group) {
  if (!group) return null
  const { accessible_by, day_start_time, day_end_time, created_at, updated_at, ...rest } = group
  return {
    ...rest,
    accessibleBy: accessible_by,
    dayStartTime: day_start_time,
    dayEndTime: day_end_time,
    createdAt: created_at,
    updatedAt: updated_at
  }
}

// GET - Fetch all medication groups for the authenticated user
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

    // Fetch groups - RLS will handle filtering
    const { data: groups, error } = await supabaseWithAuth
      .from('medication_groups')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching medication groups:', error)
      return NextResponse.json({ error: `Failed to fetch groups: ${error.message}` }, { status: 500 })
    }

    // Transform groups from snake_case to camelCase
    const transformedGroups = (groups || []).map(transformGroup)

    return NextResponse.json({ groups: transformedGroups })
  } catch (error) {
    console.error('Error in GET /api/other-fun-stuff/medication/groups:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new medication group
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
    const { name, accessibleBy, dayStartTime, dayEndTime } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const insertData = {
      user_id: user.id,
      name: name.trim(),
      accessible_by: accessibleBy || 'only_me'
    }

    // Add day times if provided, convert HH:MM to HH:MM:SS format
    if (dayStartTime) {
      insertData.day_start_time = dayStartTime.length === 5 ? `${dayStartTime}:00` : dayStartTime
    }
    if (dayEndTime) {
      insertData.day_end_time = dayEndTime.length === 5 ? `${dayEndTime}:00` : dayEndTime
    }

    const { data: group, error } = await supabaseWithAuth
      .from('medication_groups')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating medication group:', error)
      return NextResponse.json({ error: `Failed to create group: ${error.message}` }, { status: 500 })
    }

    // Transform group from snake_case to camelCase
    const transformedGroup = transformGroup(group)

    return NextResponse.json({ group: transformedGroup }, { status: 201 })
  } catch (error) {
    console.error('Unexpected POST /api/other-fun-stuff/medication/groups:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

