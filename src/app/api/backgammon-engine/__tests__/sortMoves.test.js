/**
 * Automated test for sortMoves function
 * Tests the specific position: -b----D-C---cE---cbc-b--BA:0:0:1:43:0:0:0:0:10
 * Shows input and output for sortMoves every time it's called
 */

// Mock fetch for Jest environment
global.fetch = jest.fn(() => Promise.resolve({ ok: true }))

import { parseXGID, createTurnState } from '../route'
import { getLegalMoves } from '../getLegalMoves'

describe('sortMoves Function Test', () => {
  test('should show sortMoves input/output for position with bar entry', async () => {
    const xgid = '-b----D-C---cE---cbc-b--BA:0:0:1:43:0:0:0:0:10'
    const boardState = parseXGID(xgid)
    const turnState = createTurnState(boardState, 1)
    
    console.log('\n=== TEST: sortMoves Function ===')
    console.log('XGID:', xgid)
    console.log('Player:', turnState.currentPlayer)
    console.log('Dice:', turnState.dice)
    console.log('')
    
    // Capture all moves
    const moves = getLegalMoves(boardState, turnState)
    
    console.log(`Total moves generated: ${moves.length}`)
    console.log('')
    
    // Find moves with bar entries
    const barMoves = moves.filter(m => 
      m.moves && m.moves.some(move => move.fromBar || move.from === 25 || move.from === 0)
    )
    
    console.log(`Moves with bar entries: ${barMoves.length}`)
    console.log('')
    
    // Show each move with bar entry
    barMoves.forEach((move, idx) => {
      console.log(`--- Move ${idx + 1} ---`)
      console.log('Description:', move.description)
      console.log('Moves array:')
      move.moves.forEach((m, i) => {
        console.log(`  [${i}] from: ${m.from}, to: ${m.to}, fromBar: ${m.fromBar || false}, die: ${m.die}`)
      })
      console.log('')
    })
    
    // Get suggested move (top move)
    if (moves.length > 0) {
      const suggestedMove = moves[0]
      console.log('=== SUGGESTED MOVE ===')
      console.log('Description:', suggestedMove.description)
      console.log('Moves array:')
      suggestedMove.moves.forEach((m, i) => {
        console.log(`  [${i}] from: ${m.from}, to: ${m.to}, fromBar: ${m.fromBar || false}, die: ${m.die}`)
      })
      console.log('')
      
      // Verify bar move comes first
      if (suggestedMove.moves.length > 1) {
        const firstMove = suggestedMove.moves[0]
        const isFirstBar = firstMove.fromBar || firstMove.from === 25 || firstMove.from === 0
        const hasBarMove = suggestedMove.moves.some(m => m.fromBar || m.from === 25 || m.from === 0)
        
        if (hasBarMove && !isFirstBar) {
          console.log('❌ FAIL: Bar move is NOT first!')
          console.log('Expected: bar move first')
          console.log('Actual:', suggestedMove.description)
        } else if (hasBarMove && isFirstBar) {
          console.log('✅ PASS: Bar move is first')
        }
      }
    }
    
    expect(moves.length).toBeGreaterThan(0)
  })
})
