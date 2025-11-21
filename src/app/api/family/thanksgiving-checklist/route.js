import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// GET - Fetch thanksgiving checklist items
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

    // Check if user has permission to view family content
    const { data: userPermissions, error: permError } = await supabaseWithAuth
      .from('user_permissions')
      .select('permission')
      .eq('user_id', user.id)

    if (permError) {
      console.error('Error fetching user permissions:', permError)
      return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 })
    }

    const hasPermission = userPermissions?.some(p => 
      p.permission === 'admin:full_access' || 
      p.permission === 'family:full_access' || 
      p.permission === 'family:view_bulletins'
    )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Access denied - family access required' }, { status: 403 })
    }

    // Fetch checklist items
    const { data: items, error } = await supabaseWithAuth
      .from('thanksgiving_checklist')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching checklist items:', error)
      // Check if table doesn't exist (common error code: 42P01)
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Database table not found. Please run the migration: migrations/create_thanksgiving_checklist.sql' 
        }, { status: 500 })
      }
      return NextResponse.json({ 
        error: `Failed to fetch checklist items: ${error.message || error.code || 'Unknown error'}` 
      }, { status: 500 })
    }

    return NextResponse.json({ items: items || [] })

  } catch (error) {
    console.error('Unexpected error in GET /api/family/thanksgiving-checklist:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new checklist item
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

    // Check if user has permission to edit family content
    const { data: userPermissions, error: permError } = await supabaseWithAuth
      .from('user_permissions')
      .select('permission')
      .eq('user_id', user.id)

    if (permError) {
      console.error('Error fetching user permissions:', permError)
      return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 })
    }

    const hasPermission = userPermissions?.some(p => 
      p.permission === 'admin:full_access' || 
      p.permission === 'family:full_access' || 
      p.permission === 'family:view_bulletins'
    )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Access denied - edit permission required' }, { status: 403 })
    }

    const body = await request.json()
    const { item, volunteer } = body

    if (!item || item.trim().length === 0) {
      return NextResponse.json({ error: 'Item is required' }, { status: 400 })
    }

    // Create new checklist item
    const { data: newItem, error } = await supabaseWithAuth
      .from('thanksgiving_checklist')
      .insert({
        item: item.trim(),
        volunteer: volunteer ? volunteer.trim() : null,
        user_id: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating checklist item:', error)
      return NextResponse.json({ error: 'Failed to create checklist item' }, { status: 500 })
    }

    return NextResponse.json({ item: newItem }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in POST /api/family/thanksgiving-checklist:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

