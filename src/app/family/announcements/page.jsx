'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import Link from 'next/link'
import AnnouncementDeleteModal from '@/apps/family/components/AnnouncementDeleteModal'
import { StarRating, StarRatingDropdown } from '@/apps/shared/components'

export default function AnnouncementsPage() {
  const { user, loading: authLoading } = useAuth()
  const { canCreateAnnouncement, canEditAnnouncement, canDeleteAnnouncement, canManageUsers, canViewFamily, permissionsLoading } = usePermissions()
  const router = useRouter()
  const searchParams = useSearchParams()
  
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
    rating: 0,
    // Specialized fields
    url: '',
    website_email: '',
    website_password: '',
    appointment_datetime: '',
    appointment_location: '',
    payment_amount: '',
    payment_due_date: '',
    payment_reference: '',
    payment_recipient: '',
    action_required: false,
    medical_provider: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, bulletin: null })
  const [hasLoadedBulletins, setHasLoadedBulletins] = useState(false)
  const [filters, setFilters] = useState({
    category: 'all',
    priority: 'all',
    status: 'active' // 'active' for not expired, 'all' for all regardless of expiration
  })
  const [copiedUrl, setCopiedUrl] = useState(null)
  const [copiedCredentials, setCopiedCredentials] = useState({ type: null, bulletinId: null })
  const [refreshCreatedDate, setRefreshCreatedDate] = useState(false)
  const [cameFromDashboard, setCameFromDashboard] = useState(false)

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
      if (filters.category !== 'all') params.append('category', filters.category)
      if (filters.priority !== 'all') params.append('priority', filters.priority)
      params.append('status', filters.status) // Always pass status parameter
      
      
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
      setHasLoadedBulletins(true)
    } catch (err) {
      console.error('Error fetching bulletins:', err)
      setError('Failed to load bulletins')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    // Simple auth check - redirect if no user
    if (!authLoading && !user) {
      router.push('/login?redirect=/family/announcements')
      return
    }
    
    // Permission check - redirect if user doesn't have family permissions
    if (!authLoading && !permissionsLoading && user && !canViewFamily) {
      router.push('/')
      return
    }
    
    // If user is authenticated and has permissions, load bulletins (this will trigger on filter changes too)
    if (!authLoading && !permissionsLoading && user && canViewFamily) {
      fetchBulletins()
      if (!hasLoadedBulletins) {
        setPageLoading(false)
        setHasLoadedBulletins(true)
      }
    }
  }, [user, authLoading, permissionsLoading, canViewFamily, router, fetchBulletins, hasLoadedBulletins])

  // Handle edit parameter from URL
  useEffect(() => {
    const editId = searchParams.get('edit')
    const fromDashboard = searchParams.get('from') === 'dashboard'
    
    if (editId && bulletins.length > 0) {
      const bulletinToEdit = bulletins.find(b => b.id === editId)
      if (bulletinToEdit) {
        setEditingBulletin(bulletinToEdit)
        setCameFromDashboard(fromDashboard)
        
        // Convert expiration from UTC to Arizona time for editing (only for non-appointment announcements)
        let expiresAtLocal = ''
        if (bulletinToEdit.expires_at && bulletinToEdit.category !== 'appointment') {
          const date = new Date(bulletinToEdit.expires_at)
          
          // Use Intl.DateTimeFormat to properly convert to Arizona timezone
          const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Phoenix',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })
          
          const parts = formatter.formatToParts(date)
          const year = parts.find(part => part.type === 'year').value
          const month = parts.find(part => part.type === 'month').value
          const day = parts.find(part => part.type === 'day').value
          const hour = parts.find(part => part.type === 'hour').value
          const minute = parts.find(part => part.type === 'minute').value
          
          expiresAtLocal = `${year}-${month}-${day}T${hour}:${minute}`
        }
        
        // Convert appointment datetime from UTC to Arizona time for editing
        let appointmentDateTime = ''
        if (bulletinToEdit.appointment_datetime) {
          const date = new Date(bulletinToEdit.appointment_datetime)
          
          // Use Intl.DateTimeFormat to properly convert to Arizona timezone
          const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Phoenix',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })
          
          const parts = formatter.formatToParts(date)
          const year = parts.find(part => part.type === 'year').value
          const month = parts.find(part => part.type === 'month').value
          const day = parts.find(part => part.type === 'day').value
          const hour = parts.find(part => part.type === 'hour').value
          const minute = parts.find(part => part.type === 'minute').value
          
          appointmentDateTime = `${year}-${month}-${day}T${hour}:${minute}`
        }
        
        setFormData({
          title: bulletinToEdit.title || '',
          content: bulletinToEdit.content || '',
          category: bulletinToEdit.category || 'general',
          priority: bulletinToEdit.priority || 'medium',
          expires_at: expiresAtLocal,
          rating: bulletinToEdit.rating ? parseInt(bulletinToEdit.rating) : 0,
          // Specialized fields
          url: bulletinToEdit.url || '',
          website_email: bulletinToEdit.website_email || '',
          website_password: bulletinToEdit.website_password || '',
          appointment_datetime: appointmentDateTime,
          appointment_location: bulletinToEdit.appointment_location || '',
          payment_amount: bulletinToEdit.payment_amount || '',
          payment_due_date: bulletinToEdit.payment_due_date || '',
          payment_reference: bulletinToEdit.payment_reference || '',
          payment_recipient: bulletinToEdit.payment_recipient || '',
          action_required: bulletinToEdit.action_required || false,
          medical_provider: bulletinToEdit.medical_provider || ''
        })
        setShowAddForm(true)

        // Clean up URL parameters
        const newUrl = new URL(window.location)
        newUrl.searchParams.delete('edit')
        newUrl.searchParams.delete('from')
        window.history.replaceState({}, '', newUrl)
      }
    }
  }, [searchParams, bulletins])

  // Purge expired announcements from database
  const purgeExpiredAnnouncements = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        return
      }

      const now = new Date().toISOString()
      
      // Delete expired announcements
      const { error } = await supabase
        .from('family_bulletins')
        .delete()
        .lt('expires_at', now)
        .not('expires_at', 'is', null)

      if (error) {
        console.error('Error purging expired announcements:', error)
        setError('Failed to purge expired announcements')
      } else {
        // Refresh bulletins after successful purge
        setHasLoadedBulletins(false)
        await fetchBulletins()
      }
    } catch (err) {
      console.error('Error purging expired announcements:', err)
      setError('Failed to purge expired announcements')
    }
  }, [])

  // Group bulletins (filtering is now handled by the API)
  const groupedBulletins = useMemo(() => {
    // No need to filter here since the API handles all filtering
    const filtered = bulletins

    // Group by category
    const grouped = filtered.reduce((acc, bulletin) => {
      const category = bulletin.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(bulletin)
      return acc
    }, {})

    // Sort each group
    Object.keys(grouped).forEach(category => {
      if (category === 'appointment') {
        // Sort appointments depending on status filter
        if (filters.status === 'active') {
          // Active: all non-expired already (API), sort by soonest first (ascending)
          grouped[category].sort((a, b) => {
            const dateA = a.appointment_datetime ? new Date(a.appointment_datetime) : new Date('9999-12-31')
            const dateB = b.appointment_datetime ? new Date(b.appointment_datetime) : new Date('9999-12-31')
            return dateA - dateB
          })
        } else {
          // All: non-expired first, then by appointment date (most recent first)
          grouped[category].sort((a, b) => {
            const now = new Date()
            const aExpired = a.expires_at && new Date(a.expires_at) <= now
            const bExpired = b.expires_at && new Date(b.expires_at) <= now
            if (aExpired !== bExpired) {
              return aExpired ? 1 : -1
            }
            const dateA = a.appointment_datetime ? new Date(a.appointment_datetime) : new Date('1900-01-01')
            const dateB = b.appointment_datetime ? new Date(b.appointment_datetime) : new Date('1900-01-01')
            return dateB - dateA
          })
        }
      } else {
        // Sort other categories by priority (high first) then by creation date (newest first)
        grouped[category].sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
          if (priorityDiff !== 0) return priorityDiff
          return new Date(b.created_at) - new Date(a.created_at)
        })
      }
    })

    return grouped
  }, [bulletins, filters])



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
      // Specialized fields
      url: '',
      website_email: '',
      website_password: '',
      appointment_datetime: '',
      appointment_location: '',
      payment_amount: '',
      payment_due_date: '',
      payment_reference: '',
      payment_recipient: '',
      action_required: false,
      medical_provider: ''
    })
    setEditingBulletin(null)
    setShowAddForm(false)
    setRefreshCreatedDate(false)
    
    // If user came from dashboard, redirect back there
    if (cameFromDashboard) {
      setCameFromDashboard(false)
      router.push('/family')
    }
  }

  const handleRefreshCreatedDate = () => {
    if (editingBulletin) {
      // Set flag to refresh created date on submit
      setRefreshCreatedDate(true)
      
      // Show a brief confirmation
      alert('Created date will be refreshed to current time when you save the announcement.')
    }
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

      // Convert appointment/expiration time from Arizona time to UTC for storage
      const dataToSend = { ...formData }
      
      // If editing and refresh was requested, update created_at to current time
      if (editingBulletin && refreshCreatedDate) {
        dataToSend.created_at = new Date().toISOString()
        dataToSend.updated_at = new Date().toISOString()
      }
      
      if (formData.appointment_datetime) {
        // Treat the input as Arizona time and convert to UTC
        const arizonaTime = new Date(formData.appointment_datetime + '-07:00') // Arizona is UTC-7
        dataToSend.appointment_datetime = arizonaTime.toISOString()
        
        // For appointment announcements, automatically set expiration to 2 hours after appointment
        if (formData.category === 'appointment') {
          const expirationTime = new Date(arizonaTime.getTime() + (2 * 60 * 60 * 1000)) // Add 2 hours
          dataToSend.expires_at = expirationTime.toISOString()
        }
      }
      
      // Only set expiration manually for non-appointment announcements
      if (formData.expires_at && formData.category !== 'appointment') {
        // Treat the input as Arizona time and convert to UTC
        const arizonaExpire = new Date(formData.expires_at + '-07:00')
        dataToSend.expires_at = arizonaExpire.toISOString()
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
        body: JSON.stringify(dataToSend)
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to save bulletin')
        return
      }

      // Refresh bulletins and reset form
      setHasLoadedBulletins(false)
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
    
    // Convert expiration from UTC to Arizona time for editing (only for non-appointment announcements)
    let expiresAtLocal = ''
    if (bulletin.expires_at && bulletin.category !== 'appointment') {
      const date = new Date(bulletin.expires_at)
      
      // Use Intl.DateTimeFormat to properly convert to Arizona timezone
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Phoenix',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      
      const parts = formatter.formatToParts(date)
      const year = parts.find(part => part.type === 'year').value
      const month = parts.find(part => part.type === 'month').value
      const day = parts.find(part => part.type === 'day').value
      const hour = parts.find(part => part.type === 'hour').value
      const minute = parts.find(part => part.type === 'minute').value
      
      expiresAtLocal = `${year}-${month}-${day}T${hour}:${minute}`
    }
    
    let appointmentDateTime = ''
    if (bulletin.appointment_datetime) {
      // Convert from UTC to Arizona time for editing
      const date = new Date(bulletin.appointment_datetime)
      
      // Use Intl.DateTimeFormat to properly convert to Arizona timezone
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Phoenix',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      
      const parts = formatter.formatToParts(date)
      const year = parts.find(part => part.type === 'year').value
      const month = parts.find(part => part.type === 'month').value
      const day = parts.find(part => part.type === 'day').value
      const hour = parts.find(part => part.type === 'hour').value
      const minute = parts.find(part => part.type === 'minute').value
      
      appointmentDateTime = `${year}-${month}-${day}T${hour}:${minute}`
    }
    
    const ratingValue = bulletin.rating ? parseInt(bulletin.rating) : 0
    
    setFormData({
      title: bulletin.title,
      content: bulletin.content,
      category: bulletin.category,
      priority: bulletin.priority,
      expires_at: expiresAtLocal,
      rating: ratingValue,
      // Specialized fields
      url: bulletin.url || '',
      website_email: bulletin.website_email || '',
      website_password: bulletin.website_password || '',
      appointment_datetime: appointmentDateTime,
      appointment_location: bulletin.appointment_location || '',
      payment_amount: bulletin.payment_amount || '',
      payment_due_date: bulletin.payment_due_date || '',
      payment_reference: bulletin.payment_reference || '',
      payment_recipient: bulletin.payment_recipient || '',
      action_required: bulletin.action_required || false,
      medical_provider: bulletin.medical_provider || ''
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
    setHasLoadedBulletins(false)
    await fetchBulletins()
  }

  const copyToClipboard = async (text, bulletinId) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedUrl(bulletinId)
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch (err) {
      console.error('Failed to copy text:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopiedUrl(bulletinId)
        setTimeout(() => setCopiedUrl(null), 2000)
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr)
      }
      document.body.removeChild(textArea)
    }
  }

  const copyCredentials = async (type, value, bulletinId) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedCredentials({ type, bulletinId })
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopiedCredentials({ type: null, bulletinId: null }), 2000)
    } catch (err) {
      console.error('Failed to copy credentials:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = value
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopiedCredentials({ type, bulletinId })
        setTimeout(() => setCopiedCredentials({ type: null, bulletinId: null }), 2000)
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr)
      }
      document.body.removeChild(textArea)
    }
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
      case 'medical': return 'text-red-700 bg-red-50 border border-red-200 dark:text-red-300 dark:bg-red-900/20 dark:border-red-800/30'
      case 'general': return 'text-gray-700 bg-gray-50 border border-gray-200 dark:text-gray-300 dark:bg-gray-600 dark:border-gray-500'
      default: return 'text-gray-700 bg-gray-50 border border-gray-200 dark:text-gray-300 dark:bg-gray-600 dark:border-gray-500'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'No expiration'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Phoenix'
    })
  }

  const formatAppointmentDate = (dateString) => {
    if (!dateString) return 'No appointment time'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Phoenix'
    })
  }

  const isExpired = (dateString) => {
    if (!dateString) return false
    const expirationDate = new Date(dateString)
    const currentDate = new Date()
    // Compare UTC timestamps to avoid timezone issues
    return expirationDate.getTime() < currentDate.getTime()
  }

  // Show loading while auth and permissions are being determined
  if (authLoading || permissionsLoading || pageLoading) {
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Family Announcements
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage important family updates and reminders
              </p>
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-4 flex flex-col sm:flex-row gap-2">
              {canCreateAnnouncement && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Announcement
                </button>
              )}
              {canManageUsers && (
                <button
                  onClick={purgeExpiredAnnouncements}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Purge Expired
                </button>
              )}
            </div>
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
                <option value="medical">Medical</option>
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
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
              >
                <option value="active">Active</option>
                <option value="all">All</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ category: 'all', priority: 'all', status: 'active' })}
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
        <div className="bg-transparent rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 text-center">
              <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-gray-900 dark:text-gray-100">
                Loading announcements...
              </div>
            </div>
          ) : Object.keys(groupedBulletins).length > 0 ? (
            <div className="space-y-8">
              {Object.entries(groupedBulletins).map(([category, bulletins]) => {
                const getCategoryIcon = (cat) => {
                  switch (cat) {
                    case 'appointment':
                      return (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )
                    case 'website':
                      return (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                        </svg>
                      )
                    case 'general':
                      return (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                      )
                    case 'reminder':
                      return (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.828 7l2.586 2.586a2 2 0 002.828 0L12.828 7H4.828zM4.828 17h8l-2.586-2.586a2 2 0 00-2.828 0L4.828 17z" />
                        </svg>
                      )
                    default:
                      return (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )
                  }
                }

                const getCategoryGradient = (cat) => {
                  switch (cat) {
                    case 'appointment':
                      return 'from-blue-500 to-indigo-600'
                    case 'website':
                      return 'from-green-500 to-emerald-600'
                    case 'general':
                      return 'from-purple-500 to-violet-600'
                    case 'reminder':
                      return 'from-orange-500 to-red-600'
                    default:
                      return 'from-gray-500 to-slate-600'
                  }
                }

                return (
                  <div key={category} className="space-y-4">
                    <div className="relative">
                      <div className={`absolute inset-0 bg-gradient-to-r ${getCategoryGradient(category)} rounded-xl opacity-10`}></div>
                      <div className="relative bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg bg-gradient-to-r ${getCategoryGradient(category)} text-white`}>
                              {getCategoryIcon(category)}
                            </div>
                            <div className="flex-1">
                              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 capitalize">
                                {category} Announcements
                              </h2>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {bulletins.length} {bulletins.length === 1 ? 'announcement' : 'announcements'}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                {bulletins.length}
                              </span>
                            </div>
                          </div>
                        </div>
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
                    {bulletins.map((bulletin) => (
                <div key={bulletin.id} className={`p-6 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${isExpired(bulletin.expires_at) ? 'relative pl-4 bg-zinc-100 dark:bg-slate-800/60 border border-dashed border-gray-400 dark:border-gray-500' : ''}`}>
                  {isExpired(bulletin.expires_at) && (
                    <div className="absolute left-0 top-0 h-full w-1.5 bg-red-600 dark:bg-red-500" aria-hidden="true"></div>
                  )}
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="flex items-start space-x-3 mb-2">
                        {/* Date Badge for active (non-expired) appointments */}
                        {bulletin.category === 'appointment' && bulletin.appointment_datetime && !isExpired(bulletin.expires_at) && (
                          (() => {
                            const appointmentDate = new Date(bulletin.appointment_datetime)
                            const month = appointmentDate.toLocaleDateString('en-US', { month: 'short', timeZone: 'America/Phoenix' })
                            const day = appointmentDate.getDate()
                            const time = appointmentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Phoenix' })
                            return (
                              <div className="flex-shrink-0 w-16 bg-white rounded shadow-sm overflow-hidden">
                                <div className="bg-red-500 text-white text-xs font-medium text-center py-0.5">
                                  {month}
                                </div>
                                <div className="text-center py-1">
                                  <div className="text-lg font-bold text-black leading-none">{day}</div>
                                  <div className="text-xs text-gray-600">{time}</div>
                                </div>
                              </div>
                            )
                          })()
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2 sm:mb-0">
                              {bulletin.title}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(bulletin.priority)}`}>
                                {bulletin.priority}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(bulletin.category)}`}>
                                {bulletin.category}
                              </span>
                              {isExpired(bulletin.expires_at) && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/30">
                                  Expired
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 mb-3 whitespace-pre-wrap">
                            {bulletin.content}
                          </p>
                          
                          {/* Rating Display */}
                          {bulletin.rating && bulletin.rating > 0 && (
                            <div className="mb-3">
                              <StarRating rating={bulletin.rating} size="sm" />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Specialized Fields Display */}
                      {bulletin.category === 'website' && (
                        <div className="mb-3 space-y-2">
                          {bulletin.url && (
                            <div className="flex items-center space-x-3">
                              <a
                                href={bulletin.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                Visit Website
                              </a>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  copyToClipboard(bulletin.url, bulletin.id)
                                }}
                                className={`inline-flex items-center text-sm transition-colors ${
                                  copiedUrl === bulletin.id
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                                title="Copy link to clipboard"
                              >
                                {copiedUrl === bulletin.id ? (
                                  <>
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Copy Link
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                          {bulletin.website_email && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Email/User ID:</span>{' '}
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  copyCredentials('email', bulletin.website_email, bulletin.id)
                                }}
                                className={`inline-flex items-center transition-colors ${
                                  copiedCredentials.type === 'email' && copiedCredentials.bulletinId === bulletin.id
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300'
                                }`}
                                title="Copy email to clipboard"
                              >
                                {copiedCredentials.type === 'email' && copiedCredentials.bulletinId === bulletin.id ? (
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                )}
                              </button>
                              {bulletin.website_email}
                            </div>
                          )}
                          {bulletin.website_password && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Password:</span>{' '}
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  copyCredentials('password', bulletin.website_password, bulletin.id)
                                }}
                                className={`inline-flex items-center transition-colors ${
                                  copiedCredentials.type === 'password' && copiedCredentials.bulletinId === bulletin.id
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300'
                                }`}
                                title="Copy password to clipboard"
                              >
                                {copiedCredentials.type === 'password' && copiedCredentials.bulletinId === bulletin.id ? (
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                )}
                              </button>
                              ••••••••
                            </div>
                          )}
                        </div>
                      )}

                      {bulletin.category === 'appointment' && (bulletin.appointment_datetime || bulletin.appointment_location) && (
                        <div className="mb-3 space-y-1">
                          {/* Removed Date & Time line because badge displays this info */}
                          {bulletin.appointment_location && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Location:</span> {bulletin.appointment_location}
                            </div>
                          )}
                        </div>
                      )}

                      {bulletin.category === 'payment' && (bulletin.payment_amount || bulletin.payment_due_date || bulletin.payment_reference || bulletin.payment_recipient) && (
                        <div className="mb-3 space-y-1">
                          {bulletin.payment_amount && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Amount:</span> ${parseFloat(bulletin.payment_amount).toFixed(2)}
                            </div>
                          )}
                          {bulletin.payment_due_date && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Due Date:</span> {new Date(bulletin.payment_due_date).toLocaleDateString()}
                            </div>
                          )}
                          {bulletin.payment_reference && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Reference:</span> {bulletin.payment_reference}
                            </div>
                          )}
                          {bulletin.payment_recipient && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Recipient:</span> {bulletin.payment_recipient}
                            </div>
                          )}
                        </div>
                      )}

                      {bulletin.category === 'general' && bulletin.action_required && (
                        <div className="mb-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/30">
                            Action Required
                          </span>
                        </div>
                      )}

                      {bulletin.category === 'medical' && bulletin.medical_provider && (
                        <div className="mb-3">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Provider:</span> {bulletin.medical_provider}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-500 dark:text-gray-500 space-y-1 sm:space-y-0 sm:space-x-4">
                        <span>{filters.status === 'all' && isExpired(bulletin.expires_at) ? 'Expired on' : 'Expires on'}: {formatDate(bulletin.expires_at)}</span>
                        <span>Created: {new Date(bulletin.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {(canEditAnnouncement || canDeleteAnnouncement) && (
                      <div className="flex space-x-2 mt-4 lg:mt-0 lg:ml-4">
                        {canEditAnnouncement && (
                          <button
                            onClick={() => handleEdit(bulletin)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                        )}
                        {canDeleteAnnouncement && (
                          <button
                            onClick={() => handleDelete(bulletin)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded text-red-600 bg-red-100 hover:bg-red-200 dark:text-red-300 dark:bg-red-900/30 dark:hover:bg-red-900/50 transition-colors"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No announcements</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {filters.category !== 'all' || filters.priority !== 'all' || filters.status !== 'active'
                  ? 'No announcements match your current filters.'
                  : 'Get started by creating a new announcement.'
                }
              </p>
              {canCreateAnnouncement && (
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
                    Content {formData.category !== 'appointment' ? '*' : ''}
                  </label>
                  <textarea
                    id="content"
                    name="content"
                    required={formData.category !== 'appointment'}
                    rows={4}
                    value={formData.content}
                    onChange={handleFormChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
                    placeholder={formData.category === 'appointment' ? 'Optional appointment details' : 'Announcement content'}
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
                      <option value="medical">Medical</option>
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

                {/* Rating Field */}
                <div>
                  <label htmlFor="rating" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Rating (Optional)
                  </label>
                  <StarRatingDropdown
                    rating={formData.rating}
                    onRatingChange={(rating) => setFormData(prev => ({ ...prev, rating }))}
                    disabled={submitting}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Rate this announcement from 1-5 stars. Unrated announcements won&apos;t show star ratings.
                  </p>
                </div>

                {/* Specialized Fields - Right after category/priority */}
                {formData.category === 'appointment' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="appointment_datetime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        id="appointment_datetime"
                        name="appointment_datetime"
                        value={formData.appointment_datetime}
                        onChange={handleFormChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Enter time in Arizona timezone (MST - no daylight saving)
                      </p>
                    </div>
                    <div>
                      <label htmlFor="appointment_location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Location
                      </label>
                      <input
                        type="text"
                        id="appointment_location"
                        name="appointment_location"
                        value={formData.appointment_location}
                        onChange={handleFormChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
                        placeholder="Address, room, etc."
                      />
                    </div>
                  </div>
                )}

                {formData.category === 'payment' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="payment_amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        id="payment_amount"
                        name="payment_amount"
                        value={formData.payment_amount}
                        onChange={handleFormChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label htmlFor="payment_due_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Due Date
                      </label>
                      <input
                        type="date"
                        id="payment_due_date"
                        name="payment_due_date"
                        value={formData.payment_due_date}
                        onChange={handleFormChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label htmlFor="payment_reference" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Reference/Account
                      </label>
                      <input
                        type="text"
                        id="payment_reference"
                        name="payment_reference"
                        value={formData.payment_reference}
                        onChange={handleFormChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
                        placeholder="Account number, reference code"
                      />
                    </div>
                    <div>
                      <label htmlFor="payment_recipient" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Recipient
                      </label>
                      <input
                        type="text"
                        id="payment_recipient"
                        name="payment_recipient"
                        value={formData.payment_recipient}
                        onChange={handleFormChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
                        placeholder="Who to pay"
                      />
                    </div>
                  </div>
                )}

                {formData.category === 'website' && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Website URL
                      </label>
                      <input
                        type="url"
                        id="url"
                        name="url"
                        value={formData.url}
                        onChange={handleFormChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
                        placeholder="https://example.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="website_email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email/User ID
                      </label>
                      <input
                        type="text"
                        id="website_email"
                        name="website_email"
                        value={formData.website_email}
                        onChange={handleFormChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
                        placeholder="email@example.com or username"
                      />
                    </div>
                    <div>
                      <label htmlFor="website_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Password
                      </label>
                      <input
                        type="password"
                        id="website_password"
                        name="website_password"
                        value={formData.website_password}
                        onChange={handleFormChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
                        placeholder="Password"
                      />
                    </div>
                  </div>
                )}

                {formData.category === 'general' && (
                  <div className="flex items-center">
                    <input
                      id="action_required"
                      name="action_required"
                      type="checkbox"
                      checked={formData.action_required}
                      onChange={handleFormChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="action_required" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Action Required
                    </label>
                  </div>
                )}

                {formData.category === 'medical' && (
                  <div>
                    <label htmlFor="medical_provider" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Provider
                    </label>
                    <input
                      type="text"
                      id="medical_provider"
                      name="medical_provider"
                      value={formData.medical_provider}
                      onChange={handleFormChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
                      placeholder="Doctor, hospital, clinic name"
                    />
                  </div>
                )}


                {/* Only show expiration date for non-appointment announcements */}
                {formData.category !== 'appointment' && (
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
                      placeholder="Enter time in Arizona timezone"
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Leave empty for no expiration
                  </p>
                </div>
                )}
                
                {/* Show info message for appointment announcements */}
                {formData.category === 'appointment' && formData.appointment_datetime && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <span className="font-medium">Auto-expiration:</span> This appointment will automatically expire 2 hours after the appointment time.
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  {editingBulletin && (
                    <button
                      type="button"
                      onClick={handleRefreshCreatedDate}
                      className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh Date
                    </button>
                  )}
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
