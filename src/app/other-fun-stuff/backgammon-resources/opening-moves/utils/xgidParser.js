/**
 * Parse XGID string to extract board position information
 * XGID format: "xg1:xg2:xg3:..." (colon-separated values)
 * 
 * xg1: 26-character string representing checker positions
 *   Position 1: BLACK checkers on BAR
 *   Positions 2-25: Checkers on points 1-24 (from WHITE's perspective)
 *   Position 26: WHITE checkers on BAR
 * 
 * Character encoding:
 *   "-": empty (0 checkers)
 *   a-o (lowercase): BLACK checkers (a=1, b=2, ..., o=15)
 *   A-O (uppercase): WHITE checkers (A=1, B=2, ..., O=15)
 */

/**
 * Convert character to checker count
 * @param {string} char - Single character from xg1 string
 * @returns {number} - Number of checkers (0-15)
 */
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

/**
 * Determine checker owner from character
 * @param {string} char - Single character from xg1 string
 * @returns {string|null} - 'black', 'white', or null if empty
 */
function charToOwner(char) {
  if (char === '-') return null
  if (char >= 'a' && char <= 'o') return 'black'
  if (char >= 'A' && char <= 'O') return 'white'
  return null
}

/**
 * Parse xg1 (first part of XGID string)
 * xg2: cubeValue (exponent 0-6)
 * xg3: cubeOwner (-1 = black, 0 = nobody, 1 = white)
 * xg4: player (-1 = black, 1 = white)
 * xg5: dice ("00" = player to roll, "XY" = rolled dice values, e.g., "36" = 3 and 6)
 * @param {string} xgid - Full XGID string (format: "xg1:xg2:xg3:xg4:xg5:...")
 * @returns {Object} - Parsed board state with cubeValue, cubeOwner, player, and dice
 */
export function parseXGID(xgid) {
  if (!xgid || typeof xgid !== 'string') {
    return {
      blackBar: 0,
      whiteBar: 0,
      points: Array(24).fill({ count: 0, owner: null }),
      cubeValue: undefined, // No cubeValue if XGID not provided
      cubeOwner: undefined, // No cubeOwner if XGID not provided
      player: undefined, // No player if XGID not provided
      dice: undefined // No dice if XGID not provided
    }
  }

  // Split XGID by colon to get individual parts
  const parts = xgid.split(':')
  const xg1 = parts[0] || ''
  const xg2 = parts[1] // cubeValue (exponent 0-6)
  const xg3 = parts[2] // cubeOwner (-1, 0, or 1)
  const xg4 = parts[3] // player (-1 or 1)
  const xg5 = parts[4] // dice ("00" or "XY" format)

  // Validate xg1 length
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

  // Parse positions
  const blackBar = charToCount(xg1[0]) // Position 1: BLACK on bar
  
  // Positions 2-25: Points 1-24 (from WHITE's perspective)
  const points = []
  for (let i = 1; i <= 24; i++) {
    const char = xg1[i]
    const count = charToCount(char)
    const owner = charToOwner(char)
    points.push({ count, owner })
  }
  
  const whiteBar = charToCount(xg1[25]) // Position 26: WHITE on bar

  // Parse xg2 (cubeValue): should be a digit 0-6
  let cubeValue = undefined
  if (xg2 !== undefined && xg2 !== '') {
    const parsed = parseInt(xg2, 10)
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 6) {
      cubeValue = parsed
    }
  }

  // Parse xg3 (cubeOwner): should be -1, 0, or 1
  let cubeOwner = undefined
  if (xg3 !== undefined && xg3 !== '') {
    const parsed = parseInt(xg3, 10)
    if (!isNaN(parsed) && (parsed === -1 || parsed === 0 || parsed === 1)) {
      cubeOwner = parsed
    }
  }

  // Parse xg4 (player): should be -1 or 1
  let player = undefined
  if (xg4 !== undefined && xg4 !== '') {
    const parsed = parseInt(xg4, 10)
    if (!isNaN(parsed) && (parsed === -1 || parsed === 1)) {
      player = parsed
    }
  }

  // Parse xg5 (dice): should be "00" or "XY" format (two digits)
  let dice = undefined
  if (xg5 !== undefined && xg5 !== '') {
    // Validate dice format: should be exactly 2 characters, digits only
    if (/^\d{2}$/.test(xg5)) {
      dice = xg5
    }
  }

  return {
    blackBar,
    whiteBar,
    points, // Array of 24 objects, each with {count, owner}
    cubeValue, // Exponent 0-6, or undefined if not provided
    cubeOwner, // -1 (black), 0 (nobody), 1 (white), or undefined if not provided
    player, // -1 (black), 1 (white), or undefined if not provided
    dice // "00" (to roll) or "XY" (rolled values), or undefined if not provided
  }
}

