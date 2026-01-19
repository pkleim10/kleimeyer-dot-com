/**
 * Backgammon Engine API Route
 * Provides server-side hybrid heuristic + Monte Carlo engine for move analysis
 */

import { getLegalMoves } from './getLegalMoves'

// Heuristic weights for move evaluation
const HEURISTIC_WEIGHTS = {
  blots: -0.5,     // Negative for safety
  hits: 0.3,       // Positive for aggression
  pointsMade: 0.4, // Positive for development
  pipGain: 0.2,    // Positive for efficiency
  homeBoard: 0.1,  // Positive for home board strength
  primeLength: 0.15 // Positive for blocking
}

/**
 * Evaluate move using heuristic scoring
 */
function evaluateMoveHeuristically(boardState, move, playerOwner) {
  const analysis = buildVerifiedMoveAnalysis(boardState, move, playerOwner)

  let score = 0
  score += analysis.blots.count * HEURISTIC_WEIGHTS.blots
  score += analysis.hits.count * HEURISTIC_WEIGHTS.hits
  score += analysis.pointsMade.newlyMade.length * HEURISTIC_WEIGHTS.pointsMade
  score += analysis.pips.gain * HEURISTIC_WEIGHTS.pipGain

  // Simple home board strength: count checkers in home board
  const homeBoardStart = playerOwner === 'white' ? 1 : 19
  const homeBoardEnd = playerOwner === 'white' ? 6 : 24
  const homeBoardCheckers = countCheckersInRange(boardState, playerOwner, homeBoardStart, homeBoardEnd)
  score += homeBoardCheckers * HEURISTIC_WEIGHTS.homeBoard

  // Simple prime potential: check for 6-point prime
  const primeLength = checkPrimeLength(boardState, playerOwner)
  score += primeLength * HEURISTIC_WEIGHTS.primeLength

  return score
}

/**
 * Run Monte Carlo simulations for move evaluation
 */
function runMonteCarlo(boardState, moveCombination, playerOwner, numSimulations = 5) {
  const opponentOwner = playerOwner === 'white' ? 'black' : 'white'
  let wins = 0

  for (let i = 0; i < numSimulations; i++) {
    // Apply the move combination to get new board state
    let currentBoard = cloneBoardState(boardState)
    const moves = moveCombination.moves || [moveCombination]
    for (const move of moves) {
      currentBoard = applyMoveToBoardForAnalysis(currentBoard, move, playerOwner)
    }

    // Simulate random playout until game end or max moves
    let currentPlayer = opponentOwner
    let movesMade = 0
    const maxMoves = 20 // Prevent infinite loops

    while (!isGameOver(currentBoard) && movesMade < maxMoves) {
      const legalMoves = getLegalMoves(currentBoard, { currentPlayer, dice: getRandomDice() })
      if (legalMoves.length === 0) {
        break
      }

      // Randomly select a move
      const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)]
      const randomMoves = randomMove.moves || [randomMove]
      for (const move of randomMoves) {
        currentBoard = applyMoveToBoardForAnalysis(currentBoard, move, currentPlayer)
      }
      currentPlayer = currentPlayer === 'white' ? 'black' : 'white'
      movesMade++
    }

    // Check if playerOwner won or has advantage
    const winner = getWinner(currentBoard)
    if (winner === playerOwner) {
      wins++
    } else if (winner === null) {
      // Game not finished, check pip count advantage
      const pipCounts = calculatePipCounts(currentBoard)
      const playerPip = playerOwner === 'white' ? pipCounts.white : pipCounts.black
      const opponentPip = playerOwner === 'white' ? pipCounts.black : pipCounts.white
      if (playerPip < opponentPip) wins += 0.5 // Partial win for pip advantage
    }
  }

  return wins / numSimulations
}

/**
 * Hybrid evaluation combining heuristic and MC
 */
function evaluateMoveHybrid(boardState, move, playerOwner) {
  const heuristicScore = evaluateMoveHeuristically(boardState, move, playerOwner)
  const mcScore = runMonteCarlo(boardState, move, playerOwner)

  // Combine scores (weighted average)
  const hybridScore = 0.6 * heuristicScore + 0.4 * mcScore

  return {
    move,
    heuristicScore,
    mcScore,
    hybridScore
  }
}

