11/**
 * Backgammon Game Logic Utilities
 * Contains all game logic functions for move validation and generation
 */

// Import required utilities
import { parseXGID } from './xgidParser.js'

/**
 * Get available dice (not yet used)
 * @param {number[]} dice - Array of dice values
 * @param {number[]} usedDice - Array of used dice values
 * @returns {number[]} - Array of available dice values
 */
export function getAvailableDice(dice, usedDice) {
  const available = [...dice]
  for (const used of usedDice) {
    const index = available.indexOf(used)
    if (index !== -1) {
      available.splice(index, 1)
    }
  }
  return available
}

/**
 * Convert relative point number (current player's perspective) to absolute (white's perspective/physical board)
 * @param {number} relativePoint - Point number in current player's perspective (1-24)
 * @param {number} currentPlayer - Current player (-1 for black, 1 for white)
 * @returns {number} - Absolute point number (1-24)
 */
export function relativeToAbsolute(relativePoint, currentPlayer) {
  if (currentPlayer === 1) { // White's turn
    return relativePoint // Already in white's perspective
  } else { // Black's turn
    return 25 - relativePoint // Convert black's perspective to white's perspective
  }
}

/**
 * Check if player can bear off
 * @param {Object} boardState - Current board state
 * @param {string} owner - 'black' | 'white'
 * @param {number} currentPlayer - Current player (-1 for black, 1 for white)
 * @returns {boolean} - True if player can bear off
 */
export function canBearOff(boardState, owner, currentPlayer) {
  // Rule: All checkers in play must be in the player's home board
  // Checkers on the bar are "in play" but not in home board, so bearing off is not allowed
  const barCount = owner === 'black' ? boardState.blackBar : boardState.whiteBar
  if (barCount > 0) {
    return false
  }

  // All checkers on points must be in home board (relative points 1-6)
  const homeBoardAbsolute = currentPlayer === 1
    ? [1, 2, 3, 4, 5, 6]  // White's home board
    : [19, 20, 21, 22, 23, 24]  // Black's home board (relative 1-6 = absolute 19-24)

  for (let i = 0; i < 24; i++) {
    const pointData = boardState.points[i]
    if (pointData.count > 0 && pointData.owner === owner) {
      const absolutePoint = i + 1
      if (!homeBoardAbsolute.includes(absolutePoint)) {
        return false
      }
    }
  }

  return true
}

/**
 * Get the highest occupied point in player's home board when bearing off
 * Returns relative point number (1-6) in current player's perspective
 * @param {Object} boardState - Current board state (in white's perspective)
 * @param {string} owner - 'black' | 'white'
 * @param {number} currentPlayer - Current player (-1 for black, 1 for white)
 * @returns {number|null} - Highest occupied relative point number (1-6), or null if none
 */
export function getHighestOccupiedPoint(boardState, owner, currentPlayer) {
  // Rules are identical for both players - just convert absolute points to relative and find max
  // Home board is relative points 1-6 for both players
  let highestRelativePoint = null

  // Check all relative points 1-6
  for (let relativePoint = 6; relativePoint >= 1; relativePoint--) {
    // Convert relative point to absolute point
    const absolutePoint = relativeToAbsolute(relativePoint, currentPlayer)
    const pointIndex = absolutePoint - 1
    const pointData = boardState.points[pointIndex]

    if (pointData.count > 0 && pointData.owner === owner) {
      // Found an occupied point - return it (we're iterating from highest to lowest)
      return relativePoint
    }
  }

  return null
}

/**
 * Check if player can enter from bar
 * @param {Object} boardState - Current board state
 * @param {Object} turnState - Turn state
 * @returns {boolean} - True if player can enter from bar
 */
