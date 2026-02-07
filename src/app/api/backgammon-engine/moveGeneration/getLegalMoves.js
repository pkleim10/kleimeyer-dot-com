/**
 * Legal Move Generation for Backgammon
 * Generates all legal move combinations for a given board state and dice roll
 */

import { rebuildDescription } from '../../../../utils/moveFormatter.js'
import { debugLog } from '@/config/debug.js'

// Debug logging helper that only logs when debug is enabled
function debugFetchLog(location, message, data = {}) {
  if (process.env.NEXT_PUBLIC_DEBUG_LOGGING !== 'true') return

  fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location,
      message,
      data,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run8',
      hypothesisId: 'H'
    })
  }).catch(() => {})
}

/**
 * Helper function to check if player can bear off
 */
function canBearOff(boardState, owner) {
  const barCount = owner === 'white' ? boardState.whiteBar : boardState.blackBar
  if (barCount > 0) return false // Can't bear off if checkers on bar
  
  // Check if all checkers are in home board
  const homeBoardStart = owner === 'white' ? 1 : 19
  const homeBoardEnd = owner === 'white' ? 6 : 24
  
  for (let point = 1; point <= 24; point++) {
    const pointData = boardState.points[point - 1]
    if (pointData.owner === owner && pointData.count > 0) {
      // If checker is outside home board, can't bear off
      if (point < homeBoardStart || point > homeBoardEnd) {
        return false
      }
    }
  }
  return true
}

/**
 * Helper function to get highest occupied point in home board
 */
function getHighestOccupiedPoint(boardState, owner) {
  const homeBoardStart = owner === 'white' ? 1 : 19
  const homeBoardEnd = owner === 'white' ? 6 : 24
  
  for (let point = homeBoardEnd; point >= homeBoardStart; point--) {
    const pointData = boardState.points[point - 1]
    if (pointData.owner === owner && pointData.count > 0) {
      return point
    }
  }
  return null
}

/**
 * Helper function to check if a move is valid
 */
function canMakeMove(boardState, owner, currentPlayer, fromPoint, die) {
  const direction = currentPlayer === 1 ? -1 : 1 // White moves down, black moves up
  const toPoint = fromPoint + (direction * die)

  const fromData = boardState.points[fromPoint - 1]
  
  // Must have checker on from point
  if (fromData.owner !== owner || fromData.count === 0) return null

  // Check if this is a bear-off move
  const homeBoardStart = owner === 'white' ? 1 : 19
  const homeBoardEnd = owner === 'white' ? 6 : 24
  const isInHomeBoard = fromPoint >= homeBoardStart && fromPoint <= homeBoardEnd
  
  if (isInHomeBoard && canBearOff(boardState, owner)) {
    // Convert fromPoint to relative coordinates (1-6 for home board)
    const relativePoint = owner === 'white' ? fromPoint : (25 - fromPoint)
    
    // Check if this would be a bear-off move (toPoint goes beyond board)
    const wouldBearOff = (owner === 'white' && toPoint < 1) || (owner === 'black' && toPoint > 24)
    
    if (wouldBearOff) {
      // Bearing off rules:
      // 1. Point N can only bear off with die N (exact match: point number = die number)
      // 2. Exception: If lowest remaining die > highest occupied point, MUST bear off from highest point with lowest die
      
      // Get highest occupied point
      const highestOccupiedPoint = getHighestOccupiedPoint(boardState, owner)
      
      // Check if die matches point number (normal case)
      if (die === relativePoint) {
        return {
          from: fromPoint,
          to: owner === 'white' ? 0 : 25, // Use 0 for white off, 25 for black off
          count: 1,
          die: die,
          isBearOff: true
        }
      }
      
      // Check exception: if lowest die > highest occupied point, must bear off from highest point
      // Note: We don't have access to all remaining dice here, so we can't check "lowest remaining die"
      // This check will be done at the combination generation level
      // For now, only allow exact match (die === relativePoint)
      
      // Otherwise, this is not a valid bear-off move
      return null
    }
  }

  // Regular move validation
  if (toPoint < 1 || toPoint > 24) return null

  const toData = boardState.points[toPoint - 1]

  // Can move to empty point, own point, or hit single opponent checker
  if (
    toData.count === 0 ||
    toData.owner === owner ||
    (toData.count === 1 && toData.owner !== owner)
  ) {
    return {
      from: fromPoint,
      to: toPoint,
      count: 1,
      die: die
    }
  }

  return null
}

/**
 * Helper function to apply a move to board state (for checking subsequent moves)
 */