/**
 * Analyze moves using hybrid engine
 */
function analyzeMovesWithHybridEngine(boardState, moves, playerOwner) {
  const evaluations = moves.map(move => evaluateMoveHybrid(boardState, move, playerOwner))

  // Sort by hybrid score descending
  evaluations.sort((a, b) => b.hybridScore - a.hybridScore)

    const bestEvaluation = evaluations[0]
    const bestMove = bestEvaluation.move
    // Get current player from boardState for coordinate conversion
    const currentPlayer = boardState.player !== undefined ? boardState.player : 1
    const formattedMove = formatMove(bestMove, currentPlayer)
    const reasoning = `Hybrid evaluation selected ${formattedMove} with score ${evaluations[0].hybridScore.toFixed(3)}`

    // Find the index of bestMove in the original moves array
    const bestMoveIndex = moves.findIndex(m => {
      // Compare moves by checking if they have the same structure
      if (m.moves && bestMove.moves) {
        // Both are combinations - compare move sequences
        if (m.moves.length !== bestMove.moves.length) return false
        return m.moves.every((moveItem, idx) => 
          moveItem.from === bestMove.moves[idx].from && 
          moveItem.to === bestMove.moves[idx].to
        )
      } else if (!m.moves && !bestMove.moves) {
        // Both are single moves
        return m.from === bestMove.from && m.to === bestMove.to
      }
      return false
    })

    return {
      bestMoveIndex: bestMoveIndex >= 0 ? bestMoveIndex : 0, // Use found index or fallback to 0
      reasoning,
      confidence: 0.9, // High confidence for deterministic evaluation
      factorScores: evaluations.map((evaluation, idx) => ({
        moveNumber: idx + 1,
        moveDescription: formatMove(evaluation.move, currentPlayer),
        scores: `Heuristic: ${evaluation.heuristicScore.toFixed(3)} | MC: ${evaluation.mcScore.toFixed(3)} | Total: ${evaluation.hybridScore.toFixed(3)}`
      })),
      bestMove: bestMove // Keep reference to actual best move
    }
}

/**
 * Validate hybrid suggestion and return move combination
 */
function validateAndReturnMove(hybridAnalysis, moves) {
  const { bestMoveIndex, reasoning, confidence, factorScores, bestMove } = hybridAnalysis

  // Prefer using bestMove directly if available (most reliable)
  if (bestMove) {
    return {
      move: bestMove,
      reasoning: reasoning,
      confidence: confidence,
      factorScores: factorScores,
      source: 'hybrid'
    }
  }

  // Fallback to using index if bestMove not available
  if (bestMoveIndex >= 0 && bestMoveIndex < moves.length) {
    const selectedCombination = moves[bestMoveIndex]
    return {
      move: selectedCombination,
      reasoning: reasoning,
      confidence: confidence,
      factorScores: factorScores,
      source: 'hybrid'
    }
  }

  // Final fallback to first combination
  return {
    move: moves[0],
    reasoning: "Hybrid evaluation failed, using first move",
    confidence: 0.3,
    factorScores: null,
    source: 'fallback'
  }
}

// Helper functions for MC
function getRandomDice() {
  const d1 = Math.floor(Math.random() * 6) + 1
  const d2 = Math.floor(Math.random() * 6) + 1
  return d1 === d2 ? [d1, d1, d1, d1] : [d1, d2]
}

function isGameOver(boardState) {
  // For simplicity in MC, never consider game over - just simulate a few moves
  return false
}

