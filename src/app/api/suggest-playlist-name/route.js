import { NextResponse } from 'next/server'

// POST - Suggest a creative playlist name using AI
export async function POST(request) {
  try {
    const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
    const GROQ_API_KEY = process.env.GROQ_API_KEY

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: 'Server configuration error (missing GROQ_API_KEY)' }, { status: 500 })
    }

    const body = await request.json()
    const { prompt } = body

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const systemPrompt = `You are a creative music playlist naming expert. Given a user's description of what kind of playlist they want, suggest a catchy, creative, and memorable playlist name.

Guidelines:
- Keep the name between 3-8 words
- Make it catchy and memorable
- Reflect the mood, genre, or theme of the playlist
- Avoid generic names like "My Playlist" or "Playlist 1"
- Be creative but not overly long
- Return ONLY the playlist name, nothing else
- Do not include quotes around the name
- Do not include any explanation or additional text`

    const requestBody = {
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Suggest a creative playlist name for: ${prompt}`
        }
      ],
      temperature: 0.8,
      max_tokens: 50
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
          error: 'Failed to generate playlist name',
          groqStatus: groqResponse.status,
          groqError: errorData
        },
        { status: 502 }
      )
    }

    const groqData = await groqResponse.json()
    const content = groqData.choices?.[0]?.message?.content?.trim() || ''

    // Clean up the response - remove quotes if present, trim whitespace
    let playlistName = content.replace(/^["']|["']$/g, '').trim()

    // Fallback if empty
    if (!playlistName) {
      playlistName = 'AI Generated Playlist'
    }

    return NextResponse.json({ name: playlistName })
  } catch (error) {
    console.error('Error suggesting playlist name:', error)
    return NextResponse.json(
      { error: 'Failed to suggest playlist name' },
      { status: 500 }
    )
  }
}

