import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST - Generate playlist suggestions using Groq
export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
    // Use server-side Groq key so it is not exposed to the client
    const GROQ_API_KEY = process.env.GROQ_API_KEY

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: 'Server configuration error (missing GROQ_API_KEY)' }, { status: 500 })
    }

    const body = await request.json()
    const { prompt, genre, mood, era, count = 20, obscurityLevel = 50 } = body

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
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
      
      const searchStrategies = [
        `track:"${cleanedTitle}" artist:"${artist}"`,
        `track:${cleanedTitle} artist:${artist}`,
        `${cleanedTitle} ${artist}`,
        `track:"${cleanedTitle}"`,
        cleanedTitle,
        // Also try original title in case cleaning was wrong
        `track:"${title}" artist:"${artist}"`,
        title,
      ]

      for (const query of searchStrategies) {
        try {
          const response = await fetch(
            `https://api.spotify.com/v1/search?` +
            new URLSearchParams({
              q: query,
              type: 'track',
              limit: '20', // Increased from 10 to 20 for better matching
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
            // Try to get error details
            try {
              const errorData = await response.json().catch(() => ({}))
              console.error('Spotify rate limit error details:', errorData)
            } catch (e) {}
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
            // Check if any track matches reasonably well
            // Use cleanedTitle for matching, not the original title
            const titleLower = cleanedTitle.toLowerCase().trim()
            const artistLower = artist.toLowerCase().trim()

            for (const track of tracks) {
              const trackTitle = (track.name?.toLowerCase() || '').trim()
              const trackArtist = (track.artists[0]?.name?.toLowerCase() || '').trim()

              // Simple similarity check - original logic that worked
              const titleMatch = trackTitle === titleLower || 
                                trackTitle.includes(titleLower) || 
                                titleLower.includes(trackTitle)
              const artistMatch = trackArtist === artistLower || 
                                  trackArtist.includes(artistLower) || 
                                  artistLower.includes(trackArtist)

              if (titleMatch && artistMatch) {
                console.log(`   ✅ Match found: "${track.name}" by ${track.artists[0]?.name}`)
                return { available: true, track }
              }
            }
            
            // Log if we had tracks but no matches
            if (tracks.length > 0) {
              console.log(`   ⚠️ Found ${tracks.length} tracks but none matched. First track: "${tracks[0].name}" by ${tracks[0].artists[0]?.name}`)
            }
          } else {
            console.log(`   ⚠️ No tracks returned from Spotify for query: "${query}"`)
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100))
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

    // Build the system prompt based on obscurity level
    // obscurityLevel: 0 = well-known/chart-toppers, 100 = obscure/hidden gems
    let obscurityInstructions = ''
    if (obscurityLevel < 33) {
      // Well-known (0-32)
      obscurityInstructions = `CRITICAL: Focus on songs that are:
1. Well-known, popular, or chart-topping tracks
2. Mainstream hits and widely recognized songs
3. Popular artists and their most famous tracks
4. Songs that would be considered "popular" or "well-known"
5. MUST be available on Spotify - prioritize songs that exist on the platform
6. Use the EXACT song title and artist name as they appear on Spotify
7. EACH SONG MUST BE UNIQUE - never suggest the same title by the same artist twice

AVOID: Obscure tracks, deep cuts, or lesser-known songs.`
    } else if (obscurityLevel < 67) {
      // Mixed (33-66)
      obscurityInstructions = `CRITICAL: Focus on songs that are:
1. A mix of well-known and lesser-known tracks
2. Some popular hits balanced with deeper cuts
3. Both mainstream and independent artists
4. A combination of chart-toppers and hidden gems
5. MUST be available on Spotify - prioritize songs that exist on the platform
6. Use the EXACT song title and artist name as they appear on Spotify
7. EACH SONG MUST BE UNIQUE - never suggest the same title by the same artist twice

BALANCE: Mix popular songs with more obscure tracks.`
    } else {
      // Obscure (67-100)
      obscurityInstructions = `CRITICAL: Focus on songs that are:
1. Obscure, lesser-known, or underground tracks
2. Deep cuts, B-sides, or rare releases
3. Independent, alternative, or niche artists
4. Hidden gems that are NOT mainstream hits or chart-toppers
5. MUST be available on Spotify - prioritize songs that exist on the platform
6. Use the EXACT song title and artist name as they appear on Spotify
7. EACH SONG MUST BE UNIQUE - never suggest the same title by the same artist twice

AVOID: Mainstream hits, chart-toppers, widely recognized songs, or anything that would be considered "popular" or "well-known".`
    }

    const systemPrompt = `You are an expert music curator with deep knowledge of music across all genres and eras.
${obscurityInstructions}

IMPORTANT: 
- If a specific track by an artist is not available on Spotify, suggest a DIFFERENT track by the SAME artist that is available on Spotify.
- NEVER repeat the same song (same title + same artist) in your suggestions.

Given a user's request, suggest songs that match their description.
Return ONLY a valid JSON object with this exact structure and nothing else:
{
  "suggestions": [
    {"title": "Song Title", "artist": "Artist Name", "year": 2020, "reason": "Why this fits the request"}
  ]
}
Do not include any markdown or code fences.`

    // Call Groq API
    const requestBody = {
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Create a playlist of ${count} songs: ${prompt}${genre ? ` Genre: ${genre}` : ''}${mood ? ` Mood: ${mood}` : ''}${era ? ` Era: ${era}` : ''}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2500,
      // Ask Groq to return strict JSON
      response_format: { type: 'json_object' }
    }

    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json().catch(() => ({}))
      console.error('Groq API error:', {
        status: groqResponse.status,
        statusText: groqResponse.statusText,
        error: errorData
      })
      return NextResponse.json(
        {
          error: 'Failed to generate playlist suggestions from Groq',
          groqStatus: groqResponse.status,
          groqError: errorData
        },
        { status: 502 }
      )
    }

    const groqData = await groqResponse.json()
    const content = groqData.choices?.[0]?.message?.content
    // With response_format: 'json_object', content should be a JSON string
    let parsed
    try {
      parsed = typeof content === 'string' ? JSON.parse(content) : content
    } catch (parseError) {
      console.error('Failed to parse Groq JSON response:', parseError, 'Raw content:', content)
      return NextResponse.json(
        { error: 'Failed to parse AI response from Groq' },
        { status: 500 }
      )
    }

    // Create streaming response with abort handling
    const encoder = new TextEncoder()
    let isAborted = false
    
    // Check if request was aborted
    const signal = request.signal
    signal.addEventListener('abort', () => {
      console.log('[Generate Playlist] Request aborted by client')
      isAborted = true
    })
    
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data) => {
          if (isAborted) return false
          try {
            const chunk = encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            controller.enqueue(chunk)
            return true
          } catch (err) {
            // Client disconnected
            if (err.message?.includes('aborted') || err.name === 'AbortError') {
              console.log('[Generate Playlist] Client disconnected, stopping stream')
              isAborted = true
              return false
            }
            console.error('Error sending stream data:', err)
            return false
          }
        }

        try {
          let allSuggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : []
          const validSuggestions = []
          const maxIterations = 5 // Limit iterations to avoid infinite loops
          let iteration = 0

          // Keep generating and filtering until we have enough valid songs
          while (validSuggestions.length < count && iteration < maxIterations && !isAborted) {
            iteration++
            console.log(`[Generate Playlist] Iteration ${iteration}: Checking ${allSuggestions.length} suggestions, ${validSuggestions.length} valid so far`)
            send({ type: 'status', message: `Checking ${allSuggestions.length} suggestions...`, iteration, validCount: validSuggestions.length })

            const unavailableSongs = [] // Track songs that weren't found
            const artistAlternatives = {} // Track alternative tracks found by artist

            // Helper function to check if a song is a duplicate (normalized comparison)
            const isDuplicate = (song, existingSongs) => {
              const normalize = (str) => str.toLowerCase().trim()
              const songKey = `${normalize(song.title)}|${normalize(song.artist)}`
              return existingSongs.some(existing => {
                const existingKey = `${normalize(existing.title)}|${normalize(existing.artist)}`
                return existingKey === songKey
              })
            }

            // Check each suggestion against Spotify
            for (const song of allSuggestions) {
              if (validSuggestions.length >= count || isAborted) break
              
              // Check if request was aborted
              if (signal.aborted || isAborted) {
                console.log('[Generate Playlist] Aborted during song checking')
                break
              }
              
              // Skip if we've already checked this exact song (title + artist)
              if (isDuplicate(song, validSuggestions)) {
                console.log(`⏭️ Skipping duplicate: "${song.title}" by ${song.artist}`)
                continue
              }

              send({ type: 'checking', song: { title: song.title, artist: song.artist } })

              let result
              try {
                result = await checkSpotifyAvailability(song.title, song.artist)
              } catch (spotifyError) {
                console.error(`[Generate Playlist] Error checking Spotify for "${song.title}" by ${song.artist}:`, spotifyError)
                console.error(`[Generate Playlist] Error stack:`, spotifyError.stack)
                // Continue to next song instead of breaking
                send({ type: 'unavailable', song: { title: song.title, artist: song.artist }, error: spotifyError.message })
                // Don't break - continue to next song
                continue
              }
              
              if (result.available) {
                const verifiedSong = {
                  ...song,
                  spotifyTrack: {
                    id: result.track.id,
                    uri: result.track.uri,
                    name: result.track.name,
                    artist: result.track.artists[0]?.name || song.artist
                  }
                }
                
                // Check for duplicate before adding
                if (!isDuplicate(verifiedSong, validSuggestions)) {
                  validSuggestions.push(verifiedSong)
                  console.log(`✅ Found on Spotify: "${song.title}" by ${song.artist}`)
                  // Send verified song immediately
                  send({ type: 'song', song: verifiedSong, total: validSuggestions.length })
                } else {
                  console.log(`⏭️ Skipping duplicate verified song: "${song.title}" by ${song.artist}`)
                }
              } else {
                // Check if the error is due to expired token
                if (result.error === 'Spotify token expired' || result.needsReauth) {
                  console.error(`❌ Spotify token expired - stopping playlist generation. User needs to re-authorize.`)
                  send({ type: 'error', error: 'Spotify token expired. Please reconnect to Spotify and try again.', needsReauth: true })
                  return // Stop processing
                }
                
                console.log(`❌ Not found on Spotify: "${song.title}" by ${song.artist}, looking for alternatives...`)
                unavailableSongs.push(song)
                
                // Try to find alternative tracks by the same artist
                let alternatives = []
                try {
                  alternatives = await findAlternativeTracks(song.artist, [song.title])
                } catch (altError) {
                  console.error(`[Generate Playlist] Error finding alternatives for "${song.title}" by ${song.artist}:`, altError)
                  // Continue without alternatives - don't break the loop
                  send({ type: 'unavailable', song: { title: song.title, artist: song.artist } })
                  continue
                }
                if (alternatives.length > 0) {
                  // Find first alternative that's not a duplicate
                  let alternative = null
                  for (const alt of alternatives) {
                    const altSong = {
                      title: alt.title,
                      artist: alt.artist
                    }
                    if (!isDuplicate(altSong, validSuggestions)) {
                      alternative = alt
                      break
                    }
                  }
                  
                  if (alternative) {
                    const verifiedSong = {
                      title: alternative.title,
                      artist: alternative.artist,
                      year: song.year,
                      reason: `Alternative to "${song.title}" (original not available on Spotify)`,
                      spotifyTrack: {
                        id: alternative.id,
                        uri: alternative.uri,
                        name: alternative.title,
                        artist: alternative.artist
                      }
                    }
                    validSuggestions.push(verifiedSong)
                    artistAlternatives[song.artist] = artistAlternatives[song.artist] || []
                    artistAlternatives[song.artist].push({
                      requested: song.title,
                      found: alternative.title
                    })
                    console.log(`✅ Using alternative: "${alternative.title}" by ${alternative.artist} (instead of "${song.title}")`)
                    // Send verified alternative immediately
                    send({ type: 'song', song: verifiedSong, total: validSuggestions.length, isAlternative: true, originalTitle: song.title })
                  } else {
                    console.log(`⚠️ All alternatives for ${song.artist} were duplicates`)
                    send({ type: 'unavailable', song: { title: song.title, artist: song.artist } })
                  }
                } else {
                  console.log(`⚠️ No alternatives found for ${song.artist}`)
                  send({ type: 'unavailable', song: { title: song.title, artist: song.artist } })
                }
              }

              // Small delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 150))
            }

            // If we don't have enough, ask AI for more suggestions
            if (validSuggestions.length < count && iteration < maxIterations && !isAborted) {
              const needed = count - validSuggestions.length
              console.log(`[Generate Playlist] Need ${needed} more songs, asking AI for more... (Current: ${validSuggestions.length}/${count})`)
              send({ type: 'status', message: `Need ${needed} more songs, asking AI... (${validSuggestions.length}/${count} found)` })

              // Build feedback message about unavailable songs
              const unavailableFeedback = unavailableSongs.length > 0 
                ? `\n\nIMPORTANT: The following songs were NOT found on Spotify and need alternatives:
${unavailableSongs.map(s => `- "${s.title}" by ${s.artist}`).join('\n')}

For each unavailable song above, suggest a DIFFERENT track by the SAME artist that IS available on Spotify.`
                : ''

              // Build feedback about alternatives that were used
              const alternativesFeedback = Object.keys(artistAlternatives).length > 0
                ? `\n\nNote: Some tracks were replaced with alternatives from the same artist:
${Object.entries(artistAlternatives).map(([artist, alts]) => 
  alts.map(alt => `- "${alt.requested}" → "${alt.found}" by ${artist}`).join('\n')
).join('\n')}`
                : ''

              const additionalRequest = {
                model: 'llama-3.1-8b-instant',
                messages: [
                  {
                    role: 'system',
                    content: systemPrompt
                  },
                  {
                    role: 'user',
                    content: `Create ${needed} more obscure songs for this playlist: ${prompt}${genre ? ` Genre: ${genre}` : ''}${mood ? ` Mood: ${mood}` : ''}${era ? ` Era: ${era}` : ''}. 

CRITICAL - DO NOT REPEAT:
- Do NOT repeat any of these songs that were already suggested: ${allSuggestions.map(s => `"${s.title}" by ${s.artist}`).join(', ')}
- Do NOT repeat any of these songs that are already in the playlist: ${validSuggestions.map(s => `"${s.title}" by ${s.artist}`).join(', ')}
- Each song must be unique (different title AND/OR different artist)

${unavailableFeedback}${alternativesFeedback}`
                  }
                ],
                temperature: 0.7,
                max_tokens: 2000,
                response_format: { type: 'json_object' }
              }

              const additionalResponse = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${GROQ_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(additionalRequest)
              })

              if (additionalResponse.ok) {
                const additionalData = await additionalResponse.json()
                const additionalContent = additionalData.choices?.[0]?.message?.content
                try {
                  const additionalParsed = typeof additionalContent === 'string' ? JSON.parse(additionalContent) : additionalContent
                  const newSuggestions = Array.isArray(additionalParsed?.suggestions) ? additionalParsed.suggestions : []
                  allSuggestions = [...allSuggestions, ...newSuggestions]
                  console.log(`[Generate Playlist] AI provided ${newSuggestions.length} additional suggestions`)
                } catch (parseErr) {
                  console.error('Failed to parse additional AI suggestions:', parseErr)
                  console.error('Raw content:', additionalContent)
                  // Don't break - continue with what we have
                  send({ type: 'status', message: `Warning: Could not parse additional suggestions, continuing with ${validSuggestions.length} songs...` })
                  // Break only if we have no valid suggestions at all
                  if (validSuggestions.length === 0) {
                    break
                  }
                }
              } else {
                const errorText = await additionalResponse.text().catch(() => 'Unknown error')
                console.warn('Failed to get additional suggestions from AI:', additionalResponse.status, errorText)
                // Don't break - continue with what we have
                send({ type: 'status', message: `Warning: Could not get additional suggestions, continuing with ${validSuggestions.length} songs...` })
                // Break only if we have no valid suggestions at all
                if (validSuggestions.length === 0) {
                  break
                }
              }
            }
          }

          // Always send complete event, even if we didn't reach the full count
          if (!isAborted) {
            console.log(`[Generate Playlist] Final result: ${validSuggestions.length} valid songs out of ${count} requested (iterations: ${iteration}/${maxIterations})`)
            send({ type: 'complete', suggestions: validSuggestions.slice(0, count), totalChecked: allSuggestions.length, validCount: validSuggestions.length, requestedCount: count })
          } else {
            console.log('[Generate Playlist] Stream aborted, closing connection')
            // Send partial results even if aborted
            if (validSuggestions.length > 0) {
              send({ type: 'complete', suggestions: validSuggestions, totalChecked: allSuggestions.length, validCount: validSuggestions.length, requestedCount: count, aborted: true })
            }
          }
          
          // Log if we didn't reach the target count
          if (validSuggestions.length < count && !isAborted) {
            console.warn(`[Generate Playlist] WARNING: Only found ${validSuggestions.length} out of ${count} requested songs. This may be due to:`)
            console.warn(`  - Songs not available on Spotify`)
            console.warn(`  - Rate limiting from Spotify API`)
            console.warn(`  - AI not generating enough unique suggestions`)
            console.warn(`  - Iteration limit reached (${iteration}/${maxIterations})`)
          }
        } catch (error) {
          console.error('[Generate Playlist] Error in streaming generation:', error)
          console.error('[Generate Playlist] Error stack:', error.stack)
          if (!isAborted) {
            // Send partial results if we have any, before sending error
            if (validSuggestions.length > 0) {
              send({ type: 'complete', suggestions: validSuggestions, totalChecked: allSuggestions.length, validCount: validSuggestions.length, requestedCount: count, error: error.message })
            } else {
              send({ type: 'error', error: error.message || 'Internal server error' })
            }
          }
        } finally {
          try {
            controller.close()
          } catch (err) {
            // Controller may already be closed if client disconnected
            console.log('[Generate Playlist] Controller already closed')
          }
        }
      },
      cancel() {
        // Called when the client cancels the stream
        console.log('[Generate Playlist] Stream cancelled by client')
        isAborted = true
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error in generate-playlist:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}