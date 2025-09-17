import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// GET - List all permissions for a user or all users
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
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

    // Check if user has permission to manage roles
    const { data: userPermissions, error: permError } = await supabaseWithAuth
      .from('user_permissions')
      .select('permission')
      .eq('user_id', user.id)

    if (permError || !userPermissions?.some(p => 
      p.permission === 'admin:full_access' || p.permission === 'admin:manage_roles'
    )) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    let query = supabaseWithAuth
      .from('user_permissions')
      .select(`
        user_id,
        permission,
        created_at
      `)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: permissions, error } = await query

    if (error) {
      console.error('Error fetching permissions:', error)
      return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 })
    }

    return NextResponse.json({ permissions })
  } catch (error) {
    console.error('Error in permissions GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Grant permission to a user
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

    // Check if user has permission to manage roles
    const { data: userPermissions, error: permError } = await supabaseWithAuth
      .from('user_permissions')
      .select('permission')
      .eq('user_id', user.id)

    if (permError || !userPermissions?.some(p => 
      p.permission === 'admin:full_access' || p.permission === 'admin:manage_roles'
    )) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { userId, permission } = await request.json()

    if (!userId || !permission) {
      return NextResponse.json({ error: 'userId and permission are required' }, { status: 400 })
    }

    // Validate permission format
    const validPermissions = [
      'admin:full_access', 'admin:manage_users', 'admin:manage_roles', 'admin:system_settings',
      'family:full_access', 'family:view_bulletins', 'family:create_bulletins', 
      'family:edit_bulletins', 'family:delete_bulletins', 'family:view_contacts', 
      'family:manage_contacts', 'family:view_documents', 'family:upload_documents', 
      'family:manage_documents', 'recipe:view_recipes', 'recipe:create_recipes', 
      'recipe:edit_recipes', 'recipe:delete_recipes', 'recipe:manage_categories',
      'member:basic_access', 'member:view_profile', 'member:edit_profile'
    ]

    if (!validPermissions.includes(permission)) {
      return NextResponse.json({ error: 'Invalid permission' }, { status: 400 })
    }

    // Grant the permission
    const { data, error } = await supabaseWithAuth
      .from('user_permissions')
      .insert({ user_id: userId, permission })
      .select()

    if (error) {
      console.error('Error granting permission:', error)
      return NextResponse.json({ error: 'Failed to grant permission' }, { status: 500 })
    }

    return NextResponse.json({ permission: data[0] })
  } catch (error) {
    console.error('Error in permissions POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Revoke permission from a user
export async function DELETE(request) {
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

    // Check if user has permission to manage roles
    const { data: userPermissions, error: permError } = await supabaseWithAuth
      .from('user_permissions')
      .select('permission')
      .eq('user_id', user.id)

    if (permError || !userPermissions?.some(p => 
      p.permission === 'admin:full_access' || p.permission === 'admin:manage_roles'
    )) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const permission = searchParams.get('permission')

    if (!userId || !permission) {
      return NextResponse.json({ error: 'userId and permission are required' }, { status: 400 })
    }

    // Revoke the permission
    const { error } = await supabaseWithAuth
      .from('user_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('permission', permission)

    if (error) {
      console.error('Error revoking permission:', error)
      return NextResponse.json({ error: 'Failed to revoke permission' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in permissions DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