export function canEnterFromBar(boardState, turnState) {
  if (!turnState.mustEnterFromBar) return false
  if (turnState.dice.length === 0) return false

  const owner = turnState.currentPlayer
  const currentPlayer = owner === 'white' ? 1 : -1
  const availableDice = getAvailableDice(turnState.dice, turnState.usedDice || [])

  if (availableDice.length === 0) return false

  // Check if any entry point is available
  // Bar entry: always enter to opponent's home board (relative points 19-24)
  // Roll 1→24, 2→23, 3→22, 4→21, 5→20, 6→19
  for (const die of availableDice) {
    const entryPointRelative = 25 - die // Relative points 19-24
    const entryPointAbsolute = relativeToAbsolute(entryPointRelative, currentPlayer)

    if (entryPointRelative >= 19 && entryPointRelative <= 24) {
      const pointData = boardState.points[entryPointAbsolute - 1]
      // Can enter if point is empty, has own checkers, or has exactly 1 opponent checker (blot)
      if (pointData.count === 0 ||
          pointData.owner === owner ||
          (pointData.count === 1 && pointData.owner !== owner)) {
        return true
      }
    }
  }

  return false
}

/**
 * Calculate move distance for a given move (using relative coordinates)
 * @param {number} from - Source point (1-24 relative, 0 for black bar, 25 for white bar)
 * @param {number} to - Destination point (1-24 relative, 0 for black bar, 25 for white bar, -1 for black tray, -2 for white tray)
 * @param {string} owner - 'black' | 'white'
 * @returns {number|null} - Distance moved, or null if invalid
 */
export function calculateMoveDistance(from, to, owner) {
  // Bar entry: Players enter to opponent's home board (relative points 19-24)
  if (from === 0 || from === 25) {
    if (to >= 19 && to <= 24) {
      return 25 - to // Distance: roll 1→24 (24), roll 2→23 (23), etc.
    }
    return null
  }

  // Bearing off: moving to tray from home board (relative points 1-6)
  if ((to === -1 || to === -2) && from >= 1 && from <= 6) {
    return 7 - from // Distance: point 1 = 6, point 6 = 1
  }

  // Regular point-to-point move (always from higher to lower numbers in relative coordinates)
  if (from >= 1 && from <= 24 && to >= 1 && to <= 24) {
    return from - to
  }

  return null
}

/**
 * Get all legal moves for the current player
 * @param {Object} boardState - Current board state
 * @param {Object} turnState - Turn state
 * @returns {Array} - Array of legal moves {from, to, dieUsed}
 */
