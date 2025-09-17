'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/utils/supabase'

// Toggle this to enable/disable debug logging
const DEBUG_AUTH = true // Temporarily enable for debugging

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isProcessingAuthChange, setIsProcessingAuthChange] = useState(false)

  // Legacy role fetching removed - roles are now determined from permissions

  useEffect(() => {
    let isMounted = true
    
    // Check active sessions and sets the user
    const getSession = async () => {
      const startTime = Date.now()
      if (DEBUG_AUTH) console.log('AuthContext: Starting session check...')
      
      try {
        // Add timeout to the session check - optimized for user experience
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((resolve) => 
          setTimeout(() => resolve({ timeout: true }), 3000)
        )
        
        const result = await Promise.race([sessionPromise, timeoutPromise])
        
        // Check if component is still mounted
        if (!isMounted) return
        
        // Check if we got a timeout
        if (result.timeout) {
          if (DEBUG_AUTH) console.log('Session check timed out after 3 seconds - this indicates a network or Supabase issue')
          // Don't clear user state on timeout - let the auth state change handle it
          setLoading(false)
          return
        }
        
        const { data: { session }, error } = result
        const duration = Date.now() - startTime
        if (DEBUG_AUTH) console.log(`AuthContext: Session check completed in ${duration}ms`)
        if (error) {
          console.error('Error fetching session:', error.message)
          // If there's an error getting the session, clear user state
          setUser(null)
          setLoading(false)
          return
        }
        
        if (session?.user) {
          // Check if session is expired
          const expiresAt = session.expires_at * 1000
          const now = Date.now()
          
          if (DEBUG_AUTH) {
            console.log('Session expiration check:', {
              expiresAt,
              now,
              expiresAtDate: new Date(expiresAt).toISOString(),
              nowDate: new Date(now).toISOString(),
              isExpired: expiresAt < now,
              timeUntilExpiry: expiresAt - now
            })
          }
          
          if (expiresAt < now) {
            console.log('Session expired, clearing user state')
            setUser(null)
            setLoading(false)
            return
          }
          
          if (DEBUG_AUTH) console.log('User ID from AuthContext:', session.user.id)
          setUser(session.user)
          
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Error in getSession:', error)
        setUser(null)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    getSession()

    // Add timeout to prevent infinite loading
    const authTimeout = setTimeout(() => {
      if (loading && isMounted) {
        if (DEBUG_AUTH) console.log('Auth loading timeout - forcing completion')
        setLoading(false)
      }
    }, 10000) // 10 second timeout

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return
      
      // Prevent multiple simultaneous auth state changes
      if (isProcessingAuthChange) {
        if (DEBUG_AUTH) console.log('Auth state change already processing, skipping...')
        return
      }
      
      setIsProcessingAuthChange(true)
      
      if (DEBUG_AUTH) console.log('Auth state change:', event, session?.user?.id)
      
      if (session?.user) {
        // Check if session is expired
        const expiresAt = session.expires_at * 1000
        const now = Date.now()
        
        if (expiresAt < now) {
          console.log('Session expired during auth state change')
          setUser(null)
          setLoading(false)
          return
        }
        
        setUser(session.user)
      } else {
        setUser(null)
      }
      if (isMounted) {
        setLoading(false)
      }
      setIsProcessingAuthChange(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
      clearTimeout(authTimeout)
    }
  }, [])

  const signOut = async () => {
    try {
      // First check if we have a session
      const { data: { session } } = await supabase.auth.getSession()
      
      // If no session, just clear the user state
      if (!session) {
        setUser(null)
        return
      }

      // If we have a session, try to sign out
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
      
      setUser(null)
    } catch (error) {
      console.error('Error signing out:', error.message)
      // Even if there's an error, clear the user state
      setUser(null)
      throw error
    }
  }

  const value = {
    signUp: (data) => supabase.auth.signUp(data),
    signIn: (data) => supabase.auth.signInWithPassword(data),
    signOut,
    user,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
} 