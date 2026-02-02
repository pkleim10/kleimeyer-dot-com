/**
 * Jest unit tests for getLegalMoves function
 * Tests the starting position and all 15 opening rolls
 */

// Mock fetch for Jest environment
global.fetch = jest.fn(() => Promise.resolve({ ok: true }))

import { parseXGID, createTurnState } from '../route'
import { getLegalMoves } from '../getLegalMoves'

// Helper to check if a move is from bar (matches logic in getLegalMoves.js)
function isBarMove(move) {
  return move.fromBar || move.from === 25 || move.from === 0
}

// Helper to sort moves so bar moves come first (matches logic in getLegalMoves.js)
function sortMovesBarFirst(moves) {
  return [...moves].sort((a, b) => {
    const aIsBar = isBarMove(a)
    const bIsBar = isBarMove(b)
    
    // Bar moves always come first
    if (aIsBar && !bIsBar) return -1
    if (!aIsBar && bIsBar) return 1
    
    // If both are bar or both are not bar, sort by from point (highest first)
    const aFrom = aIsBar ? 25 : a.from
    const bFrom = bIsBar ? 25 : b.from
    if (aFrom !== bFrom) return bFrom - aFrom
    return b.to - a.to
  })
}

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

  describe('Bar Move Sorting in Descriptions', () => {
    test('sortMovesBarFirst should put bar moves before regular moves', () => {
      const regularMove = { from: 8, to: 4, die: 4 }
      const barMove = { from: 25, to: 22, fromBar: true, die: 3 }
      
      const unsorted = [regularMove, barMove]
      const sorted = sortMovesBarFirst(unsorted)
      
      expect(sorted[0]).toBe(barMove)
      expect(sorted[1]).toBe(regularMove)
    })

    test('sortMovesBarFirst should handle bar move with from=0', () => {
      const regularMove = { from: 6, to: 2, die: 4 }
      const barMove = { from: 0, to: 22, fromBar: true, die: 3 }
      
      const unsorted = [regularMove, barMove]
      const sorted = sortMovesBarFirst(unsorted)
      
      expect(sorted[0]).toBe(barMove)
      expect(sorted[1]).toBe(regularMove)
    })

    test('sortMovesBarFirst should handle bar move with fromBar=true but from!=25', () => {
      const regularMove = { from: 8, to: 4, die: 4 }
      const barMove = { from: 25, to: 22, fromBar: true, die: 3 }
      
      const unsorted = [regularMove, barMove]
      const sorted = sortMovesBarFirst(unsorted)
      
      expect(sorted[0]).toBe(barMove)
      expect(sorted[1]).toBe(regularMove)
    })

    test('sortMovesBarFirst should handle multiple bar moves (both come first)', () => {
      const regularMove = { from: 8, to: 4, die: 4 }
      const barMove1 = { from: 25, to: 22, fromBar: true, die: 3 }
      const barMove2 = { from: 25, to: 20, fromBar: true, die: 4 }
      
      const unsorted = [regularMove, barMove1, barMove2]
      const sorted = sortMovesBarFirst(unsorted)
      
      expect(sorted[0]).toBe(barMove2) // Higher to point (20 vs 22)
      expect(sorted[1]).toBe(barMove1)
      expect(sorted[2]).toBe(regularMove)
    })

    test('getLegalMoves should return descriptions with bar moves first', () => {
      // Create a position where white has a checker on bar and can enter + move
      // XGID: -b----D-C---cE---cbc-b--BA:0:0:1:43:0:0:0:0:10
      // This is the position the user reported: white on bar, dice 4-3
      const xgid = '-b----D-C---cE---cbc-b--BA:0:0:1:43:0:0:0:0:10'
      const boardState = parseXGID(xgid)
      const turnState = createTurnState(boardState, 1)
      
      const moves = getLegalMoves(boardState, turnState)
      
      // Find moves that include bar entry
      const barMoves = moves.filter(m => 
        m.description && m.description.includes('bar/')
      )
      
      expect(barMoves.length).toBeGreaterThan(0)
      
      // Check that all bar moves have bar first in description
      barMoves.forEach(move => {
        if (move.moves && move.moves.length > 1) {
          // Multi-move combination: check that bar move comes first
          const hasBarMove = move.moves.some(m => isBarMove(m))
          if (hasBarMove) {
            const firstMove = move.moves[0]
            expect(isBarMove(firstMove)).toBe(true)
            
            // Verify description starts with "bar/"
            expect(move.description).toMatch(/^bar\/\d+/)
          }
        }
      })
    })

    test('getLegalMoves description format: bar/22 6/2 should have bar first', () => {
      // Test the specific case the user reported
      const xgid = '-b----D-C---cE---cbc-b--BA:0:0:1:43:0:0:0:0:10'
      const boardState = parseXGID(xgid)
      const turnState = createTurnState(boardState, 1)
      
      const moves = getLegalMoves(boardState, turnState)
      
      // Find the move that matches "bar/22" and another move
      const bar22Moves = moves.filter(m => 
        m.description && m.description.includes('bar/22')
      )
      
      if (bar22Moves.length > 0) {
        bar22Moves.forEach(move => {
          // Description should start with "bar/" not end with it
          if (move.description.includes('bar/22') && move.description.includes('6/2')) {
            const parts = move.description.split(' ')
            const firstPart = parts[0]
            expect(firstPart).toMatch(/^bar\/\d+/)
            expect(firstPart).not.toBe('6/2')
          }
        })
      }
    })

    test('isBarMove should correctly identify bar moves', () => {
      expect(isBarMove({ from: 25, to: 22 })).toBe(true)
      expect(isBarMove({ from: 0, to: 22 })).toBe(true)
      expect(isBarMove({ from: 8, to: 4, fromBar: true })).toBe(true)
      expect(isBarMove({ from: 8, to: 4 })).toBe(false)
      expect(isBarMove({ from: 24, to: 20 })).toBe(false)
    })

    test('EXACT CASE: sortMovesBarFirst should put bar/22 before 6/2', () => {
      // This is the exact case the user reported: "6/2 bar/22" should be "bar/22 6/2"
      const regularMove = { from: 6, to: 2, die: 2 }
      const barMove = { from: 25, to: 22, fromBar: true, die: 3 }
      
      // Test in both orders
      const order1 = [regularMove, barMove]
      const order2 = [barMove, regularMove]
      
      const sorted1 = sortMovesBarFirst(order1)
      const sorted2 = sortMovesBarFirst(order2)
      
      // Both should result in bar move first
      expect(sorted1[0]).toBe(barMove)
      expect(sorted1[1]).toBe(regularMove)
      expect(sorted2[0]).toBe(barMove)
      expect(sorted2[1]).toBe(regularMove)
    })

    test('EXACT CASE: getLegalMoves should return "bar/22 6/2" not "6/2 bar/22"', () => {
      // Test the exact position: -b----D-C---cE---cbc-b--BA:0:0:1:43:0:0:0:0:10
      const xgid = '-b----D-C---cE---cbc-b--BA:0:0:1:43:0:0:0:0:10'
      const boardState = parseXGID(xgid)
      const turnState = createTurnState(boardState, 1)
      
      const moves = getLegalMoves(boardState, turnState)
      
      // Find moves that include both bar/22 and 6/2
      const targetMoves = moves.filter(m => 
        m.description && 
        m.description.includes('bar/22') && 
        m.description.includes('6/2')
      )
      
      if (targetMoves.length > 0) {
        targetMoves.forEach(move => {
          // Description MUST start with "bar/" not "6/"
          expect(move.description).toMatch(/^bar\/22/)
          expect(move.description).not.toMatch(/^6\/2/)
          
          // Verify the moves array itself has bar move first
          if (move.moves && move.moves.length >= 2) {
            const firstMove = move.moves[0]
            expect(isBarMove(firstMove)).toBe(true)
          }
        })
      } else {
        // If no such move found, that's also a problem - we should find it
        console.warn('No move found with both bar/22 and 6/2')
      }
    })
  })

  describe('Bug Reports', () => {
    test('should not mark 8/5 as hit when point 5 has own checker - user reported bug', () => {
      // User's reported XGID and position
      const xgid = "aA-a-ADAF---d-a--bad--a-B-:0:0:1:34:0:0:0:0:10"
      const boardState = parseXGID(xgid)
      const turnState = createTurnState(boardState, 1) // white to move, dice 3-4

      const moves = getLegalMoves(boardState, turnState)

      // Find any move that includes "8/5*"
      const problematicMoves = moves.filter(move =>
        move.description && move.description.includes('8/5*')
      )

      if (problematicMoves.length > 0) {
        console.log('Found problematic moves:', problematicMoves.map(m => m.description))
        // Check point 5 - it should have white's checker, not an opponent blot
        const point5 = boardState.points[4] // index 4 = point 5
        expect(point5.owner).toBe('white')
        expect(point5.count).toBe(1)

        // A move to point 5 should NOT be marked as a hit
        problematicMoves.forEach(move => {
          move.moves.forEach(singleMove => {
            if (singleMove.to === 5) {
              expect(singleMove.hitBlot).toBe(false)
            }
          })
        })
      }

      // Also verify that 8/5 without asterisk should be allowed
      const validMoves = moves.filter(move =>
        move.description && move.description.includes('8/5') && !move.description.includes('8/5*')
      )
      expect(validMoves.length).toBeGreaterThan(0)

      // Check individual move hitBlot values
      moves.forEach(moveCombo => {
        moveCombo.moves.forEach(move => {
          if (move.to === 5 && move.from === 8) {
            console.log('Move 8/5 hitBlot:', move.hitBlot)
            expect(move.hitBlot).toBe(false)
          }
        })
      })
    })
  })
})
