/**
 * Backgammon Engine API Route
 * Provides server-side hybrid heuristic + Monte Carlo engine for move analysis
 */

import { getLegalMoves } from './getLegalMoves'
import { formatMove, rebuildDescription, sortMoves } from '../../../utils/moveFormatter'
import { hasPlayerWon } from '../../other-fun-stuff/backgammon-resources/opening-moves/utils/gameLogic.js'

// Heuristic weights for move evaluation
const HEURISTIC_WEIGHTS = {
  blots: -0.25,    // Negative for safety (matches actual calculation)
  hits: 0.3,       // Positive for aggression
  pointsMade: 0.3, // Positive for development (reduced from 0.4)
  pipGain: 0.2,    // Positive for efficiency
  homeBoard: 0.1,  // Positive for home board strength
  primeLength: 0.15, // Positive for blocking
  builderCoverage: 0.35, // Positive for outer board coverage (increased)
  stackPenalty: -0.08, // Negative penalty for excessive stacking
  opponentBlotCount: 0.08 // Positive for opponent vulnerabilities
}

/**
 * Evaluate move using heuristic scoring
 */
function evaluateMoveHeuristically(boardState, move, playerOwner) {
  const analysis = buildVerifiedMoveAnalysis(boardState, move, playerOwner)

  const blotsScore = analysis.blots.combinedWeightedRisk * -0.25
  const hitsScore = analysis.hits.count * HEURISTIC_WEIGHTS.hits
  const pointsMadeScore = analysis.pointsMade.newlyMade.length * HEURISTIC_WEIGHTS.pointsMade
  const pipGainScore = analysis.pips.gain * HEURISTIC_WEIGHTS.pipGain

  // Simple home board strength: count checkers in home board AFTER move
  const homeBoardStart = playerOwner === 'white' ? 1 : 19
  const homeBoardEnd = playerOwner === 'white' ? 6 : 24
  const homeBoardCheckers = countCheckersInRange(analysis.finalState, playerOwner, homeBoardStart, homeBoardEnd)
  const homeBoardScore = homeBoardCheckers * HEURISTIC_WEIGHTS.homeBoard

  // Simple prime potential: check for 6-point prime AFTER move
  const primeLength = checkPrimeLength(analysis.finalState, playerOwner)
  const primeScore = primeLength * HEURISTIC_WEIGHTS.primeLength

  // Builder coverage bonus: strategic outer board positioning
  const builderBonus = calculateBuilderCoverage(analysis.finalState, playerOwner)
  const builderCoverageScore = HEURISTIC_WEIGHTS.builderCoverage * builderBonus

  // Stack penalty: penalizes excessive stacking (4+ checkers on one point)
  const maxStack = getMaxStackSize(analysis.finalState, playerOwner)
  const stackRaw = maxStack > 3 ? -(maxStack - 3) * 0.04 : 0  // penalty starts at 4+
  const stackPenaltyScore = HEURISTIC_WEIGHTS.stackPenalty * stackRaw

  // Opponent blot count: rewards opponent vulnerabilities for hitting
  const opponentBlots = countOpponentBlots(analysis.finalState, playerOwner)
  const opponentBlotScore = opponentBlots * HEURISTIC_WEIGHTS.opponentBlotCount

  const totalScore = blotsScore + hitsScore + pointsMadeScore + pipGainScore + homeBoardScore + primeScore + builderCoverageScore + stackPenaltyScore + opponentBlotScore

  return {
    score: totalScore,
    breakdown: {
      blots: { count: analysis.blots.count, score: blotsScore },
      hits: { count: analysis.hits.count, score: hitsScore },
      pointsMade: { count: analysis.pointsMade.newlyMade.length, score: pointsMadeScore },
      pipGain: { value: analysis.pips.gain, score: pipGainScore },
      homeBoard: { checkers: homeBoardCheckers, score: homeBoardScore },
      primeLength: { value: primeLength, score: primeScore },
      builderCoverage: { bonus: builderBonus, score: builderCoverageScore },
      stackPenalty: { maxStack, rawPenalty: stackRaw, score: stackPenaltyScore },
      opponentBlotCount: { count: opponentBlots, score: opponentBlotScore }
    }
  }
}

/**
 * Convert board state to array format for fast move generation
 * Array format: [player_checkers, opponent_checkers] for indices 0-25
 * Index 0: white bar, Index 25: black bar, Indices 1-24: points 1-24
 */
function boardToArray(boardState, playerOwner) {
  const board = new Array(26).fill(null).map(() => [0, 0])

  // Bars
  board[0][0] = boardState.whiteBar  // White checkers on white bar
  board[25][1] = boardState.blackBar // Black checkers on black bar

  // Points 1-24
  for (let point = 1; point <= 24; point++) {
    const pointData = boardState.points[point - 1]
    const arrayIndex = point

    if (pointData.owner === 'white') {
      board[arrayIndex][0] = pointData.count  // Player checkers (white)
    } else if (pointData.owner === 'black') {
      board[arrayIndex][1] = pointData.count  // Opponent checkers (black)
    }
    // Empty points remain [0, 0]
  }

  return board
}

/**
 * Check if a move is valid in array format
 */
function isValidMove(board, fromPoint, dieValue, playerIndex) {
  // Must have at least one checker on the point
  if (board[fromPoint][playerIndex] === 0) return false

  // Calculate target point based on player direction
  let toPoint
  if (playerIndex === 0) { // White player - moves toward lower numbers
    toPoint = fromPoint - dieValue
  } else { // Black player - moves toward higher numbers
    toPoint = fromPoint + dieValue
  }

  // Can't move beyond the board boundaries (no bearing off in simplified version)
  if (toPoint < 1 || toPoint > 24) return false

  // Cannot land on points with 2+ opponent checkers (made point)
  const targetOpponent = board[toPoint][1 - playerIndex]
  return targetOpponent < 2  // Can hit single checker, cannot land on made point
}

/**
 * Apply a move to the board array
 */
function applyMove(board, fromPoint, toPoint, playerIndex) {
  // Remove checker from source
  board[fromPoint][playerIndex]--

  // Add checker to target
  board[toPoint][playerIndex]++

  // Handle hits - remove single opponent checker
  const opponentIndex = 1 - playerIndex
  if (board[toPoint][opponentIndex] === 1) {
    board[toPoint][opponentIndex] = 0
    // In full backgammon, hit checkers go to bar, but simplified for Monte Carlo
  }
}

/**
 * Generate a single random legal move using fast array-based algorithm
 */
