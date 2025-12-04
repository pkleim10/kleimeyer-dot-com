// Static HTML route for Spotify OAuth popup - completely bypasses Next.js React
// This prevents any Supabase initialization that could interfere with the main window's session
export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Spotify Authorization</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f9fafb;
      color: #111827;
    }
    .container {
      text-align: center;
    }
    .spinner {
      border: 3px solid #f3f4f6;
      border-top: 3px solid #10b981;
      border-radius: 50%;
      width: 48px;
      height: 48px;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    h2 {
      margin: 0 0 8px;
      font-size: 20px;
      font-weight: 600;
    }
    p {
      margin: 0;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h2>Connecting to Spotify...</h2>
    <p>Redirecting you back to the application...</p>
  </div>

  <script>
    (function() {
      console.log('[SpotifyRedirect] Static HTML page loaded, full URL:', window.location.href);
      console.log('[SpotifyRedirect] Hash:', window.location.hash);
      console.log('[SpotifyRedirect] Search:', window.location.search);
      
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const state = searchParams.get('state');
      const accessTokenFromQuery = searchParams.get('access_token');
      const refreshTokenFromQuery = searchParams.get('refresh_token');
      
      const targetOrigin = state ? decodeURIComponent(state) : window.location.origin;
      
      if (error) {
        console.error('[SpotifyRedirect] Spotify OAuth error:', error);
        if (window.opener) {
          console.log('[SpotifyRedirect] Sending error to opener window via postMessage');
          window.opener.postMessage({ type: 'SPOTIFY_AUTH_ERROR', error: error }, targetOrigin);
          window.close();
          return;
        }
      }
      
      // Authorization Code Flow Step 1: exchange code for tokens via API
      if (code) {
        console.log('[SpotifyRedirect] Authorization code received, exchanging for tokens via API');
        
        fetch(window.location.origin + '/api/spotify/callback?code=' + encodeURIComponent(code) + (state ? '&state=' + encodeURIComponent(state) : ''), {
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        })
          .then(function(response) {
            if (response.ok) {
              return response.json().then(function(tokenData) {
                if (window.opener) {
                  console.log('[SpotifyRedirect] Sending tokens to opener window via postMessage');
                  window.opener.postMessage({ type: 'SPOTIFY_AUTH_SUCCESS', payload: tokenData }, targetOrigin);
                  window.close();
                }
              });
            } else {
              return response.json().then(function(errorData) {
                console.error('[SpotifyRedirect] Token exchange failed:', errorData);
                if (window.opener) {
                  window.opener.postMessage({ type: 'SPOTIFY_AUTH_ERROR', error: errorData.error || 'Token exchange failed' }, targetOrigin);
                  window.close();
                }
              }).catch(function() {
                if (window.opener) {
                  window.opener.postMessage({ type: 'SPOTIFY_AUTH_ERROR', error: 'Token exchange failed' }, targetOrigin);
                  window.close();
                }
              });
            }
          })
          .catch(function(error) {
            console.error('[SpotifyRedirect] Error exchanging code:', error);
            if (window.opener) {
              window.opener.postMessage({ type: 'SPOTIFY_AUTH_ERROR', error: error.message }, targetOrigin);
              window.close();
            }
          });
        return;
      }
      
      // Authorization Code Flow Step 2: tokens received from API callback
      if (accessTokenFromQuery) {
        console.log('[SpotifyRedirect] Tokens received from API callback.');
        const tokenData = {
          access_token: accessTokenFromQuery,
          refresh_token: refreshTokenFromQuery || '',
          expires_in: searchParams.get('expires_in') || '3600',
        };
        
        if (window.opener) {
          console.log('[SpotifyRedirect] Sending tokens to opener window via postMessage');
          window.opener.postMessage({ type: 'SPOTIFY_AUTH_SUCCESS', payload: tokenData }, targetOrigin);
          window.close();
          return;
        }
      }
      
      // No auth data
      console.warn('[SpotifyRedirect] No auth data found');
      if (window.opener) {
        window.close();
      }
    })();
  </script>
</body>
</html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  })
}

