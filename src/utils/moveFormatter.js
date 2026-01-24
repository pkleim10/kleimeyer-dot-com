/**
 * Centralized Move Formatting Utility
 * Handles all move notation formatting including:
 * - Bar moves (bar/point)
 * - Bear-off moves (point/off)
 * - Move grouping (point/off(3))
 * - Sequences (8/6 6/4 -> 8/4)
 * - Hit blots (*)
 */

/**
 * Check if a move is a bear-off move
 */
function isBearOffMove(move) {
  return move.isBearOff || (move.from >= 1 && move.from <= 24 && (move.to === 0 || move.to === 25) && !move.fromBar)
}

/**
 * Check if a move is a bar move
 */
function isBarMove(move) {
  return move.fromBar || move.from === 25 || move.from === 0
}

/**
 * Format a single move to string notation
 * @param {Object} move - Move object with from, to, hitBlot, etc.
 * @param {number|null} player - Player (1 for white, -1 for black, null for absolute)
 * @returns {string} Formatted move string like "5/off" or "bar/22"
 */
function formatSingleMove(move, player = null) {
  if (!move) return ''
  
  // Helper to convert absolute to relative coordinates
  const absoluteToRelative = (absolutePoint, currentPlayer) => {
    if (absolutePoint === 0 || absolutePoint === 25) return absolutePoint // Bar positions stay as-is
    if (absolutePoint === -1 || absolutePoint === -2) return absolutePoint // Off positions stay as-is
    if (currentPlayer === 1) return absolutePoint // White: absolute = relative
    return 25 - absolutePoint // Black: relative = 25 - absolute
  }
  
  let from, to
  
  if (player === null) {
    // Use absolute coordinates (as stored in move object)
    from = isBarMove(move) ? 'bar' : move.from
    to = isBearOffMove(move) ? 'off' : move.to
  } else {
    // Convert to relative coordinates
    const fromRel = absoluteToRelative(move.from, player)
    const toRel = absoluteToRelative(move.to, player)
    from = fromRel === 0 ? 'bar' : fromRel === 25 ? 'bar' : fromRel
    to = isBearOffMove(move) ? 'off' : (toRel === -1 ? 'off' : toRel === -2 ? 'off' : toRel)
  }
  
  const asterisk = move.hitBlot ? '*' : ''
  return `${from}/${to}${asterisk}`
}

/**
 * Format a combination of moves to string notation
 * Handles grouping, sequences, and proper ordering
 * @param {Object} moveCombination - Object with moves array and optional description
 * @param {number|null} player - Player (1 for white, -1 for black, null for absolute)
 * @returns {string} Formatted move string like "5/off 4/off(3)" or "bar/22 8/4"
 */
