'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import { usePermissions } from '@/hooks/usePermissions'
import ContactDeleteModal from '@/apps/family/components/ContactDeleteModal'

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
  const [searchTerm, setSearchTerm] = useState('')
  const [bulletins, setBulletins] = useState([])
  const [bulletinsLoading, setBulletinsLoading] = useState(true)


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

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
  }

  const clearSearch = () => {
    setSearchTerm('')
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

      const response = await fetch('/api/family/bulletins?activeOnly=true', {
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

  // Get 2 most important bulletins for hero display
  const heroBulletins = useMemo(() => {
    const now = new Date()
    const activeBulletins = bulletins.filter(b => 
      b.is_active && 
      (!b.expires_at || new Date(b.expires_at) > now)
    )
    
    // Get most urgent (high priority)
    const urgent = activeBulletins
      .filter(b => b.priority === 'high')
      .sort((a, b) => new Date(a.expires_at || '9999-12-31') - new Date(b.expires_at || '9999-12-31'))[0]
    
    // Get soonest upcoming (by expiration date)
    const upcoming = activeBulletins
      .filter(b => b.id !== urgent?.id) // Don't duplicate urgent
      .sort((a, b) => new Date(a.expires_at || '9999-12-31') - new Date(b.expires_at || '9999-12-31'))[0]
    
    return [urgent, upcoming].filter(Boolean)
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
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/family-matters.jpeg"
            alt="Family Matters"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/70 to-indigo-700/70"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
              Family Matters
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-xl text-blue-100">
              Staying connected and informed during Dad&apos;s recovery
            </p>

            {/* Hero Bulletins */}
            {heroBulletins.length > 0 && (
              <div className="mt-8 space-y-3">
                {heroBulletins.map((bulletin) => (
                  <div key={bulletin.id} className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg p-4 max-w-2xl mx-auto">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            bulletin.priority === 'high' ? 'text-red-200 bg-red-900/30 border border-red-800/30' :
                            bulletin.priority === 'medium' ? 'text-yellow-200 bg-yellow-900/30 border border-yellow-800/30' :
                            'text-green-200 bg-green-900/30 border border-green-800/30'
                          }`}>
                            {bulletin.priority === 'high' ? '🚨' : bulletin.priority === 'medium' ? '⚠️' : 'ℹ️'} {bulletin.priority}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            bulletin.category === 'appointment' ? 'text-blue-200 bg-blue-900/30 border border-blue-800/30' :
                            bulletin.category === 'payment' ? 'text-purple-200 bg-purple-900/30 border border-purple-800/30' :
                            bulletin.category === 'website' ? 'text-indigo-200 bg-indigo-900/30 border border-indigo-800/30' :
                            'text-gray-200 bg-gray-900/30 border border-gray-800/30'
                          }`}>
                            {bulletin.category}
                          </span>
                        </div>
                        <h3 className="font-semibold text-white mb-1">{bulletin.title}</h3>
                        <p className="text-sm text-blue-100 mb-2">{bulletin.content}</p>
                        {bulletin.expires_at && (
                          <p className="text-xs text-blue-200">
                            Expires: {new Date(bulletin.expires_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="text-center">
                  <Link
                    href="/family/announcements"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-white/90 hover:bg-white transition-colors rounded-md"
                  >
                    View All Announcements
                  </Link>
                </div>
              </div>
            )}


          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Message */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Important Contacts
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            This page contains important contact information and updates regarding Dad&apos;s recovery. 
            Please check back regularly for updates and feel free to reach out to any of the contacts listed below.
          </p>
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
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Important Contacts
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Contact information for Dad&apos;s care team and family support
              </p>
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
          </div>

          {loading ? (
            <div className="p-6 text-center">
              <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-gray-900 dark:text-gray-100">
                Loading contacts...
              </div>
            </div>
          ) : filteredContacts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              {filteredContacts.map((contact) => (
                <div key={contact.id} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-6 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                        <div className="flex flex-col sm:flex-row sm:items-center mb-2 sm:mb-0">
                          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2 sm:mb-0">
                            {contact.name}
                          </h4>
                          {contact.phone && (
                            <a
                              href={`tel:${contact.phone}`}
                              className="sm:ml-4 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-300 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 transition-colors"
                            >
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                              </svg>
                              Call
                            </a>
                          )}
                        </div>
                        {(canEditContact || canDeleteContact) && (
                          <div className="hidden sm:flex space-x-2">
                            {canEditContact && (
                              <button
                                onClick={() => handleEdit(contact)}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                            )}
                            {canDeleteContact && (
                              <button
                                onClick={() => openDeleteModal(contact)}
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
                      
                      {contact.description && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          {contact.description}
                        </p>
                      )}
                      
                      {contact.phone && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
                          <span className="font-medium">Phone:</span> {contact.phone}
                        </p>
                      )}
                      
                      {contact.notes && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                          <p className="text-sm text-blue-800 dark:text-blue-300">
                            <span className="font-medium">Notes:</span> {contact.notes}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Mobile Action Buttons - Only visible on mobile */}
                    {(canEditContact || canDeleteContact) && (
                      <div className="flex sm:hidden space-x-2 mt-4">
                        {canEditContact && (
                          <button
                            onClick={() => handleEdit(contact)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                        )}
                        {canDeleteContact && (
                          <button
                            onClick={() => openDeleteModal(contact)}
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
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="mt-3 inline-flex items-center px-3 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}
        </div>

        {/* Copyright Section */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © 2024 kleimeyer-dot-com. All rights reserved.
          </p>
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
    </div>
  )
}
