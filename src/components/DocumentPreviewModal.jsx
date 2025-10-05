'use client'

import { useState, useEffect } from 'react'

export default function DocumentPreviewModal({ isOpen, onClose, document: doc, previewUrl }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen && previewUrl && doc) {
      setLoading(true)
      setError(null)
      
      // For images, check if already loaded
      if (doc.file_type === 'image') {
        checkImageLoaded(previewUrl)
      }
      
      // Fallback timeout to clear loading state
      const timeoutId = setTimeout(() => {
        setLoading(false)
      }, 5000) // 5 second timeout
      
      return () => clearTimeout(timeoutId)
    }
  }, [isOpen, previewUrl, doc])

  const handleImageLoad = () => {
    setLoading(false)
  }

  const handleImageError = () => {
    setLoading(false)
    setError('Failed to load preview')
  }

  const handleIframeLoad = () => {
    setLoading(false)
  }

  // Check if image is already loaded (for cached images)
  const checkImageLoaded = (src) => {
    const img = new Image()
    img.onload = () => setLoading(false)
    img.onerror = () => {
      setLoading(false)
      setError('Failed to load preview')
    }
    img.src = src
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const setupDOM = () => {
      try {
        if (isOpen) {
          document.addEventListener('keydown', handleKeyDown)
          if (document.body) {
            document.body.style.overflow = 'hidden'
          }
        } else {
          if (document.body) {
            document.body.style.overflow = 'unset'
          }
        }
      } catch (error) {
        console.warn('DOM not ready for modal setup:', error)
      }
    }

    // Use requestAnimationFrame to ensure DOM is ready
    const timeoutId = setTimeout(setupDOM, 0)

    return () => {
      clearTimeout(timeoutId)
      try {
        document.removeEventListener('keydown', handleKeyDown)
        if (document.body) {
          document.body.style.overflow = 'unset'
        }
      } catch (error) {
        console.warn('Error cleaning up modal DOM:', error)
      }
    }
  }, [isOpen])

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading preview...</p>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">{error}</p>
          </div>
        </div>
      )
    }

    switch (doc.file_type) {
      case 'image':
        return (
          <img 
            src={previewUrl} 
            alt={doc.original_filename}
            className="max-w-full max-h-full object-contain mx-auto"
            onLoad={handleImageLoad}
            onError={handleImageError}
            onLoadStart={() => setLoading(true)}
            style={{ display: loading ? 'none' : 'block' }}
          />
        )
      case 'pdf':
        return (
          <iframe 
            src={previewUrl}
            className="w-full h-full border-0"
            title={doc.original_filename}
            onLoad={handleIframeLoad}
          />
        )
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">Preview not available for this file type</p>
            </div>
          </div>
        )
    }
  }

  if (!isOpen || !doc) return null

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
        
        {/* Modal */}
        <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full backdrop-blur-md border border-white/30 dark:border-slate-700/30">
          {/* Header */}
          <div className="bg-white/20 dark:bg-slate-800/20 backdrop-blur-sm px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-white/20 dark:border-slate-700/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {doc.file_type === 'image' ? (
                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
                    {doc.original_filename}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                    {doc.file_type} • {doc.category}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="bg-white/10 dark:bg-slate-800/10 backdrop-blur-sm px-4 pb-4 sm:p-6 sm:pt-4">
            <div className="h-96 sm:h-[500px] bg-white/20 dark:bg-slate-800/20 rounded-lg overflow-hidden">
              {renderPreview()}
            </div>
          </div>
          
          {/* Footer */}
          <div className="bg-white/20 dark:bg-slate-800/20 backdrop-blur-sm px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-white/20 dark:border-slate-700/20">
            <button
              onClick={() => window.open(previewUrl, '_blank')}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open in New Tab
            </button>
            <button
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-slate-600 shadow-sm px-4 py-2 bg-white/30 dark:bg-slate-700/30 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}