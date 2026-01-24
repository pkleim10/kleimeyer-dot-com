// Debug the raw move data for 13/10 6/2 to see what's actually happening

async function debugRawMoves() {
  console.log('=== DEBUGGING RAW MOVE DATA ===');
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

    // Look at the legalMoves array which should contain the raw move data
    const legalMoves = result.debug?.legalMoves || [];

    console.log(`Found ${legalMoves.length} legal moves in debug.legalMoves`);

    // Find moves that contain "13/10" in their description
    const relevantMoves = legalMoves.filter(move =>
      move.description && move.description.includes('13/10')
    );

    console.log(`\nMoves containing "13/10": ${relevantMoves.length}`);
    relevantMoves.forEach((move, idx) => {
      console.log(`${idx + 1}. ${move.description}`);
      console.log(`   Total pips: ${move.totalPips}`);
      console.log(`   Moves: ${move.moves ? move.moves.length : 'N/A'}`);
      if (move.moves) {
        move.moves.forEach((m, i) => {
          console.log(`     ${i + 1}: ${m.from} → ${m.to} (die: ${m.die})`);
        });
      }
      console.log('');
    });

    // Also check allMoves array
    const allMoves = result.debug?.allMoves || [];
    console.log(`Found ${allMoves.length} moves in debug.allMoves`);

    const targetMove = allMoves.find(move => move.description === '13/10 6/2');
    if (targetMove) {
      console.log('\nFound target move in allMoves:');
      console.log(`Description: ${targetMove.description}`);
      console.log(`Heuristic score: ${targetMove.heuristicScore}`);
      // The breakdown might contain move details, but we don't have access to raw moves here
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugRawMoves();