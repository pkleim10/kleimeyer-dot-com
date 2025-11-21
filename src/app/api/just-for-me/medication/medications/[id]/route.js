import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// GET - Fetch a specific medication
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
      return NextResponse.json({ error: 'Failed to fetch medication' }, { status: 500 })
    }

    return NextResponse.json({ medication })
  } catch (error) {
    console.error('Error in medication GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a medication
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

    const updates = {}
    if (body.name !== undefined) updates.name = body.name.trim()
    if (body.dosage !== undefined) updates.dosage = body.dosage?.trim() || null
    if (body.frequencyType !== undefined) updates.frequency_type = body.frequencyType
    if (body.timesPerDay !== undefined) updates.times_per_day = body.timesPerDay || null
    if (body.specificTimes !== undefined) updates.specific_times = body.specificTimes || null
    if (body.frequencyPattern !== undefined) updates.frequency_pattern = body.frequencyPattern || null
    if (body.everyXDays !== undefined) updates.every_x_days = body.everyXDays || null
    if (body.specificDays !== undefined) updates.specific_days = body.specificDays || null
    if (body.withFood !== undefined) updates.with_food = body.withFood
    if (body.startDate !== undefined) updates.start_date = body.startDate || null
    if (body.endDate !== undefined) updates.end_date = body.endDate || null
    if (body.notes !== undefined) updates.notes = body.notes?.trim() || null
    if (body.numberToTake !== undefined) updates.number_to_take = body.numberToTake
    if (body.format !== undefined) updates.format = body.format || null
    if (body.indication !== undefined) updates.indication = body.indication?.trim() || null
    if (body.groupId !== undefined) updates.group_id = body.groupId

    const { data: medication, error } = await supabaseWithAuth
      .from('medications')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Medication not found' }, { status: 404 })
      }
      console.error('Error updating medication:', error)
      return NextResponse.json({ error: 'Failed to update medication' }, { status: 500 })
    }

    return NextResponse.json({ medication })
  } catch (error) {
    console.error('Error in medication PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a medication
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

    const { error } = await supabaseWithAuth
      .from('medications')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting medication:', error)
      return NextResponse.json({ error: 'Failed to delete medication' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in medication DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

