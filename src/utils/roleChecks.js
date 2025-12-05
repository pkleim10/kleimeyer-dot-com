import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Get user role from user_roles table
 * @param {string} token - Supabase auth token
 * @returns {Promise<string|null>} - Role ('member', 'family', 'admin') or null if not authenticated
 */
export async function getUserRole(token) {
  if (!token) return null

  const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })

  const { data: { user }, error: authError } = await supabaseWithAuth.auth.getUser()
  if (authError || !user) {
    return null
  }

  const { data, error } = await supabaseWithAuth
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    // Default to 'member' if no role found
    return 'member'
  }

  return data.role || 'member'
}

/**
 * Check if user is admin
 * @param {string} token - Supabase auth token
 * @returns {Promise<boolean>}
 */
export async function isAdmin(token) {
  const role = await getUserRole(token)
  return role === 'admin'
}

/**
 * Check if user is family or admin
 * @param {string} token - Supabase auth token
 * @returns {Promise<boolean>}
 */
export async function isFamilyOrAdmin(token) {
  const role = await getUserRole(token)
  return role === 'family' || role === 'admin'
}

/**
 * Check if user is family
 * @param {string} token - Supabase auth token
 * @returns {Promise<boolean>}
 */
export async function isFamily(token) {
  const role = await getUserRole(token)
  return role === 'family'
}

/**
 * Verify user is authenticated and return user object
 * @param {string} token - Supabase auth token
 * @returns {Promise<{user: object, supabaseWithAuth: object}|null>}
 */
export async function verifyAuth(token) {
  if (!token) return null

  const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })

  const { data: { user }, error: authError } = await supabaseWithAuth.auth.getUser()
  if (authError || !user) {
    return null
  }

  return { user, supabaseWithAuth }
}

