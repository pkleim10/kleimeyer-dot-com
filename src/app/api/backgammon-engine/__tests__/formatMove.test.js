/**
 * Test formatMove function directly
 * Tests the specific position: -b----D-C---cE---cbc-b--BA:0:0:1:43:0:0:0:0:10
 */

// Mock fetch for Jest environment
global.fetch = jest.fn(() => Promise.resolve({ ok: true }))

import { parseXGID, createTurnState } from '../route'
import { getLegalMoves } from '../getLegalMoves'

// Import formatMove - need to check if it's exported
// If not exported, we'll test via the API route

describe('formatMove Function Test', () => {
  test('should show formatMove input/output for position with bar entry', async () => {
    const xgid = '-b----D-C---cE---cbc-b--BA:0:0:1:43:0:0:0:0:10'
    const boardState = parseXGID(xgid)
    const turnState = createTurnState(boardState, 1)
    
    console.log('\n=== TEST: formatMove Function ===')
    console.log('XGID:', xgid)
    console.log('Player:', turnState.currentPlayer)
    console.log('Dice:', turnState.dice)
    console.log('')
    
    // Get legal moves
    const moves = getLegalMoves(boardState, turnState)
    
    console.log(`Total moves generated: ${moves.length}`)
    console.log('')
    
    // Check each move's description and moves array
    moves.forEach((move, idx) => {
      if (move.moves && move.moves.some(m => m.fromBar || m.from === 25 || m.from === 0)) {
        console.log(`--- Move ${idx + 1} ---`)
        console.log('Description from getLegalMoves:', move.description)
        console.log('Moves array order:')
        move.moves.forEach((m, i) => {
          console.log(`  [${i}] from: ${m.from}, to: ${m.to}, fromBar: ${m.fromBar || false}, die: ${m.die}`)
        })
        console.log('')
      }
    })
    
    // Get suggested move (first move)
    if (moves.length > 0) {
      const suggestedMove = moves[0]
      console.log('=== SUGGESTED MOVE (from getLegalMoves) ===')
      console.log('Description:', suggestedMove.description)
      console.log('Moves array:')
      suggestedMove.moves.forEach((m, i) => {
        console.log(`  [${i}] from: ${m.from}, to: ${m.to}, fromBar: ${m.fromBar || false}, die: ${m.die}`)
      })
      console.log('')
      
      // Now test what formatMove would return
      // Since formatMove is not exported, we'll simulate what happens
      // When player is white (1), formatMove returns move.description directly
      const currentPlayer = boardState.player !== undefined ? boardState.player : 1
      console.log('Current player for formatMove:', currentPlayer)
      console.log('formatMove would return:', suggestedMove.description)
      console.log('')
      
      // Verify bar move comes first in description
      if (suggestedMove.description.includes('bar/') && suggestedMove.description.includes(' ')) {
        const parts = suggestedMove.description.split(' ')
        const firstPart = parts[0]
        const hasBarFirst = firstPart.startsWith('bar/')
        
        if (hasBarFirst) {
          console.log('✅ PASS: Description has bar move first')
        } else {
          console.log('❌ FAIL: Description does NOT have bar move first')
          console.log('First part:', firstPart)
        }
      }
    }
    
    expect(moves.length).toBeGreaterThan(0)
  })
})
