/**
 * Backgammon Engine API Route
 * Provides server-side hybrid heuristic + Monte Carlo engine for move analysis
 * Debug logging controlled by NEXT_PUBLIC_DEBUG_LOGGING environment variable
 * All syntax errors in debugFetchLog calls have been resolved
 */

import { getLegalMoves } from './getLegalMoves.js'
import { formatMove, rebuildDescription, sortMoves } from '../../../utils/moveFormatter'
import { hasPlayerWon, hasContactSituation } from '../../other-fun-stuff/backgammon-resources/opening-moves/utils/gameLogic.js'
import { debugLog } from '@/config/debug.js'
import { HEURISTIC_WEIGHTS, POSITION_WEIGHTS } from './config/heuristicWeights.js'
import { debugFetchLog } from './config/debugConfig.js'
import { boardToArray, displayBoard, cloneBoardState, applyMoveToBoardForAnalysis, calculateFinalBoardState, parseXGID } from './utils/boardUtils.js'
import { identifyBlots, identifyOpponentPositions, getMadePoints, calculatePipCounts, checkForHit } from './utils/boardAnalysis.js'
import { evaluateMoveHeuristically, buildVerifiedMoveAnalysis, calculateHitProbabilityForDistance, calculateHitImpact, calculateBlotRisk, identifyPointsMade, calculateBuilderCoverage, getMaxStackSize, checkPrimeLength } from './evaluation/moveEvaluation.js'
import { evaluatePosition, evaluatePositionDifference } from './evaluation/positionEvaluation.js'
import { getRandomDice, runMonteCarlo, runMonteCarloWithMoveTracking, evaluateMoveHybrid, analyzeMovesWithHybridEngine } from './simulation/monteCarlo.js'
import { getRandomLegalMove, findRandomMoveForDie, applyMove } from './moveGeneration/moveGeneration.js'



/**
 * Evaluate move using heuristic scoring
 */


/**
 * Check if a move is valid in array format
 */
function canPlayerBearOff(board, playerIndex) {
  // Player can bear off if all their checkers are in their home board
  // Home board: points 1-6 for white (playerIndex 0), points 19-24 for black (playerIndex 1)

  const homeStart = playerIndex === 0 ? 1 : 19
  const homeEnd = playerIndex === 0 ? 6 : 24

  // Check if any checkers are outside home board
  for (let point = 1; point <= 24; point++) {
    if ((point < homeStart || point > homeEnd) && board[point][playerIndex] > 0) {
      return false
    }
  }

  // Check if any checkers are on the bar
  if (board[playerIndex === 0 ? 0 : 25][playerIndex] > 0) {
    return false
  }

  return true
}

function isValidMove(board, fromPoint, dieValue, playerIndex) {
  // Must have at least one checker on the point
  if (board[fromPoint][playerIndex] === 0) return false

  // Calculate target point based on player direction and move type
  let toPoint
  const isBarMove2 = (fromPoint === 0 && playerIndex === 0) || (fromPoint === 25 && playerIndex === 1)

  if (isBarMove2) {
    // Bar moves: entering the board on opponent's home board
    if (playerIndex === 0) { // White enters on points 19-24
      toPoint = 25 - dieValue  // 24-19
    } else { // Black enters on points 1-6
      toPoint = dieValue  // 1-6
    }
  } else {
    // Regular moves
    if (playerIndex === 0) { // White moves toward lower numbers
      toPoint = fromPoint - dieValue
    } else { // Black moves toward higher numbers
      toPoint = fromPoint + dieValue
    }
  }

  // Check if this is a bearing off move (moving beyond home board)
  const isBearingOff = (playerIndex === 0 && toPoint < 1) || (playerIndex === 1 && toPoint > 24)

  if (isBearingOff) {
    // For bearing off, check if player can bear off (all checkers in home board)
    const canBearOff = canPlayerBearOff(board, playerIndex)
    return canBearOff
  }

  // Regular move - can't move beyond the board boundaries
  if (toPoint < 1 || toPoint > 24) return false

  // Cannot land on points with 2+ opponent checkers (made point)
  const targetOpponent = board[toPoint][1 - playerIndex]
  return targetOpponent < 2  // Can hit single checker, cannot land on made point
}

/**
 * Apply a move to the board array
 */


/**
 * Find a single random legal move with a specific die value
 */

/**
 * Generate a complete random turn using sequential die processing
 * Uses fast random sampling to find moves for each die in sequence
 */

/**
 * Run Monte Carlo simulations for move evaluation
 */



