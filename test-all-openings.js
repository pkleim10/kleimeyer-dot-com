// Test all 15 opening moves with hybrid evaluation and compare to XG rankings
// Using built-in fetch (Node.js 18+)

const openingMovesData = {
  "2-1": [
    { rank: 1, move: "13/11 6/5", equity: +0.0088, wins: 50.58, gammons: 14.15, backgammons: 0.59 },
    { rank: 2, move: "24/23 13/11", equity: +0.0045, wins: 49.96, gammons: 13.69, backgammons: 0.56 },
    { rank: 3, move: "24/21", equity: -0.0226, wins: 49.18, gammons: 12.54, backgammons: 0.56 },
    { rank: 4, move: "13/10", equity: -0.0256, wins: 48.97, gammons: 13.78, backgammons: 0.59 },
    { rank: 5, move: "24/23 24/22", equity: -0.0382, wins: 48.68, gammons: 12.13, backgammons: 0.51 }
  ],
  "3-1": [
    { rank: 1, move: "8/5 6/5", equity: +0.1670, wins: 55.46, gammons: 17.08, backgammons: 0.71 }
  ],
  "3-2": [
    { rank: 1, move: "13/11 13/10", equity: +0.0053, wins: 49.77, gammons: 14.93, backgammons: 0.65 },
    { rank: 2, move: "24/21 13/11", equity: +0.0052, wins: 50.17, gammons: 13.55, backgammons: 0.64 },
    { rank: 3, move: "24/22 13/10", equity: +0.0006, wins: 49.85, gammons: 13.66, backgammons: 0.59 },
    { rank: 4, move: "13/10 6/4", equity: -0.0279, wins: 49.18, gammons: 13.69, backgammons: 0.61 },
    { rank: 5, move: "24/22 24/21", equity: -0.0280, wins: 49.24, gammons: 12.23, backgammons: 0.54 }
  ],
  "4-1": [
    { rank: 1, move: "24/23 13/9", equity: +0.0024, wins: 49.84, gammons: 14.05, backgammons: 0.58 },
    { rank: 2, move: "13/9 6/5", equity: -0.0063, wins: 50.00, gammons: 14.14, backgammons: 0.62 },
    { rank: 3, move: "24/23 24/20", equity: -0.0318, wins: 48.86, gammons: 12.23, backgammons: 0.52 },
    { rank: 4, move: "13/8", equity: -0.0348, wins: 48.87, gammons: 13.44, backgammons: 0.67 },
    { rank: 5, move: "24/20 6/5", equity: -0.0406, wins: 48.79, gammons: 12.70, backgammons: 0.59 }
  ],
  "4-2": [
    { rank: 1, move: "8/4 6/4", equity: +0.1234, wins: 53.80, gammons: 16.97, backgammons: 0.74 }
  ],
  "4-3": [
    { rank: 1, move: "13/10 13/9", equity: +0.0125, wins: 49.84, gammons: 15.29, backgammons: 0.75 },
    { rank: 2, move: "24/21 13/9", equity: +0.0060, wins: 49.96, gammons: 14.04, backgammons: 0.66 },
    { rank: 3, move: "24/20 13/10", equity: +0.0008, wins: 49.89, gammons: 13.55, backgammons: 0.61 },
    { rank: 4, move: "24/21 24/20", equity: -0.0120, wins: 49.80, gammons: 12.23, backgammons: 0.56 }
  ],
  "5-1": [
    { rank: 1, move: "24/23 13/8", equity: +0.0056, wins: 50.06, gammons: 13.50, backgammons: 0.54 },
    { rank: 2, move: "13/8 6/5", equity: -0.0031, wins: 49.76, gammons: 13.74, backgammons: 0.58 },
    { rank: 3, move: "24/18", equity: -0.0321, wins: 49.30, gammons: 11.79, backgammons: 0.48 }
  ],
  "5-2": [
    { rank: 1, move: "24/22 13/8", equity: +0.0032, wins: 50.07, gammons: 13.34, backgammons: 0.58 },
    { rank: 2, move: "13/11 13/8", equity: -0.0023, wins: 49.70, gammons: 14.42, backgammons: 0.74 },
    { rank: 3, move: "13/8 6/4", equity: -0.0276, wins: 48.99, gammons: 13.35, backgammons: 0.57 }
  ],
  "5-3": [
    { rank: 1, move: "8/3 6/3", equity: +0.0638, wins: 51.73, gammons: 16.17, backgammons: 0.76 },
    { rank: 2, move: "24/21 13/8", equity: +0.0196, wins: 50.61, gammons: 13.86, backgammons: 0.71 },
    { rank: 3, move: "13/10 13/8", equity: +0.0042, wins: 49.70, gammons: 14.98, backgammons: 0.73 }
  ],
  "5-4": [
    { rank: 1, move: "24/20 13/8", equity: +0.0155, wins: 50.51, gammons: 13.62, backgammons: 0.72 },
    { rank: 2, move: "13/9 13/8", equity: +0.0145, wins: 49.99, gammons: 14.99, backgammons: 0.77 },
    { rank: 3, move: "24/15", equity: -0.0071, wins: 50.34, gammons: 11.68, backgammons: 0.52 },
    { rank: 4, move: "13/4", equity: -0.0344, wins: 48.52, gammons: 13.82, backgammons: 0.66 }
  ],
  "6-1": [
    { rank: 1, move: "13/7 8/7", equity: +0.1035, wins: 53.53, gammons: 15.16, backgammons: 0.63 }
  ],
  "6-2": [
    { rank: 1, move: "24/18 13/11", equity: +0.0066, wins: 50.68, gammons: 12.70, backgammons: 0.58 },
    { rank: 2, move: "13/5", equity: -0.0109, wins: 49.31, gammons: 14.21, backgammons: 0.67 },
    { rank: 3, move: "24/16", equity: -0.0117, wins: 50.28, gammons: 11.87, backgammons: 0.53 }
  ],
  "6-3": [
    { rank: 1, move: "24/18 13/10", equity: +0.0072, wins: 50.53, gammons: 12.99, backgammons: 0.62 },
    { rank: 2, move: "24/15", equity: -0.0071, wins: 50.34, gammons: 11.68, backgammons: 0.52 },
    { rank: 3, move: "24/21 13/7", equity: -0.0332, wins: 48.63, gammons: 13.46, backgammons: 0.62 },
    { rank: 4, move: "13/4", equity: -0.0344, wins: 48.52, gammons: 13.82, backgammons: 0.66 },
    { rank: 5, move: "13/10 13/7", equity: -0.0462, wins: 48.16, gammons: 14.05, backgammons: 0.77 }
  ],
  "6-4": [
    { rank: 1, move: "8/2 6/2", equity: +0.0102, wins: 49.81, gammons: 15.40, backgammons: 0.77 },
    { rank: 2, move: "24/18 13/9", equity: +0.0069, wins: 50.34, gammons: 13.48, backgammons: 0.61 },
    { rank: 3, move: "24/14", equity: +0.0003, wins: 50.65, gammons: 11.79, backgammons: 0.53 }
  ],
  "6-5": [
    { rank: 1, move: "24/13", equity: +0.0545, wins: 52.82, gammons: 11.64, backgammons: 0.53 },
    { rank: 2, move: "24/18 13/8", equity: +0.0158, wins: 50.99, gammons: 12.87, backgammons: 0.68 }
  ]
};

const openingPositions = {
  "2-1": '-b----E-C---eE---c-e----B-:0:0:1:21:0:0:0:0:10',
  "3-1": '-b----E-C---eE---c-e----B-:0:0:1:31:0:0:0:0:10',
  "3-2": '-b----E-C---eE---c-e----B-:0:0:1:32:0:0:0:0:10',
  "4-1": '-b----E-C---eE---c-e----B-:0:0:1:41:0:0:0:0:10',
  "4-2": '-b----E-C---eE---c-e----B-:0:0:1:42:0:0:0:0:10',
  "4-3": '-b----E-C---eE---c-e----B-:0:0:1:43:0:0:0:0:10',
  "5-1": '-b----E-C---eE---c-e----B-:0:0:1:51:0:0:0:0:10',
  "5-2": '-b----E-C---eE---c-e----B-:0:0:1:52:0:0:0:0:10',
  "5-3": '-b----E-C---eE---c-e----B-:0:0:1:53:0:0:0:0:10',
  "5-4": '-b----E-C---eE---c-e----B-:0:0:1:54:0:0:0:0:10',
  "6-1": '-b----E-C---eE---c-e----B-:0:0:1:61:0:0:0:0:10',
  "6-2": '-b----E-C---eE---c-e----B-:0:0:1:62:0:0:0:0:10',
  "6-3": '-b----E-C---eE---c-e----B-:0:0:1:63:0:0:0:0:10',
  "6-4": '-b----E-C---eE---c-e----B-:0:0:1:64:0:0:0:0:10',
  "6-5": '-b----E-C---eE---c-e----B-:0:0:1:65:0:0:0:0:10'
};

