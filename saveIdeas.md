Solution Needed:
Add a new HE factor that:
Rewards checker distribution across strategic points
Penalizes over-stacking on single points
Values flexibility over rigid positioning
Weights: Maybe 0.15-0.20 in HEURISTIC_WEIGHTS
This is exactly the kind of strategic insight that XG has but current HE lacks! 🎯
Want me to implement a "Positional Balance" factor for the HE system? 🤔

GROK ideal weights
const IDEAL_HE_WEIGHTS = {
  blots: -0.20,             // Slight reduction (less safety dominance)
  hits: 0.25,               // Unchanged (good aggression)
  pointsMade: 0.22,         // Reduction (less inner slot bias)
  pipGain: 0.23,            // Increase (reward deep runs)
  homeBoard: 0.07,          // Reduction (less home bias)
  primeLength: 0.12,        // Unchanged (good)
  builderCoverage: 0.27,    // Slight reduction (balance inner/outer)
  stackPenalty: -0.09,      // Slight increase (more clustering penalty)
  opponentBlotCount: 0.07,  // Unchanged (good)
  highRollBonus: 0.07       // Slight increase (high-roll fix)
};. 
