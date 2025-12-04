'use client'

import { useEffect } from 'react'

export default function SpotifyRedirect() {
  useEffect(() => {
    console.log('[SpotifyRedirect] Page loaded, full URL:', window.location.href)
    console.log('[SpotifyRedirect] Hash:', window.location.hash)
    console.log('[SpotifyRedirect] Search:', window.location.search)
    
    // Check for Authorization Code flow (code in query params from Spotify)
    const searchParams = new URLSearchParams(window.location.search)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const state = searchParams.get('state')
    
    // Check for tokens in query params (from API callback after code exchange)
    const accessTokenFromQuery = searchParams.get('access_token')
    const refreshTokenFromQuery = searchParams.get('refresh_token')
    
    // Also check for Implicit Grant flow (tokens in hash) for backwards compatibility
    const hash = window.location.hash
    const hashParams = hash ? new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash) : null
    const accessTokenFromHash = hashParams?.get('access_token')
    
    console.log('[SpotifyRedirect] Parsed params:', {
      hasCode: !!code,
      hasAccessTokenFromQuery: !!accessTokenFromQuery,
      hasAccessTokenFromHash: !!accessTokenFromHash,
      hasError: !!error,
      error,
      hasState: !!state,
      stateValue: state,
      allSearchParams: Array.from(searchParams.entries()),
      allHashParams: hashParams ? Array.from(hashParams.entries()) : []
    })

    // Default to current origin, but prefer the origin sent in state
    const targetOrigin = state ? decodeURIComponent(state) : window.location.origin

    if (error) {
      console.error('[SpotifyRedirect] Spotify OAuth error:', error)
      // Redirect back with error in query params so it's visible
      const errorUrl = `${targetOrigin}/other-fun-stuff/magic-playlists?spotify_error=${encodeURIComponent(error)}`
      window.location.href = errorUrl
      return
    }

    // Authorization Code Flow Step 1: forward code to API route for token exchange
    if (code) {
      console.log('[SpotifyRedirect] Authorization code received, forwarding to API route')
      const apiUrl = `${window.location.origin}/api/spotify/callback?code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ''}`
      console.log('[SpotifyRedirect] Redirecting to API callback:', apiUrl)
      window.location.href = apiUrl
      return
    }

    // Authorization Code Flow Step 2: tokens received from API callback, convert to hash and redirect
    if (accessTokenFromQuery) {
      console.log('[SpotifyRedirect] Tokens received from API callback, redirecting to Magic Playlists with hash')
      const hashParams = new URLSearchParams({
        access_token: accessTokenFromQuery,
        refresh_token: refreshTokenFromQuery || '',
        expires_in: searchParams.get('expires_in') || '3600'
      })
      const targetUrl = `${targetOrigin}/other-fun-stuff/magic-playlists#${hashParams.toString()}`
      console.log('[SpotifyRedirect] Redirecting to Magic Playlists with tokens in hash')
      window.location.href = targetUrl
      return
    }

    // Implicit Grant Flow (backwards compatibility): handle tokens directly from hash
    if (accessTokenFromHash) {
      console.log('[SpotifyRedirect] Access token in hash (Implicit Grant), redirecting to Magic Playlists')
      // Remove state from hash params
      if (state) {
        hashParams.delete('state')
      }
      const remainingHash = hashParams.toString()
      const targetUrl = remainingHash ? `${targetOrigin}/other-fun-stuff/magic-playlists#${remainingHash}` : `${targetOrigin}/other-fun-stuff/magic-playlists`
      window.location.href = targetUrl
      return
    }

    // No auth data, just redirect to Magic Playlists
    console.warn('[SpotifyRedirect] No auth data found, redirecting to Magic Playlists')
    window.location.href = `${targetOrigin}/other-fun-stuff/magic-playlists`
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
