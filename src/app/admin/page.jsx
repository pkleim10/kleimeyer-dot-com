'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [assigningRole, setAssigningRole] = useState(false)
  const [error, setError] = useState('')
  const [pageLoading, setPageLoading] = useState(true)

  // Wait for auth to be ready before checking permissions
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/')
        return
      }
      
      if (!isAdmin) {
        router.push('/')
        return
      }
      
      setPageLoading(false)
    }
  }, [user, isAdmin, authLoading, router])

  // Redirect if not admin
  useEffect(() => {
    if (user && !isAdmin && !authLoading) {
      router.push('/')
    }
  }, [user, isAdmin, authLoading, router])

  // Fetch users
  useEffect(() => {
    if (isAdmin && !pageLoading) {
      fetchUsers()
    }
  }, [isAdmin, pageLoading])

  // Add automatic refresh when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAdmin && !pageLoading) {
        fetchUsers()
      }
    }

    const handleFocus = () => {
      if (isAdmin && !pageLoading) {
        fetchUsers()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [isAdmin, pageLoading])

  const fetchUsers = async () => {
    try {
      // Get the current session to access the token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      // Use the new API endpoint to get user details
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        setError('Failed to load users')
        return
      }

      const { users } = await response.json()
      setUsers(users || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (userId, newRole) => {
    setUpdating(true)
    setError('')

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId)

      if (error) {
        console.error('Error updating user role:', error)
        setError('Failed to update user role')
      } else {
        // Refresh the users list
        await fetchUsers()
      }
    } catch (err) {
      console.error('Error updating user role:', err)
      setError('Failed to update user role')
    } finally {
      setUpdating(false)
    }
  }

  // Show loading while auth is being determined
  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-gray-900 dark:text-gray-100">
            Loading...
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Please sign in to access admin panel
          </h2>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You don&apos;t have permission to access the admin panel.
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Admin Panel
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage user roles and permissions
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchUsers}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 dark:bg-red-900/30 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                  Error
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-gray-900 dark:text-gray-100">
              Loading users...
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200 dark:divide-slate-700">
              {users.map((userRole) => {
                const listUser = userRole.user
                const displayName = `${listUser?.first_name || 'Unknown'} ${listUser?.last_name || 'User'}`
                
                return (
                  <li key={userRole.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {displayName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {listUser?.email}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Role:</span>
                          <select
                            value={userRole.role}
                            onChange={(e) => updateUserRole(userRole.user_id, e.target.value)}
                            disabled={updating || user?.id === listUser?.id}
                            className="text-sm border border-gray-300 dark:border-slate-600 rounded-md px-3 py-1 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                          >
                            <option value="member">Member</option>
                            <option value="contributor">Contributor</option>
                            <option value="admin">Admin</option>
                          </select>
                          {user?.id === listUser?.id && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">(You)</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Joined: {new Date(userRole.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
            
            {users.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No users found.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
