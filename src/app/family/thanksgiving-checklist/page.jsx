'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'

// Helper to handle authentication errors and clear state
const handleAuthError = async (router, redirectPath = '/family/thanksgiving-checklist') => {
  // Clear any cached session
  await supabase.auth.signOut()
  // Redirect to login
  router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`)
}

export default function ThanksgivingChecklistPage() {
  const { user, authLoading } = useAuth()
  const { canViewFamily, permissionsLoading } = usePermissions()
  const canEditChecklist = canViewFamily
  const canDeleteChecklist = canViewFamily
  const router = useRouter()

  // State
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    item: '',
    volunteer: ''
  })
  const [submitting, setSubmitting] = useState(false)

  // Fetch checklist items
  const fetchItems = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Get fresh session - don't use cached session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        // Session invalid or expired - clear state and redirect to login
        await handleAuthError(router)
        return
      }

      // Verify session is still valid by checking expiration
      const expiresAt = session.expires_at * 1000
      const now = Date.now()
      if (expiresAt < now) {
        // Session expired - clear state and redirect to login
        await handleAuthError(router)
        return
      }

      const response = await fetch('/api/family/thanksgiving-checklist', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        // Handle 401 Unauthorized - session invalid, clear state and redirect
        if (response.status === 401) {
          await handleAuthError(router)
          return
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch checklist items (${response.status})`)
      }

      const data = await response.json()
      setItems(data.items || [])
    } catch (err) {
      console.error('Error fetching checklist items:', err)
      // Don't set error if we're redirecting
      if (!err.message?.includes('redirect')) {
        setError(err.message || 'Failed to load checklist items')
      }
    } finally {
      setLoading(false)
    }
  }, [user, router])

  // Initial data fetch
  useEffect(() => {
    if (!authLoading && !permissionsLoading && user && canViewFamily) {
      fetchItems()
    }
  }, [authLoading, permissionsLoading, user, canViewFamily, fetchItems])

  // Handle form change
  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      item: '',
      volunteer: ''
    })
    setEditingItem(null)
    setShowAddForm(false)
  }

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        await handleAuthError(router)
        return
      }

      // Verify session is still valid
      const expiresAt = session.expires_at * 1000
      const now = Date.now()
      if (expiresAt < now) {
        await handleAuthError(router)
        return
      }

      if (editingItem) {
        // Update existing item
        const response = await fetch(`/api/family/thanksgiving-checklist/${editingItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(formData)
        })

        if (response.status === 401) {
          await handleAuthError(router)
          return
        }

        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error || 'Failed to update item')
        }
      } else {
        // Add new item
        const response = await fetch('/api/family/thanksgiving-checklist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(formData)
        })

        if (response.status === 401) {
          await handleAuthError(router)
          return
        }

        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error || 'Failed to create item')
        }
      }

      // Refresh items and reset form
      await fetchItems()
      resetForm()
    } catch (err) {
      console.error('Error saving item:', err)
      if (!err.message?.includes('redirect')) {
        setError('Failed to save item: ' + err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Handle edit
  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      item: item.item || '',
      volunteer: item.volunteer || ''
    })
    setShowAddForm(true)
  }

  // Handle delete
  const handleDelete = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        await handleAuthError(router)
        return
      }

      // Verify session is still valid
      const expiresAt = session.expires_at * 1000
      const now = Date.now()
      if (expiresAt < now) {
        await handleAuthError(router)
        return
      }

      const response = await fetch(`/api/family/thanksgiving-checklist/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.status === 401) {
        await handleAuthError(router)
        return
      }

      if (!response.ok) {
        throw new Error('Failed to delete item')
      }

      // Refresh items
      await fetchItems()
    } catch (err) {
      console.error('Error deleting item:', err)
      if (!err.message?.includes('redirect')) {
        setError('Failed to delete item: ' + err.message)
      }
    }
  }

  // Validate session on mount and when user/authLoading changes
  useEffect(() => {
    const validateSession = async () => {
      // Wait for auth to finish loading
      if (authLoading) return

      // If no user, redirect immediately
      if (!user) {
        router.push('/login?redirect=/family/thanksgiving-checklist')
        return
      }

      // Validate session is actually valid (not just user state)
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          // Session invalid - clear state and redirect to login
          await handleAuthError(router)
          return
        }

        // Check if session is expired
        const expiresAt = session.expires_at * 1000
        const now = Date.now()
        if (expiresAt < now) {
          // Session expired - clear state and redirect to login
          await handleAuthError(router)
          return
        }
      } catch (error) {
        console.error('Error validating session:', error)
        await handleAuthError(router)
      }
    }

    validateSession()
  }, [authLoading, user, router])

  // Redirect if not family member
  useEffect(() => {
    if (!authLoading && !permissionsLoading && user && !canViewFamily) {
      router.push('/')
    }
  }, [authLoading, permissionsLoading, user, canViewFamily, router])

  // Show loading while auth and permissions are being determined, or redirecting
  // Also show loading if user exists but we haven't validated the session yet
  if (authLoading || permissionsLoading || loading || !user || (!canViewFamily && !authLoading && !permissionsLoading && user)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-gray-900 dark:text-gray-100">
            {authLoading || permissionsLoading ? 'Loading...' : !user ? 'Redirecting to login...' : (!canViewFamily && !authLoading && !permissionsLoading) ? 'Redirecting...' : 'Loading checklist...'}
          </div>
        </div>
      </div>
    )
  }

  // Double-check: if we somehow got here without a valid session, don't render
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 relative">
      {/* Content Overlay */}
      <div className="relative z-10">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Thanksgiving Checklist
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Organize Thanksgiving tasks and volunteers
                </p>
              </div>
              {canEditChecklist && (
                <div className="mt-4 sm:mt-0 sm:ml-4">
                  <button
                    onClick={() => {
                      resetForm()
                      setShowAddForm(true)
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Item
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-400">
                    Error
                  </h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    <p>{error}</p>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => setError(null)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-300 dark:bg-red-900/50 dark:hover:bg-red-900/70 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="mb-8 bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {editingItem ? 'Edit Item' : 'Add New Item'}
                </h3>
              </div>
              <div className="px-6 py-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="item" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Item *
                    </label>
                    <input
                      type="text"
                      id="item"
                      name="item"
                      required
                      value={formData.item}
                      onChange={handleFormChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
                      placeholder="Task or item description"
                    />
                  </div>

                  <div>
                    <label htmlFor="volunteer" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Volunteer
                    </label>
                    <input
                      type="text"
                      id="volunteer"
                      name="volunteer"
                      value={formData.volunteer}
                      onChange={handleFormChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
                      placeholder="Volunteer name"
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {submitting ? 'Saving...' : editingItem ? 'Update' : 'Add Item'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Checklist Table */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Item
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Volunteer
                    </th>
                    {canEditChecklist && (
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={canEditChecklist ? 3 : 2} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        {canEditChecklist 
                          ? 'No items yet. Click "Add Item" to get started.'
                          : 'No items yet.'}
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.item}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {item.volunteer || <span className="text-gray-400 dark:text-gray-500 italic">Unassigned</span>}
                        </td>
                        {canEditChecklist && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