function formatMoveCombination(moveCombination, player = null, options = {}) {
  if (!moveCombination || !moveCombination.moves || moveCombination.moves.length === 0) {
    return moveCombination?.description || 'No move'
  }
  
  const moves = moveCombination.moves
  
  // Always rebuild description from moves array to ensure consistency
  // This ensures bear-off moves are always formatted correctly as "off" instead of "0" or "25"
  // Don't trust pre-built descriptions as they may have been built before fixes
  
  // Convert moves to formatted strings
  let convertedMoves = moves.map(m => ({
    move: m,
    moveStr: formatSingleMove(m, player),
    hitBlot: m.hitBlot,
    isBearOff: isBearOffMove(m)
  }))
  
  // Sort moves: bar moves first, then by highest from point
  convertedMoves = convertedMoves.sort((a, b) => {
    const aIsBar = a.moveStr.startsWith('bar/')
    const bIsBar = b.moveStr.startsWith('bar/')
    
    if (aIsBar && !bIsBar) return -1
    if (!aIsBar && bIsBar) return 1
    
    // Extract from point for sorting
    const aFromStr = a.moveStr.split('/')[0]
    const bFromStr = b.moveStr.split('/')[0]
    const aFrom = aIsBar ? 25 : (parseInt(aFromStr) || 0)
    const bFrom = bIsBar ? 25 : (parseInt(bFromStr) || 0)
    return bFrom - aFrom
  })
  
  // Handle sequence collapsing based on options
  let formattedParts
  if (options.collapseSequences) {
    // Collapse sequences where possible (e.g., 13/11 11/10 -> 13/10)
    // This creates more readable, normalized move notation
    const collapsedMoves = []
    let currentChain = null

    for (const move of convertedMoves) {
      const parts = move.moveStr.split('/')
      if (parts.length !== 2) {
        // Not a standard move format, add as-is
        if (currentChain) {
          collapsedMoves.push(currentChain.from + '/' + currentChain.to + (currentChain.hitBlot ? '*' : ''))
          currentChain = null
        }
        collapsedMoves.push(move.moveStr)
        continue
      }

      const from = parts[0]
      const to = parts[1].replace(/\*$/, '') // Remove hit asterisk for comparison

      if (!currentChain) {
        currentChain = { from: from, to: to, hitBlot: move.hitBlot }
      } else if (currentChain.to === from) {
        // This move continues the chain
        currentChain.to = to
        if (move.hitBlot) currentChain.hitBlot = true
      } else {
        // Chain breaks, add current chain and start new one
        collapsedMoves.push(currentChain.from + '/' + currentChain.to + (currentChain.hitBlot ? '*' : ''))
        currentChain = { from: from, to: to, hitBlot: move.hitBlot }
      }
    }

    // Add final chain if exists
    if (currentChain) {
      collapsedMoves.push(currentChain.from + '/' + currentChain.to + (currentChain.hitBlot ? '*' : ''))
    }

    formattedParts = collapsedMoves
  } else {
    // Don't collapse sequences - show each move individually for clarity
    // This ensures that different move paths are clearly distinguishable
    formattedParts = convertedMoves.map(move => move.moveStr)
  }
  
  // Group identical moves
  const moveGroups = new Map()
  for (const part of formattedParts) {
    const key = part.replace(/\*$/, '') // Remove trailing asterisk for grouping
    if (!moveGroups.has(key)) {
      moveGroups.set(key, { moveStr: part, count: 0 })
    }
    moveGroups.get(key).count++
  }
  
  const parts = []
  for (const group of moveGroups.values()) {
    if (group.count > 1) {
      const baseMove = group.moveStr.replace(/\*$/, '')
      const hasAsterisk = group.moveStr.endsWith('*')
      const asterisk = hasAsterisk ? '*' : ''
      parts.push(`${baseMove}(${group.count})${asterisk}`)
    } else {
      parts.push(group.moveStr)
    }
  }
  
  // Sort by highest starting point first, but bar moves MUST come first
  parts.sort((a, b) => {
    const aFromStr = a.split('/')[0]
    const bFromStr = b.split('/')[0]
    const aIsBar = aFromStr === 'bar'
    const bIsBar = bFromStr === 'bar'
    
    if (aIsBar && !bIsBar) return -1
    if (!aIsBar && bIsBar) return 1
    
    const aFrom = aIsBar ? 25 : (parseInt(aFromStr) || 0)
    const bFrom = bIsBar ? 25 : (parseInt(bFromStr) || 0)
    return bFrom - aFrom
  })
  
  return parts.join(' ')
}

/**
 * Sort moves array: bar moves first, then by highest from point
 */
function sortMoves(a, b) {
  const aIsBar = isBarMove(a)
  const bIsBar = isBarMove(b)
  
  if (aIsBar && !bIsBar) return -1
  if (!aIsBar && bIsBar) return 1
  
  const aFrom = aIsBar ? 25 : a.from
  const bFrom = bIsBar ? 25 : b.from
  if (aFrom !== bFrom) return bFrom - aFrom
  return b.to - a.to
}

/**
 * Format a move (single or combination) to string notation
 * @param {Object} move - Move object (single move) or move combination (with moves array)
 * @param {number|null} player - Player (1 for white, -1 for black, null for absolute)
 * @returns {string} Formatted move string
 */
function formatMove(move, player = null, options = {}) {
  if (!move) return 'No move'

  // If it's a combination (has moves array), format as combination
  if (move.moves && Array.isArray(move.moves)) {
    return formatMoveCombination(move, player, options)
  }

  // Otherwise, format as single move
  return formatSingleMove(move, player)
}

/**
 * Rebuild description from moves array (ensuring proper formatting and grouping)
 * @param {Array} moves - Array of move objects
 * @returns {string} Formatted move description
 */
function rebuildDescription(moves) {
  if (!moves || moves.length === 0) return ''
  
  // Sort moves first
  const sortedMoves = [...moves].sort(sortMoves)
  
  // Format each move
  const formattedParts = sortedMoves.map(m => formatSingleMove(m, null))
  
  // Group identical moves
  const moveGroups = new Map()
  for (const part of formattedParts) {
    const key = part.replace(/\*$/, '') // Remove asterisk for grouping
    if (!moveGroups.has(key)) {
      moveGroups.set(key, { moveStr: part, count: 0 })
    }
    moveGroups.get(key).count++
  }
  
  const groupedParts = []
  for (const group of moveGroups.values()) {
    if (group.count > 1) {
      const baseMove = group.moveStr.replace(/\*$/, '')
      const hasAsterisk = group.moveStr.endsWith('*')
      const asterisk = hasAsterisk ? '*' : ''
      groupedParts.push(`${baseMove}(${group.count})${asterisk}`)
    } else {
      groupedParts.push(group.moveStr)
    }
  }
  
  return groupedParts.join(' ')
}

export {
  formatMove,
  formatSingleMove,
  formatMoveCombination,
  rebuildDescription,
  sortMoves,
  isBearOffMove,
  isBarMove
}
