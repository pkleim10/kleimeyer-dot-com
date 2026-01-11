/**
 * Backgammon AI Analysis API Route
 * Provides server-side AI analysis with access to environment variables
 */

const XAI_API_URL = 'https://api.x.ai/v1/chat/completions'

export async function POST(request) {
  try {
    const { xgid, player, difficulty = 'intermediate', maxMoves = 5 } = await request.json()

    // Validate input
    if (!xgid) {
      return Response.json(
        { error: 'XGID is required' },
        { status: 400 }
      )
    }

    // Get API key from environment
    const XAI_API_KEY = process.env.XAI_API_KEY
    if (!XAI_API_KEY) {
      return Response.json(
        {
          move: null,
          reasoning: 'AI analysis not available - XAI_API_KEY not configured',
          confidence: 0.1,
          source: 'error'
        },
        { status: 200 }
      )
    }

    // Import game logic functions
    const { parseXGID, getLegalMoves } = await import('../../other-fun-stuff/backgammon-resources/opening-moves/utils/xgidParser.js')

    // Parse position and generate legal moves
    const boardState = parseXGID(xgid)

    // Create turn state for legal move generation
    const turnState = createTurnState(boardState, player)
    const allLegalMoves = getLegalMoves(boardState, turnState)

    if (allLegalMoves.length === 0) {
      return Response.json({
        move: null,
        reasoning: "No legal moves available",
        confidence: 1.0,
        source: 'local'
      })
    }

    // Get top legal moves for AI analysis
    const topMoves = selectTopLegalMoves(allLegalMoves, maxMoves)

    // Get AI strategic analysis
    const aiAnalysis = await analyzeMovesWithAI(xgid, topMoves, difficulty)

    // Validate and return best AI suggestion
    const result = validateAndReturnMove(aiAnalysis, topMoves)

    return Response.json(result)

  } catch (error) {
    console.error('Backgammon AI API error:', error)

    // Return fallback response
    return Response.json({
      move: null,
      reasoning: 'AI analysis failed due to server error',
      confidence: 0.1,
      source: 'error'
    }, { status: 200 })
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
  const XAI_API_KEY = process.env.XAI_API_KEY

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

Focus on: blot safety, board control, timing, race position.

Respond with format:
BEST_MOVE: [move number]
REASONING: [2-3 sentence strategic analysis]
CONFIDENCE: [0.0-1.0]`
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
 * Format move for display
 */
function formatMove(move) {
  const from = move.from === 0 ? 'bar' : move.from === 25 ? 'bar' : move.from
  const to = move.to === -1 ? 'off' : move.to === -2 ? 'off' : move.to
  return `${from}/${to}`
}
