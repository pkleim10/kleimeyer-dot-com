'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function OtherFunStuffPage() {
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
    <main className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Content wrapper with background - starts below breadcrumb */}
      <div 
        className="relative min-h-[calc(100vh-200px)]"
        style={backgroundUrl ? {
          backgroundImage: `url(${backgroundUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        } : {}}
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
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-wrap justify-center gap-8">
          {/* Medication Management App */}
          <Link href="/other-fun-stuff/medication" className="group w-full max-w-sm">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
              <div className="relative h-48 bg-gradient-to-br from-blue-500 to-cyan-600">
                <img
                  src="/medication.jpeg"
                  alt="Medication Management"
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity duration-300"
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  Medication Management
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Track and manage your medications
                </p>
                <div className="mt-auto flex items-center text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-300">
                  <span className="text-sm font-medium">Get Started</span>
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          {/* Magic Playlists App */}
          <Link href="/other-fun-stuff/magic-playlists" className="group w-full max-w-sm">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
              <div className="relative h-48 bg-gradient-to-br from-purple-500 to-pink-600">
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-24 h-24 text-white opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                  Magic Playlists
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Create custom playlists with AI in Spotify
                </p>
                <div className="mt-auto flex items-center text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors duration-300">
                  <span className="text-sm font-medium">Get Started</span>
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          {/* Backgammon Resources App */}
          <Link href="/other-fun-stuff/backgammon-resources" className="group w-full max-w-sm">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
              <div className="relative h-48 bg-gradient-to-br from-amber-500 to-orange-600">
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-24 h-24 text-white opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">
                  Backgammon Resources
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Learn and practice backgammon opening moves
                </p>
                <div className="mt-auto flex items-center text-amber-600 dark:text-amber-400 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors duration-300">
                  <span className="text-sm font-medium">Get Started</span>
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

