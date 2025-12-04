'use client'

import { useEffect } from 'react'

export default function SpotifyRedirect() {
  useEffect(() => {
    // Check if we have OAuth data in the URL hash
    const hash = window.location.hash

    if (hash && hash.includes('access_token')) {
      // Redirect back to localhost with the auth data
      const localhostUrl = `http://localhost:3000${hash}`
      console.log('Redirecting to localhost with auth data:', localhostUrl)
      window.location.href = localhostUrl
    } else {
      // No auth data, just redirect to localhost
      console.log('No auth data found, redirecting to localhost')
      window.location.href = 'http://localhost:3000'
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Connecting to Spotify...
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Redirecting you back to the application...
        </p>
      </div>
    </div>
  )
}
