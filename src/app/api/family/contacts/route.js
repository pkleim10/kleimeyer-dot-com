import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// GET - Fetch family contacts
export async function GET(request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Create a client with the user's token
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

    // Check if user has permission to view contacts
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
      p.permission === 'family:view_contacts'
    )

    if (!hasPermission) {
      console.log('Access denied - no contact view permission for user:', user.id)
      return NextResponse.json({ error: 'Access denied - family access required' }, { status: 403 })
    }

    console.log('User has contact view permission')

    // Fetch contacts
    const { data: contacts, error } = await supabaseWithAuth
      .from('family_contacts')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching contacts:', error)
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
    }

    return NextResponse.json({ contacts: contacts || [] })

  } catch (error) {
    console.error('Unexpected error in GET /api/family/contacts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new contact
export async function POST(request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Create a client with the user's token
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

    // Check if user has permission to create contacts
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
      p.permission === 'family:create_contacts'
    )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Access denied - create permission required' }, { status: 403 })
    }

    // Get request body
    const body = await request.json()
    const { name, phone, description, notes } = body

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Create contact
    const { data: contact, error } = await supabaseWithAuth
      .from('family_contacts')
      .insert({
        name: name.trim(),
        phone: phone?.trim() || null,
        description: description?.trim() || null,
        notes: notes?.trim() || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating contact:', error)
      return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
    }

    return NextResponse.json({ contact }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in POST /api/family/contacts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
