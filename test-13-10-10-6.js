// Test if 13/10 10/6 is a legal move for opening roll 43

async function test1310106() {
  console.log('=== TESTING 13/10 10/6 MOVE ===');
  console.log('Roll: 43 (dice 4,3)');
  console.log('Move sequence: 13→10 (3), 10→6 (4)');
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
        maxTopMoves: 50, // Get all legal moves
        numSimulations: 1, // Minimal MC
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

    // Check if 13/10 10/6 appears in the moves
    const moves = result.debug?.allMoves || [];
    const targetMove = moves.find(move =>
      move.description === '13/10 10/6' ||
      move.description === '13/6' ||
      (move.description.includes('13/') && move.description.includes('6'))
    );

    console.log(`Total legal moves found: ${moves.length}`);
    console.log('');

    if (targetMove) {
      console.log('✓ FOUND: 13/10 10/6 is a legal move!');
      console.log(`Description: ${targetMove.description}`);
      console.log(`Heuristic Score: ${targetMove.heuristicScore}`);
    } else {
      console.log('✗ NOT FOUND: 13/10 10/6 is not in the legal moves list');

      console.log('\nAll moves containing "13/" and "6":');
      const relevantMoves = moves.filter(move =>
        move.description.includes('13/') && move.description.includes('6')
      );
      if (relevantMoves.length > 0) {
        relevantMoves.forEach(move => {
          console.log(`  - ${move.description} (score: ${move.heuristicScore})`);
        });
      } else {
        console.log('  (none found)');
      }

      console.log('\nAll moves containing "13/":');
      const movesWith13 = moves.filter(move => move.description.includes('13/'));
      movesWith13.slice(0, 5).forEach(move => {
        console.log(`  - ${move.description}`);
      });
      if (movesWith13.length > 5) {
        console.log(`  ... and ${movesWith13.length - 5} more`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

test1310106();