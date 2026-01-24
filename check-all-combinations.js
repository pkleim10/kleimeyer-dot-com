// Check if the correct sequence 13/10 10/6 is being generated at all

async function checkAllCombinations() {
  console.log('=== CHECKING ALL POSSIBLE COMBINATIONS ===');
  console.log('Looking for the correct sequence: 13→10→6');
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
        maxTopMoves: 100, // Get ALL combinations
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

    // Check legalMoves for the correct sequence
    const legalMoves = result.debug?.legalMoves || [];
    console.log(`Total legal moves generated: ${legalMoves.length}`);

    // Look for moves with the correct sequence
    const correctSequence = legalMoves.find(move => {
      if (!move.moves || move.moves.length !== 2) return false;
      const [move1, move2] = move.moves;
      return move1.from === 13 && move1.to === 10 && move1.die === 3 &&
             move2.from === 10 && move2.to === 6 && move2.die === 4;
    });

    if (correctSequence) {
      console.log('✓ FOUND: Correct sequence 13→10→6 exists!');
      console.log(`Description: ${correctSequence.description}`);
      console.log(`Total pips: ${correctSequence.totalPips}`);
    } else {
      console.log('✗ NOT FOUND: Correct sequence 13→10→6 does not exist');

      // Show all 2-move combinations
      console.log('\nAll 2-move combinations:');
      const twoMoveCombos = legalMoves.filter(move => move.moves && move.moves.length === 2);
      twoMoveCombos.forEach((move, idx) => {
        const [m1, m2] = move.moves;
        console.log(`${idx + 1}. ${m1.from}→${m1.to} (${m1.die}) + ${m2.from}→${m2.to} (${m2.die}) = ${move.description}`);
      });
    }

    // Check if it appears in allMoves
    const allMoves = result.debug?.allMoves || [];
    const correctInAllMoves = allMoves.find(move =>
      move.description.includes('13/10') &&
      (move.description.includes('10/6') || move.description.includes('6/'))
    );

    if (correctInAllMoves) {
      console.log('\n✓ Correct sequence appears in final ranked list');
      console.log(`Description: ${correctInAllMoves.description}`);
    } else {
      console.log('\n✗ Correct sequence does not appear in final ranked list');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAllCombinations();