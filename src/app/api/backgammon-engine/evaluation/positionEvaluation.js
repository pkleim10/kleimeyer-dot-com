/**
 * Position evaluation functions for backgammon engine
 */

import { POSITION_WEIGHTS } from '../config/heuristicWeights.js'
import { calculatePipCounts, identifyBlots, identifyOpponentPositions, getMadePoints } from '../utils/boardAnalysis.js'
import { calculateBlotRisk, checkPrimeLength, hasContact } from './moveEvaluation.js'
import { countCheckersInRange } from '../utils/boardUtils.js'

/**
 * Evaluate overall position quality for a player
 * Returns a score where positive values indicate advantage
 */
export function evaluatePosition(boardState, playerOwner) {
  const opponentOwner = playerOwner === 'white' ? 'black' : 'white'

  // 1. Pip count advantage (race evaluation)
  const pipCounts = calculatePipCounts(boardState)
  const playerPips = playerOwner === 'white' ? pipCounts.white : pipCounts.black
  const opponentPips = playerOwner === 'white' ? pipCounts.black : pipCounts.white
  const pipDiff = opponentPips - playerPips // Positive = advantage
  // Normalize: typical game has ~150-200 pips, so divide by 162 for reasonable scale
  const pipAdvantageScore = (pipDiff / 162) * POSITION_WEIGHTS.pipAdvantage

  // 2. Blot safety assessment
  const blots = identifyBlots(boardState, playerOwner)
  const opponentPositions = identifyOpponentPositions(boardState, playerOwner)
  const playerMadePoints = getMadePoints(boardState, playerOwner)

  let totalBlotRisk = 0
  for (const blotPoint of blots) {
    const risk = calculateBlotRisk(blotPoint, opponentPositions, playerMadePoints, playerOwner)
    totalBlotRisk += risk.weightedRisk
  }
  // Average risk per blot, normalized
  const avgBlotRisk = blots.length > 0 ? totalBlotRisk / blots.length : 0
  const blotSafetyScore = avgBlotRisk * blots.length * POSITION_WEIGHTS.blotSafety

  // 3. Made points strength
  const madePointsCount = playerMadePoints.length
  // Bonus for key points (bar-points, 5-point, etc.)
  const keyPoints = playerOwner === 'white' ? [5, 7] : [18, 20]
  let keyPointsBonus = 0
  for (const point of keyPoints) {
    if (playerMadePoints.includes(point)) {
      keyPointsBonus += 0.5
    }
  }
  const madePointsScore = (madePointsCount + keyPointsBonus) * POSITION_WEIGHTS.madePoints

  // 4. Prime strength
  const primeLength = checkPrimeLength(boardState, playerOwner)
  // Bonus for longer primes (exponential scaling)
  const primeStrength = primeLength >= 4 ? primeLength * 1.5 : primeLength
  const primeScore = primeStrength * POSITION_WEIGHTS.primeStrength

  // 5. Home board strength
  const homeBoardStart = playerOwner === 'white' ? 1 : 19
  const homeBoardEnd = playerOwner === 'white' ? 6 : 24
  const homeBoardCheckers = countCheckersInRange(boardState, playerOwner, homeBoardStart, homeBoardEnd)
  const homeBoardMadePoints = playerMadePoints.filter(p => p >= homeBoardStart && p <= homeBoardEnd).length
  // Stronger home board = better bear-off position
  const homeBoardScore = (homeBoardCheckers * 0.1 + homeBoardMadePoints * 0.5) * POSITION_WEIGHTS.homeBoardStrength

  // 6. Anchor strength (back game potential)
  const opponentHomeStart = playerOwner === 'white' ? 19 : 1
  const opponentHomeEnd = playerOwner === 'white' ? 24 : 6
  const anchors = []
  for (let point = opponentHomeStart; point <= opponentHomeEnd; point++) {
    const pointData = boardState.points[point - 1]
    if (pointData.owner === playerOwner && pointData.count >= 2) {
      anchors.push(point)
    }
  }
  // Anchors in opponent's home board are valuable
  const anchorScore = anchors.length * POSITION_WEIGHTS.anchorStrength

  // 7. Contact advantage (tactical position)
  const inContact = hasContact(boardState)
  let contactScore = 0
  if (inContact) {
    // Advantage if you have more made points and fewer blots
    const opponentBlots = identifyBlots(boardState, opponentOwner)
    const opponentMadePoints = getMadePoints(boardState, opponentOwner)
    const madePointsDiff = madePointsCount - opponentMadePoints.length
    const blotDiff = opponentBlots.length - blots.length
    contactScore = (madePointsDiff * 0.3 + blotDiff * 0.2) * POSITION_WEIGHTS.contactAdvantage
  }

  // Calculate total position score
  const totalScore = pipAdvantageScore + blotSafetyScore + madePointsScore +
                     primeScore + homeBoardScore + anchorScore + contactScore

  return {
    score: totalScore,
    breakdown: {
      pipAdvantage: { diff: pipDiff, score: pipAdvantageScore },
      blotSafety: { blots: blots.length, avgRisk: avgBlotRisk, score: blotSafetyScore },
      madePoints: { count: madePointsCount, keyPointsBonus, score: madePointsScore },
      primeStrength: { length: primeLength, score: primeScore },
      homeBoard: { checkers: homeBoardCheckers, madePoints: homeBoardMadePoints, score: homeBoardScore },
      anchors: { count: anchors.length, positions: anchors, score: anchorScore },
      contact: { inContact, score: contactScore }
    }
  }
}

/**
 * Evaluate position difference between two board states
 * Useful for comparing positions before/after moves
 */
export function evaluatePositionDifference(beforeState, afterState, playerOwner) {
  const beforeEval = evaluatePosition(beforeState, playerOwner)
  const afterEval = evaluatePosition(afterState, playerOwner)

  return {
    scoreDiff: afterEval.score - beforeEval.score,
    before: beforeEval,
    after: afterEval
  }
}