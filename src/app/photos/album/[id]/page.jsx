'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [selectedPhotos, setSelectedPhotos] = useState(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 })
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
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

  // Compute filtered and sorted photos synchronously
  const filteredPhotos = useMemo(() => {
    let filtered = [...allPhotos]

    // Apply search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(photo =>
        photo.original_filename?.toLowerCase().includes(searchTerm) ||
        photo.description?.toLowerCase().includes(searchTerm) ||
        (Array.isArray(photo.tags) && photo.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
      )
    }

    // Apply sorting
    if (filters.sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    } else if (filters.sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    } else if (filters.sortBy === 'name') {
      filtered.sort((a, b) => a.original_filename.localeCompare(b.original_filename))
    }

    return filtered
  }, [allPhotos, filters.search, filters.sortBy])

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
        filteredPhotosCount: filteredPhotos.length
      })
      
      if (fetchedPhotos.length > 0) {
        console.log('🔍 DEBUG: First fetched photo:', {
          id: fetchedPhotos[0].id,
          filename: fetchedPhotos[0].original_filename,
          album_id: fetchedPhotos[0].album_id,
          preview_url: fetchedPhotos[0].preview_url,
          file_path: fetchedPhotos[0].file_path
        })
      }
      
      setAllPhotos(fetchedPhotos)
    } catch (err) {
      setError(err.message)
    }
  }, [albumId])


  useEffect(() => {
    if (albumId && canViewFamily) {
      setLoading(true)
      Promise.all([fetchAlbum(), fetchPhotos()]).finally(() => {
        setLoading(false)
      })
    }
  }, [albumId, canViewFamily, fetchAlbum, fetchPhotos])

  // Handle file selection and drag-drop
  const handleFiles = useCallback((files) => {
    const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'))

    if (validFiles.length === 0) {
      setError('Please select valid image files')
      return
    }

    setSelectedFiles(validFiles)
    setError('')

    // Generate previews with unique IDs
    const newPreviews = validFiles.map((file, index) => ({
      id: `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }))
    setPreviews(newPreviews)
  }, [])

  // Drag and drop handlers
  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  // File input change handler
  const handleFileInputChange = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  // Remove file from selection
  const removeFile = useCallback((id) => {
    // Find the preview to remove
    const previewToRemove = previews.find(p => p.id === id)
    if (!previewToRemove) return

    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(previewToRemove.url)

    // Remove from both arrays using the unique ID
    const newPreviews = previews.filter(p => p.id !== id)
    
    // For selectedFiles, we need to find the corresponding file
    // Since we can't easily match by ID, we'll reconstruct from the remaining previews
    const newFiles = newPreviews.map(preview => preview.file)

    setSelectedFiles(newFiles)
    setPreviews(newPreviews)
  }, [previews])

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      previews.forEach(preview => URL.revokeObjectURL(preview.url))
    }
  }, [previews])

  const handleFileUpload = async (e) => {
    e.preventDefault()
    if (!albumId || selectedFiles.length === 0) return

    // Get form data
    const formData = new FormData(e.target)
    const description = formData.get('description')
    const tags = formData.get('tags')

    setUploading(true)
    setUploadProgress({ current: 0, total: selectedFiles.length })
    try {
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      const uploadedPhotos = []
      const skippedFiles = []

      // Upload each file
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        
        // Check file size before upload (5MB limit)
        const maxSize = 5 * 1024 * 1024 // 5MB
        if (file.size > maxSize) {
          skippedFiles.push(file.name)
          setUploadProgress({ current: i + 1, total: selectedFiles.length })
          continue
        }

        const fileFormData = new FormData()
        fileFormData.append('file', file)
        fileFormData.append('albumId', albumId)
        fileFormData.append('category', 'photos')
        if (description) fileFormData.append('description', description)
        if (tags) fileFormData.append('tags', tags)

        const response = await fetch('/api/family/documents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          body: fileFormData
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Upload failed for ${file.name}`)
        }

        const result = await response.json()
        uploadedPhotos.push(result.document)
        
        // Update progress
        setUploadProgress({ current: i + 1, total: selectedFiles.length })
      }

      // Show skipped files message if any
      if (skippedFiles.length > 0) {
        alert(`${skippedFiles.length} files skipped (larger than 5MB): ${skippedFiles.join(', ')}`)
      }

      // Add uploaded photos to local state (without signed URLs)
      // The signed URLs will be generated when the page refreshes or when fetchPhotos is called
      setAllPhotos(prevPhotos => {
        const newPhotos = [...prevPhotos, ...uploadedPhotos]
        // Sort by newest first (assuming created_at is available)
        return newPhotos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      })

      // Refresh photos to get signed URLs from the API
      await fetchPhotos()

      setShowUploadForm(false)
      setSelectedFiles([])
      setPreviews([])
      e.target.reset()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      setUploadProgress({ current: 0, total: 0 })
    }
  }

  const togglePhotoSelection = useCallback((photoId) => {
    setSelectedPhotos(prev => {
      const newSelection = new Set(prev)
      if (newSelection.has(photoId)) {
        newSelection.delete(photoId)
      } else {
        newSelection.add(photoId)
      }
      return newSelection
    })
  }, [])

  const selectAllPhotos = useCallback(() => {
    setSelectedPhotos(new Set(filteredPhotos.map(photo => photo.id)))
  }, [filteredPhotos])

  const clearSelection = useCallback(() => {
    setSelectedPhotos(new Set())
  }, [])

  const handleBulkDelete = async () => {
    if (selectedPhotos.size === 0) return

    setBulkDeleting(true)
    setDeleteProgress({ current: 0, total: selectedPhotos.size })
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      const photosToDelete = Array.from(selectedPhotos)
      let currentIndex = 0

      for (const photoId of photosToDelete) {
        const response = await fetch(`/api/family/documents/${photoId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to delete photo ${photoId}`)
        }

        currentIndex++
        setDeleteProgress({ current: currentIndex, total: photosToDelete.length })
      }

      // Update local state
      setAllPhotos(prevPhotos => prevPhotos.filter(photo => !selectedPhotos.has(photo.id)))
      setSelectedPhotos(new Set())
      
    } catch (err) {
      setError(err.message)
    } finally {
      setBulkDeleting(false)
      setDeleteProgress({ current: 0, total: 0 })
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
      const currentPhotoIndex = filteredPhotos.findIndex(p => p.id === photoToDelete)

      // Update local state instead of refetching
      setAllPhotos(prevPhotos => prevPhotos.filter(p => p.id !== photoToDelete))

      const remainingPhotos = filteredPhotos.filter(p => p.id !== photoToDelete)

      if (remainingPhotos.length === 0) {
        // No photos left, close lightbox and return to album view
        setShowDeleteModal(false)
        setPhotoToDelete(null)
        closeLightbox()
      } else {
        // Navigate to next photo (wrap around if at the end)
        let nextPhotoIndex = currentPhotoIndex
        if (nextPhotoIndex >= remainingPhotos.length) {
          nextPhotoIndex = 0 // Wrap to first photo
        }

        setShowDeleteModal(false)
        setPhotoToDelete(null)
        
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
    if (!album?.id) {
      console.error('Cannot set cover: album not loaded')
      return
    }

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
  }, [album?.id, fetchAlbum])

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
    console.log('🔍 DEBUG: Current filtered photos count before edit:', filteredPhotos.length)
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
        console.log('🔍 DEBUG: Update successful, updating local state...')

        // Update the photo in local state
        setAllPhotos(prevPhotos =>
          prevPhotos.map(photo =>
            photo.id === editingPhoto.id
              ? { ...photo, description: editDescription, tags: tagsArray }
              : photo
          )
        )

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

  const openLightbox = async (photo) => {
    setLightboxPhoto(photo)
    setShowLightbox(true)
    
    // Fetch high-quality image URL for lightbox
    try {
      const response = await fetch(`/api/family/documents/${photo.id}/lightbox`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setLightboxPhoto(prev => ({ ...prev, lightbox_url: data.lightbox_url }))
      }
    } catch (error) {
      console.error('Error fetching high-quality image:', error)
      // Fall back to preview_url if lightbox URL fails
    }
  }

  const closeLightbox = useCallback(() => {
    setLightboxPhoto(null)
    setShowLightbox(false)
  }, [])

  // Navigate between photos in lightbox
  const navigatePhoto = useCallback(async (direction) => {
    if (!lightboxPhoto || filteredPhotos.length <= 1) return

    const currentIndex = filteredPhotos.findIndex(p => p.id === lightboxPhoto.id)
    let newIndex

    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : filteredPhotos.length - 1
    } else {
      newIndex = currentIndex < filteredPhotos.length - 1 ? currentIndex + 1 : 0
    }

    const newPhoto = filteredPhotos[newIndex]
    setLightboxPhoto(newPhoto)
    
    // Fetch high-quality image URL for the new photo
    try {
      const response = await fetch(`/api/family/documents/${newPhoto.id}/lightbox`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setLightboxPhoto(prev => ({ ...prev, lightbox_url: data.lightbox_url }))
      }
    } catch (error) {
      console.error('Error fetching high-quality image:', error)
      // Fall back to preview_url if lightbox URL fails
    }
  }, [lightboxPhoto, filteredPhotos])

  // Swipe gesture handlers for mobile navigation
  const handleTouchStart = useCallback((e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }, [])

  const handleTouchMove = useCallback((e) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe && filteredPhotos.length > 1) {
      navigatePhoto('next')
    }
    if (isRightSwipe && filteredPhotos.length > 1) {
      navigatePhoto('prev')
    }
  }, [touchStart, touchEnd, navigatePhoto, filteredPhotos.length])

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
    if (filteredPhotos.length === 0) return

    // If lightbox is not open, open it with the first photo
    if (!showLightbox) {
      setLightboxPhoto(filteredPhotos[0])
      setShowLightbox(true)
    }

    setIsSlideshow(true)

    // Start slideshow with 3-second intervals
    const interval = setInterval(async () => {
      setLightboxPhoto(prevPhoto => {
        const currentIndex = filteredPhotos.findIndex(p => p.id === prevPhoto.id)
        const nextIndex = (currentIndex + 1) % filteredPhotos.length
        const newPhoto = filteredPhotos[nextIndex]
        
        // Fetch high-quality image URL for slideshow
        fetch(`/api/family/documents/${newPhoto.id}/lightbox`, {
          headers: {
            'Authorization': `Bearer ${supabase.auth.getSession().then(s => s.data.session?.access_token)}`
          }
        })
        .then(response => response.ok ? response.json() : null)
        .then(data => {
          if (data?.lightbox_url) {
            setLightboxPhoto(prev => ({ ...prev, lightbox_url: data.lightbox_url }))
          }
        })
        .catch(error => console.error('Error fetching high-quality image:', error))
        
        return newPhoto
      })
    }, 3000)

    setSlideshowInterval(interval)
  }, [filteredPhotos, showLightbox])
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
        if (user && album?.created_by === user.id && lightboxPhoto) {
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
  }, [showLightbox, isSlideshow, navigatePhoto, canManageDocuments, user, album, lightboxPhoto, filteredPhotos.length, openEditModal, handleSetCover, startSlideshow, stopSlideshow, closeLightbox, handleDeletePhoto])

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
                  onClick={() => router.push('/photos')}
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
                  Upload Photos
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
                Upload Photos
              </h3>
            </div>
            <div className="px-6 py-4">
              <form onSubmit={handleFileUpload} className="space-y-6">
                {/* Drag & Drop Zone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Photos *
                  </label>
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                      dragActive
                        ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-300 dark:border-slate-600'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      id="file"
                      name="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileInputChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="mt-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {dragActive ? (
                            <span className="text-green-600 font-medium">Drop your photos here</span>
                          ) : (
                            <>
                              Drag & drop photos here, or{' '}
                              <span className="text-green-600 font-medium">browse files</span>
                            </>
                          )}
                        </p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          Maximum file size: 10MB each. Supported formats: JPG, PNG, GIF, WebP. Multiple files allowed.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image Previews */}
                {previews.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Selected Photos ({previews.length})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {previews.map((preview) => (
                        <div key={preview.id} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700">
                            <img
                              src={preview.url}
                              alt={preview.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(preview.id)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            title="Remove photo"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          <div className="mt-2">
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate" title={preview.name}>
                              {preview.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {(preview.size / 1024 / 1024).toFixed(1)} MB
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description (applied to all photos)
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-slate-700 dark:text-gray-100"
                    placeholder="Describe these photos..."
                  />
                </div>

                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tags (applied to all photos)
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
                    onClick={() => {
                      setShowUploadForm(false)
                      setSelectedFiles([])
                      setPreviews([])
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Cancel
                  </button>
                  <div className="space-y-2">
                    {uploading && uploadProgress.total > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                        />
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={uploading || selectedFiles.length === 0}
                      className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      {uploading 
                        ? `Uploading... (${uploadProgress.current}/${uploadProgress.total} files)` 
                        : `Upload ${selectedFiles.length} Photo${selectedFiles.length !== 1 ? 's' : ''}`
                      }
                    </button>
                  </div>
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
                  {filteredPhotos.length} photos
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
                  {filteredPhotos.length > 0 && (
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

              <div className="flex items-center gap-2">
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

                {/* Selection Controls */}
                {canManageDocuments && filteredPhotos.length > 0 && (
                  <div className="flex items-center gap-2">
                    {selectedPhotos.size === 0 ? (
                      <button
                        onClick={selectAllPhotos}
                        className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 hover:bg-blue-200 dark:text-blue-300 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded transition-colors"
                      >
                        Select All
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={clearSelection}
                          className="px-3 py-1 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors"
                        >
                          Clear ({selectedPhotos.size})
                        </button>
                        <div className="space-y-2">
                          {bulkDeleting && deleteProgress.total > 0 && (
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-red-600 h-2 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
                              />
                            </div>
                          )}
                          <button
                            onClick={handleBulkDelete}
                            disabled={bulkDeleting}
                            className="px-3 py-1 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                          >
                            {bulkDeleting 
                              ? `Deleting... (${deleteProgress.current}/${deleteProgress.total})` 
                              : `Delete ${selectedPhotos.size} Photo${selectedPhotos.size !== 1 ? 's' : ''}`
                            }
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Photo Grid */}
        {filteredPhotos.length === 0 ? (
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
                  : 'Start building your family photo album by uploading your photos.'}
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
                    Upload Photoss
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0">
            {filteredPhotos.map((photo) => {
              const isSelected = selectedPhotos.has(photo.id)
              return (
                <div
                  key={photo.id}
                  className={`aspect-square cursor-pointer overflow-hidden hover:opacity-90 transition-all duration-200 relative group ${
                    isSelected ? 'ring-4 ring-blue-500 ring-opacity-75' : ''
                  }`}
                  onClick={() => {
                    if (selectedPhotos.size > 0) {
                      togglePhotoSelection(photo.id)
                    } else {
                      openLightbox(photo)
                    }
                  }}
                >
                  <img
                    src={photo.preview_url}
                    alt={photo.original_filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  
                  {/* Selection overlay */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-blue-500 bg-opacity-30 flex items-center justify-center">
                      <div className="bg-blue-500 text-white rounded-full p-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Selection checkbox */}
                  {canManageDocuments && (
                    <div className="absolute top-2 left-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          togglePhotoSelection(photo.id)
                        }}
                        className={`p-1 rounded-full transition-all duration-200 ${
                          isSelected 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-white bg-opacity-80 text-gray-700 hover:bg-opacity-100'
                        }`}
                        title={isSelected ? "Deselect photo" : "Select photo"}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {isSelected ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          )}
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Individual delete button (only show when no selection) */}
                  {canManageDocuments && selectedPhotos.size === 0 && (
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
              )
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {showLightbox && lightboxPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >

          {/* Slideshow indicator */}
          {isSlideshow && (
            <div className="absolute top-4 left-4 z-10 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              Slideshow
            </div>
          )}

          {/* Mobile swipe hint */}
          {filteredPhotos.length > 1 && (
            <div className="absolute top-4 right-4 z-10 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 sm:hidden">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              Swipe
            </div>
          )}

          {/* Photo container */}
          <div className="relative w-full h-full p-4 flex items-center justify-center">
            {/* Navigation buttons - positioned just outside image area */}
            {filteredPhotos.length > 1 && (
              <>
                <button
                  onClick={() => navigatePhoto('prev')}
                  className="fixed left-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors z-10 sm:block hidden"
                  title="Previous photo"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => navigatePhoto('next')}
                  className="fixed right-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors z-10 sm:block hidden"
                  title="Next photo"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
            <img
              src={lightboxPhoto.lightbox_url || lightboxPhoto.preview_url}
              alt={lightboxPhoto.original_filename}
              className="w-full h-full object-contain"
              style={{ 
                maxHeight: 'calc(100vh - 8rem)',
                minHeight: '70vh',
                minWidth: '50vw'
              }}
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
              {user && album?.created_by === user.id && (
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
              {filteredPhotos.length > 0 && (
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
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
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
