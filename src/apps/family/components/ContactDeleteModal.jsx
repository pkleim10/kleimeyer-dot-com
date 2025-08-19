'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase'

export default function ContactDeleteModal({ contact, isOpen, onClose, onDelete }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleDelete = async () => {
    setLoading(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('family_contacts')
        .delete()
        .eq('id', contact.id)

      if (deleteError) {
        console.error('Supabase error details:', deleteError)
        throw new Error(`Database error: ${deleteError.message}`)
      }

      onDelete(contact.id)
      onClose()
    } catch (err) {
      console.error('Error deleting contact:', err)
      setError(err.message || 'An error occurred while deleting the contact')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Semi-transparent backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
        data-testid="modal-backdrop"
      />
      
      {/* Modal content */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Delete Contact
            </h3>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-4">
                <div className="text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              </div>
            )}

            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Are you sure you want to delete the contact
              </p>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
                &quot;{contact?.name}&quot;?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This action cannot be undone.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Deleting...' : 'Delete Contact'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
