'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { uploadImage } from '@/utils/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function BackgroundSelectModal({ isOpen, onClose }) {
  const { user } = useAuth()
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [transparency, setTransparency] = useState(90) // 0-100, default 90%
  const [screenColor, setScreenColor] = useState('#f9fafb') // default gray-50
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)
  const dropZoneRef = useRef(null)

  // Load current background and settings if exists
  useEffect(() => {
    if (isOpen && user?.user_metadata) {
      if (user.user_metadata.just_for_me_background) {
        setPreviewUrl(user.user_metadata.just_for_me_background)
      }
      if (user.user_metadata.just_for_me_background_transparency !== undefined) {
        setTransparency(user.user_metadata.just_for_me_background_transparency)
      }
      if (user.user_metadata.just_for_me_background_color) {
        setScreenColor(user.user_metadata.just_for_me_background_color)
      }
    } else if (isOpen) {
      setPreviewUrl(null)
      setTransparency(90)
      setScreenColor('#f9fafb')
    }
    setImageFile(null)
    setError(null)
  }, [isOpen, user])

  const handleFileSelect = (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    
    setImageFile(file)
    setError(null)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleSave = async () => {
    if (!user) {
      setError('Not authenticated')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let imageUrl = user?.user_metadata?.just_for_me_background

      // Upload new image if one was selected
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, 'just-for-me-backgrounds')
      }

      // If no image and no existing image, show error
      if (!imageUrl) {
        setError('Please select an image')
        setLoading(false)
        return
      }

      // Update user metadata with background URL and settings
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/profile/update-background', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          backgroundUrl: imageUrl,
          transparency: transparency,
          screenColor: screenColor
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save background')
      }

      // Refresh session to get updated user data
      await supabase.auth.refreshSession()
      
      // Clean up preview URL
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }

      onClose()
    } catch (err) {
      console.error('Error saving background:', err)
      setError(err.message || 'Failed to save background')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/profile/update-background', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          backgroundUrl: null
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove background')
      }

      await supabase.auth.refreshSession()
      
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }

      setPreviewUrl(null)
      setImageFile(null)
      onClose()
    } catch (err) {
      console.error('Error removing background:', err)
      setError(err.message || 'Failed to remove background')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      // Clean up preview URL if it's a blob URL
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
      setImageFile(null)
      setPreviewUrl(null)
      setError(null)
      onClose()
    }
  }

  // Add paste listener when modal is open
  useEffect(() => {
    if (!isOpen) return
    
    const pasteHandler = (e) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile()
          if (file) {
            handleFileSelect(file)
          }
          break
        }
      }
    }
    
    window.addEventListener('paste', pasteHandler)
    return () => {
      window.removeEventListener('paste', pasteHandler)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
        onClick={handleClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Select Background
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Drag and Drop Zone */}
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500'
              }`}
            >
              {previewUrl ? (
                <div className="space-y-4">
                  <div className="relative inline-block">
                    {/* Preview with overlay showing current settings */}
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Background preview"
                        className="max-h-64 max-w-full rounded-lg shadow-lg"
                      />
                      <div 
                        className="absolute inset-0 rounded-lg"
                        style={{
                          backgroundColor: screenColor,
                          opacity: transparency / 100
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600"
                    >
                      Change Image
                    </button>
                    {user?.user_metadata?.just_for_me_background && (
                      <button
                        onClick={handleRemove}
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-600 text-sm font-medium rounded-md text-red-700 dark:text-red-300 bg-white dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                      >
                        Remove Background
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div>
                    <label
                      htmlFor="background-upload"
                      className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Select Image
                    </label>
                    <input
                      ref={fileInputRef}
                      id="background-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      or drag and drop an image here
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                      You can also paste an image from your clipboard (Ctrl+V / Cmd+V)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Background Settings Controls */}
            {previewUrl && (
              <div className="mt-6 space-y-4 border-t border-gray-200 dark:border-slate-700 pt-6">
                <div>
                  <label htmlFor="transparency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Transparency: {transparency}%
                  </label>
                  <input
                    type="range"
                    id="transparency"
                    min="0"
                    max="100"
                    value={transparency}
                    onChange={(e) => setTransparency(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>More transparent</span>
                    <span>More opaque</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="screenColor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Screen Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      id="screenColor"
                      value={screenColor}
                      onChange={(e) => setScreenColor(e.target.value)}
                      className="h-10 w-20 rounded border border-gray-300 dark:border-slate-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={screenColor}
                      onChange={(e) => setScreenColor(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="#f9fafb"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Color of the overlay screen in front of the background image
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {previewUrl && (
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : imageFile ? 'Save Background' : 'Save Settings'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

