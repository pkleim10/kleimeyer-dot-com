import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isFamilyOrAdmin, verifyAuth } from '@/utils/roleChecks'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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
    
    // Verify authentication
    const authResult = await verifyAuth(token)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Family or Admin
    if (!(await isFamilyOrAdmin(token))) {
      return NextResponse.json({ error: 'Forbidden - Family or Admin access required' }, { status: 403 })
    }

    const { supabaseWithAuth } = authResult

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
    
    // Verify authentication
    const authResult = await verifyAuth(token)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Family or Admin
    if (!(await isFamilyOrAdmin(token))) {
      return NextResponse.json({ error: 'Forbidden - Family or Admin access required' }, { status: 403 })
    }

    // Get request body
    const body = await request.json()
    const { name, phone, description, notes } = body

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Create contact using service role to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data: contact, error } = await supabaseAdmin
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
      return NextResponse.json({ error: 'Failed to create contact: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ contact }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in POST /api/family/contacts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
