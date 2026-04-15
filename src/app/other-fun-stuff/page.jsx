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

          {/* LeaseMinder — site page: auto lease mileage & overage */}
          <Link href="/other-fun-stuff/LeaseMinder" className="group w-full max-w-sm">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
              <div className="relative h-48 bg-gradient-to-br from-indigo-600 to-sky-600">
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-24 h-24 text-white opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
                  LeaseMinder
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Save leases to your account, compare odometer to allowance, and project turn-in mileage and overage
                  cost
                </p>
                <div className="mt-auto flex items-center text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors duration-300">
                  <span className="text-sm font-medium">Open page</span>
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          {/* VideoMaster (macOS app) */}
          <Link href="/other-fun-stuff/VideoMaster" className="group w-full max-w-sm">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
              <div className="relative h-48 bg-gradient-to-br from-emerald-600 to-teal-700">
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-24 h-24 text-white opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                  VideoMaster
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Browse and organize videos on your Mac — overview, download, and full guide
                </p>
                <div className="mt-auto flex items-center text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors duration-300">
                  <span className="text-sm font-medium">Learn more</span>
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