export function getLegalMoves(boardState, turnState) {
  const legalMoves = []

  if (!turnState || !turnState.currentPlayer || turnState.dice.length === 0) {
    return legalMoves
  }

  const owner = turnState.currentPlayer
  const currentPlayer = owner === 'white' ? 1 : -1
  const availableDice = getAvailableDice(turnState.dice, turnState.usedDice || [])

  if (availableDice.length === 0) {
    return legalMoves
  }

  // Check if must enter from bar
  if (turnState.mustEnterFromBar) {
    if (!canEnterFromBar(boardState, turnState)) {
      return legalMoves
    }

    // Check bar entry moves
    // Bar entry: always enter to opponent's home board (relative points 19-24)
    // Roll 1→24, 2→23, 3→22, 4→21, 5→20, 6→19
    for (const die of availableDice) {
      const entryPointRelative = 25 - die // Relative points 19-24
      const entryPointAbsolute = relativeToAbsolute(entryPointRelative, currentPlayer)

      if (entryPointRelative >= 19 && entryPointRelative <= 24) {
        const pointData = boardState.points[entryPointAbsolute - 1]
        // Can enter if point is empty, has own checkers, or has exactly 1 opponent checker (blot)
        if (pointData.count === 0 ||
            pointData.owner === owner ||
            (pointData.count === 1 && pointData.owner !== owner)) {
          legalMoves.push({ from: owner === 'white' ? 25 : 0, to: entryPointRelative, dieUsed: die })
        }
      }
    }

    return legalMoves
  }

  // Check if can bear off
  const bearingOff = canBearOff(boardState, owner, currentPlayer)
  const highestOccupiedPoint = bearingOff ? getHighestOccupiedPoint(boardState, owner, currentPlayer) : null

  // Check all points for possible moves
  for (let fromPointRelative = 1; fromPointRelative <= 24; fromPointRelative++) {
    const fromPointAbsolute = relativeToAbsolute(fromPointRelative, currentPlayer)
    const fromIndex = fromPointAbsolute - 1
    const fromPointData = boardState.points[fromIndex]

    // Must have checkers owned by current player
    if (fromPointData.count === 0 || fromPointData.owner !== owner) {
      continue
    }

    // Try each available die
    for (const die of availableDice) {
      // Calculate destination (always from higher to lower relative points)
      let toPointRelative = fromPointRelative - die

      // Check bearing off
      if (bearingOff && toPointRelative < 1) {
        // Bearing off happens when moving past point 1
        // Bearing off distance: point 1 = 6, point 2 = 5, ..., point 6 = 1
        const bearOffDistance = 7 - fromPointRelative

        if (fromPointRelative >= 1 && fromPointRelative <= 6) {
          // Bearing off rules:
          // 1. Point N can only bear off with die N (exact match: point number = die number)
          // 2. Exception: If lowest remaining die > highest occupied point, MUST bear off from highest point
          if (highestOccupiedPoint !== null && availableDice.length > 0) {
            const lowestRemainingDie = Math.min(...availableDice)
            if (lowestRemainingDie > highestOccupiedPoint) {
              // Rule 2: Lowest remaining die exceeds highest occupied point - must bear off from highest point only with lowest die
              if (fromPointRelative === highestOccupiedPoint && die === lowestRemainingDie) {
                const tray = owner === 'white' ? -2 : -1
                legalMoves.push({ from: fromPointRelative, to: tray, dieUsed: die })
              }
            } else {
              // Rule 1: Exact match - point number must equal die number
              if (fromPointRelative === die) {
                const tray = owner === 'white' ? -2 : -1
                legalMoves.push({ from: fromPointRelative, to: tray, dieUsed: die })
              }
            }
              } else {
            // Rule 1: Exact match - point number must equal die number
            if (fromPointRelative === die) {
              const tray = owner === 'white' ? -2 : -1
              legalMoves.push({ from: fromPointRelative, to: tray, dieUsed: die })
            }
          }
        }
        continue
      }

      // Regular move to point
      if (toPointRelative >= 1 && toPointRelative <= 24) {
        const toPointAbsolute = relativeToAbsolute(toPointRelative, currentPlayer)
        const toIndex = toPointAbsolute - 1
        const toPointData = boardState.points[toIndex]

        // Can move if point is empty, has own checkers, or has exactly 1 opponent checker (blot)
        if (toPointData.count === 0 ||
            toPointData.owner === owner ||
            (toPointData.count === 1 && toPointData.owner !== owner)) {
          legalMoves.push({ from: fromPointRelative, to: toPointRelative, dieUsed: die })
        }
      }
    }
  }

  return legalMoves
}

/**
 * Validate a move based on editing mode
 * @param {number} from - Source point number (1-24 relative, 0 for black bar, 25 for white bar, -1 for black tray, -2 for white tray)
 * @param {number} to - Destination point number (same as from)
 * @param {number} count - Number of checkers to move
 * @param {string} owner - Owner of checkers ('black' or 'white')
 * @param {string} mode - Editing mode ('free' or 'play')
 * @param {Object} boardState - Current board state
 * @param {Object} turnState - Turn state (optional, for play mode)
 * @returns {boolean} - True if move is valid
 */
