// Test to demonstrate the normalization bug
// 13/9 9/6 and 13/10 10/6 should get identical heuristic scores

async function testNormalizationBug() {
  console.log('=== TESTING HEURISTIC NORMALIZATION BUG ===\n');

  const xgid = '-b----E-C---eE---c-e----B-:0:0:1:43:0:0:0:0:10';

  console.log('Testing moves that lead to identical final positions:');
  console.log('1. 13/9 9/6  (via point 9)');
  console.log('2. 13/10 10/6 (via point 10)');
  console.log('Both should end with: point 13 empty, point 6 has +1 checker');
  console.log('');

  // Test pure heuristic evaluation (100% weight)
  console.log('=== PURE HEURISTIC EVALUATION (100%) ===');

  const response1 = await fetch('http://localhost:3000/api/backgammon-engine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      xgid,
      player: 1,
      maxTopMoves: 5,
      numSimulations: 10, // Minimal MC
      heuristicWeight: 1.0, // 100% heuristic
      mcWeight: 0.0,
      debug: true
    }),
  });

  if (response1.ok) {
    const result1 = await response1.json();
    console.log('Analysis completed - check server logs for detailed factor breakdowns');
    console.log(`Top move: ${result1.move?.description}`);
    console.log(`Score: ${result1.reasoning?.match(/score (\d+\.\d+)/)?.[1] || 'N/A'}`);
  }

  console.log('\n=== CONCLUSION ===');
  console.log('If the server logs show different factor breakdowns for moves');
  console.log('that lead to identical final positions, then the normalization');
  console.log('bug exists and needs to be fixed.');
  console.log('');
  console.log('The heuristic evaluation should only consider final board state,');
  console.log('not intermediate move sequences.');
}

testNormalizationBug();