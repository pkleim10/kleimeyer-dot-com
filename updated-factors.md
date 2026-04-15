# Backgammon Heuristic Analysis Factors

Complete documentation of all evaluation factors used in the backgammon engine's move analysis system.

---

## Table of Contents

1. [Offensive Factors](#offensive-factors)
2. [Defensive Factors](#defensive-factors)
3. [Strategic Factors](#strategic-factors)
4. [Tactical Factors](#tactical-factors)
5. [Penalty Factors](#penalty-factors)
6. [Weight Summary](#weight-summary)

---

## Offensive Factors

### 1. Hits (Weight: 0.24)

**Purpose**: Rewards aggressive play by hitting opponent blots.

**Calculation**:
- Raw value: Count of opponent checkers hit during the move sequence
- Score: `hits.count × 0.24`

**Details**:
- Tracks hits sequentially through the entire move combination
- Each hit sends opponent checker to the bar
- Forces opponent to re-enter from bar, losing tempo

**Example**:
- Hit 1 opponent blot: Score = +0.24
- Hit 2 opponent blots: Score = +0.48

**Strategic Value**: Hitting is crucial for disrupting opponent's position, gaining tempo, and creating tactical advantages.

---

### 2. Opponent Blot Count (Weight: 0.08)

**Purpose**: Rewards creating situations where opponent has vulnerable blots (targets for future hits).

**Calculation**:
- Raw value: Count of opponent blots (single checkers) after the move
- Score: `opponentBlotCount × 0.08`

**Details**:
- Counts opponent's single unprotected checkers
- Indicates future hitting opportunities
- Complements the "hits" factor by valuing potential future attacks

**Example**:
- Opponent has 3 blots exposed: Score = +0.24

**Strategic Value**: Creating threats forces opponent into defensive play and provides tactical flexibility.

---

## Defensive Factors

### 3. Blots (Weight: -0.22)

**Purpose**: Penalizes leaving your own checkers exposed to opponent attacks.

**Calculation**:
- Uses **context-aware blot risk** calculation
- Considers: hit probability, hit impact, and blot context
- Score: `combinedWeightedRisk × -0.25`

**Context Modifiers**:
- **Escaping blots** (opponent's home edge): -30% penalty (0.7× modifier)
  - Points 19-23 for White, 2-6 for Black
- **Builder blots** (strategic slots): -20% penalty (0.8× modifier)
  - Points 9-11 for White, 14-16 for Black
- **Home board blots**: +30% penalty (1.3× modifier)
  - Points 1-6 for White, 19-24 for Black
- **Midfield blots**: Standard penalty (1.0× modifier)

**Risk Calculation**:
1. Calculate hit probability from all opponent positions
2. Calculate hit impact based on zone:
   - Home board: 1.0 - 0.9 impact (highest)
   - Outer board: 0.8 - 0.5 impact
   - Opponent outer: 0.5 - 0.2 impact
   - Opponent home: 0.2 - 0.1 impact (lowest)
3. Weighted risk = probability × impact × context modifier
4. Combine multiple blot risks: `1 - (1 - risk1) × (1 - risk2) × ...`

**Risk Levels**:
- LOW: weighted risk < 0.2
- MEDIUM: weighted risk 0.2 - 0.4
- HIGH: weighted risk ≥ 0.4

**Example**:
- Builder blot on 11-point with 40% hit chance:
  - Base weighted risk: 0.40 × 0.8 (outer board impact) = 0.32
  - Context modifier: 0.8 (builder bonus)
  - Final weighted risk: 0.32 × 0.8 = 0.256
  - Score: 0.256 × -0.25 = **-0.064**

**Strategic Value**: Intelligent risk assessment allows for strategic exposure (builders, escaping) while heavily penalizing dangerous blots.

---

### 4. Anchor Value (Weight: 0.18)

**Purpose**: Rewards establishing defensive anchors (2+ checkers) in opponent's home board.

**Calculation**:
- Anchors must have 2+ checkers on a point in opponent's home board
- Point values by depth (deeper = more valuable):

| Point | White Anchor | Black Anchor | Value |
|-------|--------------|--------------|-------|
| 24-pt | ✓ | | 0.8 |
| 23-pt | ✓ | | 0.7 |
| 22-pt | ✓ | | 0.6 |
| 21-pt | ✓ | | 0.5 |
| 20-pt | ✓ | | 0.4 |
| 1-pt | | ✓ | 0.8 |
| 2-pt | | ✓ | 0.7 |
| 3-pt | | ✓ | 0.6 |
| 4-pt | | ✓ | 0.5 |
| 5-pt | | ✓ | 0.4 |

- Strong anchor bonus: +0.2 for anchors with 3+ checkers
- Score: `anchorValue × 0.18`

**Details**:
- Anchors provide safe landing spots for escaping checkers
- Create opportunities to hit opponent blots
- Essential for back game strategies
- Deeper anchors (24-pt, 1-pt) more valuable than forward anchors

**Example**:
- White with 2 checkers on 24-point: Score = 0.8 × 0.18 = **+0.144**
- White with 3 checkers on 23-point: Score = (0.7 + 0.2) × 0.18 = **+0.162**

**Strategic Value**: Anchors are fundamental to defensive strategy, providing security and tactical options.

---

## Strategic Factors

### 5. Points Made (Weight: 0.22)

**Purpose**: Rewards making points (2+ checkers on a point), with bonuses for high-value points.

**Calculation**:
- Base value: Count of newly made points
- Quality bonuses per point:
  - **Golden points** (4-pt, 5-pt for White; 20-pt, 21-pt for Black): +1.0
  - **Bar points** (7-pt, 3-pt for White; 18-pt, 22-pt for Black): +0.25
  - **Other points**: +0.1
- Raw score: `newlyMadeCount + sumOfQualityBonuses`
- Final score: `rawScore × 0.22`

**Point Quality Hierarchy**:
1. **5-point** (White) / **20-point** (Black): Most valuable, controls opponent's home entry
2. **4-point** (White) / **21-point** (Black): Second golden point
3. **7-point** (White) / **18-point** (Black): Bar point, strong defensive position
4. **3-point** (White) / **22-point** (Black): Home board control
5. Other points: Strategic value based on game phase

**Example**:
- Make 5-point: Score = (1 + 1.0) × 0.22 = **+0.44**
- Make 7-point: Score = (1 + 0.25) × 0.22 = **+0.275**
- Make 11-point: Score = (1 + 0.1) × 0.22 = **+0.242**

**Strategic Value**: Point ownership controls the board, blocks opponent movement, and creates safe havens.

---

### 6. Builder Coverage (Weight: 0.25)

**Purpose**: Rewards strategic outer board positioning that enables future point-making.

**Calculation**:
- Evaluates points 8-11 for White (outer board builder zone)
- Scoring per point:
  - **Points 9-11**: +1.0 for single checker (ideal builder), +0.5 for multiple checkers
  - **Point 8**: +0.5 for single checker only, 0 for multiple checkers
- Score: `builderBonus × 0.25`

**Details**:
- Single checkers on 9-11 are optimal builders (can make multiple key points)
- Multiple checkers on same point are less flexible
- Point 8 is a secondary builder position
- Maximum theoretical bonus: 3.5 (singles on 8,9,10,11)

**Example**:
- Single checkers on 9, 10, 11: Score = 3.0 × 0.25 = **+0.75**
- 2 checkers on 9, single on 10: Score = (0.5 + 1.0) × 0.25 = **+0.375**

**Strategic Value**: Proper builder placement is essential for making key points (4-pt, 5-pt, 7-pt) on future rolls.

---

### 7. Escape Progress (Weight: 0.30)

**Purpose**: Rewards advancing back checkers out of opponent's home board.

**Calculation**:
- Opponent home board zones:
  - White back checkers: points 19-24 (Black's home)
  - Black back checkers: points 1-6 (White's home)
- Scoring components:
  1. **Full escape**: +1.0 per checker fully escaped from opponent's home
  2. **Partial escape**: +0.5 per checker moved off deepest point (24-pt/1-pt)
  3. **Trapped penalty**: -0.15 per checker beyond 2 trapped in opponent's home
- Final score: `escapeProgress × 0.30`

**Details**:
- Full escape = moving checker from opponent's home (19-24 or 1-6) to outer board
- Partial escape = advancing from 24-pt to 23-pt (still trapped, but progress)
- Penalty applies when >2 checkers remain trapped

**Example**:
- Move 1 checker from 24 to 18 (full escape): Score = 1.0 × 0.30 = **+0.30**
- Move 1 checker from 24 to 23 (partial): Score = 0.5 × 0.30 = **+0.15**
- Leave 4 checkers in opponent's home: Penalty = -0.15 × 2 × 0.30 = **-0.09**

**Strategic Value**: Highest weighted factor. Escaping back checkers is critical in opening and early middle game.

---

### 8. Prime Length (Weight: 0.12)

**Purpose**: Rewards building consecutive made points (primes) to block opponent movement.

**Calculation**:
- Counts longest sequence of consecutive made points (2+ checkers)
- Score: `primeLength × 0.12`

**Details**:
- Checks all 24 points for consecutive ownership
- A 6-point prime is maximum and creates a complete blockade
- Even short primes (3-4 points) provide significant blocking value

**Prime Values**:
- 6-prime: 0.72 (complete blockade)
- 5-prime: 0.60 (very strong)
- 4-prime: 0.48 (strong blocking)
- 3-prime: 0.36 (moderate blocking)
- 2-prime: 0.24 (basic blocking)

**Example**:
- Build 4-point prime: Score = 4 × 0.12 = **+0.48**
- Achieve 6-prime: Score = 6 × 0.12 = **+0.72**

**Strategic Value**: Primes trap opponent checkers, control the board, and create attacking/blocking positions.

---

### 9. Connectivity (Weight: 0.10)

**Purpose**: Rewards checkers positioned to cooperate (within 6 pips of each other).

**Calculation**:
- Scans all player-owned points
- For each pair of points within 6 pips distance:
  - Base bonus: +0.3
  - Extra bonus: +0.2 if both are single checkers (builders)
- Maximum capped at 2.0 to prevent over-weighting
- Score: `connectivity × 0.10`

**Details**:
- Checkers within 6 pips can combine to make a point on next roll
- Single checkers are more flexible than stacks
- Measures point-making potential

**Example**:
- Checkers on 6 and 8 (2 pips apart, both singles): Score = (0.3 + 0.2) × 0.10 = **+0.05**
- Checkers on 9, 10, 11, 13 (multiple pairs): Score = min(multiple bonuses, 2.0) × 0.10

**Strategic Value**: Connected checkers create tactical flexibility and point-making opportunities.

---

### 10. Pip Gain (Weight: 0.20)

**Purpose**: Rewards race efficiency by moving checkers forward.

**Calculation**:
- Pip count = sum of (checker position × number of checkers at that position)
- Pip gain = before pip count - after pip count
- Score: `pipGain × 0.20`

**Details**:
- Fundamental racing metric
- All legal moves for a given dice roll have equal pip gain
- Differentiates when combined with other factors
- Important in race situations (no contact)

**Example**:
- Roll 6-3, move 24/18 13/10: Pip gain = 6 + 3 = 9
- Score = 9 × 0.20 = **+1.80**

**Strategic Value**: Essential for bearoff races and maintaining race advantage.

---

## Tactical Factors

### 11. Home Board Strength (Weight: 0.07)

**Purpose**: Rewards bringing checkers into home board for bearoff preparation.

**Calculation**:
- Home board zones:
  - White: points 1-6
  - Black: points 19-24
- Counts total checkers in home board after move
- Score: `homeBoardCheckers × 0.07`

**Details**:
- More home board checkers = faster bearoff
- Important in late middle game and bearoff phase
- Complements pip gain for race positions

**Example**:
- 8 checkers in home board: Score = 8 × 0.07 = **+0.56**
- 12 checkers in home board: Score = 12 × 0.07 = **+0.84**

**Strategic Value**: Home board accumulation prepares for efficient bearoff.

---

### 12. High Roll Bonus (Weight: 0.07)

**Purpose**: Rewards efficient use of high dice rolls and deep runs.

**Calculation**:
- Two components:
  1. **High pip gain**: +0.02 per pip beyond 5
     - Formula: `(pipGain - 5) × 0.02` if pipGain ≥ 6
  2. **Deep run bonus**: +0.03 for moves from 24-pt with 8+ pips
     - Applies to moves like 24/18, 24/16
- Raw bonus = component 1 + component 2
- Score: `highRollBonus × 0.07`

**Details**:
- Rewards maximizing distance on big rolls
- Deep runs establish advanced positions
- Encourages bold play when dice favor it

**Example**:
- Roll 6-5, move 24/18 18/13: 
  - Pip gain = 11, bonus = (11-5) × 0.02 + 0.03 = 0.15
  - Score = 0.15 × 0.07 = **+0.0105**

**Strategic Value**: Ensures high rolls are used for maximum strategic advantage.

---

## Penalty Factors

### 13. Stack Penalty (Weight: -0.08)

**Purpose**: Penalizes excessive stacking of checkers on single points (inefficiency).

**Calculation**:
- Finds maximum checker count on any single point
- Penalty threshold: 4+ checkers
- Raw penalty: `-(maxStack - 3) × 0.04` if maxStack > 3
- Score: `stackPenalty × -0.08`

**Details**:
- Stacking wastes checker efficiency
- Reduces tactical flexibility
- Common problem on starting points (13-pt, 8-pt, 6-pt)

**Stack Size Penalties**:
- 4 checkers: -0.04 × -0.08 = **-0.0032**
- 5 checkers: -0.08 × -0.08 = **-0.0064**
- 6 checkers: -0.12 × -0.08 = **-0.0096**

**Example**:
- 5 checkers on 13-point: Score = -(5-3) × 0.04 × -0.08 = **-0.0064**

**Strategic Value**: Encourages distributing checkers for maximum flexibility and point-making potential.

---

## Weight Summary

### Complete Weight Distribution

| Factor | Weight | Type | Phase Priority |
|--------|--------|------|----------------|
| **Escape Progress** | 0.30 | Strategic | Opening/Early |
| **Builder Coverage** | 0.25 | Strategic | Opening/Middle |
| **Hits** | 0.24 | Offensive | All |
| **Blots** | -0.22 | Defensive | All |
| **Points Made** | 0.22 | Strategic | All |
| **Pip Gain** | 0.20 | Tactical | Race/Bearoff |
| **Anchor Value** | 0.18 | Defensive | Opening/Middle |
| **Prime Length** | 0.12 | Strategic | Middle |
| **Connectivity** | 0.10 | Strategic | Opening/Middle |
| **Opponent Blots** | 0.08 | Offensive | All |
| **Stack Penalty** | -0.08 | Penalty | All |
| **Home Board** | 0.07 | Tactical | Middle/Bearoff |
| **High Roll Bonus** | 0.07 | Tactical | Opening/Middle |

### Total Positive Weight: ~1.83
### Total Negative Weight: ~-0.30
### Net Weight Budget: ~1.53

---

## Game Phase Considerations

### Opening (Moves 1-5)
**Priorities**:
1. Escape Progress (0.30) - Get back checkers moving
2. Builder Coverage (0.25) - Position for key points
3. Points Made (0.22) - Make golden points (4,5) and bar point (7)

**Key Factors**: Escape, builders, anchor establishment

### Middle Game (Moves 6-20)
**Priorities**:
1. Hits (0.24) - Attack opponent position
2. Points Made (0.22) - Continue board development
3. Blots (-0.22) - Avoid catastrophic exposure

**Key Factors**: Balance attack/defense, prime building, anchor maintenance

### Late Game/Race (Moves 20+)
**Priorities**:
1. Pip Gain (0.20) - Maximize race efficiency
2. Home Board (0.07) - Prepare for bearoff
3. Blots (-0.22) - Minimize contact in race

**Key Factors**: Pip efficiency, home board accumulation, clean bearoff

### Bearoff
**Priorities**:
1. Pip Gain (0.20) - Remove checkers efficiently
2. Home Board (0.07) - Optimal checker distribution
3. Stack Penalty (-0.08) - Avoid wastage

**Key Factors**: Bearoff efficiency, checker distribution

---

## Factor Interactions

### Synergistic Combinations

1. **Escape + Anchor**: Escaping checkers while maintaining anchor provides safety
2. **Builders + Points Made**: Good builders enable future point-making
3. **Connectivity + Builders**: Connected builders create flexible point-making potential
4. **Prime + Anchor**: Strong prime with back anchor creates powerful attacking position
5. **Hits + Points Made**: Hitting while making points combines offense and development

### Antagonistic Trade-offs

1. **Escape vs. Anchor**: Escaping checkers may abandon anchor
2. **Points Made vs. Builder Coverage**: Making points consumes builders
3. **Hits vs. Blots**: Hitting may require exposing own blots
4. **Pip Gain vs. Builder Coverage**: Moving forward may abandon builder positions
5. **Prime Building vs. Home Board**: Resources divided between blocking and bearoff

---

## Implementation Notes

### Calculation Order
1. Apply moves to create final board state
2. Calculate all final-state factors (blots, points, anchors, etc.)
3. Calculate sequential factors (hits, escape progress)
4. Compute weighted scores for all factors
5. Sum to get final heuristic score

### Normalization
- All factors are calculated on the **final board state** (except hits and escape progress)
- Ensures consistent evaluation regardless of move order
- Prevents move-ordering artifacts in scoring

### Context Awareness
- **Blot risk** uses context modifiers (escaping, builder, home)
- **Points made** uses quality bonuses (golden, bar, other)
- **High roll bonus** considers move description for deep runs

### Performance
- All factors computed in O(n) or O(n²) time where n = 24 (board points)
- No exponential or factorial complexity
- Efficient enough for real-time analysis of 20-100 candidate moves

---

## Testing & Validation

### Opening Roll Performance
- Tested against 15 valid opening rolls (non-doubles)
- **40.0% perfect accuracy** (6/15 ranked #1)
- **66.7% top-3 accuracy** (10/15 in top 3)

### Perfect Rankings
- 31: `8/5 6/5` (makes 5-point)
- 41: `24/23 13/9` (split + slot)
- 53: `8/3 6/3` (makes 3-point)
- 61: `13/7 8/7` (makes bar-point)
- 63: `24/18 13/10` (deep anchor + slot)
- 64: `24/18 13/9` (deep anchor + slot)

---

## Version History

- **v1.41.0** (Feb 5, 2026): Added escape progress, anchor value, connectivity factors
- **v1.40.0** (Feb 4, 2026): Skill level presets, time-based budgeting
- **v1.39.0**: Refined blot risk with context awareness
- **v1.38.0**: Enhanced points made with quality bonuses
- **v1.37.0**: Initial factor system with 10 base factors

---

**Last Updated**: February 5, 2026  
**Current Version**: 1.41.0  
**Total Factors**: 13 (10 positive, 3 negative/penalty)
