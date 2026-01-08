import { parseXGID } from './xgidParser'

/**
 * Apply a move to a board position and return the new XGID string
 * @param {string} xgid - Starting XGID position
 * @param {string} move - Move in standard notation (e.g., "24/18 13/11")
 * @returns {string} - New XGID string after applying the move
 */
export function applyMove(xgid, move) {
  if (!xgid || !move) return xgid
  
  // Parse the starting position
  const boardState = parseXGID(xgid)
  
  // Parse move into individual steps (e.g., "24/18 13/11" -> [["24", "18"], ["13", "11"]])
  const moveSteps = move.trim().split(/\s+/).map(step => {
    const parts = step.split('/')
    if (parts.length !== 2) return null
    return [parseInt(parts[0]), parseInt(parts[1])]
  }).filter(step => step !== null)
  
  // Apply each move step sequentially
  for (const [fromPoint, toPoint] of moveSteps) {
    if (fromPoint < 1 || fromPoint > 24 || toPoint < 1 || toPoint > 24) continue
    
    // Get point data (points array is 0-indexed, so point 1 is index 0)
    const fromIndex = fromPoint - 1
    const toIndex = toPoint - 1
    const fromPointData = boardState.points[fromIndex]
    const toPointData = boardState.points[toIndex]
    
    // Can't move from empty point
    if (fromPointData.count === 0 || !fromPointData.owner) continue
    
    // For opening moves, only WHITE moves
    // Ensure we're moving WHITE's checkers
    if (fromPointData.owner !== 'white') continue
    
    const movingPlayer = 'white'
    
    // Remove checker from source point
    fromPointData.count--
    if (fromPointData.count === 0) {
      fromPointData.owner = null
    }
    
    // Handle hitting: if landing on point with exactly 1 opponent checker
    if (toPointData.count === 1 && toPointData.owner && toPointData.owner !== movingPlayer) {
      // Hit the opponent checker - send it to bar
      if (toPointData.owner === 'black') {
        boardState.blackBar++
      } else {
        boardState.whiteBar++
      }
      // Clear the point
      toPointData.count = 0
      toPointData.owner = null
    }
    
    // Add checker to destination point
    if (toPointData.count === 0) {
      toPointData.owner = movingPlayer
    }
    toPointData.count++
  }
  
  // Convert board state back to XGID format
  return boardStateToXGID(boardState)
}

/**
 * Convert board state back to XGID string format
 * @param {Object} boardState - Board state object from parseXGID
 * @returns {string} - XGID string
 */
function boardStateToXGID(boardState) {
  // Character mapping: count to character
  const countToChar = (count, owner) => {
    if (count === 0) return '-'
    if (owner === 'black') {
      // Lowercase: a=1, b=2, ..., o=15
      if (count >= 1 && count <= 15) {
        return String.fromCharCode('a'.charCodeAt(0) + count - 1)
      }
    } else if (owner === 'white') {
      // Uppercase: A=1, B=2, ..., O=15
      if (count >= 1 && count <= 15) {
        return String.fromCharCode('A'.charCodeAt(0) + count - 1)
      }
    }
    return '-'
  }
  
  // Build the 26-character xg1 string
  const chars = []
  
  // Position 1: BLACK checkers on bar
  chars[0] = countToChar(boardState.blackBar, 'black')
  
  // Positions 2-25: Points 1-24 (from WHITE's perspective)
  for (let i = 1; i <= 24; i++) {
    const pointData = boardState.points[i - 1] // points array is 0-indexed
    chars[i] = countToChar(pointData.count, pointData.owner)
  }
  
  // Position 26: WHITE checkers on bar
  chars[25] = countToChar(boardState.whiteBar, 'white')
  
  // Combine into XGID format (for now, just return xg1 part)
  // TODO: Add other XGID parts (xg2, xg3, etc.) when needed
  return chars.join('')
}

