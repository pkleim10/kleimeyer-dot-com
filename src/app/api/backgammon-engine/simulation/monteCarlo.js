/**
 * Monte Carlo simulation functions for backgammon engine
 */

import { debugFetchLog } from '../config/debugConfig.js'
import { cloneBoardState, applyMoveToBoardForAnalysis, isGameOver, getWinner } from '../utils/boardUtils.js'
import { evaluateMoveHeuristically } from '../evaluation/moveEvaluation.js'
import { formatMove, sortMoves, rebuildDescription } from '../../../../utils/moveFormatter'
import { getRandomLegalMove } from '../moveGeneration/moveGeneration.js'

/**
 * Generate random dice roll
 */
export function getRandomDice() {
  const d1 = Math.floor(Math.random() * 6) + 1
  const d2 = Math.floor(Math.random() * 6) + 1
  return d1 === d2 ? [d1, d1, d1, d1] : [d1, d2]
}

/**
 * Run Monte Carlo simulation for a move combination
 */
export function runMonteCarlo(boardState, moveCombination, playerOwner, numSimulations = 20) {
  const opponentOwner = playerOwner === 'white' ? 'black' : 'white'
  let wins = 0
  let losses = 0
  let discards = 0
  let totalSims = 0

  for (let i = 0; i < numSimulations; i++) {
    // Special detailed logging for first simulation
    const detailedLogging = i === 0
    let gameMoves = []

    // Apply the move combination to get new board state
    let currentBoard = cloneBoardState(boardState)
    const moves = moveCombination.moves || [moveCombination]
    for (const move of moves) {
      currentBoard = applyMoveToBoardForAnalysis(currentBoard, move, playerOwner)
    }

    // Simulate random playout until game end or max moves
    let currentPlayer = opponentOwner
    let movesMade = 0

    const maxMovesForComplete = 400 // Allow longer games for complete evaluation
    while (!isGameOver(currentBoard, true) && movesMade < maxMovesForComplete) {
      const randomDice = getRandomDice()
      const turnState = {
        currentPlayer,
        dice: randomDice,
        usedDice: [],
        mustEnterFromBar: (currentPlayer === 'white' ? currentBoard.whiteBar : currentBoard.blackBar) > 0
      }


      const randomTurn = getRandomLegalMove(currentBoard, turnState)
      if (!randomTurn) {
        // No legal moves - pass turn to other player
        currentPlayer = currentPlayer === 'white' ? 'black' : 'white'
        movesMade++
        continue
      }

      // Detailed logging for first simulation
      if (detailedLogging) {
        const diceStr = randomDice.sort((a, b) => b - a).join('') // Format like "61"
        const moveStr = randomTurn.moves.map(m => {
          const formattedMove = formatMove({ from: m.from, to: m.to, hitBlot: m.hitBlot }, currentPlayer === 'white' ? 1 : -1)
          return formattedMove
        }).join(' ')

        // Generate XGID after moves are applied
        const points = currentBoard.points.map(p => {
          if (p.count === 0) return '-'
          if (p.owner === 'black') {
            return String.fromCharCode('a'.charCodeAt(0) + Math.min(p.count - 1, 14)) // a=1, o=15 (lowercase = black)
          } else {
            return String.fromCharCode('A'.charCodeAt(0) + Math.min(p.count - 1, 14)) // A=1, O=15 (uppercase = white)
          }
        }).join('')

        const blackBarChar = currentBoard.blackBar === 0 ? '-' :
          String.fromCharCode('a'.charCodeAt(0) + Math.min(currentBoard.blackBar - 1, 14))

        const whiteBarChar = currentBoard.whiteBar === 0 ? '-' :
          String.fromCharCode('A'.charCodeAt(0) + Math.min(currentBoard.whiteBar - 1, 14))

        const xgid = blackBarChar + points + whiteBarChar

        const playerName = currentPlayer === 'white' ? 'White' : 'Black'
        gameMoves.push(`${playerName}: ${diceStr}: ${moveStr}     XGID: ${xgid}`)
      }

      const randomMoves = randomTurn.moves || [randomTurn]
      for (const move of randomMoves) {
        currentBoard = applyMoveToBoardForAnalysis(currentBoard, move, currentPlayer)
      }

      currentPlayer = currentPlayer === 'white' ? 'black' : 'white'
      movesMade++
    }

    // Check if game ended with a winner
    const winner = getWinner(currentBoard, true)
    if (winner) {
      totalSims++
      if (winner === playerOwner) {
        wins++
      } else {
        losses++
      }

      // Simulation statistics tracking (logging removed)
    } else {
      // Game didn't complete within move limit - discard
      discards++
    }
    // For complete games, log detailed moves for discarded first simulation
    if (!winner && detailedLogging) {
      console.log('')
      console.log('Game 1')

      // Output each move sequentially
      for (let m = 0; m < gameMoves.length; m++) {
        console.log(`${m + 1}. ${gameMoves[m]}`)
      }

      console.log(`\nGame discarded after ${movesMade} moves (exceeded ${maxMovesForComplete} move limit)`)
      console.log('Complete move sequence shown above.')
      console.log('')
    }
  }

  return totalSims > 0 ? wins / totalSims : 0.5
}

