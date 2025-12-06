'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase'
import { useSpotify } from '@/contexts/SpotifyContext'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

const LOCAL_STORAGE_KEY = 'magicPlaylists_state'
const PENDING_ADD_FLAG_KEY = 'magicPlaylists_pendingAddToSpotify'

export default function MagicPlaylistsForm({ onPlaylistGenerated }) {
  const [prompt, setPrompt] = useState('')
  const [playlistName, setPlaylistName] = useState('')
  const [suggestedPlaylistName, setSuggestedPlaylistName] = useState('')
  const [obscurityLevel, setObscurityLevel] = useState(50) // 0 = well-known, 100 = obscure
  const [isLoading, setIsLoading] = useState(false)
  const abortControllerRef = useRef(null)
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false)
  const [error, setError] = useState(null)
  const [suggestions, setSuggestions] = useState(null)
  const [playlistResult, setPlaylistResult] = useState(null)
  const [statusMessage, setStatusMessage] = useState(null)
  const [trackConfidences, setTrackConfidences] = useState({}) // Map of index -> confidence score

  const { user, loading: authLoading, signOut } = useAuth()
  const { isAuthorized, authorize, searchTracks, createPlaylist, isLoading: spotifyLoading, error: spotifyError, accessToken: spotifyAccessToken, ensureFreshToken } = useSpotify()

  // Helper function to normalize strings for comparison
  const normalize = (str) => str.toLowerCase().trim().replace(/[^\w\s]/g, '')
  
  // Helper function to check if two strings are similar (fuzzy match)
  const isSimilar = (str1, str2, threshold = 0.7) => {
    const norm1 = normalize(str1)
    const norm2 = normalize(str2)
    if (norm1 === norm2) return true
    if (norm1.includes(norm2) || norm2.includes(norm1)) return true
    
    // Calculate similarity ratio
    const longer = norm1.length > norm2.length ? norm1 : norm2
    const shorter = norm1.length > norm2.length ? norm2 : norm1
    if (longer.length === 0) return true
    
    // Simple similarity check: how many words match
    const words1 = norm1.split(/\s+/)
    const words2 = norm2.split(/\s+/)
    const matchingWords = words1.filter(w => words2.includes(w)).length
    const similarity = matchingWords / Math.max(words1.length, words2.length)
    
    return similarity >= threshold
  }

  // Check confidence for a single track with improved search strategies
  const checkTrackConfidence = async (song) => {
    if (!isAuthorized || !searchTracks) return null

    try {
      // Ensure token is fresh before searching
      await ensureFreshToken()
      
      let searchResults = []
      const searchStrategies = [
        // Strategy 1: Exact match with quotes (most specific)
        `track:"${song.title}" artist:"${song.artist}"`,
        // Strategy 2: Without quotes
        `track:${song.title} artist:${song.artist}`,
        // Strategy 3: Simple combined search
        `${song.title} ${song.artist}`,
        // Strategy 4: Title only (in case artist name is wrong)
        `track:"${song.title}"`,
        // Strategy 5: Artist only (in case title is wrong)
        `artist:"${song.artist}"`,
        // Strategy 6: Just the title without quotes
        song.title,
      ]
      
      // Try each strategy until we get results
      for (const query of searchStrategies) {
        try {
          searchResults = await searchTracks(query, 20) // Get more results for better matching
          if (searchResults && searchResults.length > 0) {
            break
          }
        } catch (searchErr) {
          // If authentication expired, rethrow to be handled by caller
          if (searchErr.message?.includes('Authentication expired') || searchErr.message?.includes('Not authorized')) {
            throw searchErr
          }
          // If rate limit exceeded, rethrow to be handled by caller
          if (searchErr.message?.includes('rate limit')) {
            console.error('Rate limit exceeded during confidence check:', searchErr)
            throw searchErr
          }
          // For other errors, continue to next strategy
          console.warn(`Search strategy failed for "${query}":`, searchErr.message || searchErr)
        }
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      
      if (!searchResults || searchResults.length === 0) {
        return 0 // No results found
      }
      
      // Find the best match and calculate confidence score
      let bestScore = 0
      const titleLower = song.title.toLowerCase().trim()
      const artistLower = song.artist.toLowerCase().trim()
      
      for (const track of searchResults) {
        const trackTitle = (track.name?.toLowerCase() || '').trim()
        const trackArtist = (track.artists[0]?.name?.toLowerCase() || '').trim()
        
        let score = 0
        
        // Artist match (more flexible)
        if (trackArtist === artistLower) {
          score += 50 // Exact match
        } else if (isSimilar(trackArtist, artistLower, 0.85)) {
          score += 40 // Very similar
        } else if (isSimilar(trackArtist, artistLower, 0.7)) {
          score += 25 // Similar
        } else if (isSimilar(trackArtist, artistLower, 0.5)) {
          score += 10 // Somewhat similar
        }
        // Don't skip if artist doesn't match - might still be the right song
        
        // Title match (more flexible)
        if (trackTitle === titleLower) {
          score += 50 // Exact match
        } else if (isSimilar(trackTitle, titleLower, 0.85)) {
          score += 40 // Very similar
        } else if (isSimilar(trackTitle, titleLower, 0.7)) {
          score += 25 // Similar
        } else if (isSimilar(trackTitle, titleLower, 0.5)) {
          score += 10 // Somewhat similar
        }
        
        // Bonus points if both match well
        if (score >= 50 && (isSimilar(trackArtist, artistLower, 0.7) || isSimilar(trackTitle, titleLower, 0.7))) {
          score += 10
        }
        
        if (score > bestScore) {
          bestScore = score
        }
      }
      
      return bestScore
    } catch (err) {
      // Re-throw authentication errors so they can be handled by the caller
      if (err.message?.includes('Authentication expired') || err.message?.includes('Not authorized')) {
        throw err
      }
      console.warn(`Failed to check confidence for: ${song.title} by ${song.artist}`, err)
      return 0
    }
  }

  // Check confidences for all suggestions when authorized
  useEffect(() => {
    if (!isAuthorized || !suggestions || suggestions.length === 0) return
    
    const checkConfidences = async () => {
      // Ensure token is fresh before starting
      try {
        await ensureFreshToken()
      } catch (err) {
        console.warn('Failed to ensure fresh token:', err)
      }
      
      const confidences = {}
      for (let i = 0; i < suggestions.length; i++) {
        try {
          const confidence = await checkTrackConfidence(suggestions[i])
          confidences[i] = confidence
          setTrackConfidences(prev => ({ ...prev, [i]: confidence }))
        } catch (err) {
          // If authentication expired, stop checking and show error
          if (err.message?.includes('Authentication expired') || err.message?.includes('Not authorized')) {
            console.error('Authentication expired while checking confidences')
            setError('Spotify authentication expired. Please reconnect to Spotify to check track availability.')
            break
          }
          // If rate limit exceeded, stop checking and show error
          if (err.message?.includes('rate limit')) {
            console.error('Rate limit exceeded while checking confidences')
            setError('Spotify rate limit exceeded. Please wait a moment and try again.')
            break
          }
          // For other errors, just log and continue
          console.warn(`Failed to check confidence for track ${i}:`, err.message || err)
          confidences[i] = 0
          setTrackConfidences(prev => ({ ...prev, [i]: 0 }))
        }
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    checkConfidences()
  }, [isAuthorized, suggestions, ensureFreshToken])

  const fileInputRef = useRef(null)

  const handleImportM3U = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset file input
    e.target.value = ''

    if (!file.name.toLowerCase().endsWith('.m3u') && !file.name.toLowerCase().endsWith('.m3u8')) {
      setError('Please select a valid M3U file (.m3u or .m3u8)')
      return
    }

    try {
      setError(null)
      setStatusMessage('Reading M3U file...')
      
      const text = await file.text()
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
      
      if (lines.length === 0 || !lines[0].startsWith('#EXTM3U')) {
        setError('Invalid M3U file format. Expected #EXTM3U header.')
        setStatusMessage(null)
        return
      }

      const importedTracks = []
      let playlistNameFromFile = null
      let currentTrack = null

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        // Extract playlist name
        if (line.startsWith('#PLAYLIST:')) {
          playlistNameFromFile = line.replace('#PLAYLIST:', '').trim()
          continue
        }

        // Parse #EXTINF line: #EXTINF:duration,Artist - Title
        if (line.startsWith('#EXTINF:')) {
          const extinfContent = line.replace('#EXTINF:', '')
          const commaIndex = extinfContent.indexOf(',')
          const duration = commaIndex > 0 ? extinfContent.substring(0, commaIndex) : '-1'
          const trackInfo = commaIndex > 0 ? extinfContent.substring(commaIndex + 1) : extinfContent
          
          // Parse "Artist - Title" format
          const dashIndex = trackInfo.lastIndexOf(' - ')
          let artist = ''
          let title = trackInfo
          
          if (dashIndex > 0) {
            artist = trackInfo.substring(0, dashIndex).trim()
            title = trackInfo.substring(dashIndex + 3).trim()
          } else {
            // Try to parse other formats or use whole string as title
            title = trackInfo.trim()
          }

          currentTrack = {
            title: title || 'Unknown',
            artist: artist || 'Unknown',
            year: null,
            reason: 'Imported from M3U file'
          }
          continue
        }

        // Next line after #EXTINF should be the URI or path
        if (currentTrack && !line.startsWith('#')) {
          // Check if it's a Spotify URI (handle both spotify:track: and https://open.spotify.com/track/)
          if (line.startsWith('spotify:track:')) {
            const trackId = line.replace('spotify:track:', '').trim()
            if (trackId) {
              currentTrack.spotifyTrack = {
                uri: `spotify:track:${trackId}`,
                id: trackId,
                name: currentTrack.title,
                artist: currentTrack.artist
              }
            }
          } else if (line.includes('open.spotify.com/track/')) {
            // Handle Spotify web URLs
            const urlMatch = line.match(/track\/([a-zA-Z0-9]+)/)
            if (urlMatch && urlMatch[1]) {
              const trackId = urlMatch[1]
              currentTrack.spotifyTrack = {
                uri: `spotify:track:${trackId}`,
                id: trackId,
                name: currentTrack.title,
                artist: currentTrack.artist
              }
            }
          }
          
          importedTracks.push(currentTrack)
          currentTrack = null
        }
      }

      if (importedTracks.length === 0) {
        setError('No tracks found in M3U file. Please check the file format.')
        setStatusMessage(null)
        return
      }

      // Set playlist name if found in file
      if (playlistNameFromFile && !playlistName.trim()) {
        setPlaylistName(playlistNameFromFile)
      }

      // Set the imported tracks as suggestions
      setSuggestions(importedTracks)
      setStatusMessage(`Imported ${importedTracks.length} tracks from M3U file`)
      
      // Clear status message after a moment
      setTimeout(() => setStatusMessage(null), 3000)

      console.log(`✅ Imported ${importedTracks.length} tracks from M3U file`)
    } catch (err) {
      console.error('Error importing M3U file:', err)
      setError(`Failed to import M3U file: ${err.message}`)
      setStatusMessage(null)
    }
  }

  const handleExportM3U = () => {
    if (!suggestions || suggestions.length === 0) {
      setError('No playlist to export')
      return
    }

    // Generate M3U file content
    const exportName = playlistName.trim() || suggestedPlaylistName || 'AI Generated Playlist'
    let m3uContent = '#EXTM3U\n'
    m3uContent += `#PLAYLIST:${exportName}\n\n`

    suggestions.forEach((song) => {
      // Format: #EXTINF:duration,Artist - Title
      // Use -1 for duration (unknown)
      const trackInfo = `${song.artist} - ${song.title}`
      m3uContent += `#EXTINF:-1,${trackInfo}\n`
      
      // Use Spotify URI if available, otherwise just the track info
      if (song.spotifyTrack?.uri) {
        m3uContent += `${song.spotifyTrack.uri}\n`
      } else {
        // Fallback: use track name (some players can search for it)
        m3uContent += `${trackInfo}\n`
      }
      m3uContent += '\n'
    })

    // Create blob and download
    const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.m3u`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCreatePlaylist = async (songSuggestions) => {
    if (!isAuthorized) return

    setIsCreatingPlaylist(true)
    let trackUris = [] // Declare outside try block so it's accessible in catch
    try {
      setStatusMessage('Creating playlist on Spotify...')
      // Use the playlist name from input, or fallback to suggested name
      const finalPlaylistName = playlistName.trim() || suggestedPlaylistName || 'AI Generated Playlist'

      // Always prioritize pre-verified URIs from the API (these are already verified and correct)
      trackUris = []
      const songsWithUris = songSuggestions.filter(s => s.spotifyTrack?.uri)
      
      console.log(`[MagicPlaylists] Creating playlist: ${songSuggestions.length} total songs, ${songsWithUris.length} with pre-verified Spotify URIs`)
      
      // Use all pre-verified URIs (trust the API's verification)
      if (songsWithUris.length > 0) {
        trackUris.push(...songsWithUris.map(s => s.spotifyTrack.uri))
        console.log(`[MagicPlaylists] Using ${trackUris.length} pre-verified Spotify track URIs (no re-searching needed)`)
      }
      
      // Only search for tracks that don't have URIs (e.g., M3U imports without URIs)
      const songsNeedingSearch = songSuggestions.filter(s => !s.spotifyTrack?.uri)
      if (songsNeedingSearch.length > 0) {
        console.log(`[MagicPlaylists] ${songsNeedingSearch.length} tracks need searching (missing URIs, likely from M3U import without Spotify URIs)`)
        
        const matchedSongs = []
        const unmatchedSongs = []
        
        for (let i = 0; i < Math.min(songsNeedingSearch.length, 20); i++) {
          const song = songsNeedingSearch[i]
          try {
            // Try multiple search strategies, prioritizing exact matches
            let searchResults = []
            const searchStrategies = [
              `track:"${song.title}" artist:"${song.artist}"`,  // Most specific
              `track:${song.title} artist:${song.artist}`,    // Without quotes
              `${song.title} ${song.artist}`,                  // Combined
            ]
            // Removed overly broad searches (track-only, artist-only, title-only)
            
            for (const query of searchStrategies) {
              searchResults = await searchTracks(query, 10) // Limit to 10 for better relevance
              if (searchResults && searchResults.length > 0) {
                break
              }
              await new Promise(resolve => setTimeout(resolve, 50))
            }
            
            if (searchResults && searchResults.length > 0) {
              let bestMatch = null
              const titleLower = song.title.toLowerCase().trim()
              const artistLower = song.artist.toLowerCase().trim()
              
              for (const track of searchResults) {
                const trackTitle = (track.name?.toLowerCase() || '').trim()
                const trackArtist = (track.artists[0]?.name?.toLowerCase() || '').trim()
                
                // REQUIRE exact artist match (no fuzzy matching for artist)
                if (trackArtist !== artistLower) {
                  continue // Skip this track - artist doesn't match exactly
                }
                
                // Allow fuzzy title matching (threshold 0.7)
                const titleMatches = trackTitle === titleLower || isSimilar(trackTitle, titleLower, 0.7)
                
                if (titleMatches) {
                  bestMatch = track
                  const matchType = trackTitle === titleLower ? 'exact' : 'fuzzy'
                  console.log(`✅ Matched: "${song.title}" by ${song.artist} → "${track.name}" by ${track.artists[0]?.name} (exact artist, ${matchType} title)`)
                  break // Found a match, no need to check more tracks
                }
              }
              
              if (bestMatch) {
                trackUris.push(bestMatch.uri)
                matchedSongs.push(`${song.title} by ${song.artist}`)
              } else {
                unmatchedSongs.push(`${song.title} by ${song.artist}`)
                console.warn(`❌ No match: "${song.title}" by ${song.artist} (artist must match exactly, title must match with similarity ≥0.7)`)
              }
            } else {
              unmatchedSongs.push(`${song.title} by ${song.artist}`)
              console.warn(`❌ No search results: "${song.title}" by ${song.artist}`)
            }
          } catch (err) {
            unmatchedSongs.push(`${song.title} by ${song.artist}`)
            console.warn(`Failed to search: ${song.title} by ${song.artist}`, err)
          }
        }
        
        console.log(`📊 Additional search: ${matchedSongs.length} matched, ${unmatchedSongs.length} unmatched`)
        if (unmatchedSongs.length > 0) {
          console.log('Unmatched songs (missing URIs):', unmatchedSongs)
        }
      } else {
        console.log(`[MagicPlaylists] All ${songSuggestions.length} tracks have pre-verified URIs, no searching needed`)
      }

      if (trackUris.length === 0) {
        throw new Error('No tracks found on Spotify. Please check that the tracks exist on Spotify or try importing an M3U file with Spotify URIs.')
      }

      console.log(`[MagicPlaylists] Creating playlist "${finalPlaylistName}" with ${trackUris.length} tracks`)
      console.log(`[MagicPlaylists] First few URIs:`, trackUris.slice(0, 3))
      
      let result
      try {
        result = await createPlaylist(finalPlaylistName, trackUris)
      } catch (createErr) {
        console.error('[MagicPlaylists] createPlaylist threw error:', createErr)
        throw createErr
      }
      
      if (!result) {
        console.error('[MagicPlaylists] createPlaylist returned null/undefined')
        throw new Error('Failed to create playlist on Spotify - no result returned')
      }
      
      console.log(`✅ Playlist created successfully:`, result)
      setPlaylistResult(result)
      setStatusMessage(null)

      // Clear any persisted state once we've successfully created the playlist
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(LOCAL_STORAGE_KEY)
        window.localStorage.removeItem(PENDING_ADD_FLAG_KEY)
      }
    } catch (err) {
      // Safely extract error information
      const errorMessage = err?.message || err?.toString() || 'Unknown error'
      const errorStack = err?.stack || 'No stack trace available'
      const errorName = err?.name || 'Error'
      
      console.error('[MagicPlaylists] Error creating playlist:', err)
      console.error('[MagicPlaylists] Error details:', {
        name: errorName,
        message: errorMessage,
        stack: errorStack,
        songCount: songSuggestions?.length || 0,
        trackUriCount: trackUris?.length || 0,
        errorType: typeof err,
        errorString: String(err)
      })
      
      // Provide more specific error messages
      let userErrorMessage = 'Failed to create playlist on Spotify'
      if (errorMessage.includes('No tracks found')) {
        userErrorMessage = errorMessage
      } else if (errorMessage.includes('Failed to create')) {
        userErrorMessage = errorMessage
      } else if (errorMessage.includes('Authentication expired')) {
        userErrorMessage = 'Spotify authentication expired. Please reconnect to Spotify.'
      } else if (errorMessage.includes('Not authorized')) {
        userErrorMessage = 'Not authorized with Spotify. Please connect to Spotify first.'
      } else if (errorMessage && errorMessage !== 'Unknown error') {
        userErrorMessage = `Failed to create playlist: ${errorMessage}`
      }
      
      setError(userErrorMessage)
      setStatusMessage(null)
    } finally {
      setIsCreatingPlaylist(false)
    }
  }

  const handleAddToSpotify = async () => {
    console.log('[MagicPlaylists] handleAddToSpotify called:', { 
      hasSuggestions: !!suggestions, 
      suggestionsCount: suggestions?.length || 0,
      isAuthorized 
    })
    
    if (!suggestions || suggestions.length === 0) {
      setError('Generate a playlist first, then add to Spotify.')
      return
    }

    // If not yet authorized with Spotify, start OAuth flow.
    // Persist current state and mark that we should auto-add after redirect.
    if (!isAuthorized) {
      console.log('[MagicPlaylists] Not authorized, starting OAuth flow and persisting state')
      try {
      if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            LOCAL_STORAGE_KEY,
            JSON.stringify({
              prompt,
              suggestions
            })
          )
          window.localStorage.setItem(PENDING_ADD_FLAG_KEY, 'true')
          console.log('[MagicPlaylists] State persisted to localStorage')
        }
      } catch (e) {
        console.warn('[MagicPlaylists] Failed to persist state before Spotify auth:', e)
      }

      console.log('[MagicPlaylists] Calling authorize() to redirect to Spotify')
      authorize()
      return
    }

    console.log('[MagicPlaylists] Already authorized, creating playlist directly')
    await handleCreatePlaylist(suggestions)
  }

  const handleClear = () => {
    setPrompt('')
    setPlaylistName('')
    setSuggestedPlaylistName('')
    setObscurityLevel(50)
    setError(null)
    setSuggestions(null)
    setPlaylistResult(null)
    setStatusMessage(null)
    setTrackConfidences({})
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY)
      window.localStorage.removeItem(PENDING_ADD_FLAG_KEY)
    }
  }

  const handleAbort = () => {
    if (abortControllerRef.current) {
      console.log('[MagicPlaylists] User aborted playlist generation')
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
      setStatusMessage('Playlist generation cancelled')
    }
  }

  const handleDeleteTrack = (indexToDelete) => {
    if (!suggestions || indexToDelete < 0 || indexToDelete >= suggestions.length) return
    
    const updatedSuggestions = suggestions.filter((_, index) => index !== indexToDelete)
    setSuggestions(updatedSuggestions)
    console.log(`🗑️ Deleted track at index ${indexToDelete}`)
    
    // Also remove confidence score if it exists
    if (trackConfidences[indexToDelete] !== undefined) {
      const updatedConfidences = { ...trackConfidences }
      // Shift all indices after the deleted one
      const newConfidences = {}
      Object.keys(updatedConfidences).forEach(key => {
        const idx = parseInt(key)
        if (idx < indexToDelete) {
          newConfidences[idx] = updatedConfidences[idx]
        } else if (idx > indexToDelete) {
          newConfidences[idx - 1] = updatedConfidences[idx]
        }
      })
      setTrackConfidences(newConfidences)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setIsLoading(true)
    setError(null)
    setSuggestions([]) // Initialize as empty array for progressive updates
    setPlaylistResult(null)
    setStatusMessage('Starting playlist generation...')
    
    // Clear any pending Spotify add flag since this is a fresh playlist generation
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(PENDING_ADD_FLAG_KEY)
      console.log('[MagicPlaylists] Cleared pending add flag for new playlist generation')
    }

    try {
      console.log('[MagicPlaylists] Making streaming API request to /api/generate-playlist')
      
      // Create AbortController to cancel request if component unmounts
      abortControllerRef.current = new AbortController()
      
      // Use relative path like other API calls in this codebase  
      const apiUrl = '/api/generate-playlist'
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          count: 20,
          obscurityLevel: obscurityLevel
        }),
        signal: abortControllerRef.current.signal
      })

      console.log('API response status:', response.status, response.statusText)

      if (!response.ok) {
        // Try to get error message from response body
        let errorMessage = `Failed to generate playlist (${response.status})`
        try {
          const errorText = await response.text()
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText)
              errorMessage = errorData.error || errorMessage
            } catch {
              // If not JSON, use the text as error message
              errorMessage = errorText || errorMessage
            }
          }
        } catch (parseErr) {
          console.error('Failed to parse error response:', parseErr)
          // Use default error message based on status code
          if (response.status === 401) {
            errorMessage = 'Authentication failed. Please refresh the page and try again.'
          } else if (response.status === 500) {
            errorMessage = 'Server error. Please try again later.'
          } else if (response.status === 502) {
            errorMessage = 'Service temporarily unavailable. Please try again.'
          }
        }
        console.error('API error response:', { status: response.status, message: errorMessage })
        throw new Error(errorMessage)
      }

      // Handle streaming response
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      const streamingSuggestions = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'song') {
                // Check for duplicates before adding (normalized comparison)
                const normalize = (str) => (str || '').toLowerCase().trim()
                const songKey = `${normalize(data.song.title)}|${normalize(data.song.artist)}`
                const isDuplicate = streamingSuggestions.some(existing => {
                  const existingKey = `${normalize(existing.title)}|${normalize(existing.artist)}`
                  return existingKey === songKey
                })
                
                if (!isDuplicate) {
                  // Automatically add track without confirmation
                  streamingSuggestions.push(data.song)
                  setSuggestions([...streamingSuggestions])
                  console.log(`✅ Added song to playlist: "${data.song.title}" by ${data.song.artist} (${streamingSuggestions.length}/${20})`)
                } else {
                  console.log(`⏭️ Skipping duplicate in UI: "${data.song.title}" by ${data.song.artist}`)
                }
                
                // Update status message with running count
                setStatusMessage(`✓ ${streamingSuggestions.length} of 20 tracks added`)
              } else if (data.type === 'status') {
                setStatusMessage(data.message || `Checking songs... (${data.validCount || 0} found)`)
              } else if (data.type === 'checking') {
                setStatusMessage(`Checking "${data.song.title}" by ${data.song.artist}...`)
              } else if (data.type === 'unavailable') {
                console.log(`❌ Not available: "${data.song.title}" by ${data.song.artist}`)
              } else if (data.type === 'complete') {
                setSuggestions(data.suggestions)
                setStatusMessage(null)
                console.log(`✅ Playlist generation complete: ${data.validCount} songs found`)
              } else if (data.type === 'error') {
                throw new Error(data.error || 'Unknown error during generation')
              }
            } catch (parseErr) {
              console.warn('Failed to parse stream data:', parseErr, 'Line:', line)
            }
          }
        }
      }

      // Final update with all suggestions
      if (streamingSuggestions.length > 0) {
        setSuggestions(streamingSuggestions)
      }
      setStatusMessage(null)

      // Call the callback if provided
      if (onPlaylistGenerated && streamingSuggestions.length > 0) {
        onPlaylistGenerated(streamingSuggestions)
      }
      } catch (err) {
        // Don't show error if request was aborted (user navigated away)
        if (err.name === 'AbortError') {
          console.log('Playlist generation aborted by user')
          return
        }
        console.error('Error generating playlist:', err)
        if (err.message.includes('expired') || err.message.includes('session')) {
          setError('Your session has expired. Please refresh the page or log in again.')
        } else {
          setError(err.message || 'Failed to generate playlist')
        }
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
  }
  
  // Suggest playlist name when prompt changes (only if name field is empty)
  useEffect(() => {
    if (!prompt.trim()) {
      setSuggestedPlaylistName('')
      return
    }

    if (playlistName.trim()) {
      // Don't suggest if user has already entered a name
      return
    }

    // Debounce the API call
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch('/api/suggest-playlist-name', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt: prompt.trim() })
        })

        if (!response.ok) {
          console.warn('Failed to get AI playlist name suggestion, using fallback')
          // Fallback to simple text manipulation
          const cleaned = prompt.trim()
            .replace(/^create\s+a\s+playlist\s+(of|with|for)\s+/i, '')
            .replace(/^playlist\s+(of|with|for)\s+/i, '')
            .replace(/\s+/g, ' ')
            .trim()
          
          let suggested = cleaned
          if (suggested.length > 50) {
            const truncated = suggested.substring(0, 50)
            const lastSpace = truncated.lastIndexOf(' ')
            suggested = lastSpace > 30 ? truncated.substring(0, lastSpace) : truncated
            suggested = suggested.trim() + '...'
          }
          
          setSuggestedPlaylistName(suggested || 'AI Generated Playlist')
          return
        }

        const data = await response.json()
        if (data.name) {
          setSuggestedPlaylistName(data.name)
        } else {
          setSuggestedPlaylistName('AI Generated Playlist')
        }
      } catch (error) {
        console.error('Error getting AI playlist name suggestion:', error)
        // Fallback to simple text manipulation
        const cleaned = prompt.trim()
          .replace(/^create\s+a\s+playlist\s+(of|with|for)\s+/i, '')
          .replace(/^playlist\s+(of|with|for)\s+/i, '')
          .replace(/\s+/g, ' ')
          .trim()
        
        let suggested = cleaned
        if (suggested.length > 50) {
          const truncated = suggested.substring(0, 50)
          const lastSpace = truncated.lastIndexOf(' ')
          suggested = lastSpace > 30 ? truncated.substring(0, lastSpace) : truncated
          suggested = suggested.trim() + '...'
        }
        
        setSuggestedPlaylistName(suggested || 'AI Generated Playlist')
      }
    }, 1000) // 1 second debounce

    return () => clearTimeout(timeoutId)
  }, [prompt, playlistName])

  // Cleanup: abort request if component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        console.log('[MagicPlaylists] Component unmounting, aborting request')
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // On mount, try to restore any previously generated playlist state
  useEffect(() => {
    if (suggestions || prompt) return
    if (typeof window === 'undefined') return

    // Check for Spotify OAuth error in URL params
    const urlParams = new URLSearchParams(window.location.search)
    const spotifyError = urlParams.get('spotify_error')
    if (spotifyError) {
      console.error('[MagicPlaylists] Spotify OAuth error detected:', spotifyError)
      setError(`Spotify authorization failed: ${spotifyError}. Please try again.`)
      // Clear the URL param
      window.history.replaceState({}, document.title, window.location.pathname)
      // Clear any pending flags since auth failed
      window.localStorage.removeItem(PENDING_ADD_FLAG_KEY)
      return
    }

    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
      const pending = window.localStorage.getItem(PENDING_ADD_FLAG_KEY)
      
      // If there's a pending flag but no state to restore, clear the stale flag
      if (pending === 'true' && !raw) {
        console.log('[MagicPlaylists] Found stale pending flag with no matching state, clearing it')
        window.localStorage.removeItem(PENDING_ADD_FLAG_KEY)
        return
      }
      
      if (!raw) return

      const parsed = JSON.parse(raw)
      if (parsed?.prompt) {
        setPrompt(parsed.prompt)
      }
      if (Array.isArray(parsed?.suggestions) && parsed.suggestions.length > 0) {
        setSuggestions(parsed.suggestions)
      }
    } catch (e) {
      console.warn('[MagicPlaylists] Failed to restore state from localStorage:', e)
      // Clear potentially corrupted state
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(LOCAL_STORAGE_KEY)
        window.localStorage.removeItem(PENDING_ADD_FLAG_KEY)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // After redirect from Spotify: if we have a pending add flag, are authorized,
  // and have restored suggestions, automatically create the playlist once.
  useEffect(() => {
    if (typeof window === 'undefined') return
    console.log('[MagicPlaylists] post-Spotify effect:', {
      isAuthorized,
      hasSuggestions: !!suggestions,
      suggestionsCount: suggestions?.length || 0
    })
    if (!isAuthorized) {
      console.log('[MagicPlaylists] Skipping auto-add: not authorized with Spotify yet')
      return
    }
    if (!suggestions || suggestions.length === 0) {
      console.log('[MagicPlaylists] Skipping auto-add: no suggestions restored')
      return
    }

    const pending = window.localStorage.getItem(PENDING_ADD_FLAG_KEY)
    if (pending === 'true') {
      // Clear the flag immediately to avoid loops, show a status, then create playlist
      window.localStorage.removeItem(PENDING_ADD_FLAG_KEY)
      console.log('[MagicPlaylists] Pending add flag detected, resuming playlist creation')
      setStatusMessage('Resuming Spotify playlist creation...')
      handleCreatePlaylist(suggestions)
    } else {
      console.log('[MagicPlaylists] No pending add flag, nothing to resume')
    }
  }, [isAuthorized, suggestions])

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="text-center">
          <svg className="w-12 h-12 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-2">
            Login Required
          </h3>
          <p className="text-blue-700 dark:text-blue-400 mb-4">
            You need to be logged in to create AI-powered playlists.
          </p>
          <Link
            href="/login?redirect=/other-fun-stuff/magic-playlists"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-300"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Login to Continue
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Connected to Spotify - Always visible when authorized */}
      {isAuthorized && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-green-700 dark:text-green-400">
                Connected to Spotify
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={authorize}
                className="text-sm text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 font-medium underline"
              >
                Reconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            What kind of playlist do you want?
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., 'chill lo-fi beats for late night coding' or 'upbeat indie rock like Arctic Monkeys'"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
            rows={3}
            disabled={isLoading}
            required
          />
        </div>

        {/* Playlist Name Input */}
        <div>
          <label htmlFor="playlistName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Playlist Name {suggestedPlaylistName && !playlistName.trim() && (
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">
                (suggested: &quot;{suggestedPlaylistName}&quot;)
              </span>
            )}
          </label>
          <input
            type="text"
            id="playlistName"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            placeholder={suggestedPlaylistName || "Leave empty to use suggested name"}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            disabled={isLoading}
          />
        </div>

        {/* Obscurity Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="obscurity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Obscurity Level
            </label>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {obscurityLevel < 33 ? 'Well Known' : obscurityLevel < 67 ? 'Mixed' : 'Obscure'}
            </span>
          </div>
          <div className="relative">
            {(() => {
              // Calculate thumb color based on obscurityLevel (cyan to purple to pink)
              // Using a vibrant gradient: cyan (well-known) -> purple (middle) -> pink (obscure)
              const ratio = obscurityLevel / 100
              let r, g, b
              
              if (ratio < 0.5) {
                // First half: cyan to purple
                const localRatio = ratio * 2
                // Cyan (6, 182, 212) to Purple (168, 85, 247)
                r = Math.round(6 + (168 - 6) * localRatio)
                g = Math.round(182 + (85 - 182) * localRatio)
                b = Math.round(212 + (247 - 212) * localRatio)
              } else {
                // Second half: purple to pink
                const localRatio = (ratio - 0.5) * 2
                // Purple (168, 85, 247) to Pink (236, 72, 153)
                r = Math.round(168 + (236 - 168) * localRatio)
                g = Math.round(85 + (72 - 85) * localRatio)
                b = Math.round(247 + (153 - 247) * localRatio)
              }
              
              const thumbColor = `rgb(${r}, ${g}, ${b})`
              
              return (
                <input
                  type="range"
                  id="obscurity"
                  min="0"
                  max="100"
                  value={obscurityLevel}
                  onChange={(e) => setObscurityLevel(parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer obscurity-slider"
                  disabled={isLoading}
                  style={{
                    background: 'linear-gradient(to right, rgb(6, 182, 212) 0%, rgb(168, 85, 247) 50%, rgb(236, 72, 153) 100%)',
                    ['--thumb-color']: thumbColor
                  }}
                />
              )
            })()}
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Chart-toppers</span>
              <span>Hidden gems</span>
            </div>
          </div>
        </div>

        {/* Import M3U Button */}
        <div className="flex items-center gap-2 mb-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".m3u,.m3u8"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleImportM3U}
            disabled={isLoading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-300 flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>Import M3U</span>
          </button>
        </div>

        {/* Generate Button - Full Width */}
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Generating your playlist...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Generate Playlist</span>
            </div>
          )}
        </button>

        {/* Subtle Action Links */}
        <div className="flex items-center justify-center gap-4 text-sm">
          {/* Abort Link (only show during generation) */}
          {isLoading && (
            <button
              type="button"
              onClick={handleAbort}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline decoration-2 underline-offset-2 transition-colors"
            >
              Cancel
            </button>
          )}

          {/* Clear Link */}
          <button
            type="button"
            onClick={handleClear}
            disabled={isLoading}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline decoration-2 underline-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
          >
            Clear
          </button>
        </div>

      </form>

      {/* Error / Status Display */}
      {statusMessage && !error && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10A8 8 0 11.001 9.999 8 8 0 0118 10zm-8-4a1 1 0 100 2 1 1 0 000-2zm1 9a1 1 0 11-2 0v-4a1 1 0 112 0v4z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-blue-700 dark:text-blue-400">{statusMessage}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3 flex-1">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              {(error.includes('session') || error.includes('expired') || error.includes('Authentication expired')) ? (
                <div className="mt-3 flex space-x-2">
                  {error.includes('Spotify') || error.includes('Authentication expired') ? (
                    <button
                      onClick={async () => {
                        setError(null)
                        await authorize()
                      }}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors duration-300"
                    >
                      Reconnect to Spotify
                    </button>
                  ) : null}
                  <button
                    onClick={() => window.location.reload()}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors duration-300"
                  >
                    Refresh Page
                  </button>
                  {error.includes('session') && (
                    <button
                      onClick={async () => {
                        await signOut()
                        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
                      }}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded transition-colors duration-300"
                    >
                      Re-login
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Spotify Status */}
      {spotifyError && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">{spotifyError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions Display */}
      {(suggestions && suggestions.length > 0) && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">
                  {isLoading ? 'Generating Playlist...' : 'Playlist Generated!'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    {suggestions.length} of 20 tracks
                  </span>
                  {isLoading && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200">
                      Adding...
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Export M3U Button */}
              <button
                onClick={handleExportM3U}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-300 flex items-center space-x-2"
                title="Export playlist as M3U file"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Export M3U</span>
              </button>

              {/* Spotify Integration */}
              <button
                onClick={handleAddToSpotify}
                disabled={spotifyLoading || isCreatingPlaylist}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-300 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.6-.12-.421.18-.78.6-.899 4.56-1.051 8.49-.669 11.64 1.299.42.18.48.84.24 1.101zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.56-11.939-1.38-.479.16-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.84.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.781-.18-.601.18-1.2.78-1.381 4.5-1.411 11.82-1.051 16.62 1.24.45.21.66 1.02.3 1.86-.18.451-.96.63-1.41.33z"/>
                </svg>
                <span>{isAuthorized ? 'Add to Spotify' : 'Connect & Add to Spotify'}</span>
              </button>
            </div>

            {isCreatingPlaylist && (
              <div className="flex items-center text-blue-600 dark:text-blue-400">
                <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm">Creating playlist...</span>
              </div>
            )}
          </div>

          {playlistResult && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                ✅ Created playlist &quot;{playlistResult.name}&quot; with {playlistResult.tracksAdded} tracks
              </p>
              <a
                href={playlistResult.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 underline"
              >
                Open in Spotify →
              </a>
            </div>
          )}

          <div className="space-y-2">
            {suggestions.map((song, index) => {
              const confidence = trackConfidences[index] ?? null
              const confidencePercent = confidence !== null ? Math.min(100, (confidence / 100) * 100) : 0
              
              // Determine color based on confidence
              // Thresholds: >=70 green (high), >=30 amber (medium/will add), <30 red (low/won't add)
              let barColor = 'bg-gray-300 dark:bg-gray-600' // Default (no confidence yet)
              if (confidence !== null) {
                if (confidence >= 70) {
                  barColor = 'bg-green-500' // High confidence
                } else if (confidence >= 30) {
                  barColor = 'bg-amber-500' // Medium confidence (will be added)
                } else {
                  barColor = 'bg-red-500' // Low confidence (won't be added)
                }
              }
              
              return (
                <div key={index} className="flex items-center justify-between py-2 border-b border-green-200 dark:border-green-700 last:border-b-0 group">
                  <div className="flex-1">
                    <span className="font-medium text-gray-900 dark:text-white">{song.title}</span>
                    <span className="text-gray-600 dark:text-gray-400"> by {song.artist}</span>
                    {song.year && <span className="text-sm text-gray-500 dark:text-gray-500"> ({song.year})</span>}
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {confidence !== null ? (
                      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden" title={`Confidence: ${confidence}/100`}>
                        <div 
                          className={`h-full ${barColor} transition-all duration-300`}
                          style={{ width: `${confidencePercent}%` }}
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full" title="Checking confidence...">
                        <div className="h-full bg-gray-300 dark:bg-gray-600 animate-pulse" style={{ width: '50%' }} />
                      </div>
                    )}
                    <button
                      onClick={() => handleDeleteTrack(index)}
                      disabled={isLoading}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove track from playlist"
                      aria-label={`Remove ${song.title} by ${song.artist}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
