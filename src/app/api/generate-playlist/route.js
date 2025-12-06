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

    // Support both Groq and xAI Grok APIs
    // Try xAI Grok first if available (better for factual knowledge), fallback to Groq
    const XAI_API_KEY = process.env.XAI_API_KEY
    const GROQ_API_KEY = process.env.GROQ_API_KEY
    
    const useXAI = !!XAI_API_KEY // Prefer xAI Grok if API key is available
    
    const API_URL = useXAI 
      ? 'https://api.x.ai/v1/chat/completions'
      : 'https://api.groq.com/openai/v1/chat/completions'
    
    const API_KEY = useXAI ? XAI_API_KEY : GROQ_API_KEY

    if (!API_KEY) {
      return NextResponse.json({ 
        error: `Server configuration error (missing ${useXAI ? 'XAI_API_KEY' : 'GROQ_API_KEY'})` 
      }, { status: 500 })
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
      // Removed overly broad searches: track-only, title-only, artist-only
      // These return too many results and lead to false matches

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
            // Helper function for fuzzy matching (similar to frontend)
            const isSimilar = (str1, str2, threshold = 0.7) => {
              const normalize = (str) => str.toLowerCase().trim().replace(/[^\w\s]/g, '')
              const norm1 = normalize(str1)
              const norm2 = normalize(str2)
              if (norm1 === norm2) return true
              
              // Check if one contains the other (but only if they're reasonably similar in length)
              // This handles cases like "Song Title" vs "Song Title (Remastered)"
              if (norm1.includes(norm2) || norm2.includes(norm1)) {
                const lengthRatio = Math.min(norm1.length, norm2.length) / Math.max(norm1.length, norm2.length)
                // Only accept if the shorter is at least 70% of the longer (prevents "a" matching "a simple bunny girl")
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
              
              // Log for debugging
              console.log(`   🔍 Fuzzy match check: "${str1}" vs "${str2}"`)
              console.log(`      Words1: [${words1.join(', ')}] (${words1.length} words)`)
              console.log(`      Words2: [${words2.join(', ')}] (${words2.length} words)`)
              console.log(`      Matching words: ${matchingWords}, Similarity: ${similarity.toFixed(2)} (threshold: ${threshold})`)
              
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

⚠️ CRITICAL REQUIREMENTS - READ CAREFULLY ⚠️

1. ONLY SUGGEST REAL SONGS THAT ACTUALLY EXIST:
   - You MUST only suggest songs that are REAL and ACTUALLY EXIST
   - NEVER make up, invent, or combine song titles
   - NEVER mix album names with song titles (e.g., "The Dark Side of the Moog" is NOT a real song)
   - NEVER create fictional song titles or combine words to make up titles
   - If you are not 100% certain a song exists, DO NOT suggest it
   - Only suggest songs you KNOW are real from your training data

2. SPOTIFY AVAILABILITY:
   - ONLY suggest songs that you are CERTAIN exist on Spotify
   - If you are unsure whether a song is on Spotify, DO NOT suggest it
   - Prefer well-known tracks that are definitely available on Spotify
   - If suggesting obscure tracks, only suggest ones you are confident are on Spotify
   - When in doubt, suggest a more popular track by the same artist that you know is on Spotify
   - NEVER suggest songs that might not be on Spotify - this will cause the playlist generation to fail

3. ACCURACY REQUIREMENTS:
   - Use the EXACT song title as it appears on the actual recording
   - Use the EXACT artist name as it appears on Spotify
   - Do NOT modify, combine, or invent song titles
   - Do NOT mix album names with song titles
   - If you cannot find a suitable REAL track, suggest a different REAL artist or REAL track

IMPORTANT: 
- If a specific track by an artist is not available on Spotify, suggest a DIFFERENT REAL track by the SAME artist that is available on Spotify.
- NEVER repeat the same song (same title + same artist) in your suggestions.
- If you cannot find a suitable REAL track that you are CERTAIN is on Spotify, suggest a different REAL artist or REAL track.

Given a user's request, suggest songs that match their description.
Return ONLY a valid JSON object with this exact structure and nothing else:
{
  "suggestions": [
    {"title": "Song Title", "artist": "Artist Name", "year": 2020, "reason": "Why this fits the request"}
  ]
}
Do not include any markdown or code fences.`

    // Call AI API (xAI Grok or Groq)
    // xAI Grok models (if using xAI API) - better for factual knowledge
    const xaiModels = [
      'grok-4-1-fast-non-reasoning',           
      'grok-4-fast-non-reasoning'              
    ]
    
    // Groq models (if using Groq API)
    const groqModels = [
      'llama-3.3-70b-versatile',  // Latest 70B model, best for factual accuracy
      'llama-3.1-70b-instruct',   // Previous 70B model
      'mixtral-8x7b-32768',       // Good alternative
      'gemma2-9b-it',             // Google's model, good for factual knowledge
      'llama-3.1-8b-instant'      // Fast fallback
    ]
    
    const modelsToTry = useXAI ? xaiModels : groqModels
    
    let groqResponse = null
    let errorData = null
    let lastModel = null
    
    for (const model of modelsToTry) {
      lastModel = model
      const requestBody = {
        model: model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Create a playlist of ${count} songs: ${prompt}${genre ? ` Genre: ${genre}` : ''}${mood ? ` Mood: ${mood}` : ''}${era ? ` Era: ${era}` : ''}

⚠️ CRITICAL REQUIREMENTS:
1. ONLY suggest REAL songs that ACTUALLY EXIST - never make up, invent, or combine song titles
2. NEVER mix album names with song titles (e.g., "The Dark Side of the Moog" is NOT a real song)
3. Only suggest songs you are CERTAIN are available on Spotify
4. If you are unsure about a track's availability or existence, suggest a different REAL track by the same artist that you know exists and is on Spotify
5. Do not suggest rare or obscure tracks unless you are confident they are REAL and exist on Spotify`
          }
        ],
        temperature: 0.7,
        max_tokens: 2500,
        // Ask Groq to return strict JSON
        response_format: { type: 'json_object' }
      }

      groqResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (groqResponse.ok) {
        console.log(`[Generate Playlist] Successfully using ${useXAI ? 'xAI Grok' : 'Groq'} model: ${model}`)
        break
      } else {
        errorData = await groqResponse.json().catch(() => ({}))
        console.warn(`[Generate Playlist] Model ${model} failed:`, {
          status: groqResponse.status,
          error: errorData
        })
        // Continue to next model
        groqResponse = null
      }
    }

    if (!groqResponse || !groqResponse.ok) {
      console.error(`${useXAI ? 'xAI' : 'Groq'} API error (all models failed):`, {
        lastModel: lastModel,
        status: groqResponse?.status,
        statusText: groqResponse?.statusText,
        error: errorData
      })
      return NextResponse.json(
        {
          error: `Failed to generate playlist suggestions from ${useXAI ? 'xAI Grok' : 'Groq'}`,
          apiStatus: groqResponse?.status,
          apiError: errorData,
          message: errorData?.error?.message || `All models failed. Last tried: ${lastModel}`
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

    // Store the model that worked for use in follow-up requests
    const workingModel = lastModel

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
          if (isAborted) {
            console.warn('[Generate Playlist] Attempted to send data but stream is aborted')
            return false
          }
          try {
            const chunk = encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            controller.enqueue(chunk)
            return true
          } catch (err) {
            // Client disconnected
            if (err.message?.includes('aborted') || err.name === 'AbortError' || err.message?.includes('closed')) {
              console.log('[Generate Playlist] Client disconnected or stream closed, stopping stream')
              isAborted = true
              return false
            }
            console.error('[Generate Playlist] Error sending stream data:', err)
            console.error('[Generate Playlist] Error details:', {
              name: err.name,
              message: err.message,
              stack: err.stack
            })
            isAborted = true // Mark as aborted if we can't send
            return false
          }
        }

        try {
          let allSuggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : []
          console.log(`[Generate Playlist] Initial AI response: ${allSuggestions.length} suggestions received (requested ${count})`)
          const validSuggestions = []
          const processedSuggestions = new Set() // Track which suggestions we've already processed
          const maxIterations = 5 // Limit iterations to avoid infinite loops
          let iteration = 0

          // Helper function to check if a song is a duplicate (normalized comparison)
          const isDuplicate = (song, existingSongs) => {
            const normalize = (str) => str.toLowerCase().trim()
            const songKey = `${normalize(song.title)}|${normalize(song.artist)}`
            return existingSongs.some(existing => {
              const existingKey = `${normalize(existing.title)}|${normalize(existing.artist)}`
              return existingKey === songKey
            })
          }

          // Helper to get suggestion key for tracking
          const getSuggestionKey = (song) => {
            const normalize = (str) => str.toLowerCase().trim()
            return `${normalize(song.title)}|${normalize(song.artist)}`
          }

          // Keep generating and filtering until we have enough valid songs
          while (validSuggestions.length < count && iteration < maxIterations && !isAborted) {
            iteration++
            const unprocessedSuggestions = allSuggestions.filter(s => !processedSuggestions.has(getSuggestionKey(s)))
            console.log(`[Generate Playlist] Iteration ${iteration}: ${unprocessedSuggestions.length} unprocessed suggestions (${allSuggestions.length} total), ${validSuggestions.length} valid so far (need ${count})`)
            send({ type: 'status', message: `Checking ${unprocessedSuggestions.length} suggestions...`, iteration, validCount: validSuggestions.length })

            const unavailableSongs = [] // Track songs that weren't found
            const artistAlternatives = {} // Track alternative tracks found by artist

            // Check each unprocessed suggestion against Spotify
            for (const song of unprocessedSuggestions) {
              if (validSuggestions.length >= count || isAborted) {
                console.log(`[Generate Playlist] Stopping loop: count reached (${validSuggestions.length}/${count}) or aborted (${isAborted})`)
                break
              }
              
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

              // Mark as processed immediately to avoid reprocessing
              processedSuggestions.add(getSuggestionKey(song))

              const checkingSent = send({ type: 'checking', song: { title: song.title, artist: song.artist } })
              if (!checkingSent) {
                console.error(`[Generate Playlist] Stream closed while checking "${song.title}" by ${song.artist} - continuing with remaining songs`)
                // Don't break - continue processing remaining songs even if stream is closed
                // The stream closure will be detected elsewhere
                continue
              }

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
                  console.log(`✅ Found on Spotify: "${song.title}" by ${song.artist} (${validSuggestions.length}/${count})`)
                  // Send verified song with debug info
                  const sent = send({ 
                    type: 'song', 
                    song: verifiedSong, 
                    total: validSuggestions.length,
                    debug: {
                      searched: { title: song.title, artist: song.artist },
                      matched: { 
                        title: result.track.name, 
                        artist: result.track.artists[0]?.name || song.artist,
                        id: result.track.id,
                        uri: result.track.uri
                      },
                      searchQuery: result.debug?.searchQuery || 'unknown',
                      apiResponse: result.debug?.apiResponse || null,
                      matchType: result.debug?.matchType || 'unknown'
                    }
                  })
                  if (!sent) {
                    console.error(`[Generate Playlist] Failed to send song event for "${song.title}" by ${song.artist} - stream may be closed, continuing`)
                    // Don't break - continue processing remaining songs
                    // The song is still added to validSuggestions even if we can't send it
                  }
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
                    console.log(`✅ Using alternative: "${alternative.title}" by ${alternative.artist} (instead of "${song.title}") (${validSuggestions.length}/${count})`)
                    // Send verified alternative with debug info showing original vs alternative
                    const sent = send({ 
                      type: 'song', 
                      song: verifiedSong, 
                      total: validSuggestions.length, 
                      isAlternative: true, 
                      originalTitle: song.title,
                      debug: {
                        searched: { title: song.title, artist: song.artist }, // Original AI suggestion
                        matched: { 
                          title: alternative.title, 
                          artist: alternative.artist,
                          id: alternative.id,
                          uri: alternative.uri
                        },
                        searchQuery: `artist:"${song.artist}" (alternative search)`,
                        apiResponse: null, // Alternatives don't include full API response
                        matchType: 'alternative (original not found)'
                      }
                    })
                    if (!sent) {
                      console.error(`[Generate Playlist] Failed to send alternative song event for "${alternative.title}" by ${alternative.artist} - stream may be closed, continuing`)
                      // Don't break - continue processing remaining songs
                      // The song is still added to validSuggestions even if we can't send it
                    }
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
            console.log(`[Generate Playlist] After processing: ${validSuggestions.length} valid, ${count} needed, iteration ${iteration}/${maxIterations}, aborted: ${isAborted}`)
            if (validSuggestions.length < count && iteration < maxIterations && !isAborted) {
              const needed = count - validSuggestions.length
              console.log(`[Generate Playlist] Need ${needed} more songs, asking AI for more... (Current: ${validSuggestions.length}/${count}, remaining suggestions: ${allSuggestions.length - validSuggestions.length})`)
              const statusSent = send({ type: 'status', message: `Need ${needed} more songs, asking AI... (${validSuggestions.length}/${count} found)` })
              if (!statusSent) {
                console.warn('[Generate Playlist] Stream may be closed, but continuing to request more suggestions')
                // Don't break - try to get more suggestions even if stream is closed
                // We'll send them when the stream reopens or at the end
              }

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
                model: workingModel, // Use the same model that worked initially
                messages: [
                  {
                    role: 'system',
                    content: systemPrompt
                  },
                  {
                    role: 'user',
                    content: `Create ${needed} more songs for this playlist: ${prompt}${genre ? ` Genre: ${genre}` : ''}${mood ? ` Mood: ${mood}` : ''}${era ? ` Era: ${era}` : ''}. 

⚠️ CRITICAL REQUIREMENTS:
1. ONLY suggest REAL songs that ACTUALLY EXIST - never make up, invent, or combine song titles
2. NEVER mix album names with song titles (e.g., "The Dark Side of the Moog" is NOT a real song)
3. ONLY suggest songs that you are CERTAIN exist on Spotify
4. If you are unsure, suggest a more popular REAL track by the same artist that you know exists and is on Spotify
5. Do NOT suggest rare or obscure tracks unless you are confident they are REAL and exist on Spotify

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

              const additionalResponse = await fetch(API_URL, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${API_KEY}`,
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
                  console.log(`[Generate Playlist] AI provided ${newSuggestions.length} additional suggestions (total now: ${allSuggestions.length})`)
                  // The while loop will continue automatically to process the new suggestions
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
                // Don't break - continue with what we have, but exit the while loop
                send({ type: 'status', message: `Warning: Could not get additional suggestions, continuing with ${validSuggestions.length} songs...` })
                // Break the while loop if we can't get more suggestions
                break
              }
            } else {
              console.log(`[Generate Playlist] Not requesting more: valid=${validSuggestions.length}, count=${count}, iteration=${iteration}, maxIterations=${maxIterations}, aborted=${isAborted}`)
            }
          }

          // Always send complete event, even if we didn't reach the full count
          if (!isAborted) {
            console.log(`[Generate Playlist] Final result: ${validSuggestions.length} valid songs out of ${count} requested (iterations: ${iteration}/${maxIterations})`)
            const sent = send({ type: 'complete', suggestions: validSuggestions.slice(0, count), totalChecked: allSuggestions.length, validCount: validSuggestions.length, requestedCount: count })
            if (!sent) {
              console.error('[Generate Playlist] Failed to send complete event - stream may be closed')
            }
          } else {
            console.log('[Generate Playlist] Stream aborted, closing connection')
            // Send partial results even if aborted
            if (validSuggestions.length > 0) {
              const sent = send({ type: 'complete', suggestions: validSuggestions, totalChecked: allSuggestions.length, validCount: validSuggestions.length, requestedCount: count, aborted: true })
              if (!sent) {
                console.error('[Generate Playlist] Failed to send aborted complete event - stream may be closed')
              }
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
          console.error('[Generate Playlist] Error details:', {
            name: error.name,
            message: error.message,
            validSuggestionsCount: validSuggestions.length,
            isAborted,
            iteration
          })
          if (!isAborted) {
            // Send partial results if we have any, before sending error
            if (validSuggestions.length > 0) {
              const sent = send({ type: 'complete', suggestions: validSuggestions, totalChecked: allSuggestions.length, validCount: validSuggestions.length, requestedCount: count, error: error.message })
              if (!sent) {
                console.error('[Generate Playlist] Failed to send error complete event - stream may be closed')
              }
            } else {
              const sent = send({ type: 'error', error: error.message || 'Internal server error' })
              if (!sent) {
                console.error('[Generate Playlist] Failed to send error event - stream may be closed')
              }
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