async function testAllOpenings() {
  console.log('Testing all 15 opening positions with hybrid evaluation...\n');

  const results = [];

  for (const [roll, xgid] of Object.entries(openingPositions)) {
    console.log(`Testing ${roll}...`);

    try {
      const response = await fetch('http://localhost:3000/api/backgammon-engine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          xgid,
          player: 1,
          maxTopMoves: 10,  // Include all legal moves for MC analysis
          numSimulations: 1000,  // Full MC simulation with 1000 rollouts per move
          heuristicWeight: 0.6,  // 60% heuristic
          mcWeight: 0.4,        // 40% Monte Carlo (default)
          debug: false  // Disable debug for cleaner output
        }),
      });

      if (!response.ok) {
        console.error(`API Error for ${roll}:`, response.status, response.statusText);
        continue;
      }

      const result = await response.json();

      // Get XG top move for comparison
      const xgData = openingMovesData[roll];
      const xgTopMove = xgData ? xgData[0].move : 'N/A';

      const ourTopMove = result.move?.description || 'N/A';

      // Check for move equivalence (collapsed sequences)
      const movesEquivalent = (move1, move2) => {
        if (move1 === move2) return true;

        // Normalize moves by collapsing sequences like 13/11 11/10 -> 13/10
        const normalizeMove = (move) => {
          if (!move || typeof move !== 'string') return move;

          // Handle 24/18 18/X patterns
          if (move.includes('24/18 18/')) {
            const match = move.match(/24\/18 18\/(\d+)/);
            if (match) return `24/${match[1]}`;
          }

          // Handle general A/B B/C patterns -> A/C
          const parts = move.split(' ');
          if (parts.length === 2) {
            const [move1, move2] = parts;
            const match1 = move1.match(/(\d+)\/(\d+)/);
            const match2 = move2.match(/(\d+)\/(\d+)/);
            if (match1 && match2 && match1[2] === match2[1]) {
              return `${match1[1]}/${match2[2]}`;
            }
          }

          return move;
        };

        const normalized1 = normalizeMove(move1);
        const normalized2 = normalizeMove(move2);

        return normalized1 === normalized2;
      };

      const match = movesEquivalent(ourTopMove, xgTopMove) ? '✅' : '❌';

      console.log(`  Our top move: ${ourTopMove}`);
      console.log(`  XG top move:  ${xgTopMove} ${match}`);
      console.log(`  Confidence: ${result.confidence || 'N/A'}`);
      console.log('');

      results.push({
        roll,
        ourTopMove,
        xgTopMove,
        match: movesEquivalent(ourTopMove, xgTopMove),
        confidence: result.confidence
      });

    } catch (error) {
      console.error(`Error testing ${roll}:`, error.message);
    }
  }

  // Summary
  console.log('=== SUMMARY ===');
  const matches = results.filter(r => r.match).length;
  const total = results.length;
  console.log(`Matches: ${matches}/${total} (${(matches/total*100).toFixed(1)}%)`);

  console.log('\nDetailed Results:');
  results.forEach(r => {
    const status = r.match ? '✅' : '❌';
    console.log(`${r.roll}: ${r.ourTopMove} vs ${r.xgTopMove} ${status}`);
  });
}

testAllOpenings();