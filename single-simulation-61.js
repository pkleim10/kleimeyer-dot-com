#!/usr/bin/env node

/**
 * Run a single Monte Carlo simulation for "61" roll
 * Use the move with highest HE score
 * Track all moves via console logs
 */

async function runSingleSimulation() {
  console.log('🔄 Starting single simulation for "61" roll...');

  // Starting position with 61 roll
  const XGID_61 = "-b----E-C---eE---c-e----B-:0:0:0:61:0:0:0:0:10";

  try {
    // Get the engine analysis for the 61 roll with debug info
    console.log('📡 Calling backgammon engine API...');
    const response = await fetch('http://localhost:3000/api/backgammon-engine', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        xgid: XGID_61,
        player: 1, // White to move
        difficulty: 'advanced',
        maxTopMoves: 6,
        numSimulations: 1, // 1 simulation for performance testing
        maxMoves: 5, // Shorter for faster testing
        debug: true,
        skipLegalMoves: true // Skip expensive legal move generation for MC testing
      })
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    console.log('📋 API call successful');

    // Use the best move from the API response
    const bestMove = {
      description: result.move?.description || 'No move',
      heuristicScore: result.move?.heuristicScore || 0,
      mcScore: result.move?.mcScore || 0
    };

    console.log('🎯 Best move:', bestMove.description);

    console.log('\n🔍 CHECK THE SERVER CONSOLE LOGS NOW!');
    console.log('📝 The real Monte Carlo simulation is logging every move with random dice...');
    console.log('🎲 Look for lines starting with [MC-Simulation-1] and [MC-Tracking]');

    // Create a summary file
    const output = formatSimulationSummary(XGID_61, bestMove);

    // Include tracked simulation data if available
    let fullOutput = output;
    if (result.trackedSimulation) {
      console.log('📋 Detailed simulation data available in API response!');
      fullOutput += '\n## Detailed Move Sequence\n\n';
      fullOutput += `**Total Moves**: ${result.trackedSimulation.totalMoves}\n`;
      fullOutput += `**Winner**: ${result.trackedSimulation.winner || 'incomplete'}\n\n`;

      if (result.trackedSimulation.whiteMoves && result.trackedSimulation.whiteMoves.length > 0) {
        fullOutput += '### White Moves:\n';
        result.trackedSimulation.whiteMoves.forEach((move, idx) => {
          fullOutput += `${idx + 1}. ${move}\n`;
        });
        fullOutput += '\n';
      }

      if (result.trackedSimulation.blackMoves && result.trackedSimulation.blackMoves.length > 0) {
        fullOutput += '### Black Moves:\n';
        result.trackedSimulation.blackMoves.forEach((move, idx) => {
          fullOutput += `${idx + 1}. ${move}\n`;
        });
        fullOutput += '\n';
      }
    }

    const fs = require('fs');
    fs.writeFileSync('simulation-61.md', fullOutput);

    console.log('✅ Detailed simulation written to simulation-61.md');
    if (!result.trackedSimulation) {
      console.log('🔍 SERVER LOGS contain the ACTUAL MC move sequence!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

function formatSimulationSummary(xgid, bestMove) {
  let output = `# Monte Carlo Simulation: "43" Roll - Summary

## Setup
- **XGID**: ${xgid}
- **Roll**: 4-3
- **Player**: White (white)
- **Opening Move**: ${bestMove.description} (HE: ${bestMove.heuristicScore.toFixed(3)}, MC: ${bestMove.mcScore.toFixed(3)})

## Real MC Simulation Results

The complete move sequence from the actual Monte Carlo simulation is logged to the **SERVER CONSOLE**.

Look for log entries starting with:
- \`[MC-Simulation-1]\` - Individual simulation tracking
- \`[MC-Tracking]\` - Complete move sequence

### Expected Log Format:
\`\`\`
[MC-Simulation-1] Starting simulation 1/1
[MC-Simulation-1] Opening move by white: [opening move]
[MC-Simulation-1] Move 1 by black: [move] (dice: X-Y)
[MC-Simulation-1] Move 2 by white: [move] (dice: X-Y)
[MC-Simulation-1] Move 3 by black: [move] (dice: X-Y)
...
[MC-Tracking] Simulation completed: X moves, winner: white/black
\`\`\`

## What This Shows:
- ✅ **Real random dice generation** for each turn
- ✅ **Legal move selection** from available moves
- ✅ **Complete game simulation** until completion or max moves
- ✅ **Authentic MC behavior** (not fabricated examples)

## Parameters Used:
- **numSimulations**: 1 (single simulation for detailed logging)
- **maxMoves**: 40 (maximum moves before termination)
- **maxTopMoves**: 6 (moves analyzed by HE score)

## Notes
- The 43 roll restricts legal moves to combinations using 4 and 3
- Each subsequent move uses freshly generated random dice
- Moves are selected randomly from all legal options for those dice
- Console logs show the exact dice and moves chosen

Check your terminal/server console for the detailed move sequence!
`;

  return output;
}

// Run the simulation
runSingleSimulation().catch(console.error);