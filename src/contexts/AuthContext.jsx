'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  // Function to fetch user role
  const fetchUserRole = async (userId) => {
    if (!userId) {
      setUserRole(null)
      return
    }
    
    try {
      console.log('Fetching user role for:', userId)
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single()
      
      console.log('User role fetch result:', { data, error })
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching user role:', error.message)
      }
      
      setUserRole(data?.role || null)
      console.log('Set user role to:', data?.role || null)
    } catch (error) {
      console.error('Error fetching user role:', error.message)
      setUserRole(null)
    }
  }

  useEffect(() => {
    // Check active sessions and sets the user
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error fetching session:', error.message)
        }
        
        if (session?.user) {
          console.log('User ID from AuthContext:', session.user.id)
          setUser(session.user)
          await fetchUserRole(session.user.id)
        } else {
          setUser(null)
          setUserRole(null)
        }
      } catch (error) {
        console.error('Error in getSession:', error)
        setUser(null)
        setUserRole(null)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.id)
      
      if (session?.user) {
        setUser(session.user)
        await fetchUserRole(session.user.id)
      } else {
        setUser(null)
        setUserRole(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    try {
      console.log('Starting sign out process...')
      
      // First check if we have a session
      const { data: { session } } = await supabase.auth.getSession()
      console.log('Current session:', session ? 'exists' : 'none')
      
      // If no session, just clear the user state
      if (!session) {
        console.log('No session found, clearing user state')
        setUser(null)
        setUserRole(null)
        return
      }

      // If we have a session, try to sign out
      console.log('Signing out from Supabase...')
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Supabase sign out error:', error)
        throw error
      }
      
      console.log('Sign out successful, clearing user state')
      setUser(null)
      setUserRole(null)
    } catch (error) {
      console.error('Error signing out:', error.message)
      // Even if there's an error, clear the user state
      console.log('Clearing user state despite error')
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