'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { openingMovesData } from './openingMovesData'
import BackgammonBoard from './components/BackgammonBoard'
import { applyMove } from './utils/moveApplier'

// Component to display a single die with pips
function Die({ value }) {
  const getPipPositions = (val) => {
    const positions = {
      1: ['center'],
      2: ['top-left', 'bottom-right'],
      3: ['top-left', 'center', 'bottom-right'],
      4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
      6: ['top-left', 'middle-left', 'bottom-left', 'top-right', 'middle-right', 'bottom-right'],
    }
    return positions[val] || []
  }

  const pipPositions = getPipPositions(value)

  return (
    <div className="w-24 h-24 bg-white border-2 border-gray-800 rounded-lg shadow-lg flex items-center justify-center relative">
      {pipPositions.map((position, index) => (
        <div
          key={index}
          className={`absolute w-4 h-4 bg-black rounded-full ${
            position === 'center' ? 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2' :
            position === 'top-left' ? 'top-2 left-2' :
            position === 'top-right' ? 'top-2 right-2' :
            position === 'bottom-left' ? 'bottom-2 left-2' :
            position === 'bottom-right' ? 'bottom-2 right-2' :
            position === 'middle-left' ? 'top-1/2 left-2 transform -translate-y-1/2' :
            position === 'middle-right' ? 'top-1/2 right-2 transform -translate-y-1/2' :
            ''
          }`}
        />
      ))}
    </div>
  )
}