function applyMoveToBoard(boardState, move) {
  const newBoard = {
    ...boardState,
    points: boardState.points.map(point => ({ ...point })),
    blackBar: boardState.blackBar,
    whiteBar: boardState.whiteBar
  }

  // Handle bear-off moves (checker removed from board)
  // Bear-off: from is 1-24, to is 0 (white) or 25 (black), and isBearOff flag is set
  // Don't confuse with bar moves (which have from === 25 or fromBar === true)
  if (move.isBearOff || (move.from >= 1 && move.from <= 24 && (move.to === 0 || move.to === 25) && !move.fromBar)) {
    const fromIndex = move.from - 1
    const fromPointData = newBoard.points[fromIndex]
    fromPointData.count -= move.count
    if (fromPointData.count === 0) {
      fromPointData.owner = null
    }
    return newBoard
  }

  const toIndex = move.to - 1

  // Handle bar moves (from bar)
  if (move.fromBar || move.from === 25 || move.from === 0) {
    // Remove checker from bar
    // Determine owner from move.owner or infer from bar position (25 = white, 0 = black)
    const moveOwner = move.owner || (move.from === 25 ? 'white' : move.from === 0 ? 'black' : null)
    if (moveOwner === 'white') {
      newBoard.whiteBar = Math.max(0, newBoard.whiteBar - 1)
    } else if (moveOwner === 'black') {
      newBoard.blackBar = Math.max(0, newBoard.blackBar - 1)
    }
    
    // Ensure move.owner is set for later use
    if (!move.owner && moveOwner) {
      move.owner = moveOwner
    }
    
    // #region agent log
    debugFetchLog('getLegalMoves.js:62', 'Bar move applied in applyMoveToBoard', {moveOwner, moveFrom: move.from, moveFromBar: move.fromBar, moveOwnerSet: move.owner, whiteBarBefore: boardState.whiteBar, whiteBarAfter: newBoard.whiteBar, blackBarBefore: boardState.blackBar, blackBarAfter: newBoard.blackBar})
    // #endregion
  } else {
    // Regular move from point
    const fromIndex = move.from - 1
    // Remove checker from source
    newBoard.points[fromIndex].count -= move.count
    if (newBoard.points[fromIndex].count === 0) {
      newBoard.points[fromIndex].owner = null
    }
  }

  // Add checker to destination
  // move.owner should already be set by buildMove, but ensure it's set
  if (!move.owner) {
    // Fallback: try to get owner from source point (for regular moves)
    if (move.from > 0 && move.from <= 24) {
      const fromData = boardState.points[move.from - 1]
      move.owner = fromData.owner
    }
  }

  if (newBoard.points[toIndex].count === 0) {
    newBoard.points[toIndex].owner = move.owner
    newBoard.points[toIndex].count = move.count
  } else if (newBoard.points[toIndex].count === 1 && newBoard.points[toIndex].owner !== move.owner) {
    // Hit opponent's blot - move to bar
    const opponent = newBoard.points[toIndex].owner
    if (opponent === 'white') {
      newBoard.whiteBar += 1
    } else {
      newBoard.blackBar += 1
    }
    newBoard.points[toIndex].owner = move.owner
    newBoard.points[toIndex].count = move.count
  } else {
    newBoard.points[toIndex].count += move.count
  }

  return newBoard
}

/**
 * Generate move combinations that use all available dice
 * Handles doubles (4 dice) and regular rolls (2 dice)
 */
