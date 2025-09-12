'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import { usePermissions } from '@/hooks/usePermissions'
import ContactDeleteModal from '@/apps/family/components/ContactDeleteModal'
import AnnouncementDetailsModal from '@/apps/family/components/AnnouncementDetailsModal'

export default function FamilyMattersPage() {
  const { user, loading: authLoading } = useAuth()
  const { canCreateContact, canEditContact, canDeleteContact, isFamily } = usePermissions()
  const router = useRouter()
  
  console.log('Family page permissions:', { canCreateContact, canEditContact, canDeleteContact, user: !!user })
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pageLoading, setPageLoading] = useState(true)
  const [hasLoadedContacts, setHasLoadedContacts] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    description: '',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, contact: null })
  const [announcementModal, setAnnouncementModal] = useState({ isOpen: false, bulletinId: null })
  const [searchTerm, setSearchTerm] = useState('')
  const [bulletins, setBulletins] = useState([])
  const [bulletinsLoading, setBulletinsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [contactsPerPage] = useState(10)


  useEffect(() => {
    // Simple auth check - redirect if no user
    if (!authLoading && !user) {
      router.push('/login?redirect=/family')
      return
    }
    
    // If user is authenticated and we haven't loaded contacts yet, load them
    if (!authLoading && user && !hasLoadedContacts) {
      fetchContacts()
      setPageLoading(false)
    }
  }, [user, authLoading, router, hasLoadedContacts])

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      const { data, error } = await supabase
        .from('family_contacts')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching contacts:', error)
        setError('Failed to load contacts')
      } else {
        setContacts(data || [])
        setHasLoadedContacts(true)
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleRetry = useCallback(async () => {
    setError('')
    setHasLoadedContacts(false) // Reset the flag to allow re-fetching
    await fetchContacts()
  }, [fetchContacts])

  // Filter contacts based on search term
  const filteredContacts = useMemo(() => {
    if (!searchTerm.trim()) {
      return contacts
    }
    
    const searchLower = searchTerm.toLowerCase()
    return contacts.filter(contact => 
      contact.name?.toLowerCase().includes(searchLower) ||
      contact.description?.toLowerCase().includes(searchLower) ||
      contact.phone?.includes(searchTerm) ||
      contact.notes?.toLowerCase().includes(searchLower)
    )
  }, [contacts, searchTerm])

  // Pagination logic
  const totalContacts = filteredContacts.length
  const totalPages = Math.ceil(totalContacts / contactsPerPage)
  const startIndex = (currentPage - 1) * contactsPerPage
  const endIndex = startIndex + contactsPerPage
  const currentContacts = filteredContacts.slice(startIndex, endIndex)

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
  }

  const clearSearch = () => {
    setSearchTerm('')
  }

  // Pagination navigation functions
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  // Fetch bulletins for hero display
  const fetchBulletins = useCallback(async () => {
    try {
      setBulletinsLoading(true)
      
      // Get the current session to access the token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        return
      }

      const response = await fetch('/api/family/bulletins', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        console.error('Failed to fetch bulletins')
        return
      }

      const { bulletins } = await response.json()
      setBulletins(bulletins || [])
    } catch (err) {
      console.error('Error fetching bulletins:', err)
    } finally {
      setBulletinsLoading(false)
    }
  }, [])

  // Get announcements for hero display using new algorithm
  const heroBulletins = useMemo(() => {
    const now = new Date()
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    // Step 1: Initial selection
    // - Appointments: appointment_datetime between now and two weeks from now
    // - Other announcements: created_at between one week ago and now
    const initialSelection = bulletins.filter(bulletin => {
      // Skip expired announcements
      if (bulletin.expires_at && new Date(bulletin.expires_at) <= now) {
        return false
      }
      
      if (bulletin.category === 'appointment') {
        // Appointments: between now and two weeks from now
        if (!bulletin.appointment_datetime) return false
        const appointmentDate = new Date(bulletin.appointment_datetime)
        return appointmentDate >= now && appointmentDate <= twoWeeksFromNow
      } else {
        // Other announcements: created between one week ago and now
        if (!bulletin.created_at) return false
        const createdDate = new Date(bulletin.created_at)
        return createdDate >= oneWeekAgo && createdDate <= now
      }
    })
    
    // Step 2: If 4 or fewer items, return all
    if (initialSelection.length <= 4) {
      return initialSelection.sort((a, b) => {
        // Sort by appointment date for appointments, created date for others
        const dateA = a.category === 'appointment' 
          ? new Date(a.appointment_datetime) 
          : new Date(a.created_at)
        const dateB = b.category === 'appointment' 
          ? new Date(b.appointment_datetime) 
          : new Date(b.created_at)
        return dateA.getTime() - dateB.getTime()
      })
    }
    
    // Step 3: Assign selection dates
    const itemsWithSelectionDate = initialSelection.map(bulletin => {
      let selectionDate
      
      if (bulletin.category === 'appointment') {
        selectionDate = new Date(bulletin.appointment_datetime)
      } else if (bulletin.category === 'payment') {
        selectionDate = bulletin.payment_due_date ? new Date(bulletin.payment_due_date) : new Date(bulletin.created_at)
      } else {
        selectionDate = new Date(bulletin.created_at)
      }
      
      return {
        ...bulletin,
        selectionDate
      }
    })
    
    // Step 4: Smart selection - choose 4 items closest to now
    // Priority: at least 2 appointments if possible
    const appointments = itemsWithSelectionDate.filter(item => item.category === 'appointment')
    const nonAppointments = itemsWithSelectionDate.filter(item => item.category !== 'appointment')
    
    let selectedItems = []
    
    if (appointments.length >= 2) {
      // Include at least 2 appointments
      const sortedAppointments = appointments.sort((a, b) => 
        Math.abs(a.selectionDate.getTime() - now.getTime()) - Math.abs(b.selectionDate.getTime() - now.getTime())
      )
      
      // Take 2 closest appointments
      selectedItems.push(...sortedAppointments.slice(0, 2))
      
      // Fill remaining slots with closest non-appointments
      const remainingSlots = 4 - selectedItems.length
      if (remainingSlots > 0 && nonAppointments.length > 0) {
        const sortedNonAppointments = nonAppointments.sort((a, b) => 
          Math.abs(a.selectionDate.getTime() - now.getTime()) - Math.abs(b.selectionDate.getTime() - now.getTime())
        )
        selectedItems.push(...sortedNonAppointments.slice(0, remainingSlots))
      }
      
      // If we still have slots, add more appointments
      if (selectedItems.length < 4 && appointments.length > 2) {
        const remainingAppointments = sortedAppointments.slice(2)
        const remainingSlots = 4 - selectedItems.length
        selectedItems.push(...remainingAppointments.slice(0, remainingSlots))
      }
    } else {
      // Less than 2 appointments available, just select 4 closest items
      const allItems = itemsWithSelectionDate.sort((a, b) => 
        Math.abs(a.selectionDate.getTime() - now.getTime()) - Math.abs(b.selectionDate.getTime() - now.getTime())
      )
      selectedItems = allItems.slice(0, 4)
    }
    
    // Sort final selection by selection date
    return selectedItems.sort((a, b) => a.selectionDate.getTime() - b.selectionDate.getTime())
  }, [bulletins])

  // Fetch bulletins when component mounts
  useEffect(() => {
    if (!authLoading && user) {
      fetchBulletins()
    }
  }, [fetchBulletins, authLoading, user])

  const handleFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      description: '',
      notes: ''
    })
    setEditingContact(null)
    setShowAddForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      if (editingContact) {
        // Update existing contact
        const { error } = await supabase
          .from('family_contacts')
          .update(formData)
          .eq('id', editingContact.id)

        if (error) throw error
      } else {
        // Add new contact
        const { error } = await supabase
          .from('family_contacts')
          .insert(formData)

        if (error) throw error
      }

      // Refresh contacts and reset form
      await fetchContacts()
      resetForm()
    } catch (err) {
      console.error('Error saving contact:', err)
      setError('Failed to save contact')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (contact) => {
    console.log('Edit button clicked for contact:', contact)
    setEditingContact(contact)
    setFormData({
      name: contact.name,
      phone: contact.phone || '',
      description: contact.description || '',
      notes: contact.notes || ''
    })
    setShowAddForm(true)
  }

  const handleDelete = async (contactId) => {
    try {
      await fetchContacts()
    } catch (err) {
      console.error('Error refreshing contacts after delete:', err)
      setError('Failed to refresh contacts')
    }
  }

  const openDeleteModal = (contact) => {
    setDeleteModal({ isOpen: true, contact })
  }

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, contact: null })
  }

  const closeAnnouncementModal = () => {
    setAnnouncementModal({ isOpen: false, bulletinId: null })
  }

  const handleAnnouncementEdit = (bulletin) => {
    // Navigate to announcements page with edit mode and from=dashboard parameter
    router.push(`/family/announcements?edit=${bulletin.id}&from=dashboard`)
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
      {/* Compact Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/family-matters.jpeg"
            alt="Family Business"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/70 to-indigo-700/70"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto py-12 px-4 sm:py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
              Family Business
            </h1>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-blue-100">
              Keep on top of the latest family news and events
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Left Column - Recent Announcements (40%) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                  Recent & Upcoming
                                </h2>
                  </div>
                  <Link
                    href="/family/announcements"
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    View All
                    <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
              
              <div className="p-6">
                {bulletinsLoading ? (
                  <div className="text-center py-8">
                      <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-gray-900 dark:text-gray-100">
                        Loading announcements...
                      </div>
                  </div>
                ) : heroBulletins.length > 0 ? (
                  <div className="space-y-4">
                  {heroBulletins.map((bulletin) => {
                      // Get the appropriate date for display based on announcement type
                      let displayDate = null
                      if (bulletin.category === 'appointment' && bulletin.appointment_datetime) {
                        displayDate = new Date(bulletin.appointment_datetime)
                      } else if (bulletin.category === 'payment' && bulletin.payment_due_date) {
                        displayDate = new Date(bulletin.payment_due_date)
                      } else if (bulletin.selectionDate) {
                        displayDate = bulletin.selectionDate
                      }
                      
                      const month = displayDate ? displayDate.toLocaleDateString('en-US', { month: 'short', timeZone: 'America/Phoenix' }) : ''
                      const day = displayDate ? displayDate.getDate() : ''
                      const time = displayDate ? displayDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Phoenix' }) : ''
                  
                  return (
                        <div 
                          key={bulletin.id} 
                          className="group relative flex items-start space-x-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                          onClick={() => setAnnouncementModal({ isOpen: true, bulletinId: bulletin.id })}
                        >
                          {/* Click indicator */}
                          <div className="absolute top-3 right-3">
                            <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </div>
                          {/* Date Box */}
                          {displayDate ? (
                            <div className="flex-shrink-0 w-16 bg-white dark:bg-slate-600 rounded shadow-sm overflow-hidden">
                              <div className={`text-white text-xs font-medium text-center py-1 ${
                                bulletin.category === 'appointment' ? 'bg-red-500' :
                                bulletin.category === 'payment' ? 'bg-orange-500' :
                                'bg-blue-500'
                              }`}>
                              {month}
                            </div>
                              <div className="text-center py-2">
                                <div className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-none">{day}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">{time}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-16 flex items-center justify-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              bulletin.category === 'appointment' ? 'bg-red-100 dark:bg-red-900/30' :
                              bulletin.category === 'payment' ? 'bg-orange-100 dark:bg-orange-900/30' :
                              bulletin.category === 'website' ? 'bg-green-100 dark:bg-green-900/30' :
                              bulletin.category === 'medical' ? 'bg-purple-100 dark:bg-purple-900/30' :
                              'bg-blue-100 dark:bg-blue-900/30'
                            }`}>
                              {bulletin.category === 'appointment' ? (
                                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              ) : bulletin.category === 'payment' ? (
                                <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                              ) : bulletin.category === 'website' ? (
                                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                                </svg>
                              ) : bulletin.category === 'medical' ? (
                                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                              ) : (
                                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                </svg>
                              )}
                            </div>
                          </div>
                        )}

                          {/* Content */}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-2">{bulletin.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{bulletin.content}</p>
                      </div>
                    </div>
                  )
                  })}
                </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No recent announcements</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Check back later for updates</p>
              </div>
            )}
          </div>
        </div>
      </div>

          {/* Right Column - Contacts (60%) */}
          <div className="lg:col-span-3 space-y-6">
        {/* Error Message */}
        {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
            <div className="flex">
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                  Error
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                  <p>{error}</p>
                </div>
                <div className="mt-3">
                  <button
                    onClick={handleRetry}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-300 dark:bg-red-900/50 dark:hover:bg-red-900/70 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Retry
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contacts Section */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Important Contacts
              </h3>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-4 sm:mt-0">
              <button
                onClick={handleRetry}
                disabled={loading}
                className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              {canCreateContact && (
                <button
                  onClick={() => {
                    console.log('Add Contact button clicked')
                    setShowAddForm(true)
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                  Add Contact
                </button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search contacts by name, phone, description, or notes..."
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-slate-600 rounded-md leading-5 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {searchTerm && (
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Showing {filteredContacts.length} of {contacts.length} contacts
              </div>
            )}
            {!searchTerm && totalContacts > contactsPerPage && (
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Showing {startIndex + 1}-{Math.min(endIndex, totalContacts)} of {totalContacts} contacts
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-6 text-center">
              <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-gray-900 dark:text-gray-100">
                Loading contacts...
              </div>
            </div>
          ) : filteredContacts.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {currentContacts.map((contact) => (
                <div key={contact.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
                            {contact.name}
                          </h4>
                          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                            {contact.description && (
                              <span className="truncate">{contact.description}</span>
                            )}
                            {contact.phone && (
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                </svg>
                                {contact.phone}
                              </span>
                            )}
                          </div>
                          {contact.notes && (
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                              <span className="font-medium">Notes:</span> {contact.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {contact.phone && (
                            <a
                              href={`tel:${contact.phone}`}
                              className="inline-flex items-center p-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-300 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 transition-colors"
                              title="Call"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                              </svg>
                            </a>
                          )}
                        {(canEditContact || canDeleteContact) && (
                            <>
                            {canEditContact && (
                              <button
                                onClick={() => handleEdit(contact)}
                                  className="inline-flex items-center p-2 border border-transparent text-sm font-medium rounded text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
                                  title="Edit"
                              >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            )}
                            {canDeleteContact && (
                              <button
                                onClick={() => openDeleteModal(contact)}
                                  className="inline-flex items-center p-2 border border-transparent text-sm font-medium rounded text-red-600 bg-red-100 hover:bg-red-200 dark:text-red-300 dark:bg-red-900/30 dark:hover:bg-red-900/50 transition-colors"
                                  title="Delete"
                              >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                {searchTerm ? 'No contacts found' : 'No contacts yet'}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {searchTerm 
                  ? `No contacts match "${searchTerm}". Try a different search term.`
                  : 'Contact information will be added here soon.'
                }
              </p>
              {searchTerm && canCreateContact && (
                <div className="mt-3">
                <button
                    onClick={() => {
                      setFormData({
                        name: searchTerm,
                        phone: '',
                        description: '',
                        notes: ''
                      })
                      setShowAddForm(true)
                    }}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add this contact
                </button>
                </div>
              )}
            </div>
          )}

          {/* Pagination Controls */}
          {filteredContacts.length > contactsPerPage && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                            currentPage === pageNum
                              ? 'text-white bg-blue-600 border border-blue-600'
                              : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600"
                  >
                    Next
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Page {currentPage} of {totalPages}
                </div>
              </div>
            </div>
          )}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Contact Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-slate-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                {editingContact ? 'Edit Contact' : 'Add New Contact'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleFormChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
                    placeholder="Contact name"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <input
                    type="text"
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
                    placeholder="Role or relationship"
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={handleFormChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-gray-100"
                    placeholder="Additional notes or information"
                  />
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
                    {submitting ? 'Saving...' : (editingContact ? 'Update' : 'Add')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Contact Delete Modal */}
      <ContactDeleteModal
        contact={deleteModal.contact}
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onDelete={handleDelete}
      />

      {/* Announcement Details Modal */}
      <AnnouncementDetailsModal
        bulletinId={announcementModal.bulletinId}
        isOpen={announcementModal.isOpen}
        onClose={closeAnnouncementModal}
        onEdit={handleAnnouncementEdit}
      />
    </div>
  )
}
