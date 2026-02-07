/**
 * Move generation functions for backgammon engine
 */

import { boardToArray } from '../utils/boardUtils.js'

/**
 * Apply a move to the board array (used by move generation)
 */
export function applyMove(board, fromPoint, toPoint, playerIndex) {
  // Remove checker from source point
  board[fromPoint][playerIndex]--

  // Handle bar moves (entering from bar)
  if (fromPoint === 0 && playerIndex === 0) {
    // White entering from bar
    board[0][0]--
  } else if (fromPoint === 25 && playerIndex === 1) {
    // Black entering from bar
    board[25][1]--
  }

  // Add checker to destination point
  const opponentIndex = 1 - playerIndex

  // Handle hits (opponent has exactly one checker)
  if (board[toPoint][opponentIndex] === 1) {
    // Hit opponent's checker to bar
    board[toPoint][opponentIndex]--
    if (opponentIndex === 0) {
      // White hit, goes to white bar
      board[0][0]++
    } else {
      // Black hit, goes to black bar
      board[25][1]++
    }
  }

  // Place checker on destination point
  board[toPoint][playerIndex]++
}

/**
 * Find a random legal move for a single die
 */
export function findRandomMoveForDie(board, dieValue, playerIndex, mustEnterFromBar = null) {
  const possibleMoves = []

  // Determine if we must enter from bar
  const barPoint = playerIndex === 0 ? 0 : 25
  const opponentBarPoint = playerIndex === 0 ? 25 : 0
  const mustEnter = mustEnterFromBar !== null ? mustEnterFromBar : (board[barPoint][playerIndex] > 0)

  if (mustEnter) {
    // Must enter from bar first
    const targetPoint = playerIndex === 0 ? dieValue : 25 - dieValue

    // Check if target point is valid (not blocked by 2+ opponent checkers)
    if (targetPoint >= 1 && targetPoint <= 24) {
      const opponentCount = board[targetPoint][1 - playerIndex]
      if (opponentCount < 2) {
        possibleMoves.push({
          from: barPoint,
          to: targetPoint,
          die: dieValue,
          fromBar: true
        })
      }
    }

    // If no bar entry moves possible, return null (turn cannot continue)
    if (possibleMoves.length === 0) {
      return null
    }
  } else {
    // Regular moves from board points
    // Check all points from 1-24
    for (let fromPoint = 1; fromPoint <= 24; fromPoint++) {
      if (board[fromPoint][playerIndex] > 0) {
        // Calculate target point
        let toPoint
        if (playerIndex === 0) {
          // White moves forward (increasing point numbers)
          toPoint = fromPoint + dieValue
        } else {
          // Black moves backward (decreasing point numbers)
          toPoint = fromPoint - dieValue
        }

        // Check if target point is valid
        if (toPoint >= 1 && toPoint <= 24) {
          const opponentCount = board[toPoint][1 - playerIndex]
          if (opponentCount < 2) {
            possibleMoves.push({
              from: fromPoint,
              to: toPoint,
              die: dieValue,
              fromBar: false
            })
          }
        } else if ((playerIndex === 0 && toPoint > 24) || (playerIndex === 1 && toPoint < 1)) {
          // Bearing off moves
          // Only if all checkers are in home board
          const homeStart = playerIndex === 0 ? 19 : 1
          const homeEnd = playerIndex === 0 ? 24 : 6

          let allInHome = true
          for (let p = playerIndex === 0 ? 1 : 7; p <= (playerIndex === 0 ? 18 : 24); p++) {
            if (board[p][playerIndex] > 0) {
              allInHome = false
              break
            }
          }

          if (allInHome) {
            // Can bear off from home board points
            possibleMoves.push({
              from: fromPoint,
              to: playerIndex === 0 ? 0 : 25, // Bearing off point
              die: dieValue,
              fromBar: false,
              bearingOff: true
            })
          }
        }
      }
    }
  }

  // Return random move from possible moves, or null if none
  if (possibleMoves.length > 0) {
    const randomIndex = Math.floor(Math.random() * possibleMoves.length)
    return possibleMoves[randomIndex]
  }

  return null
}

/**
 * Get a random legal complete turn for given dice
 */
export function getRandomLegalMove(boardState, turnState) {
  const playerOwner = turnState.currentPlayer
  const playerIndex = playerOwner === 'white' ? 0 : 1

  // Track if this turn started with checkers on bar - must enter all before regular moves
  const turnStartedWithBarCheckers = turnState.mustEnterFromBar

  // Convert to array representation
  let board = boardToArray(boardState, playerOwner)

  // Handle doubles by expanding dice
  const expandedDice = []
  const diceCounts = {}
  for (const die of turnState.dice) {
    diceCounts[die] = (diceCounts[die] || 0) + 1
  }

  for (const [dieValue, count] of Object.entries(diceCounts)) {
    const numDice = count
    // If we have 2 of the same value, it's a double - use 4 dice
    const diceToAdd = numDice === 2 ? 4 : numDice
    for (let i = 0; i < diceToAdd; i++) {
      expandedDice.push(parseInt(dieValue))
    }
  }

  // Sort dice in ascending order for better bar entry handling
  expandedDice.sort((a, b) => a - b)

  // Process each die sequentially, updating board after each move
  const moves = []
  for (const dieValue of expandedDice) {
    // Check if we still must enter from bar (turn started with bar checkers AND still have some on bar)
    const barPoint = playerIndex === 0 ? 0 : 25
    const stillMustEnterFromBar = turnStartedWithBarCheckers && board[barPoint][playerIndex] > 0

    // Find random move for this die using current board state
    const move = findRandomMoveForDie(board, dieValue, playerIndex, stillMustEnterFromBar)

    if (move) {
      // Apply move to board (UPDATE BOARD STATE for next die)
      applyMove(board, move.from, move.to, playerIndex)
      moves.push(move)
    } else {
      // No move found with this die
      // If we haven't made any moves yet, check if any moves are possible with remaining dice
      if (moves.length === 0) {
        // Check if any of the remaining dice can make moves
        const remainingDice = expandedDice.slice(expandedDice.indexOf(dieValue) + 1)
        let hasPossibleMoves = false
        for (const remainingDie of remainingDice) {
          const testMove = findRandomMoveForDie(board, remainingDie, playerIndex, stillMustEnterFromBar)
          if (testMove) {
            hasPossibleMoves = true
            break
          }
        }
        if (!hasPossibleMoves) {
          break // No moves possible at all
        }
        // Continue to try remaining dice
      }
      // If we have made moves, continue to try other dice
    }
  }

  // Return complete turn object
  if (moves.length > 0) {
    // Build description from all moves
    const descriptions = moves.map(m => `${m.from}/${m.to}`)
    const description = descriptions.join(' ')

    return {
      moves: moves, // All moves in the turn
      description: description,
      totalPips: moves.reduce((sum, m) => sum + m.die, 0)
    }
  }

  // No moves found
  return null
}