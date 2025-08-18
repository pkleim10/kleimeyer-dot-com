import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Create a Supabase client using the anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required Supabase environment variables')
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null

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

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabaseWithAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || userRole?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get user roles - this should work with the updated RLS policies
    const { data: userRoles, error: rolesError } = await supabaseWithAuth
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false })

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError)
      return NextResponse.json({ 
        error: 'Failed to fetch user roles',
        details: rolesError
      }, { status: 500 })
    }

    // If we have the service role key, get complete user information
    let usersWithDetails = []
    
    if (supabaseAdmin) {
      // Use admin client to get all users and roles
      
      // Get all users from auth.users
      const { data: allUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (usersError) {
        console.error('Error fetching all users:', usersError)
        // Fall back to basic user roles
      } else {
        // Create a map of user roles by user_id
        const userRolesMap = new Map()
        userRoles.forEach(userRole => {
          userRolesMap.set(userRole.user_id, userRole)
        })

        // Combine user data with roles
        usersWithDetails = allUsers.users.map(authUser => {
          const userRole = userRolesMap.get(authUser.id)
          
          return {
            id: userRole?.id || null,
            user_id: authUser.id,
            role: userRole?.role || 'no-role',
            created_at: userRole?.created_at || authUser.created_at,
            user: {
              id: authUser.id,
              email: authUser.email,
              first_name: authUser.user_metadata?.first_name || 'Unknown',
              last_name: authUser.user_metadata?.last_name || 'User',
              created_at: authUser.created_at,
              email_confirmed_at: authUser.email_confirmed_at
            }
          }
        })

        // Auto-assign 'member' role to users who don't have a role
        const usersWithoutRoles = usersWithDetails.filter(user => user.role === 'no-role')
        if (usersWithoutRoles.length > 0) {
          for (const userWithoutRole of usersWithoutRoles) {
            try {
              const { error: insertError } = await supabaseAdmin
                .from('user_roles')
                .insert({
                  user_id: userWithoutRole.user_id,
                  role: 'member'
                })
              
              if (insertError) {
                console.error(`Failed to assign role to user ${userWithoutRole.user_id}:`, insertError)
              } else {
                // Update the user's role in the response
                userWithoutRole.role = 'member'
              }
            } catch (err) {
              console.error(`Error assigning role to user ${userWithoutRole.user_id}:`, err)
            }
          }
        }
      }
    }
    
    // If we don't have admin client or it failed, use basic user roles
    if (usersWithDetails.length === 0) {
      usersWithDetails = userRoles.map(userRole => {
        return {
          id: userRole.id,
          user_id: userRole.user_id,
          role: userRole.role,
          created_at: userRole.created_at,
          user: {
            id: userRole.user_id,
            email: `User ${userRole.user_id.slice(0, 8)}...`,
            first_name: 'Unknown',
            last_name: 'User',
            created_at: userRole.created_at,
            email_confirmed_at: null
          }
        }
      })
    }

    // Sort by creation date (newest first)
    usersWithDetails.sort((a, b) => new Date(b.user.created_at) - new Date(a.user.created_at))

    return NextResponse.json({ users: usersWithDetails })
  } catch (error) {
    console.error('API Error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}
