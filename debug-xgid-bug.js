// Debug script to decode the XGID position and understand the bug
const xgid = "aA-a-ADAF---d-a--bad--a-B-:0:0:1:34:0:0:0:0:10"

// XGID decoding functions
function charToCount(char) {
  if (char === '-') return 0
  if (char >= 'a' && char <= 'z') return char.charCodeAt(0) - 'a'.charCodeAt(0) + 1
  if (char >= 'A' && char <= 'Z') return char.charCodeAt(0) - 'A'.charCodeAt(0) + 1
  return 0
}

function charToOwner(char) {
  if (char === '-') return null
  if (char >= 'a' && char <= 'z') return 'black'
  if (char >= 'A' && char <= 'Z') return 'white'
  return null
}

function parseXGID(xgid) {
  const parts = xgid.split(':')
  const xg1 = parts[0] || ''

  const blackBar = charToCount(xg1[0])

  const points = []
  for (let i = 1; i <= 24; i++) {
    const char = xg1[i]
    const count = charToCount(char)
    const owner = charToOwner(char)
    points.push({ count, owner, point: i })
  }

  const whiteBar = charToCount(xg1[25])

  return {
    blackBar,
    whiteBar,
    points
  }
}

const boardState = parseXGID(xgid)
console.log('Board state for XGID:', xgid)
console.log('Black bar:', boardState.blackBar)
console.log('White bar:', boardState.whiteBar)
console.log('Points (1-24):')
for (let i = 0; i < 24; i++) {
  const point = boardState.points[i]
  if (point.count > 0) {
    console.log(`Point ${i+1}: ${point.owner} (${point.count})`)
  }
}

// Specifically check point 5
const point5 = boardState.points[4] // index 4 = point 5
console.log(`\nPoint 5 details:`, point5)

// Check what the move 8/5* would mean
// Player is white (from XGID ...:1:34:... player=1 means white)
// Dice is 34, so dice are 3 and 4
// Move 8/5 means from point 8 to point 5 with die 3 (8-3=5)
// But user says there was no opponent on pt5, so it shouldn't be a hit

console.log('\nAnalyzing move 8/5*:')
console.log('From point 8:', boardState.points[7]) // index 7 = point 8
console.log('To point 5:', point5)
console.log('Is point 5 occupied by opponent?', point5.owner === 'black' && point5.count === 1)
console.log('Hit should occur?', point5.count === 1 && point5.owner === 'black')