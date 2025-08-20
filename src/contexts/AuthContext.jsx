'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/utils/supabase'

// Toggle this to enable/disable debug logging
const DEBUG_AUTH = true // Temporarily enable for debugging

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastFetchedUserId, setLastFetchedUserId] = useState(null)
  const [isProcessingAuthChange, setIsProcessingAuthChange] = useState(false)

  // Function to fetch user role
  const fetchUserRole = useCallback(async (userId) => {
    if (!userId) {
      setUserRole(null)
      setLastFetchedUserId(null)
      return
    }
    
    // Prevent duplicate fetches for the same user
    if (lastFetchedUserId === userId) {
      if (DEBUG_AUTH) console.log('fetchUserRole: Skipping duplicate fetch for user:', userId)
      return
    }
    
    try {
      if (DEBUG_AUTH) console.log('fetchUserRole: Querying user_roles table for user:', userId)
      
      // Add timeout to the role fetch
      const rolePromise = supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single()
      
      const timeoutPromise = new Promise((resolve) => 
        setTimeout(() => resolve({ timeout: true }), 3000)
      )
      
      const result = await Promise.race([rolePromise, timeoutPromise])
      
      // Check if we got a timeout
      if (result.timeout) {
        if (DEBUG_AUTH) console.log('Role fetch timed out after 3 seconds')
        setUserRole(null)
        setLastFetchedUserId(null)
        return
      }
      
      const { data, error } = result
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching user role:', error.message)
      }
      
      if (DEBUG_AUTH) console.log('fetchUserRole: Role data:', data?.role || 'no role found')
      setUserRole(data?.role || null)
      setLastFetchedUserId(userId)
    } catch (error) {
      console.error('Error fetching user role:', error.message)
      setUserRole(null)
      setLastFetchedUserId(null)
    }
  }, [])

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
          setUser(null)
          setUserRole(null)
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
          setUserRole(null)
          setLoading(false)
          return
        }
        
        if (session?.user) {
          // Check if session is expired
          const expiresAt = session.expires_at * 1000
          const now = Date.now()
          
          if (expiresAt < now) {
            console.log('Session expired, clearing user state')
            setUser(null)
            setUserRole(null)
            setLoading(false)
            return
          }
          
          if (DEBUG_AUTH) console.log('User ID from AuthContext:', session.user.id)
          setUser(session.user)
          
          const roleStartTime = Date.now()
          if (DEBUG_AUTH) console.log('AuthContext: Starting role fetch...')
          await fetchUserRole(session.user.id)
          const roleDuration = Date.now() - roleStartTime
          if (DEBUG_AUTH) console.log(`AuthContext: Role fetch completed in ${roleDuration}ms`)
        } else {
          setUser(null)
          setUserRole(null)
        }
      } catch (error) {
        console.error('Error in getSession:', error)
        setUser(null)
        setUserRole(null)
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
          setUserRole(null)
          setLoading(false)
          return
        }
        
        setUser(session.user)
        // Use a timeout for the role fetch in auth state change
        const rolePromise = fetchUserRole(session.user.id)
        const timeoutPromise = new Promise((resolve) => 
          setTimeout(() => resolve(), 3000)
        )
        await Promise.race([rolePromise, timeoutPromise])
      } else {
        setUser(null)
        setUserRole(null)
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
  }, [fetchUserRole])

  const signOut = async () => {
    try {
      // First check if we have a session
      const { data: { session } } = await supabase.auth.getSession()
      
      // If no session, just clear the user state
      if (!session) {
        setUser(null)
        setUserRole(null)
        return
      }

      // If we have a session, try to sign out
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
      
      setUser(null)
      setUserRole(null)
    } catch (error) {
      console.error('Error signing out:', error.message)
      // Even if there's an error, clear the user state
      setUser(null)
      setUserRole(null)
      throw error
    }
  }

  const value = {
    signUp: (data) => supabase.auth.signUp(data),
    signIn: (data) => supabase.auth.signInWithPassword(data),
    signOut,
    user,
    userRole,
    loading,
    isAdmin: userRole === 'admin',
    isContributor: userRole === 'contributor' || userRole === 'admin'
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
} 