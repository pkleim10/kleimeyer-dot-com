// Check if 13/6 appears as a single move

async function find136() {
  console.log('=== LOOKING FOR 13/6 MOVE ===');
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
        maxTopMoves: 100,
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

    // Check legalMoves for 13/6
    const legalMoves = result.debug?.legalMoves || [];
    const single136 = legalMoves.find(move =>
      move.description === '13/6' && move.moves && move.moves.length === 1
    );

    if (single136) {
      console.log('✓ FOUND: 13/6 as single move');
      console.log(`Total pips: ${single136.totalPips}`);
      console.log(`Moves: ${single136.moves.length}`);
      single136.moves.forEach((m, i) => {
        console.log(`  ${i + 1}: ${m.from} → ${m.to} (die: ${m.die})`);
      });
    } else {
      console.log('✗ NOT FOUND: 13/6 as single move');
    }

    // Check allMoves for 13/6
    const allMoves = result.debug?.allMoves || [];
    const ranked136 = allMoves.find(move => move.description === '13/6');

    if (ranked136) {
      console.log('\n✓ FOUND: 13/6 in ranked list');
      console.log(`Heuristic score: ${ranked136.heuristicScore}`);
    } else {
      console.log('\n✗ NOT FOUND: 13/6 in ranked list');
    }

    // Show all moves that involve moving to point 6
    console.log('\nAll moves involving point 6:');
    const movesTo6 = allMoves.filter(move =>
      move.description.includes('/6') ||
      move.description.includes('6/')
    );

    movesTo6.forEach((move, idx) => {
      console.log(`${idx + 1}. ${move.description} (score: ${move.heuristicScore.toFixed(3)})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

find136();