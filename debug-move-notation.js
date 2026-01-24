// Debug the move notation issue for 13/10 10/6

async function debugMoveNotation() {
  console.log('=== DEBUGGING MOVE NOTATION ===');
  console.log('Expected: 13/10 10/6 should be formatted as 13/6 or 13/10 6/2');
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

    // Find the specific move
    const targetMove = moves.find(move => move.description === '13/10 6/2');

    if (targetMove) {
      console.log('Found move: 13/10 6/2');
      console.log('Move details:');
      console.log(`- Description: ${targetMove.description}`);
      console.log(`- Heuristic Score: ${targetMove.heuristicScore}`);

      // The breakdown should contain the move details
      console.log('\nMove breakdown:');
      if (targetMove.breakdown) {
        console.log(JSON.stringify(targetMove.breakdown, null, 2));
      }

      console.log('\nThis notation is WRONG!');
      console.log('13/10 6/2 means: move from 13 to 10, AND move from 6 to 2');
      console.log('But we want: move from 13 to 10 to 6 (same checker)');
      console.log('Correct notation should be: 13/6 or 13/10/6');

    } else {
      console.log('Move 13/10 6/2 not found');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugMoveNotation();