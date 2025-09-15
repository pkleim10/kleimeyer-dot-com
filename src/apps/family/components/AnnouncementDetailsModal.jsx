'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import { StarRating } from '@/apps/shared/components'

export default function AnnouncementDetailsModal({ 
  bulletinId, 
  isOpen, 
  onClose, 
  onEdit 
}) {
  const { canEditAnnouncement } = usePermissions()
  
  const [bulletin, setBulletin] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  useEffect(() => {
    if (isOpen && bulletinId) {
      fetchBulletin()
    }
  }, [isOpen, bulletinId])

  const fetchBulletin = async () => {
    try {
      setLoading(true)
      setError('')
      
      const { data, error } = await supabase
        .from('family_bulletins')
        .select('*')
        .eq('id', bulletinId)
        .single()

      if (error) {
        console.error('Error fetching bulletin:', error)
        setError('Failed to load announcement')
      } else if (!data) {
        setError('Announcement not found')
      } else {
        setBulletin(data)
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to load announcement')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async () => {
    if (!onEdit || !bulletin) return
    
    setEditLoading(true)
    
    try {
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 100))
      onEdit(bulletin)
      onClose()
    } finally {
      setEditLoading(false)
    }
  }



  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Phoenix'
    })
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Phoenix'
    })
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'appointment':
        return (
          <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      case 'payment':
        return (
          <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        )
      case 'website':
        return (
          <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
          </svg>
        )
      case 'medical':
        return (
          <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        )
      default:
        return (
          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        )
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30'
      case 'low':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-slate-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Announcement Details
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-gray-900 dark:text-gray-100">
                Loading...
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                  Error
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          ) : bulletin ? (
            <div className="space-y-6">
              {/* Announcement Header */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    bulletin.category === 'appointment' ? 'bg-red-100 dark:bg-red-900/30' :
                    bulletin.category === 'payment' ? 'bg-orange-100 dark:bg-orange-900/30' :
                    bulletin.category === 'website' ? 'bg-green-100 dark:bg-green-900/30' :
                    bulletin.category === 'medical' ? 'bg-purple-100 dark:bg-purple-900/30' :
                    'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    {getCategoryIcon(bulletin.category)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {bulletin.title}
                    </h1>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(bulletin.priority)}`}>
                      {bulletin.priority}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="capitalize">{bulletin.category}</span>
                    <span>•</span>
                    <span>Created {formatDate(bulletin.created_at)}</span>
                    {bulletin.expires_at && (
                      <>
                        <span>•</span>
                        <span>Expires {formatDate(bulletin.expires_at)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Announcement Content */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Content</h3>
                <div className="prose prose-gray dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {bulletin.content}
                  </p>
                </div>
              </div>

              {/* Rating Display */}
              {bulletin.rating && bulletin.rating > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Rating</h3>
                  <StarRating rating={bulletin.rating} size="md" />
                </div>
              )}

              {/* Specialized Fields */}
              {(bulletin.category === 'appointment' && bulletin.appointment_datetime) && (
                <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Appointment Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Date & Time</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-100">{formatDateTime(bulletin.appointment_datetime)}</dd>
                    </div>
                    {bulletin.appointment_location && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</dt>
                        <dd className="text-sm text-gray-900 dark:text-gray-100">{bulletin.appointment_location}</dd>
                      </div>
                    )}
                    {bulletin.medical_provider && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Provider</dt>
                        <dd className="text-sm text-gray-900 dark:text-gray-100">{bulletin.medical_provider}</dd>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(bulletin.category === 'payment' && (bulletin.payment_amount || bulletin.payment_due_date)) && (
                <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Payment Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bulletin.payment_amount && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Amount</dt>
                        <dd className="text-sm text-gray-900 dark:text-gray-100">{bulletin.payment_amount}</dd>
                      </div>
                    )}
                    {bulletin.payment_due_date && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Due Date</dt>
                        <dd className="text-sm text-gray-900 dark:text-gray-100">{formatDate(bulletin.payment_due_date)}</dd>
                      </div>
                    )}
                    {bulletin.payment_recipient && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Recipient</dt>
                        <dd className="text-sm text-gray-900 dark:text-gray-100">{bulletin.payment_recipient}</dd>
                      </div>
                    )}
                    {bulletin.payment_reference && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Reference</dt>
                        <dd className="text-sm text-gray-900 dark:text-gray-100">{bulletin.payment_reference}</dd>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(bulletin.category === 'website' && (bulletin.url || bulletin.website_email)) && (
                <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Website Details</h3>
                  <div className="space-y-3">
                    {bulletin.url && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">URL</dt>
                        <dd className="text-sm">
                          <a 
                            href={bulletin.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {bulletin.url}
                          </a>
                        </dd>
                      </div>
                    )}
                    {bulletin.website_email && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
                        <dd className="text-sm text-gray-900 dark:text-gray-100">{bulletin.website_email}</dd>
                      </div>
                    )}
                    {bulletin.website_password && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Password</dt>
                        <dd className="text-sm text-gray-900 dark:text-gray-100">{bulletin.website_password}</dd>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {bulletin.action_required && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Action Required
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
          {canEditAnnouncement && bulletin && (
            <button
              onClick={handleEdit}
              disabled={editLoading}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </>
              ) : (
                'Edit'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
