import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// GET - Fetch all document categories
export async function GET(request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
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
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user has family role
    const { data: userRole } = await supabaseWithAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['family', 'admin'])
      .single()

    console.log('Categories API - User role check:', { userRole, userId: user.id })

    if (!userRole) {
      console.log('Categories API - Access denied - no family/admin role found for user:', user.id)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    console.log('Categories API - User has role:', userRole.role)

    const { data: categories, error } = await supabaseWithAuth
      .from('document_categories')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json({ error: 'Failed to fetch categories: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error in categories GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new category (admin only)
export async function POST(request) {
  try {
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .single()

    if (!userRole) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, color } = body

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const { data: category, error } = await supabase
      .from('document_categories')
      .insert({
        name: name.toLowerCase(),
        description: description || null,
        color: color || '#3B82F6'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating category:', error)
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'Category already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
    }

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('Error in categories POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
