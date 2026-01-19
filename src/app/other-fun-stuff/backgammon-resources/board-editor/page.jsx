'use client'

import { useState, useEffect } from 'react'
import { flushSync } from 'react-dom'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import BackgammonBoard from '../opening-moves/components/BackgammonBoard'
import { parseXGID } from '../opening-moves/utils/xgidParser'
import { applyMove } from '../opening-moves/utils/moveApplier'

export default function BoardEditorPage() {
  const { user } = useAuth()
  
  // Starting position XGID (xg1: checker positions, xg2: cubeValue, xg3: cubeOwner, xg4: player, xg5: dice, xg6-xg10: match play values)
  const STARTING_XGID = "-b----E-C---eE---c-e----B-:0:0:1:00:0:0:0:0:10"
  
  const [currentPlayer, setCurrentPlayer] = useState(1) // Track current player: -1 = black, 1 = white
  const [boardXGID, setBoardXGID] = useState(STARTING_XGID) // Track board state
  const [editingMode, setEditingMode] = useState('free') // 'free' or 'play'
  const [xgidInputValue, setXgidInputValue] = useState(STARTING_XGID) // Current input value
  const [xgidError, setXgidError] = useState(null) // Validation error message
  const [usedDice, setUsedDice] = useState([]) // Track dice that have been used in the current turn

  // Ghost checkers and arrows for suggested move
  const [suggestedGhostCheckers, setSuggestedGhostCheckers] = useState({})
  const [suggestedGhostCheckerPositions, setSuggestedGhostCheckerPositions] = useState({})
  const [suggestedGhostCheckerOwners, setSuggestedGhostCheckerOwners] = useState({})
  const [suggestedMoves, setSuggestedMoves] = useState([])
  const [showGhosts, setShowGhosts] = useState(false) // Track if ghosts should be displayed
  const [suggestedMoveXGID, setSuggestedMoveXGID] = useState(null) // Final XGID after applying suggested move
  // Store ghost data when clearing so we can restore it
  const [savedGhostData, setSavedGhostData] = useState(null)

  // Engine analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [engineAnalysis, setEngineAnalysis] = useState(null)
  const [engineDebug, setEngineDebug] = useState(null) // Debug/trace information
  const [engineDifficulty, setEngineDifficulty] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('backgammonEngineDifficulty') || 'intermediate'
    }
    return 'intermediate'
  })

  // Get engine move analysis
  const handleEngineAnalysis = async () => {
    if (editingMode !== 'play') return

    setIsAnalyzing(true)
    setEngineAnalysis(null)
    setEngineDebug(null)

    try {
      // Parse XGID to get the actual current player from the board state
      const boardState = parseXGID(boardXGID)
      const actualPlayer = boardState.player !== undefined ? boardState.player : currentPlayer
      
      const response = await fetch('/api/backgammon-engine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          xgid: boardXGID,
          player: actualPlayer, // Use actual player from XGID, not state variable
          difficulty: engineDifficulty,
          maxMoves: 5,
          debug: true, // Request debug information
          usedDice: usedDice // Pass used dice so API knows which dice are still available
        })
      })

      const result = await response.json()

      if (result.debug) {
        setEngineDebug(result.debug)
      }

      setEngineAnalysis(result)
      // Automatically show ghost checkers when a move is suggested
      if (result.move) {
        const ghostData = convertMoveToGhostCheckers(result.move, boardXGID)
        // Use flushSync to ensure all updates happen synchronously in a single render
        // This prevents flickering: final board state + ghosts update together
        // Approach: Draw final position, add ghosts at original points, arrows to final points
        flushSync(() => {
          // Set final board state first (checkers already moved)
          setSuggestedMoveXGID(ghostData.finalXGID)
          // Then set ghost checkers at original positions (where checkers came from)
          setSuggestedGhostCheckers(ghostData.ghostCheckers)
          setSuggestedGhostCheckerPositions(ghostData.ghostCheckerPositions)
          setSuggestedGhostCheckerOwners(ghostData.ghostCheckerOwners)
          // Set arrows to final positions (where checkers went to)
          setSuggestedMoves(ghostData.moves)
          // Enable ghost display
          setShowGhosts(true)
        })
        // Save ghost data so we can restore it after clearing
        setSavedGhostData({
          ghostCheckers: { ...ghostData.ghostCheckers },
          ghostCheckerPositions: { ...ghostData.ghostCheckerPositions },
          ghostCheckerOwners: { ...ghostData.ghostCheckerOwners },
          moves: [...ghostData.moves],
          finalXGID: ghostData.finalXGID
        })
      }
    } catch (error) {
      console.error('Engine analysis failed:', error)
      setEngineAnalysis({
        move: null,
        reasoning: 'Engine analysis failed due to technical error',
        confidence: 0,
        source: 'error'
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Convert engine move to move string and apply it using applyMove (like the Quiz)
  const convertMoveToGhostCheckers = (move, boardXGID) => {
    if (!move || !boardXGID) {
      return {
        finalXGID: boardXGID,
        ghostCheckers: {},
        ghostCheckerPositions: {},
        ghostCheckerOwners: {},
        moves: []
      }
    }

    const boardState = parseXGID(boardXGID)
    const currentPlayer = boardState.player !== undefined ? boardState.player : 1
    const moveOwner = currentPlayer === 1 ? 'white' : 'black'

    // Helper to convert absolute to relative (current player's perspective)
    const absoluteToRelative = (absolutePoint) => {
      if (absolutePoint === 0 || absolutePoint === 25) return absolutePoint
      if (absolutePoint === -1 || absolutePoint === -2) return absolutePoint
      if (currentPlayer === 1) return absolutePoint // White: absolute = relative
      return 25 - absolutePoint // Black: relative = 25 - absolute
    }

    // Convert engine move to move string format for applyMove
    // IMPORTANT: Normalize moves first (highest originating point first), then convert
    // Do NOT collapse sequences here - applyMove needs the full sequence
    
    // First, collect all moves
    let movesToProcess = []
    if (move.moves && Array.isArray(move.moves) && move.moves.length > 0) {
      movesToProcess = move.moves.map(m => ({
        fromAbs: m.from,
        toAbs: m.to,
        hitBlot: m.hitBlot || false
      }))
    } else if (move.from !== undefined && move.to !== undefined) {
      movesToProcess = [{
        fromAbs: move.from,
        toAbs: move.to,
        hitBlot: move.hitBlot || false
      }]
    }
    
    // Normalize: sort by highest originating point first (in absolute coordinates)
    movesToProcess.sort((a, b) => b.fromAbs - a.fromAbs)
    
    // Now convert normalized moves to move string format
    const moveParts = []
    for (const singleMove of movesToProcess) {
      const fromAbs = singleMove.fromAbs
      const toAbs = singleMove.toAbs

      // Skip bar and off positions
      if (fromAbs < 1 || fromAbs > 24 || toAbs < 1 || toAbs > 24) continue

      // Convert to relative coordinates (current player's perspective)
      const fromRel = absoluteToRelative(fromAbs)
      const toRel = absoluteToRelative(toAbs)

      // Format as move string (e.g., "24/18" or "13/10*")
      const asterisk = singleMove.hitBlot ? '*' : ''
      moveParts.push(`${fromRel}/${toRel}${asterisk}`)
    }
    
    if (moveParts.length === 0) {
      // Single move
      const fromAbs = move.from
      const toAbs = move.to

      if (fromAbs >= 1 && fromAbs <= 24 && toAbs >= 1 && toAbs <= 24) {
        const fromRel = absoluteToRelative(fromAbs)
        const toRel = absoluteToRelative(toAbs)
        const asterisk = move.hitBlot ? '*' : ''
        moveParts.push(`${fromRel}/${toRel}${asterisk}`)
      }
    }

    // If no valid moves, return empty result
    if (moveParts.length === 0) {
      return {
        finalXGID: boardXGID,
        ghostCheckers: {},
        ghostCheckerPositions: {},
        ghostCheckerOwners: {},
        moves: []
      }
    }

    // Join move parts with spaces (e.g., "13/10 10/8")
    const moveString = moveParts.join(' ')

    // Use applyMove directly (like the Quiz does)
    const result = applyMove(boardXGID, moveString, moveOwner)

    // Collapse sequences in moves array for arrow display only
    // Remove ghosts from intermediate points in sequences
    const collapsedMoves = []
    const updatedGhostCheckers = { ...result.ghostCheckers }
    const updatedGhostCheckerPositions = { ...result.ghostCheckerPositions }
    const updatedGhostCheckerOwners = { ...result.ghostCheckerOwners }
    
    console.log('[convertMoveToGhostCheckers] Processing moves for collapse:', {
      moveString,
      moveParts,
      resultMoves: result.moves,
      originalGhostCheckers: result.ghostCheckers
    })
    
    let i = 0
    while (i < result.moves.length) {
      const currentMove = result.moves[i]
      
      // Check if this move hits a blot
      const movePartIndex = i < moveParts.length ? i : -1
      const hitsBlot = movePartIndex >= 0 && moveParts[movePartIndex].includes('*')
      
      // If this move hits a blot, don't collapse - add it separately
      if (hitsBlot) {
        collapsedMoves.push(currentMove)
        i++
        continue
      }
      
      // Try to form a sequence
      // A sequence is when the same checker moves multiple times: e.g., 13/10 then 10/8
      // IMPORTANT: Only collapse if nextMove.from === sequenceEnd (same checker continuing)
      // Do NOT collapse if multiple different checkers move to the same destination
      let sequenceStart = currentMove.from
      let sequenceEnd = currentMove.to
      let sequenceFromStack = currentMove.fromStackPosition
      const intermediatePoints = []
      let j = i + 1
      
      // Check if next moves form a sequence (same checker moving, no hits)
      while (j < result.moves.length) {
        const nextMove = result.moves[j]
        const nextMovePartIndex = j < moveParts.length ? j : -1
        const nextHitsBlot = nextMovePartIndex >= 0 && moveParts[nextMovePartIndex].includes('*')
        
        // Only continue sequence if next move starts where current sequence ends (same checker)
        // AND the next move doesn't hit a blot
        if (nextMove.from === sequenceEnd && !nextHitsBlot) {
          // This is an intermediate point - the checker landed here and continues moving
          intermediatePoints.push(sequenceEnd)
          sequenceEnd = nextMove.to
          j++
        } else {
          // Not a sequence - different checker or hits a blot
          break
        }
      }
      
      // If we found a sequence (j > i + 1 means we found at least one continuation)
      if (j > i + 1) {
        console.log('[convertMoveToGhostCheckers] Collapsing sequence:', {
          sequenceStart,
          sequenceEnd,
          intermediatePoints,
          currentMove,
          nextMoves: result.moves.slice(i + 1, j)
        })
        // Remove ghosts from intermediate points
        // For each intermediate point, count how many moves in the sequence start from it
        // and how many other moves (outside the sequence) start from it
        for (const intermediatePoint of intermediatePoints) {
          // Find the index of the move in the sequence that starts from this intermediate point
          const sequenceMoveIndex = result.moves.findIndex((move, idx) => 
            idx > i && idx < j && move.from === intermediatePoint
          )
          
          // Count how many moves AFTER the sequence start from this point
          const movesAfterSequence = result.moves.filter((move, idx) => 
            idx >= j && move.from === intermediatePoint
          ).length
          
          // Count how many moves BEFORE the sequence start from this point
          const movesBeforeSequence = result.moves.filter((move, idx) => 
            idx < i && move.from === intermediatePoint
          ).length
          
          const totalOtherMoves = movesBeforeSequence + movesAfterSequence
          
          console.log('[convertMoveToGhostCheckers] Intermediate point analysis:', {
            intermediatePoint,
            sequenceMoveIndex,
            movesBeforeSequence,
            movesAfterSequence,
            totalOtherMoves,
            originalGhostCount: (result.ghostCheckers[intermediatePoint] || []).length
          })
          
          if (totalOtherMoves === 0) {
            // No other moves start from this point, remove all ghosts (they're all from the sequence)
            console.log('[convertMoveToGhostCheckers] Removing all ghosts from intermediate point:', intermediatePoint)
            delete updatedGhostCheckers[intermediatePoint]
            delete updatedGhostCheckerPositions[intermediatePoint]
            delete updatedGhostCheckerOwners[intermediatePoint]
          } else {
            // Other moves start from this point - need to remove ghosts from sequence but keep ghosts from other moves
            const originalPositions = [...(result.ghostCheckerPositions[intermediatePoint] || [])]
            const originalCount = originalPositions.length
            
            // Count how many moves in the sequence start from this intermediate point
            const sequenceMovesFromPoint = result.moves.slice(i + 1, j).filter(m => m.from === intermediatePoint).length
            
            // We want to keep ghosts for other moves, remove ghosts for sequence moves
            const ghostsToKeep = totalOtherMoves
            const ghostsToRemove = sequenceMovesFromPoint
            
            if (originalCount === ghostsToKeep + ghostsToRemove && ghostsToRemove > 0) {
              // Ghost count matches - remove ghosts from sequence moves
              // Since applyMove adds ghosts in move order:
              // - First: ghosts from movesBeforeSequence
              // - Then: ghosts from sequence moves
              // - Finally: ghosts from movesAfterSequence
              // We want to keep: movesBeforeSequence + movesAfterSequence ghosts
              // Remove: sequenceMovesFromPoint ghosts (which come after movesBeforeSequence)
              const positionsToKeep = [
                ...originalPositions.slice(0, movesBeforeSequence), // Keep ghosts from moves before sequence
                ...originalPositions.slice(movesBeforeSequence + ghostsToRemove) // Skip sequence ghosts, keep rest
              ]
              
              updatedGhostCheckers[intermediatePoint] = positionsToKeep.length
              updatedGhostCheckerPositions[intermediatePoint] = positionsToKeep
              
              console.log('[convertMoveToGhostCheckers] Removing', ghostsToRemove, 'ghost(s) from intermediate point (sequence), keeping', ghostsToKeep, ':', intermediatePoint, {
                keptPositions: positionsToKeep.length,
                originalPositions: originalPositions.length
              })
            } else {
              console.warn('[convertMoveToGhostCheckers] Cannot remove ghosts - count mismatch:', {
                originalCount,
                ghostsToKeep,
                ghostsToRemove,
                expectedTotal: ghostsToKeep + ghostsToRemove
              })
              // Don't modify if counts don't match - safer to keep all ghosts
            }
          }
        }
        
        // Add collapsed move
        collapsedMoves.push({
          from: sequenceStart,
          to: sequenceEnd,
          fromStackPosition: sequenceFromStack,
          toStackPosition: result.moves[j - 1].toStackPosition
        })
      } else {
        // Not a sequence, add as-is (keep ghost at source point)
        console.log('[convertMoveToGhostCheckers] Not a sequence, keeping move as-is:', {
          currentMove,
          from: currentMove.from,
          to: currentMove.to
        })
        collapsedMoves.push(currentMove)
      }
      i = j
    }

    console.log('[convertMoveToGhostCheckers] Final result:', {
      originalGhostCheckers: result.ghostCheckers,
      updatedGhostCheckers,
      collapsedMoves
    })

    return {
      finalXGID: result.xgid,
      ghostCheckers: updatedGhostCheckers,
      ghostCheckerPositions: updatedGhostCheckerPositions,
      ghostCheckerOwners: updatedGhostCheckerOwners,
      moves: collapsedMoves
    }
  }

  // Show suggested move with ghost checkers and arrows
  const handleShowSuggestedMove = () => {
    if (!engineAnalysis || !engineAnalysis.move) return

    const ghostData = convertMoveToGhostCheckers(engineAnalysis.move, boardXGID)
    setSuggestedGhostCheckers(ghostData.ghostCheckers)
    setSuggestedGhostCheckerPositions(ghostData.ghostCheckerPositions)
    setSuggestedGhostCheckerOwners(ghostData.ghostCheckerOwners)
    setSuggestedMoves(ghostData.moves)
    setShowGhosts(true)
  }

  // Clear ghost checkers and arrows (but keep suggested move text)
  const handleClearGhosts = () => {
    // Save current ghost data so we can restore it
    if (showGhosts && engineAnalysis && engineAnalysis.move) {
      setSavedGhostData({
        ghostCheckers: { ...suggestedGhostCheckers },
        ghostCheckerPositions: { ...suggestedGhostCheckerPositions },
        ghostCheckerOwners: { ...suggestedGhostCheckerOwners },
        moves: [...suggestedMoves],
        finalXGID: suggestedMoveXGID
      })
    }
    setSuggestedGhostCheckers({})
    setSuggestedGhostCheckerPositions({})
    setSuggestedGhostCheckerOwners({})
    setSuggestedMoves([])
    setSuggestedMoveXGID(null)
    setShowGhosts(false)
  }

  // Show ghost checkers (restore from saved data)
  const handleShowGhosts = () => {
    if (savedGhostData) {
      // Create deep copies to avoid reference issues
      const ghostCheckersCopy = JSON.parse(JSON.stringify(savedGhostData.ghostCheckers))
      const ghostCheckerPositionsCopy = JSON.parse(JSON.stringify(savedGhostData.ghostCheckerPositions))
      const ghostCheckerOwnersCopy = JSON.parse(JSON.stringify(savedGhostData.ghostCheckerOwners))
      const movesCopy = JSON.parse(JSON.stringify(savedGhostData.moves))
      
      // Restore all data atomically in a single flushSync
      // This ensures board state and ghosts update together without flicker
      flushSync(() => {
        // 1. Set final board state FIRST (checkers already moved to final positions)
        setSuggestedMoveXGID(savedGhostData.finalXGID)
        // 2. Set ghost checkers at original positions (where checkers came from)
        setSuggestedGhostCheckers(ghostCheckersCopy)
        setSuggestedGhostCheckerPositions(ghostCheckerPositionsCopy)
        setSuggestedGhostCheckerOwners(ghostCheckerOwnersCopy)
        // 3. Set arrows to final positions (where checkers went to)
        setSuggestedMoves(movesCopy)
        // 4. Enable ghost display LAST - ensures all data is ready before board renders
        setShowGhosts(true)
      })
    } else if (engineAnalysis && engineAnalysis.move) {
      // If no saved data, regenerate ghosts from current analysis
      const ghostData = convertMoveToGhostCheckers(engineAnalysis.move, boardXGID)
      // Use flushSync to ensure all updates happen atomically in a single render
      flushSync(() => {
        // 1. Set final board state FIRST (checkers already moved to final positions)
        setSuggestedMoveXGID(ghostData.finalXGID)
        // 2. Set ghost checkers at original positions (where checkers came from)
        setSuggestedGhostCheckers(ghostData.ghostCheckers)
        setSuggestedGhostCheckerPositions(ghostData.ghostCheckerPositions)
        setSuggestedGhostCheckerOwners(ghostData.ghostCheckerOwners)
        // 3. Set arrows to final positions (where checkers went to)
        setSuggestedMoves(ghostData.moves)
        // 4. Enable ghost display LAST - ensures all data is ready before board renders
        setShowGhosts(true)
      })
      // Save the regenerated data
      setSavedGhostData({
        ghostCheckers: { ...ghostData.ghostCheckers },
        ghostCheckerPositions: { ...ghostData.ghostCheckerPositions },
        ghostCheckerOwners: { ...ghostData.ghostCheckerOwners },
        moves: [...ghostData.moves],
        finalXGID: ghostData.finalXGID
      })
    }
  }

  // Clear engine analysis
  const handleClearEngineAnalysis = () => {
    setEngineAnalysis(null)
    setEngineDebug(null)
    handleClearGhosts() // Also clear ghosts when clearing analysis
    setSavedGhostData(null) // Clear saved ghost data when clearing analysis
  }

  // Handle engine difficulty changes
  const handleEngineDifficultyChange = (difficulty) => {
    setEngineDifficulty(difficulty)
  }

  // Sync input value when boardXGID changes externally
  useEffect(() => {
    console.log('boardXGID changed to:', boardXGID, 'updating xgidInputValue')
    setXgidInputValue(boardXGID)
    setXgidError(null)
  }, [boardXGID])

  // Keep currentPlayer in sync with boardState.player from XGID
  // This ensures currentPlayer always reflects the authoritative player from the board state
  useEffect(() => {
    const boardState = parseXGID(boardXGID)
    if (boardState && boardState.player !== undefined) {
      const xgidPlayer = boardState.player
      const prevPlayer = currentPlayer
      
      // Update currentPlayer to match XGID player (source of truth)
      setCurrentPlayer(xgidPlayer)
      
      // Reset usedDice when:
      // 1. Dice are cleared (turn complete) - "00"
      // 2. Player changes (new turn)
      if (boardState.dice === '00' || (prevPlayer !== undefined && prevPlayer !== xgidPlayer)) {
        setUsedDice([])
      }
    }
  }, [boardXGID, currentPlayer]) // Depend on both to detect player changes

  // Save engine difficulty to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('backgammonEngineDifficulty', engineDifficulty)
    }
  }, [engineDifficulty])

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
                  Play Backgammon
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Play backgammon with an AI engine. Edit board positions, analyze moves, and practice your game.
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
                    onClick={() => {
                      setEditingMode('free')
                      handleClearEngineAnalysis() // Clear engine analysis when switching to EDIT mode
                    }}
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
                    onClick={() => {
                      // Reset to starting position and clear game state
                      setBoardXGID(STARTING_XGID)
                      setUsedDice([]) // Clear used dice tracking
                      handleClearEngineAnalysis() // Clear engine analysis when starting new game
                      // Note: STARTING_XGID already has player=1 (white) and dice=00 (cleared)
                    }}
                    className="px-4 py-2 rounded-md text-sm font-medium transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    Start
                  </button>
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                  {(() => {
                    // Check if player needs to roll dice (dice are "00")
                    const boardState = boardXGID ? parseXGID(boardXGID) : null
                    const needsToRoll = boardState && boardState.dice === '00'
                    return (
                      <button
                        onClick={handleEngineAnalysis}
                        disabled={isAnalyzing || editingMode !== 'play' || needsToRoll}
                        className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isAnalyzing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Analyzing...
                          </>
                        ) : (
                          <>
                            💡 Suggest Move
                          </>
                        )}
                      </button>
                    )
                  })()}
                  <span className="text-red-600 font-bold text-sm ml-2">
                    ** EXPERIMENTAL **
                  </span>
                </div>
              </div>

              {/* Board Display */}
              <div className="flex justify-center">
                <div className="rounded-lg shadow-lg overflow-hidden">
                  <BackgammonBoard 
                    key={showGhosts && suggestedMoveXGID ? `ghost-${suggestedMoveXGID}` : `normal-${boardXGID}`} // Force remount when switching between ghost/normal to prevent flicker
                    direction={0} 
                    showBoardLabels={false} 
                    showPointNumbers={true}
                    useCube={true}
                    xgid={showGhosts && suggestedMoveXGID ? suggestedMoveXGID : boardXGID} // Use final state when showing ghosts (like Quiz)
                    originalXGID={boardXGID} // Always pass original state for applying moves
                    ghostCheckers={showGhosts ? suggestedGhostCheckers : {}}
                    ghostCheckerPositions={showGhosts ? suggestedGhostCheckerPositions : {}}
                    ghostCheckerOwners={showGhosts ? suggestedGhostCheckerOwners : {}}
                    moves={showGhosts ? suggestedMoves : []}
                    onClearGhosts={handleClearGhosts}
                    onShowGhosts={handleShowGhosts}
                    ghostsVisible={showGhosts}
                    dice="00"
                    showTrays={true}
                    onPlayerChange={setCurrentPlayer}
                    showOptions={true}
                    isEditable={true}
                    editingMode={editingMode}
                    onChange={(newXGID) => {
                      const prevBoardState = parseXGID(boardXGID)
                      const newBoardState = parseXGID(newXGID)
                      
                      setBoardXGID(newXGID)
                      
                      // Clear engine analysis only when turn is complete:
                      // 1. Dice are cleared (00) - turn complete
                      // 2. Player changed - turn complete
                      const diceCleared = prevBoardState?.dice !== '00' && newBoardState?.dice === '00'
                      const playerChanged = prevBoardState?.player !== undefined && 
                                           newBoardState?.player !== undefined && 
                                           prevBoardState.player !== newBoardState.player
                      
                      if (diceCleared || playerChanged) {
                        handleClearEngineAnalysis()
                      }
                      
                      // Update ghost checkers if board changed and we have a suggested move
                      // Only update if the board changed due to external reasons (not from applying the suggested move)
                      if (showGhosts && engineAnalysis && engineAnalysis.move && newXGID !== suggestedMoveXGID) {
                        const ghostData = convertMoveToGhostCheckers(engineAnalysis.move, newXGID)
                        setSuggestedGhostCheckers(ghostData.ghostCheckers)
                        setSuggestedGhostCheckerPositions(ghostData.ghostCheckerPositions)
                        setSuggestedGhostCheckerOwners(ghostData.ghostCheckerOwners)
                        setSuggestedMoves(ghostData.moves)
                        setSuggestedMoveXGID(ghostData.finalXGID)
                      }
                    }}
                    aiAnalysis={engineAnalysis}
                    aiDebug={engineDebug}
                    aiDifficulty={engineDifficulty}
                    onAiDifficultyChange={handleEngineDifficultyChange}
                    onAiAnalysis={handleEngineAnalysis}
                    onClearAiAnalysis={handleClearEngineAnalysis}
                    onUsedDiceChange={setUsedDice}
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