function getRandomLegalMove(boardState, turnState) {
  const playerOwner = turnState.currentPlayer
  const playerIndex = playerOwner === 'white' ? 0 : 1

  // Convert to array representation
  const board = boardToArray(boardState, playerOwner)

  // Handle doubles by expanding dice
  const expandedDice = []
  const diceCounts = {}
  for (const die of turnState.dice) {
    diceCounts[die] = (diceCounts[die] || 0) + 1
  }

  for (const [dieValue, count] of Object.entries(diceCounts)) {
    const numDice = count
    // If we have 2 of the same value, it's a double - use 4 dice
    const diceToAdd = numDice === 2 ? 4 : numDice
    for (let i = 0; i < diceToAdd; i++) {
      expandedDice.push(parseInt(dieValue))
    }
  }

  // Apply moves for each die
  const moves = []
  for (const dieValue of expandedDice) {
    let moveFound = false
    let attempts = 0

    while (!moveFound && attempts < 20) { // Prevent infinite loops
      // Pick random point and increment for adjacent checking
      const point = Math.floor(Math.random() * 26)
      const inc = Math.floor(Math.random() * 2)

      // Calculate target based on player direction
      let toPoint
      if (playerIndex === 0) { // White
        toPoint = point - dieValue
      } else { // Black
        toPoint = point + dieValue
      }

      // Try primary point
      if (point >= 0 && point <= 25 && isValidMove(board, point, dieValue, playerIndex)) {
        applyMove(board, point, toPoint, playerIndex)
        moves.push({ from: point, to: toPoint, die: dieValue })
        moveFound = true
        break
      }

      // Try adjacent points
      const altPoints = []
      if (inc === 0 && point > 0) altPoints.push(point - 1)
      if (inc === 1 && point < 25) altPoints.push(point + 1)

      for (const altPoint of altPoints) {
        let altToPoint
        if (playerIndex === 0) { // White
          altToPoint = altPoint - dieValue
        } else { // Black
          altToPoint = altPoint + dieValue
        }

        if (isValidMove(board, altPoint, dieValue, playerIndex)) {
          applyMove(board, altPoint, altToPoint, playerIndex)
          moves.push({ from: altPoint, to: altToPoint, die: dieValue })
          moveFound = true
          break
        }
      }

      attempts++
    }

    if (!moveFound) {
      // Fallback: systematic search if random fails
      for (let point = 0; point < 26 && !moveFound; point++) {
        let toPoint
        if (playerIndex === 0) { // White
          toPoint = point - dieValue
        } else { // Black
          toPoint = point + dieValue
        }

        if (isValidMove(board, point, dieValue, playerIndex)) {
          applyMove(board, point, toPoint, playerIndex)
          moves.push({ from: point, to: toPoint, die: dieValue })
          moveFound = true
        }
      }
    }
  }

  // Return a single move object compatible with existing code
  // For simplicity, return the first move (since Monte Carlo just needs one valid move)
  if (moves.length > 0) {
    const move = moves[0]
    return {
      moves: [move], // Wrap in moves array for compatibility
      description: `${move.from}/${move.to}`,
      totalPips: move.die
    }
  }

  // No moves found (shouldn't happen in valid positions)
  return null
}

/**
 * Run Monte Carlo simulations for move evaluation
 */
function runMonteCarlo(boardState, moveCombination, playerOwner, numSimulations = 20) {
  const opponentOwner = playerOwner === 'white' ? 'black' : 'white'
  let wins = 0

  for (let i = 0; i < numSimulations; i++) {
    // Apply the move combination to get new board state
    let currentBoard = cloneBoardState(boardState)
    const moves = moveCombination.moves || [moveCombination]
    for (const move of moves) {
      currentBoard = applyMoveToBoardForAnalysis(currentBoard, move, playerOwner)
    }

    // Simulate random playout until game end or max moves
    let currentPlayer = opponentOwner
    let movesMade = 0
    const maxMoves = 20 // Increased to 20 for deeper, more accurate simulations

    while (!isGameOver(currentBoard) && movesMade < maxMoves) {
      const randomDice = getRandomDice()
      const randomMove = getRandomLegalMove(currentBoard, { currentPlayer, dice: randomDice })

      if (!randomMove) {
        break
      }
      const randomMoves = randomMove.moves || [randomMove]
      for (const move of randomMoves) {
        currentBoard = applyMoveToBoardForAnalysis(currentBoard, move, currentPlayer)
      }
      currentPlayer = currentPlayer === 'white' ? 'black' : 'white'
      movesMade++
    }

    // Check if game ended with a winner
    const winner = getWinner(currentBoard)
    if (winner) {
      // Game ended - award full win (1.0) or loss (0.0)
      wins += (winner === playerOwner) ? 1.0 : 0.0
    } else {
      // Game still in progress - evaluate final position
      const positionEval = evaluatePosition(currentBoard, playerOwner)
      const opponentEval = evaluatePosition(currentBoard, playerOwner === 'white' ? 'black' : 'white')

      // Award points based on relative position strength
      // Scale from -1 to +1 based on position difference
      const positionDiff = positionEval.score - opponentEval.score
      const normalizedScore = Math.max(-1, Math.min(1, positionDiff / 2)) // Clamp and scale

      // Convert to win points: -1 = 0 points, 0 = 0.5 points, +1 = 1 point
      wins += (normalizedScore + 1) / 2
    }
  }

  // Log combined input parameters and results
  const moveDescription = moveCombination.description || (moveCombination.moves ? moveCombination.moves.map(m => `${m.from}/${m.to}`).join(' ') : `${moveCombination.from}/${moveCombination.to}`)
  const winRate = wins / numSimulations
  console.log('[MonteCarlo]', {
    playerOwner,
    numSimulations,
    moveDescription,
    boardStateSummary: {
      whiteBar: boardState.whiteBar,
      blackBar: boardState.blackBar,
      dice: boardState.dice
    },
    wins,
    winRate
  })

  return winRate
}

/**
 * Hybrid evaluation combining heuristic and MC with configurable weights
 */
function evaluateMoveHybrid(boardState, move, playerOwner, numSimulations = 20, heuristicWeight = 0.6, mcWeight = 0.4) {
  const heuristicResult = evaluateMoveHeuristically(boardState, move, playerOwner)
  const heuristicScore = heuristicResult.score
  const mcScore = runMonteCarlo(boardState, move, playerOwner, numSimulations)

  // Combine scores (weighted average)
  const hybridScore = heuristicWeight * heuristicScore + mcWeight * mcScore

  return {
    move,
    heuristicScore,
    heuristicBreakdown: heuristicResult.breakdown,
    mcScore,
    hybridScore
  }
}

/**
 * Analyze moves using hybrid engine
 */
