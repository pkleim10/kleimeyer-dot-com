# Current 6-Factor Heuristic System

## Overview
The backgammon engine uses a 6-factor heuristic evaluation system to score moves. Each factor has a specific weight and represents a different strategic aspect of the game.

## Factor Weights (Sum ≈ 1.23)
- **Weighted Blot Risk**: -0.25 (negative for safety)
- **Hits**: 0.3 (positive for aggression)
- **Points Made**: 0.3 (positive for development)
- **Pip Gain**: 0.2 (positive for efficiency)
- **Home Board**: 0.1 (positive for home board strength)
- **Prime Length**: 0.15 (positive for blocking)
- **Builder Coverage**: 0.35 (positive for outer board control)

## Factor Details

### 1. Weighted Blot Risk (-0.25)
**Purpose**: Penalizes vulnerability to hits using a weighted risk assessment of blot positions.

**Calculation**: `analysis.blots.combinedWeightedRisk * -1`

**Data Source**: Advanced blot analysis with position-based risk weighting.

**Logic**:
- Uses weighted risk assessment considering blot position vulnerability
- Higher weighted risk = higher penalty (more dangerous positions)
- Range: Typically 0 to -0.25 (negative scores)

**Example**: Move creating high-risk blots = -0.25 score

### 2. Hits (0.3)
**Purpose**: Rewards aggressive hitting of opponent blots.

**Calculation**: `analysis.hits.count * 0.3`

**Data Source**: Sequential move analysis in `buildVerifiedMoveAnalysis()`.

**Logic**:
- Counts opponent single checkers hit during the move sequence
- Each hit sends opponent checker to bar
- Range: 0 to 1.2 (for multiple hits)

**Example**: Move hitting 1 blot = 0.3 score

### 3. Points Made (0.4)
**Purpose**: Rewards creating new made points (2+ checkers).

**Calculation**: `analysis.pointsMade.newlyMade.length * 0.3`

**Data Source**: `identifyPointsMade(boardState, finalState, playerOwner)`.

**Logic**:
- Compares board state before vs after move
- Counts points that change from <2 checkers to ≥2 checkers
- Range: 0 to 1.2 (for multiple new points)

**Example**: Move creating 1 new made point = 0.3 score

### 4. Pip Gain (0.2)
**Purpose**: Rewards efficiency in pip reduction (race progress).

**Calculation**: `analysis.pips.gain * 0.2`

**Data Source**: `calculatePipCounts()` before/after move.

**Logic**:
- Formula: `before_pips - after_pips` for moving player
- Measures how many pips closer to bearing off
- Range: Typically 0 to 2.0

**Example**: Move gaining 7 pips = 1.4 score

### 5. Home Board (0.1)
**Purpose**: Rewards checkers entering the home board.

**Calculation**: `homeBoardCheckers * 0.1`

**Data Source**: `countCheckersInRange(analysis.finalState, playerOwner, homeBoardStart, homeBoardEnd)`.

**Logic**:
- Counts ALL checkers in home board after move
- White: points 1-6, Black: points 19-24
- Range: 0 to 1.5 (15 checkers max)

**Example**: 6 checkers in home board = 0.6 score

### 6. Prime Length (0.15)
**Purpose**: Rewards creating blocking primes.

**Calculation**: `primeLength * 0.15`

**Data Source**: `checkPrimeLength(analysis.finalState, playerOwner)`.

**Logic**:
- Longest consecutive sequence of made points (≥2 checkers each)
- Measures blocking potential against opponent
- Range: 0 to 3.75 (24-point prime)

**Example**: 2-point prime = 0.3 score

### 7. Builder Coverage (0.35)
**Purpose**: Rewards strategic positioning on outer board points with differentiated values.

**Calculation**: `calculateBuilderCoverage(finalState, playerOwner) * 0.35`

**Data Source**: `calculateBuilderCoverage(analysis.finalState, playerOwner)`.

**Logic**:
- **Points 9-11**: +1.0 for single checker, +0.5 for multiple checkers
- **Point 8**: +0.5 for single checker only, 0 for multiple checkers
- Rewards vulnerable (single) checkers more than safe stacks
- Differentiates between prime outer points (9-11) and strategic point 8
- Range: 0 to ~3.5 (optimal single checkers on all 4 points)

**Example**: Single checkers on points 8,9,10,11 = 0.5 + 1.0 + 1.0 + 1.0 = 3.5 bonus → 1.225 score

### 8. Stack Penalty (-0.08)
**Purpose**: Penalizes excessive stacking of checkers on single points.

**Calculation**: `getMaxStackSize(finalState, playerOwner) > 3 ? -(maxStack - 3) * 0.04 * -0.08 : 0`

**Data Source**: `getMaxStackSize(analysis.finalState, playerOwner)`.

**Logic**:
- Finds the maximum number of checkers on any single point owned by player
- Penalty starts at 4+ checkers per point (-0.04 per additional checker beyond 3)
- Weighted by -0.08 to discourage over-concentration of pieces
- Range: 0 to -0.16 (8+ checkers on one point)

**Example**: 5 checkers on one point = -0.0032 score

### 9. Opponent Blot Count (0.08)
**Purpose**: Rewards opponent checkers positioned as blots (single checkers on points).

**Calculation**: `countOpponentBlots(finalState, playerOwner) * 0.08`

**Data Source**: `countOpponentBlots(analysis.finalState, playerOwner)`.

**Logic**:
- Counts opponent checkers that are alone on their points (vulnerable to hits)
- Each opponent blot provides 0.08 bonus as a hitting opportunity
- Encourages aggressive play when opponent has vulnerabilities
- Range: 0 to ~0.64 (8+ opponent blots)

**Example**: 3 opponent blots = 0.24 score

## Total Score Calculation
```javascript
totalScore = blotsScore + hitsScore + pointsMadeScore + pipGainScore + homeBoardScore + primeScore + builderCoverageScore + stackPenaltyScore + opponentBlotScore
```

## Example: "13/6" Opening Move (6-1 dice)
- **Points Made**: 0 × 0.3 = 0.0
- **Pip Gain**: 7 × 0.2 = 1.4
- **Home Board**: 6 × 0.1 = 0.6
- **Prime Length**: 1 × 0.15 = 0.15
- **Builder Coverage**: 0 × 0.04 × 0.10 = 0.0
- **Stack Penalty**: max(2) → 0 × -0.08 = 0.0
- **Opponent Blot Count**: 0 × 0.08 = 0.0
- **Weighted Blot Risk**: 0 × -0.25 = 0.0
- **Hits**: 0 × 0.3 = 0.0
- **TOTAL**: 2.15

## Key Characteristics
- **Simple but effective**: Focuses on core backgammon principles
- **Move-based evaluation**: Factors reflect immediate move impact
- **Strategic balance**: Weights reflect relative importance
- **Normalized scale**: Scores are comparable across different positions