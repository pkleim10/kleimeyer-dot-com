import { NextResponse } from 'next/server'

// POST - Generate playlist suggestions using AI (Grok or Groq)
export async function POST(request) {
  try {
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
    const { prompt, genre, mood, era, count = 20, obscurityLevel = 50, unavailableSongs = [], existingSuggestions = [], existingValidTracks = [] } = body

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
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
    
    let aiResponse = null
    let errorData = null
    let lastModel = null

    // Build feedback message about unavailable songs (if this is a follow-up request)
    const unavailableFeedback = unavailableSongs.length > 0 
      ? `\n\nIMPORTANT: The following songs were NOT found on Spotify and need alternatives:
${unavailableSongs.map(s => `- "${s.title}" by ${s.artist}`).join('\n')}

For each unavailable song above, suggest a DIFFERENT track by the SAME artist that IS available on Spotify.`
      : ''

    // Build feedback about existing suggestions to avoid duplicates
    const existingFeedback = existingSuggestions.length > 0 || existingValidTracks.length > 0
      ? `\n\nCRITICAL - DO NOT REPEAT:
- Do NOT repeat any of these songs that were already suggested: ${existingSuggestions.map(s => `"${s.title}" by ${s.artist}`).join(', ')}
- Do NOT repeat any of these songs that are already in the playlist: ${existingValidTracks.map(s => `"${s.title}" by ${s.artist}`).join(', ')}
- Each song must be unique (different title AND/OR different artist)`
      : ''

    // Determine if this is an initial request or a follow-up
    const isFollowUp = unavailableSongs.length > 0 || existingSuggestions.length > 0 || existingValidTracks.length > 0
    const neededCount = isFollowUp ? count : count
    
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
            content: `${isFollowUp ? `Create ${neededCount} more songs` : `Create EXACTLY ${count} songs`} for this playlist: ${prompt}${genre ? ` Genre: ${genre}` : ''}${mood ? ` Mood: ${mood}` : ''}${era ? ` Era: ${era}` : ''}

⚠️ CRITICAL REQUIREMENTS:
1. ${isFollowUp ? `You MUST return EXACTLY ${neededCount} songs` : `You MUST return EXACTLY ${count} songs - no more, no less. Return exactly ${count} items in the suggestions array.`}
2. ONLY suggest REAL songs that ACTUALLY EXIST - never make up, invent, or combine song titles
3. NEVER mix album names with song titles (e.g., "The Dark Side of the Moog" is NOT a real song)
4. Only suggest songs you are CERTAIN are available on Spotify
5. If you are unsure about a track's availability or existence, suggest a different REAL track by the same artist that you know exists and is on Spotify
6. Do not suggest rare or obscure tracks unless you are confident they are REAL and exist on Spotify

${unavailableFeedback}${existingFeedback}

IMPORTANT: Your response must contain exactly ${isFollowUp ? neededCount : count} songs in the suggestions array.`
          }
        ],
        temperature: 0.7,
        max_tokens: 4000, // Increased to ensure we get all requested songs
        // Ask AI to return strict JSON
        response_format: { type: 'json_object' }
      }

      aiResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (aiResponse.ok) {
        console.log(`[Generate Suggestions] Successfully using ${useXAI ? 'xAI Grok' : 'Groq'} model: ${model}`)
        break
      } else {
        errorData = await aiResponse.json().catch(() => ({}))
        console.warn(`[Generate Suggestions] Model ${model} failed:`, {
          status: aiResponse.status,
          error: errorData
        })
        // Continue to next model
        aiResponse = null
      }
    }

    if (!aiResponse || !aiResponse.ok) {
      console.error(`${useXAI ? 'xAI' : 'Groq'} API error (all models failed):`, {
        lastModel: lastModel,
        status: aiResponse?.status,
        statusText: aiResponse?.statusText,
        error: errorData
      })
      return NextResponse.json(
        {
          error: `Failed to generate playlist suggestions from ${useXAI ? 'xAI Grok' : 'Groq'}`,
          apiStatus: aiResponse?.status,
          apiError: errorData,
          message: errorData?.error?.message || `All models failed. Last tried: ${lastModel}`
        },
        { status: 502 }
      )
    }

    const aiData = await aiResponse.json()
    const content = aiData.choices?.[0]?.message?.content
    // With response_format: 'json_object', content should be a JSON string
    let parsed
    try {
      parsed = typeof content === 'string' ? JSON.parse(content) : content
    } catch (parseError) {
      console.error('Failed to parse AI JSON response:', parseError, 'Raw content:', content)
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      )
    }

    const suggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : []
    console.log(`[Generate Suggestions] AI response: ${suggestions.length} suggestions received (requested ${isFollowUp ? neededCount : count})`)
    
    // If AI returned fewer than requested, log a warning
    if (suggestions.length < (isFollowUp ? neededCount : count)) {
      console.warn(`[Generate Suggestions] WARNING: AI only returned ${suggestions.length} suggestions but ${isFollowUp ? neededCount : count} were requested.`)
    }

    return NextResponse.json({
      suggestions,
      model: lastModel
    })
  } catch (error) {
    console.error('Error in generate-playlist-suggestions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