function analyzeMovesWithHybridEngine(boardState, moves, playerOwner, numSimulations = 20, heuristicWeight = 0.6, mcWeight = 0.4) {
  const evaluations = moves.map(move => evaluateMoveHybrid(boardState, move, playerOwner, numSimulations, heuristicWeight, mcWeight))

  // Log all heuristic scores with detailed breakdowns
  console.log('[HeuristicEngine] All move scores:')
  evaluations.forEach((evaluation, idx) => {
    const breakdown = evaluation.heuristicBreakdown || {}
    console.log(`  ${idx + 1}. ${evaluation.move.description}:`)
    if (breakdown.blots) {
      console.log(`     Heuristic: ${evaluation.heuristicScore.toFixed(3)}`, {
        blots: `${breakdown.blots.count} (${breakdown.blots.score.toFixed(3)})`,
        hits: `${breakdown.hits.count} (${breakdown.hits.score.toFixed(3)})`,
        pointsMade: `${breakdown.pointsMade.count} (${breakdown.pointsMade.score.toFixed(3)})`,
        pipGain: `${breakdown.pipGain.value} (${breakdown.pipGain.score.toFixed(3)})`,
        homeBoard: `${breakdown.homeBoard.checkers} (${breakdown.homeBoard.score.toFixed(3)})`,
        primeLength: `${breakdown.primeLength.value} (${breakdown.primeLength.score.toFixed(3)})`
      })
    } else {
      console.log(`     Heuristic: ${evaluation.heuristicScore.toFixed(3)} (breakdown not available)`)
    }
    console.log(`     MC: ${evaluation.mcScore.toFixed(3)}, Hybrid: ${evaluation.hybridScore.toFixed(3)}`)
  })

  // Sort by hybrid score descending
  evaluations.sort((a, b) => b.hybridScore - a.hybridScore)

    const bestEvaluation = evaluations[0]
    const bestMove = bestEvaluation.move
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:143',message:'analyzeMovesWithHybridEngine bestMove BEFORE check',data:{description:bestMove.description,moves:bestMove.moves?.map(m=>({from:m.from,to:m.to,fromBar:m.fromBar||false,die:m.die}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run8',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    
    // CRITICAL: Ensure moves array is sorted (bar moves first) - preserve source of truth
    // The moves array from getLegalMoves should already be sorted, but verify and fix if needed
    if (bestMove.moves && bestMove.moves.length > 1) {
      const hasBarMove = bestMove.moves.some(m => m.fromBar || m.from === 25 || m.from === 0)
      if (hasBarMove) {
        const firstMove = bestMove.moves[0]
        const isFirstBar = firstMove.fromBar || firstMove.from === 25 || firstMove.from === 0
        if (!isFirstBar) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:150',message:'BUG DETECTED: Moves array has bar move but bar is NOT first',data:{description:bestMove.description,moves:bestMove.moves.map(m=>({from:m.from,to:m.to,fromBar:m.fromBar||false}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run8',hypothesisId:'H'})}).catch(()=>{});
          // #endregion
          // Re-sort moves array to ensure bar moves come first
          const isBarMove = (m) => m.fromBar || m.from === 25 || m.from === 0
          bestMove.moves.sort((a, b) => {
            const aIsBar = isBarMove(a)
            const bIsBar = isBarMove(b)
            if (aIsBar && !bIsBar) return -1
            if (!aIsBar && bIsBar) return 1
            const aFrom = aIsBar ? 25 : a.from
            const bFrom = bIsBar ? 25 : b.from
            if (aFrom !== bFrom) return bFrom - aFrom
            return b.to - a.to
          })
          // Rebuild description from sorted moves to ensure consistency
          bestMove.moves.sort(sortMoves)
          bestMove.description = rebuildDescription(bestMove.moves)
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:165',message:'Fixed bestMove moves array and description',data:{fixedDescription:bestMove.description,fixedMoves:bestMove.moves.map(m=>({from:m.from,to:m.to,fromBar:m.fromBar||false}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run8',hypothesisId:'H'})}).catch(()=>{});
          // #endregion
        }
      }
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:170',message:'analyzeMovesWithHybridEngine bestMove AFTER check',data:{description:bestMove.description,moves:bestMove.moves?.map(m=>({from:m.from,to:m.to,fromBar:m.fromBar||false,die:m.die}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run8',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    // Get current player from boardState for coordinate conversion
    const currentPlayer = boardState.player !== undefined ? boardState.player : 1
    const formattedMove = formatMove(bestMove, currentPlayer)
    const reasoning = `Hybrid evaluation selected ${formattedMove} with score ${evaluations[0].hybridScore.toFixed(3)}`

    // Find the index of bestMove in the original moves array
    const bestMoveIndex = moves.findIndex(m => {
      // Compare moves by checking if they have the same structure
      if (m.moves && bestMove.moves) {
        // Both are combinations - compare move sequences
        if (m.moves.length !== bestMove.moves.length) return false
        return m.moves.every((moveItem, idx) => 
          moveItem.from === bestMove.moves[idx].from && 
          moveItem.to === bestMove.moves[idx].to
        )
      } else if (!m.moves && !bestMove.moves) {
        // Both are single moves
        return m.from === bestMove.from && m.to === bestMove.to
      }
      return false
    })

    // Log winning move
    console.log('[MonteCarlo] Winning move:', {
      moveDescription: bestMove.description,
      formattedMove,
      hybridScore: evaluations[0].hybridScore.toFixed(3),
      heuristicScore: evaluations[0].heuristicScore.toFixed(3),
      mcScore: evaluations[0].mcScore.toFixed(3)
    })

    return {
      bestMoveIndex: bestMoveIndex >= 0 ? bestMoveIndex : 0, // Use found index or fallback to 0
      reasoning,
      confidence: 0.9, // High confidence for deterministic evaluation
      hybridScore: evaluations[0].hybridScore.toFixed(3),
      heuristicScore: evaluations[0].heuristicScore.toFixed(3),
      mcScore: evaluations[0].mcScore.toFixed(3),
      factorScores: evaluations.map((evaluation, idx) => ({
        moveNumber: idx + 1,
        moveDescription: formatMove(evaluation.move, currentPlayer),
        scores: `Heuristic: ${evaluation.heuristicScore.toFixed(3)} | MC: ${evaluation.mcScore.toFixed(3)} | Total: ${evaluation.hybridScore.toFixed(3)}`,
        breakdown: evaluation.heuristicBreakdown // Include detailed breakdown
      })),
      bestMove: bestMove // Keep reference to actual best move
    }
}

/**
 * Validate hybrid suggestion and return move combination
 */
function validateAndReturnMove(hybridAnalysis, moves) {
  const { bestMoveIndex, reasoning, confidence, factorScores, bestMove, hybridScore, heuristicScore, mcScore } = hybridAnalysis

  // Prefer using bestMove directly if available (most reliable)
  if (bestMove) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:190',message:'validateAndReturnMove bestMove BEFORE check',data:{description:bestMove.description,moves:bestMove.moves?.map(m=>({from:m.from,to:m.to,fromBar:m.fromBar||false,die:m.die}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run8',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    // CRITICAL: Ensure moves array is sorted (bar moves first) before returning
    // The moves array from getLegalMoves should already be sorted, but verify and fix if needed
    if (bestMove.moves && bestMove.moves.length > 1) {
      const hasBarMove = bestMove.moves.some(m => m.fromBar || m.from === 25 || m.from === 0)
      if (hasBarMove) {
        const firstMove = bestMove.moves[0]
        const isFirstBar = firstMove.fromBar || firstMove.from === 25 || firstMove.from === 0
        if (!isFirstBar) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:195',message:'BUG DETECTED in validateAndReturnMove: Moves array has bar move but bar is NOT first',data:{description:bestMove.description,moves:bestMove.moves.map(m=>({from:m.from,to:m.to,fromBar:m.fromBar||false}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run8',hypothesisId:'H'})}).catch(()=>{});
          // #endregion
          // Re-sort moves array to ensure bar moves come first
          const isBarMove = (m) => m.fromBar || m.from === 25 || m.from === 0
          bestMove.moves.sort((a, b) => {
            const aIsBar = isBarMove(a)
            const bIsBar = isBarMove(b)
            if (aIsBar && !bIsBar) return -1
            if (!aIsBar && bIsBar) return 1
            const aFrom = aIsBar ? 25 : a.from
            const bFrom = bIsBar ? 25 : b.from
            if (aFrom !== bFrom) return bFrom - aFrom
            return b.to - a.to
          })
          // Rebuild description from sorted moves to ensure consistency
          bestMove.moves.sort(sortMoves)
          bestMove.description = rebuildDescription(bestMove.moves)
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:210',message:'Fixed bestMove in validateAndReturnMove',data:{fixedDescription:bestMove.description,fixedMoves:bestMove.moves.map(m=>({from:m.from,to:m.to,fromBar:m.fromBar||false}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run8',hypothesisId:'H'})}).catch(()=>{});
          // #endregion
        }
      }
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:215',message:'validateAndReturnMove bestMove AFTER check',data:{description:bestMove.description,moves:bestMove.moves?.map(m=>({from:m.from,to:m.to,fromBar:m.fromBar||false,die:m.die}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run8',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    return {
      move: bestMove,
      reasoning: reasoning,
      confidence: confidence,
      factorScores: factorScores,
      hybridScore: hybridScore,
      heuristicScore: heuristicScore,
      mcScore: mcScore,
      source: 'hybrid'
    }
  }

  // Fallback to using index if bestMove not available
  if (bestMoveIndex >= 0 && bestMoveIndex < moves.length) {
    const selectedCombination = moves[bestMoveIndex]
    // CRITICAL: Ensure moves array is sorted (bar moves first) before returning
    if (selectedCombination.moves && selectedCombination.moves.length > 1) {
      const hasBarMove = selectedCombination.moves.some(m => m.fromBar || m.from === 25 || m.from === 0)
      if (hasBarMove) {
        const firstMove = selectedCombination.moves[0]
        const isFirstBar = firstMove.fromBar || firstMove.from === 25 || firstMove.from === 0
        if (!isFirstBar) {
          // Re-sort moves array to ensure bar moves come first
          const isBarMove = (m) => m.fromBar || m.from === 25 || m.from === 0
          selectedCombination.moves.sort((a, b) => {
            const aIsBar = isBarMove(a)
            const bIsBar = isBarMove(b)
            if (aIsBar && !bIsBar) return -1
            if (!aIsBar && bIsBar) return 1
            const aFrom = aIsBar ? 25 : a.from
            const bFrom = bIsBar ? 25 : b.from
            if (aFrom !== bFrom) return bFrom - aFrom
            return b.to - a.to
          })
          // Rebuild description from sorted moves to ensure consistency
          selectedCombination.moves.sort(sortMoves)
          selectedCombination.description = rebuildDescription(selectedCombination.moves)
        }
      }
    }
    return {
      move: selectedCombination,
      reasoning: reasoning,
      confidence: confidence,
      factorScores: factorScores,
      hybridScore: hybridScore,
      heuristicScore: heuristicScore,
      mcScore: mcScore,
      source: 'hybrid'
    }
  }

  // Final fallback to first combination
  return {
    move: moves[0],
    reasoning: "Hybrid evaluation failed, using first move",
    confidence: 0.3,
    factorScores: null,
    hybridScore: null,
    heuristicScore: null,
    mcScore: null,
    source: 'fallback'
  }
}

