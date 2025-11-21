import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    console.error('Unexpected GET /api/just-for-me/medication/medications/[id]:', error)
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
    if (startDate !== undefined) updateData.start_date = startDate || null
    if (endDate !== undefined) updateData.end_date = endDate || null
    if (notes !== undefined) updateData.notes = notes?.trim() || null
    if (numberToTake !== undefined) updateData.number_to_take = numberToTake || 1
    if (format !== undefined) updateData.format = format || null
    if (indication !== undefined) updateData.indication = indication?.trim() || null
    if (groupId !== undefined) {
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
      updateData.group_id = groupId
    }

    const { data: medication, error } = await supabaseWithAuth
      .from('medications')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns the medication
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
    console.error('Unexpected PUT /api/just-for-me/medication/medications/[id]:', error)
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

    const { error } = await supabaseWithAuth
      .from('medications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns the medication

    if (error) {
      console.error('Error deleting medication:', error)
      return NextResponse.json({ error: `Failed to delete medication: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected DELETE /api/just-for-me/medication/medications/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