function getLegalMoves(boardState, turnState) {
  // #region agent log
  debugFetchLog('getLegalMoves.js:114', 'getLegalMoves entry', {hasTurnState: !!turnState, turnStateCurrentPlayer: turnState?.currentPlayer, turnStateDice: turnState?.dice, turnStateDiceLength: turnState?.dice?.length})
  // #endregion
  const moveCombinations = []

  if (!turnState || !turnState.currentPlayer || turnState.dice.length === 0) {
    // #region agent log
    debugFetchLog('getLegalMoves.js:117', 'getLegalMoves early return', {hasTurnState: !!turnState, hasCurrentPlayer: !!turnState?.currentPlayer, diceLength: turnState?.dice?.length})
    // #endregion
    return moveCombinations
  }

  const owner = turnState.currentPlayer
  const currentPlayer = owner === 'white' ? 1 : -1
  // Filter out already used dice
  const usedDice = [...(turnState.usedDice || [])]
  const availableDice = turnState.dice.filter(die => {
    const usedIndex = usedDice.indexOf(die)
    if (usedIndex !== -1) {
      usedDice.splice(usedIndex, 1) // Remove one instance
      return false // This die is used
    }
    return true // This die is still available
  })

  // Check if player has checkers on bar
  const barCount = owner === 'white' ? boardState.whiteBar : boardState.blackBar
  const mustEnterFromBar = barCount > 0 || (turnState.mustEnterFromBar === true)


  const getPlayerPoints = state => {
    const points = []
    // Check bar count from the CURRENT state (not the original boardState)
    // Only check the bar count from state, not turnState.mustEnterFromBar (which is only relevant at turn start)
    const currentBarCount = owner === 'white' ? state.whiteBar : state.blackBar
    const currentMustEnterFromBar = currentBarCount > 0

    // If must enter from bar, only return bar (represented as 0 for white, 25 for black in some systems)
    // But we'll handle bar separately, so return empty array if must enter from bar
    if (currentMustEnterFromBar) {
      return [] // Bar moves handled separately
    }
    
    for (let point = 1; point <= 24; point++) {
      const pointData = state.points[point - 1]
      if (pointData.owner === owner && pointData.count > 0) {
        points.push(point)
      }
    }
    
    // #region agent log
    debugFetchLog('getLegalMoves.js:160', 'getPlayerPoints result', {owner, currentBarCount, currentMustEnterFromBar, pointsFound: points.length, points, stateWhiteBar: state.whiteBar, stateBlackBar: state.blackBar, point22Owner: state.points[21]?.owner, point22Count: state.points[21]?.count})
    // #endregion
    
    return points
  }

  // Check if a bar entry move is valid
  const canEnterFromBar = (state, die) => {
    // Check current state's bar count
    const currentBarCount = owner === 'white' ? state.whiteBar : state.blackBar
    if (currentBarCount === 0) return null
    
    // Determine entry point based on player and die
    // White enters to points 19-24 (black's home board)
    // Black enters to points 1-6 (white's home board)
    let entryPoint
    if (owner === 'white') {
      entryPoint = 25 - die // White enters to point 25 - die (19-24)
    } else {
      entryPoint = die // Black enters to point equal to die value (1-6)
    }
    
    if (entryPoint < 1 || entryPoint > 24) return null
    
    const toData = state.points[entryPoint - 1]
    
    // Can enter to empty point, own point, or hit single opponent checker
    if (
      toData.count === 0 ||
      toData.owner === owner ||
      (toData.count === 1 && toData.owner !== owner)
    ) {
      return {
        from: 25, // Bar represented as 25 for sorting purposes (highest point number)
        to: entryPoint,
        count: 1,
        die: die,
        fromBar: true
      }
    }
    
    return null
  }

  // Complex combination generation handles all cases, including bar entry

  const buildMove = (state, fromPoint, die) => {
    // Handle bar moves separately (fromPoint === 25 means bar)
    if (fromPoint === 25) {
      const currentBarCount = owner === 'white' ? state.whiteBar : state.blackBar
      if (currentBarCount > 0) {
        const move = canEnterFromBar(state, die)
        if (!move) return null
        const toData = state.points[move.to - 1]
        move.owner = owner
        move.hitBlot = toData.count === 1 && toData.owner && toData.owner !== owner
        return move
      }
      return null // No checkers on bar
    }
    
    // Regular move from point (including bear-off)
    const move = canMakeMove(state, owner, currentPlayer, fromPoint, die)
    if (!move) return null
    
    // Handle bear-off moves
    if (move.isBearOff) {
      move.owner = owner
      move.hitBlot = false // Bear-off doesn't hit
      return move
    }
    
    // Regular move validation
    const toData = state.points[move.to - 1]
    move.owner = owner
    move.hitBlot = toData.count === 1 && toData.owner && toData.owner !== owner
    return move
  }

  const orderPair = (first, second) => {
    // Treat bar (25 or 0) as highest for sorting - bar moves must come first
    const firstFrom = first.from === 0 || first.from === 25 ? 25 : first.from
    const secondFrom = second.from === 0 || second.from === 25 ? 25 : second.from
    
    if (firstFrom !== secondFrom) {
      return firstFrom > secondFrom ? [first, second] : [second, first]
    }
    return first.to >= second.to ? [first, second] : [second, first]
  }

  const buildDescription = (moves) => {
    // Use centralized formatter
    return rebuildDescription(moves, owner)
  }
  
  const buildDescriptionOld = moves => {
    // Helper to convert bar point (25 or 0) to "bar" string
    const formatFrom = (move) => {
      return (move.fromBar || move.from === 25 || move.from === 0) ? 'bar' : move.from
    }
    
    // Helper to format destination (handles bear-off)
    const formatTo = (move) => {
      // Bear-off moves: to is 0 (white) or 25 (black)
      if (move.isBearOff || (move.from >= 1 && move.from <= 24 && (move.to === 0 || move.to === 25) && !move.fromBar)) {
        return 'off'
      }
      return move.to
    }
    
    // Helper to check if a move is from bar
    const isBarMove = (move) => {
      return move.fromBar || move.from === 25 || move.from === 0
    }
    
    const sortedMoves = [...moves].sort((a, b) => {
      const aIsBar = isBarMove(a)
      const bIsBar = isBarMove(b)

      // Bar moves always come first
      if (aIsBar && !bIsBar) return -1
      if (!aIsBar && bIsBar) return 1

      // For sorting, convert absolute positions to relative points for proper ordering
      // Black positions (1-12): relative = 25 - absolute
      // White positions (13-24): relative = absolute
      const aFromRelative = a.from <= 12 ? 25 - a.from : a.from
      const bFromRelative = b.from <= 12 ? 25 - b.from : b.from

      // Sort by relative from point (highest first)
      if (aFromRelative !== bFromRelative) return bFromRelative - aFromRelative
      return b.to - a.to
    })
    
    // #region agent log
    debugFetchLog('getLegalMoves.js:250', 'buildDescription sorting', { originalMoves: moves.map(m => ({ from: m.from, to: m.to, fromBar: m.fromBar })), sortedMoves: sortedMoves.map(m => ({ from: m.from, to: m.to, fromBar: m.fromBar })) })
    // #endregion
    
    if (sortedMoves.length === 1) {
      const asterisk = sortedMoves[0].hitBlot ? '*' : ''
      const fromStr = formatFrom(sortedMoves[0])
      const toStr = formatTo(sortedMoves[0])
      return `${fromStr}/${toStr}${asterisk}`
    }
    if (sortedMoves.length === 2) {
      let [m1, m2] = sortedMoves
      let m1IsBar = isBarMove(m1)
      let m2IsBar = isBarMove(m2)
      
      // CRITICAL SAFETY CHECK: If bar move is second, swap them
      // This should never happen if sorting worked, but ensures correctness
      if (!m1IsBar && m2IsBar) {
        // #region agent log
        debugFetchLog('getLegalMoves.js:285', 'BUG DETECTED: Bar move second, swapping', { originalM1: { from: m1.from, to: m1.to, fromBar: m1.fromBar }, originalM2: { from: m2.from, to: m2.to, fromBar: m2.fromBar } })
        // #endregion
        const temp = m1
        m1 = m2
        m2 = temp
        m1IsBar = true
        m2IsBar = false
      }
      
      const m1FromStr = formatFrom(m1)
      const m2FromStr = formatFrom(m2)
      
      // #region agent log
      debugFetchLog('getLegalMoves.js:281', 'buildDescription 2 moves', {m1From: m1.from, m1To: m1.to, m1IsBar, m1FromStr, m2From: m2.from, m2To: m2.to, m2IsBar, m2FromStr})
      // #endregion
      
      const sameChecker = m2.from === m1.to
      if (sameChecker && !m1.hitBlot) {
        // Sequence: check if final move hits a blot
        const asterisk = m2.hitBlot ? '*' : ''
        const m2ToStr = formatTo(m2)
        return `${m1FromStr}/${m2ToStr}${asterisk}`
      }
      // Check if both moves are identical
      if (m1.from === m2.from && m1.to === m2.to) {
        const asterisk = m1.hitBlot ? '*' : ''
        const m1ToStr = formatTo(m1)
        return `${m1FromStr}/${m1ToStr}(2)${asterisk}`
      }
      if (!sameChecker) {
        // m1 and m2 are already sorted (bar moves first), so use them directly
        // Use space separator for consistency with 3+ moves format
        const firstAsterisk = m1.hitBlot ? '*' : ''
        const secondAsterisk = m2.hitBlot ? '*' : ''
        const m1ToStr = formatTo(m1)
        const m2ToStr = formatTo(m2)
        const description = `${m1FromStr}/${m1ToStr}${firstAsterisk} ${m2FromStr}/${m2ToStr}${secondAsterisk}`
        // #region agent log
        debugFetchLog('getLegalMoves.js:298', 'buildDescription result', {description, m1IsBar, m2IsBar, m1From: m1.from, m2From: m2.from})
        // #endregion
        return description
      }
      // For sequences, m1 is already first (bar moves sorted first)
      const m1ToStr = formatTo(m1)
      const m2ToStr = formatTo(m2)
      const a = `${m1FromStr}/${m1ToStr}${m1.hitBlot ? '*' : ''}`
      const b = `${m2FromStr}/${m2ToStr}${m2.hitBlot ? '*' : ''}`
      return `${a} ${b}`
    }
    
    // For 3+ moves, group identical moves (even if not consecutive) and format
    // First, check for sequences (same checker moving)
    // Use sorted moves so bar moves come first
    const sequences = []
    const remainingMoves = [...sortedMoves]
    let i = 0
    
    // Find sequences first
    while (i < remainingMoves.length) {
      const currentMove = remainingMoves[i]
      let sequenceEnd = i
      let sequenceTo = currentMove.to
      
      // Look for consecutive moves with same checker
      for (let j = i + 1; j < remainingMoves.length; j++) {
        const nextMove = remainingMoves[j]
        if (nextMove.from === sequenceTo && !currentMove.hitBlot) {
          sequenceEnd = j
          sequenceTo = nextMove.to
        } else {
          break
        }
      }
      
      if (sequenceEnd > i) {
        // Found a sequence
        const sequenceMoves = remainingMoves.slice(i, sequenceEnd + 1)
        // Check if any move in the sequence hits a blot (usually the last one)
        const hitsBlot = sequenceMoves.some(m => m.hitBlot)
        sequences.push({
          from: currentMove.from,
          to: sequenceTo,
          moves: sequenceMoves,
          isSequence: true,
          hitBlot: hitsBlot
        })
        remainingMoves.splice(i, sequenceEnd - i + 1)
      } else {
        i++
      }
    }
    
    // Group remaining identical moves (not sequences)
    // Compare moves by from/to AND hitBlot status
    // Normalize bear-off moves: both 0 (white) and 25 (black) should be treated as "off" for grouping
    const moveGroups = new Map()
    for (const move of remainingMoves) {
      // Check if this is a bear-off move
      const isBearOffMove = move.isBearOff || (move.from >= 1 && move.from <= 24 && (move.to === 0 || move.to === 25) && !move.fromBar)
      // For grouping, use "off" as the destination for all bear-off moves
      const groupingTo = isBearOffMove ? 'off' : move.to
      // Include hitBlot in key to group moves with same from/to/hitBlot together
      const key = `${move.from}/${groupingTo}:${move.hitBlot ? 'hit' : 'safe'}`
      if (!moveGroups.has(key)) {
        // Store the original to value (0 or 25) for bear-off, or the actual to for regular moves
        moveGroups.set(key, { 
          from: move.from, 
          to: isBearOffMove ? move.to : move.to, // Keep original to value for formatting
          isBearOff: isBearOffMove,
          hitBlot: move.hitBlot, 
          count: 0 
        })
      }
      moveGroups.get(key).count++
    }
    
    // Combine sequences and grouped moves
    const parts = []
    
    // Add sequences first (they represent single checker movements)
    for (const seq of sequences) {
      const asterisk = seq.hitBlot ? '*' : ''
      const fromStr = (seq.from === 25 || seq.from === 0) ? 'bar' : seq.from
      // Check if sequence ends with bear-off
      const toStr = (seq.to === 0 || seq.to === 25) ? 'off' : seq.to
      parts.push(`${fromStr}/${toStr}${asterisk}`)
    }
    
    // Add grouped moves, sorted by highest starting point first
    // Treat bar (25 or 0) as highest for sorting
    const groupedMoves = Array.from(moveGroups.values()).sort((a, b) => {
      const aFrom = (a.from === 25 || a.from === 0) ? 25 : a.from
      const bFrom = (b.from === 25 || b.from === 0) ? 25 : b.from
      if (aFrom !== bFrom) return bFrom - aFrom
      return b.to - a.to
    })
    
    for (const group of groupedMoves) {
      const asterisk = group.hitBlot ? '*' : ''
      const fromStr = (group.from === 25 || group.from === 0) ? 'bar' : group.from
      // Check if this is a bear-off move (to is 0 or 25, and from is 1-24)
      const toStr = (group.isBearOff || (group.from >= 1 && group.from <= 24 && (group.to === 0 || group.to === 25))) ? 'off' : group.to
      if (group.count > 1) {
        parts.push(`${fromStr}/${toStr}(${group.count})${asterisk}`)
      } else {
        parts.push(`${fromStr}/${toStr}${asterisk}`)
      }
    }
    
    return parts.join(' ')
  }

  const buildKey = moves => {
    // Create a unique key based on the exact move sequence
    // Don't collapse sequences - keep all legal move combinations
    const keyParts = moves.map(m => `${m.from}/${m.to}`)
    return keyParts.join('>')
  }

  // Track total combinations generated to prevent explosion
  let totalCombinationsGenerated = 0
  let totalCallsMade = 0
  const MAX_COMBINATIONS = 200 // Much lower limit to prevent hangs
  const MAX_CALLS = 1000 // Lower limit for recursive calls
  
  // Recursive function to generate all move combinations
  const generateCombinations = (currentState, remainingDice, currentMoves = [], seenKeys = new Set(), depth = 0) => {
    // Increment call counter at entry
    totalCallsMade++
    
    // Safety check: prevent call explosion (check early to catch recursion before it gets too deep)
    if (totalCallsMade >= MAX_CALLS) {
      // #region agent log
      debugFetchLog('getLegalMoves.js:395', 'MAX CALLS EXCEEDED', {totalCallsMade, MAX_CALLS, depth, remainingDiceLength: remainingDice.length})
      // #endregion
      console.warn('generateCombinations: Maximum calls limit reached', { totalCallsMade, depth })
      return []
    }
    
    // Safety check: prevent infinite recursion
    // Lower depth limit for doubles (4 dice) to prevent exponential explosion
    const maxDepth = remainingDice.length >= 4 ? 4 : 8
    if (depth > maxDepth) {
      // #region agent log
      debugFetchLog('getLegalMoves.js:388', 'MAX DEPTH EXCEEDED', {depth, maxDepth, remainingDiceLength: remainingDice.length, remainingDice, currentMovesLength: currentMoves.length})
      // #endregion
      console.error('generateCombinations: Maximum depth exceeded', { depth, maxDepth, remainingDice, currentMoves })
      return []
    }
    
    // Safety check: prevent combination explosion
    if (totalCombinationsGenerated >= MAX_COMBINATIONS) {
      // #region agent log
      debugFetchLog('getLegalMoves.js:409', 'MAX COMBINATIONS EXCEEDED', {totalCombinationsGenerated, MAX_COMBINATIONS, depth, remainingDiceLength: remainingDice.length})
      // #endregion
      console.warn('generateCombinations: Maximum combinations limit reached', { totalCombinationsGenerated, depth })
      return []
    }
    
    // #region agent log
    debugFetchLog('getLegalMoves.js:365', 'generateCombinations entry', { depth, remainingDiceLength: remainingDice.length, remainingDice, currentMovesLength: currentMoves.length, currentMoves: currentMoves.map(m => ({ from: m.from, to: m.to, die: m.die })), barCount: owner === 'white' ? currentState.whiteBar : currentState.blackBar })
    // #endregion
    
    if (remainingDice.length === 0) {
      if (currentMoves.length > 0) {
        const key = buildKey(currentMoves)
        if (seenKeys.has(key)) {
          return [] // Skip duplicates
        }
        seenKeys.add(key)
        totalCombinationsGenerated++
        // Sort moves so bar moves come first (matching the description order)
        const isBarMoveForSort = (move) => move.fromBar || move.from === 25 || move.from === 0
        const sortedMovesForCombination = [...currentMoves].sort((a, b) => {
          const aIsBar = isBarMoveForSort(a)
          const bIsBar = isBarMoveForSort(b)
          if (aIsBar && !bIsBar) return -1
          if (!aIsBar && bIsBar) return 1
          const aFrom = aIsBar ? 25 : a.from
          const bFrom = bIsBar ? 25 : b.from
          if (aFrom !== bFrom) return bFrom - aFrom
          return b.to - a.to
        })
        
        const finalDescription = buildDescription(sortedMovesForCombination)
        
        // #region agent log
        debugFetchLog('getLegalMoves.js:375', 'generateCombinations returning complete combination', { movesLength: currentMoves.length, originalMoves: currentMoves.map(m => ({ from: m.from, to: m.to, die: m.die, fromBar: m.fromBar })), sortedMoves: sortedMovesForCombination.map(m => ({ from: m.from, to: m.to, die: m.die, fromBar: m.fromBar })), finalDescription })
        // #endregion
        
        return [{
          moves: currentMoves, // Keep in execution order
          description: finalDescription,
          totalPips: currentMoves.reduce((sum, m) => sum + (m.die || 0), 0)
        }]
      }
      return []
    }

    const combinations = []
    
    // Check if we still need to enter from bar
    // If the turn started with checkers on bar, must enter ALL before moving other checkers
    const currentBarCount = owner === 'white' ? currentState.whiteBar : currentState.blackBar
    const turnStartedWithBarCheckers = turnState.mustEnterFromBar === true
    const stillMustEnterFromBar = turnStartedWithBarCheckers && currentBarCount > 0
    
    // #region agent log
    debugFetchLog('getLegalMoves.js:390', 'Checking bar status', {currentBarCount, stillMustEnterFromBar, remainingDice})
    // #endregion
    
    // Get available points (or bar if must enter)
    let playerPoints
    try {
      playerPoints = stillMustEnterFromBar ? [25] : getPlayerPoints(currentState) // 25 represents bar
    } catch (error) {
      console.error('getPlayerPoints error:', error)
      // #region agent log
      debugFetchLog('getLegalMoves.js:427', 'getPlayerPoints error', {error: error.message, stillMustEnterFromBar})
      // #endregion
      return []
    }
    
    // Enforce bearing off rule: if highest occupied point < lowest unused die, must bear off from highest point
    const canBearOffNow = canBearOff(currentState, owner)
    if (canBearOffNow && !stillMustEnterFromBar && playerPoints.length > 0) {
      const highestPoint = getHighestOccupiedPoint(currentState, owner)
      if (highestPoint !== null && remainingDice.length > 0) {
        const lowestDie = Math.min(...remainingDice)
        
        // Convert highest point to relative coordinates for comparison
        const highestPointRelative = owner === 'white' ? highestPoint : (25 - highestPoint)
        
        if (lowestDie > highestPointRelative) {
          // MUST bear off from highest point - only allow moves from that point
          playerPoints = [highestPoint]
        }
      }
    }
    
    // #region agent log
    debugFetchLog('getLegalMoves.js:435', 'Player points determined', {stillMustEnterFromBar, playerPointsLength: playerPoints.length, playerPoints, depth, canBearOffNow, highestPoint: canBearOffNow ? getHighestOccupiedPoint(currentState, owner) : null, lowestDie: remainingDice.length > 0 ? Math.min(...remainingDice) : null})
    // #endregion
    
    // Try each unique die value (but we'll remove one instance at a time)
    const uniqueDieValues = [...new Set(remainingDice)]
    // Limit player points to prevent explosion (try up to 8 points per die)
    const MAX_POINTS_PER_DIE = 8
    const limitedPlayerPoints = playerPoints.slice(0, MAX_POINTS_PER_DIE)
    
    for (const dieValue of uniqueDieValues) {
      // Early termination if we've hit the limits
      if (totalCombinationsGenerated >= MAX_COMBINATIONS || totalCallsMade >= MAX_CALLS) break
      
      for (const point of limitedPlayerPoints) {
        // Early termination if we've hit the limits
        if (totalCombinationsGenerated >= MAX_COMBINATIONS || totalCallsMade >= MAX_CALLS) break
        // For bar moves, check if entry is valid
        if (stillMustEnterFromBar && point === 25) {
          const move = canEnterFromBar(currentState, dieValue)
          // #region agent log
          debugFetchLog('getLegalMoves.js:402', 'Trying bar move', { dieValue, hasMove: !!move, move: move ? { from: move.from, to: move.to, die: move.die, owner: move.owner } : null })
          // #endregion
          if (!move) continue
          
          // CRITICAL: Set move.owner before applying move (canEnterFromBar doesn't set it)
          if (!move.owner) {
            move.owner = owner
          }
          const toData = currentState.points[move.to - 1]
          move.hitBlot = toData.count === 1 && toData.owner && toData.owner !== owner
          
          // Apply move to get new state
          // #region agent log
          debugFetchLog('getLegalMoves.js:432', 'Before applying bar move', {moveOwner: move.owner, moveFrom: move.from, moveFromBar: move.fromBar, currentBarCount: owner === 'white' ? currentState.whiteBar : currentState.blackBar})
          // #endregion
          
          const newState = applyMoveToBoard(currentState, move)
          const newMoves = [...currentMoves, move]
          
          // #region agent log
          debugFetchLog('getLegalMoves.js:435', 'After bar move applied', {newBarCount: owner === 'white' ? newState.whiteBar : newState.blackBar, oldBarCount: owner === 'white' ? currentState.whiteBar : currentState.blackBar, remainingDiceBefore: remainingDice, moveOwner: move.owner})
          // #endregion
          
          // Remove one instance of this die from remaining dice
          const newRemainingDice = [...remainingDice]
          const dieIndex = newRemainingDice.indexOf(dieValue)
          if (dieIndex !== -1) {
            newRemainingDice.splice(dieIndex, 1)
          }
          
          // #region agent log
          debugFetchLog('getLegalMoves.js:418', 'Recursing after bar move', {newRemainingDiceLength: newRemainingDice.length, newRemainingDice, newMovesLength: newMoves.length})
          // #endregion
          
          // Recursively generate combinations with remaining dice
          const subCombinations = generateCombinations(newState, newRemainingDice, newMoves, seenKeys, depth + 1)
          // #region agent log
          debugFetchLog('getLegalMoves.js:423', 'Sub-combinations returned', { subCombinationsLength: subCombinations.length, subCombinations: subCombinations.map(c => ({ movesLength: c.moves.length, description: c.description })) })
          // #endregion
          combinations.push(...subCombinations)
        } else {
          // Regular move from point
          const move = buildMove(currentState, point, dieValue)
          if (!move) continue
          
          // Apply move to get new state
          const newState = applyMoveToBoard(currentState, move)
          const newMoves = [...currentMoves, move]
          
          // Remove one instance of this die from remaining dice
          const newRemainingDice = [...remainingDice]
          const dieIndex = newRemainingDice.indexOf(dieValue)
          if (dieIndex !== -1) {
            newRemainingDice.splice(dieIndex, 1)
          }
          
          // Recursively generate combinations with remaining dice
          const subCombinations = generateCombinations(newState, newRemainingDice, newMoves, seenKeys, depth + 1)
          combinations.push(...subCombinations)
        }
      }
    }

    // Don't add partial combinations - only return complete combinations that use all dice
    // This ensures players must use as many dice as possible

    // #region agent log
    debugFetchLog('getLegalMoves.js:444', 'generateCombinations returning', { combinationsLength: combinations.length, combinations: combinations.map(c => ({ movesLength: c.moves.length, description: c.description, isComplete: c.isComplete })) })
    // #endregion

    return combinations
  }

  // #region agent log
  debugFetchLog('getLegalMoves.js:527', 'Before generateCombinations call', {availableDice, barCount, owner, availableDiceLength: availableDice.length})
  // #endregion
  
  // Generate all combinations (with limits built into generateCombinations)
  const allCombos = generateCombinations(boardState, availableDice, [], new Set(), 0)
  
  // #region agent log
  debugFetchLog('getLegalMoves.js:527', 'After generateCombinations call', {allCombosLength: allCombos.length})
  // #endregion

  // Helper function to check if a die can be fully used from a board state
  const canDieBeFullyUsed = (state, owner, die) => {
    const currentPlayer = owner === 'white' ? 1 : -1

    // Check if die can be used for bar entry (highest priority when must enter from bar)
    const barCount = owner === 'white' ? state.whiteBar : state.blackBar
    if (barCount > 0) {
      // Inline bar entry check
      let entryPoint
      if (owner === 'white') {
        entryPoint = 25 - die
      } else {
        entryPoint = die
      }

      if (entryPoint >= 1 && entryPoint <= 24) {
        const toData = state.points[entryPoint - 1]
        if (
          toData.count === 0 ||
          toData.owner === owner ||
          (toData.count === 1 && toData.owner !== owner)
        ) {
          // Can enter from bar with this die
          return true
        }
      }
      // If must enter from bar but this die can't be used for entry, it can't be used at all
      return false
    }

    // Check if die can bear off from point equal to die value (in relative coordinates)
    if (canBearOff(state, owner)) {
      const homeBoardStart = owner === 'white' ? 1 : 19
      const homeBoardEnd = owner === 'white' ? 6 : 24
      const absolutePoint = owner === 'white' ? die : (25 - die)

      if (absolutePoint >= homeBoardStart && absolutePoint <= homeBoardEnd) {
        const pointData = state.points[absolutePoint - 1]
        if (pointData.owner === owner && pointData.count > 0) {
          // Can bear off from point equal to die value
          return true
        }
      }
    }

    // Check if die can be used for a regular move (not bear-off)
    const playerPoints = getPlayerPoints(state)
    for (const fromPoint of playerPoints) {
      const move = canMakeMove(state, owner, currentPlayer, fromPoint, die)
      if (move && !move.isBearOff) {
        // Can make a regular move using full die value
        return true
      }
    }

    return false
  }
  
  // Filter out combinations that don't use all dice fully when they can be
  // Rule: If the full value of a die can be used, it must be used
  const validCombos = []
  for (const combo of allCombos) {
    // Check if all dice were used
    const usedDiceInCombo = combo.moves.map(m => m.die)
    const allDiceUsed = availableDice.every(die => {
      const countInCombo = usedDiceInCombo.filter(d => d === die).length
      const countAvailable = availableDice.filter(d => d === die).length
      return countInCombo === countAvailable
    })
    
    if (!allDiceUsed) {
      // Not all dice were used - check if any unused die could have been fully used from original board state
      const unusedDice = []
      for (const die of availableDice) {
        const countInCombo = usedDiceInCombo.filter(d => d === die).length
        const countAvailable = availableDice.filter(d => d === die).length
        if (countInCombo < countAvailable) {
          // This die was not fully used - add remaining instances
          for (let i = 0; i < countAvailable - countInCombo; i++) {
            unusedDice.push(die)
          }
        }
      }
      
      // Check if any unused die could have been fully used from the ORIGINAL board state
      let hasUnusedFullyUsableDie = false
      for (const die of unusedDice) {
        if (canDieBeFullyUsed(boardState, owner, die)) {
          hasUnusedFullyUsableDie = true
          break
        }
      }
      
      if (hasUnusedFullyUsableDie) {
        continue // Skip this combo - it doesn't use a die that could be fully used
      }
    }
    
    validCombos.push(combo)
  }
  
  // Deduplicate combinations
  const unique = new Map()
  for (const combo of validCombos) {
    const key = buildKey(combo.moves)
    if (!unique.has(key)) {
      unique.set(key, combo)
    }
  }

  // #region agent log
  debugFetchLog('getLegalMoves.js:538', 'getLegalMoves before sorting', { uniqueSize: unique.size, firstFewMoves: Array.from(unique.values()).slice(0, 5).map(m => ({ movesLength: m.moves?.length || 1, description: m.description })) })
  // #endregion

  if (unique.size > 0) {
    // Sort combinations: multi-move combinations first (by number of moves descending), then by totalPips descending
    const sortedCombos = Array.from(unique.values()).sort((a, b) => {
      const aMoves = a.moves?.length || 1
      const bMoves = b.moves?.length || 1
      // First sort by number of moves (more moves = better)
      if (aMoves !== bMoves) {
        return bMoves - aMoves
      }
      // Then by total pips (more pips = better)
      return (b.totalPips || 0) - (a.totalPips || 0)
    })
    
    // #region agent log
    debugFetchLog('getLegalMoves.js:575', 'getLegalMoves after sorting', { sortedSize: sortedCombos.length, firstFewMoves: sortedCombos.slice(0, 5).map(m => ({ movesLength: m.moves?.length || 1, description: m.description, totalPips: m.totalPips })) })
    // #endregion
    
    return sortedCombos
  }

  // Fallback: try single moves if no combinations found
  // Check if we need to enter from bar
  const currentBarCount = owner === 'white' ? boardState.whiteBar : boardState.blackBar
  if (currentBarCount > 0) {
    // Try bar moves
    const sortedDice = [...availableDice].sort((a, b) => b - a)
    for (const die of sortedDice) {
      const move = canEnterFromBar(boardState, die)
      if (move) {
        moveCombinations.push({
          moves: [move],
          description: `bar/${move.to}`,
          totalPips: die
        })
        return moveCombinations
      }
    }
  }
  
  const playerPoints = getPlayerPoints(boardState)

  if (playerPoints.length === 0) return moveCombinations

  // Try each available die for single moves (important for bearing off)
  for (const die of availableDice) {
    for (const point of playerPoints) {
      const move = buildMove(boardState, point, die)
      if (move) {
        moveCombinations.push({
          moves: [move],
          description: `${point}/${move.to}`,
          totalPips: die
        })
        return moveCombinations
      }
    }
  }

  return moveCombinations
}

export { getLegalMoves, canMakeMove, applyMoveToBoard }
