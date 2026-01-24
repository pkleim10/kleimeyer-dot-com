"// Test script for opening move 43
// Using built-in fetch (Node.js 18+)

async function testOpeningMove43() {
  const xgid = '-b----E-C---eE---c-e----B-:0:0:1:43:0:0:0:0:10';

  console.log('Testing opening move 43...');
  console.log('XGID:', xgid);
  console.log('Sending request to API...');

  const startTime = Date.now();

  try {
    const response = await fetch('http://localhost:3000/api/backgammon-engine', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        xgid,
        player: 1,
        maxTopMoves: 10,  // Include all legal moves for MC analysis
        numSimulations: 1000,  // Full MC simulation with 1000 rollouts per move
        heuristicWeight: 0.6,  // 60% heuristic
        mcWeight: 0.4,        // 40% Monte Carlo (default)
        debug: true
      }),
    });

    if (!response.ok) {
      console.error('API Error:', response.status, response.statusText);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }

    const result = await response.json();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=== RESULTS (took ${elapsed}s) ===`);
    console.log('Move:', result.move?.description || 'N/A');
    console.log('Confidence:', result.confidence || 'N/A');

    if (result.performance) {
      console.log(`\n=== PERFORMANCE ===`);
      console.log(`Total Analysis Time: ${result.performance.totalElapsedMs}ms`);
      if (result.performance.parameters) {
        console.log(`Parameters:`);
        console.log(`  maxTopMoves: ${result.performance.parameters.maxTopMoves} (moves selected for MC analysis)`);
        console.log(`  maxMoves: ${result.performance.parameters.maxMoves} (MC simulation depth)`);
        console.log(`  numSimulations: ${result.performance.parameters.numSimulations} (MC simulations per move)`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testOpeningMove43();