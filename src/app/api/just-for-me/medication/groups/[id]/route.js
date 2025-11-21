import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// GET - Fetch a specific medication group
export async function GET(request, { params }) {
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

    const { id } = params

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
      return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 })
    }

    return NextResponse.json({ group })
  } catch (error) {
    console.error('Error in group GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a medication group
export async function PUT(request, { params }) {
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

    const { id } = params
    const body = await request.json()
    const { name, accessibleBy } = body

    const updates = {}
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return NextResponse.json({ error: 'Group name cannot be empty' }, { status: 400 })
      }
      updates.name = name.trim()
    }
    if (accessibleBy !== undefined) {
      // Check permission for shared groups
      if (accessibleBy === 'shared') {
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
      updates.accessible_by = accessibleBy
    }

    const { data: group, error } = await supabaseWithAuth
      .from('medication_groups')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 })
      }
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A group with this name already exists' }, { status: 400 })
      }
      console.error('Error updating medication group:', error)
      return NextResponse.json({ error: 'Failed to update group' }, { status: 500 })
    }

    return NextResponse.json({ group })
  } catch (error) {
    console.error('Error in group PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a medication group
export async function DELETE(request, { params }) {
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

    const { id } = params

    // Check if group exists and get accessible_by for permission check
    const { data: group, error: fetchError } = await supabaseWithAuth
      .from('medication_groups')
      .select('accessible_by')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 })
    }

    // Check permission for shared groups
    if (group.accessible_by === 'shared') {
      const { data: userPermissions } = await supabaseWithAuth
        .from('user_permissions')
        .select('permission')
        .eq('user_id', user.id)

      const hasPermission = userPermissions?.some(p => 
        p.permission === 'admin:full_access' || 
        p.permission === 'medication:delete_shared_groups'
      )

      if (!hasPermission) {
        return NextResponse.json({ error: 'Permission denied for shared groups' }, { status: 403 })
      }
    }

    const { error } = await supabaseWithAuth
      .from('medication_groups')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting medication group:', error)
      return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in group DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

