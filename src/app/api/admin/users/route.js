import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Create a Supabase client using the anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

    // Fetch user roles
    const { data: userRoles, error: rolesError } = await supabaseWithAuth
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false })

    if (rolesError) {
      return NextResponse.json({ error: 'Failed to fetch user roles' }, { status: 500 })
    }

    // Fetch user details for each user role using the REST API
    const usersWithDetails = await Promise.all(
      userRoles.map(async (userRole) => {
        try {
          console.log(`Processing user role for user ID: ${userRole.user_id}`)
          console.log(`Current user ID: ${user.id}`)
          
          // Check if this is the current user
          if (userRole.user_id === user.id) {
            console.log('This is the current user, fetching their data...')
            
            // Use the Supabase REST API to get user details (same approach as profile update)
            const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': supabaseAnonKey
              }
            })

            if (userResponse.ok) {
              const userData = await userResponse.json()
              console.log('User data fetched:', {
                id: userData.id,
                email: userData.email,
                first_name: userData.user_metadata?.first_name,
                last_name: userData.user_metadata?.last_name
              })
              
              return {
                ...userRole,
                user: {
                  id: userData.id,
                  email: userData.email,
                  first_name: userData.user_metadata?.first_name || 'Unknown',
                  last_name: userData.user_metadata?.last_name || 'User',
                  created_at: userData.created_at
                }
              }
            } else {
              console.log('Failed to fetch user data, status:', userResponse.status)
            }
          } else {
            console.log('This is not the current user, using fallback data')
          }
          
          // For other users, we can't access their data with the current token
          // So we'll show what we can from the user roles
          return {
            ...userRole,
            user: {
              id: userRole.user_id,
              email: `User ${userRole.user_id.slice(0, 8)}...`,
              first_name: 'Unknown',
              last_name: 'User',
              created_at: userRole.created_at
            }
          }
        } catch (err) {
          console.error('Error fetching user data for ID:', userRole.user_id, err)
          return {
            ...userRole,
            user: {
              id: userRole.user_id,
              email: 'Error loading',
              first_name: 'Unknown',
              last_name: 'User',
              created_at: userRole.created_at
            }
          }
        }
      })
    )

    return NextResponse.json({ users: usersWithDetails })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
