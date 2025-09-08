import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// GET - Fetch bulletins
export async function GET(request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Set the auth token for this request
    const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    // Verify the user's session
    const { data: { user }, error: authError } = await supabaseWithAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'
    const category = searchParams.get('category')
    const priority = searchParams.get('priority')

    // Build query
    let query = supabaseWithAuth
      .from('family_bulletins')
      .select('*')
      .order('priority', { ascending: false })
      .order('expires_at', { ascending: true })
      .order('created_at', { ascending: false })

    // Apply filters
    // Note: activeOnly filter is no longer needed since we removed is_active column
    // All non-expired announcements are considered "active"
    if (category) {
      query = query.eq('category', category)
    }
    if (priority) {
      query = query.eq('priority', priority)
    }
    
    // Filter out expired announcements
    const now = new Date().toISOString()
    query = query.or(`expires_at.is.null,expires_at.gt.${now}`)

    const { data: bulletins, error } = await query

    if (error) {
      console.error('Error fetching bulletins:', error)
      return NextResponse.json({ error: 'Failed to fetch bulletins' }, { status: 500 })
    }

    return NextResponse.json({ bulletins: bulletins || [] })
  } catch (error) {
    console.error('Error in bulletins GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new bulletin
export async function POST(request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Set the auth token for this request
    const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    // Verify the user's session
    const { data: { user }, error: authError } = await supabaseWithAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is contributor or admin
    const { data: userRole, error: roleError } = await supabaseWithAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !['contributor', 'admin', 'family'].includes(userRole?.role)) {
      return NextResponse.json({ error: 'Forbidden - Family access required' }, { status: 403 })
    }

    // Get request body
    const body = await request.json()
    const { 
      title, 
      content, 
      category, 
      priority, 
      expires_at, 
      // Specialized fields
      url,
      website_email,
      website_password,
      appointment_datetime,
      appointment_location,
      payment_amount,
      payment_due_date,
      payment_reference,
      payment_recipient,
      action_required = false,
      medical_provider
    } = body

    // Validate required fields
    if (!title || !content || !category || !priority) {
      return NextResponse.json({ error: 'Title, content, category, and priority are required' }, { status: 400 })
    }

    // Validate category and priority values
    const validCategories = ['appointment', 'payment', 'website', 'general', 'medical']
    const validPriorities = ['high', 'medium', 'low']

    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    if (!validPriorities.includes(priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
    }

    // Helper function to handle empty strings for timestamp fields
    const cleanTimestamp = (value) => {
      if (!value || value === '' || value === 'null') return null
      return value
    }

    // Helper function to handle empty strings for date fields
    const cleanDate = (value) => {
      if (!value || value === '' || value === 'null') return null
      return value
    }

    // Create bulletin with specialized fields
    const { data: bulletin, error } = await supabaseWithAuth
      .from('family_bulletins')
      .insert({
        title,
        content,
        category,
        priority,
        expires_at: cleanTimestamp(expires_at),
        // Specialized fields
        url: url || null,
        website_email: website_email || null,
        website_password: website_password || null,
        appointment_datetime: cleanTimestamp(appointment_datetime),
        appointment_location: appointment_location || null,
        payment_amount: payment_amount || null,
        payment_due_date: cleanDate(payment_due_date),
        payment_reference: payment_reference || null,
        payment_recipient: payment_recipient || null,
        action_required: action_required || false,
        medical_provider: medical_provider || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating bulletin:', error)
      return NextResponse.json({ error: 'Failed to create bulletin' }, { status: 500 })
    }

    return NextResponse.json({ bulletin })
  } catch (error) {
    console.error('Error in bulletins POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
