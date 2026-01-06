import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isFamilyOrAdmin, verifyAuth } from '@/utils/roleChecks'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// GET - Get a specific medication
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

    const { data: medication, error } = await supabaseWithAuth
      .from('medications')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Medication not found' }, { status: 404 })
      }
      console.error('Error fetching medication:', error)
      return NextResponse.json({ error: `Failed to fetch medication: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ medication })
  } catch (error) {
    console.error('Unexpected GET /api/other-fun-stuff/medication/medications/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a medication
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
      discontinued,
      startDate,
      endDate,
      notes,
      numberToTake,
      format,
      indication
    } = body

    const updateData = {}
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      }
      updateData.name = name.trim()
    }
    if (dosage !== undefined) updateData.dosage = dosage?.trim() || null
    if (frequencyType !== undefined) updateData.frequency_type = frequencyType
    if (timesPerDay !== undefined) updateData.times_per_day = timesPerDay || null
    if (specificTimes !== undefined) updateData.specific_times = specificTimes || null
    if (frequencyPattern !== undefined) updateData.frequency_pattern = frequencyPattern || null
    if (everyXDays !== undefined) updateData.every_x_days = everyXDays || null
    if (specificDays !== undefined) updateData.specific_days = specificDays || null
    if (withFood !== undefined) updateData.with_food = withFood
    if (discontinued !== undefined) updateData.discontinued = Boolean(discontinued)
    if (startDate !== undefined) updateData.start_date = startDate || null
    if (endDate !== undefined) updateData.end_date = endDate || null
    if (notes !== undefined) updateData.notes = notes?.trim() || null
    if (numberToTake !== undefined) updateData.number_to_take = numberToTake || 1
    if (format !== undefined) updateData.format = format || null
    if (indication !== undefined) updateData.indication = indication?.trim() || null
    if (groupId !== undefined) {
      // Verify group access: user must own the group OR have permission to access shared groups
      const { data: group, error: groupError } = await supabaseWithAuth
        .from('medication_groups')
        .select('id, user_id, accessible_by')
        .eq('id', groupId)
        .single()

      if (groupError || !group) {
        console.error('Error fetching group:', groupError)
        return NextResponse.json({ error: 'Group not found or access denied' }, { status: 403 })
      }

      // Check if user owns the group
      const ownsGroup = group.user_id === user.id

      // If not owner, check if it's a shared group and user is Family or Admin
      if (!ownsGroup) {
        if (group.accessible_by !== 'shared') {
          return NextResponse.json({ error: 'Group not found or access denied' }, { status: 403 })
        }

        // Check if user is Family or Admin (for shared groups)
        if (!(await isFamilyOrAdmin(token))) {
          return NextResponse.json({ error: 'Group not found or access denied' }, { status: 403 })
        }
      }
      
      updateData.group_id = groupId
    }

    // First, verify the medication exists
    const { data: medicationData, error: medicationError } = await supabaseWithAuth
      .from('medications')
      .select('id, user_id, group_id')
      .eq('id', id)
      .single()

    if (medicationError) {
      console.error('Medication check error:', medicationError)
      if (medicationError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Medication not found' }, { status: 404 })
      }
      return NextResponse.json({ error: `Failed to verify medication: ${medicationError.message}` }, { status: 500 })
    }

    if (!medicationData) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 })
    }

    // Check if user owns the medication
    const ownsMedication = medicationData.user_id === user.id

    // If not owner, check if medication belongs to a shared group and user is Family or Admin
    if (!ownsMedication) {
      if (!medicationData.group_id) {
        return NextResponse.json({ 
          error: 'You do not have permission to update this medication' 
        }, { status: 403 })
      }

      // Fetch the group to check if it's shared
      const { data: group, error: groupError } = await supabaseWithAuth
        .from('medication_groups')
        .select('id, user_id, accessible_by')
        .eq('id', medicationData.group_id)
        .single()

      if (groupError || !group) {
        console.error('Error fetching group:', groupError)
        return NextResponse.json({ 
          error: 'You do not have permission to update this medication' 
        }, { status: 403 })
      }

      if (group.accessible_by !== 'shared') {
        return NextResponse.json({ 
          error: 'You do not have permission to update this medication' 
        }, { status: 403 })
      }

      // Check if user is Family or Admin (for shared groups)
      if (!(await isFamilyOrAdmin(token))) {
        return NextResponse.json({ 
          error: 'You do not have permission to edit medications in shared groups' 
        }, { status: 403 })
      }
    }

    // Now perform the update
    // Use RLS policies to handle permissions - don't filter by user_id since shared groups are allowed
    const { data: medication, error } = await supabaseWithAuth
      .from('medications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Medication not found' }, { status: 404 })
      }
      console.error('Error updating medication:', error)
      return NextResponse.json({ error: `Failed to update medication: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ medication })
  } catch (error) {
    console.error('Unexpected PUT /api/other-fun-stuff/medication/medications/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a medication
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

    // First, verify the medication exists
    const { data: medicationData, error: medicationError } = await supabaseWithAuth
      .from('medications')
      .select('id, user_id, group_id')
      .eq('id', id)
      .single()

    if (medicationError) {
      console.error('Medication check error:', medicationError)
      if (medicationError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Medication not found' }, { status: 404 })
      }
      return NextResponse.json({ error: `Failed to verify medication: ${medicationError.message}` }, { status: 500 })
    }

    if (!medicationData) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 })
    }

    // Check if user owns the medication
    const ownsMedication = medicationData.user_id === user.id

    // If not owner, check if medication belongs to a shared group and user is Family or Admin
    if (!ownsMedication) {
      if (!medicationData.group_id) {
        return NextResponse.json({ 
          error: 'You do not have permission to delete this medication' 
        }, { status: 403 })
      }

      // Fetch the group to check if it's shared
      const { data: group, error: groupError } = await supabaseWithAuth
        .from('medication_groups')
        .select('id, user_id, accessible_by')
        .eq('id', medicationData.group_id)
        .single()

      if (groupError || !group) {
        console.error('Error fetching group:', groupError)
        return NextResponse.json({ 
          error: 'You do not have permission to delete this medication' 
        }, { status: 403 })
      }

      if (group.accessible_by !== 'shared') {
        return NextResponse.json({ 
          error: 'You do not have permission to delete this medication' 
        }, { status: 403 })
      }

      // Check if user is Family or Admin (for shared groups)
      if (!(await isFamilyOrAdmin(token))) {
        return NextResponse.json({ 
          error: 'You do not have permission to delete medications in shared groups' 
        }, { status: 403 })
      }
    }

    // Now perform the delete
    // Use RLS policies to handle permissions - don't filter by user_id since shared groups are allowed
    const { error } = await supabaseWithAuth
      .from('medications')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting medication:', error)
      return NextResponse.json({ error: `Failed to delete medication: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected DELETE /api/other-fun-stuff/medication/medications/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
