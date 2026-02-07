/**
 * Move evaluation functions for backgammon engine
 */

import { HEURISTIC_WEIGHTS, POSITION_WEIGHTS } from '../config/heuristicWeights.js'
import { debugFetchLog } from '../config/debugConfig.js'
import { identifyBlots, identifyOpponentPositions, getMadePoints, calculatePipCounts, checkForHit } from '../utils/boardAnalysis.js'
import { countCheckersInRange, calculateFinalBoardState, applyMoveToBoardForAnalysis } from '../utils/boardUtils.js'

/**
 * Evaluate move using heuristic scoring
 */
export function evaluateMoveHeuristically(boardState, move, playerOwner) {
  const analysis = buildVerifiedMoveAnalysis(boardState, move, playerOwner)

  const blotsScore = analysis.blots.combinedWeightedRisk * -0.25
  const hitsScore = analysis.hits.count * HEURISTIC_WEIGHTS.hits
  // Enhanced Points Made scoring with quality bonuses
  let basePoints = analysis.pointsMade.newlyMade.length || 0;
  let pointQualityBonus = 0;

  for (const pt of analysis.pointsMade.newlyMade || []) {
    if (pt === 5 || pt === 4) {
      pointQualityBonus += 1.0;          // golden points bonus
    } else if (pt === 7 || pt === 3) {   // bar-point + 3-point
      pointQualityBonus += 0.25;
    } else {
      pointQualityBonus += 0.1;          // other points
    }
  }

  const pointsRaw = basePoints + pointQualityBonus;
  const pointsMadeScore = pointsRaw * 0.3;  // 0.3 weighting (HEURISTIC_WEIGHTS.pointsMade)
  const pipGainScore = analysis.pips.gain * HEURISTIC_WEIGHTS.pipGain

  // Simple home board strength: count checkers in home board AFTER move
  const homeBoardStart = playerOwner === 'white' ? 1 : 19
  const homeBoardEnd = playerOwner === 'white' ? 6 : 24
  const homeBoardCheckers = countCheckersInRange(analysis.finalState, playerOwner, homeBoardStart, homeBoardEnd)
  const homeBoardScore = homeBoardCheckers * HEURISTIC_WEIGHTS.homeBoard

  // Simple prime potential: check for 6-point prime AFTER move
  const primeLength = checkPrimeLength(analysis.finalState, playerOwner)
  const primeScore = primeLength * HEURISTIC_WEIGHTS.primeLength

  // Builder coverage bonus: strategic outer board positioning
  const builderBonus = calculateBuilderCoverage(analysis.finalState, playerOwner)
  const builderCoverageScore = HEURISTIC_WEIGHTS.builderCoverage * builderBonus

  // Stack penalty: penalizes excessive stacking (4+ checkers on one point)
  const maxStack = getMaxStackSize(analysis.finalState, playerOwner)
  const stackRaw = maxStack > 3 ? -(maxStack - 3) * 0.04 : 0  // penalty starts at 4+
  const stackPenaltyScore = HEURISTIC_WEIGHTS.stackPenalty * stackRaw

  // Opponent blot count: rewards opponent vulnerabilities for hitting
  const opponentBlots = countOpponentBlots(analysis.finalState, playerOwner)
  const opponentBlotScore = opponentBlots * HEURISTIC_WEIGHTS.opponentBlotCount

  // High Roll Bonus: rewards high pip gain and deep runs for race lead and flexibility
  let highRollBonus = 0;

  // Bonus for high pip gain
  if (analysis.pips.gain >= 6) {
    highRollBonus += (analysis.pips.gain - 5) * 0.02;  // +0.02 per pip above 5
  }

  // Extra bonus for deep run (24 to 18 or lower)
  if (analysis.moveDescription && analysis.moveDescription.includes('24/') && analysis.pips.gain >= 8) {
    highRollBonus += 0.03;  // reward deep anchor advancement
  }

  const highRollScore = HEURISTIC_WEIGHTS.highRollBonus * highRollBonus;

  const totalScore = blotsScore + hitsScore + pointsMadeScore + pipGainScore + homeBoardScore + primeScore + builderCoverageScore + stackPenaltyScore + opponentBlotScore + highRollScore

  return {
    score: totalScore,
    breakdown: {
      blots: { count: analysis.blots.count, score: blotsScore },
      hits: { count: analysis.hits.count, score: hitsScore },
      pointsMade: { count: analysis.pointsMade.newlyMade.length, score: pointsMadeScore },
      pipGain: { value: analysis.pips.gain, score: pipGainScore },
      homeBoard: { checkers: homeBoardCheckers, score: homeBoardScore },
      primeLength: { value: primeLength, score: primeScore },
      builderCoverage: { bonus: builderBonus, score: builderCoverageScore },
      stackPenalty: { maxStack, rawPenalty: stackRaw, score: stackPenaltyScore },
      opponentBlotCount: { count: opponentBlots, score: opponentBlotScore },
      highRollBonus: { rawBonus: highRollBonus, score: highRollScore }
    }
  }
}

/**
 * Build comprehensive move analysis with verification
 */
