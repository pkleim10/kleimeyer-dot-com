'use client'

import { useEffect } from 'react'

export default function SpotifyRedirect() {
  useEffect(() => {
    console.log('[SpotifyRedirect] Page loaded, full URL:', window.location.href)
    console.log('[SpotifyRedirect] Hash:', window.location.hash)
    console.log('[SpotifyRedirect] Search:', window.location.search)
    
    // Check if we have OAuth data in the URL hash
    const hash = window.location.hash
    const params = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash)
    const accessToken = params.get('access_token')
    const error = params.get('error')
    const state = params.get('state') // encoded origin from authorize()
    
    console.log('[SpotifyRedirect] Parsed params:', {
      hasAccessToken: !!accessToken,
      hasError: !!error,
      error,
      hasState: !!state,
      stateValue: state,
      allParams: Array.from(params.entries())
    })
    
    // Remove state from what we forward to the app
    if (state) {
      params.delete('state')
    }
    const remainingHash = params.toString()

    // Default to current origin, but prefer the origin sent in state (so we can bounce from prod -> localhost in dev)
    const targetOrigin = state ? decodeURIComponent(state) : window.location.origin
    const baseUrl = `${targetOrigin}/other-fun-stuff/magic-playlists`

    if (error) {
      console.error('[SpotifyRedirect] Spotify OAuth error:', error)
      // Redirect back with error in query params so it's visible
      const errorUrl = `${baseUrl}?spotify_error=${encodeURIComponent(error)}`
      window.location.href = errorUrl
      return
    } else if (accessToken) {
      // Redirect back to Magic Playlists page with the auth data
      const targetUrl = remainingHash ? `${baseUrl}#${remainingHash}` : baseUrl
      console.log('[SpotifyRedirect] Redirecting to Magic Playlists with auth data:', targetUrl)
      window.location.href = targetUrl
    } else {
      // No auth data, just redirect to Magic Playlists
      console.warn('[SpotifyRedirect] No auth data found, redirecting to Magic Playlists')
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
