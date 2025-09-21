import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// GET - Test endpoint
export async function GET(request, { params }) {
  const resolvedParams = await params
  console.log('GET request received for bulletin:', resolvedParams?.id)
  return NextResponse.json({ message: 'API route is working', id: resolvedParams?.id })
}

// PUT - Update bulletin
export async function PUT(request, { params }) {
  const resolvedParams = await params
  console.log('PUT request received for bulletin:', resolvedParams?.id)
  try {
    const { id } = resolvedParams
    console.log('Processing PUT request for ID:', id)

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

    // Check if user has permission to update bulletins
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
      p.permission === 'family:edit_bulletins'
    )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden - Family access required' }, { status: 403 })
    }

    // Get request body
    const body = await request.json()
    console.log('Update bulletin request body:', body)
    const { 
      title, 
      content, 
      category, 
      priority, 
      expires_at, 
      rating,
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
      medical_provider,
      // Recurring appointment fields
      is_recurring = false,
      recurrence_start_date,
      recurrence_end_date,
      recurrence_days = [],
      recurrence_time
    } = body

    // Validate required fields
    if (!title || !category || !priority) {
      return NextResponse.json({ error: 'Title, category, and priority are required' }, { status: 400 })
    }

    // Content is required for all categories except appointments
    if (!content && category !== 'appointment') {
      return NextResponse.json({ error: 'Content is required for this category' }, { status: 400 })
    }

    // Validate recurring appointment fields if is_recurring is true
    if (is_recurring && category === 'appointment') {
      if (!recurrence_start_date || !recurrence_end_date || !recurrence_time || !recurrence_days || recurrence_days.length === 0) {
        return NextResponse.json({ error: 'Recurring appointments require start date, end date, time, and at least one day of the week' }, { status: 400 })
      }
      
      // Validate that start date is before end date
      if (new Date(recurrence_start_date) >= new Date(recurrence_end_date)) {
        return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 })
      }
      
      // Validate days of week (0-6)
      if (!recurrence_days.every(day => day >= 0 && day <= 6)) {
        return NextResponse.json({ error: 'Invalid days of week' }, { status: 400 })
      }
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

    // Validate rating if provided (0 means unrated, so skip validation)
    if (rating !== undefined && rating !== null && rating !== '' && rating !== 0 && rating !== '0') {
      const ratingNum = parseInt(rating)
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
      }
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

    // Update bulletin with specialized fields
    const updateData = {
      title,
      content,
      category,
      priority,
      expires_at: cleanTimestamp(expires_at),
      rating: rating && rating !== '' ? parseInt(rating) : null,
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
      medical_provider: medical_provider || null,
      // Recurring appointment fields
      is_recurring: is_recurring || false,
      recurrence_start_date: is_recurring ? cleanDate(recurrence_start_date) : null,
      recurrence_end_date: is_recurring ? cleanDate(recurrence_end_date) : null,
      recurrence_days: is_recurring ? recurrence_days : [],
      recurrence_time: is_recurring ? recurrence_time : null
    }
    console.log('Update data:', updateData)
    
    const { data: bulletin, error } = await supabaseWithAuth
      .from('family_bulletins')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating bulletin:', error)
      return NextResponse.json({ error: `Failed to update bulletin: ${error.message}` }, { status: 500 })
    }

    if (!bulletin) {
      return NextResponse.json({ error: 'Bulletin not found' }, { status: 404 })
    }

    return NextResponse.json({ bulletin })
  } catch (error) {
    console.error('Error in bulletin PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete bulletin
export async function DELETE(request, { params }) {
  const resolvedParams = await params
  try {
    const { id } = resolvedParams

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

    // Check if user has permission to delete bulletins
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
      p.permission === 'family:delete_bulletins'
    )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden - Family access required' }, { status: 403 })
    }

    // Delete bulletin
    const { error } = await supabaseWithAuth
      .from('family_bulletins')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting bulletin:', error)
      return NextResponse.json({ error: 'Failed to delete bulletin' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in bulletin DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
