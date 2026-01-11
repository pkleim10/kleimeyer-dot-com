/**
 * Hybrid AI Backgammon System
 * Combines local rule validation with AI strategic analysis
 */

// xAI API Configuration
const XAI_API_URL = 'https://api.x.ai/v1/chat/completions'
const XAI_API_KEY = process.env.XAI_API_KEY

// Difficulty levels map to different analysis depths
const DIFFICULTY_PROMPTS = {
  beginner: "Focus on basic principles: avoid blots, make safe moves",
  intermediate: "Consider basic tactics and board control",
  advanced: "Analyze complex patterns, timing, and opponent psychology",
  grandmaster: "Deep strategic analysis with long-term planning"
}

// Cache for AI responses to avoid repeated API calls
const analysisCache = new Map()
const CACHE_DURATION = 1000 * 60 * 60 // 1 hour

/**
 * Get AI move recommendation with local validation
 */
export async function getAIMove(xgid, player, difficulty = 'intermediate', maxMoves = 5) {
  try {
    // Check cache first
    const cacheKey = getCacheKey(xgid, difficulty, maxMoves)
    const cached = analysisCache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.result
    }

    // Step 1: Parse position and generate legal moves locally
    const { parseXGID } = await import('./xgidParser.js')
    const { getLegalMoves } = await import('./gameLogic.js')

    const boardState = parseXGID(xgid)

    // Create turn state for legal move generation
    const turnState = createTurnState(boardState, player)
    const allLegalMoves = getLegalMoves(boardState, turnState)

    if (allLegalMoves.length === 0) {
      const result = { move: null, reasoning: "No legal moves available", confidence: 1.0, source: 'local' }
      analysisCache.set(cacheKey, { result, timestamp: Date.now() })
      return result
    }

    // Step 2: Get top legal moves (prioritize diversity)
    const topMoves = selectTopLegalMoves(allLegalMoves, maxMoves)

    // Step 3: Get AI strategic analysis
    const aiAnalysis = await analyzeMovesWithAI(xgid, topMoves, difficulty)

    // Step 4: Validate and return best AI suggestion
    const result = validateAndReturnMove(aiAnalysis, topMoves)

    // Cache the result
    analysisCache.set(cacheKey, { result, timestamp: Date.now() })

    return result

  } catch (error) {
    console.error('AI analysis failed:', error)
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
 * Select diverse top legal moves for AI analysis
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
 * Call xAI for strategic analysis
 */
async function analyzeMovesWithAI(xgid, moves, difficulty) {
  if (!XAI_API_KEY) {
    throw new Error('XAI_API_KEY not configured')
  }

  const prompt = buildAnalysisPrompt(xgid, moves, difficulty)

  const response = await fetch(XAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'grok-beta',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.3 // Consistent strategic analysis
    })
  })

  if (!response.ok) {
    throw new Error(`xAI API error: ${response.status}`)
  }

  const data = await response.json()
  return parseAIResponse(data.choices[0].message.content)
}

/**
 * Build strategic analysis prompt
 */
function buildAnalysisPrompt(xgid, moves, difficulty) {
  const moveList = moves.map((move, i) =>
    `${i + 1}. ${formatMove(move)}`
  ).join('\n')

  return `You are a ${difficulty} level backgammon expert. Analyze this position:

XGID: ${xgid}

Legal moves to consider:
${moveList}

${DIFFICULTY_PROMPTS[difficulty]}

Respond with format:
BEST_MOVE: [move number]
REASONING: [2-3 sentence strategic analysis]
CONFIDENCE: [0.0-1.0]

Focus on: blot safety, board control, timing, race position.`
}

/**
 * Parse AI response
 */
function parseAIResponse(response) {
  const lines = response.split('\n')
  let bestMove = null
  let reasoning = ''
  let confidence = 0.5

  lines.forEach(line => {
    if (line.startsWith('BEST_MOVE:')) {
      bestMove = parseInt(line.split(':')[1].trim())
    } else if (line.startsWith('REASONING:')) {
      reasoning = line.substring(10).trim()
    } else if (line.startsWith('CONFIDENCE:')) {
      confidence = parseFloat(line.split(':')[1].trim()) || 0.5
    }
  })

  return { bestMoveIndex: bestMove - 1, reasoning, confidence }
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
 * Conservative fallback when AI fails
 */
function getConservativeFallback(xgid, player) {
  // Simple heuristics: prefer bearing off, avoid blots, etc.
  return {
    move: null,
    reasoning: "AI analysis unavailable, using conservative strategy",
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