// Helper functions for MC
function getRandomDice() {
  const d1 = Math.floor(Math.random() * 6) + 1
  const d2 = Math.floor(Math.random() * 6) + 1
  return d1 === d2 ? [d1, d1, d1, d1] : [d1, d2]
}

function isGameOver(boardState) {
  // Check if either player has won (borne off all checkers)
  return hasPlayerWon(boardState, 'white') || hasPlayerWon(boardState, 'black')
}

function getWinner(boardState) {
  if (hasPlayerWon(boardState, 'white')) return 'white'
  if (hasPlayerWon(boardState, 'black')) return 'black'
  return null
}

// Helper functions copied from xgidParser.js
function charToCount(char) {
  if (char === '-') return 0
  if (char >= 'a' && char <= 'o') {
    // Lowercase: BLACK checkers, a=1, b=2, ..., o=15
    return char.charCodeAt(0) - 'a'.charCodeAt(0) + 1
  }
  if (char >= 'A' && char <= 'O') {
    // Uppercase: WHITE checkers, A=1, B=2, ..., O=15
    return char.charCodeAt(0) - 'A'.charCodeAt(0) + 1
  }
  return 0
}

function charToOwner(char) {
  if (char === '-') return null
  if (char >= 'a' && char <= 'o') return 'black'
  if (char >= 'A' && char <= 'O') return 'white'
  return null
}

function parseXGID(xgid) {
  if (!xgid || typeof xgid !== 'string') {
    return {
      blackBar: 0,
      whiteBar: 0,
      points: Array(24).fill({ count: 0, owner: null }),
      cubeValue: undefined,
      cubeOwner: undefined,
      player: undefined,
      dice: undefined
    }
  }

  const parts = xgid.split(':')
  const xg1 = parts[0] || ''
  const xg2 = parts[1]
  const xg3 = parts[2]
  const xg4 = parts[3]
  const xg5 = parts[4]

  if (xg1.length !== 26) {
    console.warn(`Invalid xg1 length: expected 26, got ${xg1.length}`)
    return {
      blackBar: 0,
      whiteBar: 0,
      points: Array(24).fill({ count: 0, owner: null }),
      cubeValue: undefined,
      cubeOwner: undefined,
      player: undefined,
      dice: undefined
    }
  }

  const blackBar = charToCount(xg1[0])

  const points = []
  for (let i = 1; i <= 24; i++) {
    const char = xg1[i]
    const count = charToCount(char)
    const owner = charToOwner(char)
    points.push({ count, owner })
  }

  const whiteBar = charToCount(xg1[25])

  let cubeValue = undefined
  if (xg2 !== undefined && xg2 !== '') {
    const parsed = parseInt(xg2, 10)
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 6) {
      cubeValue = parsed
    }
  }

  let cubeOwner = undefined
  if (xg3 !== undefined && xg3 !== '') {
    const parsed = parseInt(xg3, 10)
    if (!isNaN(parsed) && (parsed === -1 || parsed === 0 || parsed === 1)) {
      cubeOwner = parsed
    }
  }

  let player = undefined
  if (xg4 !== undefined && xg4 !== '') {
    const parsed = parseInt(xg4, 10)
    if (!isNaN(parsed) && (parsed === -1 || parsed === 1)) {
      player = parsed
    }
  }

  let dice = undefined
  if (xg5 !== undefined && xg5 !== '') {
    if (/^\d{2}$/.test(xg5)) {
      dice = xg5
    }
  }

  return {
    blackBar,
    whiteBar,
    points,
    cubeValue,
    cubeOwner,
    player,
    dice
  }
}


// Export functions for testing (re-export getLegalMoves from module)
export { parseXGID, createTurnState, getLegalMoves }

