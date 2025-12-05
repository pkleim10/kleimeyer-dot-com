import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isFamilyOrAdmin, verifyAuth } from '@/utils/roleChecks'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// PUT - Update contact
export async function PUT(request, { params }) {
  const resolvedParams = await params
  const { id } = resolvedParams

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

    // Update contact using service role to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data: contact, error } = await supabaseAdmin
      .from('family_contacts')
      .update({
        name: name.trim(),
        phone: phone?.trim() || null,
        description: description?.trim() || null,
        notes: notes?.trim() || null
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating contact:', error)
      return NextResponse.json({ error: 'Failed to update contact: ' + error.message }, { status: 500 })
    }

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    return NextResponse.json({ contact })

  } catch (error) {
    console.error('Unexpected error in PUT /api/family/contacts/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete contact
export async function DELETE(request, { params }) {
  const resolvedParams = await params
  const { id } = resolvedParams

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

    // Delete contact using service role to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    const { error } = await supabaseAdmin
      .from('family_contacts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting contact:', error)
      return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Unexpected error in DELETE /api/family/contacts/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
