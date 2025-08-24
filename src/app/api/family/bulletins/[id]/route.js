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

    // Check if user is contributor, admin, or family
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
    console.log('Update bulletin request body:', body)
    const { 
      title, 
      content, 
      category, 
      priority, 
      expires_at, 
      is_active,
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

    // Update bulletin with specialized fields
    const updateData = {
      title,
      content,
      category,
      priority,
      expires_at: cleanTimestamp(expires_at),
      is_active,
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

    // Check if user is contributor, admin, or family
    const { data: userRole, error: roleError } = await supabaseWithAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !['contributor', 'admin', 'family'].includes(userRole?.role)) {
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
