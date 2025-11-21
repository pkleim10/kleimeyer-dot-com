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
    console.error('Unexpected GET /api/other-fun-stuff/medication/groups/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a medication group
export async function PUT(request, { params }) {
  try {
    const resolvedParams = await params
    const id = resolvedParams?.id
    
    if (!id) {
      console.error('No group ID provided in request')
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 })
    }
    
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

    console.log('PUT /api/other-fun-stuff/medication/groups/[id] - Request received')
    console.log('Group ID from params:', id)
    console.log('User ID:', user.id)
    console.log('Request body:', JSON.stringify(body, null, 2))

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
    if (dayStartTime !== undefined) {
      // Convert HH:MM to HH:MM:SS format if needed
      updateData.day_start_time = dayStartTime.length === 5 ? `${dayStartTime}:00` : dayStartTime
    }
    if (dayEndTime !== undefined) {
      // Convert HH:MM to HH:MM:SS format if needed
      updateData.day_end_time = dayEndTime.length === 5 ? `${dayEndTime}:00` : dayEndTime
    }

    console.log('Update data prepared:', JSON.stringify(updateData, null, 2))

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // First, verify the group exists
    const { data: groupData, error: groupError } = await supabaseWithAuth
      .from('medication_groups')
      .select('id, name, user_id, accessible_by')
      .eq('id', id)
      .single()

    if (groupError) {
      console.error('Group check error:', groupError)
      if (groupError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 })
      }
      return NextResponse.json({ error: `Failed to verify group: ${groupError.message}` }, { status: 500 })
    }

    if (!groupData) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Check if user owns the group
    const ownsGroup = groupData.user_id === user.id

    // If not owner, check if it's a shared group and user has edit permissions
    if (!ownsGroup) {
      if (groupData.accessible_by !== 'shared') {
        return NextResponse.json({ 
          error: 'You do not have permission to update this group' 
        }, { status: 403 })
      }

      // Check if user has permission to edit shared groups
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
        p.permission === 'medication:edit_shared_groups'
      )

      if (!hasPermission) {
        return NextResponse.json({ 
          error: 'You do not have permission to edit shared medication groups' 
        }, { status: 403 })
      }
    }

    // Now perform the update
    // Use RLS policies to handle permissions - don't filter by user_id since shared groups are allowed
    const { data: group, error } = await supabaseWithAuth
      .from('medication_groups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating medication group:', error)
      console.error('Update data:', JSON.stringify(updateData, null, 2))
      console.error('Group ID:', id)
      console.error('User ID:', user.id)
      
      // Check for common database errors
      const errorMessage = error.message || ''
      if (errorMessage.includes('column') && (errorMessage.includes('does not exist') || errorMessage.includes('unknown'))) {
        return NextResponse.json({ 
          error: 'Database schema error: The day_start_time and day_end_time columns do not exist. Please run the migration file: migrations/add_day_times_to_medication_groups.sql in your Supabase SQL Editor.' 
        }, { status: 500 })
      }
      
      if (error.code === 'PGRST116') {
        // Update returned no rows - this shouldn't happen if group exists
        return NextResponse.json({ 
          error: 'Update failed: The update query returned no rows. This may indicate a database schema issue or permission problem.' 
        }, { status: 500 })
      }
      
      return NextResponse.json({ error: `Failed to update group: ${error.message || error.code || 'Unknown error'}` }, { status: 500 })
    }

    if (!group) {
      return NextResponse.json({ error: 'Update succeeded but no data was returned' }, { status: 500 })
    }

    // Transform group from snake_case to camelCase
    const transformedGroup = transformGroup(group)

    return NextResponse.json({ group: transformedGroup })
  } catch (error) {
    console.error('Unexpected PUT /api/other-fun-stuff/medication/groups/[id]:', error)
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
    console.error('Unexpected DELETE /api/other-fun-stuff/medication/groups/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

