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
    if (activeOnly) {
      query = query.eq('is_active', true)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (priority) {
      query = query.eq('priority', priority)
    }

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
    const { title, content, category, priority, expires_at, is_active = true } = body

    // Validate required fields
    if (!title || !content || !category || !priority) {
      return NextResponse.json({ error: 'Title, content, category, and priority are required' }, { status: 400 })
    }

    // Validate category and priority values
    const validCategories = ['appointment', 'payment', 'website', 'general']
    const validPriorities = ['high', 'medium', 'low']

    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    if (!validPriorities.includes(priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
    }

    // Create bulletin
    const { data: bulletin, error } = await supabaseWithAuth
      .from('family_bulletins')
      .insert({
        title,
        content,
        category,
        priority,
        expires_at: expires_at || null,
        is_active
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
