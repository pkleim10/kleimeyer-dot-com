'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/utils/supabase'

export default function AlbumPage() {
  const { user } = useAuth()
  const { canViewFamily, canUploadDocuments, canManageDocuments, permissionsLoading } = usePermissions()
  const params = useParams()
  const router = useRouter()
  const albumId = params.id

  const [album, setAlbum] = useState(null)
  const [allPhotos, setAllPhotos] = useState([]) // Store all photos
  const [photos, setPhotos] = useState([]) // Displayed photos (filtered)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [photoToDelete, setPhotoToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [lightboxPhoto, setLightboxPhoto] = useState(null)
  const [showLightbox, setShowLightbox] = useState(false)
  const [isSlideshow, setIsSlideshow] = useState(false)
  const [slideshowInterval, setSlideshowInterval] = useState(null)
  const [settingCover, setSettingCover] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingPhoto, setEditingPhoto] = useState(null)
  const [editDescription, setEditDescription] = useState('')
  const [editTags, setEditTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    sortBy: 'newest'
  })

  // Redirect if no family permissions
  useEffect(() => {
    if (!permissionsLoading && !canViewFamily) {
      router.push('/')
    }
  }, [canViewFamily, permissionsLoading, router])

  const fetchAlbum = useCallback(async () => {
    if (!albumId) return

    try {
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      const response = await fetch(`/api/family/photos/albums/${albumId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (!response.ok) {
        throw new Error('Failed to fetch album')
      }
      const data = await response.json()
      setAlbum(data)
    } catch (err) {
      setError(err.message)
    }
  }, [albumId])

  const fetchPhotos = useCallback(async () => {
    if (!albumId) return

    try {
      const queryParams = new URLSearchParams({
        category: 'photos',
        albumId
      })

      // Get the session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      const response = await fetch(`/api/family/documents?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (!response.ok) {
        throw new Error('Failed to fetch photos')
      }
      const data = await response.json()
      const fetchedPhotos = data.documents || []
      
      console.log('🔍 DEBUG: fetchPhotos result:', {
        albumId,
        fetchedCount: fetchedPhotos.length,
        allPhotosCount: allPhotos.length,
        photosCount: photos.length
      })
      
      if (fetchedPhotos.length > 0) {
        console.log('🔍 DEBUG: First fetched photo:', {
          id: fetchedPhotos[0].id,
          filename: fetchedPhotos[0].original_filename,
          album_id: fetchedPhotos[0].album_id
        })
      }
      
      setAllPhotos(fetchedPhotos)
      setPhotos(fetchedPhotos)
    } catch (err) {
      setError(err.message)
    }
  }, [albumId, allPhotos.length, photos.length])

  // Client-side filtering and sorting
  const filterAndSortPhotos = useCallback((searchTerm = '', sortBy = 'newest') => {
    let filteredPhotos = [...allPhotos]

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filteredPhotos = filteredPhotos.filter(photo => 
        photo.original_filename.toLowerCase().includes(searchLower) ||
        (photo.description && photo.description.toLowerCase().includes(searchLower)) ||
        (photo.tags && photo.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      )
    }

    // Apply sorting
    if (sortBy === 'newest') {
      filteredPhotos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    } else if (sortBy === 'oldest') {
      filteredPhotos.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    } else if (sortBy === 'name') {
      filteredPhotos.sort((a, b) => a.original_filename.localeCompare(b.original_filename))
    }

    setPhotos(filteredPhotos)
  }, [allPhotos])

  // Apply filters when allPhotos or filters change
  useEffect(() => {
    filterAndSortPhotos(filters.search, filters.sortBy)
  }, [allPhotos, filters.search, filters.sortBy, filterAndSortPhotos])

  useEffect(() => {
    if (albumId && canViewFamily) {
      setLoading(true)
      Promise.all([fetchAlbum(), fetchPhotos()]).finally(() => {
        setLoading(false)
      })
    }
  }, [albumId, canViewFamily, fetchAlbum, fetchPhotos])

  const handleFileUpload = async (e) => {
    e.preventDefault()
    if (!albumId) return

    const formData = new FormData(e.target)
    formData.append('albumId', albumId)
    formData.append('category', 'photos')

    setUploading(true)
    try {
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      const response = await fetch('/api/family/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      setShowUploadForm(false)
      e.target.reset()
      await fetchPhotos()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDeletePhoto = useCallback((photoId) => {
    setPhotoToDelete(photoId)
    setShowDeleteModal(true)
  }, [])

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return

    setDeleting(true)
    try {
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      const response = await fetch(`/api/family/documents/${photoToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete photo')
      }

      // Handle navigation after successful deletion
      const currentPhotoIndex = photos.findIndex(p => p.id === photoToDelete)
      const remainingPhotos = photos.filter(p => p.id !== photoToDelete)
      
      if (remainingPhotos.length === 0) {
        // No photos left, close lightbox and return to album view
        setShowDeleteModal(false)
        setPhotoToDelete(null)
        closeLightbox()
        await fetchPhotos()
      } else {
        // Navigate to next photo (wrap around if at the end)
        let nextPhotoIndex = currentPhotoIndex
        if (nextPhotoIndex >= remainingPhotos.length) {
          nextPhotoIndex = 0 // Wrap to first photo
        }
        
        setShowDeleteModal(false)
        setPhotoToDelete(null)
        await fetchPhotos()
        
        // Set the next photo in lightbox
        if (remainingPhotos[nextPhotoIndex]) {
          setLightboxPhoto(remainingPhotos[nextPhotoIndex])
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  // Set cover image
  const handleSetCover = useCallback(async (photoId) => {
    try {
      setSettingCover(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No active session')

      const res = await fetch(`/api/family/photos/albums/${album.id}/cover`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageId: photoId })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to set cover image')
      }

      // Refresh album data to show new cover
      await fetchAlbum()
    } catch (err) {
      console.error('Error setting cover image:', err)
      setError(err.message || 'Failed to set cover image')
    } finally {
      setSettingCover(false)
    }
  }, [album.id])

  const openEditModal = useCallback((photo) => {
    setEditingPhoto(photo)
    setEditDescription(photo.description || '')
    setEditTags(Array.isArray(photo.tags) ? photo.tags.join(', ') : '')
    setShowEditModal(true)
  }, [])

  const closeEditModal = () => {
    setShowEditModal(false)
    setEditingPhoto(null)
    setEditDescription('')
    setEditTags('')
  }

  const handleSaveDetails = async () => {
    if (!editingPhoto || !canManageDocuments) return
    
    console.log('🔍 DEBUG: Starting save details for photo:', editingPhoto.id)
    console.log('🔍 DEBUG: Current photos count before edit:', photos.length)
    console.log('🔍 DEBUG: All photos count before edit:', allPhotos.length)
    
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      const tagsArray = editTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      
      console.log('🔍 DEBUG: Sending update request with:', {
        photoId: editingPhoto.id,
        description: editDescription,
        tags: tagsArray
      })
      
      const res = await fetch(`/api/family/documents/${editingPhoto.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({ 
          description: editDescription,
          tags: tagsArray
        })
      })
      
      if (res.ok) {
        console.log('🔍 DEBUG: Update successful, refreshing photos...')
        // Instead of updating local state, refresh from server to ensure consistency
        await fetchPhotos()
        console.log('🔍 DEBUG: After refresh - photos count:', photos.length)
        console.log('🔍 DEBUG: After refresh - allPhotos count:', allPhotos.length)
        
        // Update lightbox photo if it's the same one
        if (lightboxPhoto && lightboxPhoto.id === editingPhoto.id) {
          setLightboxPhoto({ ...lightboxPhoto, description: editDescription, tags: tagsArray })
        }
        
        closeEditModal()
      }
    } catch (error) {
      console.error('Error saving photo details:', error)
    } finally {
      setSaving(false)
    }
  }

  const openLightbox = (photo) => {
    setLightboxPhoto(photo)
    setShowLightbox(true)
  }

  const closeLightbox = useCallback(() => {
    setLightboxPhoto(null)
    setShowLightbox(false)
  }, [])

  // Navigate between photos in lightbox
  const navigatePhoto = useCallback((direction) => {
    if (!lightboxPhoto || photos.length <= 1) return

    const currentIndex = photos.findIndex(p => p.id === lightboxPhoto.id)
    let newIndex

    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1
    } else {
      newIndex = currentIndex < photos.length - 1 ? currentIndex + 1 : 0
    }

    setLightboxPhoto(photos[newIndex])
  }, [lightboxPhoto, photos])

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Start slideshow
  const startSlideshow = useCallback(() => {
    if (photos.length === 0) return
    
    // If lightbox is not open, open it with the first photo
    if (!showLightbox) {
      setLightboxPhoto(photos[0])
      setShowLightbox(true)
    }
    
    setIsSlideshow(true)
    
    // Start slideshow with 3-second intervals
    const interval = setInterval(() => {
      setLightboxPhoto(prevPhoto => {
        const currentIndex = photos.findIndex(p => p.id === prevPhoto.id)
        const nextIndex = (currentIndex + 1) % photos.length
        return photos[nextIndex]
      })
    }, 3000)
    
    setSlideshowInterval(interval)
  }, [photos, showLightbox])
  // Stop slideshow
  const stopSlideshow = useCallback(() => {
    setIsSlideshow(false)
    if (slideshowInterval) {
      clearInterval(slideshowInterval)
      setSlideshowInterval(null)
    }
  }, [slideshowInterval])

  // Clean up slideshow on unmount
  useEffect(() => {
    return () => {
      if (slideshowInterval) {
        clearInterval(slideshowInterval)
      }
    }
  }, [slideshowInterval])

  // Stop slideshow when lightbox closes
  useEffect(() => {
    if (!showLightbox && isSlideshow) {
      stopSlideshow()
    }
  }, [showLightbox, isSlideshow, stopSlideshow])

  // Keyboard controls for slideshow, navigation, and toolbar actions
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!showLightbox) return
      
      // Don't interfere with typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return
      }
      
      // Navigation controls
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        navigatePhoto('prev')
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        navigatePhoto('next')
      }
      // Slideshow controls
      else if (e.key === ' ') {
        e.preventDefault()
        if (isSlideshow) {
          stopSlideshow()
        } else {
          startSlideshow()
        }
      } else if (e.key === 'Escape') {
        if (isSlideshow) {
          stopSlideshow()
        }
        closeLightbox()
      }
      // Toolbar shortcuts
      else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault()
        if (canManageDocuments && lightboxPhoto) {
          openEditModal(lightboxPhoto)
        }
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        if (user && album && album.created_by === user.id && lightboxPhoto) {
          handleSetCover(lightboxPhoto.id)
        }
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        if (photos.length > 0) {
          if (isSlideshow) {
            stopSlideshow()
          } else {
            startSlideshow()
          }
        }
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        if (canManageDocuments && lightboxPhoto) {
          handleDeletePhoto(lightboxPhoto.id)
        }
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault()
        closeLightbox()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [showLightbox, isSlideshow, navigatePhoto, canManageDocuments, user, album, lightboxPhoto, photos.length, openEditModal, handleSetCover, startSlideshow, stopSlideshow, closeLightbox, handleDeletePhoto])

  if (permissionsLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading album...</p>
        </div>
      </div>
    )
  }

  if (!canViewFamily) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => router.push('/family/photos')}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {album?.name || 'Album'}
                </h1>
              </div>
              {album?.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {album.description}
                </p>
              )}
            </div>
            {canUploadDocuments && (
              <div className="mt-4 sm:mt-0 sm:ml-4">
                <button
                  onClick={() => setShowUploadForm(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Upload Photo
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

        {/* Upload Form */}
        {showUploadForm && (
          <div className="mb-8 bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Upload New Photo
              </h3>
            </div>
            <div className="px-6 py-4">
              <form onSubmit={handleFileUpload} className="space-y-4">
                <div>
                  <label htmlFor="file" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Photo *
                  </label>
                  <input
                    type="file"
                    id="file"
                    name="file"
                    required
                    accept="image/*"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-slate-700 dark:text-gray-100"
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Maximum file size: 10MB. Supported formats: JPG, PNG, GIF, WebP.
                  </p>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-slate-700 dark:text-gray-100"
                    placeholder="Describe this photo..."
                  />
                </div>

                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tags
                  </label>
                  <input
                    type="text"
                    id="tags"
                    name="tags"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-slate-700 dark:text-gray-100"
                    placeholder="vacation, birthday, family (comma separated)"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowUploadForm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Upload Photo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Gallery Controls */}
        <div className="mb-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="px-4 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {photos.length} photos
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="search"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-48 px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 dark:bg-slate-700 dark:text-gray-100"
                    placeholder="Search photos..."
                  />
                  {photos.length > 0 && (
                    <button
                      onClick={isSlideshow ? stopSlideshow : startSlideshow}
                      className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                        isSlideshow
                          ? 'text-red-600 bg-red-100 hover:bg-red-200 dark:text-red-300 dark:bg-red-900/30 dark:hover:bg-red-900/50'
                          : 'text-white bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {isSlideshow ? 'Stop Slideshow' : 'Start Slideshow'}
                    </button>
                  )}
                </div>
              </div>

              <select
                id="sort"
                value={filters.sortBy}
                onChange={(e) => {
                  const sortBy = e.target.value
                  setFilters(prev => ({ ...prev, sortBy }))
                }}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 dark:bg-slate-700 dark:text-gray-100"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>
        </div>

        {/* Photo Grid */}
        {photos.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
            <div className="p-12 text-center">
              <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                {filters.search ? 'No photos match your search' : 'No photos yet'}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {filters.search
                  ? 'Try adjusting your search terms.'
                  : 'Start building your family photo album by uploading your first photo.'}
              </p>
              {canUploadDocuments && !filters.search && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowUploadForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Upload First Photo
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="aspect-square cursor-pointer overflow-hidden hover:opacity-90 transition-opacity duration-200 relative group"
                onClick={() => openLightbox(photo)}
              >
                <img
                  src={photo.preview_url || photo.file_path}
                  alt={photo.original_filename}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {canManageDocuments && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeletePhoto(photo.id)
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                    title="Delete photo"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {showLightbox && lightboxPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">

          {/* Slideshow indicator */}
          {isSlideshow && (
            <div className="absolute top-4 left-4 z-10 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              Slideshow
            </div>
          )}

          {/* Photo container */}
          <div className="relative max-w-4xl max-h-full p-4">
            {/* Navigation buttons - positioned just outside image area */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => navigatePhoto('prev')}
                  className="absolute -left-16 top-1/2 transform -translate-y-1/2 p-3 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors z-10"
                  title="Previous photo"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => navigatePhoto('next')}
                  className="absolute -right-16 top-1/2 transform -translate-y-1/2 p-3 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors z-10"
                  title="Next photo"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
            <img
              src={lightboxPhoto.preview_url || lightboxPhoto.file_path}
              alt={lightboxPhoto.original_filename}
              className="max-w-full max-h-full object-contain"
            />

            {/* Image Toolbar - always visible */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-3 bg-black/75 backdrop-blur-sm rounded-full px-4 py-2">
              {/* Edit Details */}
              {canManageDocuments && (
                <button
                  onClick={() => openEditModal(lightboxPhoto)}
                  className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition-colors"
                  title="Edit photo details"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}

              {/* Set as Cover */}
              {user && album.created_by === user.id && (
                <button
                  onClick={() => handleSetCover(lightboxPhoto.id)}
                  disabled={settingCover}
                  className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors disabled:opacity-50"
                  title="Set as album cover"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
              )}

              {/* Slideshow Toggle */}
              {photos.length > 0 && (
                <button
                  onClick={isSlideshow ? stopSlideshow : startSlideshow}
                  className={`p-2 rounded-full transition-colors ${
                    isSlideshow
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                  title={isSlideshow ? 'Stop Slideshow' : 'Start Slideshow'}
                >
                  {isSlideshow ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z" />
                    </svg>
                  )}
                </button>
              )}

              {/* Delete */}
              {canManageDocuments && (
                <button
                  onClick={() => handleDeletePhoto(lightboxPhoto.id)}
                  className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  title="Delete photo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}

              {/* Close */}
              <button
                onClick={closeLightbox}
                className="p-2 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors"
                title="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Photo info - hidden by default, shown on hover/touch */}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-4 opacity-0 hover:opacity-100 transition-opacity duration-300 touch-manipulation">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{lightboxPhoto.original_filename}</h3>
                  {lightboxPhoto.description && (
                    <p className="text-sm text-gray-300 mb-2">{lightboxPhoto.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{formatFileSize(lightboxPhoto.file_size)}</span>
                <span>{new Date(lightboxPhoto.created_at).toLocaleDateString()}</span>
              </div>
              {lightboxPhoto.tags && lightboxPhoto.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {lightboxPhoto.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-600 text-white"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Details Modal */}
      {showEditModal && editingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Edit Photo Details
              </h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-slate-700 dark:text-gray-100"
                  rows={3}
                  placeholder="Enter photo description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-slate-700 dark:text-gray-100"
                  placeholder="Enter tags separated by commas..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Separate multiple tags with commas
                </p>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700 flex justify-end space-x-3">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDetails}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Delete Photo
              </h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to delete this photo? This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setPhotoToDelete(null)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePhoto}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Photo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
