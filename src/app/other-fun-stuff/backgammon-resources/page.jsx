'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function BackgammonResourcesPage() {
  const { user } = useAuth()
  
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
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-8">
            <div className="mb-6">
              <Link
                href="/other-fun-stuff"
                className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-300 mb-4"
              >
                <svg className="mr-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Other Fun Stuff
              </Link>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Backgammon Resources
              </h1>
            </div>

            <div className="space-y-4">
              <Link
                href="/other-fun-stuff/backgammon-resources/opening-moves"
                className="block p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border-2 border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600 transition-all duration-300 hover:shadow-lg"
              >
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  Opening Moves Quiz
                </h2>
                <p className="text-gray-700 dark:text-gray-300">
                  Test your knowledge of backgammon opening moves. Learn the optimal moves for all 15 unique opening rolls.
                </p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