export function validateMove(from, to, count, owner, mode, boardState, turnState = null) {
  // Always enforce bar drop rules: BLACK checkers can only go to point 0 (black bar), WHITE checkers can only go to point 25 (white bar)
  if (to === 0 && owner !== 'black') {
    return false // Can't drop non-black checker on black bar
  }
  if (to === 25 && owner !== 'white') {
    return false // Can't drop non-white checker on white bar
  }

  // Always enforce tray drop rules: BLACK checkers can only go to point -1 (black tray), WHITE checkers can only go to point -2 (white tray)
  if (to === -1 && owner !== 'black') {
    return false // Can't drop non-black checker on black tray
  }
  if (to === -2 && owner !== 'white') {
    return false // Can't drop non-white checker on white tray
  }

  if (mode === 'free') {
    // Free editing mode: allow all other moves
    return true
  }

  // Play mode: validate move according to backgammon rules
  // Check if it's the current player's turn
  const currentPlayer = boardState.player
  if (currentPlayer === undefined) {
    return false // Can't validate without knowing current player
  }
  const expectedOwner = currentPlayer === 1 ? 'white' : 'black'
  if (owner !== expectedOwner) {
    return false // Not the current player's turn
  }

  // Use turnState if available and matches current player, otherwise fall back to boardState.dice
  let diceValues = []
  let isDoubles = false
  let allDice = [] // All dice (including used) to detect doubles

  // Only use turnState if it exists and matches the current player
  if (turnState && turnState.currentPlayer === owner) {
    // Use available dice from turn state
    diceValues = getAvailableDice(turnState.dice, turnState.usedDice || [])
    allDice = turnState.dice || []
    // Detect doubles: all 4 dice are the same value
    isDoubles = allDice.length === 4 && allDice[0] === allDice[1] && allDice[1] === allDice[2] && allDice[2] === allDice[3]

  // Check bar entry requirement
  if (turnState.mustEnterFromBar) {
      // Bars are physical locations: 0 = black bar (top), 25 = white bar (bottom)
      // Check if moving from the correct bar for this owner
      const correctBar = owner === 'white' ? 25 : 0
      if (from !== correctBar) {
        return false // Must enter from bar first
      }
    }
  } else {
    // Fall back to checking all dice from boardState (no turn state or mismatch)
    const dice = boardState.dice
    if (!dice || dice === '00') {
      return false // No dice rolled yet
    }

    // Parse dice values
    const die1 = parseInt(dice[0])
    const die2 = parseInt(dice[1])
    if (isNaN(die1) || isNaN(die2) || die1 === 0 || die2 === 0) {
      return false // Invalid dice
    }
    // Doubles: if both dice are the same, allow 4 moves of that number
    isDoubles = die1 === die2
    diceValues = isDoubles ? [die1, die1, die1, die1] : [die1, die2]
    allDice = isDoubles ? [die1, die1, die1, die1] : [die1, die2]
  }

  if (diceValues.length === 0) {
    return false // No available dice
  }

  // In play mode, validate checker count based on whether doubles are rolled
  if (mode === 'play') {
    if (isDoubles) {
      // Doubles: allow 1-4 checkers
      if (count < 1 || count > 4) {
        return false // Invalid count for doubles
      }
    } else {
      // Non-doubles: enforce one checker per die
      if (count !== 1) {
        return false // Can only move one checker at a time for non-doubles
      }
    }
  }

  // Calculate move distance (from and to are in relative coordinates)
  const distance = calculateMoveDistance(from, to, owner)
  if (distance === null || distance <= 0) {
    return false // Invalid move distance
  }

  // Check if distance matches a die value
  const isBearingOff = (to === -1 || to === -2)

  // For bearing off: check if point number equals die number OR if die exceeds highest occupied point
  let matchesDie = false
  if (isBearingOff && from >= 1 && from <= 6) {
    // First check if bearing off is allowed (all checkers must be in home board)
    const bearingOffAllowed = canBearOff(boardState, owner, currentPlayer)
    if (!bearingOffAllowed) {
      return false // Cannot bear off if checkers are still outside home board
    }

    // Rule 1: Point N can only bear off with die N (exact match: point number = die number)
    matchesDie = diceValues.some(die => die === from)

    // Rule 2: Exception - if lowest remaining die > highest occupied point, must bear off from highest point
    if (!matchesDie) {
      const highestOccupiedPoint = getHighestOccupiedPoint(boardState, owner, currentPlayer)
      if (highestOccupiedPoint !== null && diceValues.length > 0) {
        const lowestRemainingDie = Math.min(...diceValues)
        // Check if lowest remaining die exceeds highest occupied point and we're bearing off from highest point
        if (lowestRemainingDie > highestOccupiedPoint && from === highestOccupiedPoint) {
          matchesDie = diceValues.includes(lowestRemainingDie)
        }
      }
    }
  } else {
    // Regular moves: exact match required (distance = die)
    matchesDie = diceValues.some(die => die === distance)
  }

  if (!matchesDie) {
    return false // Move distance doesn't match any die
  }

  // For multi-checker moves in play mode with doubles, validate enough matching dice are available
  if (mode === 'play' && count > 1 && isDoubles) {
    // Determine which die value matches this move
    const matchingDieValue = isBearingOff && from >= 1 && from <= 6
      ? from // For bearing off, the die value equals the point number
      : distance // For regular moves, the die value equals the distance

    // Count how many dice of the matching value are available
    const availableMatchingDice = diceValues.filter(d => d === matchingDieValue)

    // Ensure we have enough dice to move this many checkers
    if (availableMatchingDice.length < count) {
      return false // Not enough matching dice available
    }
  }

  // Validate source point has checkers (convert relative to absolute)
  if (from >= 1 && from <= 24) {
    const fromAbsolute = relativeToAbsolute(from, currentPlayer)
    const fromIndex = fromAbsolute - 1
    const fromPointData = boardState.points[fromIndex]
    if (fromPointData.count === 0 || fromPointData.owner !== owner) {
      return false // No checkers or wrong owner
    }
    if (fromPointData.count < count) {
      return false // Not enough checkers
    }
  } else if (from === 0) {
    // Moving from black bar
    if (boardState.blackBar === 0 || owner !== 'black') {
      return false
    }
    if (boardState.blackBar < count) {
      return false // Not enough checkers on bar
    }
  } else if (from === 25) {
    // Moving from white bar
    if (boardState.whiteBar === 0 || owner !== 'white') {
      return false
    }
    if (boardState.whiteBar < count) {
      return false // Not enough checkers on bar
    }
  }

  // Validate destination point (if not bearing off) - convert relative to absolute
  if (!isBearingOff && to >= 1 && to <= 24) {
    const toAbsolute = relativeToAbsolute(to, currentPlayer)
    const toIndex = toAbsolute - 1
    const toPointData = boardState.points[toIndex]

    // Can't move to point with 2+ opponent checkers
    if (toPointData.count > 1 && toPointData.owner && toPointData.owner !== owner) {
      return false // Point is blocked
    }
  }

  // Validate bearing off rule: if lowest remaining die exceeds highest occupied point, must bear off from highest point
  // (This is already checked in matchesDie above, but we verify here for consistency)
  if (isBearingOff && from >= 1 && from <= 6) {
    const bearingOff = canBearOff(boardState, owner, currentPlayer)
    if (bearingOff) {
      const highestOccupiedPoint = getHighestOccupiedPoint(boardState, owner, currentPlayer)
      if (highestOccupiedPoint !== null && diceValues.length > 0) {
        const lowestRemainingDie = Math.min(...diceValues)

        if (lowestRemainingDie > highestOccupiedPoint) {
          // Lowest remaining die exceeds highest occupied point - must bear off from highest point only with lowest die
          if (from !== highestOccupiedPoint || !diceValues.includes(lowestRemainingDie)) {
            return false // Can only bear off from highest occupied point with lowest die when it exceeds highest point
          }
        }
      }
    }
  }

  return true
}
