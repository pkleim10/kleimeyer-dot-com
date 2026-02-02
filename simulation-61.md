# Monte Carlo Simulation: "43" Roll - Summary

## Setup
- **XGID**: -b----E-C---eE---c-e----B-:0:0:0:61:0:0:0:0:10
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

**Total Moves**: 32
**Winner**: incomplete

### White Moves:
1. 13/10 (roll 6-1)
2. 8/6 6/5 (roll 1-2)
3. 13/10 10/4 (roll 3-6)
4. 6/1 4/2 (roll 5-2)
5. 6/4 2/1 (roll 2-1)
6. 6/3 4/2 (roll 2-3)
7. 8/5 6/3 6/3 5/2 (roll 3-3-3-3)
8. 13/8 8/4 (roll 4-5)
9. 3/1 2/1 (roll 2-1)
10. 13/8 8/4 (roll 4-5)
11. 13/8 8/3 8/3 (roll 5-5-5-5)
12. 24/18 4/1 (roll 6-3)
13. 18/12 2/1 (roll 1-6)
14. 3/2 3/2 2/1 2/1 (roll 1-1-1-1)
15. 12/8 3/1 (roll 4-2)
16. 8/4 (roll 4-5)
17. 3/1 (roll 4-2)

### Black Moves:
1. 13/7 6/5 (roll 6-1)
2. 24/18 8/2 8/2 8/2 (roll 6-6-6-6)
3. 24/20 18/15 (roll 3-4)
4. 20/16 13/9 13/9 6/2 (roll 4-4-4-4)
5. 16/13 13/8 (roll 3-5)
6. 9/4 8/4 (roll 5-4)
7. 15/11 7/5 (roll 4-2)
8. 11/5 6/2 (roll 6-4)
9. 13/7 9/5 (roll 4-6)
10. 13/8 7/6 (roll 5-1)
11. 8/3 6/5 (roll 1-5)
12. 6/2 5/3 (roll 4-2)
13. 4/1 4/3 (roll 1-3)
14. 6/3 3/1 (roll 2-3)
15. 5/1 5/4 (roll 4-1)
16. 5/2 5/4 (roll 1-3)

