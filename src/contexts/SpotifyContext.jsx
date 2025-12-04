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
    // Check for tokens in URL hash (after OAuth redirect)
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
        return
      }

      if (token) {
        console.log('[SpotifyContext] Restoring access token from URL hash, token length:', token.length)
        setAccessToken(token)
        setRefreshToken(refresh)
        setIsAuthorized(true)
        // Clear the hash from URL
        window.history.replaceState({}, document.title, window.location.pathname)
        // Store tokens in localStorage
        localStorage.setItem('spotify_access_token', token)
        if (refresh) localStorage.setItem('spotify_refresh_token', refresh)
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
        setIsAuthorized(true)
      } else {
        console.log('[SpotifyContext] No stored token found, user not authorized')
      }
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
        show_dialog: 'true',
        state
      })

    console.log('[SpotifyContext] Redirecting to Spotify auth (Authorization Code Flow):', authUrl)
    window.location.href = authUrl
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
        return true
      }
    } catch (error) {
      console.error('Failed to refresh token:', error)
    }
    return false
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

  const value = {
    accessToken,
    isAuthorized,
    isLoading,
    error,
    authorize,
    logout,
    searchTracks,
    createPlaylist
  }

  return (
    <SpotifyContext.Provider value={value}>
      {children}
    </SpotifyContext.Provider>
  )
}
