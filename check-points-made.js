// Check which moves create points and why scores didn't change

async function checkPointsMade() {
  console.log('=== CHECKING POINTS MADE FACTOR ===');
  console.log('XGID: -b----E-C---eE---c-e----B-:0:0:1:43:0:0:0:0:10');
  console.log('Opening position: White has points 6,8,13,24 occupied');
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
        maxTopMoves: 5,
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

    console.log('Moves that create points (Points Made > 0):');
    const movesWithPoints = moves.filter(move => move.breakdown?.pointsMade?.count > 0);

    if (movesWithPoints.length === 0) {
      console.log('❌ No moves create new made points in this position!');
      console.log('This explains why reducing Points Made weight had no effect.');
      console.log('');
      console.log('Why? In the opening position:');
      console.log('- White already has made points on 6,8,13,24');
      console.log('- All moves shown use existing made points or create temporary points');
      console.log('- No moves create NEW made points (2+ checkers where there were <2 before)');
    } else {
      movesWithPoints.forEach((move, idx) => {
        console.log(`${idx + 1}. ${move.description}: ${move.breakdown.pointsMade.count} points created`);
      });
    }

    console.log('');
    console.log('Top 3 moves and their point creation:');
    for (let i = 0; i < 3 && i < moves.length; i++) {
      const move = moves[i];
      const points = move.breakdown?.pointsMade?.count || 0;
      console.log(`${i + 1}. ${move.description}: ${points} new points (${(points * 0.3).toFixed(3)} score contribution)`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkPointsMade();