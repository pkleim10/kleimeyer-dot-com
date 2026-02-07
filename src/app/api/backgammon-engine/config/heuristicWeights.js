/**
 * Heuristic evaluation weights for backgammon move analysis
 */

// Heuristic weights for move evaluation
export const HEURISTIC_WEIGHTS = {
  blots: -0.22,    // Negative for safety (matches actual calculation)
  hits: 0.24,       // Positive for aggression
  pointsMade: 0.22, // Positive for development (reduced from 0.4)
  pipGain: 0.20,    // Positive for efficiency
  homeBoard: 0.07,  // Positive for home board strength
  primeLength: 0.12, // Positive for blocking
  builderCoverage: 0.25, // Positive for outer board coverage (increased)
  stackPenalty: -0.08, // Negative penalty for excessive stacking
  opponentBlotCount: 0.08, // Positive for opponent vulnerabilities
  highRollBonus: 0.07 // Positive for high pip gain and deep runs
}

/**
 * Position evaluation weights for overall board state assessment
 */
export const POSITION_WEIGHTS = {
  pipAdvantage: 0.25,      // Race advantage
  blotSafety: 0.2,         // Penalty for vulnerability
  madePoints: 0.15,        // Control and blocking
  primeStrength: 0.12,     // Blocking potential
  homeBoardStrength: 0.1,   // Bear-off readiness
  anchorStrength: 0.08,     // Back game potential
  contactAdvantage: 0.1    // Tactical position strength
}