/**
 * Backgammon AI Analysis API Route
 * Provides server-side AI analysis with access to environment variables
 */

const XAI_API_URL = 'https://api.x.ai/v1/chat/completions'

// Helper functions copied from xgidParser.js
function charToCount(char) {
  if (char === '-') return 0
  if (char >= 'a' && char <= 'o') {
    // Lowercase: BLACK checkers, a=1, b=2, ..., o=15
    return char.charCodeAt(0) - 'a'.charCodeAt(0) + 1
  }
  if (char >= 'A' && char <= 'O') {
    // Uppercase: WHITE checkers, A=1, B=2, ..., O=15
    return char.charCodeAt(0) - 'A'.charCodeAt(0) + 1
  }
  return 0
}

function charToOwner(char) {
  if (char === '-') return null
  if (char >= 'a' && char <= 'o') return 'black'
  if (char >= 'A' && char <= 'O') return 'white'
  return null
}

function parseXGID(xgid) {
  if (!xgid || typeof xgid !== 'string') {
    return {
      blackBar: 0,
      whiteBar: 0,
      points: Array(24).fill({ count: 0, owner: null }),
      cubeValue: undefined,
      cubeOwner: undefined,
      player: undefined,
      dice: undefined
    }
  }

  const parts = xgid.split(':')
  const xg1 = parts[0] || ''
  const xg2 = parts[1]
  const xg3 = parts[2]
  const xg4 = parts[3]
  const xg5 = parts[4]

  if (xg1.length !== 26) {
    console.warn(`Invalid xg1 length: expected 26, got ${xg1.length}`)
    return {
      blackBar: 0,
      whiteBar: 0,
      points: Array(24).fill({ count: 0, owner: null }),
      cubeValue: undefined,
      cubeOwner: undefined,
      player: undefined,
      dice: undefined
    }
  }

  const blackBar = charToCount(xg1[0])

  const points = []
  for (let i = 1; i <= 24; i++) {
    const char = xg1[i]
    const count = charToCount(char)
    const owner = charToOwner(char)
    points.push({ count, owner })
  }

  const whiteBar = charToCount(xg1[25])

  let cubeValue = undefined
  if (xg2 !== undefined && xg2 !== '') {
    const parsed = parseInt(xg2, 10)
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 6) {
      cubeValue = parsed
    }
  }

  let cubeOwner = undefined
  if (xg3 !== undefined && xg3 !== '') {
    const parsed = parseInt(xg3, 10)
    if (!isNaN(parsed) && (parsed === -1 || parsed === 0 || parsed === 1)) {
      cubeOwner = parsed
    }
  }

  let player = undefined
  if (xg4 !== undefined && xg4 !== '') {
    const parsed = parseInt(xg4, 10)
    if (!isNaN(parsed) && (parsed === -1 || parsed === 1)) {
      player = parsed
    }
  }

  let dice = undefined
  if (xg5 !== undefined && xg5 !== '') {
    if (/^\d{2}$/.test(xg5)) {
      dice = xg5
    }
  }

  return {
    blackBar,
    whiteBar,
    points,
    cubeValue,
    cubeOwner,
    player,
    dice
  }
}

// Generate move combinations that use both dice when possible
function getLegalMoves(boardState, turnState) {
  const moveCombinations = []

  if (!turnState || !turnState.currentPlayer || turnState.dice.length === 0) {
    return moveCombinations
  }

  const owner = turnState.currentPlayer
  const currentPlayer = owner === 'white' ? 1 : -1
  const dice = [...turnState.dice].sort((a, b) => b - a) // Sort dice descending for better combinations

  // Get points with current player's checkers
  const playerPoints = []
  for (let point = 1; point <= 24; point++) {
    const pointData = boardState.points[point - 1]
    if (pointData.owner === owner && pointData.count > 0) {
      playerPoints.push(point)
    }
  }

  if (playerPoints.length === 0) return moveCombinations

  const [die1, die2] = dice

  // Generate combinations using both dice
  // Try different strategies:

  // 1. Move same checker twice (if possible)
  for (const point of playerPoints) {
    const move1 = canMakeMove(boardState, owner, currentPlayer, point, die1)
    if (move1) {
      // Create a temporary board state after first move
      const tempBoard = applyMoveToBoard(boardState, move1)
      const move2 = canMakeMove(tempBoard, owner, currentPlayer, move1.to, die2)
      if (move2) {
        moveCombinations.push({
          moves: [move1, move2],
          description: `${point}/${move1.to}, ${move1.to}/${move2.to}`,
          totalPips: die1 + die2
        })
      }
    }
  }

  // 2. Move different checkers with each die
  if (playerPoints.length >= 2) {
    for (let i = 0; i < playerPoints.length; i++) {
      for (let j = 0; j < playerPoints.length; j++) {
        if (i === j) continue // Skip same checker

        const move1 = canMakeMove(boardState, owner, currentPlayer, playerPoints[i], die1)
        if (move1) {
          const tempBoard = applyMoveToBoard(boardState, move1)
          const move2 = canMakeMove(tempBoard, owner, currentPlayer, playerPoints[j], die2)
          if (move2) {
            moveCombinations.push({
              moves: [move1, move2],
              description: `${playerPoints[i]}/${move1.to}, ${playerPoints[j]}/${move2.to}`,
              totalPips: die1 + die2
            })
          }
        }
      }
    }
  }

  // 3. If no combinations work, generate partial moves (using one die only)
  if (moveCombinations.length === 0) {
    // Try to use the larger die first
    for (const point of playerPoints) {
      const move = canMakeMove(boardState, owner, currentPlayer, point, die1)
      if (move) {
        moveCombinations.push({
          moves: [move],
          description: `${point}/${move.to}`,
          totalPips: die1
        })
        break
      }
    }

    // If that doesn't work, try the smaller die
    if (moveCombinations.length === 0) {
      for (const point of playerPoints) {
        const move = canMakeMove(boardState, owner, currentPlayer, point, die2)
        if (move) {
          moveCombinations.push({
            moves: [move],
            description: `${point}/${move.to}`,
            totalPips: die2
          })
          break
        }
      }
    }
  }

  return moveCombinations
}

