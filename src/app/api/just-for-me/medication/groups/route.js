import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
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
      // Check if table doesn't exist (common error code)
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Database tables not found. Please run the migration SQL file in Supabase.' 
        }, { status: 500 })
      }
      return NextResponse.json({ error: `Failed to fetch groups: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ groups: groups || [] })
  } catch (error) {
    console.error('Error in groups GET:', error)
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
    const { name, accessibleBy } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
    }

    // Check permission for shared groups
    if (accessibleBy === 'shared') {
      const { data: userPermissions } = await supabaseWithAuth
        .from('user_permissions')
        .select('permission')
        .eq('user_id', user.id)

      const hasPermission = userPermissions?.some(p => 
        p.permission === 'admin:full_access' || 
        p.permission === 'medication:create_shared_groups'
      )

      if (!hasPermission) {
        return NextResponse.json({ error: 'Permission denied for shared groups' }, { status: 403 })
      }
    }

    const { data: group, error } = await supabaseWithAuth
      .from('medication_groups')
      .insert({
        user_id: user.id,
        name: name.trim(),
        accessible_by: accessibleBy || 'only_me'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating medication group:', error)
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'A group with this name already exists' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
    }

    return NextResponse.json({ group })
  } catch (error) {
    console.error('Error in groups POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