export async function POST(request) {
  // Set a timeout of 30 seconds for the entire analysis
  const timeoutMs = 30000
  const startTime = Date.now()
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Analysis timeout: exceeded 30 seconds'))
    }, timeoutMs)
  })
  
  const analysisPromise = (async () => {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:327',message:'API POST entry',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      const { xgid, player, difficulty = 'advanced', maxTopMoves = 6, numSimulations = 20, debug = false, usedDice = [], heuristicWeight = 0.6, mcWeight = 0.4 } = await request.json()

      // Validate input
      if (!xgid) {
        return Response.json(
          { error: 'XGID is required' },
          { status: 400 }
        )
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:341',message:'Before parseXGID',data:{xgid:xgid.substring(0,50),player,difficulty,maxTopMoves,usedDiceLength:usedDice.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      // Parse position and generate legal moves
      const boardState = parseXGID(xgid)

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:344',message:'Before createTurnState',data:{boardStatePlayer:boardState.player,boardStateDice:boardState.dice},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      // Create turn state for legal move generation
      const turnState = createTurnState(boardState, player)
      // If usedDice is provided, update turn state to reflect already used dice
      if (usedDice && usedDice.length > 0) {
        turnState.usedDice = usedDice
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:349',message:'Before getLegalMoves',data:{turnStateCurrentPlayer:turnState.currentPlayer,turnStateDice:turnState.dice,turnStateUsedDice:turnState.usedDice},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      const allLegalMoves = getLegalMoves(boardState, turnState)
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:349',message:'After getLegalMoves',data:{allLegalMovesLength:allLegalMoves.length,allLegalMoves:allLegalMoves.map(m=>({movesLength:m.moves?.length||1,description:m.description,totalPips:m.totalPips,moves:m.moves?.map(mv=>({from:mv.from,to:mv.to,die:mv.die}))||[]})),singleMoves:allLegalMoves.filter(m=>(m.moves?.length||1)===1).length,multiMoves:allLegalMoves.filter(m=>(m.moves?.length||1)>1).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'F'})}).catch(()=>{});
      // #endregion

      if (allLegalMoves.length === 0) {
        return Response.json({
          move: null,
          reasoning: "No legal moves available",
          confidence: 1.0,
          source: 'local'
        })
      }

      // Step 1: Deduplicate moves that lead to identical final positions (BEFORE HE calculation)
      const playerOwner = player === 1 ? 'white' : 'black'
      const positionGroups = new Map()

      for (const move of allLegalMoves) {
        const finalState = calculateFinalBoardState(boardState, move.moves || [move], playerOwner)
        // Create a simple hash of the final board state (focusing on key differences)
        const positionKey = `${finalState.points.map(p => `${p.owner || 'e'}:${p.count}`).join('|')}|${finalState.whiteBar}|${finalState.blackBar}`

        if (!positionGroups.has(positionKey)) {
          positionGroups.set(positionKey, [])
        }
        positionGroups.get(positionKey).push(move)
      }

      // Keep one representative move per unique final position
      const deduplicatedMoves = []
      for (const movesForPosition of positionGroups.values()) {
        if (movesForPosition.length > 0) {
          // For now, just take the first move per position group
          // (We'll evaluate all and pick the best after HE calculation)
          deduplicatedMoves.push(movesForPosition[0])
        }
      }

      console.log(`[MoveDeduplication] Found ${positionGroups.size} unique positions from ${allLegalMoves.length} moves`)
      console.log(`[MoveDeduplication] Reduced to ${deduplicatedMoves.length} deduplicated moves before HE calculation`)

      // Debug: show deduplication stats from first step
      if (debug) {
        console.log('[MoveDeduplication] Position group details:')
        let totalDuplicates = 0
        for (const [positionKey, movesForPosition] of positionGroups.entries()) {
          if (movesForPosition.length > 1) {
            totalDuplicates += movesForPosition.length - 1
            console.log(`  Group with ${movesForPosition.length} moves: ${movesForPosition.map(m => formatMove(m)).join(', ')}`)
          }
        }
        console.log(`  Total duplicate moves removed before HE: ${totalDuplicates}`)
      }

      // Step 2: Calculate HE scores only on deduplicated moves
      console.log('[HeuristicEngine] Calculating heuristic scores for deduplicated moves:')
      const allHeuristicEvaluations = deduplicatedMoves.map(move => {
        const heuristicResult = evaluateMoveHeuristically(boardState, move, playerOwner)
        return {
          move,
          heuristicScore: heuristicResult.score,
          breakdown: heuristicResult.breakdown
        }
      })

      // Collect debug information
      const debugInfo = debug ? {
        xgid,
        legalMoves: allLegalMoves.map(move => ({
          description: formatMove(move),
          moves: move.moves, // Include moves array for relative coordinate conversion
          totalPips: move.totalPips || 0
        })),
        deduplicatedMoves: deduplicatedMoves.map(move => ({
          description: formatMove(move),
          moves: move.moves,
          totalPips: move.totalPips || 0
        })),
        allMoves: allHeuristicEvaluations.map(heuristicEval => ({
          description: heuristicEval.move.description,
          heuristicScore: heuristicEval.heuristicScore,
          breakdown: heuristicEval.breakdown
        }))
      } : null
      
      // Sort by heuristic score descending for display
      allHeuristicEvaluations.sort((a, b) => b.heuristicScore - a.heuristicScore)
      
      allHeuristicEvaluations.forEach((heuristicEval, idx) => {
        const breakdown = heuristicEval.breakdown || {}
        console.log(`  ${idx + 1}. ${heuristicEval.move.description}:`)
        if (breakdown.blots !== undefined) {
          console.log(`     Heuristic: ${heuristicEval.heuristicScore.toFixed(3)}`, {
            blots: `${breakdown.blots.count} (${breakdown.blots.score.toFixed(3)})`,
            hits: `${breakdown.hits.count} (${breakdown.hits.score.toFixed(3)})`,
            pointsMade: `${breakdown.pointsMade.count} (${breakdown.pointsMade.score.toFixed(3)})`,
            pipGain: `${breakdown.pipGain.value} (${breakdown.pipGain.score.toFixed(3)})`,
            homeBoard: `${breakdown.homeBoard.checkers} (${breakdown.homeBoard.score.toFixed(3)})`,
            primeLength: `${breakdown.primeLength.value} (${breakdown.primeLength.score.toFixed(3)})`,
            builderCoverage: `${breakdown.builderCoverage.bonus.toFixed(1)} (${breakdown.builderCoverage.score.toFixed(3)})`,
            stackPenalty: `${breakdown.stackPenalty.maxStack} (${breakdown.stackPenalty.score.toFixed(3)})`,
            opponentBlotCount: `${breakdown.opponentBlotCount.count} (${breakdown.opponentBlotCount.score.toFixed(3)})`
          })
        } else {
          console.log(`     Heuristic: ${heuristicEval.heuristicScore.toFixed(3)} (breakdown not available)`)
        }
      })

      // Select top moves based on heuristic scores (moves are already deduplicated)
      const topMoves = allHeuristicEvaluations
        .slice(0, Math.min(maxTopMoves, allHeuristicEvaluations.length))
        .map(heuristicEval => heuristicEval.move)
      
      console.log('[MoveSelection] Selected moves for Monte Carlo (based on heuristic scores):', topMoves.map((m, idx) => {
        const heuristicEval = allHeuristicEvaluations.find(e => e.move.description === m.description)
        return {
          rank: idx + 1,
          description: m.description,
          heuristicScore: heuristicEval?.heuristicScore.toFixed(3) || 'N/A',
          totalPips: m.totalPips,
          movesCount: m.moves?.length || 1
        }
      }))

      // Log original pip-based ranking for comparison
      console.log('[MoveSelection] Original pip-based ranking:', allLegalMoves.map((m, idx) => ({
        rank: idx + 1,
        description: m.description,
        totalPips: m.totalPips,
        movesCount: m.moves?.length || 1
      })))
      // Check if "13/7 8/7" was selected based on heuristic ranking
      const targetHeuristicEval = allHeuristicEvaluations.find(e => e.move.description === '13/7 8/7')
      if (targetHeuristicEval) {
        const heuristicRank = allHeuristicEvaluations.indexOf(targetHeuristicEval) + 1
        const isSelected = topMoves.some(m => m.description === '13/7 8/7')
        console.log('[MoveSelection] "13/7 8/7" heuristic rank:', heuristicRank, 'out of', allHeuristicEvaluations.length, '- heuristic score:', targetHeuristicEval.heuristicScore.toFixed(3))
        if (isSelected) {
          console.log('[MoveSelection] "13/7 8/7" SELECTED for Monte Carlo evaluation (heuristic rank', heuristicRank, '<= maxTopMoves', maxTopMoves, ')')
        } else {
          console.log('[MoveSelection] WARNING: "13/7 8/7" was NOT selected (heuristic rank', heuristicRank, '> maxTopMoves', maxTopMoves, ')')
        }
      } else {
        console.log('[MoveSelection] WARNING: "13/7 8/7" not found in legal moves list')
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:373',message:'Top moves selected',data:{topMovesLength:topMoves.length,topMoves:topMoves.map(m=>({movesLength:m.moves?m.moves.length:1,description:m.description,totalPips:m.totalPips,moves:m.moves?m.moves.map(mv=>({from:mv.from,to:mv.to,die:mv.die})):null})),topSingleMoves:topMoves.filter(m=>(m.moves?.length||1)===1).length,topMultiMoves:topMoves.filter(m=>(m.moves?.length||1)>1).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'F'})}).catch(()=>{});
      // #endregion

      // Get hybrid engine analysis
      // playerOwner already defined above
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:378',message:'Before analyzeMovesWithHybridEngine',data:{playerOwner,topMovesLength:topMoves.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      const hybridAnalysis = analyzeMovesWithHybridEngine(boardState, topMoves, playerOwner, numSimulations, heuristicWeight, mcWeight)
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:378',message:'After analyzeMovesWithHybridEngine',data:{hasBestMove:!!hybridAnalysis.bestMove,bestMoveIndex:hybridAnalysis.bestMoveIndex,bestMoveDescription:hybridAnalysis.bestMove?.description,bestMoveMovesLength:hybridAnalysis.bestMove?.moves?.length||1,reasoning:hybridAnalysis.reasoning},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'F'})}).catch(()=>{});
      // #endregion

      // Validate and return best hybrid suggestion
      const result = validateAndReturnMove(hybridAnalysis, topMoves)
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:432',message:'Final result',data:{resultMoveDescription:result.move?.description,resultMoveMovesLength:result.move?.moves?.length||1,resultReasoning:result.reasoning,resultSource:result.source},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'F'})}).catch(()=>{});
      // #endregion

      if (!debugInfo) {
        delete result.factorScores
      }

      // Include debug info if requested
      if (debugInfo) {
        result.debug = debugInfo
      }

      // Add comprehensive performance info
      result.performance = {
        totalElapsedMs: Date.now() - startTime,
        parameters: {
          maxTopMoves: maxTopMoves,
          maxMoves: 20, // MC simulation depth (each sim runs max 20 moves)
          numSimulations: numSimulations // Monte Carlo simulations per move
        }
      }

      return Response.json(result)
    } catch (error) {
      throw error
    }
  })()
  
  try {
    const result = await Promise.race([analysisPromise, timeoutPromise])
    return result
  } catch (error) {
    console.error('Backgammon Engine API error:', error)
    
    // Check if it's a timeout error
    if (error.message && error.message.includes('timeout')) {
      const elapsed = Date.now() - startTime
      return Response.json({
        move: null,
        reasoning: `Engine analysis timed out after ${(elapsed / 1000).toFixed(1)} seconds. The position may be too complex.`,
        confidence: 0.1,
        source: 'timeout'
      }, { status: 200 })
    }

    // Return fallback response for other errors
    return Response.json({
      move: null,
      reasoning: 'Engine analysis failed due to server error',
      confidence: 0.1,
      source: 'error'
    }, { status: 200 })
  }
}

/**
 * Create turn state for move validation
 */
function createTurnState(boardState, player) {
  const owner = player === 1 ? 'white' : 'black'
  let dice = []
  if (boardState.dice && boardState.dice !== '00') {
    const die1 = parseInt(boardState.dice[0])
    const die2 = parseInt(boardState.dice[1])
    if (!isNaN(die1) && !isNaN(die2) && die1 > 0 && die2 > 0) {
      // Doubles: if both dice are the same, allow 4 moves of that number
      dice = die1 === die2 ? [die1, die1, die1, die1] : [die1, die2]
    }
  }

  return {
    currentPlayer: owner,
    dice: dice,
    usedDice: [],
    isTurnComplete: false,
    mustEnterFromBar: (owner === 'black' ? boardState.blackBar : boardState.whiteBar) > 0,
    noLegalMoves: false
  }
}

/**
 * Select diverse top legal move combinations for engine analysis
 */
function selectTopLegalMoves(allMoves, maxMoves) {
  // Return only the requested number of moves to speed up evaluation
  // Reduced from Math.max(18, maxMoves) to just maxMoves for better performance
  const limit = maxMoves
  return allMoves.slice(0, Math.min(limit, allMoves.length))
}

// ============================================================================
// DETERMINISTIC ENGINE - Verified calculations for hybrid engine system
// ============================================================================

function cloneBoardState(boardState) {
  return {
    blackBar: boardState.blackBar,
    whiteBar: boardState.whiteBar,
    points: boardState.points.map(point => ({ ...point })),
    cubeValue: boardState.cubeValue,
    cubeOwner: boardState.cubeOwner,
    player: boardState.player,
    dice: boardState.dice
  }
}

function applyMoveToBoardForAnalysis(boardState, move, playerOwner) {
  const newState = cloneBoardState(boardState)
  const from = move.from
  const to = move.to

  // Remove checker from source (bar or point)
  if (from === 0 || from === 25) {
    if (playerOwner === 'white') {
      newState.whiteBar = Math.max(0, newState.whiteBar - 1)
    } else {
      newState.blackBar = Math.max(0, newState.blackBar - 1)
    }
  } else {
    const fromPoint = newState.points[from - 1]
    if (fromPoint.count > 0 && fromPoint.owner === playerOwner) {
      fromPoint.count -= 1
      if (fromPoint.count === 0) {
        fromPoint.owner = null
      }
    }
  }

  // Handle destination
  if (to >= 1 && to <= 24) {
    const toPoint = newState.points[to - 1]
    const opponentOwner = playerOwner === 'white' ? 'black' : 'white'

    // Hit opponent blot
    if (toPoint.count === 1 && toPoint.owner === opponentOwner) {
      toPoint.count = 0
      toPoint.owner = null
      if (opponentOwner === 'white') {
        newState.whiteBar += 1
      } else {
        newState.blackBar += 1
      }
    }

    if (toPoint.count === 0) {
      toPoint.owner = playerOwner
    }
    toPoint.count += 1
  }

  return newState
}

function calculateFinalBoardState(boardState, moves, playerOwner) {
  let state = cloneBoardState(boardState)
  for (const move of moves) {
    state = applyMoveToBoardForAnalysis(state, move, playerOwner)
  }
  return state
}

function identifyBlots(boardState, playerOwner) {
  const blots = []
  for (let point = 1; point <= 24; point++) {
    const pointData = boardState.points[point - 1]
    if (pointData.owner === playerOwner && pointData.count === 1) {
      blots.push(point)
    }
  }
  return blots
}

function identifyOpponentPositions(boardState, playerOwner) {
  const opponentOwner = playerOwner === 'white' ? 'black' : 'white'
  const positions = []
  for (let point = 1; point <= 24; point++) {
    const pointData = boardState.points[point - 1]
    if (pointData.owner === opponentOwner && pointData.count > 0) {
      positions.push({ point, count: pointData.count })
    }
  }
  return positions
}

function getMadePoints(boardState, playerOwner) {
  const madePoints = []
  for (let point = 1; point <= 24; point++) {
    const pointData = boardState.points[point - 1]
    if (pointData.owner === playerOwner && pointData.count >= 2) {
      madePoints.push(point)
    }
  }
  return madePoints
}

function calculateHitProbabilityForDistance(distance, blockedPoints = []) {
  if (distance <= 0 || distance > 24) {
    return { probability: 0, directRolls: 0, indirectRolls: 0, totalRolls: 0 }
  }

  let directRolls = 0
  let indirectRolls = 0
  let doublesRolls = 0

  for (let d1 = 1; d1 <= 6; d1++) {
    for (let d2 = 1; d2 <= 6; d2++) {
      // Direct hit
      if (distance <= 6 && (d1 === distance || d2 === distance)) {
        directRolls += d1 === d2 ? 1 : 1
        continue
      }

      // Indirect hit (sum)
      if (distance <= 12 && d1 + d2 === distance) {
        const intermediateBlocked = blockedPoints.includes(distance - d1) || blockedPoints.includes(distance - d2)
        if (!intermediateBlocked) {
          indirectRolls += d1 === d2 ? 1 : 1
          continue
        }
      }

      // Doubles hit (up to 24)
      if (d1 === d2) {
        const stepSize = d1
        for (let numSteps = 2; numSteps <= 4; numSteps++) {
          if (stepSize * numSteps === distance) {
            let blocked = false
            for (let step = 1; step < numSteps; step++) {
              if (blockedPoints.includes(stepSize * step)) {
                blocked = true
                break
              }
            }
            if (!blocked) {
              doublesRolls += 1
              break
            }
          }
        }
      }
    }
  }

  const totalRolls = directRolls + indirectRolls + doublesRolls
  return {
    probability: totalRolls / 36,
    directRolls,
    indirectRolls,
    doublesRolls,
    totalRolls
  }
}

function calculateHitImpact(blotPoint, playerOwner) {
  const isWhite = playerOwner === 'white'
  let pipsLost, zone, impact

  if (isWhite) {
    pipsLost = blotPoint
    if (blotPoint <= 6) {
      zone = 'HOME_BOARD'
      impact = 1.0 - (blotPoint - 1) * 0.03
    } else if (blotPoint <= 12) {
      zone = 'OUTER_BOARD'
      impact = 0.8 - (blotPoint - 7) * 0.05
    } else if (blotPoint <= 18) {
      zone = 'OPPONENT_OUTER'
      impact = 0.5 - (blotPoint - 13) * 0.05
    } else {
      zone = 'OPPONENT_HOME'
      impact = 0.2 - (blotPoint - 19) * 0.02
    }
  } else {
    pipsLost = 25 - blotPoint
    if (blotPoint >= 19) {
      zone = 'HOME_BOARD'
      impact = 1.0 - (24 - blotPoint) * 0.03
    } else if (blotPoint >= 13) {
      zone = 'OUTER_BOARD'
      impact = 0.8 - (18 - blotPoint) * 0.05
    } else if (blotPoint >= 7) {
      zone = 'OPPONENT_OUTER'
      impact = 0.5 - (12 - blotPoint) * 0.05
    } else {
      zone = 'OPPONENT_HOME'
      impact = 0.2 - (6 - blotPoint) * 0.02
    }
  }

  impact = Math.max(0.1, Math.min(1.0, impact))
  return { impact, pipsLost, zone }
}

function calculateBlotRisk(blotPoint, opponentPositions, playerMadePoints, playerOwner) {
  const isWhite = playerOwner === 'white'
  let totalFavorableRolls = 0
  const attackSources = []

  for (const oppPos of opponentPositions) {
    const distance = isWhite ? blotPoint - oppPos.point : oppPos.point - blotPoint
    if (distance <= 0) continue

    const hitProb = calculateHitProbabilityForDistance(distance, playerMadePoints)
    if (hitProb.totalRolls > 0) {
      totalFavorableRolls += hitProb.totalRolls
      attackSources.push({
        fromPoint: oppPos.point,
        distance,
        probability: hitProb.probability,
        rolls: hitProb.totalRolls
      })
    }
  }

  const effectiveRolls = Math.min(totalFavorableRolls, 36)
  const totalProbability = effectiveRolls / 36
  const hitImpact = calculateHitImpact(blotPoint, playerOwner)
  const weightedRisk = totalProbability * hitImpact.impact

  let riskLevel = 'LOW'
  if (weightedRisk >= 0.4) riskLevel = 'HIGH'
  else if (weightedRisk >= 0.2) riskLevel = 'MEDIUM'

  return {
    blotPoint,
    totalProbability,
    totalRolls: effectiveRolls,
    hitImpact: hitImpact.impact,
    pipsLost: hitImpact.pipsLost,
    zone: hitImpact.zone,
    weightedRisk,
    riskLevel,
    attackSources
  }
}

function identifyPointsMade(beforeState, afterState, playerOwner) {
  const newlyMade = []
  const strengthened = []
  for (let point = 1; point <= 24; point++) {
    const before = beforeState.points[point - 1]
    const after = afterState.points[point - 1]
    if (after.owner !== playerOwner || after.count < 2) continue

    if (before.owner !== playerOwner || before.count < 2) {
      newlyMade.push(point)
    } else if (after.count > before.count) {
      strengthened.push(point)
    }
  }
  return { newlyMade, strengthened }
}

function calculatePipCounts(boardState) {
  let whitePips = 0
  let blackPips = 0

  for (let point = 1; point <= 24; point++) {
    const pointData = boardState.points[point - 1]
    if (pointData.count > 0) {
      if (pointData.owner === 'white') {
        whitePips += point * pointData.count
      } else if (pointData.owner === 'black') {
        blackPips += (25 - point) * pointData.count
      }
    }
  }

  whitePips += boardState.whiteBar * 25
  blackPips += boardState.blackBar * 25

  return { white: whitePips, black: blackPips }
}

function checkForHit(beforeState, move, playerOwner) {
  const to = move.to
  if (to < 1 || to > 24) return null

  const toPoint = beforeState.points[to - 1]
  const opponentOwner = playerOwner === 'white' ? 'black' : 'white'
  if (toPoint.count === 1 && toPoint.owner === opponentOwner) {
    return { hitPoint: to, opponentOwner }
  }
  return null
}

function buildVerifiedMoveAnalysis(boardState, moveCombination, playerOwner) {
  const moves = moveCombination.moves || [moveCombination]
  const finalState = calculateFinalBoardState(boardState, moves, playerOwner)

  // Calculate hits during move sequence (only factor that depends on sequence)
  const hits = []
  let tempState = boardState
  for (const move of moves) {
    const hit = checkForHit(tempState, move, playerOwner)
    if (hit) hits.push(hit)
    tempState = applyMoveToBoardForAnalysis(tempState, move, playerOwner)
  }

  // ALL other analysis is strictly final-state based to ensure normalization
  const blots = identifyBlots(finalState, playerOwner)
  const opponentPositions = identifyOpponentPositions(finalState, playerOwner)
  const playerMadePoints = getMadePoints(finalState, playerOwner)
  const blotRisks = blots.map(blotPoint =>
    calculateBlotRisk(blotPoint, opponentPositions, playerMadePoints, playerOwner)
  )

  const pointsAnalysis = identifyPointsMade(boardState, finalState, playerOwner)
  const beforePips = calculatePipCounts(boardState)
  const afterPips = calculatePipCounts(finalState)
  const pipGain = playerOwner === 'white'
    ? beforePips.white - afterPips.white
    : beforePips.black - afterPips.black

  let combinedRisk = 0
  let combinedWeightedRisk = 0
  for (const risk of blotRisks) {
    combinedRisk = Math.min(1, combinedRisk + risk.totalProbability * (1 - combinedRisk))
    combinedWeightedRisk = Math.min(1, combinedWeightedRisk + risk.weightedRisk * (1 - combinedWeightedRisk))
  }

  let overallRiskLevel = 'LOW'
  if (combinedWeightedRisk >= 0.4) overallRiskLevel = 'HIGH'
  else if (combinedWeightedRisk >= 0.2) overallRiskLevel = 'MEDIUM'

  return {
    moveDescription: moveCombination.description || formatMove(moveCombination),
    finalState: finalState,
    blots: {
      count: blots.length,
      positions: blots,
      risks: blotRisks,
      combinedRisk,
      combinedWeightedRisk,
      overallRiskLevel
    },
    pointsMade: {
      newlyMade: pointsAnalysis.newlyMade,
      strengthened: pointsAnalysis.strengthened,
      totalNewPoints: pointsAnalysis.newlyMade.length
    },
    hits: {
      count: hits.length,
      details: hits
    },
    pips: {
      before: beforePips,
      after: afterPips,
      gain: pipGain
    },
    madePoints: playerMadePoints
  }
}

// ============================================================================
// CONTEXT CLASSIFICATION - Stage and Game Type for weight adjustments
// ============================================================================

function countCheckersInRange(boardState, owner, startPoint, endPoint) {
  let count = 0
  for (let point = startPoint; point <= endPoint; point++) {
    const pointData = boardState.points[point - 1]
    if (pointData.owner === owner && pointData.count > 0) {
      count += pointData.count
    }
  }
  return count
}

function calculateBuilderCoverage(boardState, playerOwner) {
  let totalBonus = 0

  // Points 9-11: +1 for single checker, +0.5 for multiple checkers
  for (let p = 9; p <= 11; p++) {
    const pointData = boardState.points[p - 1]
    if (pointData && pointData.owner === playerOwner && pointData.count >= 1) {
      totalBonus += (pointData.count === 1) ? 1.0 : 0.5
    }
  }

  // Point 8: +0.5 for single checker only, 0 for multiple
  const point8Data = boardState.points[7] // point 8 is index 7
  if (point8Data && point8Data.owner === playerOwner && point8Data.count === 1) {
    totalBonus += 0.5
  }

  return totalBonus
}

function getMaxStackSize(boardState, playerOwner) {
  let max = 0
  for (const point of Object.values(boardState.points || {})) {
    if (point.owner === playerOwner) {
      max = Math.max(max, point.count || 0)
    }
  }
  return max
}

function countOpponentBlots(boardState, playerOwner) {
  const opponentOwner = playerOwner === 'white' ? 'black' : 'white'
  let count = 0
  for (const point of Object.values(boardState.points || {})) {
    if (point.owner === opponentOwner && point.count === 1) {
      count++
    }
  }
  return count
}

function hasContact(boardState) {
  const whiteInUpper = countCheckersInRange(boardState, 'white', 13, 24) > 0
  const blackInLower = countCheckersInRange(boardState, 'black', 1, 12) > 0
  return whiteInUpper && blackInLower
}

function checkPrimeLength(boardState, playerOwner) {
  // Simple check for longest consecutive points owned
  let maxPrime = 0
  let currentPrime = 0
  for (let i = 1; i <= 24; i++) {
    const point = boardState.points[i - 1]
    if (point.owner === playerOwner && point.count >= 2) {
      currentPrime++
      maxPrime = Math.max(maxPrime, currentPrime)
    } else {
      currentPrime = 0
    }
  }
  return maxPrime
}

// ============================================================================
// POSITION EVALUATION - Comprehensive heuristic position assessment
// ============================================================================

/**
 * Position evaluation weights for overall board state assessment
 */
const POSITION_WEIGHTS = {
  pipAdvantage: 0.25,      // Race advantage
  blotSafety: 0.2,         // Penalty for vulnerability
  madePoints: 0.15,        // Control and blocking
  primeStrength: 0.12,     // Blocking potential
  homeBoardStrength: 0.1,   // Bear-off readiness
  anchorStrength: 0.08,     // Back game potential
  contactAdvantage: 0.1    // Tactical position strength
}

/**
 * Evaluate overall position quality for a player
 * Returns a score where positive values indicate advantage
 */
function evaluatePosition(boardState, playerOwner) {
  const opponentOwner = playerOwner === 'white' ? 'black' : 'white'
  
  // 1. Pip count advantage (race evaluation)
  const pipCounts = calculatePipCounts(boardState)
  const playerPips = playerOwner === 'white' ? pipCounts.white : pipCounts.black
  const opponentPips = playerOwner === 'white' ? pipCounts.black : pipCounts.white
  const pipDiff = opponentPips - playerPips // Positive = advantage
  // Normalize: typical game has ~150-200 pips, so divide by 162 for reasonable scale
  const pipAdvantageScore = (pipDiff / 162) * POSITION_WEIGHTS.pipAdvantage
  
  // 2. Blot safety assessment
  const blots = identifyBlots(boardState, playerOwner)
  const opponentPositions = identifyOpponentPositions(boardState, playerOwner)
  const playerMadePoints = getMadePoints(boardState, playerOwner)
  
  let totalBlotRisk = 0
  for (const blotPoint of blots) {
    const risk = calculateBlotRisk(blotPoint, opponentPositions, playerMadePoints, playerOwner)
    totalBlotRisk += risk.weightedRisk
  }
  // Average risk per blot, normalized
  const avgBlotRisk = blots.length > 0 ? totalBlotRisk / blots.length : 0
  const blotSafetyScore = avgBlotRisk * blots.length * POSITION_WEIGHTS.blotSafety
  
  // 3. Made points strength
  const madePointsCount = playerMadePoints.length
  // Bonus for key points (bar-points, 5-point, etc.)
  const keyPoints = playerOwner === 'white' ? [5, 7] : [18, 20]
  let keyPointsBonus = 0
  for (const point of keyPoints) {
    if (playerMadePoints.includes(point)) {
      keyPointsBonus += 0.5
    }
  }
  const madePointsScore = (madePointsCount + keyPointsBonus) * POSITION_WEIGHTS.madePoints
  
  // 4. Prime strength
  const primeLength = checkPrimeLength(boardState, playerOwner)
  // Bonus for longer primes (exponential scaling)
  const primeStrength = primeLength >= 4 ? primeLength * 1.5 : primeLength
  const primeScore = primeStrength * POSITION_WEIGHTS.primeStrength
  
  // 5. Home board strength
  const homeBoardStart = playerOwner === 'white' ? 1 : 19
  const homeBoardEnd = playerOwner === 'white' ? 6 : 24
  const homeBoardCheckers = countCheckersInRange(boardState, playerOwner, homeBoardStart, homeBoardEnd)
  const homeBoardMadePoints = playerMadePoints.filter(p => p >= homeBoardStart && p <= homeBoardEnd).length
  // Stronger home board = better bear-off position
  const homeBoardScore = (homeBoardCheckers * 0.1 + homeBoardMadePoints * 0.5) * POSITION_WEIGHTS.homeBoardStrength
  
  // 6. Anchor strength (back game potential)
  const opponentHomeStart = playerOwner === 'white' ? 19 : 1
  const opponentHomeEnd = playerOwner === 'white' ? 24 : 6
  const anchors = []
  for (let point = opponentHomeStart; point <= opponentHomeEnd; point++) {
    const pointData = boardState.points[point - 1]
    if (pointData.owner === playerOwner && pointData.count >= 2) {
      anchors.push(point)
    }
  }
  // Anchors in opponent's home board are valuable
  const anchorScore = anchors.length * POSITION_WEIGHTS.anchorStrength
  
  // 7. Contact advantage (tactical position)
  const inContact = hasContact(boardState)
  let contactScore = 0
  if (inContact) {
    // Advantage if you have more made points and fewer blots
    const opponentBlots = identifyBlots(boardState, opponentOwner)
    const opponentMadePoints = getMadePoints(boardState, opponentOwner)
    const madePointsDiff = madePointsCount - opponentMadePoints.length
    const blotDiff = opponentBlots.length - blots.length
    contactScore = (madePointsDiff * 0.3 + blotDiff * 0.2) * POSITION_WEIGHTS.contactAdvantage
  }
  
  // Calculate total position score
  const totalScore = pipAdvantageScore + blotSafetyScore + madePointsScore + 
                     primeScore + homeBoardScore + anchorScore + contactScore
  
  return {
    score: totalScore,
    breakdown: {
      pipAdvantage: { diff: pipDiff, score: pipAdvantageScore },
      blotSafety: { blots: blots.length, avgRisk: avgBlotRisk, score: blotSafetyScore },
      madePoints: { count: madePointsCount, keyPointsBonus, score: madePointsScore },
      primeStrength: { length: primeLength, score: primeScore },
      homeBoard: { checkers: homeBoardCheckers, madePoints: homeBoardMadePoints, score: homeBoardScore },
      anchors: { count: anchors.length, positions: anchors, score: anchorScore },
      contact: { inContact, score: contactScore }
    }
  }
}

/**
 * Evaluate position difference between two board states
 * Useful for comparing positions before/after moves
 */
function evaluatePositionDifference(beforeState, afterState, playerOwner) {
  const beforeEval = evaluatePosition(beforeState, playerOwner)
  const afterEval = evaluatePosition(afterState, playerOwner)
  
  return {
    scoreDiff: afterEval.score - beforeEval.score,
    before: beforeEval,
    after: afterEval
  }
}



/**
 * Format move for display - converts absolute coordinates to relative based on player
 */
// formatMove is now imported from utils/moveFormatter
