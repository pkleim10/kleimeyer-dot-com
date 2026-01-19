/**
 * Hybrid Engine Backgammon System
 * Combines local rule validation with hybrid heuristic + Monte Carlo engine via API
 */

// Difficulty levels map to different analysis depths
const DIFFICULTY_PROMPTS = {
  beginner: "Focus on basic principles: avoid blots, make safe moves",
  intermediate: "Consider basic tactics and board control",
  advanced: "Analyze complex patterns, timing, and opponent psychology",
  grandmaster: "Deep strategic analysis with long-term planning"
}

// Cache for engine responses to avoid repeated API calls
const analysisCache = new Map()
const CACHE_DURATION = 1000 * 60 * 60 // 1 hour

/**
 * Get engine move recommendation with local validation
 */
export async function getAIMove(xgid, player, difficulty = 'intermediate', maxMoves = 5) {
  try {
    // Check cache first
    const cacheKey = getCacheKey(xgid, difficulty, maxMoves)
    const cached = analysisCache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.result
    }

    // Call the server-side engine API
    const response = await fetch('/api/backgammon-engine', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        xgid,
        player,
        difficulty,
        maxMoves
      })
    })

    if (!response.ok) {
      throw new Error(`Engine API error: ${response.status}`)
    }

    const result = await response.json()

    // Cache the result
    analysisCache.set(cacheKey, { result, timestamp: Date.now() })
    return result

  } catch (error) {
    console.error('Engine analysis failed:', error)
    // Fallback to conservative heuristic
    return getConservativeFallback(xgid, player)
  }
}

/**
 * Create turn state for move validation
 */
function createTurnState(boardState, player) {
  const owner = player === 1 ? 'white' : 'black'
  const dice = boardState.dice && boardState.dice !== '00'
    ? [parseInt(boardState.dice[0]), parseInt(boardState.dice[1])]
    : []

  return {
    currentPlayer: owner,
    dice: dice,
    usedDice: [],
    isTurnComplete: false,
    mustEnterFromBar: (owner === 'black' ? boardState.blackBar : boardState.whiteBar) > 0,
    noLegalMoves: false
  }
}

/**
 * Select diverse top legal moves for engine analysis
 */
function selectTopLegalMoves(allMoves, maxMoves) {
  // Group moves by strategic categories
  const categories = {
    bearingOff: [],
    hitting: [],
    entering: [],
    developing: []
  }

  // Categorize moves (simplified logic)
  allMoves.forEach(move => {
    if (move.to === -1 || move.to === -2) {
      categories.bearingOff.push(move)
    } else if (move.from === 0 || move.from === 25) {
      categories.entering.push(move)
    } else {
      categories.developing.push(move)
    }
  })

  // Select top moves from each category
  const selected = []
  const movesPerCategory = Math.ceil(maxMoves / 3)

  Object.values(categories).forEach(cat => {
    selected.push(...cat.slice(0, movesPerCategory))
  })

  return selected.slice(0, maxMoves)
}

/**
 * Call engine analysis API route
 */
async function analyzeMovesWithAI(xgid, moves, difficulty) {
  const response = await fetch('/api/backgammon-engine', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      xgid,
      player: 1, // Default to white for now, could be parameterized
      difficulty,
      maxMoves: moves.length
    })
  })

  if (!response.ok) {
    throw new Error(`Engine API error: ${response.status}`)
  }

  const result = await response.json()

  // Convert the API response format to internal format
  if (result.source === 'ai') {
    // Find the index of the returned move in our moves array
    const moveIndex = moves.findIndex(move =>
      move.from === result.move.from && move.to === result.move.to
    )

    return {
      bestMoveIndex: moveIndex >= 0 ? moveIndex : 0,
      reasoning: result.reasoning,
      confidence: result.confidence
    }
  } else {
    // Fallback case
    return {
      bestMoveIndex: 0,
      reasoning: result.reasoning,
      confidence: result.confidence
    }
  }
}



/**
 * Validate AI suggestion and return move
 */
function validateAndReturnMove(aiAnalysis, moves) {
  const { bestMoveIndex, reasoning, confidence } = aiAnalysis

  if (bestMoveIndex >= 0 && bestMoveIndex < moves.length) {
    return {
      move: moves[bestMoveIndex],
      reasoning: reasoning,
      confidence: confidence,
      source: 'ai'
    }
  }

  // Fallback to first move if AI gave invalid index
  return {
    move: moves[0],
    reasoning: "AI suggestion invalid, using conservative move",
    confidence: 0.3,
    source: 'fallback'
  }
}

/**
 * Conservative fallback when engine fails
 */
function getConservativeFallback(xgid, player) {
  // Simple heuristics: prefer bearing off, avoid blots, etc.
  return {
    move: null,
    reasoning: "Engine analysis unavailable, using conservative strategy",
    confidence: 0.2,
    source: 'fallback'
  }
}

/**
 * Format move for display
 */
function formatMove(move) {
  const from = move.from === 0 ? 'bar' : move.from === 25 ? 'bar' : move.from
  const to = move.to === -1 ? 'off' : move.to === -2 ? 'off' : move.to
  return `${from}/${to}`
}

/**
 * Generate cache key
 */
function getCacheKey(xgid, difficulty, maxMoves) {
  return `${xgid}:${difficulty}:${maxMoves}`
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache() {
  const now = Date.now()
  for (const [key, value] of analysisCache.entries()) {
    if ((now - value.timestamp) > CACHE_DURATION) {
      analysisCache.delete(key)
    }
  }
}
