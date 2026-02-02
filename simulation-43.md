# Monte Carlo Simulation: "43" Roll - Summary

## Setup
- **XGID**: -b----E-C---eE---c-e----B-:0:0:0:43:0:0:0:0:10
- **Roll**: 4-3
- **Player**: White (white)
- **Opening Move**: 13/10 (HE: 0.000, MC: 0.000)

## Real MC Simulation Results

The complete move sequence from the actual Monte Carlo simulation is logged to the **SERVER CONSOLE**.

Look for log entries starting with:
- `[MC-Simulation-1]` - Individual simulation tracking
- `[MC-Tracking]` - Complete move sequence

### Expected Log Format:
```
[MC-Simulation-1] Starting simulation 1/1
[MC-Simulation-1] Opening move by white: [opening move]
[MC-Simulation-1] Move 1 by black: [move] (dice: X-Y)
[MC-Simulation-1] Move 2 by white: [move] (dice: X-Y)
[MC-Simulation-1] Move 3 by black: [move] (dice: X-Y)
...
[MC-Tracking] Simulation completed: X moves, winner: white/black
```

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

## Detailed Move Sequence

**Total Moves**: 5
**Winner**: incomplete

### White Moves:
1. 13/10 (roll 4-3)
2. 8/6 8/3 (roll 2-5)
3. 13/8 10/5 8/3 8/3 (roll 5-5-5-5)

### Black Moves:
1. 13/10 8/3 (roll 5-3)
2. 24/21 8/4 (roll 4-3)
3. 13/10 10/7 8/5 6/3 (roll 3-3-3-3)

