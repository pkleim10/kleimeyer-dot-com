import { parseXGID } from './xgidParser'

/**
 * Convert point number from BLACK's perspective to WHITE's perspective
 * BLACK's point 1 = WHITE's point 24, BLACK's point 13 = WHITE's point 12, etc.
 */
function convertBlackToWhitePoint(blackPoint) {
  return 25 - blackPoint
}

/**
 * Apply a move to a board position and return the new XGID string and ghost checkers
 * @param {string} xgid - Starting XGID position
 * @param {string} move - Move in standard notation (e.g., "24/18 13/11")
 * @param {string} player - 'white' or 'black' (default: 'white')
 * @returns {{ xgid: string, ghostCheckers: Object }} - New XGID string and ghost checkers object
 */
export function applyMove(xgid, move, player = 'white') {
  if (!xgid || !move) {
    return { xgid, ghostCheckers: {}, ghostCheckerPositions: {}, ghostCheckerOwners: {}, moves: [] }
  }
  
  // Parse the starting position
  const boardState = parseXGID(xgid)
  // Preserve original XGID parts for reconstruction
  const xgidParts = xgid.split(':')
  
  // Track ghost checkers: object mapping point numbers to arrays of {position, owner}
  const ghostCheckers = {}
  // Track ghost checker owners: object mapping point numbers to owner ('black' or 'white')
  const ghostCheckerOwners = {}
  // Track moves for arrow rendering: array of {from, to, fromStackPosition} point numbers
  const moves = []
  
  // Parse move into individual steps (e.g., "24/18 13/11" -> [["24", "18"], ["13", "11"]])
  const moveSteps = move.trim().split(/\s+/).map(step => {
    const parts = step.split('/')
    if (parts.length !== 2) return null
    let fromPoint = parseInt(parts[0])
    let toPoint = parseInt(parts[1])
    
    // Convert BLACK point numbers to WHITE point numbers if needed
    if (player === 'black') {
      fromPoint = convertBlackToWhitePoint(fromPoint)
      toPoint = convertBlackToWhitePoint(toPoint)
    }
    
    return [fromPoint, toPoint]
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
    
    // Ensure we're moving the correct player's checkers
    if (fromPointData.owner !== player) continue
    
    const movingPlayer = player
    
    // Track the stack position of the checker being moved (from top of stack)
    // Position 1 is the top checker, position 2 is second from top, etc.
    const fromStackPosition = fromPointData.count
    
    // Track the destination stack position (where the checker will land)
    // Position 1 is the top checker, position 2 is second from top, etc.
    // The checker lands on top of any existing checkers
    const toStackPosition = toPointData.count + 1
    
    // Add ghost checker at the original position (store owner before removing checker)
    if (!ghostCheckers[fromPoint]) {
      ghostCheckers[fromPoint] = []
    }
    ghostCheckers[fromPoint].push(fromStackPosition)
    // Store the owner for this ghost checker
    ghostCheckerOwners[fromPoint] = movingPlayer
    
    // Track this move for arrow rendering with stack positions
    moves.push({ from: fromPoint, to: toPoint, fromStackPosition, toStackPosition })
    
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
  
  // Convert ghostCheckers from arrays to counts for backward compatibility
  const ghostCheckersCounts = {}
  for (const [point, positions] of Object.entries(ghostCheckers)) {
    ghostCheckersCounts[point] = positions.length
  }
  
  // Convert board state back to XGID format, preserving xg2 and other parts
  return {
    xgid: boardStateToXGID(boardState, xgidParts),
    ghostCheckers: ghostCheckersCounts, // Counts for rendering
    ghostCheckerPositions: ghostCheckers, // Array of positions for each point
    ghostCheckerOwners: ghostCheckerOwners, // Owner for each point with ghost checkers
    moves // Array of {from, to, fromStackPosition} for arrow rendering
  }
}

/**
 * Convert board state back to XGID string format
 * @param {Object} boardState - Board state object from parseXGID
 * @param {Array} originalParts - Original XGID parts array to preserve xg2, xg3, etc.
 * @returns {string} - XGID string
 */
function boardStateToXGID(boardState, originalParts = []) {
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
  
  // Build XGID string: xg1:xg2:xg3:xg4:xg5:xg6:xg7:xg8:xg9:xg10
  const xgidParts = [chars.join('')]
  
  // Preserve xg2 (cubeValue), xg3 (cubeOwner), xg4 (player), and xg5 (dice) from original XGID
  if (originalParts.length > 1) {
    xgidParts.push(originalParts[1]) // xg2 (cubeValue)
  }
  if (originalParts.length > 2) {
    xgidParts.push(originalParts[2]) // xg3 (cubeOwner)
  }
  if (originalParts.length > 3) {
    xgidParts.push(originalParts[3]) // xg4 (player)
  }
  if (originalParts.length > 4) {
    xgidParts.push(originalParts[4]) // xg5 (dice)
  }
  // Preserve xg6-xg10 (match play values) from original XGID, or use defaults if missing
  for (let i = 5; i < 10; i++) {
    if (originalParts.length > i) {
      xgidParts.push(originalParts[i]) // Preserve existing value
    } else {
      // Use defaults: xg6-xg9 = 0, xg10 = 10
      xgidParts.push(i === 9 ? '10' : '0')
    }
  }
  // Preserve any additional parts beyond xg10 (shouldn't normally exist)
  for (let i = 10; i < originalParts.length; i++) {
    xgidParts.push(originalParts[i])
  }
  
  return xgidParts.join(':')
}

