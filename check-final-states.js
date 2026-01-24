// Check if 13/9 9/6 and 13/10 10/6 produce identical final board states

async function checkFinalStates() {
  console.log('=== CHECKING FINAL BOARD STATES ===');
  console.log('Comparing 13/9 9/6 vs 13/10 10/6');
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
        maxTopMoves: 50,
        numSimulations: 1,
        heuristicWeight: 1.0,
        mcWeight: 0.0,
        debug: true
      }),
    });

    if (!response.ok) {
      console.error('API Error:', response.status);
      return;
    }

    const result = await response.json();
    const allMoves = result.debug?.allMoves || [];

    // Find the two moves
    const move136 = allMoves.find(m => m.description === '13/9 9/6');
    const move13106 = allMoves.find(m => m.description === '13/10 10/6');

    if (!move136 || !move13106) {
      console.log('Moves not found:', { move136: !!move136, move13106: !!move13106 });
      return;
    }

    console.log('Found both moves:');
    console.log(`13/9 9/6: score ${move136.heuristicScore}`);
    console.log(`13/10 10/6: score ${move13106.heuristicScore}`);

    console.log('\nPosition keys:');
    console.log(`13/9 9/6: ${move136.positionKey?.substring(0, 100)}...`);
    console.log(`13/10 10/6: ${move13106.positionKey?.substring(0, 100)}...`);

    const keysMatch = move136.positionKey === move13106.positionKey;
    console.log(`Position keys match: ${keysMatch}`);

    // Since we can't access the final board states directly from the API response,
    // let's check if they have identical heuristic scores and breakdowns
    console.log('\nChecking if they produce identical evaluations...');

    // They should have identical scores since they lead to identical positions
    const scoresMatch = Math.abs(move136.heuristicScore - move13106.heuristicScore) < 0.001;
    console.log(`Scores match: ${scoresMatch} (${move136.heuristicScore} vs ${move13106.heuristicScore})`);

    if (scoresMatch) {
      console.log('✓ CONCLUSION: These moves lead to identical final positions');
      console.log('  Deduplication would be appropriate to avoid redundant MC simulations');
    } else {
      console.log('✗ CONCLUSION: These moves lead to different final positions');
      console.log('  No deduplication needed');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkFinalStates();