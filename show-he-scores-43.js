// Show heuristic scores for all legal moves for opening roll 43, ranked

async function showHeuristicScores43() {
  const xgid = '-b----E-C---eE---c-e----B-:0:0:1:43:0:0:0:0:10';

  console.log('=== HEURISTIC SCORES FOR OPENING ROLL 43 ===');
  console.log('XGID:', xgid);
  console.log('Pure heuristic evaluation (100% HE, 0% MC)');
  console.log('');

  try {
    const response = await fetch('http://localhost:3000/api/backgammon-engine', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        xgid,
        player: 1,
        maxTopMoves: 50,  // Get all legal moves
        numSimulations: 1, // Minimal MC (not used)
        heuristicWeight: 1.0, // 100% heuristic
        mcWeight: 0.0,       // 0% Monte Carlo
        debug: true
      }),
    });

    if (!response.ok) {
      console.error('API Error:', response.status, response.statusText);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }

    const result = await response.json();

    // Extract all moves with their heuristic scores
    const moves = result.debug?.allMoves || [];
    if (moves.length === 0) {
      console.log('No moves found in response');
      return;
    }

    // Sort moves by heuristic score (descending)
    moves.sort((a, b) => b.heuristicScore - a.heuristicScore);

    console.log(`Found ${moves.length} legal moves, ranked by heuristic score:`);
    console.log('');

    moves.forEach((move, index) => {
      const rank = (index + 1).toString().padStart(2, ' ');
      const score = move.heuristicScore.toFixed(3);
      const description = move.description || 'N/A';
      console.log(`${rank}. ${description.padEnd(15)} | Score: ${score}`);
    });

    console.log('');
    console.log('Top 3 moves:');
    console.log(`1. ${moves[0]?.description} (${moves[0]?.heuristicScore.toFixed(3)})`);
    console.log(`2. ${moves[1]?.description} (${moves[1]?.heuristicScore.toFixed(3)})`);
    console.log(`3. ${moves[2]?.description} (${moves[2]?.heuristicScore.toFixed(3)})`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

showHeuristicScores43();