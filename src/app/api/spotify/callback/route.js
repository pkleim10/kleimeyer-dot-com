import { NextResponse } from 'next/server'

// Exchange Spotify authorization code for access token
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 })
    }

    const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
    const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
    const REDIRECT_URI = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI

    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !REDIRECT_URI) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      console.error('[Spotify Callback] Token exchange failed:', errorData)
      return NextResponse.json({ 
        error: 'Failed to exchange authorization code',
        details: errorData 
      }, { status: tokenResponse.status })
    }

    const tokenData = await tokenResponse.json()

    // Redirect to spotify-redirect page with tokens in query params
    // The page will convert them to hash and redirect to Magic Playlists
    // The state parameter contains the origin to redirect back to
    const targetOrigin = state ? decodeURIComponent(state) : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const redirectUrl = `${targetOrigin}/spotify-redirect?` +
      new URLSearchParams({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || '',
        expires_in: tokenData.expires_in || '3600',
        state: state || ''
      }).toString()

    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('[Spotify Callback] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

