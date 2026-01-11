'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import BackgammonBoard from '../opening-moves/components/BackgammonBoard'

export default function BoardEditorPage() {
  const { user } = useAuth()
  
  // Starting position XGID (xg1: checker positions, xg2: cubeValue, xg3: cubeOwner, xg4: player, xg5: dice, xg6-xg10: match play values)
  const STARTING_XGID = "-b----E-C---eE---c-e----B-:0:0:1:00:0:0:0:0:10"
  
  const [currentPlayer, setCurrentPlayer] = useState(1) // Track current player: -1 = black, 1 = white
  const [boardXGID, setBoardXGID] = useState(STARTING_XGID) // Track board state
  const [editingMode, setEditingMode] = useState('free') // 'free' or 'play'
  const [xgidInputValue, setXgidInputValue] = useState(STARTING_XGID) // Current input value
  const [xgidError, setXgidError] = useState(null) // Validation error message

  // AI analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [aiDebug, setAiDebug] = useState(null) // Debug/trace information
  const [aiDifficulty, setAiDifficulty] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('backgammonAiDifficulty') || 'intermediate'
    }
    return 'intermediate'
  })

  // Get AI move analysis
  const handleAiAnalysis = async () => {
    if (editingMode !== 'play') return

    setIsAnalyzing(true)
    setAiAnalysis(null)
    setAiDebug(null)

    try {
      const response = await fetch('/api/backgammon-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          xgid: boardXGID,
          player: currentPlayer,
          difficulty: aiDifficulty,
          maxMoves: 5,
          debug: true // Request debug information
        })
      })

      const result = await response.json()

      if (result.debug) {
        setAiDebug(result.debug)
      }

      setAiAnalysis(result)
    } catch (error) {
      console.error('AI analysis failed:', error)
      setAiAnalysis({
        move: null,
        reasoning: 'AI analysis failed due to technical error',
        confidence: 0,
        source: 'error'
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Clear AI analysis
  const handleClearAiAnalysis = () => {
    setAiAnalysis(null)
    setAiDebug(null)
  }

  // Handle AI difficulty changes
  const handleAiDifficultyChange = (difficulty) => {
    setAiDifficulty(difficulty)
  }

  // Sync input value when boardXGID changes externally
  useEffect(() => {
    console.log('boardXGID changed to:', boardXGID, 'updating xgidInputValue')
    setXgidInputValue(boardXGID)
    setXgidError(null)
  }, [boardXGID])

  // Save AI difficulty to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('backgammonAiDifficulty', aiDifficulty)
    }
  }, [aiDifficulty])

  // Validate XGID string components
  const validateXGID = (xgid) => {
    const parts = xgid.split(':')

    // xg1: 26 chars, each must be '-', 'a-o', or 'A-O'
    if (parts[0]?.length !== 26 || !/^[-a-oA-O]{26}$/.test(parts[0])) {
      return { valid: false, error: 'xg1 must be exactly 26 characters (a-o, A-O, or -)' }
    }

    // xg2: 0-6
    if (parts[1] && (!/^[0-6]$/.test(parts[1]))) {
      return { valid: false, error: 'xg2 (cubeValue) must be 0-6' }
    }

    // xg3: -1, 0, or 1
    if (parts[2] && !/^-?[01]$/.test(parts[2])) {
      return { valid: false, error: 'xg3 (cubeOwner) must be -1, 0, or 1' }
    }

    // xg4: -1 or 1
    if (parts[3] && !/^-?1$/.test(parts[3])) {
      return { valid: false, error: 'xg4 (player) must be -1 or 1' }
    }

    // xg5: 00-66 (two digits)
    if (parts[4] && !/^[0-6]{2}$/.test(parts[4])) {
      return { valid: false, error: 'xg5 (dice) must be two digits (00-66)' }
    }

    return { valid: true, error: null }
  }

  // Handle XGID input changes
  const handleXgidInputChange = (value) => {
    setXgidInputValue(value)
    setXgidError(null) // Clear error on input change
  }

  // Apply XGID if valid
  const applyXgid = () => {
    const validation = validateXGID(xgidInputValue)
    if (validation.valid) {
      setBoardXGID(xgidInputValue)
      setXgidError(null)
    } else {
      setXgidError(validation.error)
    }
  }

  // Handle paste icon click
  const handlePasteClick = async () => {
    try {
      const text = await navigator.clipboard.readText()
      handleXgidInputChange(text)
    } catch (err) {
      // Fallback: focus the input for manual paste
      const input = document.getElementById('xgid-input')
      if (input) input.focus()
    }
  }

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

              {/* Editing Mode Toggle and Start Button */}
              <div className="flex justify-center mb-4">
                <div className="inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 p-1 shadow-sm gap-1">
                  <button
                    onClick={() => setEditingMode('free')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      editingMode === 'free'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    EDIT
                  </button>
                  <button
                    onClick={() => setEditingMode('play')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      editingMode === 'play'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    PLAY
                  </button>
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                  <button
                    onClick={() => setBoardXGID(STARTING_XGID)}
                    className="px-4 py-2 rounded-md text-sm font-medium transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    Start
                  </button>
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                  <button
                    onClick={handleAiAnalysis}
                    disabled={isAnalyzing || editingMode !== 'play'}
                    className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        🤖 Get AI Move
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Board Display */}
              <div className="flex justify-center">
                <div className="rounded-lg shadow-lg overflow-hidden">
                  <BackgammonBoard 
                    direction={0} 
                    showBoardLabels={false} 
                    showPointNumbers={true}
                    useCube={true}
                    xgid={boardXGID}
                    ghostCheckers={{}}
                    ghostCheckerPositions={{}}
                    ghostCheckerOwners={{}}
                    moves={[]}
                    dice="00"
                    showTrays={true}
                    onPlayerChange={setCurrentPlayer}
                    showOptions={true}
                    isEditable={true}
                    editingMode={editingMode}
                    onChange={setBoardXGID}
                    aiAnalysis={aiAnalysis}
                    aiDebug={aiDebug}
                    aiDifficulty={aiDifficulty}
                    onAiDifficultyChange={handleAiDifficultyChange}
                    onAiAnalysis={handleAiAnalysis}
                    onClearAiAnalysis={handleClearAiAnalysis}
                  />
                </div>
              </div>
              
              {/* XGID Input */}
              <div className="mt-4 p-4 bg-gray-100 dark:bg-slate-700 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  XGID:
                </label>
                <div className="flex gap-2">
                  <input
                    id="xgid-input"
                    type="text"
                    value={xgidInputValue}
                    onChange={(e) => handleXgidInputChange(e.target.value)}
                    onBlur={applyXgid}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        applyXgid()
                      }
                    }}
                    className="flex-1 px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900 dark:text-white"
                    placeholder="Enter XGID string..."
                  />
                  <button
                    onClick={handlePasteClick}
                    className="px-3 py-2 bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 rounded-md transition-colors"
                    title="Paste from clipboard"
                  >
                    <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </button>
                </div>
                {xgidError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {xgidError}
                  </p>
                )}
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

