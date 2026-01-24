# Position Evaluation Factors

## Overview
The position evaluation system assesses the overall strategic strength of a board position for a given player, independent of any specific move. It uses a 7-factor heuristic analysis to provide comprehensive position assessment used primarily in Monte Carlo simulation evaluation.

## Factor Weights (Sum = 1.00)
- **Pip Advantage**: 0.25 (positive for race advantage)
- **Blot Safety**: 0.20 (penalty for vulnerability)
- **Made Points**: 0.15 (positive for control & blocking)
- **Prime Strength**: 0.12 (positive for blocking potential)
- **Home Board**: 0.10 (positive for bear-off readiness)
- **Anchor Strength**: 0.08 (positive for back game potential)
- **Contact Advantage**: 0.10 (positive for tactical superiority)

## Factor Details

### 1. Pip Advantage (0.25)
**Purpose**: Evaluates racing position advantage in the endgame.

**Calculation**: `((opponentPips - playerPips) / 162) * 0.25`

**Data Source**: `calculatePipCounts(boardState)`.

**Logic**:
- Compares total pip counts between players
- Positive values indicate player has fewer pips (better racing position)
- Normalized by dividing by 162 for typical game scale (150-200 pips)
- Range: ~-0.5 to +0.5 (significant race advantages)

**Example**: Player 20 pips ahead = +0.0309 score

### 2. Blot Safety (0.20)
**Purpose**: Penalizes position vulnerability from exposed checkers.

**Calculation**: `(avgBlotRisk × blotCount) × 0.20`

**Data Source**: `identifyBlots()`, `calculateBlotRisk()`.

**Logic**:
- Assesses risk of each blot being hit based on opponent blocking and player anchors
- Combines individual blot risks into average risk score
- Positive weighting creates penalty for vulnerability (higher risk = higher penalty)
- Range: 0 to ~0.4 (multiple high-risk blots)

**Example**: 3 blots with average risk 0.6 = 0.36 score (penalty)

### 3. Made Points (0.15)
**Purpose**: Rewards control and blocking strength from made points.

**Calculation**: `(madePointsCount + keyPointsBonus) × 0.15`

**Data Source**: `getMadePoints(boardState, playerOwner)`.

**Logic**:
- Counts all points owned by player with 2+ checkers
- Adds 0.5 bonus for key strategic points (White: 5-pt, 7-pt; Black: 18-pt, 20-pt)
- Higher count indicates better board control and blocking
- Range: 0 to ~3.0 (12+ made points with bonuses)

**Example**: 8 made points + 1 key point bonus = 1.35 score

### 4. Prime Strength (0.12)
**Purpose**: Rewards blocking potential from prime structures.

**Calculation**: `(primeLength ≥ 4 ? primeLength × 1.5 : primeLength) × 0.12`

**Data Source**: `checkPrimeLength(boardState, playerOwner)`.

**Logic**:
- Measures longest consecutive sequence of made points
- Applies 1.5x multiplier for primes of 4+ points (major blocking structures)
- Represents opponent containment potential
- Range: 0 to ~3.6 (7-point prime with multiplier)

**Example**: 5-point prime = 0.9 score (5 × 1.5 × 0.12)

### 5. Home Board (0.10)
**Purpose**: Rewards bear-off readiness and home board development.

**Calculation**: `((checkersInHome × 0.1) + (madePointsInHome × 0.5)) × 0.10`

**Data Source**: `countCheckersInRange()`, `getMadePoints()` for home board range.

**Logic**:
- Counts checkers already in home board (White: 1-6, Black: 19-24)
- Values made points in home board 5x more (bear-off readiness)
- Assesses endgame preparedness
- Range: 0 to ~0.7 (15 checkers + 3 made points in home)

**Example**: 8 checkers + 2 made points in home = 0.034 score

### 6. Anchor Strength (0.08)
**Purpose**: Rewards back game potential from anchors in opponent's home.

**Calculation**: `anchorCount × 0.08`

**Data Source**: Point ownership analysis in opponent home board.

**Logic**:
- Counts points in opponent's home board owned by player with 2+ checkers
- Represents back game and containment potential
- Each anchor provides strategic value for opponent restriction
- Range: 0 to ~0.64 (8 anchors in opponent home)

**Example**: 3 anchors in opponent home = 0.24 score

### 7. Contact Advantage (0.10)
**Purpose**: Rewards tactical superiority when players are in contact.

**Calculation**: `((madePointsDiff × 0.3) + (blotDiff × 0.2)) × 0.10` (when in contact)

**Data Source**: `hasContact()`, `identifyBlots()`, `getMadePoints()` for both players.

**Logic**:
- Only applies when players can hit each other (at least one blot exists)
- Compares relative made points (control) and blot counts (vulnerability)
- Positive when player has more made points and fewer blots than opponent
- Range: ~-0.3 to +0.3 (significant tactical advantages)

**Example**: +2 made points, -1 blot vs opponent = +0.062 score

## Total Score Calculation
```javascript
totalScore = pipAdvantageScore + blotSafetyScore + madePointsScore +
             primeScore + homeBoardScore + anchorScore + contactScore
```

## Position Score Interpretation

- **Positive scores**: Position advantage for the evaluated player
- **Negative scores**: Position disadvantage for the evaluated player
- **Magnitude**: Typically -2.0 to +2.0, with larger values indicating stronger advantages
- **Zero**: Neutral position (equal strength)

## Usage in Monte Carlo Evaluation

The position evaluation provides sophisticated end-game assessment for Monte Carlo simulations:

```javascript
// Compare player vs opponent position strength
const playerEval = evaluatePosition(board, playerOwner)
const opponentEval = evaluatePosition(board, opponentOwner)

// Award win points based on relative position quality
const positionDiff = playerEval.score - opponentEval.score
wins += (Math.max(-1, Math.min(1, positionDiff / 2)) + 1) / 2
```

This replaces simple pip-count comparison with comprehensive strategic analysis, providing much more accurate simulation outcomes.

## Key Characteristics

- **Strategic depth**: Evaluates 7 complementary aspects of position strength
- **Position-focused**: Independent of specific moves that led to the position
- **Monte Carlo optimized**: Provides continuous scoring for statistical sampling
- **Comprehensive coverage**: Race, safety, control, blocking, readiness, containment, tactics
- **Balanced weighting**: Factors reflect relative importance in backgammon strategy</contents>
</xai:function_call">Wrote contents to /Volumes/SSD/CursorProjects/kleimeyer-dot-com/positionFactors.md