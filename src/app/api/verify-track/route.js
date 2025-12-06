import { NextResponse } from 'next/server'

// POST - Verify if a single track exists on Spotify
export async function POST(request) {
  try {
    const body = await request.json()
    const { title, artist, findAlternative = false } = body

    if (!title || !artist) {
      return NextResponse.json({ error: 'Title and artist are required' }, { status: 400 })
    }

    // Get Spotify Client Credentials token for search (no user auth needed)
    const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
    const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET

    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      return NextResponse.json({ error: 'Server configuration error (missing Spotify credentials)' }, { status: 500 })
    }

    // Cache for client credentials token (in-memory, per request)
    let clientCredentialsToken = null
    let tokenExpiresAt = 0

    // Helper function to get Client Credentials token for Spotify search
    const getClientCredentialsToken = async () => {
      // Return cached token if still valid (with 60 second buffer)
      if (clientCredentialsToken && Date.now() < tokenExpiresAt - 60000) {
        return clientCredentialsToken
      }

      try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
          },
          body: new URLSearchParams({
            grant_type: 'client_credentials'
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('Failed to get Spotify client credentials token:', errorData)
          throw new Error('Failed to authenticate with Spotify')
        }

        const data = await response.json()
        clientCredentialsToken = data.access_token
        tokenExpiresAt = Date.now() + (data.expires_in * 1000)
        console.log('✅ Obtained Spotify client credentials token')
        return clientCredentialsToken
      } catch (error) {
        console.error('Error getting Spotify client credentials token:', error)
        throw error
      }
    }

    // Helper function to clean title - remove artist name if it appears in the title
    const cleanTitle = (title, artist) => {
      if (!title || !artist) return title
      
      const titleLower = title.toLowerCase().trim()
      const artistLower = artist.toLowerCase().trim()
      
      // Escape special regex characters in artist name
      const escapedArtist = artist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      
      // Check if title starts with artist name (e.g., "Tangerine Dream - Phaedra")
      if (titleLower.startsWith(artistLower)) {
        // Remove artist name and any separator (dash, colon, etc.)
        const pattern = new RegExp(`^${escapedArtist}\\s*[-–—:]\\s*`, 'i')
        const cleaned = title.replace(pattern, '').trim()
        if (cleaned && cleaned.length > 0) {
          console.log(`🧹 Cleaned title: "${title}" → "${cleaned}"`)
          return cleaned
        }
      }
      
      // Also check for patterns like "Artist - Title" anywhere in the string
      const dashPattern = new RegExp(`^${escapedArtist}\\s*[-–—:]\\s*`, 'i')
      if (dashPattern.test(title)) {
        const cleaned = title.replace(dashPattern, '').trim()
        if (cleaned && cleaned.length > 0) {
          console.log(`🧹 Cleaned title: "${title}" → "${cleaned}"`)
          return cleaned
        }
      }
      
      return title
    }

    // Helper function to check if a song exists on Spotify
    const checkSpotifyAvailability = async (title, artist) => {
      // Clean the title first - remove artist name if embedded
      const cleanedTitle = cleanTitle(title, artist)
      
      console.log(`🔍 Searching for: "${cleanedTitle}" by ${artist} (original: "${title}")`)
      
      // Get client credentials token for search
      const searchToken = await getClientCredentialsToken()
      
      // Prioritize exact matches, avoid overly broad searches
      const searchStrategies = [
        `track:"${cleanedTitle}" artist:"${artist}"`,  // Most specific: exact title and artist
        `track:${cleanedTitle} artist:${artist}`,    // Without quotes (still specific)
        `${cleanedTitle} ${artist}`,                    // Combined search
        // Only try original title if cleaning changed it
        ...(cleanedTitle !== title ? [
          `track:"${title}" artist:"${artist}"`,
          `track:${title} artist:${artist}`
        ] : [])
      ]

      for (const query of searchStrategies) {
        try {
          const response = await fetch(
            `https://api.spotify.com/v1/search?` +
            new URLSearchParams({
              q: query,
              type: 'track',
              limit: '20',
              market: 'US'
            }),
            {
              headers: {
                'Authorization': `Bearer ${searchToken}`
              }
            }
          )

          if (response.status === 401) {
            console.log(`❌ Spotify client credentials token expired, refreshing...`)
            // Refresh token and retry once
            const newToken = await getClientCredentialsToken()
            // Retry with new token (simplified - just continue to next strategy)
            continue
          }

          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After') || 'unknown'
            console.error(`❌ Spotify rate limit exceeded (429). Retry after: ${retryAfter} seconds`)
            return { available: false, error: `Spotify rate limit exceeded. Please try again later.` }
          }

          if (!response.ok) {
            // Try to get error details for better debugging
            let errorDetails = ''
            try {
              const errorData = await response.json().catch(() => ({}))
              errorDetails = errorData.error?.message || JSON.stringify(errorData)
            } catch (e) {
              errorDetails = response.statusText
            }
            console.log(`⚠️ Spotify search failed (${response.status}) for query: "${query}" - ${errorDetails}`)
            
            // If it's a server error (5xx), return error instead of continuing
            if (response.status >= 500) {
              return { available: false, error: `Spotify API error: ${response.status}` }
            }
            
            continue // Try next strategy for client errors
          }

          const data = await response.json()
          const tracks = data.tracks?.items || []
          
          console.log(`   📊 Spotify search returned ${tracks.length} tracks for query: "${query}"`)

          if (tracks.length > 0) {
            // Use strict matching: exact artist, better title matching
            const titleLower = cleanedTitle.toLowerCase().trim()
            const artistLower = artist.toLowerCase().trim()

            // First pass: look for exact matches (both title and artist)
            for (const track of tracks) {
              const trackTitle = (track.name?.toLowerCase() || '').trim()
              const trackArtist = (track.artists[0]?.name?.toLowerCase() || '').trim()

              // Exact match: both title and artist match exactly
              if (trackTitle === titleLower && trackArtist === artistLower) {
                console.log(`   ✅ Exact match found: "${track.name}" by ${track.artists[0]?.name}`)
                return { 
                  available: true, 
                  track,
                  debug: {
                    searchQuery: query,
                    matchType: 'exact',
                    apiResponse: data
                  }
                }
              }
            }

            // Second pass: exact artist match, fuzzy title match (similarity ≥0.7)
            // Helper function for fuzzy matching
            const isSimilar = (str1, str2, threshold = 0.7) => {
              const normalize = (str) => str.toLowerCase().trim().replace(/[^\w\s]/g, '')
              const norm1 = normalize(str1)
              const norm2 = normalize(str2)
              if (norm1 === norm2) return true
              
              // Check if one contains the other (but only if they're reasonably similar in length)
              if (norm1.includes(norm2) || norm2.includes(norm1)) {
                const lengthRatio = Math.min(norm1.length, norm2.length) / Math.max(norm1.length, norm2.length)
                if (lengthRatio >= 0.7) {
                  console.log(`   🔍 Substring match: "${str1}" contains "${str2}" (or vice versa) - length ratio: ${lengthRatio.toFixed(2)}`)
                  return true
                }
              }
              
              // Filter out single-character words and common articles/prepositions
              const stopWords = new Set(['a', 'an', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by'])
              const words1 = norm1.split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w))
              const words2 = norm2.split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w))
              
              if (words1.length === 0 || words2.length === 0) {
                console.log(`   ❌ No meaningful words to compare: "${str1}" vs "${str2}"`)
                return false
              }
              
              const matchingWords = words1.filter(w => words2.includes(w)).length
              const similarity = matchingWords / Math.max(words1.length, words2.length)
              
              if (similarity >= threshold) {
                console.log(`   ✅ Fuzzy match accepted: similarity ${similarity.toFixed(2)} >= ${threshold}`)
              } else {
                console.log(`   ❌ Fuzzy match rejected: similarity ${similarity.toFixed(2)} < ${threshold}`)
              }
              
              return similarity >= threshold
            }

            for (const track of tracks) {
              const trackTitle = (track.name?.toLowerCase() || '').trim()
              const trackArtist = (track.artists[0]?.name?.toLowerCase() || '').trim()

              // REQUIRE exact artist match (no fuzzy matching for artist)
              if (trackArtist !== artistLower) {
                continue // Skip - artist doesn't match exactly
              }

              // Allow fuzzy title matching (threshold 0.7)
              const titleMatches = trackTitle === titleLower || isSimilar(trackTitle, titleLower, 0.7)

              if (titleMatches) {
                const matchType = trackTitle === titleLower ? 'exact' : 'fuzzy'
                console.log(`   ✅ Match found (${matchType} title, exact artist): "${track.name}" by ${track.artists[0]?.name}`)
                return { 
                  available: true, 
                  track,
                  debug: {
                    searchQuery: query,
                    matchType: `${matchType} title, exact artist`,
                    apiResponse: data
                  }
                }
              }
            }
            
            // Log if we had tracks but no matches
            if (tracks.length > 0) {
              console.log(`   ⚠️ Found ${tracks.length} tracks but none matched strict criteria. First track: "${tracks[0].name}" by ${tracks[0].artists[0]?.name}`)
              console.log(`   ⚠️ Looking for: "${cleanedTitle}" by "${artist}" (exact artist required, title similarity ≥0.7)`)
            }
          } else {
            console.log(`   ⚠️ No tracks returned from Spotify for query: "${query}"`)
          }
        } catch (err) {
          console.warn(`Spotify search error for "${cleanedTitle}" by ${artist}:`, err)
          continue
        }
      }

      // If we tried all strategies and didn't find a match, log it
      console.log(`❌ No match found after trying all strategies for "${cleanedTitle}" by ${artist} (original: "${title}")`)
      return { available: false }
    }

    // Helper function to find alternative tracks by the same artist
    const findAlternativeTracks = async (artist, excludeTitles = []) => {
      try {
        // Get client credentials token for search
        const searchToken = await getClientCredentialsToken()
        
        const response = await fetch(
          `https://api.spotify.com/v1/search?` +
          new URLSearchParams({
            q: `artist:"${artist}"`,
            type: 'track',
            limit: '20',
            market: 'US'
          }),
          {
            headers: {
              'Authorization': `Bearer ${searchToken}`
            }
          }
        )

        if (!response.ok) return []

        const data = await response.json()
        const tracks = data.tracks?.items || []
        
        // Filter out excluded titles and return available tracks
        return tracks
          .filter(track => {
            const trackTitle = (track.name?.toLowerCase() || '').trim()
            return !excludeTitles.some(excluded => 
              excluded.toLowerCase().trim() === trackTitle
            )
          })
          .slice(0, 5) // Return top 5 alternatives
          .map(track => ({
            title: track.name,
            artist: track.artists[0]?.name || artist,
            uri: track.uri,
            id: track.id
          }))
      } catch (err) {
        console.warn(`Failed to find alternatives for artist ${artist}:`, err)
        return []
      }
    }

    // Check if track is available
    const result = await checkSpotifyAvailability(title, artist)

    if (result.available) {
      return NextResponse.json({
        available: true,
        track: {
          id: result.track.id,
          uri: result.track.uri,
          name: result.track.name,
          artist: result.track.artists[0]?.name || artist
        }
      })
    }

    // If not found and findAlternative is true, try to find alternatives
    if (findAlternative) {
      const alternatives = await findAlternativeTracks(artist, [title])
      if (alternatives.length > 0) {
        return NextResponse.json({
          available: false,
          alternative: alternatives[0] // Return first alternative
        })
      }
    }

    return NextResponse.json({
      available: false,
      error: result.error || 'Track not found on Spotify'
    })
  } catch (error) {
    console.error('Error in verify-track:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

