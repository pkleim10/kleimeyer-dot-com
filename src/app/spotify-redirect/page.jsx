'use client'

import { useEffect } from 'react'

export default function SpotifyRedirect() {
  useEffect(() => {
    // Check if we have OAuth data in the URL hash
    const hash = window.location.hash
    const params = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash)
    const accessToken = params.get('access_token')
    const state = params.get('state') // encoded origin from authorize()
    // Remove state from what we forward to the app
    if (state) {
      params.delete('state')
    }
    const remainingHash = params.toString()

    // Default to current origin, but prefer the origin sent in state (so we can bounce from prod -> localhost in dev)
    const targetOrigin = state ? decodeURIComponent(state) : window.location.origin
    const baseUrl = `${targetOrigin}/other-fun-stuff/magic-playlists`

    if (accessToken) {
      // Redirect back to Magic Playlists page with the auth data
      const targetUrl = remainingHash ? `${baseUrl}#${remainingHash}` : baseUrl
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
