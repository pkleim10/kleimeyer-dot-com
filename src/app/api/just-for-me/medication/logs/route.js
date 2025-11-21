import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// GET - Fetch medication logs (optionally filtered by medication_id and date range)
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
    const medicationId = searchParams.get('medication_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabaseWithAuth
      .from('medication_logs')
      .select('*')
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true })

    if (medicationId) {
      query = query.eq('medication_id', medicationId)
    }
    if (startDate) {
      query = query.gte('scheduled_date', startDate)
    }
    if (endDate) {
      query = query.lte('scheduled_date', endDate)
    }

    const { data: logs, error } = await query

    if (error) {
      console.error('Error fetching medication logs:', error)
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
    }

    return NextResponse.json({ logs: logs || [] })
  } catch (error) {
    console.error('Error in logs GET:', error)
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

    // Check if log already exists
    let query = supabaseWithAuth
      .from('medication_logs')
      .select('*')
      .eq('medication_id', medicationId)
      .eq('scheduled_date', scheduledDate)

    if (scheduledTime) {
      query = query.eq('scheduled_time', scheduledTime)
    } else if (timeNumber !== undefined) {
      query = query.eq('time_number', timeNumber)
    }

    const { data: existingLogs } = await query

    let result
    if (existingLogs && existingLogs.length > 0) {
      // Update existing log
      const existingLog = existingLogs[0]
      const { data: log, error } = await supabaseWithAuth
        .from('medication_logs')
        .update({
          taken_at: takenAt || null
        })
        .eq('id', existingLog.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating medication log:', error)
        return NextResponse.json({ error: 'Failed to update log' }, { status: 500 })
      }
      result = log
    } else {
      // Create new log
      const { data: log, error } = await supabaseWithAuth
        .from('medication_logs')
        .insert({
          medication_id: medicationId,
          user_id: user.id,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime || null,
          time_number: timeNumber || null,
          taken_at: takenAt || null
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating medication log:', error)
        return NextResponse.json({ error: 'Failed to create log' }, { status: 500 })
      }
      result = log
    }

    return NextResponse.json({ log: result })
  } catch (error) {
    console.error('Error in logs POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

