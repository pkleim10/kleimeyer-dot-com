/**
 * Board analysis and utility functions for backgammon engine
 */

import { debugFetchLog } from '../config/debugConfig.js'

/**
 * Convert board state to array format for fast move generation
 * Array format: [player_checkers, opponent_checkers] for indices 0-25
 * Index 0: white bar, Index 25: black bar, Indices 1-24: points 1-24
 */
export function boardToArray(boardState, playerOwner) {
  const board = new Array(26).fill(null).map(() => [0, 0])

  // Bars
  board[0][0] = boardState.whiteBar  // White checkers on white bar
  board[25][1] = boardState.blackBar // Black checkers on black bar

  // Points 1-24
  for (let point = 1; point <= 24; point++) {
    const pointData = boardState.points[point - 1]
    const arrayIndex = point

    if (pointData.owner === 'white') {
      board[arrayIndex][0] = pointData.count  // Player checkers (white)
    } else if (pointData.owner === 'black') {
      board[arrayIndex][1] = pointData.count  // Opponent checkers (black)
    }
    // Empty points remain [0, 0]
  }

  return board
}

/**
 * Display the board in human-readable ASCII format
 */
export function displayBoard(boardState) {
  const lines = []

  // Helper function to get checker symbol
  function getCheckerSymbol(owner, count) {
    if (count === 0) return '   '
    if (count === 1) return owner === 'white' ? ' O ' : ' X '
    // For counts 2-15, format as " X" where X is the count + symbol
    const symbol = owner === 'white' ? 'O' : 'X'
    const countStr = count.toString() + symbol
    // Pad with space on left to make exactly 3 characters
    return (' ' + countStr).slice(-3)
  }

  // Standard backgammon board layout:
  // Top row (Black's side): points 13-18, then bar, then points 19-24
  // Bottom row (White's side): points 12-7, then bar, then points 6-1

  // Top row - Black's perspective
  const topLeft = [12, 13, 14, 15, 16, 17] // Points 13,14,15,16,17,18 (array indices 12-17)
  const topRight = [18, 19, 20, 21, 22, 23] // Points 19,20,21,22,23,24 (array indices 18-23)

  const topLeftDisplay = topLeft.map(idx => {
    const point = boardState.points[idx]
    return getCheckerSymbol(point.owner, point.count)
  }).join('|')

  const topRightDisplay = topRight.map(idx => {
    const point = boardState.points[idx]
    return getCheckerSymbol(point.owner, point.count)
  }).join('|')

  // Bottom row - White's perspective (reversed for display)
  const bottomLeft = [11, 10, 9, 8, 7, 6] // Points 12,11,10,9,8,7 (array indices 11-6, reversed)
  const bottomRight = [5, 4, 3, 2, 1, 0] // Points 6,5,4,3,2,1 (array indices 5-0, reversed)

  const bottomLeftDisplay = bottomLeft.map(idx => {
    const point = boardState.points[idx]
    return getCheckerSymbol(point.owner, point.count)
  }).join('|')

  const bottomRightDisplay = bottomRight.map(idx => {
    const point = boardState.points[idx]
    return getCheckerSymbol(point.owner, point.count)
  }).join('|')

  // Create the display with proper spacing
  lines.push('    13  14  15  16  17  18  BB 19  20  21  22  23  24')
  lines.push('   ----------------------------------------------------')
  lines.push(`   |${topLeftDisplay}|${boardState.blackBar || 0}|${topRightDisplay}|`)
  lines.push('   ----------------------------------------------------')
  lines.push(`   |${bottomLeftDisplay}|${boardState.whiteBar || 0}|${bottomRightDisplay}|`)
  lines.push('   ----------------------------------------------------')
  lines.push('    12  11  10   9   8   7  BW  6   5   4   3   2   1')

  return lines.join('\n')
}

/**
 * Clone a board state for analysis (deep copy)
 */
export function cloneBoardState(boardState) {
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

/**
 * Apply a move to board state for analysis purposes
 */
export function applyMoveToBoardForAnalysis(boardState, move, playerOwner) {
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
  } else {
    // Bearing off - checker is removed from the board completely
    // No action needed since we already removed it from the source
  }

  return newState
}

/**
 * Calculate the final board state after applying a sequence of moves
 */
export function calculateFinalBoardState(boardState, moves, playerOwner) {
  let currentState = cloneBoardState(boardState)

  for (const move of moves) {
    currentState = applyMoveToBoardForAnalysis(currentState, move, playerOwner)
  }

  return currentState
}

// Helper functions for XGID parsing
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

/**
 * Parse XGID string into board state object
 */
export function parseXGID(xgid) {
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