// Debug the full simulation to see if we can extract top 3 rankings

async function debugFullSim21() {
  console.log('=== DEBUG FULL SIMULATION - ROLL 21 ===');
  console.log('Checking what information is available...');
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
        debug: true
      }),
    });

    if (!response.ok) {
      console.error('API Error:', response.status);
      return;
    }

    const result = await response.json();

    console.log('Available result keys:', Object.keys(result));
    console.log('');

    if (result.debug) {
      console.log('Debug info keys:', Object.keys(result.debug));
      console.log('');

      if (result.debug.allMoves) {
        console.log(`Debug allMoves length: ${result.debug.allMoves.length}`);
        console.log('Top 3 from HE evaluation:');
        for (let i = 0; i < Math.min(3, result.debug.allMoves.length); i++) {
          const move = result.debug.allMoves[i];
          console.log(`  ${i + 1}. ${move.description} (HE: ${move.heuristicScore.toFixed(3)})`);
        }
      }
    }

    console.log('');
    console.log('Winner from hybrid evaluation:');
    console.log(`Move: ${result.move?.description || 'N/A'}`);
    console.log(`Confidence: ${result.confidence || 'N/A'}`);

    if (result.reasoning) {
      console.log(`Reasoning: ${result.reasoning}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugFullSim21();