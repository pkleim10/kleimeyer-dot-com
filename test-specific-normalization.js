// Test specific moves that should lead to identical final positions
// 13/9 9/6 and 13/10 10/6 both end with checker on point 6

async function testSpecificNormalization() {
  console.log('=== TESTING SPECIFIC MOVE NORMALIZATION ===\n');

  // Create a simple board state where both moves are possible
  const xgid = '-b----E-C---eE---c-e----B-:0:0:1:54:0:0:0:0:10';

  console.log('Testing moves that should lead to identical final positions:');
  console.log('Roll 54:');
  console.log('Move A: 13/9 9/6  (13→9→6)');
  console.log('Move B: 13/10 10/6 (13→10→6)');
  console.log('Both should end with: checker moved to point 6');
  console.log('');

  // Test pure heuristic evaluation
  console.log('Running evaluation with debug logging...');

  const response = await fetch('http://localhost:3000/api/backgammon-engine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      xgid,
      player: 1,
      maxTopMoves: 15, // Get many moves
      numSimulations: 10, // Minimal MC
      heuristicWeight: 1.0,
      mcWeight: 0.0,
      debug: true
    }),
  });

  if (response.ok) {
    const result = await response.json();
    console.log('Analysis completed.');
    console.log('Check server logs for factor breakdowns of moves ending on point 6');
    console.log('');
    console.log('Expected: All moves ending with checker on point 6 should have identical scores');
  } else {
    console.log('Analysis failed:', response.status);
  }
}

testSpecificNormalization();