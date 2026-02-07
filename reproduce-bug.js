// Script to reproduce the exact bug from simulation-61.md
const xgid = "-b----E-C---eE---c-e----B-:0:0:0:61:0:0:0:0:10"

// Import required functions
import { parseXGID, createTurnState } from './src/app/api/backgammon-engine/route.js'
import { getLegalMoves } from './src/app/api/backgammon-engine/moveGeneration/getLegalMoves.js'

// Mock fetch
global.fetch = jest.fn(() => Promise.resolve({ ok: true }))

function applyMove(boardState, move, player) {
  const newBoard = JSON.parse(JSON.stringify(boardState))
  const owner = player === 1 ? 'white' : 'black'

  // Simple move application for testing
  if (move.from >= 1 && move.from <= 24 && move.to >= 1 && move.to <= 24) {
    // Remove from source
    if (newBoard.points[move.from - 1].owner === owner) {
      newBoard.points[move.from - 1].count -= 1
      if (newBoard.points[move.from - 1].count === 0) {
        newBoard.points[move.from - 1].owner = null
      }
    }

    // Add to destination
    const toPoint = newBoard.points[move.to - 1]
    if (toPoint.count === 1 && toPoint.owner !== owner) {
      // Hit
      if (toPoint.owner === 'white') newBoard.whiteBar += 1
      else newBoard.blackBar += 1
      toPoint.owner = owner
      toPoint.count = 1
    } else {
      // Regular move
      if (toPoint.count === 0) toPoint.owner = owner
      toPoint.count += 1
    }
  }

  return newBoard
}

async function reproduceBug() {
  console.log('Starting bug reproduction...')

  let boardState = parseXGID(xgid)
  console.log('Initial board parsed')

  // Move sequence from simulation-61.md
  const moves = [
    // White: 13/7 8/7 (6-1)
    { from: 13, to: 7, player: 1 },
    { from: 8, to: 7, player: 1 },

    // Black: 6/3 13/11 (2-3)
    { from: 19, to: 22, player: -1 }, // Black sees 6->3 as 19->22
    { from: 12, to: 14, player: -1 }, // Black sees 13->11 as 12->14

    // White: 13/8 13/8 13/8 13/8 (5-5-5-5)
    { from: 13, to: 8, player: 1 },
    { from: 13, to: 8, player: 1 },
    { from: 13, to: 8, player: 1 },
    { from: 13, to: 8, player: 1 },

    // Black: 8/7 24/20 (1-4)
    { from: 17, to: 18, player: -1 }, // Black sees 8->7 as 17->18
    { from: 1, to: 5, player: -1 },   // Black sees 24->20 as 1->5

    // White: 7/5* 6/1* (2-5)
    { from: 7, to: 5, player: 1 },
    { from: 6, to: 1, player: 1 },

    // Black: bar/22 (3-6)
    { from: 25, to: 3, player: -1 }, // bar/22 from black perspective
  ]

  // Apply moves sequentially
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i]
    console.log(`Applying move ${i+1}: ${move.from}/${move.to} by ${move.player === 1 ? 'white' : 'black'}`)
    boardState = applyMove(boardState, move, move.player)
  }

  console.log('\nFinal board state before the bug:')
  console.log('White bar:', boardState.whiteBar)
  console.log('Black bar:', boardState.blackBar)
  for (let i = 0; i < 24; i++) {
    const point = boardState.points[i]
    if (point.count > 0) {
      console.log(`Point ${i+1}: ${point.owner} (${point.count})`)
    }
  }

  // Now try to get legal moves for white with dice 3-4
  const turnState = createTurnState(boardState, 1) // white, dice will be set later
  turnState.dice = [3, 4]
  turnState.usedDice = []

  console.log('\nGetting legal moves for white with dice 3-4...')
  const legalMoves = getLegalMoves(boardState, turnState)

  console.log(`Found ${legalMoves.length} legal move combinations`)

  // Look for the problematic move
  const problematicMoves = legalMoves.filter(move =>
    move.description && move.description.includes('8/5*')
  )

  if (problematicMoves.length > 0) {
    console.log('❌ FOUND PROBLEMATIC MOVE:', problematicMoves[0].description)
    console.log('Move details:', problematicMoves[0].moves)
  } else {
    console.log('✅ No problematic "8/5*" move found')

    // Show all moves containing 8/5
    const eightFiveMoves = legalMoves.filter(move =>
      move.description && move.description.includes('8/5')
    )
    console.log('Moves containing 8/5:', eightFiveMoves.map(m => m.description))
  }
}

reproduceBug().catch(console.error)