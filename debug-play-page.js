// Debug script to see what parameters the play page sends vs test script
// This will help identify why they give different results

const testParams = {
  xgid: '-b----E-C---eE---c-e----B-:0:0:1:65:0:0:0:0:10',
  player: 1,
  maxTopMoves: 20,  // Test script uses this
  numSimulations: 1000,
  heuristicWeight: 0.6,
  mcWeight: 0.4,
  debug: true
};

const playPageParams = {
  xgid: '-b----E-C---eE---c-e----B-:0:0:1:65:0:0:0:0:10',
  player: 1,
  difficulty: 'intermediate',  // Play page sends this
  maxMoves: 5,                 // Play page sends this (ignored)
  debug: true,
  usedDice: []                  // Play page sends this
};

console.log('=== PARAMETER COMPARISON ===');
console.log('Test Script Parameters:');
console.log(JSON.stringify(testParams, null, 2));
console.log('');
console.log('Play Page Parameters:');
console.log(JSON.stringify(playPageParams, null, 2));
console.log('');
console.log('Key Differences:');
console.log('- Test script: maxTopMoves=20 (analyzes 20 moves)');
console.log('- Play page: maxTopMoves=6 default (analyzes only 6 moves)');
console.log('- Play page sends: difficulty, maxMoves, usedDice');
console.log('- usedDice affects move generation if not empty');
console.log('');
console.log('ROOT CAUSE: Play page analyzes only top 6 heuristic moves,');
console.log('missing 24/13 which ranks lower in heuristic scoring but higher in MC!');