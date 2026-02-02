// Test script to check move display conversion
import { formatMove } from './src/utils/moveFormatter.js'

// Test the moves that black made
// Absolute positions: 12/14 and 14/17
// Should display as 13/11 and 11/8 for black (player = -1)

const move1 = { from: 12, to: 14, hitBlot: false }
const move2 = { from: 14, to: 17, hitBlot: false }

console.log('Move 1 (absolute 12/14):', formatMove(move1, -1)) // Should be 13/11
console.log('Move 2 (absolute 14/17):', formatMove(move2, -1)) // Should be 11/8

// Test with player = 1 (white) for comparison
console.log('Move 1 for white:', formatMove(move1, 1)) // Should be 12/14
console.log('Move 2 for white:', formatMove(move2, 1)) // Should be 14/17