/**
 * Run Monte Carlo simulation with detailed move tracking
 */
export function runMonteCarloWithMoveTracking(boardState, moveCombination, playerOwner) {
  const opponentOwner = playerOwner === 'white' ? 'black' : 'white'

  const gameMoves = []

  console.log(`[MC-Tracking] Starting move tracking simulation`)

  // Prepare the moves array
  const movesArray = moveCombination.moves || [moveCombination]

  // Apply the opening move combination
  let currentBoard = cloneBoardState(boardState)
  for (const move of movesArray) {
    currentBoard = applyMoveToBoardForAnalysis(currentBoard, move, playerOwner)
  }

  // Record the opening move (candidate move being evaluated) - force formatting from player perspective
  const playerNum = playerOwner === 'white' ? 1 : -1
  const sortedMoves = [...movesArray].sort((a, b) => {
    const aIsBar = a.fromBar || a.from === 25 || a.from === 0
    const bIsBar = b.fromBar || b.from === 25 || b.from === 0

    // Bar moves always come first
    if (aIsBar && !bIsBar) return -1
    if (!aIsBar && bIsBar) return 1

    // Convert absolute positions to relative display values
    const aFromRelative = playerOwner === 'black' ? 25 - a.from : a.from
    const bFromRelative = playerOwner === 'black' ? 25 - b.from : b.from

    // Sort by relative from point (highest first)
    if (aFromRelative !== bFromRelative) return bFromRelative - aFromRelative
    return b.to - a.to
  })

  const openingMoveDesc = sortedMoves.map(m => {
    const formattedMove = formatMove({ from: m.from, to: m.to, hitBlot: m.hitBlot }, playerNum)
    return formattedMove
  }).join(' ')

  // Get dice from board state (XGID dice) - this is the roll that makes the candidate move legal
  const openingDice = boardState.dice ? boardState.dice.split('').map(d => parseInt(d)) : [6, 1] // fallback to 6-1
  const openingDiceStr = openingDice.sort((a, b) => b - a).join('') // Sort descending like "61"
  const playerName = playerOwner === 'white' ? 'White' : 'Black'

  // Generate XGID after opening moves are applied
  const points = currentBoard.points.map(p => {
    if (p.count === 0) return '-'
    if (p.owner === 'black') {
      return String.fromCharCode('a'.charCodeAt(0) + Math.min(p.count - 1, 14)) // a=1, o=15 (lowercase = black)
    } else {
      return String.fromCharCode('A'.charCodeAt(0) + Math.min(p.count - 1, 14)) // A=1, O=15 (uppercase = white)
    }
  }).join('')

  const blackBarChar = currentBoard.blackBar === 0 ? '-' :
    String.fromCharCode('a'.charCodeAt(0) + Math.min(currentBoard.blackBar - 1, 14))

  const whiteBarChar = currentBoard.whiteBar === 0 ? '-' :
    String.fromCharCode('A'.charCodeAt(0) + Math.min(currentBoard.whiteBar - 1, 14))

  const openingXgid = blackBarChar + points + whiteBarChar
  const openingMoveEntry = `${playerName}: ${openingDiceStr}: ${openingMoveDesc}     XGID: ${openingXgid}`

  // Add opening move to the game moves
  gameMoves.push(openingMoveEntry)

  // Simulate random playout until game end or max moves
  let currentPlayer = opponentOwner
  let movesMade = 0

  const maxMovesForComplete = 400 // Allow longer games for complete evaluation

  while (!isGameOver(currentBoard, true) && movesMade < maxMovesForComplete) {
    const randomDice = getRandomDice()
    const turnState = {
      currentPlayer,
      dice: randomDice,
      usedDice: [],
      mustEnterFromBar: (currentPlayer === 'white' ? currentBoard.whiteBar : currentBoard.blackBar) > 0
    }

    // Get one random legal complete turn for this dice roll using fast sampling
    const randomTurn = getRandomLegalMove(currentBoard, turnState)


      if (!randomTurn) {
        // No legal moves - player passes their turn
        console.log(`[MC-Tracking] No legal turns for ${currentPlayer} with dice ${randomDice.join('-')} - passing turn`)

        // Log the pass move
        const diceStr = randomDice.sort((a, b) => b - a).join('') // Sort descending like "61"
        const playerName = currentPlayer === 'white' ? 'White' : 'Black'

        // Generate XGID for current board state
        const points = currentBoard.points.map(p => {
          if (p.count === 0) return '-'
          if (p.owner === 'black') {
            return String.fromCharCode('a'.charCodeAt(0) + Math.min(p.count - 1, 14)) // a=1, o=15 (lowercase = black)
          } else {
            return String.fromCharCode('A'.charCodeAt(0) + Math.min(p.count - 1, 14)) // A=1, O=15 (uppercase = white)
          }
        }).join('')

        const blackBarChar = currentBoard.blackBar === 0 ? '-' :
          String.fromCharCode('a'.charCodeAt(0) + Math.min(currentBoard.blackBar - 1, 14))

        const whiteBarChar = currentBoard.whiteBar === 0 ? '-' :
          String.fromCharCode('A'.charCodeAt(0) + Math.min(currentBoard.whiteBar - 1, 14))

        const xgid = blackBarChar + points + whiteBarChar

        gameMoves.push(`${playerName}: ${diceStr}: (no legal moves)     XGID: ${xgid}`)

        currentPlayer = currentPlayer === 'white' ? 'black' : 'white'
        movesMade++
        continue
      }

      // Apply the random turn
      const randomMoves = randomTurn.moves || [randomTurn]
      for (const move of randomMoves) {
        currentBoard = applyMoveToBoardForAnalysis(currentBoard, move, currentPlayer)
      }

      // Log the move
      const diceStr = randomDice.sort((a, b) => b - a).join('') // Sort descending like "61"
      const moveStr = randomTurn.moves.map(m => {
        const formattedMove = formatMove({ from: m.from, to: m.to, hitBlot: m.hitBlot }, currentPlayer === 'white' ? 1 : -1)
        return formattedMove
      }).join(' ')

      // Generate XGID after moves are applied
      const points = currentBoard.points.map(p => {
        if (p.count === 0) return '-'
        if (p.owner === 'black') {
          return String.fromCharCode('a'.charCodeAt(0) + Math.min(p.count - 1, 14)) // a=1, o=15 (lowercase = black)
        } else {
          return String.fromCharCode('A'.charCodeAt(0) + Math.min(p.count - 1, 14)) // A=1, O=15 (uppercase = white)
        }
      }).join('')

      const blackBarChar = currentBoard.blackBar === 0 ? '-' :
        String.fromCharCode('a'.charCodeAt(0) + Math.min(currentBoard.blackBar - 1, 14))

      const whiteBarChar = currentBoard.whiteBar === 0 ? '-' :
        String.fromCharCode('A'.charCodeAt(0) + Math.min(currentBoard.whiteBar - 1, 14))

      const xgid = blackBarChar + points + whiteBarChar

      const playerName = currentPlayer === 'white' ? 'White' : 'Black'
      gameMoves.push(`${playerName}: ${diceStr}: ${moveStr}     XGID: ${xgid}`)

      currentPlayer = currentPlayer === 'white' ? 'black' : 'white'
      movesMade++
    }

    // Check if game ended with a winner
    const winner = getWinner(currentBoard, true)
    if (winner) {
      console.log(`[MC-Tracking] Game completed in ${movesMade} moves. Winner: ${winner}`)
    } else {
      console.log(`[MC-Tracking] Game discarded after ${movesMade} moves (exceeded ${maxMovesForComplete} move limit)`)
    }

    console.log('[MC-Tracking] Complete game sequence:')
    for (let i = 0; i < gameMoves.length; i++) {
      console.log(`  ${i + 1}. ${gameMoves[i]}`)
    }

    return gameMoves
}

