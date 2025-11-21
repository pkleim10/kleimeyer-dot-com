import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// GET - Fetch medication logs for the authenticated user
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const medicationId = searchParams.get('medicationId')

    // First get medication IDs that belong to the user
    const { data: userMedications, error: medError } = await supabaseWithAuth
      .from('medications')
      .select('id')
      .eq('user_id', user.id)

    if (medError) {
      console.error('Error fetching user medications:', medError)
      return NextResponse.json({ error: `Failed to fetch medications: ${medError.message}` }, { status: 500 })
    }

    const medicationIds = userMedications?.map(m => m.id) || []
    
    if (medicationIds.length === 0) {
      return NextResponse.json({ logs: [] })
    }

    let query = supabaseWithAuth
      .from('medication_logs')
      .select('*')
      .in('medication_id', medicationIds)

    if (startDate) {
      query = query.gte('scheduled_date', startDate)
    }
    if (endDate) {
      query = query.lte('scheduled_date', endDate)
    }
    if (medicationId) {
      query = query.eq('medication_id', medicationId)
    }

    const { data: logs, error } = await query.order('scheduled_date', { ascending: false })

    if (error) {
      console.error('Error fetching medication logs:', error)
      return NextResponse.json({ error: `Failed to fetch logs: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ logs: logs || [] })
  } catch (error) {
    console.error('Unexpected GET /api/other-fun-stuff/medication/logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create or update a medication log
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
      medicationId,
      scheduledDate,
      scheduledTime,
      timeNumber,
      takenAt
    } = body

    if (!medicationId || !scheduledDate) {
      return NextResponse.json({ error: 'Medication ID and scheduled date are required' }, { status: 400 })
    }

    // Verify medication belongs to user (required for security)
    const { data: medication, error: medError } = await supabaseWithAuth
      .from('medications')
      .select('id')
      .eq('id', medicationId)
      .eq('user_id', user.id)
      .single()

    if (medError || !medication) {
      return NextResponse.json({ error: 'Medication not found or access denied' }, { status: 403 })
    }

    // Check if log already exists and update/insert in optimized way
    let query = supabaseWithAuth
      .from('medication_logs')
      .select('id, taken_at')
      .eq('medication_id', medicationId)
      .eq('scheduled_date', scheduledDate)

    if (scheduledTime) {
      query = query.eq('scheduled_time', scheduledTime)
    } else if (timeNumber !== undefined && timeNumber !== null) {
      query = query.eq('time_number', timeNumber)
    }

    const { data: existingLogs, error: queryError } = await query

    if (queryError) {
      console.error('Error querying medication logs:', queryError)
      return NextResponse.json({ error: `Failed to query logs: ${queryError.message}` }, { status: 500 })
    }

    let log
    if (existingLogs && existingLogs.length > 0) {
      // Update existing log - only update taken_at field
      const { data: updatedLog, error: updateError } = await supabaseWithAuth
        .from('medication_logs')
        .update({ taken_at: takenAt || null })
        .eq('id', existingLogs[0].id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating medication log:', updateError)
        return NextResponse.json({ error: `Failed to update log: ${updateError.message}` }, { status: 500 })
      }

      log = updatedLog
    } else {
      // Create new log
      const insertData = {
        medication_id: medicationId,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime || null,
        time_number: timeNumber !== undefined && timeNumber !== null ? timeNumber : null,
        taken_at: takenAt || null
      }

      const { data: newLog, error: insertError } = await supabaseWithAuth
        .from('medication_logs')
        .insert(insertData)
        .select()
        .single()

      if (insertError) {
        console.error('Error creating medication log:', insertError)
        return NextResponse.json({ error: `Failed to create log: ${insertError.message}` }, { status: 500 })
      }

      log = newLog
    }

    return NextResponse.json({ log }, { status: 201 })
  } catch (error) {
    console.error('Unexpected POST /api/other-fun-stuff/medication/logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

