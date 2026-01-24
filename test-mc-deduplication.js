// Test if Monte Carlo deduplication is working by checking how many moves get MC simulations

async function testMCDeduplication() {
  console.log('=== TESTING MONTE CARLO DEDUPLICATION ===');
  console.log('With deduplication, moves leading to identical positions should not both get MC simulations');
  console.log('');

  try {
    const response = await fetch('http://localhost:3000/api/backgammon-engine', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        xgid: '-b----E-C---eE---c-e----B-:0:0:1:43:0:0:0:0:10',
        player: 1,
        maxTopMoves: 10, // Should select 10 moves for MC, but deduplicated
        numSimulations: 100, // Small number for testing
        heuristicWeight: 0.6,
        mcWeight: 0.4,
        debug: false
      }),
    });

    if (!response.ok) {
      console.error('API Error:', response.status);
      return;
    }

    const result = await response.json();

    console.log('API Response:');
    console.log(`- Move selected: ${result.move?.description || 'N/A'}`);
    console.log(`- Confidence: ${result.confidence || 'N/A'}`);

    if (result.performance) {
      console.log(`- Total time: ${result.performance.totalElapsedMs}ms`);
      console.log(`- Max top moves requested: ${result.performance.parameters?.maxTopMoves || 'N/A'}`);
      console.log(`- MC simulations per move: ${result.performance.parameters?.numSimulations || 'N/A'}`);
    }

    console.log('');
    console.log('✓ If deduplication is working, the engine should have:');
    console.log('  - Evaluated all 18 legal moves heuristically');
    console.log('  - Deduplicated to ~17 unique positions (since 13/9 9/6 and 13/10 10/6 are identical)');
    console.log('  - Run MC simulations on only the top 10 unique positions');
    console.log('  - This saves 1 MC simulation run');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testMCDeduplication();