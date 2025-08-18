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
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single()
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching user role:', error.message)
      }
      
      setUserRole(data?.role || null)
    } catch (error) {
      console.error('Error fetching user role:', error.message)
      setUserRole(null)
    }
  }

  useEffect(() => {
    // Check active sessions and sets the user
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error fetching session:', error.message)
      }
      setUser(session?.user ?? null)
      if (session?.user) {
        console.log('User ID from AuthContext:', session.user.id); // Temporary log to help user retrieve ID
        await fetchUserRole(session.user.id)
      } else {
        setUserRole(null)
      }
      setLoading(false)
    }

    getSession()

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchUserRole(session.user.id)
      } else {
        setUserRole(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

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