/**
 * Validate hybrid suggestion and return move combination
 */
function validateAndReturnMove(hybridAnalysis, moves) {
  const { bestMoveIndex, reasoning, confidence, factorScores, bestMove, hybridScore, heuristicScore, mcScore } = hybridAnalysis

  // Prefer using bestMove directly if available (most reliable)
  if (bestMove) {
    // #region agent log
    debugFetchLog('route.js:190', 'validateAndReturnMove bestMove BEFORE check', { description: bestMove.description, moves: bestMove.moves?.map(m => ({ from: m.from, to: m.to, fromBar: m.fromBar || false, die: m.die })) })
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
          debugFetchLog('route.js:195', 'BUG DETECTED in validateAndReturnMove: Moves array has bar move but bar is NOT first', { description: bestMove.description, moves: bestMove.moves.map(m => ({ from: m.from, to: m.to, fromBar: m.fromBar || false })) })
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
          debugFetchLog('route.js:210', 'Fixed bestMove in validateAndReturnMove', { fixedDescription: bestMove.description, fixedMoves: bestMove.moves.map(m => ({ from: m.from, to: m.to, fromBar: m.fromBar || false })) })
          // #endregion
        }
      }
    }
    // #region agent log
    debugFetchLog('route.js:215', 'validateAndReturnMove bestMove AFTER check', { description: bestMove.description, moves: bestMove.moves?.map(m => ({ from: m.from, to: m.to, fromBar: m.fromBar || false, die: m.die })) })
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
          const checkIsBarMove = (m) => m.fromBar || m.from === 25 || m.from === 0
          selectedCombination.moves.sort((a, b) => {
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




// Export functions for testing (re-export getLegalMoves from module)
export { parseXGID, createTurnState, getLegalMoves }

export async function POST(request) {
  console.log('=== BACKGAMMON ENGINE API CALLED ===')

  console.log('=== BACKGAMMON ENGINE API CALLED ===')

  const requestBody = await request.json()
  console.log('[API] Processing request:', {
    xgid: requestBody.xgid,
    player: requestBody.player,
    numSimulations: requestBody.numSimulations,
    usedDice: requestBody.usedDice,
    allParams: Object.keys(requestBody)
  })

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
      debugFetchLog('route.js:327', 'API POST entry', {timestamp:Date.now()})
      // #endregion
      const { xgid, player, difficulty = 'advanced', maxTopMoves = 6, numSimulations = 20, debug = false, usedDice = [], dice, heuristicWeight = 0.50, mcWeight = 0.50, skipLegalMoves = false } = requestBody

      const effectiveNumSimulations = numSimulations


      // Validate input
      if (!xgid) {
        console.log('[API] ERROR: No XGID provided')
        return Response.json(
          { error: 'XGID is required' },
          { status: 400 }
        )
      }

      console.log(`[API] Processing: xgid=${xgid.substring(0,10)}..., player=${player}, dice=${JSON.stringify(dice)}, usedDice=${JSON.stringify(usedDice)}`)
      console.error(`[API] Processing: xgid=${xgid.substring(0,10)}..., player=${player}, dice=${JSON.stringify(dice)}, usedDice=${JSON.stringify(usedDice)}`)

      // #region agent log
      debugFetchLog('route.js:341', 'Before parseXGID', {xgid:xgid.substring(0,50),player,difficulty,maxTopMoves,usedDiceLength:usedDice.length})
      // #endregion

      // Parse position and generate legal moves
      const boardState = parseXGID(xgid)

      const fs = require('fs');
      const debugLog = (msg) => {
        console.log(msg);
        fs.appendFileSync('/tmp/backgammon_debug.log', msg + '\n');
      };


      // #region agent log
      debugFetchLog('route.js:344', 'Before createTurnState', {boardStatePlayer:boardState.player,boardStateDice:boardState.dice})
      // #endregion

      // Create turn state for legal move generation
      const turnState = createTurnState(boardState, player, dice)
      console.log(`[API] Created turn state: currentPlayer=${turnState.currentPlayer}, dice=${JSON.stringify(turnState.dice)}`)
      // If usedDice is provided, update turn state to reflect already used dice
      if (usedDice && usedDice.length > 0) {
        turnState.usedDice = usedDice
        console.log(`[API] Updated usedDice: ${JSON.stringify(turnState.usedDice)}`)
      }
      
      // #region agent log
      debugFetchLog('route.js:349', 'Before getLegalMoves', {turnStateCurrentPlayer:turnState.currentPlayer,turnStateDice:turnState.dice,turnStateUsedDice:turnState.usedDice})
      // #endregion
      
      let allLegalMoves = []
      if (!skipLegalMoves) {
        allLegalMoves = getLegalMoves(boardState, turnState)

        // #region agent log
        debugFetchLog('route.js:349', 'After getLegalMoves', {
          allLegalMovesLength: allLegalMoves.length,
          singleMoves: allLegalMoves.filter(m => (m.moves?.length || 1) === 1).length,
          multiMoves: allLegalMoves.filter(m => (m.moves?.length || 1) > 1).length
        })
        // #endregion

        if (allLegalMoves.length === 0) {
          console.log('[API] RESULT: No legal moves found')
          return Response.json({
            move: null,
            reasoning: "No legal moves available",
            confidence: 1.0,
            source: 'local'
          })
        }

        console.log(`[API] Found ${allLegalMoves.length} legal moves`)
      } else {
        // Skip all expensive processing for MC-only testing
        // Run Monte Carlo directly with a dummy move for tracking
        const dummyMove = {
          moves: [{ from: 13, to: 10, die: 3 }],
          description: "13/10",
          totalPips: 3,
          heuristicScore: 0,
          mcScore: 0
        }

        // Run Monte Carlo simulation
        const mcResults = runMonteCarloWithMoveTracking(boardState, dummyMove, player === 1 ? 'white' : 'black')

        return Response.json({
          move: dummyMove,
          reasoning: "Fast MC simulation (legal moves skipped)",
          confidence: 0.5,
          source: 'local',
          mcResults: mcResults,
          trackedSimulation: mcResults
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

      // Debug info will be created after hybrid analysis
      
      // Sort by heuristic score descending for display
      allHeuristicEvaluations.sort((a, b) => {
        const aScore = Number(a.heuristicScore)
        const bScore = Number(b.heuristicScore)
        return bScore - aScore
      })

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
            opponentBlotCount: `${breakdown.opponentBlotCount.count} (${breakdown.opponentBlotCount.score.toFixed(3)})`,
            highRollBonus: `${breakdown.highRollBonus.rawBonus.toFixed(2)} (${breakdown.highRollBonus.score.toFixed(3)})`
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
      debugFetchLog('route.js:373', 'Top moves selected', {
        topMovesLength: topMoves.length,
        topSingleMoves: topMoves.filter(m => (m.moves?.length || 1) === 1).length,
        topMultiMoves: topMoves.filter(m => (m.moves?.length || 1) > 1).length
      })
      // #endregion

      // Get hybrid engine analysis
      // playerOwner already defined above
      
      // #region agent log
      debugFetchLog('route.js:378', 'Before analyzeMovesWithHybridEngine', {playerOwner,topMovesLength:topMoves.length})
      // #endregion
      
      const hybridAnalysis = analyzeMovesWithHybridEngine(boardState, topMoves, playerOwner, effectiveNumSimulations, heuristicWeight, mcWeight)

      // Always run a tracked simulation for the first simulated game to show detailed moves and board positions
      let firstGameSimulation = null
      if (topMoves.length > 0) {
        console.log('[MC-Tracking] Running tracked simulation for the first move to show detailed game progression...')
        firstGameSimulation = runMonteCarloWithMoveTracking(boardState, topMoves[0], playerOwner, true) // Enable enhanced logging
        console.log(`[MC-Tracking] First game simulation completed: ${firstGameSimulation.totalMoves} moves, winner: ${firstGameSimulation.winner || 'none'}`)

        // Log detailed first game simulation to console
        console.log('\n=== FIRST GAME SIMULATION ===')
        firstGameSimulation.gameMoves.forEach((move, i) => {
          console.log(`${i + 1}. ${move}`)
        })
        console.log(`Game ended with ${firstGameSimulation.winner || 'no'} winner after ${firstGameSimulation.totalMoves} moves`)


        // Also write to debug log
        const fs = require('fs')
        let debugMsg = `\n=== FIRST GAME SIMULATION ===\n`
        firstGameSimulation.gameMoves.forEach((move, i) => {
          debugMsg += `${i + 1}. ${move}\n`
        })
        debugMsg += `Game ended with ${firstGameSimulation.winner || 'no'} winner after ${firstGameSimulation.totalMoves} moves\n`
        fs.appendFileSync('/tmp/backgammon_debug.log', debugMsg)

        // Generate ASCII board display for the final position
        if (firstGameSimulation.finalBoard) {
          firstGameSimulation.asciiBoard = displayBoard(firstGameSimulation.finalBoard)

          // Generate final XGID
          const points = firstGameSimulation.finalBoard.points.map(p => {
            if (p.count === 0) return '-'
            if (p.owner === 'black') {
              return String.fromCharCode('a'.charCodeAt(0) + Math.min(p.count - 1, 14)) // a=1, o=15 (lowercase = black)
            } else {
              return String.fromCharCode('A'.charCodeAt(0) + Math.min(p.count - 1, 14)) // A=1, O=15 (uppercase = white)
            }
          }).join('')

          const blackBarChar = firstGameSimulation.finalBoard.blackBar === 0 ? '-' :
            String.fromCharCode('a'.charCodeAt(0) + Math.min(firstGameSimulation.finalBoard.blackBar - 1, 14))

          const whiteBarChar = firstGameSimulation.finalBoard.whiteBar === 0 ? '-' :
            String.fromCharCode('A'.charCodeAt(0) + Math.min(firstGameSimulation.finalBoard.whiteBar - 1, 14))

          firstGameSimulation.finalXGID = blackBarChar + points + whiteBarChar
        }
      }

      // #region agent log
      debugFetchLog('route.js:378', 'After analyzeMovesWithHybridEngine', {hasBestMove:!!hybridAnalysis.bestMove,bestMoveIndex:hybridAnalysis.bestMoveIndex,bestMoveDescription:hybridAnalysis.bestMove?.description,bestMoveMovesLength:hybridAnalysis.bestMove?.moves?.length||1,reasoning:hybridAnalysis.reasoning})
      // #endregion

      // Collect debug information (after hybrid analysis for complete scores)
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
        allMoves: hybridAnalysis.evaluations?.map(evaluation => ({
          description: evaluation.move.description,
          heuristicScore: evaluation.heuristicScore,
          mcScore: evaluation.mcScore,
          hybridScore: evaluation.hybridScore,
          breakdown: evaluation.heuristicBreakdown
        })) || []
      } : null

      // Validate and return best hybrid suggestion
      const result = validateAndReturnMove(hybridAnalysis, topMoves)
      
      // #region agent log
      debugFetchLog('route.js:432', 'Final result', {resultMoveDescription:result.move?.description,resultMoveMovesLength:result.move?.moves?.length||1,resultReasoning:result.reasoning,resultSource:result.source})
      // #endregion

      if (!debug) {
        delete result.factorScores
      }

      // Include debug info if requested
      if (debugInfo) {
        result.debug = debugInfo
      }

      // Include first game simulation data with detailed moves, XGID, and ASCII board
      if (firstGameSimulation) {
        result.firstGameSimulation = {
          allMoves: firstGameSimulation.gameMoves,
          finalXGID: firstGameSimulation.finalXGID,
          asciiBoard: firstGameSimulation.asciiBoard,
          totalMoves: firstGameSimulation.totalMoves,
          winner: firstGameSimulation.winner
        }
      }

      // Add comprehensive performance info
      result.performance = {
        totalElapsedMs: Date.now() - startTime,
        parameters: {
          maxTopMoves: maxTopMoves,
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
function createTurnState(boardState, player, customDice = null) {
  const owner = player === 1 ? 'white' : 'black'
  let dice = []

  // Use custom dice if provided
  if (customDice && Array.isArray(customDice)) {
    dice = customDice
  } else if (boardState.dice && boardState.dice !== '00') {
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
// INTERMEDIATE WIN DETERMINATION FOR COMPLETE GAMES
// ============================================================================
// Complete games use intermediate win determination:
// 1. Game continues until all checkers of either player are in home board
// 2. If no contact situation: player with all checkers in home board wins 100%
// 3. If contact situation: player with all checkers in home board wins 85%, opponent wins 15%
// 4. If maxMoves*10 reached without winner: simulation discarded (not counted)
//
// This provides more accurate evaluation than heuristic cutoffs while being faster than full bearing-off.

// ============================================================================
// DETERMINISTIC ENGINE - Verified calculations for hybrid engine system
// ============================================================================














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






// ============================================================================
// POSITION EVALUATION - Comprehensive heuristic position assessment
// ============================================================================


/**
 * Evaluate overall position quality for a player
 * Returns a score where positive values indicate advantage
 */

/**
 * Evaluate position difference between two board states
 * Useful for comparing positions before/after moves
 */



/**
 * Format move for display - converts absolute coordinates to relative based on player
 */
// formatMove is now imported from utils/moveFormatter