export default function OpeningMovesPage() {
  const { user } = useAuth()
  const [quizStarted, setQuizStarted] = useState(false)
  const [currentRoll, setCurrentRoll] = useState(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [selectedChoice, setSelectedChoice] = useState(null)
  const [currentChoices, setCurrentChoices] = useState([])
  
  // Starting position XGID
  const STARTING_XGID = "-b----E-C---eE---c-e----B-"
  
  // All 15 non-double opening rolls (higher number first)
  const allRolls = [
    [6, 5], [6, 4], [6, 3], [6, 2], [6, 1],
    [5, 4], [5, 3], [5, 2], [5, 1],
    [4, 3], [4, 2], [4, 1],
    [3, 2], [3, 1],
    [2, 1],
  ]

  const backgroundUrl = user?.user_metadata?.other_fun_stuff_background ||
                        user?.user_metadata?.just_for_me_background ||
                        null
  const transparency = user?.user_metadata?.other_fun_stuff_background_transparency ??
                       user?.user_metadata?.just_for_me_background_transparency ?? 90
  const screenColor = user?.user_metadata?.other_fun_stuff_background_color ??
                      user?.user_metadata?.just_for_me_background_color ?? '#f9fafb'

  // Roll two independent dice, re-roll if doubles
  const rollDice = () => {
    let die1, die2
    do {
      die1 = Math.floor(Math.random() * 6) + 1 // 1-6
      die2 = Math.floor(Math.random() * 6) + 1 // 1-6
    } while (die1 === die2) // Re-roll if doubles
    
    return [die1, die2] // Return in actual roll order
  }

  // Get roll key for lookup (highest die first)
  const getRollKey = (roll) => {
    const sorted = [...roll].sort((a, b) => b - a) // Sort descending
    return `${sorted[0]}-${sorted[1]}`
  }
  
  // Get dice string for board display (actual roll order)
  const getDiceString = (roll) => {
    return `${roll[0]}${roll[1]}`
  }

  const shuffleArray = (array) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const getChoicesForRoll = (roll) => {
    const rollKey = getRollKey(roll)
    const moves = openingMovesData[rollKey] || []
    
    if (moves.length === 0) return []
    
    const choices = moves.map(m => ({
      move: m.move,
      isCorrect: m.rank === 1,
      rank: m.rank
    }))
    
    return shuffleArray(choices)
  }

  const handleStartQuiz = () => {
    const roll = rollDice()
    setQuizStarted(true)
    setCurrentRoll(roll)
    setCurrentChoices(getChoicesForRoll(roll))
    setShowAnswer(false)
    setSelectedChoice(null)
  }

  const handleShowAnswer = () => {
    setShowAnswer(true)
  }

  const handleNext = () => {
    const roll = rollDice()
    setCurrentRoll(roll)
    setCurrentChoices(getChoicesForRoll(roll))
    setShowAnswer(false)
    setSelectedChoice(null)
  }

  const handleFinish = () => {
    setQuizStarted(false)
    setCurrentRoll(null)
    setShowAnswer(false)
  }

  const getImagePath = (roll) => {
    // Sort roll so higher die comes first for image filename
    const sorted = [...roll].sort((a, b) => b - a)
    const [higher, lower] = sorted
    return `/backgammon/openings/open-${higher}-${lower}.png`
  }

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
        <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 ${quizStarted ? 'pt-[5px] pb-8' : 'py-8'}`}>
          {!quizStarted && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-1 mb-8">
              <div className="border border-black dark:border-yellow-800 rounded-lg p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-amber-600 flex items-center justify-center shadow-lg">
                    <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent dark:from-amber-400 dark:to-orange-400">
                    Opening Moves
                  </h1>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  Learn about backgammon opening moves
                </p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-8">
            {!quizStarted ? (
              <div className="space-y-6">
                <div className="prose dark:prose-invert max-w-none">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                    Test Your Knowledge of Backgammon Opening Moves
                  </h2>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    In backgammon, the opening move is crucial and depends on your initial roll of the dice. 
                    There are 15 unique opening rolls possible (when considering that 6-5 is the same as 5-6, etc.), 
                    and each has an optimal move that experienced players use.
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    This quiz will test your knowledge of the 15 opening moves. You&apos;ll be presented with 
                    each opening roll and asked to identify the best move. Whether you&apos;re a beginner looking 
                    to learn the fundamentals or an experienced player wanting to refresh your knowledge, this 
                    quiz will help you master the opening phase of the game.
                  </p>
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mt-6">
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      <strong className="text-amber-700 dark:text-amber-300">Note:</strong> Each question will show you the dice roll, 
                      and you&apos;ll need to select the best opening move.
                    </p>
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
                  <button
                    onClick={handleStartQuiz}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg shadow-lg hover:from-amber-600 hover:to-orange-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                  >
                    Start Quiz
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {currentRoll && (
                  <>
                    {/* Choices */}
                    {currentChoices.length > 0 && (
                      <div className="space-y-3 mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center">
                          {showAnswer ? 'Your selection and the correct answer:' : 'Select the best opening move:'}
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          {currentChoices.map((choice, index) => {
                            const isSelected = selectedChoice === index
                            const isCorrect = choice.isCorrect
                            const showCorrect = showAnswer && isCorrect
                            
                            return (
                              <div
                                key={index}
                                className={`p-4 text-left rounded-lg border-2 transition-all ${
                                  showCorrect
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                    : isSelected
                                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700'
                                } ${!showAnswer ? 'cursor-pointer hover:border-amber-400' : ''}`}
                                onClick={!showAnswer ? () => setSelectedChoice(index) : undefined}
                                role={!showAnswer ? 'button' : undefined}
                                tabIndex={!showAnswer ? 0 : undefined}
                                onKeyDown={!showAnswer ? (e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    setSelectedChoice(index)
                                  }
                                } : undefined}
                              >
                                <span className="font-mono text-gray-900 dark:text-white">
                                  {choice.move}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Starting Position Board */}
                    {!showAnswer && currentRoll && (
                      <div className="flex justify-center mb-6">
                        <div className="rounded-lg shadow-lg overflow-hidden">
                          <BackgammonBoard 
                            direction={0} 
                            player={0} 
                            boardLabels={false} 
                            pointNumbers={true}
                            useCube={false}
                            xgid={STARTING_XGID}
                            dice={getDiceString(currentRoll)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Show Answer Button */}
                    {!showAnswer && (
                      <div className="text-center">
                        <button
                          onClick={handleShowAnswer}
                          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg shadow-lg hover:from-amber-600 hover:to-orange-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                        >
                          Show Answer
                        </button>
                      </div>
                    )}

                    {/* Answer Board */}
                    {showAnswer && currentRoll && (() => {
                      // Find the correct move
                      const correctChoice = currentChoices.find(c => c.isCorrect)
                      const answerXGID = correctChoice 
                        ? applyMove(STARTING_XGID, correctChoice.move)
                        : STARTING_XGID
                      
                      return (
                        <div className="space-y-6">
                          <div className="flex justify-center">
                            <div className="rounded-lg shadow-lg overflow-hidden">
                              <BackgammonBoard 
                                direction={0} 
                                player={0} 
                                boardLabels={false} 
                                pointNumbers={true}
                                useCube={false}
                                xgid={answerXGID}
                                dice={getDiceString(currentRoll)}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                    
                    {/* Next and Finish Buttons */}
                    {showAnswer && (
                      <div className="flex justify-center gap-4">
                        <button
                          onClick={handleNext}
                          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                          Next
                        </button>
                        <button
                          onClick={handleFinish}
                          className="px-6 py-3 bg-gray-500 text-white font-semibold rounded-lg shadow-lg hover:bg-gray-600 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        >
                          Finish
                        </button>
                      </div>
                    )}

                    {/* Back Button (when not showing answer) */}
                    {!showAnswer && (
                      <div className="flex justify-center pt-4 border-t border-gray-200 dark:border-gray-700">
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
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

