/**
 * Legal Move Generation for Backgammon
 * Generates all legal move combinations for a given board state and dice roll
 */

/**
 * Helper function to check if a move is valid
 */
function canMakeMove(boardState, owner, currentPlayer, fromPoint, die) {
  const direction = currentPlayer === 1 ? -1 : 1 // White moves down, black moves up
  const toPoint = fromPoint + (direction * die)

  if (toPoint < 1 || toPoint > 24) return null

  const fromData = boardState.points[fromPoint - 1]
  const toData = boardState.points[toPoint - 1]

  // Must have checker on from point
  if (fromData.owner !== owner || fromData.count === 0) return null

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
    points: boardState.points.map(point => ({ ...point }))
  }

  const fromIndex = move.from - 1
  const toIndex = move.to - 1

  // Remove checker from source
  newBoard.points[fromIndex].count -= move.count
  if (newBoard.points[fromIndex].count === 0) {
    newBoard.points[fromIndex].owner = null
  }

  // Add checker to destination
  if (newBoard.points[toIndex].count === 0) {
    newBoard.points[toIndex].owner = move.owner || boardState.points[fromIndex].owner
    newBoard.points[toIndex].count = move.count
  } else if (newBoard.points[toIndex].count === 1 && newBoard.points[toIndex].owner !== (move.owner || boardState.points[fromIndex].owner)) {
    // Hit opponent's blot - move to bar
    const opponent = newBoard.points[toIndex].owner
    if (opponent === 'white') {
      newBoard.whiteBar += 1
    } else {
      newBoard.blackBar += 1
    }
    newBoard.points[toIndex].owner = move.owner || boardState.points[fromIndex].owner
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
  const moveCombinations = []

  if (!turnState || !turnState.currentPlayer || turnState.dice.length === 0) {
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

  const getPlayerPoints = state => {
    const points = []
    for (let point = 1; point <= 24; point++) {
      const pointData = state.points[point - 1]
      if (pointData.owner === owner && pointData.count > 0) {
        points.push(point)
      }
    }
    return points
  }

  const buildMove = (state, fromPoint, die) => {
    const move = canMakeMove(state, owner, currentPlayer, fromPoint, die)
    if (!move) return null
    const toData = state.points[move.to - 1]
    move.owner = owner
    move.hitBlot = toData.count === 1 && toData.owner && toData.owner !== owner
    return move
  }

  const orderPair = (first, second) => {
    if (first.from !== second.from) {
      return first.from > second.from ? [first, second] : [second, first]
    }
    return first.to >= second.to ? [first, second] : [second, first]
  }

  const buildDescription = moves => {
    if (moves.length === 1) {
      const asterisk = moves[0].hitBlot ? '*' : ''
      return `${moves[0].from}/${moves[0].to}${asterisk}`
    }
    if (moves.length === 2) {
      const [m1, m2] = moves
      const sameChecker = m2.from === m1.to
      if (sameChecker && !m1.hitBlot) {
        // Sequence: check if final move hits a blot
        const asterisk = m2.hitBlot ? '*' : ''
        return `${m1.from}/${m2.to}${asterisk}`
      }
      // Check if both moves are identical
      if (m1.from === m2.from && m1.to === m2.to) {
        const asterisk = m1.hitBlot ? '*' : ''
        return `${m1.from}/${m1.to}(2)${asterisk}`
      }
      if (!sameChecker) {
        const [first, second] = orderPair(m1, m2)
        const firstAsterisk = first.hitBlot ? '*' : ''
        const secondAsterisk = second.hitBlot ? '*' : ''
        return `${first.from}/${first.to}${firstAsterisk}, ${second.from}/${second.to}${secondAsterisk}`
      }
      const a = `${m1.from}/${m1.to}${m1.hitBlot ? '*' : ''}`
      const b = `${m2.from}/${m2.to}${m2.hitBlot ? '*' : ''}`
      return `${a}, ${b}`
    }
    
    // For 3+ moves, group identical moves (even if not consecutive) and format
    // First, check for sequences (same checker moving)
    const sequences = []
    const remainingMoves = [...moves]
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
    const moveGroups = new Map()
    for (const move of remainingMoves) {
      // Include hitBlot in key to group moves with same from/to/hitBlot together
      const key = `${move.from}/${move.to}:${move.hitBlot ? 'hit' : 'safe'}`
      if (!moveGroups.has(key)) {
        moveGroups.set(key, { from: move.from, to: move.to, hitBlot: move.hitBlot, count: 0 })
      }
      moveGroups.get(key).count++
    }
    
    // Combine sequences and grouped moves
    const parts = []
    
    // Add sequences first (they represent single checker movements)
    for (const seq of sequences) {
      const asterisk = seq.hitBlot ? '*' : ''
      parts.push(`${seq.from}/${seq.to}${asterisk}`)
    }
    
    // Add grouped moves, sorted by highest starting point first
    const groupedMoves = Array.from(moveGroups.values()).sort((a, b) => {
      if (a.from !== b.from) return b.from - a.from
      return b.to - a.to
    })
    
    for (const group of groupedMoves) {
      const asterisk = group.hitBlot ? '*' : ''
      if (group.count > 1) {
        parts.push(`${group.from}/${group.to}(${group.count})${asterisk}`)
      } else {
        parts.push(`${group.from}/${group.to}${asterisk}`)
      }
    }
    
    return parts.join(' ')
  }

  const buildKey = moves => {
    if (moves.length === 1) {
      return `single:${moves[0].from}/${moves[0].to}`
    }
    if (moves.length === 2) {
      const [m1, m2] = moves
      const sameChecker = m2.from === m1.to
      if (sameChecker && m1.hitBlot) {
        return `seq:${m1.from}/${m1.to}>${m2.to}`
      }
      if (sameChecker) {
        return `single:${m1.from}/${m2.to}`
      }
      const [first, second] = orderPair(m1, m2)
      const a = `${first.from}/${first.to}`
      const b = `${second.from}/${second.to}`
      return `pair:${a}|${b}`
    }
    // For 3+ moves, create a key based on the sequence
    const keyParts = moves.map(m => `${m.from}/${m.to}`)
    return `multi:${keyParts.join('>')}`
  }

  // Recursive function to generate all move combinations
  const generateCombinations = (currentState, remainingDice, currentMoves = [], seenKeys = new Set()) => {
    if (remainingDice.length === 0) {
      if (currentMoves.length > 0) {
        const key = buildKey(currentMoves)
        if (seenKeys.has(key)) {
          return [] // Skip duplicates
        }
        seenKeys.add(key)
        return [{
          moves: currentMoves,
          description: buildDescription(currentMoves),
          totalPips: currentMoves.reduce((sum, m) => sum + (m.die || 0), 0)
        }]
      }
      return []
    }

    const combinations = []
    const playerPoints = getPlayerPoints(currentState)
    
    // Try each unique die value (but we'll remove one instance at a time)
    const uniqueDieValues = [...new Set(remainingDice)]
    for (const dieValue of uniqueDieValues) {
      for (const point of playerPoints) {
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
        const subCombinations = generateCombinations(newState, newRemainingDice, newMoves, seenKeys)
        combinations.push(...subCombinations)
      }
    }
    
    return combinations
  }

  // Generate all combinations
  const allCombos = generateCombinations(boardState, availableDice)

  // Deduplicate combinations
  const unique = new Map()
  for (const combo of allCombos) {
    const key = buildKey(combo.moves)
    if (!unique.has(key)) {
      unique.set(key, combo)
    }
  }

  if (unique.size > 0) {
    return Array.from(unique.values())
  }

  // Fallback: try single moves if no combinations found
  const playerPoints = getPlayerPoints(boardState)
  if (playerPoints.length === 0) return moveCombinations

  const sortedDice = [...availableDice].sort((a, b) => b - a)
  const [bigDie] = sortedDice

  for (const point of playerPoints) {
    const move = buildMove(boardState, point, bigDie)
    if (move) {
      moveCombinations.push({
        moves: [move],
        description: `${point}/${move.to}`,
        totalPips: bigDie
      })
      return moveCombinations
    }
  }

  return moveCombinations
}

export { getLegalMoves, canMakeMove, applyMoveToBoard }
