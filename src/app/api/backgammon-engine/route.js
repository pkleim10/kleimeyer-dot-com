/**
 * Backgammon Engine API Route
 * Provides server-side hybrid heuristic + Monte Carlo engine for move analysis
 */

import { getLegalMoves } from './getLegalMoves'
import { formatMove, rebuildDescription, sortMoves } from '../../../utils/moveFormatter'

// Heuristic weights for move evaluation
const HEURISTIC_WEIGHTS = {
  blots: -0.5,     // Negative for safety
  hits: 0.3,       // Positive for aggression
  pointsMade: 0.4, // Positive for development
  pipGain: 0.2,    // Positive for efficiency
  homeBoard: 0.1,  // Positive for home board strength
  primeLength: 0.15 // Positive for blocking
}

/**
 * Evaluate move using heuristic scoring
 */
function evaluateMoveHeuristically(boardState, move, playerOwner) {
  const analysis = buildVerifiedMoveAnalysis(boardState, move, playerOwner)

  let score = 0
  score += analysis.blots.count * HEURISTIC_WEIGHTS.blots
  score += analysis.hits.count * HEURISTIC_WEIGHTS.hits
  score += analysis.pointsMade.newlyMade.length * HEURISTIC_WEIGHTS.pointsMade
  score += analysis.pips.gain * HEURISTIC_WEIGHTS.pipGain

  // Simple home board strength: count checkers in home board
  const homeBoardStart = playerOwner === 'white' ? 1 : 19
  const homeBoardEnd = playerOwner === 'white' ? 6 : 24
  const homeBoardCheckers = countCheckersInRange(boardState, playerOwner, homeBoardStart, homeBoardEnd)
  score += homeBoardCheckers * HEURISTIC_WEIGHTS.homeBoard

  // Simple prime potential: check for 6-point prime
  const primeLength = checkPrimeLength(boardState, playerOwner)
  score += primeLength * HEURISTIC_WEIGHTS.primeLength

  return score
}

/**
 * Run Monte Carlo simulations for move evaluation
 */
function runMonteCarlo(boardState, moveCombination, playerOwner, numSimulations = 3) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:46',message:'runMonteCarlo entry',data:{numSimulations,playerOwner},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  const opponentOwner = playerOwner === 'white' ? 'black' : 'white'
  let wins = 0
  
  // Cache for getLegalMoves calls to avoid redundant calculations within this simulation batch
  const legalMovesCache = new Map()
  
  const getCachedLegalMoves = (boardState, turnState) => {
    // Create a simple cache key from board state and turn state
    const boardKey = boardState.points.map(p => `${p.count}-${p.owner || 'null'}`).join(',')
    const cacheKey = `${boardKey}-${boardState.whiteBar}-${boardState.blackBar}-${turnState.currentPlayer}-${turnState.dice.join(',')}`
    if (legalMovesCache.has(cacheKey)) {
      return legalMovesCache.get(cacheKey)
    }
    const moves = getLegalMoves(boardState, turnState)
    legalMovesCache.set(cacheKey, moves)
    return moves
  }

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
    const maxMoves = 10 // Reduced from 20 to 10 for faster simulations

    while (!isGameOver(currentBoard) && movesMade < maxMoves) {
      const randomDice = getRandomDice()
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:64',message:'runMonteCarlo calling getLegalMoves',data:{simulation:i,movesMade,currentPlayer,randomDice},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      const legalMoves = getCachedLegalMoves(currentBoard, { currentPlayer, dice: randomDice })
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:64',message:'runMonteCarlo getLegalMoves returned',data:{simulation:i,movesMade,legalMovesLength:legalMoves.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      if (legalMoves.length === 0) {
        break
      }

      // Randomly select a move
      const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)]
      const randomMoves = randomMove.moves || [randomMove]
      for (const move of randomMoves) {
        currentBoard = applyMoveToBoardForAnalysis(currentBoard, move, currentPlayer)
      }
      currentPlayer = currentPlayer === 'white' ? 'black' : 'white'
      movesMade++
    }

    // Check if playerOwner won or has advantage
    const winner = getWinner(currentBoard)
    if (winner === playerOwner) {
      wins++
    } else if (winner === null) {
      // Game not finished, check pip count advantage
      const pipCounts = calculatePipCounts(currentBoard)
      const playerPip = playerOwner === 'white' ? pipCounts.white : pipCounts.black
      const opponentPip = playerOwner === 'white' ? pipCounts.black : pipCounts.white
      if (playerPip < opponentPip) wins += 0.5 // Partial win for pip advantage
    }
  }

  return wins / numSimulations
}

/**
 * Hybrid evaluation combining heuristic and MC
 */
