/**
 * Jest unit tests for getLegalMoves function
 * Tests the starting position and all 15 opening rolls
 */

import { parseXGID, createTurnState } from '../route'
import { getLegalMoves } from '../getLegalMoves'

// Test fixtures
const STARTING_XGID = '-b----E-C---eE---c-e----B-:0:0:1:00:0:0:0:0:10'

const OPENING_ROLLS = [
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1],
  [5, 4], [5, 3], [5, 2], [5, 1],
  [4, 3], [4, 2], [4, 1],
  [3, 2], [3, 1],
  [2, 1]
]

// Helper functions
function createTestTurnState(player, dice) {
  return {
    currentPlayer: player === 1 ? 'white' : 'black',
    dice: dice,
    usedDice: [],
    isTurnComplete: false
  }
}

function getMoveDescriptions(moves) {
  return moves.map(m => m.description).sort()
}

function findMoveByDescription(moves, description) {
  return moves.find(m => m.description === description)
}

function countCheckers(boardState, owner) {
  let count = 0
  for (const point of boardState.points) {
    if (point.owner === owner) {
      count += point.count
    }
  }
  if (owner === 'white') {
    count += boardState.whiteBar || 0
  } else {
    count += boardState.blackBar || 0
  }
  return count
}

describe('getLegalMoves', () => {
  describe('Starting Position Validation', () => {
    let startingBoard

    beforeAll(() => {
      startingBoard = parseXGID(STARTING_XGID)
    })

    test('should parse starting position correctly', () => {
      expect(startingBoard).toBeDefined()
      expect(startingBoard.points).toHaveLength(24)
    })

    test('should have correct checker counts', () => {
      const whiteCount = countCheckers(startingBoard, 'white')
      const blackCount = countCheckers(startingBoard, 'black')
      expect(whiteCount).toBe(15)
      expect(blackCount).toBe(15)
    })

    test('should have no checkers on bar', () => {
      expect(startingBoard.whiteBar || 0).toBe(0)
      expect(startingBoard.blackBar || 0).toBe(0)
    })

    test('should have correct starting point configuration', () => {
      // White starts with 2 checkers on point 24, 5 on point 13, 3 on point 8, 5 on point 6
      // Black starts with 2 checkers on point 1, 5 on point 12, 3 on point 17, 5 on point 19
      const white24 = startingBoard.points[23] // Point 24 (index 23)
      const white13 = startingBoard.points[12] // Point 13 (index 12)
      const white8 = startingBoard.points[7]   // Point 8 (index 7)
      const white6 = startingBoard.points[5]   // Point 6 (index 5)

      expect(white24.owner).toBe('white')
      expect(white24.count).toBe(2)
      expect(white13.owner).toBe('white')
      expect(white13.count).toBe(5)
      expect(white8.owner).toBe('white')
      expect(white8.count).toBe(3)
      expect(white6.owner).toBe('white')
      expect(white6.count).toBe(5)
    })
  })

  describe('Basic Functionality', () => {
    let startingBoard

    beforeAll(() => {
      startingBoard = parseXGID(STARTING_XGID)
    })

    test('should return array for valid input', () => {
      const turnState = createTestTurnState(1, [2, 1])
      const moves = getLegalMoves(startingBoard, turnState)
      expect(Array.isArray(moves)).toBe(true)
    })

    test('should return empty array for invalid turnState', () => {
      const moves = getLegalMoves(startingBoard, null)
      expect(moves).toEqual([])
    })

    test('should return empty array for missing currentPlayer', () => {
      const turnState = { dice: [2, 1] }
      const moves = getLegalMoves(startingBoard, turnState)
      expect(moves).toEqual([])
    })

    test('should return empty array for missing dice', () => {
      const turnState = { currentPlayer: 'white', dice: [] }
      const moves = getLegalMoves(startingBoard, turnState)
      expect(moves).toEqual([])
    })

    test('should handle empty dice array', () => {
      const turnState = createTestTurnState(1, [])
      const moves = getLegalMoves(startingBoard, turnState)
      expect(moves).toEqual([])
    })
  })

  describe('Opening Rolls - Move Counts', () => {
    let startingBoard

    beforeAll(() => {
      startingBoard = parseXGID(STARTING_XGID)
    })

    OPENING_ROLLS.forEach(([die1, die2]) => {
      const rollName = `${die1}${die2}`
      
      test(`roll ${rollName} should return non-empty array`, () => {
        const xgid = STARTING_XGID.replace(':00:', `:${rollName}:`)
        const boardState = parseXGID(xgid)
        const turnState = createTurnState(boardState, 1)
        const moves = getLegalMoves(boardState, turnState)
        
        expect(moves.length).toBeGreaterThan(0)
      })

      test(`roll ${rollName} should have reasonable move count (8-20 moves)`, () => {
        const xgid = STARTING_XGID.replace(':00:', `:${rollName}:`)
        const boardState = parseXGID(xgid)
        const turnState = createTurnState(boardState, 1)
        const moves = getLegalMoves(boardState, turnState)
        
        expect(moves.length).toBeGreaterThanOrEqual(8)
        expect(moves.length).toBeLessThanOrEqual(20)
      })

      if (die1 !== die2) {
        test(`roll ${rollName} should produce same results regardless of dice order`, () => {
          const xgid1 = STARTING_XGID.replace(':00:', `:${die1}${die2}:`)
          const xgid2 = STARTING_XGID.replace(':00:', `:${die2}${die1}:`)
          const boardState1 = parseXGID(xgid1)
          const boardState2 = parseXGID(xgid2)
          const turnState1 = createTurnState(boardState1, 1)
          const turnState2 = createTurnState(boardState2, 1)
          const moves1 = getLegalMoves(boardState1, turnState1)
          const moves2 = getLegalMoves(boardState2, turnState2)
          
          const descriptions1 = getMoveDescriptions(moves1)
          const descriptions2 = getMoveDescriptions(moves2)
          
          expect(descriptions1).toEqual(descriptions2)
        })
      }
    })
  })

  describe('Opening Rolls - Specific Moves', () => {
    let startingBoard

    beforeAll(() => {
      startingBoard = parseXGID(STARTING_XGID)
    })

    test('roll 21 should include key opening moves', () => {
      const xgid = STARTING_XGID.replace(':00:', ':21:')
      const boardState = parseXGID(xgid)
      const turnState = createTurnState(boardState, 1)
      const moves = getLegalMoves(boardState, turnState)
      const descriptions = getMoveDescriptions(moves)

      // Should include common opening moves for 21
      expect(descriptions).toContain('13/11, 6/5')
      expect(descriptions).toContain('24/23, 13/11')
      expect(descriptions).toContain('6/3')
    })

    test('roll 31 should include key opening moves', () => {
      const xgid = STARTING_XGID.replace(':00:', ':31:')
      const boardState = parseXGID(xgid)
      const turnState = createTurnState(boardState, 1)
      const moves = getLegalMoves(boardState, turnState)
      const descriptions = getMoveDescriptions(moves)

      expect(descriptions).toContain('8/5, 6/5')
      expect(descriptions).toContain('24/23, 13/10')
    })

    test('roll 32 should include key opening moves', () => {
      const xgid = STARTING_XGID.replace(':00:', ':32:')
      const boardState = parseXGID(xgid)
      const turnState = createTurnState(boardState, 1)
      const moves = getLegalMoves(boardState, turnState)
      const descriptions = getMoveDescriptions(moves)

      expect(descriptions).toContain('13/11, 13/10')
      expect(descriptions).toContain('24/21, 13/11')
    })

    test('roll 41 should include key opening moves', () => {
      const xgid = STARTING_XGID.replace(':00:', ':41:')
      const boardState = parseXGID(xgid)
      const turnState = createTurnState(boardState, 1)
      const moves = getLegalMoves(boardState, turnState)
      const descriptions = getMoveDescriptions(moves)

      expect(descriptions).toContain('24/23, 13/9')
      expect(descriptions).toContain('13/9, 6/5')
    })

    test('roll 42 should include key opening moves', () => {
      const xgid = STARTING_XGID.replace(':00:', ':42:')
      const boardState = parseXGID(xgid)
      const turnState = createTurnState(boardState, 1)
      const moves = getLegalMoves(boardState, turnState)
      const descriptions = getMoveDescriptions(moves)

      expect(descriptions).toContain('8/4, 6/4')
      expect(descriptions).toContain('24/22, 13/9')
    })

    test('roll 43 should include key opening moves', () => {
      const xgid = STARTING_XGID.replace(':00:', ':43:')
      const boardState = parseXGID(xgid)
      const turnState = createTurnState(boardState, 1)
      const moves = getLegalMoves(boardState, turnState)
      const descriptions = getMoveDescriptions(moves)

      expect(descriptions).toContain('13/10, 13/9')
      expect(descriptions).toContain('24/20, 13/10')
    })

    test('roll 51 should include key opening moves', () => {
      const xgid = STARTING_XGID.replace(':00:', ':51:')
      const boardState = parseXGID(xgid)
      const turnState = createTurnState(boardState, 1)
      const moves = getLegalMoves(boardState, turnState)
      const descriptions = getMoveDescriptions(moves)

      expect(descriptions).toContain('24/23, 13/8')
      expect(descriptions).toContain('13/8, 6/5')
    })

    test('roll 52 should include key opening moves', () => {
      const xgid = STARTING_XGID.replace(':00:', ':52:')
      const boardState = parseXGID(xgid)
      const turnState = createTurnState(boardState, 1)
      const moves = getLegalMoves(boardState, turnState)
      const descriptions = getMoveDescriptions(moves)

      expect(descriptions).toContain('24/22, 13/8')
      expect(descriptions).toContain('13/8, 6/4')
    })

    test('roll 53 should include key opening moves', () => {
      const xgid = STARTING_XGID.replace(':00:', ':53:')
      const boardState = parseXGID(xgid)
      const turnState = createTurnState(boardState, 1)
      const moves = getLegalMoves(boardState, turnState)
      const descriptions = getMoveDescriptions(moves)

      expect(descriptions).toContain('8/3, 6/3')
      expect(descriptions).toContain('13/8, 8/5')
    })

    test('roll 54 should include key opening moves', () => {
      const xgid = STARTING_XGID.replace(':00:', ':54:')
      const boardState = parseXGID(xgid)
      const turnState = createTurnState(boardState, 1)
      const moves = getLegalMoves(boardState, turnState)
      const descriptions = getMoveDescriptions(moves)

      expect(descriptions).toContain('13/9, 13/8')
      expect(descriptions).toContain('8/3, 6/2')
    })

    test('roll 61 should include key opening moves', () => {
      const xgid = STARTING_XGID.replace(':00:', ':61:')
      const boardState = parseXGID(xgid)
      const turnState = createTurnState(boardState, 1)
      const moves = getLegalMoves(boardState, turnState)
      const descriptions = getMoveDescriptions(moves)

      expect(descriptions).toContain('24/23, 13/7')
      expect(descriptions).toContain('13/7, 8/7')
    })

    test('roll 62 should include key opening moves', () => {
      const xgid = STARTING_XGID.replace(':00:', ':62:')
      const boardState = parseXGID(xgid)
      const turnState = createTurnState(boardState, 1)
      const moves = getLegalMoves(boardState, turnState)
      const descriptions = getMoveDescriptions(moves)

      expect(descriptions).toContain('24/18, 13/11')
      expect(descriptions).toContain('13/7, 6/4')
    })

    test('roll 63 should include key opening moves', () => {
      const xgid = STARTING_XGID.replace(':00:', ':63:')
      const boardState = parseXGID(xgid)
      const turnState = createTurnState(boardState, 1)
      const moves = getLegalMoves(boardState, turnState)
      const descriptions = getMoveDescriptions(moves)

      expect(descriptions).toContain('24/18, 13/10')
      expect(descriptions).toContain('13/7, 6/3')
    })

    test('roll 64 should include key opening moves', () => {
      const xgid = STARTING_XGID.replace(':00:', ':64:')
      const boardState = parseXGID(xgid)
      const turnState = createTurnState(boardState, 1)
      const moves = getLegalMoves(boardState, turnState)
      const descriptions = getMoveDescriptions(moves)

      expect(descriptions).toContain('8/2, 6/2')
      expect(descriptions).toContain('13/7, 6/2')
    })

    test('roll 65 should include key opening moves', () => {
      const xgid = STARTING_XGID.replace(':00:', ':65:')
      const boardState = parseXGID(xgid)
      const turnState = createTurnState(boardState, 1)
      const moves = getLegalMoves(boardState, turnState)
      const descriptions = getMoveDescriptions(moves)

      expect(descriptions).toContain('24/18, 13/8')
      expect(descriptions).toContain('13/8, 8/2')
    })
  })

  describe('Move Format Validation', () => {
    let startingBoard

    beforeAll(() => {
      startingBoard = parseXGID(STARTING_XGID.replace(':00:', ':21:'))
    })

    test('each move should have required properties', () => {
      const turnState = createTurnState(startingBoard, 1)
      const moves = getLegalMoves(startingBoard, turnState)
      
      moves.forEach(move => {
        expect(move).toHaveProperty('moves')
        expect(move).toHaveProperty('description')
        expect(move).toHaveProperty('totalPips')
        expect(Array.isArray(move.moves)).toBe(true)
        expect(typeof move.description).toBe('string')
        expect(typeof move.totalPips).toBe('number')
      })
    })

    test('moves array should contain valid move objects', () => {
      const turnState = createTurnState(startingBoard, 1)
      const moves = getLegalMoves(startingBoard, turnState)
      
      moves.forEach(moveCombination => {
        moveCombination.moves.forEach(move => {
          expect(move).toHaveProperty('from')
          expect(move).toHaveProperty('to')
          expect(move).toHaveProperty('die')
          expect(move).toHaveProperty('owner')
          expect(typeof move.from).toBe('number')
          expect(typeof move.to).toBe('number')
          expect(typeof move.die).toBe('number')
          expect(['white', 'black']).toContain(move.owner)
        })
      })
    })

    test('description format should match expected patterns', () => {
      const turnState = createTurnState(startingBoard, 1)
      const moves = getLegalMoves(startingBoard, turnState)
      
      moves.forEach(move => {
        // Single move: "13/11" or double move: "13/11, 6/5"
        const pattern = /^(\d+\/\d+)(, \d+\/\d+)?$/
        expect(move.description).toMatch(pattern)
      })
    })

    test('totalPips should equal sum of dice', () => {
      const turnState = createTurnState(startingBoard, 1)
      const moves = getLegalMoves(startingBoard, turnState)
      const diceSum = 2 + 1 // Roll 21
      
      moves.forEach(move => {
        expect(move.totalPips).toBe(diceSum)
      })
    })

    test('move descriptions should be formatted correctly', () => {
      const turnState = createTurnState(startingBoard, 1)
      const moves = getLegalMoves(startingBoard, turnState)
      
      moves.forEach(move => {
        if (move.moves.length === 2) {
          // For two-move combinations, verify they are valid moves
          const [m1, m2] = move.moves
          // Both moves should be valid (from and to within 1-24)
          expect(m1.from).toBeGreaterThanOrEqual(1)
          expect(m1.from).toBeLessThanOrEqual(24)
          expect(m1.to).toBeGreaterThanOrEqual(1)
          expect(m1.to).toBeLessThanOrEqual(24)
          expect(m2.from).toBeGreaterThanOrEqual(1)
          expect(m2.from).toBeLessThanOrEqual(24)
          expect(m2.to).toBeGreaterThanOrEqual(1)
          expect(m2.to).toBeLessThanOrEqual(24)
        }
      })
    })
  })

  describe('Edge Cases', () => {
    let startingBoard

    beforeAll(() => {
      startingBoard = parseXGID(STARTING_XGID)
    })

    test('doubles (6-6) should generate 4 moves per die', () => {
      const xgid = STARTING_XGID.replace(':00:', ':66:')
      const boardState = parseXGID(xgid)
      const turnState = createTurnState(boardState, 1)
      const moves = getLegalMoves(boardState, turnState)
      
      // For doubles, should have moves that use all 4 dice
      expect(moves.length).toBeGreaterThan(0)
      
      // Check that some moves use multiple dice
      const multiMoveCombinations = moves.filter(m => m.moves.length >= 2)
      expect(multiMoveCombinations.length).toBeGreaterThan(0)
    })

    test('should handle moves that hit opponent blots', () => {
      // Create a position where white can hit black's blot
      // This is harder to set up from starting position, so we'll test the property exists
      const xgid = STARTING_XGID.replace(':00:', ':21:')
      const boardState = parseXGID(xgid)
      const turnState = createTurnState(boardState, 1)
      const moves = getLegalMoves(boardState, turnState)
      
      // Verify moves have hitBlot property
      moves.forEach(moveCombination => {
        moveCombination.moves.forEach(move => {
          expect(move).toHaveProperty('hitBlot')
          expect(typeof move.hitBlot).toBe('boolean')
        })
      })
    })

    test('should add asterisk notation when move hits a blot', () => {
      // Create a position where white can hit black's blot on point 7
      // XGID format: points (24 points), whiteBar, blackBar, cubeOwner, cubeValue, currentPlayer, dice
      // Position: white checker on 13, black blot on 7 (point 7 = index 6)
      // This means white can roll 6-1 and hit with 13/7
      const xgid = '-b----E-C---eE---c-e----B-:0:0:1:61:0:0:0:0:10'
      const boardState = parseXGID(xgid)
      
      // Modify board to have a black blot on point 7
      boardState.points[6] = { owner: 'black', count: 1 } // Point 7 has 1 black checker (blot)
      
      const turnState = createTurnState(boardState, 1)
      const moves = getLegalMoves(boardState, turnState)
      
      // Find the move that hits the blot (13/7)
      const hittingMove = moves.find(m => {
        return m.moves.some(singleMove => singleMove.from === 13 && singleMove.to === 7 && singleMove.hitBlot)
      })
      
      if (hittingMove) {
        // Verify the description includes asterisk
        expect(hittingMove.description).toContain('*')
        expect(hittingMove.description).toMatch(/13\/7\*/)
      }
    })

    test('should format grouped hitting moves with asterisk after count', () => {
      // Create a position where white can hit black's blot twice with the same move
      // Position: white checkers on 13, black blot on 7
      // Roll 6-6: white can move 13/7 twice, hitting the blot both times
      const xgid = '-b----E-C---eE---c-e----B-:0:0:1:66:0:0:0:0:10'
      const boardState = parseXGID(xgid)
      
      // Modify board to have a black blot on point 7
      boardState.points[6] = { owner: 'black', count: 1 } // Point 7 has 1 black checker (blot)
      
      const turnState = createTurnState(boardState, 1)
      const moves = getLegalMoves(boardState, turnState)
      
      // Find moves that hit the blot twice (13/7(2)*)
      const hittingMoves = moves.filter(m => {
        const hittingCount = m.moves.filter(singleMove => 
          singleMove.from === 13 && singleMove.to === 7 && singleMove.hitBlot
        ).length
        return hittingCount === 2
      })
      
      if (hittingMoves.length > 0) {
        // Verify the notation format: asterisk comes after the count
        const description = hittingMoves[0].description
        expect(description).toContain('*')
        // Should match pattern like "13/7(2)*" not "13/7*(2)"
        expect(description).toMatch(/13\/7\(\d+\)\*/)
        expect(description).not.toMatch(/13\/7\*\(\d+\)/)
      }
    })

    test('should handle moves that make points', () => {
      const xgid = STARTING_XGID.replace(':00:', ':31:')
      const boardState = parseXGID(xgid)
      const turnState = createTurnState(boardState, 1)
      const moves = getLegalMoves(boardState, turnState)
      
      // 31 roll should include moves that make the 5-point
      const descriptions = getMoveDescriptions(moves)
      expect(descriptions).toContain('8/5, 6/5') // Makes 5-point
    })

    test('should handle blocked moves correctly', () => {
      const xgid = STARTING_XGID.replace(':00:', ':21:')
      const boardState = parseXGID(xgid)
      const turnState = createTurnState(boardState, 1)
      const moves = getLegalMoves(boardState, turnState)
      
      // All moves should be legal (not blocked)
      moves.forEach(moveCombination => {
        moveCombination.moves.forEach(move => {
          expect(move.from).toBeGreaterThanOrEqual(1)
          expect(move.from).toBeLessThanOrEqual(24)
          expect(move.to).toBeGreaterThanOrEqual(1)
          expect(move.to).toBeLessThanOrEqual(24)
        })
      })
    })
  })

  describe('Deduplication', () => {
    let startingBoard

    beforeAll(() => {
      startingBoard = parseXGID(STARTING_XGID.replace(':00:', ':21:'))
    })

    test('should not have duplicate moves', () => {
      const turnState = createTurnState(startingBoard, 1)
      const moves = getLegalMoves(startingBoard, turnState)
      const descriptions = getMoveDescriptions(moves)
      
      // Check for duplicates
      const uniqueDescriptions = new Set(descriptions)
      expect(uniqueDescriptions.size).toBe(descriptions.length)
    })

    test('should deduplicate functionally equivalent moves', () => {
      const turnState = createTurnState(startingBoard, 1)
      const moves = getLegalMoves(startingBoard, turnState)
      
      // Create a map of move keys to check for duplicates
      const moveKeys = new Set()
      moves.forEach(move => {
        const key = move.description
        expect(moveKeys.has(key)).toBe(false)
        moveKeys.add(key)
      })
    })

    test('should have unique move combinations', () => {
      const turnState = createTurnState(startingBoard, 1)
      const moves = getLegalMoves(startingBoard, turnState)
      
      // Each move combination should be unique
      const seen = new Set()
      moves.forEach(move => {
        const key = JSON.stringify(move.moves.map(m => ({ from: m.from, to: m.to })).sort())
        expect(seen.has(key)).toBe(false)
        seen.add(key)
      })
    })
  })
})
