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
 * @param {string} xgid - Full XGID string
 * @returns {Object} - Parsed board state
 */
export function parseXGID(xgid) {
  if (!xgid || typeof xgid !== 'string') {
    return {
      blackBar: 0,
      whiteBar: 0,
      points: Array(24).fill({ count: 0, owner: null })
    }
  }

  // Split XGID by colon to get individual parts
  const parts = xgid.split(':')
  const xg1 = parts[0] || ''

  // Validate xg1 length
  if (xg1.length !== 26) {
    console.warn(`Invalid xg1 length: expected 26, got ${xg1.length}`)
    return {
      blackBar: 0,
      whiteBar: 0,
      points: Array(24).fill({ count: 0, owner: null })
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

  return {
    blackBar,
    whiteBar,
    points // Array of 24 objects, each with {count, owner}
  }
}

