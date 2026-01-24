// Test to directly compare 13/9 9/6 vs 13/10 10/6 moves
// These should produce identical heuristic scores

async function testMoveNormalization() {
  console.log('=== TESTING MOVE NORMALIZATION ===\n');

  console.log('Testing moves that lead to identical final positions:');
  console.log('Move A: 13/9 9/6  (via point 9)');
  console.log('Move B: 13/10 10/6 (via point 10)');
  console.log('Both end with: point 13 empty, point 6 gains 1 checker');
  console.log('');

  const xgid = '-b----E-C---eE---c-e----B-:0:0:1:43:0:0:0:0:10';

  // Test with debug logging enabled to capture factor breakdowns
  console.log('Running analysis with debug logging...');

  const response = await fetch('http://localhost:3000/api/backgammon-engine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      xgid,
      player: 1,
      maxTopMoves: 10, // Get multiple moves
      numSimulations: 50, // Minimal MC
      heuristicWeight: 1.0, // Pure heuristic to see factor differences
      mcWeight: 0.0,
      debug: true
    }),
  });

  if (response.ok) {
    const result = await response.json();
    console.log('Analysis completed.');
    console.log('Check server logs for detailed factor breakdowns of moves containing "13/" and "6"');
    console.log('');
    console.log('If the breakdowns show different scores for equivalent final positions,');
    console.log('then the normalization bug exists.');
  } else {
    console.log('Analysis failed:', response.status);
  }
}

testMoveNormalization();