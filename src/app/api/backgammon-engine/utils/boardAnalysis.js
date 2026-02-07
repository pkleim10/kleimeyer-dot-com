/**
 * Board analysis functions for backgammon engine
 */

import { debugFetchLog } from '../config/debugConfig.js'

/**
 * Identify blots (single checkers) for a player
 */
export function identifyBlots(boardState, playerOwner) {
  const blots = []
  for (let point = 1; point <= 24; point++) {
    const pointData = boardState.points[point - 1]
    if (pointData.owner === playerOwner && pointData.count === 1) {
      blots.push(point)
    }
  }
  return blots
}

/**
 * Identify opponent positions for hit calculations
 */
export function identifyOpponentPositions(boardState, playerOwner) {
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

/**
 * Get made points (points controlled by player with 2+ checkers)
 */
export function getMadePoints(boardState, playerOwner) {
  const madePoints = []
  for (let point = 1; point <= 24; point++) {
    const pointData = boardState.points[point - 1]
    if (pointData.owner === playerOwner && pointData.count >= 2) {
      madePoints.push(point)
    }
  }
  return madePoints
}

/**
 * Calculate pip counts for both players
 */
export function calculatePipCounts(boardState) {
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

/**
 * Check if a move results in hitting an opponent's blot
 */
export function checkForHit(beforeState, move, playerOwner) {
  const to = move.to
  if (to < 1 || to > 24) return null

  const toPoint = beforeState.points[to - 1]
  const opponentOwner = playerOwner === 'white' ? 'black' : 'white'
  if (toPoint.count === 1 && toPoint.owner === opponentOwner) {
    return { hitPoint: to, opponentOwner }
  }
  return null
}