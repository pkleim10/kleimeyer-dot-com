// Test script to reproduce the user's bug
const xgid = "aA-a-ADAF---d-a--bad--a-B-:0:0:1:34:0:0:0:0:10"
const player = 1 // white
const dice = "34" // dice 3 and 4

console.log('Testing XGID:', xgid)
console.log('Player:', player === 1 ? 'white' : 'black')
console.log('Dice:', dice)

// Import the necessary functions
import { parseXGID } from './src/app/api/backgammon-engine/route.js'
import { getLegalMoves } from './src/app/api/backgammon-engine/getLegalMoves.js'

async function testBug() {
  try {
    const boardState = parseXGID(xgid)
    console.log('Parsed board state successfully')

    // Get legal moves
    const legalMoves = getLegalMoves(boardState, player, dice)
    console.log('Found', legalMoves.length, 'legal move combinations')

    // Look for the problematic move "8/5* 6/2"
    const problematicMove = legalMoves.find(moveCombo =>
      moveCombo.description && moveCombo.description.includes('8/5*')
    )

    if (problematicMove) {
      console.log('❌ FOUND PROBLEMATIC MOVE:', problematicMove.description)
      console.log('Move details:', problematicMove.moves)

      // Check each individual move
      problematicMove.moves.forEach((move, idx) => {
        console.log(`Move ${idx + 1}: from ${move.from} to ${move.to}, hitBlot: ${move.hitBlot}`)
        if (move.to === 5) {
          const toPoint = boardState.points[4] // point 5 is index 4
          console.log(`Point 5 state: owner=${toPoint.owner}, count=${toPoint.count}`)
          console.log(`Should be hit? ${toPoint.count === 1 && toPoint.owner !== 'white'}`)
        }
      })
    } else {
      console.log('✅ No problematic move "8/5*" found in legal moves')
    }

    // Show all legal moves
    console.log('\nAll legal moves:')
    legalMoves.slice(0, 10).forEach((move, idx) => {
      console.log(`${idx + 1}. ${move.description}`)
    })

  } catch (error) {
    console.error('Error:', error)
  }
}

testBug()