export function buildVerifiedMoveAnalysis(boardState, moveCombination, playerOwner) {
  const moves = moveCombination.moves || [moveCombination]
  const finalState = calculateFinalBoardState(boardState, moves, playerOwner)

  // Calculate hits during move sequence (only factor that depends on sequence)
  const hits = []
  let tempState = boardState
  for (const move of moves) {
    const hit = checkForHit(tempState, move, playerOwner)
    if (hit) hits.push(hit)
    tempState = applyMoveToBoardForAnalysis(tempState, move, playerOwner)
  }

  // ALL other analysis is strictly final-state based to ensure normalization
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
    finalState: finalState,
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

/**
 * Apply a combination of moves to board state
 */
function applyMoveCombination(boardState, moves, playerOwner) {
  let state = JSON.parse(JSON.stringify(boardState)) // Deep clone

  for (const move of moves) {
    // Apply individual move logic here
    const from = move.from
    const to = move.to

    // Handle bar moves
    if ((from === 0 && playerOwner === 'white') || (from === 25 && playerOwner === 'black')) {
      if (playerOwner === 'white') {
        state.whiteBar = Math.max(0, state.whiteBar - 1)
      } else {
        state.blackBar = Math.max(0, state.blackBar - 1)
      }
    } else if (from >= 1 && from <= 24) {
      // Remove from source point
      const fromPoint = state.points[from - 1]
      if (fromPoint.owner === playerOwner && fromPoint.count > 0) {
        fromPoint.count--
        if (fromPoint.count === 0) fromPoint.owner = null
      }
    }

    // Handle destination
    if (to >= 1 && to <= 24) {
      const toPoint = state.points[to - 1]
      const opponentOwner = playerOwner === 'white' ? 'black' : 'white'

      // Handle hits
      if (toPoint.count === 1 && toPoint.owner === opponentOwner) {
        toPoint.count = 0
        toPoint.owner = null
        if (opponentOwner === 'white') {
          state.whiteBar++
        } else {
          state.blackBar++
        }
      }

      // Place checker
      if (toPoint.count === 0) {
        toPoint.owner = playerOwner
      }
      toPoint.count++
    }
  }

  return state
}

/**
 * Calculate hit probability for a given distance
 */
export function calculateHitProbabilityForDistance(distance, blockedPoints = []) {
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

/**
 * Calculate the impact of hitting an opponent's blot
 */
export function calculateHitImpact(blotPoint, playerOwner) {
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

/**
 * Calculate risk of a blot being hit
 */
export function calculateBlotRisk(blotPoint, opponentPositions, playerMadePoints, playerOwner) {
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

/**
 * Identify points that were made by a move
 */
export function identifyPointsMade(beforeState, afterState, playerOwner) {
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

/**
 * Count opponent blots (for evaluation)
 */
export function countOpponentBlots(boardState, playerOwner) {
  const opponentOwner = playerOwner === 'white' ? 'black' : 'white'
  return identifyBlots(boardState, opponentOwner).length
}

/**
 * Calculate builder coverage (strategic positioning bonus)
 */
export function calculateBuilderCoverage(boardState, playerOwner) {
  let totalBonus = 0

  // Points 9-11: +1 for single checker, +0.5 for multiple checkers
  for (let p = 9; p <= 11; p++) {
    const pointData = boardState.points[p - 1]
    if (pointData && pointData.owner === playerOwner && pointData.count >= 1) {
      totalBonus += (pointData.count === 1) ? 1.0 : 0.5
    }
  }

  // Point 8: +0.5 for single checker only, 0 for multiple
  const point8Data = boardState.points[7] // point 8 is index 7
  if (point8Data && point8Data.owner === playerOwner && point8Data.count === 1) {
    totalBonus += 0.5
  }

  return totalBonus
}

/**
 * Get maximum stack size for a player
 */
export function getMaxStackSize(boardState, playerOwner) {
  let max = 0
  for (const point of Object.values(boardState.points || {})) {
    if (point.owner === playerOwner) {
      max = Math.max(max, point.count || 0)
    }
  }
  return max
}

/**
 * Check if there's contact (opponent checkers on board)
 */
export function hasContact(boardState) {
  const whiteInUpper = countCheckersInRange(boardState, 'white', 13, 24) > 0
  const blackInLower = countCheckersInRange(boardState, 'black', 1, 12) > 0
  return whiteInUpper && blackInLower
}

/**
 * Check prime length for a player
 */
export function checkPrimeLength(boardState, playerOwner) {
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
 * Format a move combination for display
 */
function formatMove(moveCombination) {
  if (!moveCombination) return 'unknown move'

  if (!moveCombination.moves) {
    // Single move
    if (moveCombination.fromBar) {
      return `bar/${moveCombination.to}`
    }
    return `${moveCombination.from}/${moveCombination.to}`
  }

  // Move combination
  const parts = []
  for (const move of moveCombination.moves) {
    if (move.fromBar) {
      parts.push(`bar/${move.to}`)
    } else {
      parts.push(`${move.from}/${move.to}`)
    }
  }

  return parts.join(' ')
}