// Test script for opening roll "31" - both 3 and 1
// In backgammon, doubles (like 33) give 4 moves, but 31 gives 2 moves

async function testOpening31() {
  console.log('=== TESTING OPENING ROLL "31" ===');
  console.log('Opening position, white to move, rolls 3 and 1');

  // XGID for standard opening position with dice 31
  const xgid = "-b----E-C---eE---c-e----B-:0:0:1:31:0:0:0:0:10";

  console.log('XGID:', xgid);

  const startTime = Date.now();

  try {
    const response = await fetch('http://localhost:3000/api/backgammon-engine', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        xgid,
        player: 1, // White
        maxTopMoves: 10,
        numSimulations: 1000,
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

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=== RESULTS (took ${elapsed}s) ===`);
    console.log('Recommended move:', result.move?.description || 'N/A');
    console.log('Confidence:', result.confidence || 'N/A');
    console.log('Legal moves found:', result.debug?.legalMoves?.length || 'N/A');

    if (result.debug?.legalMoves) {
      console.log('\nTop 10 legal moves:');
      result.debug.legalMoves.slice(0, 10).forEach((move, idx) => {
        console.log(`  ${idx + 1}. ${move.description} (${move.totalPips || 0} pips)`);
      });
    }

    // Also show factor breakdown if available
    if (result.factorScores && result.factorScores.length > 0) {
      console.log('\nDetailed factor breakdown for top moves:');
      result.factorScores.slice(0, 3).forEach((score, idx) => {
        console.log(`  ${idx + 1}. ${score.moveDescription}`);
        console.log(`     ${score.scores}`);
      });
    }

    console.log('\n=== ANALYSIS COMPLETE ===');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testOpening31();