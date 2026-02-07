/**
 * Game State Validation Functions
 * Core validation logic for backgammon game state
 */

import { debugFetchLog } from '../config/debugConfig.js'

/**
 * Check if a player can bear off checkers (array format board)
 */
export function canPlayerBearOff(board, playerIndex) {
  // Player can bear off if all their checkers are in their home board
  // Home board: points 1-6 for white (playerIndex 0), points 19-24 for black (playerIndex 1)

  const homeStart = playerIndex === 0 ? 1 : 19
  const homeEnd = playerIndex === 0 ? 6 : 24

  // Check if any checkers are outside home board
  for (let point = 1; point <= 24; point++) {
    if ((point < homeStart || point > homeEnd) && board[point][playerIndex] > 0) {
      return false
    }
  }

  // Check if any checkers are on the bar
  if (board[playerIndex === 0 ? 0 : 25][playerIndex] > 0) {
    return false
  }

  return true
}

/**
 * Check if a move is valid in array format
 */
export function isValidMove(board, fromPoint, dieValue, playerIndex) {
  // Must have at least one checker on the point
  if (board[fromPoint][playerIndex] === 0) return false

  // Calculate target point based on player direction and move type
  let toPoint
  const isBarMove = (fromPoint === 0 && playerIndex === 0) || (fromPoint === 25 && playerIndex === 1)

  if (isBarMove) {
    // Bar moves: entering the board on opponent's home board
    if (playerIndex === 0) { // White enters on points 19-24
      toPoint = 25 - dieValue  // 24-19
    } else { // Black enters on points 1-6
      toPoint = dieValue  // 1-6
    }
  } else {
    // Regular moves
    if (playerIndex === 0) { // White moves toward lower numbers
      toPoint = fromPoint - dieValue
    } else { // Black moves toward higher numbers
      toPoint = fromPoint + dieValue
    }
  }

  // Check if this is a bearing off move (moving beyond home board)
  const isBearingOff = (playerIndex === 0 && toPoint < 1) || (playerIndex === 1 && toPoint > 24)

  if (isBearingOff) {
    // For bearing off, check if player can bear off (all checkers in home board)
    const canBearOff = canPlayerBearOff(board, playerIndex)
    return canBearOff
  }

  // Regular move - can't move beyond the board boundaries
  if (toPoint < 1 || toPoint > 24) return false

  // Cannot land on points with 2+ opponent checkers (made point)
  const targetOpponent = board[toPoint][1 - playerIndex]
  return targetOpponent < 2  // Can hit single checker, cannot land on made point
}