/**
 * Evaluate move using hybrid heuristic + Monte Carlo approach
 */
export function evaluateMoveHybrid(boardState, move, playerOwner, numSimulations = 20, heuristicWeight = 0.50, mcWeight = 0.50) {
  const heuristicResult = evaluateMoveHeuristically(boardState, move, playerOwner)
  const heuristicScore = heuristicResult.score
  console.log(`[MC] 🚀 About to call runMonteCarlo for move: ${move.description}`)
  const mcScore = runMonteCarlo(boardState, move, playerOwner, numSimulations)

  // Normalize HE score to 0-1 range to match MC score range
  // HE typically ranges from ~0.5 (bad) to ~2.5 (good)
  const HE_MIN = 0.5
  const HE_MAX = 2.5
  const normalizedHE = Math.max(0, Math.min(1, (heuristicScore - HE_MIN) / (HE_MAX - HE_MIN)))

  // Combine normalized scores (weighted average)
  const hybridScore = (normalizedHE * heuristicWeight) + (mcScore * mcWeight)

  return {
    move,
    heuristicScore,
    heuristicBreakdown: heuristicResult.breakdown,
    mcScore,
    hybridScore
  }
}

/**
 * Analyze moves using hybrid engine (heuristic + Monte Carlo)
 */
export function analyzeMovesWithHybridEngine(boardState, moves, playerOwner, numSimulations = 20, heuristicWeight = 0.50, mcWeight = 0.50) {
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


  // FIXED LOGIC: Select winner based on highest hybrid score (HE + MC combined)
  // This ensures moves with excellent strategic value (HE) but challenging MC evaluation
  // are not unfairly penalized

  console.log(`[HybridSelection] Evaluating all moves by hybrid score:`)
  evaluations.forEach((evaluation, idx) => {
    console.log(`  ${idx + 1}. ${evaluation.move.description}: HE=${evaluation.heuristicScore.toFixed(3)}, MC=${evaluation.mcScore.toFixed(3)}, Hybrid=${evaluation.hybridScore.toFixed(3)}`)
  })

  // Step 1: Select the move with the highest hybrid score
  const bestEvaluation = evaluations.reduce((best, current) =>
    current.hybridScore > best.hybridScore ? current : best
  )

  console.log(`[HybridSelection] Selected winner: ${bestEvaluation.move.description}`)
  console.log(`  Best Hybrid Score: ${bestEvaluation.hybridScore.toFixed(3)} (HE: ${bestEvaluation.heuristicScore.toFixed(3)}, MC: ${bestEvaluation.mcScore.toFixed(3)})`)

  // Find MC performance ranking for context
  const mcSorted = [...evaluations].sort((a, b) => b.mcScore - a.mcScore)
  const mcRank = mcSorted.findIndex(evaluation => evaluation.move.description === bestEvaluation.move.description) + 1
  console.log(`  MC Ranking: ${mcRank}${mcRank === 1 ? 'st' : mcRank === 2 ? 'nd' : mcRank === 3 ? 'rd' : 'th'} of ${evaluations.length} moves`)

  // Calculate statistical confidence based on hybrid score differences
  const bestHybridScore = bestEvaluation.hybridScore
  let confidence = 0.5 // Default moderate confidence

  // Find the second-best hybrid score
  const sortedByHybrid = [...evaluations]
    .map(evaluation => evaluation.hybridScore)
    .sort((a, b) => b - a)

  if (sortedByHybrid.length > 1) {
    const secondBestHybridScore = sortedByHybrid[1]
    const hybridDifference = bestHybridScore - secondBestHybridScore

    // Hybrid scores are on different scales (HE is ~0.5-2.5, MC is 0-1)
    // Normalize the difference relative to the score range
    const hybridRange = 2.0 // Approximate range of hybrid scores (0-2)
    const normalizedDifference = hybridDifference / hybridRange

    // Convert to confidence based on normalized difference
    if (normalizedDifference > 0.3) confidence = 0.95 // Very clear winner
    else if (normalizedDifference > 0.2) confidence = 0.85 // Clear winner
    else if (normalizedDifference > 0.15) confidence = 0.75 // Strong preference
    else if (normalizedDifference > 0.1) confidence = 0.65 // Moderate preference
    else if (normalizedDifference > 0.05) confidence = 0.55 // Slight preference
    else confidence = 0.50 // Very close decision
  }


  // Consider MC score reliability as well
  const bestMCScore = bestEvaluation.mcScore
  if (bestMCScore > 0.7) confidence = Math.max(confidence, 0.8) // Strong MC support
  if (bestMCScore > 0.8) confidence = Math.max(confidence, 0.9) // Very strong MC support

  // Reduce confidence for small sample sizes
  if (numSimulations < 100) confidence *= 0.8
  else if (numSimulations < 250) confidence *= 0.9

  const bestMove = bestEvaluation.move
    // #region agent log
    debugFetchLog('route.js:143', 'analyzeMovesWithHybridEngine bestMove BEFORE check', { description: bestMove.description, moves: bestMove.moves?.map(m => ({ from: m.from, to: m.to, fromBar: m.fromBar || false, die: m.die })) })
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
          debugFetchLog('route.js:150', 'BUG DETECTED: Moves array has bar move but bar is NOT first', { description: bestMove.description, moves: bestMove.moves.map(m => ({ from: m.from, to: m.to, fromBar: m.fromBar || false })) })
          // #endregion
          // Re-sort moves array to ensure bar moves come first
          const checkIsBarMove = (m) => m.fromBar || m.from === 25 || m.from === 0
          bestMove.moves.sort((a, b) => {
            const aIsBar = checkIsBarMove(a)
            const bIsBar = checkIsBarMove(b)
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
          debugFetchLog('route.js:165', 'Fixed bestMove moves array and description', { fixedDescription: bestMove.description, fixedMoves: bestMove.moves.map(m => ({ from: m.from, to: m.to, fromBar: m.fromBar || false })) })
          // #endregion
        }
      }
    }

    // #region agent log
    debugFetchLog('route.js:170', 'analyzeMovesWithHybridEngine bestMove AFTER check', { description: bestMove.description, moves: bestMove.moves?.map(m => ({ from: m.from, to: m.to, fromBar: m.fromBar || false, die: m.die })) })
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
      confidence: Math.round(confidence * 100) / 100, // Round to 2 decimal places
      evaluations, // Include all evaluations with HE, MC, and hybrid scores
      hybridScore: evaluations[0].hybridScore.toFixed(3),
      heuristicScore: evaluations[0].heuristicScore.toFixed(3),
      mcScore: evaluations[0].mcScore.toFixed(3),
      factorScores: evaluations.map((evaluation, idx) => {
        // Check if this is the winning move
        const isWinner = bestEvaluation.move.description === evaluation.move.description


        return {
          moveNumber: idx + 1,
          moveDescription: formatMove(evaluation.move, currentPlayer), // Raw form for code use
          normalizedMoveDescription: formatMove(evaluation.move, currentPlayer, { collapseSequences: true }), // Collapsed form for display
          rawMoveDescription: formatMove(evaluation.move, currentPlayer), // Raw absolute coordinates for display
          scores: `Heuristic: ${evaluation.heuristicScore.toFixed(3)} | MC: ${evaluation.mcScore.toFixed(3)} | Total: ${evaluation.hybridScore.toFixed(3)}`,
          isWinner, // Whether this is the winning move
          breakdown: evaluation.heuristicBreakdown // Include detailed breakdown
        }
      }),
      bestMove: bestMove // Keep reference to actual best move
    }
}