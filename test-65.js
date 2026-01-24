// Test script for opening move 65
// Using built-in fetch (Node.js 18+)

async function testOpeningMove65() {
  const xgid = '-b----E-C---eE---c-e----B-:0:0:1:65:0:0:0:0:10';

  console.log('Testing opening move 65...');
  console.log('XGID:', xgid);
  console.log('Sending request to API...');

  const startTime = Date.now();

  try {
    const response = await fetch('http://localhost:3000/api/backgammon-engine', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        xgid,
        player: 1,
        maxTopMoves: 6,   // Match play page default
        numSimulations: 1000,  // Full MC simulation with 1000 rollouts per move
        heuristicWeight: 0.35, // 35% heuristic
        mcWeight: 0.65,       // 65% Monte Carlo
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

    // Show all analyzed moves with their scores
    if (result.debug && result.debug.allMoves) {
      console.log(`\n=== ALL ANALYZED MOVES (took ${elapsed}s) ===`);
      console.log(`Total legal moves generated: ${result.debug.allMoves?.length || 'N/A'}`);
      console.log(`Moves after deduplication: ${result.debug.deduplicatedMoves?.length || 'N/A'}`);
      console.log(`Moves analyzed with MC: ${result.debug.allMoves.length}`);
      console.log('');

      // Table header
      console.log('Rank | Move          | HE Score | MC Score | Hybrid Score');
      console.log('-----|---------------|----------|----------|-------------');

      result.debug.allMoves.forEach((move, idx) => {
        const rank = (idx + 1).toString().padStart(4);
        const moveDesc = move.description.padEnd(15);
        const heScore = move.heuristicScore?.toFixed(3).padStart(8) || 'N/A    ';
        const mcScore = move.mcScore?.toFixed(3).padStart(8) || 'N/A    ';
        const hybridScore = move.hybridScore?.toFixed(3).padStart(11) || 'N/A       ';
        const selected = move.description === result.move?.description ? ' ← SELECTED' : '';

        console.log(`${rank} | ${moveDesc}| ${heScore} | ${mcScore} | ${hybridScore}${selected}`);
      });

      console.log('');
      console.log('=== FINAL SELECTION ===');
      console.log(`Selected: ${result.move?.description || 'N/A'}`);
      console.log(`Confidence: ${result.confidence || 'N/A'}`);
    } else {
      console.log(`\n=== RESULTS (took ${elapsed}s) ===`);
      console.log('Move:', result.move?.description || 'N/A');
      console.log('Confidence:', result.confidence || 'N/A');
      console.log('(Debug info not available)');
    }

    if (result.performance) {
      console.log(`\n=== PERFORMANCE ===`);
      console.log(`Total Analysis Time: ${result.performance.totalElapsedMs}ms`);
      if (result.performance.parameters) {
        console.log(`Parameters:`);
        console.log(`  maxTopMoves: ${result.performance.parameters.maxTopMoves} (moves selected for MC analysis)`);
        console.log(`  maxMoves: ${result.performance.parameters.maxMoves} (MC simulation depth)`);
        console.log(`  numSimulations: ${result.performance.parameters.numSimulations} (MC simulations per move)`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testOpeningMove65();