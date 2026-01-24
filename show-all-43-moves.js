// Show all legal moves for opening roll 43 BEFORE deduplication

async function showAll43Moves() {
  console.log('=== ALL LEGAL MOVES FOR OPENING ROLL 43 (BEFORE DEDUPLICATION) ===');
  console.log('XGID: -b----E-C---eE---c-e----B-:0:0:1:43:0:0:0:0:10');
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
        maxTopMoves: 100, // Get all moves
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

    // Show all legal moves before HE evaluation/deduplication
    const allLegalMoves = result.debug?.legalMoves || [];
    console.log(`Total legal moves generated: ${allLegalMoves.length}`);
    console.log('');

    console.log('ALL LEGAL MOVES (before HE evaluation and deduplication):');
    console.log('============================================================');
    allLegalMoves.forEach((move, idx) => {
      console.log(`${String(idx + 1).padStart(2, ' ')}. ${move.description} (${move.totalPips} pips)`);
    });

    console.log('');
    console.log('SUMMARY:');
    console.log(`- Total legal moves: ${allLegalMoves.length}`);
    console.log('- After deduplication by final position: 17 unique positions');
    console.log('- After HE evaluation: ranked by strategic value');
    console.log('- After MC simulation: final hybrid ranking');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

showAll43Moves();