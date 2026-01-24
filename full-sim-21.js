// Complete simulation for roll 21 - hybrid evaluation with MC

async function fullSim21() {
  console.log('=== COMPLETE SIMULATION - ROLL 21 ===');
  console.log('XGID: -b----E-C---eE---c-e----B-:0:0:1:21:0:0:0:0:10');
  console.log('Hybrid: 60% HE + 40% MC');
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
        maxTopMoves: 6,  // Standard setting
        numSimulations: 100,  // More simulations for accuracy
        heuristicWeight: 0.6,  // 60% heuristic
        mcWeight: 0.4,        // 40% Monte Carlo
        debug: false
      }),
    });

    if (!response.ok) {
      console.error('API Error:', response.status);
      return;
    }

    const result = await response.json();

    console.log('WINNER:');
    console.log(`Move: ${result.move?.description || 'N/A'}`);
    console.log(`Confidence: ${result.confidence || 'N/A'}`);
    console.log('');

    if (result.reasoning) {
      console.log('REASONING:');
      console.log(result.reasoning);
      console.log('');
    }

    if (result.performance) {
      console.log('PERFORMANCE:');
      console.log(`Total Time: ${result.performance.totalElapsedMs}ms`);
      console.log(`MC Simulations: ${result.performance.parameters?.numSimulations || 'N/A'} per move`);
      console.log(`Moves Evaluated: ${result.performance.parameters?.maxTopMoves || 'N/A'}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

fullSim21();