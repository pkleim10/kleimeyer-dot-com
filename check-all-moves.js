// Check all legal moves for opening roll 43 to see the different notations

async function checkAllMoves() {
  console.log('=== ALL LEGAL MOVES FOR OPENING ROLL 43 ===');
  console.log('XGID: -b----E-C---eE---c-e----B-');
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
    const moves = result.debug?.allMoves || [];

    console.log(`Total moves: ${moves.length}`);
    console.log('');

    // Show moves ranked by heuristic score
    moves.forEach((move, index) => {
      const rank = (index + 1).toString().padStart(2, ' ');
      const score = move.heuristicScore.toFixed(3);
      const desc = move.description.padEnd(12);
      console.log(`${rank}. ${desc} | Score: ${score}`);
    });

    console.log('');
    console.log('Moves involving point 13 and ending on point 6:');

    const relevantMoves = moves.filter(move =>
      move.description.includes('13/') &&
      (move.description.includes('/6') || move.description.includes('6/'))
    );

    if (relevantMoves.length > 0) {
      relevantMoves.forEach(move => {
        console.log(`  - ${move.description} (score: ${move.heuristicScore.toFixed(3)})`);
      });
    } else {
      console.log('  None found');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAllMoves();