'use client'

import { useAuth } from '@/contexts/AuthContext'
import MagicPlaylistsForm from './components/MagicPlaylistsForm'

export default function MagicPlaylistsPage() {
  const { user } = useAuth()
  // Use single background field for all Other Fun Stuff pages, with fallback to old field names for backward compatibility
  // Handle case where background might not be set
  const backgroundUrl = user?.user_metadata?.other_fun_stuff_background ||
                        user?.user_metadata?.just_for_me_background ||
                        null
  const transparency = user?.user_metadata?.other_fun_stuff_background_transparency ??
                       user?.user_metadata?.just_for_me_background_transparency ?? 90
  const screenColor = user?.user_metadata?.other_fun_stuff_background_color ??
                      user?.user_metadata?.just_for_me_background_color ?? '#f9fafb'

  return (
    <div
      className="relative min-h-screen"
      style={backgroundUrl ? {
        backgroundImage: `url(${backgroundUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      } : {
        backgroundColor: '#f9fafb'
      }}
    >
      {/* Overlay for readability */}
      {backgroundUrl && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: screenColor,
            opacity: transparency / 100
          }}
        />
      )}
      <div className="relative z-10 min-h-screen bg-gray-50 dark:bg-slate-900 bg-opacity-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 via-pink-600 to-purple-600 flex items-center justify-center shadow-lg">
              <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-pink-400">
              Magic Playlists
            </h1>
          </div>

          <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
            Use AI to create custom playlists in Spotify. Describe your mood, activity, or music style, and we'll generate the perfect playlist for you.
          </p>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-8">
            <MagicPlaylistsForm />
          </div>
        </div>
      </div>
    </div>
  )
}

