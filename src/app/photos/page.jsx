'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'

export default function PhotoAlbumPage() {
  const { user, authLoading } = useAuth()
  const { canViewFamily, permissionsLoading } = usePermissions()
  const router = useRouter()

  // State
  const [albums, setAlbums] = useState([])
  const [showCreateAlbum, setShowCreateAlbum] = useState(false)
  const [newAlbumName, setNewAlbumName] = useState('')
  const [newAlbumDescription, setNewAlbumDescription] = useState('')
  const [creatingAlbum, setCreatingAlbum] = useState(false)
  const [loading, setLoading] = useState(true)
  const [albumsLoading, setAlbumsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [albumToDelete, setAlbumToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Initial data fetch
  useEffect(() => {
    if (!authLoading && !permissionsLoading && user && canViewFamily) {
      setLoading(false)
    }
  }, [authLoading, permissionsLoading, user, canViewFamily])

  // Fetch albums
  const fetchAlbums = useCallback(async () => {
    try {
      setAlbumsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/family/photos/albums', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (!res.ok) return
      const data = await res.json()
      setAlbums(data.albums || [])
    } catch (_) {}
    finally {
      setAlbumsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && user) fetchAlbums()
  }, [authLoading, user, fetchAlbums])

  // Create new album
  const handleCreateAlbum = async (e) => {
    e.preventDefault()
    if (!newAlbumName.trim()) return

    try {
      setCreatingAlbum(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No active session')

      const res = await fetch('/api/family/photos/albums', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newAlbumName.trim(),
          description: newAlbumDescription.trim() || null
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create album')
      }

      // Reset form and refresh albums
      setNewAlbumName('')
      setNewAlbumDescription('')
      setShowCreateAlbum(false)
      await fetchAlbums()
    } catch (err) {
      console.error('Error creating album:', err)
      setError(err.message || 'Failed to create album')
    } finally {
      setCreatingAlbum(false)
    }
  }

  // Delete album
  const handleDeleteAlbum = async () => {
    if (!albumToDelete) return

    try {
      setDeleting(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No active session')

      const res = await fetch(`/api/family/photos/albums/${albumToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to delete album')
      }

      // Close modal and refresh albums
      setShowDeleteModal(false)
      setAlbumToDelete(null)
      await fetchAlbums()
    } catch (err) {
      console.error('Error deleting album:', err)
      setError(err.message || 'Failed to delete album')
    } finally {
      setDeleting(false)
    }
  }

  // Open delete modal
  const openDeleteModal = (album) => {
    setAlbumToDelete(album)
    setShowDeleteModal(true)
  }

  // Close delete modal
  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setAlbumToDelete(null)
  }

  // Redirect if not family member
  useEffect(() => {
    if (!authLoading && !permissionsLoading && user && !canViewFamily) {
      router.push('/')
    }
  }, [authLoading, permissionsLoading, user, canViewFamily, router])

  // Show loading while auth and permissions are being determined
  if (authLoading || permissionsLoading || loading || (!canViewFamily && !authLoading && !permissionsLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-gray-900 dark:text-gray-100">
            {authLoading || permissionsLoading ? 'Loading...' : (!canViewFamily && !authLoading && !permissionsLoading) ? 'Redirecting...' : 'Loading photo albums...'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Photo Albums
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Organize and share precious family memories
              </p>
            </div>
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

        {/* Albums Grid */}
        {albumsLoading ? (
          <div className="mb-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="p-8 text-center">
              <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-gray-900 dark:text-gray-100">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading albums...
              </div>
            </div>
          </div>
        ) : albums.length > 0 ? (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Albums</h3>
              {canViewFamily && (
                <button
                  onClick={() => setShowCreateAlbum(true)}
                  className="px-3 py-1 text-sm font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  + New Album
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {albums.map((album) => (
                <div
                  key={album.id}
                  className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border-2 border-gray-200 dark:border-slate-700 hover:border-green-300 cursor-pointer transition-all duration-200 hover:shadow-md relative group"
                  onClick={() => {
                    // Navigate to album detail page
                    window.location.href = `/photos/album/${album.id}`
                  }}
                >
                  {/* Delete button - only show for albums created by current user */}
                  {user && album.created_by === user.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openDeleteModal(album)
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all duration-200 z-10"
                      title="Delete album"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                  
                  <div className="aspect-square relative overflow-hidden">
                    {album.cover_image?.preview_url ? (
                      <img
                        src={album.cover_image.preview_url}
                        alt={album.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Album info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent p-3">
                      <h4 className="text-sm font-medium text-white truncate">
                        {album.name}
                      </h4>
                      {album.description && (
                        <p className="text-xs text-gray-200 mt-1 line-clamp-1">
                          {album.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No albums yet
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Create your first photo album to organize your family photos
              </p>
              {canViewFamily && (
                <button
                  onClick={() => setShowCreateAlbum(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create First Album
                </button>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Create Album Modal */}
      {showCreateAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Create New Album
              </h3>
            </div>
            <form onSubmit={handleCreateAlbum} className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label htmlFor="albumName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Album Name *
                  </label>
                  <input
                    type="text"
                    id="albumName"
                    value={newAlbumName}
                    onChange={(e) => setNewAlbumName(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-slate-700 dark:text-gray-100"
                    placeholder="Enter album name..."
                  />
                </div>
                <div>
                  <label htmlFor="albumDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <textarea
                    id="albumDescription"
                    value={newAlbumDescription}
                    onChange={(e) => setNewAlbumDescription(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-slate-700 dark:text-gray-100"
                    placeholder="Describe this album..."
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateAlbum(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAlbum}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {creatingAlbum ? 'Creating...' : 'Create Album'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Album Confirmation Modal */}
      {showDeleteModal && albumToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Delete Album
              </h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to delete the album &quot;{albumToDelete.name}&quot;? This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700 flex justify-end space-x-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAlbum}
                disabled={deleting}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Album'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

