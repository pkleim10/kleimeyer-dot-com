'use client'

import { useEffect } from 'react'

export default function SpotifyRedirect() {
  useEffect(() => {
    // Check if we have OAuth data in the URL hash
    const hash = window.location.hash
    const baseUrl = `${window.location.origin}/other-fun-stuff/magic-playlists`

    if (hash && hash.includes('access_token')) {
      // Redirect back to Magic Playlists page with the auth data
      const targetUrl = `${baseUrl}${hash}`
      console.log('Redirecting to Magic Playlists with auth data:', targetUrl)
      window.location.href = targetUrl
    } else {
      // No auth data, just redirect to Magic Playlists
      console.log('No auth data found, redirecting to Magic Playlists')
      window.location.href = baseUrl
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Connecting to Spotify...
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Redirecting you back to the application...
        </p>
      </div>
    </div>
  )
}
