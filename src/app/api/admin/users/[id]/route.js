import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdmin, verifyAuth } from '@/utils/roleChecks'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required Supabase environment variables')
  throw new Error('Missing Supabase environment variables')
}

const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null

// DELETE - Delete a user account
export async function DELETE(request, { params }) {
  try {
    const { id: userId } = await params
    
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

    // Check if user is admin
    if (!(await isAdmin(token))) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { user } = authResult

    // Prevent self-deletion
    if (user.id === userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Verify the target user exists using admin client
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const { data: targetUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (userError || !targetUser?.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Delete user role first (cascade should handle this, but being explicit)
    const { supabaseWithAuth } = authResult
    const { error: roleDeleteError } = await supabaseWithAuth
      .from('user_roles')
      .delete()
      .eq('user_id', userId)

    if (roleDeleteError) {
      console.error('Error deleting user role:', roleDeleteError)
      // Continue with user deletion even if role cleanup fails
    }

    // User role will be automatically deleted due to CASCADE constraint

    // Delete user from auth.users using admin client
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return NextResponse.json({ error: 'Failed to delete user account' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `User account ${targetUser.user.email} has been deleted successfully` 
    })

  } catch (error) {
    console.error('Error in user deletion:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
