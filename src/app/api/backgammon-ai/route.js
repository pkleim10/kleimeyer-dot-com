/**
 * Backgammon AI Analysis API Route
 * Provides server-side AI analysis with access to environment variables
 */

const XAI_API_URL = 'https://api.x.ai/v1/chat/completions'
const XAI_MODEL = 'grok-4-fast-reasoning'
// Toggle for context-based weighting adjustments (easy on/off without code rollback)
const ENABLE_CONTEXT_ADJUSTMENTS = true

// Base factor weights (used to compute adjusted weights passed to AI)
const BASE_FACTOR_WEIGHTS = {
  H: 10,  // Hitting
  D: 9,   // Development
  S: 8,   // Safety
  P: 8,   // Pressure
  Dv: 7,  // Diversity
  T: 6,   // Timing
  F: 6    // Flexibility
}

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
  const dice = [...turnState.dice]
  const [die1, die2] = dice

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
      return `${moves[0].from}/${moves[0].to}`
    }
    const [m1, m2] = moves
    const sameChecker = m2.from === m1.to
    if (sameChecker && !m1.hitBlot) {
      return `${m1.from}/${m2.to}`
    }
    if (!sameChecker) {
      const [first, second] = orderPair(m1, m2)
      return `${first.from}/${first.to}, ${second.from}/${second.to}`
    }
    const a = `${m1.from}/${m1.to}`
    const b = `${m2.from}/${m2.to}`
    return `${a}, ${b}`
  }

  const buildKey = moves => {
    if (moves.length === 1) {
      return `single:${moves[0].from}/${moves[0].to}`
    }
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

  const diceOrders = die2 && die1 !== die2
    ? [[die1, die2], [die2, die1]]
    : [[die1, die2]]

  const allCombos = []
  for (const [firstDie, secondDie] of diceOrders) {
    const pointsFirst = getPlayerPoints(boardState)
    for (const point of pointsFirst) {
      const move1 = buildMove(boardState, point, firstDie)
      if (!move1) continue
      const tempBoard = applyMoveToBoard(boardState, move1)
      const pointsSecond = getPlayerPoints(tempBoard)
      for (const point2 of pointsSecond) {
        const move2 = buildMove(tempBoard, point2, secondDie)
        if (!move2) continue
        allCombos.push({
          moves: [move1, move2],
          description: buildDescription([move1, move2]),
          totalPips: firstDie + secondDie
        })
      }
    }
  }

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

  const playerPoints = getPlayerPoints(boardState)
  if (playerPoints.length === 0) return moveCombinations

  const sortedDice = [...dice].sort((a, b) => b - a)
  const [bigDie, smallDie] = sortedDice

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

  if (smallDie) {
    for (const point of playerPoints) {
      const move = buildMove(boardState, point, smallDie)
      if (move) {
        moveCombinations.push({
          moves: [move],
          description: `${point}/${move.to}`,
          totalPips: smallDie
        })
        break
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
    const { xgid, player, difficulty = 'advanced', maxMoves = 5, debug = false } = await request.json()

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

    // Collect debug information
    const debugInfo = debug ? {
      xgid,
      legalMoves: allLegalMoves.map(move => ({
        description: formatMove(move),
        totalPips: move.totalPips || 0
      })),
      prompt: '',
      response: ''
    } : null

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
    const aiAnalysis = await analyzeMovesWithAI(xgid, topMoves, difficulty, player, debugInfo)

    // Validate and return best AI suggestion
    const result = validateAndReturnMove(aiAnalysis, topMoves)

    if (!debugInfo) {
      delete result.factorScores
    }

    // Include debug info if requested
    if (debugInfo) {
      result.debug = debugInfo
    }

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
  const limit = Math.max(18, maxMoves)
  return allMoves.slice(0, Math.min(limit, allMoves.length))
}

// ============================================================================
// DETERMINISTIC ENGINE - Verified calculations for hybrid AI system
// ============================================================================

function cloneBoardState(boardState) {
  return {
    blackBar: boardState.blackBar,
    whiteBar: boardState.whiteBar,
    points: boardState.points.map(point => ({ ...point })),
    cubeValue: boardState.cubeValue,
    cubeOwner: boardState.cubeOwner,
    player: boardState.player,
    dice: boardState.dice
  }
}

function applyMoveToBoardForAnalysis(boardState, move, playerOwner) {
  const newState = cloneBoardState(boardState)
  const from = move.from
  const to = move.to

  // Remove checker from source (bar or point)
  if (from === 0 || from === 25) {
    if (playerOwner === 'white') {
      newState.whiteBar = Math.max(0, newState.whiteBar - 1)
    } else {
      newState.blackBar = Math.max(0, newState.blackBar - 1)
    }
  } else {
    const fromPoint = newState.points[from - 1]
    if (fromPoint.count > 0 && fromPoint.owner === playerOwner) {
      fromPoint.count -= 1
      if (fromPoint.count === 0) {
        fromPoint.owner = null
      }
    }
  }

  // Handle destination
  if (to >= 1 && to <= 24) {
    const toPoint = newState.points[to - 1]
    const opponentOwner = playerOwner === 'white' ? 'black' : 'white'

    // Hit opponent blot
    if (toPoint.count === 1 && toPoint.owner === opponentOwner) {
      toPoint.count = 0
      toPoint.owner = null
      if (opponentOwner === 'white') {
        newState.whiteBar += 1
      } else {
        newState.blackBar += 1
      }
    }

    if (toPoint.count === 0) {
      toPoint.owner = playerOwner
    }
    toPoint.count += 1
  }

  return newState
}

function calculateFinalBoardState(boardState, moves, playerOwner) {
  let state = cloneBoardState(boardState)
  for (const move of moves) {
    state = applyMoveToBoardForAnalysis(state, move, playerOwner)
  }
  return state
}

function identifyBlots(boardState, playerOwner) {
  const blots = []
  for (let point = 1; point <= 24; point++) {
    const pointData = boardState.points[point - 1]
    if (pointData.owner === playerOwner && pointData.count === 1) {
      blots.push(point)
    }
  }
  return blots
}

function identifyOpponentPositions(boardState, playerOwner) {
  const opponentOwner = playerOwner === 'white' ? 'black' : 'white'
  const positions = []
  for (let point = 1; point <= 24; point++) {
    const pointData = boardState.points[point - 1]
    if (pointData.owner === opponentOwner && pointData.count > 0) {
      positions.push({ point, count: pointData.count })
    }
  }
  return positions
}

function getMadePoints(boardState, playerOwner) {
  const madePoints = []
  for (let point = 1; point <= 24; point++) {
    const pointData = boardState.points[point - 1]
    if (pointData.owner === playerOwner && pointData.count >= 2) {
      madePoints.push(point)
    }
  }
  return madePoints
}

function calculateHitProbabilityForDistance(distance, blockedPoints = []) {
  if (distance <= 0 || distance > 24) {
    return { probability: 0, directRolls: 0, indirectRolls: 0, totalRolls: 0 }
  }

  let directRolls = 0
  let indirectRolls = 0
  let doublesRolls = 0

  for (let d1 = 1; d1 <= 6; d1++) {
    for (let d2 = 1; d2 <= 6; d2++) {
      // Direct hit
      if (distance <= 6 && (d1 === distance || d2 === distance)) {
        directRolls += d1 === d2 ? 1 : 1
        continue
      }

      // Indirect hit (sum)
      if (distance <= 12 && d1 + d2 === distance) {
        const intermediateBlocked = blockedPoints.includes(distance - d1) || blockedPoints.includes(distance - d2)
        if (!intermediateBlocked) {
          indirectRolls += d1 === d2 ? 1 : 1
          continue
        }
      }

      // Doubles hit (up to 24)
      if (d1 === d2) {
        const stepSize = d1
        for (let numSteps = 2; numSteps <= 4; numSteps++) {
          if (stepSize * numSteps === distance) {
            let blocked = false
            for (let step = 1; step < numSteps; step++) {
              if (blockedPoints.includes(stepSize * step)) {
                blocked = true
                break
              }
            }
            if (!blocked) {
              doublesRolls += 1
              break
            }
          }
        }
      }
    }
  }

  const totalRolls = directRolls + indirectRolls + doublesRolls
  return {
    probability: totalRolls / 36,
    directRolls,
    indirectRolls,
    doublesRolls,
    totalRolls
  }
}

function calculateHitImpact(blotPoint, playerOwner) {
  const isWhite = playerOwner === 'white'
  let pipsLost, zone, impact

  if (isWhite) {
    pipsLost = blotPoint
    if (blotPoint <= 6) {
      zone = 'HOME_BOARD'
      impact = 1.0 - (blotPoint - 1) * 0.03
    } else if (blotPoint <= 12) {
      zone = 'OUTER_BOARD'
      impact = 0.8 - (blotPoint - 7) * 0.05
    } else if (blotPoint <= 18) {
      zone = 'OPPONENT_OUTER'
      impact = 0.5 - (blotPoint - 13) * 0.05
    } else {
      zone = 'OPPONENT_HOME'
      impact = 0.2 - (blotPoint - 19) * 0.02
    }
  } else {
    pipsLost = 25 - blotPoint
    if (blotPoint >= 19) {
      zone = 'HOME_BOARD'
      impact = 1.0 - (24 - blotPoint) * 0.03
    } else if (blotPoint >= 13) {
      zone = 'OUTER_BOARD'
      impact = 0.8 - (18 - blotPoint) * 0.05
    } else if (blotPoint >= 7) {
      zone = 'OPPONENT_OUTER'
      impact = 0.5 - (12 - blotPoint) * 0.05
    } else {
      zone = 'OPPONENT_HOME'
      impact = 0.2 - (6 - blotPoint) * 0.02
    }
  }

  impact = Math.max(0.1, Math.min(1.0, impact))
  return { impact, pipsLost, zone }
}

function calculateBlotRisk(blotPoint, opponentPositions, playerMadePoints, playerOwner) {
  const isWhite = playerOwner === 'white'
  let totalFavorableRolls = 0
  const attackSources = []

  for (const oppPos of opponentPositions) {
    const distance = isWhite ? blotPoint - oppPos.point : oppPos.point - blotPoint
    if (distance <= 0) continue

    const hitProb = calculateHitProbabilityForDistance(distance, playerMadePoints)
    if (hitProb.totalRolls > 0) {
      totalFavorableRolls += hitProb.totalRolls
      attackSources.push({
        fromPoint: oppPos.point,
        distance,
        probability: hitProb.probability,
        rolls: hitProb.totalRolls
      })
    }
  }

  const effectiveRolls = Math.min(totalFavorableRolls, 36)
  const totalProbability = effectiveRolls / 36
  const hitImpact = calculateHitImpact(blotPoint, playerOwner)
  const weightedRisk = totalProbability * hitImpact.impact

  let riskLevel = 'LOW'
  if (weightedRisk >= 0.4) riskLevel = 'HIGH'
  else if (weightedRisk >= 0.2) riskLevel = 'MEDIUM'

  return {
    blotPoint,
    totalProbability,
    totalRolls: effectiveRolls,
    hitImpact: hitImpact.impact,
    pipsLost: hitImpact.pipsLost,
    zone: hitImpact.zone,
    weightedRisk,
    riskLevel,
    attackSources
  }
}

function identifyPointsMade(beforeState, afterState, playerOwner) {
  const newlyMade = []
  const strengthened = []
  for (let point = 1; point <= 24; point++) {
    const before = beforeState.points[point - 1]
    const after = afterState.points[point - 1]
    if (after.owner !== playerOwner || after.count < 2) continue

    if (before.owner !== playerOwner || before.count < 2) {
      newlyMade.push(point)
    } else if (after.count > before.count) {
      strengthened.push(point)
    }
  }
  return { newlyMade, strengthened }
}

function calculatePipCounts(boardState) {
  let whitePips = 0
  let blackPips = 0

  for (let point = 1; point <= 24; point++) {
    const pointData = boardState.points[point - 1]
    if (pointData.count > 0) {
      if (pointData.owner === 'white') {
        whitePips += point * pointData.count
      } else if (pointData.owner === 'black') {
        blackPips += (25 - point) * pointData.count
      }
    }
  }

  whitePips += boardState.whiteBar * 25
  blackPips += boardState.blackBar * 25

  return { white: whitePips, black: blackPips }
}

function checkForHit(beforeState, move, playerOwner) {
  const to = move.to
  if (to < 1 || to > 24) return null

  const toPoint = beforeState.points[to - 1]
  const opponentOwner = playerOwner === 'white' ? 'black' : 'white'
  if (toPoint.count === 1 && toPoint.owner === opponentOwner) {
    return { hitPoint: to, opponentOwner }
  }
  return null
}

function buildVerifiedMoveAnalysis(boardState, moveCombination, playerOwner) {
  const moves = moveCombination.moves || [moveCombination]
  const finalState = calculateFinalBoardState(boardState, moves, playerOwner)
  const blots = identifyBlots(finalState, playerOwner)
  const opponentPositions = identifyOpponentPositions(finalState, playerOwner)
  const playerMadePoints = getMadePoints(finalState, playerOwner)
  const blotRisks = blots.map(blotPoint =>
    calculateBlotRisk(blotPoint, opponentPositions, playerMadePoints, playerOwner)
  )

  const pointsAnalysis = identifyPointsMade(boardState, finalState, playerOwner)
  const beforePips = calculatePipCounts(boardState)
  const afterPips = calculatePipCounts(finalState)
  const pipGain = playerOwner === 'white'
    ? beforePips.white - afterPips.white
    : beforePips.black - afterPips.black

  const hits = []
  let tempState = boardState
  for (const move of moves) {
    const hit = checkForHit(tempState, move, playerOwner)
    if (hit) hits.push(hit)
    tempState = applyMoveToBoardForAnalysis(tempState, move, playerOwner)
  }

  let combinedRisk = 0
  let combinedWeightedRisk = 0
  for (const risk of blotRisks) {
    combinedRisk = Math.min(1, combinedRisk + risk.totalProbability * (1 - combinedRisk))
    combinedWeightedRisk = Math.min(1, combinedWeightedRisk + risk.weightedRisk * (1 - combinedWeightedRisk))
  }

  let overallRiskLevel = 'LOW'
  if (combinedWeightedRisk >= 0.4) overallRiskLevel = 'HIGH'
  else if (combinedWeightedRisk >= 0.2) overallRiskLevel = 'MEDIUM'

  return {
    moveDescription: moveCombination.description || formatMove(moveCombination),
    blots: {
      count: blots.length,
      positions: blots,
      risks: blotRisks,
      combinedRisk,
      combinedWeightedRisk,
      overallRiskLevel
    },
    pointsMade: {
      newlyMade: pointsAnalysis.newlyMade,
      strengthened: pointsAnalysis.strengthened,
      totalNewPoints: pointsAnalysis.newlyMade.length
    },
    hits: {
      count: hits.length,
      details: hits
    },
    pips: {
      before: beforePips,
      after: afterPips,
      gain: pipGain
    },
    madePoints: playerMadePoints
  }
}

// ============================================================================
// CONTEXT CLASSIFICATION - Stage and Game Type for weight adjustments
// ============================================================================
function classifyGameContext(boardState, playerOwner) {
  const isWhite = playerOwner === 'white'
  const pipCounts = calculatePipCounts(boardState)
  const pipDiff = isWhite ? (pipCounts.white - pipCounts.black) : (pipCounts.black - pipCounts.white)

  const whiteBack = countCheckersInRange(boardState, 'white', 19, 24)
  const blackBack = countCheckersInRange(boardState, 'black', 1, 6)
  const playerBack = isWhite ? whiteBack : blackBack
  const opponentBack = isWhite ? blackBack : whiteBack

  const contact = hasContact(boardState)
  let stage = 'MID'
  if (!contact) {
    stage = 'LATE (RACE)'
  } else {
    if (playerBack >= 2 && opponentBack >= 2) stage = 'EARLY'
  }

  let type = 'CONTACT'
  if (!contact) {
    type = 'RUNNING'
  } else if (playerBack >= 3 && pipDiff > 10) {
    type = 'BACKGAME'
  } else if (playerBack >= 1) {
    type = 'HOLDING'
  }

  return { stage, type, contact, pipDiff, playerBack, opponentBack }
}

function countCheckersInRange(boardState, owner, startPoint, endPoint) {
  let count = 0
  for (let point = startPoint; point <= endPoint; point++) {
    const pointData = boardState.points[point - 1]
    if (pointData.owner === owner && pointData.count > 0) {
      count += pointData.count
    }
  }
  return count
}

function hasContact(boardState) {
  const whiteInUpper = countCheckersInRange(boardState, 'white', 13, 24) > 0
  const blackInLower = countCheckersInRange(boardState, 'black', 1, 12) > 0
  return whiteInUpper && blackInLower
}

function getAdjustedFactorWeights(gameContext) {
  const weights = { ...BASE_FACTOR_WEIGHTS }

  if (!ENABLE_CONTEXT_ADJUSTMENTS || !gameContext) return weights

  const stage = gameContext.stage
  if (stage === 'EARLY') {
    weights.D += 1
    weights.S -= 1
    weights.P += 1
    weights.Dv += 1
    weights.F += 1
  } else if (stage === 'MID') {
    weights.H += 1
    weights.S += 1
    weights.P += 1
  } else if (stage === 'LATE') {
    weights.H -= 1
    weights.D -= 1
    weights.S += 1
    weights.P -= 1
    weights.T += 2
    weights.F += 1
  }

  const type = gameContext.type
  if (type === 'RUNNING') {
    weights.H -= 1
    weights.D -= 1
    weights.S += 1
    weights.P -= 1
    weights.T += 2
    weights.F += 1
  } else if (type === 'HOLDING') {
    weights.S += 1
    weights.P += 1
    weights.F += 1
  } else if (type === 'BLITZ') {
    weights.H += 2
    weights.D += 1
    weights.P += 2
    weights.T -= 1
  } else if (type === 'BACKGAME') {
    weights.D -= 1
    weights.S += 1
    weights.P += 1
    weights.Dv += 1
    weights.T -= 2
    weights.F += 1
  }

  return weights
}

/**
 * Call xAI for strategic analysis
 */
async function analyzeMovesWithAI(xgid, moves, difficulty, player, debugInfo = null) {
  const XAI_API_KEY = process.env.XAI_API_KEY

  const playerOwner = player === 1 ? 'white' : 'black'
  const boardState = parseXGID(xgid)
  const verifiedAnalyses = moves.map((move, index) => ({
    moveNumber: index + 1,
    ...buildVerifiedMoveAnalysis(boardState, move, playerOwner)
  }))

  const gameContext = ENABLE_CONTEXT_ADJUSTMENTS ? classifyGameContext(boardState, playerOwner) : null
  const adjustedWeights = getAdjustedFactorWeights(gameContext)
  const prompt = buildHybridPrompt(
    xgid,
    moves,
    verifiedAnalyses,
    difficulty,
    player,
    gameContext,
    adjustedWeights,
    Boolean(debugInfo)
  )

  // Store prompt in debug info
  if (debugInfo) {
    debugInfo.prompt = prompt
    debugInfo.verifiedAnalyses = verifiedAnalyses
    if (gameContext) debugInfo.gameContext = gameContext
    debugInfo.adjustedWeights = adjustedWeights
  }

  const response = await fetch(XAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY}`
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
      temperature: 0.3 // Consistent strategic analysis
    })
  })

  if (!response.ok) {
    throw new Error(`xAI API error: ${response.status}`)
  }

  const data = await response.json()
  const aiResponse = data.choices[0].message.content

  // Store response in debug info
  if (debugInfo) {
    debugInfo.response = aiResponse
  }

  return parseAIResponse(aiResponse)
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
- Points are numbered 1-24 from ${playerColor}'s perspective (1-6 = ${playerColor}'s home board, 19-24 = opponent's home board)
- Lower point numbers (1-6) are ${playerColor}'s home board where pieces bear off
- Higher point numbers (19-24) are opponent's home board

Focus on: blot safety, board control, timing, race position, and using both dice efficiently.

Respond with format:
BEST_MOVE: [move number]
FACTOR_SCORES: For each move, output one concise line using ONLY the move number:
MOVE X: H a×w=b | D a×w=b | S a×w=b | P a×w=b | Dv a×w=b | T a×w=b | F a×w=b | TOTAL=sum
REASONING: [2-3 sentence strategic analysis from ${playerColor}'s perspective]
CONFIDENCE: [0.0-1.0]`
}

/**
 * Build HYBRID prompt with verified deterministic data
 */
function buildHybridPrompt(
  xgid,
  moves,
  verifiedAnalyses,
  difficulty,
  player,
  gameContext = null,
  adjustedWeights = null,
  includeFactorScores = false
) {
  const parts = xgid.split(':')
  const dice = parts[4] || '00'
  const playerNum = parseInt(parts[3] || '1')
  const playerColor = playerNum === 1 ? 'WHITE' : 'BLACK'

  const verifiedMoveData = verifiedAnalyses.map(analysis => {
    const blotSummary = analysis.blots.count === 0
      ? 'NO BLOTS'
      : analysis.blots.risks.map(r =>
        `Pt${r.blotPoint}[${r.zone}]: ${(r.totalProbability * 100).toFixed(0)}% hit × ${(r.hitImpact * 100).toFixed(0)}% impact`
      ).join('; ')

    const pointsMadeSummary = analysis.pointsMade.totalNewPoints === 0
      ? 'No new points'
      : `MAKES ${analysis.pointsMade.newlyMade.map(p => `${p}-point`).join(', ')}`

    const hitsSummary = analysis.hits.count === 0
      ? 'No hits'
      : `HITS ${analysis.hits.details.map(h => `pt${h.hitPoint}`).join(', ')}`

    return `MOVE ${analysis.moveNumber}: ${analysis.moveDescription}
• Blots: ${analysis.blots.count} | ${blotSummary}
• Weighted Risk: ${(analysis.blots.combinedWeightedRisk * 100).toFixed(1)}% (${analysis.blots.overallRiskLevel})
• Points Made: ${pointsMadeSummary}
• Hits: ${hitsSummary} | Pip Gain: ${analysis.pips.gain}`
  }).join('\n\n')

  const contextBlock = (ENABLE_CONTEXT_ADJUSTMENTS && gameContext)
    ? `\nGAME CONTEXT (VERIFIED): Stage=${gameContext.stage} | Type=${gameContext.type} | Contact=${gameContext.contact ? 'YES' : 'NO'}\n`
    : ''

  const responseFormat = includeFactorScores
    ? `Respond with format:
BEST_MOVE: [move number]
FACTOR_SCORES: For each move, output one concise line:
MOVE X: H a×w=b | D a×w=b | S a×w=b | P a×w=b | Dv a×w=b | T a×w=b | F a×w=b | TOTAL=sum
REASONING: [2-3 sentence strategic analysis from ${playerColor}'s perspective]
CONFIDENCE: [0.0-1.0]`
    : `Respond with format:
BEST_MOVE: [move number]
REASONING: [2-3 sentence strategic analysis from ${playerColor}'s perspective]
CONFIDENCE: [0.0-1.0]`

  return `You are a ${difficulty} level backgammon strategist analyzing from ${playerColor}'s perspective.
ALL calculations below are VERIFIED and CORRECT - do NOT recalculate them.

POSITION: ${playerColor} to move | Dice: ${dice}
${contextBlock}

VERIFIED MOVE ANALYSES (GOSPEL - TRUST THESE COMPLETELY):
${verifiedMoveData}

RATE EACH FACTOR ON A 1-10 SCALE (1 = very poor, 10 = excellent).
Using the VERIFIED data above, rate each move using the 7 strategic factors (with corresponding weight):
Hitting (${adjustedWeights?.H ?? BASE_FACTOR_WEIGHTS.H}), Development (${adjustedWeights?.D ?? BASE_FACTOR_WEIGHTS.D}), Safety (${adjustedWeights?.S ?? BASE_FACTOR_WEIGHTS.S}), Pressure (${adjustedWeights?.P ?? BASE_FACTOR_WEIGHTS.P}), Diversity (${adjustedWeights?.Dv ?? BASE_FACTOR_WEIGHTS.Dv}), Timing (${adjustedWeights?.T ?? BASE_FACTOR_WEIGHTS.T}), Flexibility (${adjustedWeights?.F ?? BASE_FACTOR_WEIGHTS.F}).
Use these weights (already adjusted for context) to compute a weighted total for each move, then choose the best move.

EARLY OPENING GUIDANCE (money play, XG rollouts):
- Slightly favor aggressive slots or builders on golden/outer points (5pt, 4pt, 7pt, 11pt) when weighted risk <40% — the long-term prime-building, duplication, and flexibility upside very often outweighs moderate hit risk.
- ZERO-RISK key-point slots are especially powerful: making the 5-point or 4-point with no blot left (e.g., 8/5 6/5 on 3-1, 8/4 6/4 on 4-2) is almost always the top play due to immediate home board strength and prime potential.
- When two moves have close totals, prioritize the one that makes or slots a golden point (5pt/4pt) over purely safe builder/split plays.

FEW-SHOT EXAMPLE FOR 21 (2-1):
Best: 13/11 6/5 (slot 5pt + builder). Equity ~+0.506.
D=9–10 (key slot), S=6–7 (med risk acceptable), P=6–7, TOTAL highest.
Close alt: 13/11 24/23 (safer split). Equity ~+0.500.

FEW-SHOT EXAMPLE FOR 32 (3-2):
Best: 13/11 13/10 (aggressive double builder down, small blot on 11). Equity edge.
D=9–10 (high flex), S=7–8 (low hit risk), TOTAL highest.
Close alt: 13/11 24/21 (safer split + builder).

FEW-SHOT EXAMPLE FOR 41 (4-1):
Best: 24/23 13/9 (run + builder). Equity ~+0.45.
D=9–10 (strong builder), P=7–8 (anchor pressure), S=8–9 (low risk), TOTAL highest.
Close alt: 13/9 6/5 (5pt slot). Med risk, slightly lower equity.

FEW-SHOT EXAMPLE FOR 43 (4-3):
Best: 13/10 13/9 (aggressive double builder down from midpoint to 10 and 9, small blot on 9). Equity edge.
D=9–10 (high outer flex), S=8–9 (low hit risk), P=6–7, TOTAL highest.
Close alt: 24/20 13/10 (deep anchor + builder). Higher P but lower long-term structure.

FEW-SHOT EXAMPLE FOR 62 (6-2):
Best: 24/18 13/11 (deep run + builder down). Equity ~+0.49.
D=9–10 (race + outer flex), S=9–10 (zero risk), P=7–8, TOTAL highest.
Close alt: 13/5 (risky home run). High blot exposure, lower equity.

FEW-SHOT EXAMPLE FOR 53 (5-3):
Best: 8/3 6/3 (zero-risk slot 3pt with both dice). Equity ~+0.49.
D=9–10 (strong home slot), S=10 (zero risk), P=9 (immediate holding), TOTAL highest.
Close alt: 13/8 8/5 (builder + 5pt slot). Moderate risk blot, slightly lower equity.

In EARLY game, when totals close, prefer zero-risk home slots (3pt/4pt/5pt) over moderate-risk 5pt slots with builder.

${responseFormat}`
}

/**
 * Parse AI response
 */
function parseAIResponse(response) {
  const lines = response.split('\n')
  let bestMove = null
  let reasoning = ''
  let confidence = 0.5
  const factorScores = []

  lines.forEach(line => {
    if (line.startsWith('BEST_MOVE:')) {
      bestMove = parseInt(line.split(':')[1].trim())
    } else if (line.startsWith('MOVE ') && line.includes('|')) {
      const match = line.match(/^MOVE\s+(\d+):\s*(.*)$/)
      if (match) {
        factorScores.push({
          moveNumber: parseInt(match[1], 10),
          scores: match[2].trim()
        })
      }
    } else if (line.startsWith('REASONING:')) {
      reasoning = line.substring(10).trim()
    } else if (line.startsWith('CONFIDENCE:')) {
      confidence = parseFloat(line.split(':')[1].trim()) || 0.5
    }
  })

  return {
    bestMoveIndex: bestMove - 1,
    reasoning,
    confidence,
    factorScores
  }
}

/**
 * Validate AI suggestion and return move combination
 */
function validateAndReturnMove(aiAnalysis, moves) {
  const { bestMoveIndex, reasoning, confidence, factorScores } = aiAnalysis
  const mappedFactorScores = Array.isArray(factorScores) && factorScores.length > 0
    ? factorScores
      .filter(entry => entry.moveNumber >= 1 && entry.moveNumber <= moves.length)
      .map(entry => ({
        moveNumber: entry.moveNumber,
        moveDescription: formatMove(moves[entry.moveNumber - 1]),
        scores: entry.scores
      }))
    : null

  if (bestMoveIndex >= 0 && bestMoveIndex < moves.length) {
    const selectedCombination = moves[bestMoveIndex]
    return {
      move: selectedCombination,
      reasoning: reasoning,
      confidence: confidence,
      factorScores: mappedFactorScores,
      source: 'ai'
    }
  }

  // Fallback to first combination if AI gave invalid index
  return {
    move: moves[0],
    reasoning: "AI suggestion invalid, using conservative move combination",
    confidence: 0.3,
    factorScores: mappedFactorScores,
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
