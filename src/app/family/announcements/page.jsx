'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import Link from 'next/link'
import AnnouncementDeleteModal from '@/apps/family/components/AnnouncementDeleteModal'

export default function AnnouncementsPage() {
  const { user, loading: authLoading } = useAuth()
  const { isContributor } = usePermissions()
  const router = useRouter()
  
  const [bulletins, setBulletins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pageLoading, setPageLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingBulletin, setEditingBulletin] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    priority: 'medium',
    expires_at: '',
    is_active: true
  })
  const [submitting, setSubmitting] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, bulletin: null })
  const [filters, setFilters] = useState({
    category: 'all',
    priority: 'all',
    activeOnly: true
  })

  useEffect(() => {
    // Simple auth check - redirect if no user
    if (!authLoading && !user) {
      router.push('/login?redirect=/family/announcements')
      return
    }
    
    // If user is authenticated, load bulletins
    if (!authLoading && user) {
      fetchBulletins()
      setPageLoading(false)
    }
  }, [user, authLoading, router])

  const fetchBulletins = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      // Get the current session to access the token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      // Build query parameters
      const params = new URLSearchParams()
      if (filters.activeOnly) {
        params.append('activeOnly', 'true')
      }
      if (filters.category !== 'all') {
        params.append('category', filters.category)
      }
      if (filters.priority !== 'all') {
        params.append('priority', filters.priority)
      }

      const response = await fetch(`/api/family/bulletins?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        setError('Failed to load bulletins')
        return
      }

      const { bulletins } = await response.json()
      setBulletins(bulletins || [])
    } catch (err) {
      console.error('Error fetching bulletins:', err)
      setError('Failed to load bulletins')
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Refetch when filters change
  useEffect(() => {
    if (!pageLoading && user) {
      fetchBulletins()
    }
  }, [filters, fetchBulletins, pageLoading, user])

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'general',
      priority: 'medium',
      expires_at: '',
      is_active: true
    })
    setEditingBulletin(null)
    setShowAddForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      // Get the current session to access the token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      const url = editingBulletin 
        ? `/api/family/bulletins/${editingBulletin.id}`
        : '/api/family/bulletins'
      
      const method = editingBulletin ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to save bulletin')
        return
      }

      // Refresh bulletins and reset form
      await fetchBulletins()
      resetForm()
    } catch (err) {
      console.error('Error saving bulletin:', err)
      setError('Failed to save bulletin')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (bulletin) => {
    setEditingBulletin(bulletin)
    setFormData({
      title: bulletin.title,
      content: bulletin.content,
      category: bulletin.category,
      priority: bulletin.priority,
      expires_at: bulletin.expires_at ? new Date(bulletin.expires_at).toISOString().slice(0, 16) : '',
      is_active: bulletin.is_active
    })
    setShowAddForm(true)
  }

  const handleDelete = (bulletin) => {
    setDeleteModal({ isOpen: true, bulletin })
  }

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, bulletin: null })
  }

  const onDeleteSuccess = async (bulletinId) => {
    // Refresh bulletins
    await fetchBulletins()
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-700 bg-red-50 border border-red-200 dark:text-red-300 dark:bg-red-900/20 dark:border-red-800/30'
      case 'medium': return 'text-yellow-700 bg-yellow-50 border border-yellow-200 dark:text-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-800/30'
      case 'low': return 'text-green-700 bg-green-50 border border-green-200 dark:text-green-300 dark:bg-green-900/20 dark:border-green-800/30'
      default: return 'text-gray-700 bg-gray-50 border border-gray-200 dark:text-gray-300 dark:bg-gray-600 dark:border-gray-500'
    }
  }

  const getCategoryColor = (category) => {
    switch (category) {
      case 'appointment': return 'text-blue-700 bg-blue-50 border border-blue-200 dark:text-blue-300 dark:bg-blue-900/20 dark:border-blue-800/30'
      case 'payment': return 'text-purple-700 bg-purple-50 border border-purple-200 dark:text-purple-300 dark:bg-purple-900/20 dark:border-purple-800/30'
      case 'website': return 'text-indigo-700 bg-indigo-50 border border-indigo-200 dark:text-indigo-300 dark:bg-indigo-900/20 dark:border-indigo-800/30'
      case 'general': return 'text-gray-700 bg-gray-50 border border-gray-200 dark:text-gray-300 dark:bg-gray-600 dark:border-gray-500'
      default: return 'text-gray-700 bg-gray-50 border border-gray-200 dark:text-gray-300 dark:bg-gray-600 dark:border-gray-500'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'No expiration'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isExpired = (dateString) => {
    if (!dateString) return false
    return new Date(dateString) < new Date()
  }

  // Show loading while auth is being determined
  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-gray-900 dark:text-gray-100">
            Loading...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-4">
                  <li>
                    <Link href="/family" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                      Family
                    </Link>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <svg className="flex-shrink-0 h-5 w-5 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="ml-4 text-sm font-medium text-gray-500 dark:text-gray-400">Announcements</span>
                    </div>
                  </li>
                </ol>
              </nav>
              <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                Family Announcements
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage important family updates and reminders
              </p>
            </div>
            {isContributor && (
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Announcement
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
              >
                <option value="all">All Categories</option>
                <option value="appointment">Appointments</option>
                <option value="payment">Payments</option>
                <option value="website">Websites</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filters.activeOnly ? 'active' : 'all'}
                onChange={(e) => setFilters({ ...filters, activeOnly: e.target.value === 'active' })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
              >
                <option value="active">Active Only</option>
                <option value="all">All</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ category: 'all', priority: 'all', activeOnly: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-md bg-red-50 dark:bg-red-900/30 p-4">
            <div className="flex">
              <div className="ml-3 flex-1">
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

        {/* Bulletins List */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 text-center">
              <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-gray-900 dark:text-gray-100">
                Loading announcements...
              </div>
            </div>
          ) : bulletins.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {bulletins.map((bulletin) => (
                <div key={bulletin.id} className={`p-6 ${!bulletin.is_active ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                          {bulletin.title}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(bulletin.priority)}`}>
                          {bulletin.priority}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(bulletin.category)}`}>
                          {bulletin.category}
                        </span>
                        {!bulletin.is_active && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-600">
                            Inactive
                          </span>
                        )}
                        {isExpired(bulletin.expires_at) && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/30">
                            Expired
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {bulletin.content}
                      </p>
                      
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-500 space-x-4">
                        <span>Expires: {formatDate(bulletin.expires_at)}</span>
                        <span>Created: {new Date(bulletin.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {isContributor && (
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleEdit(bulletin)}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(bulletin)}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-red-600 bg-red-100 hover:bg-red-200 dark:text-red-300 dark:bg-red-900/30 dark:hover:bg-red-900/50 transition-colors"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No announcements</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {filters.category !== 'all' || filters.priority !== 'all' || !filters.activeOnly
                  ? 'No announcements match your current filters.'
                  : 'Get started by creating a new announcement.'
                }
              </p>
              {isContributor && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Announcement
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Bulletin Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-slate-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                {editingBulletin ? 'Edit Announcement' : 'Add New Announcement'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleFormChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
                    placeholder="Announcement title"
                  />
                </div>

                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Content *
                  </label>
                  <textarea
                    id="content"
                    name="content"
                    required
                    rows={4}
                    value={formData.content}
                    onChange={handleFormChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
                    placeholder="Announcement content"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Category *
                    </label>
                    <select
                      id="category"
                      name="category"
                      required
                      value={formData.category}
                      onChange={handleFormChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
                    >
                      <option value="appointment">Appointment</option>
                      <option value="payment">Payment</option>
                      <option value="website">Website</option>
                      <option value="general">General</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Priority *
                    </label>
                    <select
                      id="priority"
                      name="priority"
                      required
                      value={formData.priority}
                      onChange={handleFormChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="expires_at" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Expires At
                  </label>
                  <input
                    type="datetime-local"
                    id="expires_at"
                    name="expires_at"
                    value={formData.expires_at}
                    onChange={handleFormChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Leave empty for no expiration
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    id="is_active"
                    name="is_active"
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={handleFormChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Active
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : (editingBulletin ? 'Update' : 'Add')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnnouncementDeleteModal
        bulletin={deleteModal.bulletin}
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onDelete={onDeleteSuccess}
      />
    </div>
  )
}