function getWinner(boardState) {
  // For simplicity, return null - no winner in short simulations
  return null
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


// Export functions for testing (re-export getLegalMoves from module)
export { parseXGID, createTurnState, getLegalMoves }

export async function POST(request) {
  try {
    const { xgid, player, difficulty = 'advanced', maxMoves = 5, debug = false, usedDice = [] } = await request.json()

    // Validate input
    if (!xgid) {
      return Response.json(
        { error: 'XGID is required' },
        { status: 400 }
      )
    }


    // Parse position and generate legal moves
    const boardState = parseXGID(xgid)

    // Create turn state for legal move generation
    const turnState = createTurnState(boardState, player)
    // If usedDice is provided, update turn state to reflect already used dice
    if (usedDice && usedDice.length > 0) {
      turnState.usedDice = usedDice
    }
    const allLegalMoves = getLegalMoves(boardState, turnState)

    // Collect debug information
    const debugInfo = debug ? {
      xgid,
      legalMoves: allLegalMoves.map(move => ({
        description: formatMove(move),
        totalPips: move.totalPips || 0
      }))
    } : null

    if (allLegalMoves.length === 0) {
      return Response.json({
        move: null,
        reasoning: "No legal moves available",
        confidence: 1.0,
        source: 'local'
      })
    }

    // Get top legal moves for engine analysis
    const topMoves = selectTopLegalMoves(allLegalMoves, maxMoves)

    // Get hybrid engine analysis
    const playerOwner = player === 1 ? 'white' : 'black'
    const hybridAnalysis = analyzeMovesWithHybridEngine(boardState, topMoves, playerOwner)

    // Validate and return best hybrid suggestion
    const result = validateAndReturnMove(hybridAnalysis, topMoves)

    if (!debugInfo) {
      delete result.factorScores
    }

    // Include debug info if requested
    if (debugInfo) {
      result.debug = debugInfo
    }

    return Response.json(result)

  } catch (error) {
    console.error('Backgammon Engine API error:', error)

    // Return fallback response
    return Response.json({
      move: null,
      reasoning: 'Engine analysis failed due to server error',
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
  let dice = []
  if (boardState.dice && boardState.dice !== '00') {
    const die1 = parseInt(boardState.dice[0])
    const die2 = parseInt(boardState.dice[1])
    if (!isNaN(die1) && !isNaN(die2) && die1 > 0 && die2 > 0) {
      // Doubles: if both dice are the same, allow 4 moves of that number
      dice = die1 === die2 ? [die1, die1, die1, die1] : [die1, die2]
    }
  }

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
 * Select diverse top legal move combinations for engine analysis
 */
function selectTopLegalMoves(allMoves, maxMoves) {
  // For now, just return the best combinations
  // In a full implementation, this would prioritize by strategic value
  const limit = Math.max(18, maxMoves)
  return allMoves.slice(0, Math.min(limit, allMoves.length))
}

// ============================================================================
// DETERMINISTIC ENGINE - Verified calculations for hybrid engine system
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

function checkPrimeLength(boardState, playerOwner) {
  // Simple check for longest consecutive points owned
  let maxPrime = 0
  let currentPrime = 0
  for (let i = 1; i <= 24; i++) {
    const point = boardState.points[i - 1]
    if (point.owner === playerOwner && point.count >= 2) {
      currentPrime++
      maxPrime = Math.max(maxPrime, currentPrime)
    } else {
      currentPrime = 0
    }
  }
  return maxPrime
}



/**
 * Format move for display - converts absolute coordinates to relative based on player
 */
function formatMove(move, player = null) {
  if (!move) return 'No move'
  
  // Helper to convert absolute to relative coordinates
  const absoluteToRelative = (absolutePoint, currentPlayer) => {
    if (absolutePoint === 0 || absolutePoint === 25) return absolutePoint // Bar positions stay as-is
    if (absolutePoint === -1 || absolutePoint === -2) return absolutePoint // Off positions stay as-is
    if (currentPlayer === 1) return absolutePoint // White: absolute = relative
    return 25 - absolutePoint // Black: relative = 25 - absolute
  }
  
  if (move.moves) {
    // This is a combination of moves
    if (player === null) {
      // Fallback: use description as-is if player not provided
      return move.description || 'No move'
    }
    
    // If description exists and player is white (1), we can use it directly
    // since descriptions are built in absolute coordinates which match white's relative coordinates
    if (move.description && player === 1) {
      return move.description
    }
    
    // For black or when description not available, convert coordinates
    // Convert each move in the combination
    let convertedMoves = move.moves.map(m => {
      const fromRel = absoluteToRelative(m.from, player)
      const toRel = absoluteToRelative(m.to, player)
      const from = fromRel === 0 ? 'bar' : fromRel === 25 ? 'bar' : fromRel
      const to = toRel === -1 ? 'off' : toRel === -2 ? 'off' : toRel
      const asterisk = m.hitBlot ? '*' : ''
      return { from, to, moveStr: `${from}/${to}`, hitBlot: m.hitBlot }
    })
    
    // Normalize order: sort by highest originating point first
    convertedMoves = convertedMoves.sort((a, b) => {
      const aFrom = parseInt(a.moveStr.split('/')[0]) || 0
      const bFrom = parseInt(b.moveStr.split('/')[0]) || 0
      return bFrom - aFrom // Highest first
    })
    
    // Collapse sequences first (same checker moving: e.g., "8/6 6/5" -> "8/5")
    // Then group identical moves
    const formattedParts = []
    let i = 0
    while (i < convertedMoves.length) {
      // If this move hits a blot, add it separately (hitting stops the sequence)
      if (convertedMoves[i].hitBlot) {
        formattedParts.push(`${convertedMoves[i].moveStr}*`)
        i++
        continue
      }
      
      // Try to form a sequence starting from this move
      let sequenceStart = convertedMoves[i].moveStr.split('/')[0]
      let sequenceEnd = convertedMoves[i].moveStr.split('/')[1]
      let sequenceHitBlot = convertedMoves[i].hitBlot
      const sequenceMoves = [convertedMoves[i]] // Track original moves in sequence
      let j = i + 1
      
      // Check if this is part of a sequence (same checker moving)
      // Only continue if next move starts where this one ends AND doesn't hit a blot
      while (j < convertedMoves.length && 
             convertedMoves[j].moveStr.split('/')[0] === sequenceEnd && 
             !convertedMoves[j].hitBlot) {
        sequenceEnd = convertedMoves[j].moveStr.split('/')[1]
        sequenceHitBlot = sequenceHitBlot || convertedMoves[j].hitBlot
        sequenceMoves.push(convertedMoves[j])
        j++
      }
      
      // Add collapsed move (or single move if not a sequence)
      const asterisk = sequenceHitBlot ? '*' : ''
      if (sequenceMoves.length > 1) {
        // Collapsed sequence - show original moves in parentheses
        const originalMovesStr = sequenceMoves.map(m => `${m.moveStr}${m.hitBlot ? '*' : ''}`).join(' ')
        formattedParts.push(`${sequenceStart}/${sequenceEnd}${asterisk} (${originalMovesStr})`)
      } else {
        // Single move, no collapse
        formattedParts.push(`${sequenceStart}/${sequenceEnd}${asterisk}`)
      }
      i = j // Move to next non-sequence move
    }
    
    // Now group identical moves (including collapsed sequences)
    const moveGroups = new Map()
    for (const part of formattedParts) {
      const key = part.replace('*', '') // Remove asterisk for grouping
      if (!moveGroups.has(key)) {
        moveGroups.set(key, { moveStr: part, count: 0 })
      }
      moveGroups.get(key).count++
    }
    
    const parts = []
    for (const group of moveGroups.values()) {
      if (group.count > 1) {
        // Extract the base move string and asterisk
        const baseMove = group.moveStr.replace('*', '')
        const hasAsterisk = group.moveStr.includes('*')
        const asterisk = hasAsterisk ? '*' : ''
        parts.push(`${baseMove}(${group.count})${asterisk}`)
      } else {
        parts.push(group.moveStr)
      }
    }
    
    // Sort by highest starting point first
    parts.sort((a, b) => {
      const aFrom = parseInt(a.split('/')[0]) || 0
      const bFrom = parseInt(b.split('/')[0]) || 0
      return bFrom - aFrom
    })
    
    return parts.join(' ')
  }
  
  // Single move
  const fromRel = absoluteToRelative(move.from, player || 1)
  const toRel = absoluteToRelative(move.to, player || 1)
  const from = fromRel === 0 ? 'bar' : fromRel === 25 ? 'bar' : fromRel
  const to = toRel === -1 ? 'off' : toRel === -2 ? 'off' : toRel
  const asterisk = move.hitBlot ? '*' : ''
  return `${from}/${to}${asterisk}`
}
