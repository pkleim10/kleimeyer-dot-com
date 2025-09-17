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

    // Check if user has admin permissions
    const { data: userPermissions, error: permError } = await supabaseWithAuth
      .from('user_permissions')
      .select('permission')
      .eq('user_id', user.id)

    if (permError) {
      console.error('Error fetching user permissions:', permError)
      return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 })
    }

    const hasAdminPermission = userPermissions?.some(p => 
      p.permission === 'admin:full_access' || p.permission === 'admin:manage_users'
    )

    if (!hasAdminPermission) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get user permissions for all users
    const { data: allUserPermissions, error: allPermError } = await supabaseWithAuth
      .from('user_permissions')
      .select('*')
      .order('created_at', { ascending: false })

    if (allPermError) {
      console.error('Error fetching user permissions:', allPermError)
      return NextResponse.json({ 
        error: 'Failed to fetch user permissions',
        details: allPermError
      }, { status: 500 })
    }

    // If we have the service role key, get complete user information
    let usersWithDetails = []
    
    if (supabaseAdmin) {
      // Use admin client to get all users and permissions
      
      // Get all users from auth.users
      const { data: allUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (usersError) {
        console.error('Error fetching all users:', usersError)
        // Fall back to basic user permissions
      } else {
        // Create a map of user permissions by user_id
        const userPermissionsMap = new Map()
        allUserPermissions.forEach(userPerm => {
          if (!userPermissionsMap.has(userPerm.user_id)) {
            userPermissionsMap.set(userPerm.user_id, [])
          }
          userPermissionsMap.get(userPerm.user_id).push(userPerm)
        })

        // Combine user data with permissions
        usersWithDetails = allUsers.users.map(authUser => {
          const userPerms = userPermissionsMap.get(authUser.id) || []
          
          return {
            id: authUser.id,
            user_id: authUser.id,
            permissions: userPerms,
            created_at: authUser.created_at,
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

        // Auto-assign basic member permissions to users who don't have any permissions
        const usersWithoutPermissions = usersWithDetails.filter(user => user.permissions.length === 0)
        if (usersWithoutPermissions.length > 0) {
          for (const userWithoutPerms of usersWithoutPermissions) {
            try {
              const memberPermissions = [
                'member:basic_access',
                'member:view_profile',
                'member:edit_profile'
              ]
              
              const permissionInserts = memberPermissions.map(permission => ({
                user_id: userWithoutPerms.user_id,
                permission: permission
              }))
              
              const { error: insertError } = await supabaseAdmin
                .from('user_permissions')
                .insert(permissionInserts)
              
              if (insertError) {
                console.error(`Failed to assign permissions to user ${userWithoutPerms.user_id}:`, insertError)
              } else {
                // Update the user's permissions in the response
                userWithoutPerms.permissions = permissionInserts.map(p => ({ permission: p.permission }))
              }
            } catch (err) {
              console.error(`Error assigning permissions to user ${userWithoutPerms.user_id}:`, err)
            }
          }
        }
      }
    }
    
    // If we don't have admin client or it failed, use basic user permissions
    if (usersWithDetails.length === 0) {
      // Group permissions by user_id
      const userPermissionsMap = new Map()
      allUserPermissions.forEach(userPerm => {
        if (!userPermissionsMap.has(userPerm.user_id)) {
          userPermissionsMap.set(userPerm.user_id, [])
        }
        userPermissionsMap.get(userPerm.user_id).push(userPerm)
      })
      
      usersWithDetails = Array.from(userPermissionsMap.entries()).map(([userId, perms]) => {
        return {
          id: userId,
          user_id: userId,
          permissions: perms,
          created_at: perms[0]?.created_at || new Date().toISOString(),
          user: {
            id: userId,
            email: `User ${userId.slice(0, 8)}...`,
            first_name: 'Unknown',
            last_name: 'User',
            created_at: perms[0]?.created_at || new Date().toISOString(),
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
