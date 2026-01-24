// Show top 3 moves for opening roll 21

async function showTop321() {
  console.log('=== TOP 3 MOVES FOR OPENING ROLL 21 ===');
  console.log('XGID: -b----E-C---eE---c-e----B-:0:0:1:21:0:0:0:0:10');
  console.log('Roll: 21 (2+1)');
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
        maxTopMoves: 3, // Just get top 3
        numSimulations: 20,
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

    // Show top 3 from HE evaluation (since debug=true gives us the ranked list)
    const moves = result.debug?.allMoves || [];

    console.log('TOP 3 MOVES (Pure Heuristic Evaluation):');
    console.log('');

    for (let i = 0; i < Math.min(3, moves.length); i++) {
      const move = moves[i];
      console.log(`${i + 1}. ${move.description}`);
      console.log(`   Score: ${move.heuristicScore.toFixed(3)}`);
      console.log('');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

showTop321();