function evaluateMoveHybrid(boardState, move, playerOwner) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:98',message:'evaluateMoveHybrid entry',data:{moveDescription:move.description||'single move',playerOwner},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  const heuristicScore = evaluateMoveHeuristically(boardState, move, playerOwner)
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:100',message:'Before runMonteCarlo',data:{heuristicScore},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  const mcScore = runMonteCarlo(boardState, move, playerOwner)
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:100',message:'After runMonteCarlo',data:{mcScore},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  // Combine scores (weighted average)
  const hybridScore = 0.6 * heuristicScore + 0.4 * mcScore

  return {
    move,
    heuristicScore,
    mcScore,
    hybridScore
  }
}

/**
 * Analyze moves using hybrid engine
 */
function analyzeMovesWithHybridEngine(boardState, moves, playerOwner) {
  const evaluations = moves.map(move => evaluateMoveHybrid(boardState, move, playerOwner))

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

    return {
      bestMoveIndex: bestMoveIndex >= 0 ? bestMoveIndex : 0, // Use found index or fallback to 0
      reasoning,
      confidence: 0.9, // High confidence for deterministic evaluation
      factorScores: evaluations.map((evaluation, idx) => ({
        moveNumber: idx + 1,
        moveDescription: formatMove(evaluation.move, currentPlayer),
        scores: `Heuristic: ${evaluation.heuristicScore.toFixed(3)} | MC: ${evaluation.mcScore.toFixed(3)} | Total: ${evaluation.hybridScore.toFixed(3)}`
      })),
      bestMove: bestMove // Keep reference to actual best move
    }
}

/**
 * Validate hybrid suggestion and return move combination
 */
function validateAndReturnMove(hybridAnalysis, moves) {
  const { bestMoveIndex, reasoning, confidence, factorScores, bestMove } = hybridAnalysis

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
      source: 'hybrid'
    }
  }

  // Final fallback to first combination
  return {
    move: moves[0],
    reasoning: "Hybrid evaluation failed, using first move",
    confidence: 0.3,
    factorScores: null,
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
  // For simplicity in MC, never consider game over - just simulate a few moves
  return false
}

function getWinner(boardState) {
  // For simplicity, return null - no winner in short simulations
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
      const { xgid, player, difficulty = 'advanced', maxMoves = 5, debug = false, usedDice = [] } = await request.json()

      // Validate input
      if (!xgid) {
        return Response.json(
          { error: 'XGID is required' },
          { status: 400 }
        )
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:341',message:'Before parseXGID',data:{xgid:xgid.substring(0,50),player,difficulty,maxMoves,usedDiceLength:usedDice.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'E'})}).catch(()=>{});
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
      fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:349',message:'After getLegalMoves',data:{allLegalMovesLength:allLegalMoves.length,allLegalMoves:allLegalMoves.slice(0,20).map(m=>({movesLength:m.moves?.length||1,description:m.description,totalPips:m.totalPips,moves:m.moves?.map(mv=>({from:mv.from,to:mv.to,die:mv.die}))||[]})),singleMoves:allLegalMoves.filter(m=>(m.moves?.length||1)===1).length,multiMoves:allLegalMoves.filter(m=>(m.moves?.length||1)>1).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'F'})}).catch(()=>{});
      // #endregion

      // Collect debug information
      const debugInfo = debug ? {
        xgid,
        legalMoves: allLegalMoves.map(move => ({
          description: formatMove(move),
          totalPips: move.totalPips || 0
        }))
      } : null

      if (allLegalMoves.length === 0) {
        return Response.json({
          move: null,
          reasoning: "No legal moves available",
          confidence: 1.0,
          source: 'local'
        })
      }

      // Get top legal moves for engine analysis
      const topMoves = selectTopLegalMoves(allLegalMoves, maxMoves)

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:373',message:'Top moves selected',data:{topMovesLength:topMoves.length,topMoves:topMoves.map(m=>({movesLength:m.moves?m.moves.length:1,description:m.description,totalPips:m.totalPips,moves:m.moves?m.moves.map(mv=>({from:mv.from,to:mv.to,die:mv.die})):null})),topSingleMoves:topMoves.filter(m=>(m.moves?.length||1)===1).length,topMultiMoves:topMoves.filter(m=>(m.moves?.length||1)>1).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'F'})}).catch(()=>{});
      // #endregion

      // Get hybrid engine analysis
      const playerOwner = player === 1 ? 'white' : 'black'
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.js:378',message:'Before analyzeMovesWithHybridEngine',data:{playerOwner,topMovesLength:topMoves.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      const hybridAnalysis = analyzeMovesWithHybridEngine(boardState, topMoves, playerOwner)
      
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

  const hits = []
  let tempState = boardState
  for (const move of moves) {
    const hit = checkForHit(tempState, move, playerOwner)
    if (hit) hits.push(hit)
    tempState = applyMoveToBoardForAnalysis(tempState, move, playerOwner)
  }

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



/**
 * Format move for display - converts absolute coordinates to relative based on player
 */
// formatMove is now imported from utils/moveFormatter
