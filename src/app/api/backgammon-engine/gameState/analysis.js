/**
 * Game State Analysis Functions
 * Functions for analyzing game state and checker positions
 */

/**
 * Count checkers in a specific point range for a player
 */
export function countCheckersInRange(boardState, owner, startPoint, endPoint) {
  let count = 0
  for (let point = startPoint; point <= endPoint; point++) {
    const pointData = boardState.points[point - 1]
    if (pointData.owner === owner && pointData.count > 0) {
      count += pointData.count
    }
  }
  return count
}