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
  const { accessible_by, created_at, updated_at, ...rest } = group
  return {
    ...rest,
    accessibleBy: accessible_by,
    createdAt: created_at,
    updatedAt: updated_at
  }
}

// GET - Get a specific medication group
export async function GET(request, { params }) {
  try {
    const { id } = await params
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

    const { data: group, error } = await supabaseWithAuth
      .from('medication_groups')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 })
      }
      console.error('Error fetching medication group:', error)
      return NextResponse.json({ error: `Failed to fetch group: ${error.message}` }, { status: 500 })
    }

    // Transform group from snake_case to camelCase
    const transformedGroup = transformGroup(group)

    return NextResponse.json({ group: transformedGroup })
  } catch (error) {
    console.error('Unexpected GET /api/just-for-me/medication/groups/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a medication group
export async function PUT(request, { params }) {
  try {
    const { id } = await params
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

    const updateData = {}
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      }
      updateData.name = name.trim()
    }
    if (accessibleBy !== undefined) {
      updateData.accessible_by = accessibleBy
    }

    const { data: group, error } = await supabaseWithAuth
      .from('medication_groups')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns the group
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 })
      }
      console.error('Error updating medication group:', error)
      return NextResponse.json({ error: `Failed to update group: ${error.message}` }, { status: 500 })
    }

    // Transform group from snake_case to camelCase
    const transformedGroup = transformGroup(group)

    return NextResponse.json({ group: transformedGroup })
  } catch (error) {
    console.error('Unexpected PUT /api/just-for-me/medication/groups/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a medication group
export async function DELETE(request, { params }) {
  try {
    const { id } = await params
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

    const { error } = await supabaseWithAuth
      .from('medication_groups')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns the group

    if (error) {
      console.error('Error deleting medication group:', error)
      return NextResponse.json({ error: `Failed to delete group: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected DELETE /api/just-for-me/medication/groups/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

