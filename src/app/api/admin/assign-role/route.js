import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabaseWithAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || userRole?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get request body
    const { userId, role = 'member' } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if user already has a role
    const { data: existingRole, error: checkError } = await supabaseWithAuth
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (existingRole) {
      return NextResponse.json({ 
        error: 'User already has a role', 
        currentRole: existingRole.role 
      }, { status: 400 })
    }

    // Assign the role
    const { data: newRole, error: insertError } = await supabaseWithAuth
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error assigning role:', insertError)
      return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Role '${role}' assigned successfully`,
      role: newRole
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}
