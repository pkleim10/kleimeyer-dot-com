'use client'

import { useState, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import BackgammonBoard from '../opening-moves/components/BackgammonBoard'
import { parseXGID } from '../opening-moves/utils/xgidParser'
import { applyMove } from '../opening-moves/utils/moveApplier'
import { formatMove } from '@/utils/moveFormatter'

export default function PlayPage() {
  const { user } = useAuth()
  
  // Starting position XGID (xg1: checker positions, xg2: cubeValue, xg3: cubeOwner, xg4: player, xg5: dice, xg6-xg10: match play values)
  // xg4=0 means OPEN state (opening roll)
  const STARTING_XGID = "-b----E-C---eE---c-e----B-:0:0:0:00:0:0:0:0:10"
  
  const [currentPlayer, setCurrentPlayer] = useState(1) // Track current player: -1 = black, 1 = white
  const [boardXGID, setBoardXGID] = useState(STARTING_XGID) // Track board state
  const [editingMode, setEditingMode] = useState('free') // 'free' or 'play'
  const [xgidInputValue, setXgidInputValue] = useState(STARTING_XGID) // Current input value
  const [xgidError, setXgidError] = useState(null) // Validation error message
  const [usedDice, setUsedDice] = useState([]) // Track dice that have been used in the current turn
  const [turnStartXGID, setTurnStartXGID] = useState(STARTING_XGID) // Track board state at the start of the current turn
  const [resetKey, setResetKey] = useState(0) // Key to force BackgammonBoard to reset turnState
  
  // Help overlay state
  const [showHelpOverlay, setShowHelpOverlay] = useState(false)
  const editButtonRef = useRef(null)
  const playButtonRef = useRef(null)
  const startButtonRef = useRef(null)
  const suggestMoveButtonRef = useRef(null)

  // Ghost checkers and arrows for suggested move
  const [suggestedGhostCheckers, setSuggestedGhostCheckers] = useState({})
  const [suggestedGhostCheckerPositions, setSuggestedGhostCheckerPositions] = useState({})
  const [suggestedGhostCheckerOwners, setSuggestedGhostCheckerOwners] = useState({})
  const [suggestedMoves, setSuggestedMoves] = useState([])
  const [showGhosts, setShowGhosts] = useState(false) // Track if ghosts should be displayed
  const [suggestedMoveXGID, setSuggestedMoveXGID] = useState(null) // Final XGID after applying suggested move
  // Store ghost data when clearing so we can restore it
  const [savedGhostData, setSavedGhostData] = useState(null)
  // Trigger for applying move through BackgammonBoard's applyAIMove function
  const [applyMoveTrigger, setApplyMoveTrigger] = useState(0)
  // Trigger for opening options dialog in BackgammonBoard
  const [openOptionsTrigger, setOpenOptionsTrigger] = useState(0)

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

  // Simulation parameters (configurable by user)
  const [maxMoves, setMaxMoves] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('backgammonMaxMoves')) || 40
    }
    return 40
  })
  const [maxTopMoves, setMaxTopMoves] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('backgammonMaxTopMoves')) || 6
    }
    return 6
  })
  const [numSimulations, setNumSimulations] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('backgammonNumSimulations')) || 1000
    }
    return 1000
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
          maxTopMoves: maxTopMoves,
          numSimulations: numSimulations,
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
    
    // Normalize: sort by highest originating point first (in RELATIVE coordinates)
    // This ensures the display order matches the ghost/arrow drawing order
    // Convert to relative first, then sort by relative from point (highest first)
    movesToProcess = movesToProcess.map(m => {
      const fromRel = (m.fromAbs >= 1 && m.fromAbs <= 24) 
        ? absoluteToRelative(m.fromAbs)
        : m.fromAbs
      return {
        ...m,
        fromRel,
        toRel: (m.toAbs >= 1 && m.toAbs <= 24)
          ? absoluteToRelative(m.toAbs)
          : m.toAbs
      }
    })
    movesToProcess.sort((a, b) => {
      // Sort by relative from point (highest first), but handle bar/off positions
      if (a.fromRel < 1 || a.fromRel > 24) return 1
      if (b.fromRel < 1 || b.fromRel > 24) return -1
      return b.fromRel - a.fromRel
    })
    
    // Now convert normalized moves to move string format
    // IMPORTANT: applyMove expects moves in the MOVING PLAYER's relative coordinates
    // So we need to convert from absolute coordinates to the moving player's relative coordinates
    // The moving player is determined by the checker owner, not the current board player
    const moveParts = []
    for (const singleMove of movesToProcess) {
      // Determine the moving player from the checker owner
      // We need to check which player owns the checker at fromAbs
      const fromAbs = singleMove.fromAbs
      let movingPlayer = moveOwner // Default to current player
      
      // If fromAbs is a valid point, check the owner
      if (fromAbs >= 1 && fromAbs <= 24) {
        const fromIndex = fromAbs - 1
        const fromPointData = boardState.points[fromIndex]
        if (fromPointData && fromPointData.owner) {
          movingPlayer = fromPointData.owner
        }
      } else if (fromAbs === 25 || fromAbs === 0) {
        // Bar move - check which bar has checkers
        if (fromAbs === 25 && boardState.whiteBar > 0) {
          movingPlayer = 'white'
        } else if (fromAbs === 0 && boardState.blackBar > 0) {
          movingPlayer = 'black'
        }
      }
      
      // Convert to moving player's relative coordinates
      const movingPlayerNum = movingPlayer === 'white' ? 1 : -1
      const fromRel = (fromAbs >= 1 && fromAbs <= 24) 
        ? (movingPlayerNum === 1 ? fromAbs : 25 - fromAbs)
        : fromAbs
      const toRel = (singleMove.toAbs >= 1 && singleMove.toAbs <= 24)
        ? (movingPlayerNum === 1 ? singleMove.toAbs : 25 - singleMove.toAbs)
        : singleMove.toAbs

      // Handle bar moves - bar is represented as 25 or 0 in relative coordinates
      // For bar moves, format as "bar/X" where X is the entry point
      if (fromRel === 25 || fromRel === 0) {
        if (toRel >= 1 && toRel <= 24) {
          const asterisk = singleMove.hitBlot ? '*' : ''
          moveParts.push(`bar/${toRel}${asterisk}`)
        }
        continue
      }

      // Handle bear-off moves (toAbs === 0 or toAbs === 25)
      const isBearOffMove = singleMove.toAbs === 0 || singleMove.toAbs === 25
      if (isBearOffMove) {
        // Format bear-off move as "point/off" in moving player's relative coordinates
        const asterisk = singleMove.hitBlot ? '*' : ''
        moveParts.push(`${fromRel}/off${asterisk}`)
        continue
      }

      // Skip off positions (but allow bar moves above)
      if (fromRel < 1 || fromRel > 24 || toRel < 1 || toRel > 24) continue

      // Format as move string (e.g., "24/18" or "13/10*")
      const asterisk = singleMove.hitBlot ? '*' : ''
      moveParts.push(`${fromRel}/${toRel}${asterisk}`)
    }
    
    if (moveParts.length === 0) {
      // Single move - check if it's a bar move
      const fromAbs = move.from
      const toAbs = move.to
      
      // Check if this is a bar move
      if (fromAbs === 25 || fromAbs === 0) {
        if (toAbs >= 1 && toAbs <= 24) {
          const toRel = absoluteToRelative(toAbs)
          const asterisk = move.hitBlot ? '*' : ''
          moveParts.push(`bar/${toRel}${asterisk}`)
        }
      } else if (fromAbs >= 1 && fromAbs <= 24 && toAbs >= 1 && toAbs <= 24) {
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

    // Determine the actual moving player from the moves
    // Check the first move to see which player owns the checker
    let actualMoveOwner = moveOwner
    if (movesToProcess.length > 0) {
      const firstMove = movesToProcess[0]
      if (firstMove.fromAbs >= 1 && firstMove.fromAbs <= 24) {
        const fromIndex = firstMove.fromAbs - 1
        const fromPointData = boardState.points[fromIndex]
        if (fromPointData && fromPointData.owner) {
          actualMoveOwner = fromPointData.owner
        }
      } else if (firstMove.fromAbs === 25 && boardState.whiteBar > 0) {
        actualMoveOwner = 'white'
      } else if (firstMove.fromAbs === 0 && boardState.blackBar > 0) {
        actualMoveOwner = 'black'
      }
    }
    
    // Use applyMove directly (like the Quiz does) with the actual moving player
    const result = applyMove(boardXGID, moveString, actualMoveOwner)

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
      originalGhostCheckers: result.ghostCheckers,
      currentPlayer,
      moveOwner
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
      // result.moves contains moves in WHITE's absolute coordinates (from applyMove)
      // So sequenceEnd is also in WHITE's absolute coordinates
      while (j < result.moves.length) {
        const nextMove = result.moves[j]
        const nextMovePartIndex = j < moveParts.length ? j : -1
        const nextHitsBlot = nextMovePartIndex >= 0 && moveParts[nextMovePartIndex].includes('*')
        
        // Only continue sequence if next move starts where current sequence ends (same checker)
        // AND the next move doesn't hit a blot
        // Both nextMove.from and sequenceEnd are in WHITE's absolute coordinates
        if (nextMove.from === sequenceEnd && !nextHitsBlot) {
          // This is an intermediate point - the checker landed here and continues moving
          // intermediatePoint is in WHITE's absolute coordinates (matches result.ghostCheckers keys)
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
          nextMoves: result.moves.slice(i + 1, j),
          currentPlayer,
          moveOwner,
          allMoves: result.moves.map(m => `${m.from}/${m.to}`)
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

    // Sort collapsedMoves by highest originating point first (matching display order)
    // This ensures arrows are drawn in the same order as displayed (e.g., 8/2 before 6/2)
    collapsedMoves.sort((a, b) => b.from - a.from)

    return {
      finalXGID: result.xgid,
      ghostCheckers: updatedGhostCheckers,
      ghostCheckerPositions: updatedGhostCheckerPositions,
      ghostCheckerOwners: updatedGhostCheckerOwners,
      moves: collapsedMoves
    }
  }

  // Format move for display in suggestion toolbar - use centralized formatter
  const formatMoveForToolbar = (move) => {
    if (!move) return ''

    // Use normalized form with collapsed sequences for display, from player's perspective
    return formatMove(move, currentPlayer, { collapseSequences: true })
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
    // Don't clear suggestedMoveXGID - keep it so Apply button can use it
    // setSuggestedMoveXGID(null)
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
    setSuggestedMoveXGID(null) // Clear suggested move XGID when clearing analysis
    setApplyMoveTrigger(0) // Reset trigger to prevent stale triggers
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
  const prevBoardStateRef = useRef(null)
  useEffect(() => {
    const boardState = parseXGID(boardXGID)
    const prevBoardState = prevBoardStateRef.current
    
    if (boardState && boardState.player !== undefined) {
      const xgidPlayer = boardState.player
      const prevPlayer = currentPlayer
      
      // Update currentPlayer to match XGID player (source of truth)
      setCurrentPlayer(xgidPlayer)
      
      // Reset usedDice and update turnStartXGID when:
      // 1. Dice are cleared (turn complete) - "00"
      // 2. Player changes (new turn)
      // 3. Dice are rolled (new turn starts) - dice changes from "00" to something else
      const diceRolled = prevBoardState?.dice === '00' && boardState.dice !== '00'
      const diceCleared = prevBoardState?.dice !== '00' && boardState.dice === '00'
      const playerChanged = prevPlayer !== undefined && prevPlayer !== xgidPlayer
      
      if (diceCleared || playerChanged) {
        setUsedDice([])
      }
      
      // Update turnStartXGID when a new turn starts (dice rolled or player changed)
      if (diceRolled || playerChanged) {
        setTurnStartXGID(boardXGID)
      }
      
      // Update ref for next comparison
      prevBoardStateRef.current = boardState
    }
  }, [boardXGID, currentPlayer]) // Depend on both to detect player changes
  
  // Reset handler - restores board to start of current turn
  const handleReset = () => {
    if (editingMode !== 'play') return
    
    // Check if there are any moves made (usedDice has entries or board changed)
    const hasMoves = usedDice.length > 0 || boardXGID !== turnStartXGID
    
    if (hasMoves) {
      // Restore board to turn start state
      setBoardXGID(turnStartXGID)
      setUsedDice([])
      handleClearEngineAnalysis()
      // Increment resetKey to force BackgammonBoard to reset its turnState
      setResetKey(prev => prev + 1)
    }
  }

  // Save engine difficulty to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('backgammonEngineDifficulty', engineDifficulty)
    }
  }, [engineDifficulty])

  // Save simulation parameters to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('backgammonMaxMoves', maxMoves.toString())
    }
  }, [maxMoves])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('backgammonMaxTopMoves', maxTopMoves.toString())
    }
  }, [maxTopMoves])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('backgammonNumSimulations', numSimulations.toString())
    }
  }, [numSimulations])


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

    // xg4: -1, 0, or 1 (0 = OPEN state)
    if (parts[3] && !/^-?[01]$/.test(parts[3])) {
      return { valid: false, error: 'xg4 (player) must be -1, 0 (OPEN), or 1' }
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

  // Help Overlay Component
  const HelpOverlay = ({ editButtonRef, playButtonRef, startButtonRef, suggestMoveButtonRef, onClose }) => {
    const [docHeight, setDocHeight] = useState('100vh')
    
    useEffect(() => {
      const calculateDocHeight = () => {
        // Calculate document height excluding the overlay itself to avoid feedback loop
        const body = document.body
        const html = document.documentElement
        const height = Math.max(
          body.scrollHeight,
          body.offsetHeight,
          html.clientHeight,
          html.scrollHeight,
          html.offsetHeight
        )
        setDocHeight(`${height}px`)
      }
      
      // Calculate on mount and when window resizes
      calculateDocHeight()
      window.addEventListener('resize', calculateDocHeight)
      
      return () => {
        window.removeEventListener('resize', calculateDocHeight)
      }
    }, [])
    
    // Helper configurations
    const helpers = [
      {
        id: 'play',
        number: 1,
        title: 'PLAY Mode',
        description: 'Click PLAY to play a game with move validation. The engine will enforce legal moves and track dice usage. Use this mode to practice against our HAM analytic engine.',
        buttonRef: playButtonRef,
        side: 'left'
      },
      {
        id: 'edit',
        number: 2,
        title: 'EDIT Mode',
        description: 'Click EDIT to freely move checkers and set up board positions. Perfect for exploring different game states or practicing specific scenarios.',
        buttonRef: editButtonRef,
        side: 'left' // Can be 'left' or 'right'
      },
      {
        id: 'start',
        number: 3,
        title: 'Start',
        description: 'Click Start to reset the board to the starting position and begin a new game.',
        buttonRef: startButtonRef,
        side: 'right' // Place Start helper on the right side
      },
      {
        id: 'suggest',
        number: 4,
        title: 'Suggest Move',
        description: 'Click the lightbulb icon to get a move suggestion from our HAM analytic engine. The suggested move will be highlighted on the board.',
        buttonRef: suggestMoveButtonRef,
        side: 'right' // Place Suggest Move helper on the right side
      },
      {
        id: 'options',
        number: 5,
        title: 'Board Options',
        description: 'Click the gear icon to configure board settings such as player perspective, direction, cube settings, dice, and more.',
        buttonRef: { current: null }, // Will be set via selector
        side: 'right',
        horizontalOnly: true // Flag for horizontal-only arrow (no angle)
      },
      {
        id: 'dice',
        number: 6,
        title: 'Dice Area',
        description: 'The dice are displayed here showing the current roll. In PLAY mode, click the dice to roll them. The dice show which moves are available.',
        buttonRef: { current: null }, // Will be set via selector
        side: 'right',
        horizontalOnly: true // Flag for horizontal-only arrow (no angle)
      },
      {
        id: 'info',
        number: 7,
        title: 'Info Bar',
        description: 'Click to change the active player, or opening roll. In EDIT mode, clicking cycles through WHITE > BLACK > OPEN states.',
        buttonRef: { current: null }, // Will be set via selector
        side: 'right',
        horizontalOnly: true // Flag for horizontal-only arrow (no angle)
      },
      {
        id: 'cube',
        number: 8,
        title: 'Doubling Cube',
        description: 'The doubling cube shows the current stake multiplier. Click the cube to double the stakes. The cube can be offered, accepted, or declined during gameplay.',
        buttonRef: { current: null }, // Will be set via selector
        side: 'left',
        horizontalOnly: true // Flag for horizontal-only arrow (no angle)
      },
      {
        id: 'xgid',
        number: 9,
        title: 'XGID Input',
        description: 'Enter or paste an XGID string to set the board position. XGID is a standard format for encoding backgammon positions. Press Enter or click outside to apply.',
        buttonRef: { current: null }, // Will be set via selector
        side: 'left',
        horizontalOnly: true // Flag for horizontal-only arrow (no angle)
      }
    ]

    // Calculate optimal label positions to avoid arrow crossings
    const [labelPositions, setLabelPositions] = useState([])
    const editLabelRef = useRef(null)
    const playLabelRef = useRef(null)
    const startLabelRef = useRef(null)
    const suggestLabelRef = useRef(null)
    const optionsLabelRef = useRef(null)
    const diceLabelRef = useRef(null)
    const infoLabelRef = useRef(null)
    const cubeLabelRef = useRef(null)
    const xgidLabelRef = useRef(null)
    
    // Create a ref for the options gear button using a selector
    const optionsButtonRef = useRef(null)
    
    useEffect(() => {
      // Find the options gear button by ID
      const gearButton = document.getElementById('board-options-gear-button')
      if (gearButton) {
        optionsButtonRef.current = gearButton
        // Update the helper's buttonRef
        const optionsHelper = helpers.find(h => h.id === 'options')
        if (optionsHelper) {
          optionsHelper.buttonRef.current = gearButton
        }
      }
      
      // Find the info bar by ID
      const infoBar = document.getElementById('info-bar')
      if (infoBar) {
        // Update the helper's buttonRef
        const infoHelper = helpers.find(h => h.id === 'info')
        if (infoHelper) {
          infoHelper.buttonRef.current = infoBar
        }
      }
    }, [helpers])

    useEffect(() => {
      const calculateOptimalPositions = () => {
        const positions = []
        const minSpacing = 100 // Minimum spacing between labels to prevent overlap
        
        // Explicit positioning order:
        // Left side: PLAY (top), EDIT (below PLAY)
        // Right side: START (top), SUGGEST (below START)
        
        // Process left side helpers in explicit order
        const leftOrder = ['play', 'edit', 'cube', 'xgid']
        let lastLeftLabelBottom = 0
        
        leftOrder.forEach((helperId, index) => {
          const helper = helpers.find(h => h.id === helperId && h.side === 'left')
          if (!helper) return
          
          const labelRef = helper.id === 'edit' ? editLabelRef 
            : helper.id === 'play' ? playLabelRef
            : helper.id === 'cube' ? cubeLabelRef
            : xgidLabelRef
          
          // For cube and xgid helpers, find button via selector
          let buttonElement = helper.buttonRef?.current
          if (helper.id === 'cube' && !buttonElement) {
            buttonElement = document.getElementById('doubling-cube-reference')
          } else if (helper.id === 'xgid' && !buttonElement) {
            buttonElement = document.getElementById('xgid-input')
          }
          
          if (labelRef?.current && buttonElement) {
            const labelRect = labelRef.current.getBoundingClientRect()
            const labelHeight = labelRect.height || 80
            const buttonRect = buttonElement.getBoundingClientRect()
            const buttonCenterY = buttonRect.top + buttonRect.height / 2
            
            let labelTop
            if (index === 0) {
              // PLAY - top of page
              labelTop = 95 // Fixed top margin (20 + 75px offset)
            } else if (index === 1) {
              // EDIT - just below PLAY
              labelTop = lastLeftLabelBottom + minSpacing
            } else if (index === 2) {
              // CUBE - aligned vertically with cube (not stacked)
              // For cube helper, align vertically with the cube center
              labelTop = buttonCenterY - labelHeight / 2
            } else {
              labelTop = lastLeftLabelBottom + minSpacing
            }
            
            // For horizontal-only arrows (cube), align with button center vertically
            let horizontalY
            if (helper.horizontalOnly) {
              horizontalY = buttonCenterY
            } else {
              horizontalY = labelTop + labelHeight / 2
            }
            
            positions.push({
              id: helper.id,
              top: labelTop,
              buttonCenterY: buttonCenterY,
              horizontalY: horizontalY,
              side: 'left'
            })
            
            lastLeftLabelBottom = labelTop + labelHeight
          }
        })

        // Process right side helpers in explicit order
        const rightOrder = ['start', 'suggest', 'options', 'dice', 'info']
        let lastRightLabelBottom = 0
        
        rightOrder.forEach((helperId, index) => {
          const helper = helpers.find(h => h.id === helperId && h.side === 'right')
          if (!helper) return
          
          const labelRef = helper.id === 'start' ? startLabelRef 
            : helper.id === 'suggest' ? suggestLabelRef 
            : helper.id === 'options' ? optionsLabelRef
            : helper.id === 'dice' ? diceLabelRef
            : infoLabelRef
          
          // For options, dice, info, and cube helpers, find button via selector
          let buttonElement = helper.buttonRef?.current
          if (helper.id === 'options' && !buttonElement) {
            buttonElement = document.getElementById('board-options-gear-button')
          } else if (helper.id === 'dice' && !buttonElement) {
            buttonElement = document.getElementById('dice-area-reference')
          } else if (helper.id === 'info' && !buttonElement) {
            buttonElement = document.getElementById('info-bar')
          } else if (helper.id === 'cube' && !buttonElement) {
            buttonElement = document.getElementById('doubling-cube-reference')
          }
          
          if (labelRef?.current && buttonElement) {
            const labelRect = labelRef.current.getBoundingClientRect()
            const labelHeight = labelRect.height || 80
            const buttonRect = buttonElement.getBoundingClientRect()
            
            // Get button bar to check for overlap (only for non-options, non-dice, non-info buttons)
            let buttonBarRect = null
            if (helper.id !== 'options' && helper.id !== 'dice' && helper.id !== 'info') {
              const buttonBar = buttonElement.closest('.inline-flex')
              buttonBarRect = buttonBar?.getBoundingClientRect()
            }
            
            // Calculate where horizontal arrow would be (below bar if needed)
            const buttonCenterY = buttonRect.top + buttonRect.height / 2
            let horizontalY = buttonCenterY
            if (buttonBarRect) {
              const barBottom = buttonBarRect.bottom
              if (horizontalY >= buttonBarRect.top && horizontalY <= barBottom) {
                horizontalY = barBottom + 10 // Position below bar
              }
            }
            
            let labelTop
            if (index === 0) {
              // START - top of page
              labelTop = 95 // Fixed top margin (20 + 75px offset)
            } else if (index === 1) {
              // SUGGEST - just below START
              labelTop = lastRightLabelBottom + minSpacing
            } else if (index === 2) {
              // OPTIONS - just below SUGGEST
              labelTop = lastRightLabelBottom + minSpacing
            } else if (index === 3) {
              // DICE - aligned vertically with dice area (not stacked)
              // For dice helper, align vertically with the dice area center
              labelTop = buttonCenterY - labelHeight / 2
            } else if (index === 4) {
              // INFO - just below DICE
              labelTop = lastRightLabelBottom + minSpacing
            } else {
              // Fallback
              labelTop = buttonCenterY - labelHeight / 2
            }
            
            // For horizontal-only arrows (options, dice, info, cube, xgid), align with button center vertically
            if (helper.horizontalOnly) {
              horizontalY = buttonCenterY
              // For dice, info, cube, and xgid, labelTop is already set above (aligned with their respective elements)
              // For options, set labelTop here
              if (helper.id === 'options') {
                labelTop = buttonCenterY - labelHeight / 2
              }
            } else {
              // Ensure horizontal arrow Y is consistent with label position
              horizontalY = labelTop + labelHeight / 2
            }
            
            positions.push({
              id: helper.id,
              top: labelTop,
              buttonCenterY: buttonCenterY,
              horizontalY: horizontalY,
              side: 'right'
            })
            
            lastRightLabelBottom = labelTop + labelHeight
          }
        })

        setLabelPositions(positions)
      }

      // Wait for all refs to be ready
      const timeoutId = setTimeout(() => {
        calculateOptimalPositions()
        setTimeout(calculateOptimalPositions, 100)
      }, 0)

      window.addEventListener('resize', calculateOptimalPositions)
      // Don't listen to scroll - overlay scrolls with page naturally, recalculating causes double movement

      return () => {
        clearTimeout(timeoutId)
        window.removeEventListener('resize', calculateOptimalPositions)
      }
    }, [helpers, editLabelRef, playLabelRef, startLabelRef, suggestLabelRef, optionsLabelRef, diceLabelRef, infoLabelRef, cubeLabelRef, xgidLabelRef])

    useEffect(() => {
      const handleEsc = (e) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }
      document.addEventListener('keydown', handleEsc)
      return () => document.removeEventListener('keydown', handleEsc)
    }, [onClose])

    const overlayContent = (
      <div
        className="absolute z-50"
        style={{
          top: 0,
          left: 0,
          right: 0,
          height: docHeight,
          width: '100%'
        }}
        onClick={(e) => {
          // Close if clicking on backdrop
          if (e.target === e.currentTarget || e.target.classList.contains('help-backdrop')) {
            onClose()
          }
        }}
      >
        {/* Semi-transparent backdrop - allows page to be readable */}
        <div 
          className="absolute bg-black bg-opacity-20 help-backdrop pointer-events-none"
          style={{
            top: 0,
            left: 0,
            right: 0,
            height: docHeight
          }}
        />
        
        {/* Render all helpers simultaneously */}
        {helpers.map((helper, index) => {
          const position = labelPositions.find(p => p.id === helper.id)
          const labelRef = helper.id === 'edit' ? editLabelRef 
            : helper.id === 'play' ? playLabelRef 
            : helper.id === 'start' ? startLabelRef 
            : helper.id === 'suggest' ? suggestLabelRef
            : helper.id === 'options' ? optionsLabelRef
            : helper.id === 'dice' ? diceLabelRef
            : helper.id === 'info' ? infoLabelRef
            : cubeLabelRef
          return (
            <HelperLabel
              key={helper.id}
              helper={helper}
              index={index}
              labelRef={labelRef}
              optimalTop={position?.top}
              buttonCenterY={position?.buttonCenterY}
              horizontalY={position?.horizontalY}
              side={position?.side || helper.side}
              horizontalOnly={helper.horizontalOnly || false}
            />
          )
        })}
      </div>
    )
    
    // Render overlay at body level using portal so it's positioned relative to viewport
    if (typeof document !== 'undefined') {
      return createPortal(overlayContent, document.body)
    }
    return overlayContent
  }

  // Individual Helper Label Component with line to trigger
  const HelperLabel = ({ helper, index, labelRef, optimalTop, buttonCenterY, horizontalY, side = 'left', horizontalOnly = false }) => {
    const [labelPosition, setLabelPosition] = useState({ top: 0, left: 0, right: 0 })
    const [linePath, setLinePath] = useState({ 
      horizontalStartX: 0, 
      horizontalStartY: 0, 
      horizontalEndX: 0, 
      horizontalEndY: 0,
      angledStartX: 0,
      angledStartY: 0,
      angledEndX: 0,
      angledEndY: 0,
      horizontalOnly: false
    })
    // Store initial vertical offset for horizontal-only helpers to prevent drift
    const initialVerticalOffsetRef = useRef(null)
    // Store initial arrow coordinates for horizontal-only helpers to prevent drift
    const initialArrowCoordsRef = useRef(null)
    // Store initial overlay position for coordinate conversion
    const initialOverlayRectRef = useRef(null)
    // Store initial angled segment coordinates for non-horizontal helpers to prevent arrowhead drift
    const initialAngledCoordsRef = useRef(null)

    useEffect(() => {
      const updatePositions = () => {
        // For options and dice helpers, use the selector to find the button
        let buttonElement = helper.buttonRef?.current
        if (helper.id === 'options' && !buttonElement) {
          buttonElement = document.getElementById('board-options-gear-button')
        } else if (helper.id === 'dice' && !buttonElement) {
          buttonElement = document.getElementById('dice-area-reference')
        } else if (helper.id === 'info' && !buttonElement) {
          buttonElement = document.getElementById('info-bar')
        } else if (helper.id === 'cube' && !buttonElement) {
          buttonElement = document.getElementById('doubling-cube-reference')
        } else if (helper.id === 'xgid' && !buttonElement) {
          buttonElement = document.getElementById('xgid-input')
        }
        
        if (buttonElement && labelRef?.current) {
          const targetRect = buttonElement.getBoundingClientRect()
          const labelRect = labelRef.current.getBoundingClientRect()
          
          // Get scroll position to convert viewport coordinates to document coordinates
          const scrollX = window.scrollX || window.pageXOffset || 0
          const scrollY = window.scrollY || window.pageYOffset || 0
          
          // Find board container
          const boardContainer = document.getElementById('backgammon-board-container')
          const boardRect = boardContainer?.getBoundingClientRect()
          
          // Find button bar position (container with buttons) - only for buttons that are in the button bar
          let buttonBarRect = null
          // Only check for button bar if this is not a dice, options, info, or cube helper (they're not in the button bar)
          if (helper.id !== 'dice' && helper.id !== 'options' && helper.id !== 'info' && helper.id !== 'cube' && buttonElement && typeof buttonElement.closest === 'function') {
            const buttonBar = buttonElement.closest('.inline-flex')
            buttonBarRect = buttonBar?.getBoundingClientRect()
          }
          
          // 1 inch = 96px (standard CSS pixel ratio)
          const oneInch = 96
          
          // Use optimal position if calculated, otherwise fallback to button alignment
          // Since overlay scrolls with page, use viewport coordinates directly (no scroll offset needed)
          let labelTop
          if (horizontalOnly) {
            // For horizontal-only helpers, calculate initial offset once, then maintain it
            // This prevents drift when overlay scrolls with page
            if (initialVerticalOffsetRef.current === null) {
              const targetButtonCenterY = targetRect.top + targetRect.height / 2
              initialVerticalOffsetRef.current = targetButtonCenterY - labelRect.height / 2
            }
            labelTop = initialVerticalOffsetRef.current
          } else if (optimalTop !== undefined) {
            // optimalTop is already in viewport coordinates, use directly
            labelTop = optimalTop
          } else if (buttonCenterY !== undefined) {
            // buttonCenterY is in viewport coordinates, use directly
            labelTop = buttonCenterY - (labelRect.height || 80) / 2
          } else {
            // Fallback: align with button (viewport coordinates)
            labelTop = targetRect.top + targetRect.height / 2 - (labelRect.height || 80) / 2
          }
          
          const labelCenterY = labelTop + labelRect.height / 2
          const buttonCenterX = targetRect.left + targetRect.width / 2
          const targetButtonCenterY = targetRect.top + targetRect.height / 2
          
          // Determine horizontal arrow Y position - avoid button bar overlap
          // Use provided horizontalY if available (from optimal positioning), otherwise calculate
          // All coordinates are in viewport space
          let finalHorizontalY = horizontalY !== undefined ? horizontalY : labelCenterY
          if (buttonBarRect && horizontalY === undefined) {
            const barTop = buttonBarRect.top
            const barBottom = buttonBarRect.bottom
            
            // Check if horizontal line would overlap button bar
            if (labelCenterY >= barTop && labelCenterY <= barBottom) {
              // Horizontal line would overlap bar - prefer positioning below (more space)
              finalHorizontalY = barBottom + 10 // 10px clearance below bar
              // Adjust label position to align with horizontal arrow
              labelTop = finalHorizontalY - labelRect.height / 2
            }
          } else if (horizontalY !== undefined && !horizontalOnly) {
            // Use the optimal horizontalY and adjust label to match (but not for horizontal-only)
            finalHorizontalY = horizontalY
            labelTop = horizontalY - labelRect.height / 2
          }
          
          // Position label on left or right side relative to board
          // Text should border the 1 inch space between board and text
          // Use viewport coordinates directly since overlay scrolls with page
          if (side === 'right') {
            // For info bar helper, position relative to info bar, not board
            let labelLeft
            if (helper.id === 'info') {
              // Position text so its left edge is 1 inch to the right of info bar's right edge
              labelLeft = targetRect.right + oneInch
            } else {
              // Position text so its left edge is 1 inch to the right of board's right edge
              labelLeft = boardRect ? boardRect.right + oneInch : window.innerWidth - 40 - labelRect.width
            }
            setLabelPosition({ top: labelTop, left: labelLeft, right: 0 })
            
            if (horizontalOnly) {
              // Horizontal-only arrow: goes directly from text to button horizontally
              // labelTop is already calculated above
              
              // Get overlay container for coordinate conversion
              const overlayElement = labelRef.current?.closest('[class*="absolute z-50"]') || document.body
              
              // Store initial overlay position and arrow coordinates once
              if (initialArrowCoordsRef.current === null || initialOverlayRectRef.current === null) {
                const overlayRect = overlayElement.getBoundingClientRect()
                initialOverlayRectRef.current = {
                  left: overlayRect.left,
                  top: overlayRect.top
                }
                
                const targetButtonCenterY = targetRect.top + targetRect.height / 2
                // For info and options helpers, point to right edge; for others, point to center
                const horizontalEndX = (helper.id === 'info' || helper.id === 'options')
                  ? targetRect.right
                  : targetRect.left + targetRect.width / 2
                // Store coordinates relative to initial overlay position
                initialArrowCoordsRef.current = {
                  labelLeft: labelLeft - overlayRect.left, // Label left relative to overlay
                  horizontalOffset: horizontalEndX - labelLeft, // Horizontal distance from label to button
                  verticalY: targetButtonCenterY - overlayRect.top // Vertical position relative to overlay
                }
              }
              
              // Use stored coordinates - maintain initial positions relative to overlay
              setLinePath({
                horizontalStartX: initialArrowCoordsRef.current.labelLeft,
                horizontalStartY: initialArrowCoordsRef.current.verticalY,
                horizontalEndX: initialArrowCoordsRef.current.labelLeft + initialArrowCoordsRef.current.horizontalOffset,
                horizontalEndY: initialArrowCoordsRef.current.verticalY,
                angledStartX: 0,
                angledStartY: 0,
                angledEndX: 0,
                angledEndY: 0,
                horizontalOnly: true
              })
            } else {
              // Calculate two-segment arrow: horizontal then angled (mirror image of left side)
              // Arrow starts from text's left edge (which borders the 1 inch space)
              
              // Get overlay container for coordinate conversion
              const overlayElement = labelRef.current?.closest('[class*="absolute z-50"]') || document.body
              
              // Store initial overlay position and angled segment coordinates once
              if (initialOverlayRectRef.current === null || initialAngledCoordsRef.current === null) {
                const overlayRect = overlayElement.getBoundingClientRect()
                initialOverlayRectRef.current = {
                  left: overlayRect.left,
                  top: overlayRect.top
                }
                
                const boardRightEdge = boardRect ? boardRect.right : targetRect.left + targetRect.width
                const horizontalEndX = boardRightEdge
                // Store angled segment endpoint relative to overlay
                // Point to right edge of button for right-side helpers, except helper 3 (start) which points 10px inside top-right corner
                const buttonEdgeX = helper.id === 'start'
                  ? targetRect.right - 10  // 10px inside right edge for helper 3
                  : targetRect.right  // Right edge for other right-side helpers
                const buttonEdgeY = helper.id === 'start'
                  ? targetRect.top + 10  // 10px inside top edge for helper 3
                  : targetButtonCenterY  // Right edge center for other right-side helpers
                initialAngledCoordsRef.current = {
                  angledEndX: buttonEdgeX - overlayRect.left,
                  angledEndY: buttonEdgeY - overlayRect.top
                }
              }
              
              const lineStartX = labelLeft
              const lineStartY = finalHorizontalY
              
              // Horizontal segment ends at board's right edge (1 inch away from text)
              const boardRightEdge = boardRect ? boardRect.right : targetRect.left + targetRect.width
              const horizontalEndX = boardRightEdge
              const horizontalEndY = finalHorizontalY
              
              // Angled segment from horizontal end (at board edge) angles to button center
              // Use stored overlay-relative coordinates for endpoint
              const angledStartX = horizontalEndX
              const angledStartY = horizontalEndY
              
              setLinePath({
                horizontalStartX: lineStartX,
                horizontalStartY: lineStartY,
                horizontalEndX: horizontalEndX,
                horizontalEndY: horizontalEndY,
                angledStartX: angledStartX,
                angledStartY: angledStartY,
                angledEndX: initialAngledCoordsRef.current.angledEndX,
                angledEndY: initialAngledCoordsRef.current.angledEndY,
                horizontalOnly: false
              })
            }
          } else {
            // Left side - position text so its right edge is 1 inch to the left of board's left edge
            const labelLeft = boardRect ? boardRect.left - oneInch - labelRect.width : 40
            setLabelPosition({ top: labelTop, left: labelLeft, right: 0 })
            
            if (horizontalOnly) {
              // Horizontal-only arrow: goes directly from text to button horizontally
              // labelTop is already calculated above
              
              // Get overlay container for coordinate conversion
              const overlayElement = labelRef.current?.closest('[class*="absolute z-50"]') || document.body
              
              // Store initial overlay position and arrow coordinates once
              if (initialArrowCoordsRef.current === null || initialOverlayRectRef.current === null) {
                const overlayRect = overlayElement.getBoundingClientRect()
                initialOverlayRectRef.current = {
                  left: overlayRect.left,
                  top: overlayRect.top
                }
                
                const targetButtonCenterY = targetRect.top + targetRect.height / 2
                // For xgid and cube helpers, point to left edge; for others, point to center
                const horizontalEndX = (helper.id === 'xgid' || helper.id === 'cube')
                  ? targetRect.left 
                  : targetRect.left + targetRect.width / 2
                // Store coordinates relative to initial overlay position
                initialArrowCoordsRef.current = {
                  labelRight: (labelLeft + labelRect.width) - overlayRect.left, // Label right edge relative to overlay
                  horizontalOffset: horizontalEndX - (labelLeft + labelRect.width), // Horizontal distance from label to button (negative for left side)
                  verticalY: targetButtonCenterY - overlayRect.top // Vertical position relative to overlay
                }
              }
              
              // Use stored coordinates - maintain initial positions relative to overlay
              setLinePath({
                horizontalStartX: initialArrowCoordsRef.current.labelRight,
                horizontalStartY: initialArrowCoordsRef.current.verticalY,
                horizontalEndX: initialArrowCoordsRef.current.labelRight + initialArrowCoordsRef.current.horizontalOffset,
                horizontalEndY: initialArrowCoordsRef.current.verticalY,
                angledStartX: 0,
                angledStartY: 0,
                angledEndX: 0,
                angledEndY: 0,
                horizontalOnly: true
              })
            } else {
              // Get overlay container for coordinate conversion
              const overlayElement = labelRef.current?.closest('[class*="absolute z-50"]') || document.body
              
              // Store initial overlay position and angled segment coordinates once
              if (initialOverlayRectRef.current === null || initialAngledCoordsRef.current === null) {
                const overlayRect = overlayElement.getBoundingClientRect()
                initialOverlayRectRef.current = {
                  left: overlayRect.left,
                  top: overlayRect.top
                }
                
                // Store angled segment endpoint relative to overlay
                // Point to left edge of button for left-side helpers, except helper 1 (play) which points 10px inside top-left corner
                const buttonEdgeX = helper.id === 'play'
                  ? targetRect.left + 10  // 10px inside left edge for helper 1
                  : targetRect.left  // Left edge for other left-side helpers
                const buttonEdgeY = helper.id === 'play' 
                  ? targetRect.top + 10  // 10px inside top edge for helper 1
                  : targetButtonCenterY  // Left edge center for other left-side helpers
                initialAngledCoordsRef.current = {
                  angledEndX: buttonEdgeX - overlayRect.left,
                  angledEndY: buttonEdgeY - overlayRect.top
                }
              }
              
              // Calculate two-segment arrow: horizontal then angled
              // Arrow starts from text's right edge (which borders the 1 inch space)
              const lineStartX = labelLeft + labelRect.width
              const lineStartY = finalHorizontalY
              
              // Horizontal segment ends at board's left edge (1 inch away from text)
              const boardLeftEdge = boardRect ? boardRect.left : targetRect.left
              const horizontalEndX = boardLeftEdge
              const horizontalEndY = finalHorizontalY
              
              // Angled segment from horizontal end (at board edge) to button center
              // Use stored overlay-relative coordinates for endpoint
              const angledStartX = horizontalEndX
              const angledStartY = horizontalEndY
              
              setLinePath({
                horizontalStartX: lineStartX,
                horizontalStartY: lineStartY,
                horizontalEndX: horizontalEndX,
                horizontalEndY: horizontalEndY,
                angledStartX: angledStartX,
                angledStartY: angledStartY,
                angledEndX: initialAngledCoordsRef.current.angledEndX,
                angledEndY: initialAngledCoordsRef.current.angledEndY
              })
            }
          }
        }
      }

      // Use requestAnimationFrame to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        updatePositions()
        // Update again after a short delay to account for initial render
        setTimeout(updatePositions, 100)
      }, 0)

      window.addEventListener('resize', updatePositions)
      // Don't listen to scroll - overlay scrolls with page naturally, updating on scroll causes double movement

      return () => {
        clearTimeout(timeoutId)
        window.removeEventListener('resize', updatePositions)
      }
    }, [helper.id, optimalTop, buttonCenterY, horizontalY, labelRef, side, horizontalOnly])

    // For options, dice, info, cube, and xgid helpers, check if button exists via selector
    if (helper.id === 'options') {
      const optionsButton = document.getElementById('board-options-gear-button')
      if (!optionsButton) return null
    } else if (helper.id === 'dice') {
      const diceButton = document.getElementById('dice-area-reference')
      if (!diceButton) return null
    } else if (helper.id === 'info') {
      const infoButton = document.getElementById('info-bar')
      if (!infoButton) return null
    } else if (helper.id === 'cube') {
      const cubeButton = document.getElementById('doubling-cube-reference')
      if (!cubeButton) return null
    } else if (helper.id === 'xgid') {
      const xgidButton = document.getElementById('xgid-input')
      if (!xgidButton) return null
    } else if (!helper.buttonRef?.current) {
      return null
    }

    return (
      <>
        {/* Text Label on the side with container */}
        <div
          ref={labelRef}
          className="absolute z-50 pointer-events-auto max-w-xs p-4 bg-gray-100 dark:bg-gray-800 rounded-lg"
          style={{
            top: `${labelPosition.top}px`,
            left: labelPosition.left > 0 ? `${labelPosition.left}px` : 'auto',
            right: labelPosition.right > 0 ? `${labelPosition.right}px` : 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-white text-sm font-bold flex items-center justify-center">
              {helper.number}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 dark:text-white leading-relaxed">
                {helper.description}
              </p>
            </div>
          </div>
        </div>
        
        {/* Two-segment arrow: horizontal then angled */}
        {linePath.horizontalStartX > 0 && (
          <svg
            className="absolute pointer-events-none z-40"
            style={{
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
            }}
          >
            <defs>
              <marker
                id={`arrowhead-${helper.id}`}
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3, 0 6"
                  fill="#000000"
                />
              </marker>
            </defs>
            {/* Horizontal segment */}
            <line
              x1={linePath.horizontalStartX}
              y1={linePath.horizontalStartY}
              x2={linePath.horizontalEndX}
              y2={linePath.horizontalEndY}
              stroke="#000000"
              strokeWidth="2"
              markerEnd={linePath.horizontalOnly ? `url(#arrowhead-${helper.id})` : undefined}
            />
            {/* Angled segment with arrowhead - only render if not horizontal-only */}
            {!linePath.horizontalOnly && (
              <line
                x1={linePath.angledStartX}
                y1={linePath.angledStartY}
                x2={linePath.angledEndX}
                y2={linePath.angledEndY}
                stroke="#000000"
                strokeWidth="2"
                markerEnd={`url(#arrowhead-${helper.id})`}
              />
            )}
          </svg>
        )}
      </>
    )
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
                Play backgammon with our HAM analytic engine. Edit board positions, analyze moves, and practice your game.
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

              {/* Combined Button Bar */}
              <div className="flex justify-center mb-4">
                <div className="inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 p-1 shadow-sm gap-1 flex-wrap justify-center max-w-full">
                  {/* EDIT | PLAY */}
                  <button
                    ref={editButtonRef}
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
                    ref={playButtonRef}
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
                  
                  {/* Start */}
                  <button
                    ref={startButtonRef}
                    onClick={() => {
                      // Reset to starting position and clear game state
                      setBoardXGID(STARTING_XGID)
                      setUsedDice([]) // Clear used dice tracking
                      setTurnStartXGID(STARTING_XGID) // Reset turn start tracking
                      handleClearEngineAnalysis() // Clear engine analysis when starting new game
                      // Increment resetKey to force BackgammonBoard to reset moveNumber and openingRollDice
                      setResetKey(prev => prev + 1)
                      // Note: STARTING_XGID already has player=0 (OPEN) and dice=00 (cleared)
                    }}
                    className="px-4 py-2 rounded-md text-sm font-medium transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    Start
                  </button>
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                  
                  {/* Suggest Move */}
                  {(() => {
                    // Check if player needs to roll dice (dice are "00")
                    const boardState = boardXGID ? parseXGID(boardXGID) : null
                    const needsToRoll = boardState && boardState.dice === '00'
                    return (
                      <button
                        ref={suggestMoveButtonRef}
                        onClick={handleEngineAnalysis}
                        disabled={isAnalyzing || editingMode !== 'play' || needsToRoll}
                        className="px-3 py-2 rounded-md text-sm font-medium transition-colors bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        title="Suggest Move"
                      >
                        {isAnalyzing ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <span className="text-xl">💡</span>
                        )}
                      </button>
                    )
                  })()}
                  
                  {/* Move Notation */}
                  {engineAnalysis && engineAnalysis.move && (
                    <>
                      <span className="text-gray-700 dark:text-gray-300 font-mono text-sm px-2">
                        {formatMoveForToolbar(engineAnalysis.move)}
                      </span>
                      
                      {/* Apply */}
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          // Trigger move application through BackgammonBoard's applyAIMove function
                          // This ensures proper dice usage tracking and turn completion detection
                          console.log('[Apply button] Clicked:', {
                            hasEngineAnalysis: !!engineAnalysis,
                            hasMove: engineAnalysis?.move ? true : false,
                            currentApplyMoveTrigger: applyMoveTrigger,
                            engineAnalysis
                          })
                          if (engineAnalysis && engineAnalysis.move) {
                            const newTrigger = applyMoveTrigger + 1
                            console.log('[Apply button] Incrementing applyMoveTrigger from', applyMoveTrigger, 'to', newTrigger)
                            setApplyMoveTrigger(newTrigger)
                          } else {
                            console.warn('[Apply button] Cannot apply - no engineAnalysis or move:', {
                              engineAnalysis,
                              hasMove: engineAnalysis?.move
                            })
                          }
                        }}
                        className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-green-600 text-white hover:bg-green-700"
                      >
                        Apply
                      </button>
                    </>
                  )}
                  
                  {/* Clear/Show */}
                  {engineAnalysis && engineAnalysis.move && (
                    <>
                      <button
                        onClick={() => {
                          if (showGhosts) {
                            handleClearGhosts()
                          } else {
                            handleShowGhosts()
                          }
                        }}
                        className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-500"
                      >
                        {showGhosts ? 'Clear' : 'Show'}
                      </button>
                    </>
                  )}
                  
                  {/* Reset */}
                  {editingMode === 'play' && (
                    <>
                      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                      <button
                        onClick={handleReset}
                        disabled={usedDice.length === 0 && boardXGID === turnStartXGID}
                        className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Reset
                      </button>
                    </>
                  )}

                  {/* Simulation Parameters */}
                  {engineAnalysis && engineAnalysis.move && (
                    <>
                      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                      <button
                        onClick={() => setOpenOptionsTrigger(prev => prev + 1)}
                        className="px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                        title="Simulation parameters"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </button>
                    </>
                  )}

                  {/* Help Button */}
                  <button
                    onClick={() => setShowHelpOverlay(!showHelpOverlay)}
                    className="ml-2 p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    title="Show help"
                    aria-label="Show help"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Help Overlay */}
              {showHelpOverlay && (
                <HelpOverlay
                  editButtonRef={editButtonRef}
                  playButtonRef={playButtonRef}
                  startButtonRef={startButtonRef}
                  suggestMoveButtonRef={suggestMoveButtonRef}
                  onClose={() => setShowHelpOverlay(false)}
                />
              )}

              {/* Board Display */}
              <div className="flex justify-center">
                <div id="backgammon-board-container" className="rounded-lg shadow-lg overflow-hidden">
                  <BackgammonBoard 
                    key={showGhosts ? `ghost-${suggestedMoveXGID || 'none'}-reset${resetKey}` : `normal-reset${resetKey}`} // Force remount when switching between ghost/normal or when reset, but NOT on every board change
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
                    isEditable={!showGhosts} // Disable editing when ghost moves are shown
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
                    applyMoveTrigger={applyMoveTrigger}
                    openOptionsTrigger={openOptionsTrigger}
                    maxTopMoves={maxTopMoves}
                    numSimulations={numSimulations}
                    onMaxTopMovesChange={setMaxTopMoves}
                    onNumSimulationsChange={setNumSimulations}
                  />
                </div>
              </div>
              
              {/* XGID Input */}
              <div id="xgid-input-container" className="mt-4 p-4 bg-gray-100 dark:bg-slate-700 rounded-lg">
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

              {/* Simulation Results */}
              {engineAnalysis && engineDebug && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
                    Simulation Results
                  </h3>

                  <div className="space-y-4">
                    {/* Suggested Move */}
                    <div>
                      <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Suggested Move</h4>
                      <div className="bg-white dark:bg-slate-800 rounded p-3 border">
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-mono text-gray-900 dark:text-white">
                            {engineAnalysis.move ? formatMoveForToolbar(engineAnalysis.move) : 'N/A'}
                          </span>
                          <span className={`px-2 py-1 rounded text-sm font-medium ${
                            engineAnalysis.confidence >= 0.8 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            engineAnalysis.confidence >= 0.6 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {engineAnalysis.confidence ? `${(engineAnalysis.confidence * 100).toFixed(0)}%` : 'N/A'} confidence
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Simulation Parameters */}
                    <div>
                      <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Simulation Parameters</h4>
                      <div className="bg-white dark:bg-slate-800 rounded p-3 border">
                        <div className="text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Number of Simulations:</span>
                            <span className="ml-2 font-mono text-gray-900 dark:text-white">{numSimulations.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Move Scores Table */}
                    <div>
                      <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Move Scores</h4>
                      <div className="bg-white dark:bg-slate-800 rounded p-3 border overflow-x-auto">
                        <table className="w-full text-sm font-mono">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-600">
                              <th className="text-left py-2 px-2 text-gray-700 dark:text-gray-300 font-semibold">Move</th>
                              <th className="text-right py-2 px-2 text-blue-600 dark:text-blue-400 font-semibold">HE</th>
                              <th className="text-right py-2 px-2 text-green-600 dark:text-green-400 font-semibold">MC</th>
                              <th className="text-right py-2 px-2 text-purple-600 dark:text-purple-400 font-semibold">Hybrid</th>
                            </tr>
                          </thead>
                          <tbody>
                            {engineAnalysis.factorScores
                              ?.sort((a, b) => {
                                // Parse hybrid scores for sorting
                                const aMatch = a.scores?.match(/Total:\s*([\d.-]+)/);
                                const bMatch = b.scores?.match(/Total:\s*([\d.-]+)/);
                                const aHybrid = aMatch ? parseFloat(aMatch[1]) : 0;
                                const bHybrid = bMatch ? parseFloat(bMatch[1]) : 0;
                                return bHybrid - aHybrid; // Sort descending (highest first)
                              })
                              .slice(0, 10)
                              .map((factorScore, idx) => {
                              // Parse the scores string: "Heuristic: 2.105 | MC: .506 | Total: 1.48"
                              const scoresMatch = factorScore.scores?.match(/Heuristic:\s*([\d.-]+).*MC:\s*([\d.-]+).*Total:\s*([\d.-]+)/)
                              const heScore = scoresMatch ? parseFloat(scoresMatch[1]) : null
                              const mcScore = scoresMatch ? parseFloat(scoresMatch[2]) : null
                              const hybridScore = scoresMatch ? parseFloat(scoresMatch[3]) : null

                              // Highlight moves that made the MC cutoff
                              const rowClass = factorScore.madeMCCutoff
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                                : 'border-gray-100 dark:border-gray-700'

                              // Make winning move bold
                              const textClass = factorScore.isWinner
                                ? 'font-bold text-gray-900 dark:text-white'
                                : 'text-gray-900 dark:text-white'

                              return (
                                <tr key={idx} className={`border-b ${rowClass}`}>
                                  <td className={`py-2 px-2 font-mono ${textClass}`}>
                                    {(() => {
                                      const normalized = factorScore.normalizedMoveDescription
                                      const raw = factorScore.rawMoveDescription

                                      // If normalized and raw are different, show: COLLAPSED (RAW)
                                      // If they're the same, show: RAW
                                      if (normalized && raw && normalized !== raw) {
                                        return `${normalized} (${raw})`
                                      } else {
                                        return raw || normalized || factorScore.moveDescription
                                      }
                                    })()}
                                    {factorScore.isWinner && <span className="ml-2 text-xs text-green-600 dark:text-green-400 font-bold">✓</span>}
                                  </td>
                                  <td className={`py-2 px-2 text-right text-blue-600 dark:text-blue-400 font-semibold ${factorScore.isWinner ? 'font-bold' : ''}`}>
                                    {heScore !== null ? heScore.toFixed(3) : 'N/A'}
                                  </td>
                                  <td className={`py-2 px-2 text-right text-green-600 dark:text-green-400 font-semibold ${factorScore.isWinner ? 'font-bold' : ''}`}>
                                    {mcScore !== null ? mcScore.toFixed(3) : 'N/A'}
                                  </td>
                                  <td className={`py-2 px-2 text-right text-purple-600 dark:text-purple-400 font-semibold ${factorScore.isWinner ? 'font-bold' : ''}`}>
                                    {hybridScore !== null ? hybridScore.toFixed(3) : 'N/A'}
                                  </td>
                                </tr>
                              )
                            }) || (
                              <tr>
                                <td colSpan="4" className="py-4 px-2 text-center text-gray-500">
                                  No move scores available
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                </div>
              )}

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

