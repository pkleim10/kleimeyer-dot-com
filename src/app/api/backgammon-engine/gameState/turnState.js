/**
 * Turn State Management Functions
 * Functions for creating and managing turn state objects
 */

/**
 * Create turn state from board state and player
 */
export function createTurnState(boardState, player, customDice = null) {
  const owner = player === 1 ? 'white' : 'black'
  let dice = []

  // Use custom dice if provided
  if (customDice && Array.isArray(customDice)) {
    dice = customDice
  } else if (boardState.dice && boardState.dice !== '00') {
    const die1 = parseInt(boardState.dice[0])
    const die2 = parseInt(boardState.dice[1])
    if (!isNaN(die1) && !isNaN(die2) && die1 > 0 && die2 > 0) {
      // Doubles: if both dice are the same, allow 4 moves of that number
      dice = die1 === die2 ? [die1, die1, die1, die1] : [die1, die2]
    }
  }

  return {
    currentPlayer: owner,
    dice: dice,
    usedDice: [],
    isTurnComplete: false,
    mustEnterFromBar: (owner === 'black' ? boardState.blackBar : boardState.whiteBar) > 0,
    noLegalMoves: false
  }
}