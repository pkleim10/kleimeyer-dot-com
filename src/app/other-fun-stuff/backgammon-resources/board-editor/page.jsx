'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import BackgammonBoard from '../opening-moves/components/BackgammonBoard'

export default function BoardEditorPage() {
  const { user } = useAuth()
  
  // Starting position XGID (xg1: checker positions, xg2: cubeValue, xg3: cubeOwner, xg4: player, xg5: dice, xg6-xg10: match play values)
  const STARTING_XGID = "-b----E-C---eE---c-e----B-:0:0:1:00:0:0:0:0:10"
  
  const [currentPlayer, setCurrentPlayer] = useState(1) // Track current player: -1 = black, 1 = white
  
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
        <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-[5px] pb-8`}>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-1 mb-8">
            <div className="border border-black dark:border-yellow-800 rounded-lg p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-amber-600 flex items-center justify-center shadow-lg">
                  <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent dark:from-amber-400 dark:to-orange-400">
                  Board Editor
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Edit and configure backgammon board settings
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-8">
            <div className="space-y-6">
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Use the options icon in the upper right corner of the board to configure board settings 
                  such as player perspective, direction, cube settings, dice, and more.
                </p>
              </div>

              {/* Board Display */}
              <div className="flex justify-center">
                <div className="rounded-lg shadow-lg overflow-hidden">
                  <BackgammonBoard 
                    direction={0} 
                    showBoardLabels={true} 
                    showPointNumbers={true}
                    useCube={true}
                    xgid={STARTING_XGID}
                    ghostCheckers={{}}
                    ghostCheckerPositions={{}}
                    ghostCheckerOwners={{}}
                    moves={[]}
                    dice="00"
                    showTrays={true}
                    onPlayerChange={setCurrentPlayer}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                <Link
                  href="/other-fun-stuff/backgammon-resources"
                  className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-300"
                >
                  <svg className="mr-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Backgammon Resources
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