// Helper function to check if a move is valid
function canMakeMove(boardState, owner, currentPlayer, fromPoint, die) {
  const direction = currentPlayer === 1 ? -1 : 1 // White moves down, black moves up
  const toPoint = fromPoint + (direction * die)

  if (toPoint < 1 || toPoint > 24) return null

  const fromData = boardState.points[fromPoint - 1]
  const toData = boardState.points[toPoint - 1]

  // Must have checker on from point
  if (fromData.owner !== owner || fromData.count === 0) return null

  // Can move to empty point or hit single opponent checker
  if (toData.count === 0 || (toData.count === 1 && toData.owner !== owner)) {
    return {
      from: fromPoint,
      to: toPoint,
      count: 1,
      die: die
    }
  }

  return null
}

// Helper function to apply a move to board state (for checking subsequent moves)
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
    const aiAnalysis = await analyzeMovesWithAI(xgid, topMoves, difficulty, player)

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
 * Select diverse top legal move combinations for AI analysis
 */
function selectTopLegalMoves(allMoves, maxMoves) {
  // For now, just return the best combinations
  // In a full implementation, this would prioritize by strategic value
  return allMoves.slice(0, Math.min(maxMoves, allMoves.length))
}

/**
 * Call xAI for strategic analysis
 */
async function analyzeMovesWithAI(xgid, moves, difficulty, player) {
  const XAI_API_KEY = process.env.XAI_API_KEY

  const prompt = buildAnalysisPrompt(xgid, moves, difficulty, player)

  const response = await fetch(XAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'grok-4-1-fast-non-reasoning',
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
function buildAnalysisPrompt(xgid, moves, difficulty, player) {
  // Parse XGID to get player and dice info
  const parts = xgid.split(':')
  const playerNum = parseInt(parts[3] || '1')
  const dice = parts[4] || '00'
  const playerColor = playerNum === 1 ? 'WHITE' : 'BLACK'
  const opponentColor = playerNum === 1 ? 'BLACK' : 'WHITE'

  const moveList = moves.map((move, i) =>
    `${i + 1}. ${formatMove(move)}`
  ).join('\n')

  return `You are a ${difficulty} level backgammon expert analyzing from ${playerColor}'s perspective.

Current position:
XGID: ${xgid}
${playerColor} to move with dice: ${dice}

Legal moves to consider:
${moveList}

IMPORTANT: 
- You are playing as ${playerColor}, so analyze from ${playerColor}'s viewpoint
- ${playerColor} must use both dice when possible (unless blocked)
- Points are numbered 1-24 from ${playerColor}'s perspective
- Higher point numbers are closer to ${playerColor}'s home board

Focus on: blot safety, board control, timing, race position, and using both dice efficiently.

Respond with format:
BEST_MOVE: [move number]
REASONING: [2-3 sentence strategic analysis from ${playerColor}'s perspective]
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
 * Validate AI suggestion and return move combination
 */
function validateAndReturnMove(aiAnalysis, moves) {
  const { bestMoveIndex, reasoning, confidence } = aiAnalysis

  if (bestMoveIndex >= 0 && bestMoveIndex < moves.length) {
    const selectedCombination = moves[bestMoveIndex]
    return {
      move: selectedCombination,
      reasoning: reasoning,
      confidence: confidence,
      source: 'ai'
    }
  }

  // Fallback to first combination if AI gave invalid index
  return {
    move: moves[0],
    reasoning: "AI suggestion invalid, using conservative move combination",
    confidence: 0.3,
    source: 'fallback'
  }
}

/**
 * Format move for display
 */
function formatMove(move) {
  if (move.moves) {
    // This is a combination of moves
    return move.description
  }
  const from = move.from === 0 ? 'bar' : move.from === 25 ? 'bar' : move.from
  const to = move.to === -1 ? 'off' : move.to === -2 ? 'off' : move.to
  return `${from}/${to}`
}
