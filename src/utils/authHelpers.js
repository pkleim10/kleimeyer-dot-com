/**
 * Authentication helper utilities
 * Provides functions to safely get sessions and handle authentication errors
 */

import { supabase } from './supabase'

/**
 * Get a fresh session and validate it
 * Returns null if session is invalid or expired
 * @returns {Promise<{session: Session, error: null} | {session: null, error: string}>}
 */
export async function getValidSession() {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return { session: null, error: 'No active session' }
    }

    // Verify session is still valid by checking expiration
    const expiresAt = session.expires_at * 1000
    const now = Date.now()
    
    if (expiresAt < now) {
      return { session: null, error: 'Session expired' }
    }

    return { session, error: null }
  } catch (error) {
    console.error('Error getting session:', error)
    return { session: null, error: error.message || 'Failed to get session' }
  }
}

/**
 * Handle API response and redirect to login if 401
 * @param {Response} response - Fetch response object
 * @param {Function} router - Next.js router instance
 * @param {string} redirectPath - Path to redirect to after login
 * @returns {boolean} - Returns true if redirected, false otherwise
 */
export function handleAuthError(response, router, redirectPath = '/') {
  if (response.status === 401) {
    router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`)
    return true
  }
  return false
}

/**
 * Make an authenticated fetch request with automatic 401 handling
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @param {Function} router - Next.js router instance
 * @param {string} redirectPath - Path to redirect to after login
 * @returns {Promise<Response>}
 */
export async function authenticatedFetch(url, options = {}, router, redirectPath = '/') {
  const { session, error } = await getValidSession()
  
  if (error || !session) {
    if (router) {
      router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`)
    }
    throw new Error(error || 'Not authenticated')
  }

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${session.access_token}`
  }

  const response = await fetch(url, {
    ...options,
    headers
  })

  if (response.status === 401 && router) {
    router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`)
    throw new Error('Session expired or invalid')
  }

  return response
}

