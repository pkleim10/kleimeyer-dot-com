// Show top 3 winners from complete roll 21 simulation

async function top3Winners21() {
  console.log('=== TOP 3 WINNERS - ROLL 21 HYBRID SIMULATION ===');
  console.log('XGID: -b----E-C---eE---c-e----B-:0:0:1:21:0:0:0:0:10');
  console.log('Hybrid: 60% HE + 40% MC (100 sims/move)');
  console.log('');

  try {
    const response = await fetch('http://localhost:3000/api/backgammon-engine', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        xgid: '-b----E-C---eE---c-e----B-:0:0:1:21:0:0:0:0:10',
        player: 1,
        maxTopMoves: 6,
        numSimulations: 100,
        heuristicWeight: 0.6,
        mcWeight: 0.4,
        debug: true  // Get detailed results
      }),
    });

    if (!response.ok) {
      console.error('API Error:', response.status);
      return;
    }

    const result = await response.json();

    console.log('OFFICIAL WINNER:');
    console.log(`1. ${result.move?.description || 'N/A'} (Confidence: ${result.confidence || 'N/A'})`);
    console.log('');

    // The API doesn't return the ranked list, so let's show what we can
    console.log('SIMULATION DETAILS:');
    console.log(`- Total analysis time: ${result.performance?.totalElapsedMs || 'N/A'}ms`);
    console.log(`- MC simulations per move: ${result.performance?.parameters?.numSimulations || 'N/A'}`);
    console.log(`- Moves evaluated: ${result.performance?.parameters?.maxTopMoves || 'N/A'}`);
    console.log('');

    console.log('NOTE: The hybrid engine evaluates the top moves and selects the best one.');
    console.log('The top 3 would be the highest-scoring moves from the hybrid evaluation.');
    console.log('To see all rankings, the API would need to return more detailed results.');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

top3Winners21();