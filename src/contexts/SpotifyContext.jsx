'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const SpotifyContext = createContext()

export function useSpotify() {
  const context = useContext(SpotifyContext)
  if (!context) {
    throw new Error('useSpotify must be used within a SpotifyProvider')
  }
  return context
}

export function SpotifyProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null)
  const [refreshToken, setRefreshToken] = useState(null)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
  const REDIRECT_URI = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || 'http://localhost:3000'

  useEffect(() => {
    // Listen for messages from popup window (OAuth flow)
    const handleMessage = async (event) => {
      // Verify origin for security
      const allowedOrigins = [
        window.location.origin,
        'http://localhost:3000',
        'https://kleimeyer.com',
        process.env.NEXT_PUBLIC_SITE_URL
      ].filter(Boolean)
      
      if (!allowedOrigins.includes(event.origin)) {
        console.warn('[SpotifyContext] Ignoring message from unauthorized origin:', event.origin)
        return
      }

      if (event.data?.type === 'SPOTIFY_AUTH_SUCCESS') {
        console.log('[SpotifyContext] Received tokens from popup')
        const { access_token, refresh_token } = event.data.payload
        
        if (access_token) {
          setAccessToken(access_token)
          setRefreshToken(refresh_token || null)
          localStorage.setItem('spotify_access_token', access_token)
          localStorage.setItem('spotify_token_timestamp', Date.now().toString())
          if (refresh_token) {
            localStorage.setItem('spotify_refresh_token', refresh_token)
          }
          // Test token validity which will set isAuthorized
          const tokenToTest = access_token
          const response = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${tokenToTest}` }
          })
          if (response.ok) {
            setIsAuthorized(true)
          } else {
            setIsAuthorized(false)
          }
        }
      } else if (event.data?.type === 'SPOTIFY_AUTH_ERROR') {
        console.error('[SpotifyContext] Spotify OAuth error from popup:', event.data.error)
        setError(`Spotify authorization failed: ${event.data.error}`)
      }
    }

    window.addEventListener('message', handleMessage)

    // Check for tokens in URL hash (backwards compatibility with direct redirects)
    const hash = window.location.hash
    console.log('[SpotifyContext] Checking for tokens. Hash:', hash ? 'present' : 'missing', 'URL:', window.location.href)
    
    if (hash) {
      const params = new URLSearchParams(hash.substring(1))
      const token = params.get('access_token')
      const refresh = params.get('refresh_token')
      const error = params.get('error')

      console.log('[SpotifyContext] Hash params:', { 
        hasToken: !!token, 
        hasRefresh: !!refresh, 
        error,
        allParams: Array.from(params.entries())
      })

      if (error) {
        console.error('[SpotifyContext] Spotify OAuth error:', error)
        setError(`Spotify authorization failed: ${error}`)
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }

      if (token) {
        console.log('[SpotifyContext] Restoring access token from URL hash, token length:', token.length)
        setAccessToken(token)
        setRefreshToken(refresh)
        // Clear the hash from URL
        window.history.replaceState({}, document.title, window.location.pathname)
        // Store tokens in localStorage with timestamp
        localStorage.setItem('spotify_access_token', token)
        localStorage.setItem('spotify_token_timestamp', Date.now().toString())
        if (refresh) localStorage.setItem('spotify_refresh_token', refresh)
        // Test token validity which will set isAuthorized
        // Inline the test since testTokenValidity isn't available in this scope yet
        fetch('https://api.spotify.com/v1/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(response => {
          if (response.ok) {
            setIsAuthorized(true)
          } else if (response.status === 401) {
            setIsAuthorized(false)
          }
        }).catch(() => setIsAuthorized(false))
      } else {
        console.log('[SpotifyContext] Hash present but no access_token found')
      }
    } else {
      // Check localStorage for existing tokens
      const storedToken = localStorage.getItem('spotify_access_token')
      const storedRefresh = localStorage.getItem('spotify_refresh_token')
      console.log('[SpotifyContext] No hash, checking localStorage:', { 
        hasStoredToken: !!storedToken,
        hasStoredRefresh: !!storedRefresh
      })
      if (storedToken) {
        console.log('[SpotifyContext] Restoring access token from localStorage, token length:', storedToken.length)
        setAccessToken(storedToken)
        setRefreshToken(storedRefresh)
        // Don't set isAuthorized yet - will be set after validity check in second useEffect
      } else {
        console.log('[SpotifyContext] No stored token found, user not authorized')
      }
    }

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  const authorize = () => {
    console.log('[SpotifyContext] authorize() called')
    console.log('[SpotifyContext] Current state:', { 
      isAuthorized, 
      hasAccessToken: !!accessToken,
      redirectUri: REDIRECT_URI,
      clientId: SPOTIFY_CLIENT_ID ? 'present' : 'missing'
    })
    
    const scopes = [
      'playlist-modify-public',
      'playlist-modify-private',
      'user-read-private',
      'user-read-email'
    ].join(' ')

    // Encode the current origin in state so callback can redirect back
    const state = encodeURIComponent(window.location.origin)

    // Use Authorization Code Flow instead of Implicit Grant
    const authUrl = `https://accounts.spotify.com/authorize?` +
      new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        scope: scopes,
        show_dialog: 'false', // Changed to false - don't force re-auth if already authorized
        state
      })

    console.log('[SpotifyContext] Opening Spotify auth in popup (Authorization Code Flow):', authUrl)
    
    // Open popup window to preserve Supabase session
    const width = 500
    const height = 700
    const left = (window.screen.width - width) / 2
    const top = (window.screen.height - height) / 2
    
    const popup = window.open(
      authUrl,
      'Spotify Authorization',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    )

    // Poll for popup closure (fallback if postMessage doesn't work)
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed)
        console.log('[SpotifyContext] Popup closed')
      }
    }, 1000)
  }

  const logout = () => {
    setAccessToken(null)
    setRefreshToken(null)
    setIsAuthorized(false)
    localStorage.removeItem('spotify_access_token')
    localStorage.removeItem('spotify_refresh_token')
  }

  const refreshAccessToken = async () => {
    if (!refreshToken) return false

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAccessToken(data.access_token)
        localStorage.setItem('spotify_access_token', data.access_token)
        localStorage.setItem('spotify_token_timestamp', Date.now().toString())
        if (data.refresh_token) {
          setRefreshToken(data.refresh_token)
          localStorage.setItem('spotify_refresh_token', data.refresh_token)
        }
        return true
      }
    } catch (error) {
      console.error('Failed to refresh token:', error)
    }
    return false
  }

  // Test if the current token is valid
  const testTokenValidity = async () => {
    // Get token from state or localStorage (for initial load)
    const tokenToTest = accessToken || localStorage.getItem('spotify_access_token')
    
    if (!tokenToTest) {
      console.log('[SpotifyContext] No token to test')
      setIsAuthorized(false)
      return false
    }

    try {
      console.log('[SpotifyContext] Testing token validity with Spotify API...')
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${tokenToTest}`
        }
      })

      if (response.status === 401) {
        // Token expired, try refresh
        console.log('[SpotifyContext] Token invalid (401), attempting refresh...')
        if (await refreshAccessToken()) {
          // Test again with new token
          const newToken = localStorage.getItem('spotify_access_token')
          const retryResponse = await fetch('https://api.spotify.com/v1/me', {
            headers: {
              'Authorization': `Bearer ${newToken}`
            }
          })
          if (retryResponse.ok) {
            setAccessToken(newToken)
            setIsAuthorized(true)
            return true
          }
        }
        // Refresh failed, token is invalid
        console.log('[SpotifyContext] Token refresh failed, user needs to re-authorize')
        setIsAuthorized(false)
        setAccessToken(null)
        localStorage.removeItem('spotify_access_token')
        return false
      }

      if (response.ok) {
        const userData = await response.json()
        console.log('[SpotifyContext] Token is valid, user:', userData.display_name || userData.id)
        setIsAuthorized(true)
        // Make sure accessToken is set if it wasn't already
        if (!accessToken && tokenToTest) {
          setAccessToken(tokenToTest)
        }
        return true
      }

      // Other error
      console.warn('[SpotifyContext] Token validation returned status:', response.status)
      setIsAuthorized(false)
      return false
    } catch (error) {
      console.error('[SpotifyContext] Error testing token validity:', error)
      setIsAuthorized(false)
      return false
    }
  }

  const searchTracks = async (query, limit = 5) => {
    if (!accessToken) throw new Error('Not authorized')

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/search?` +
        new URLSearchParams({
          q: query,
          type: 'track',
          limit: limit.toString(),
          market: 'US'
        }),
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )

      if (response.status === 401) {
        // Token expired, try refresh
        if (await refreshAccessToken()) {
          return searchTracks(query, limit)
        }
        throw new Error('Authentication expired')
      }

      if (!response.ok) throw new Error('Failed to search tracks')

      const data = await response.json()
      return data.tracks.items
    } catch (error) {
      console.error('Search error:', error)
      throw error
    }
  }

  const createPlaylist = async (name, trackUris) => {
    if (!accessToken) throw new Error('Not authorized')

    try {
      // First get user profile
      const userResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (userResponse.status === 401) {
        if (await refreshAccessToken()) {
          return createPlaylist(name, trackUris)
        }
        throw new Error('Authentication expired')
      }

      if (!userResponse.ok) throw new Error('Failed to get user profile')

      const user = await userResponse.json()

      // Create playlist
      const createResponse = await fetch(
        `https://api.spotify.com/v1/users/${user.id}/playlists`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: name,
            description: 'Created with AI by Magic Playlists',
            public: false
          })
        }
      )

      if (!createResponse.ok) throw new Error('Failed to create playlist')

      const playlist = await createResponse.json()

      // Add tracks to playlist
      if (trackUris.length > 0) {
        const addResponse = await fetch(
          `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              uris: trackUris.slice(0, 100) // Spotify limit is 100 tracks per request
            })
          }
        )

        if (!addResponse.ok) throw new Error('Failed to add tracks to playlist')
      }

      return {
        playlistId: playlist.id,
        name: playlist.name,
        url: playlist.external_urls.spotify,
        tracksAdded: trackUris.length
      }
    } catch (error) {
      console.error('Create playlist error:', error)
      throw error
    }
  }

  // Helper to ensure token is fresh before API calls
  const ensureFreshToken = async () => {
    if (!accessToken || !refreshToken) return accessToken
    
    // Try to refresh proactively (Spotify tokens expire after 1 hour)
    // We'll refresh if token is older than 50 minutes
    try {
      const tokenAge = Date.now() - (parseInt(localStorage.getItem('spotify_token_timestamp') || '0'))
      const FIFTY_MINUTES = 50 * 60 * 1000
      
      if (tokenAge > FIFTY_MINUTES) {
        console.log('[SpotifyContext] Token is old, refreshing proactively')
        await refreshAccessToken()
        return localStorage.getItem('spotify_access_token')
      }
    } catch (error) {
      console.warn('[SpotifyContext] Failed to refresh token proactively:', error)
    }
    
    return accessToken
  }

  // Test token validity when component mounts if we have a token from localStorage
  useEffect(() => {
    // Only test if we have a stored token (from localStorage restoration)
    // Don't test if token came from URL hash (that's a fresh OAuth token)
    const storedToken = localStorage.getItem('spotify_access_token')
    const hash = window.location.hash
    
    if (storedToken && !hash) {
      console.log('[SpotifyContext] Testing token validity on mount (token from localStorage)...')
      // Set accessToken if not already set (for initial load)
      if (!accessToken) {
        setAccessToken(storedToken)
        const storedRefresh = localStorage.getItem('spotify_refresh_token')
        if (storedRefresh) setRefreshToken(storedRefresh)
      }
      // Test validity - this will set isAuthorized based on result
      testTokenValidity()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  const value = {
    accessToken,
    refreshToken,
    isAuthorized,
    isLoading,
    error,
    authorize,
    logout,
    searchTracks,
    createPlaylist,
    refreshAccessToken,
    ensureFreshToken,
    testTokenValidity
  }

  return (
    <SpotifyContext.Provider value={value}>
      {children}
    </SpotifyContext.Provider>
  )
}
