// Debug the move generation to see why 10→6 is not found

async function debugMoveGen() {
  console.log('=== DEBUGGING MOVE GENERATION ===');
  console.log('Testing if 10→6 is a valid move after 13→10');
  console.log('');

  try {
    // First, let's see what happens when we try to generate moves for a state
    // where point 10 has a checker and we have die 4

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
    const legalMoves = result.debug?.legalMoves || [];

    console.log(`Generated ${legalMoves.length} legal moves`);

    // Look for any moves that involve point 10
    const movesWith10 = legalMoves.filter(move =>
      move.description.includes('10/') ||
      (move.moves && move.moves.some(m => m.from === 10 || m.to === 10))
    );

    console.log(`\nMoves involving point 10: ${movesWith10.length}`);
    movesWith10.forEach((move, idx) => {
      console.log(`${idx + 1}. ${move.description}`);
      if (move.moves) {
        move.moves.forEach((m, i) => {
          console.log(`   ${i + 1}: ${m.from} → ${m.to} (die: ${m.die})`);
        });
      }
      console.log('');
    });

    // Check if there are any sequences that start with 13→10
    const sequencesFrom13 = legalMoves.filter(move =>
      move.moves &&
      move.moves.length >= 2 &&
      move.moves[0].from === 13 &&
      move.moves[0].to === 10
    );

    console.log(`Sequences starting with 13→10: ${sequencesFrom13.length}`);
    sequencesFrom13.forEach((move, idx) => {
      console.log(`${idx + 1}. ${move.description}`);
      move.moves.forEach((m, i) => {
        console.log(`   ${i + 1}: ${m.from} → ${m.to} (die: ${m.die})`);
      });
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugMoveGen();