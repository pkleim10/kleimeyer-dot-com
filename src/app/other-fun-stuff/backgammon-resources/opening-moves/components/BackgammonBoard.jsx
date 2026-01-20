'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { parseXGID } from '../utils/xgidParser'
import { getAIMove } from '../utils/aiBackgammon'
import { getAvailableDice, relativeToAbsolute, canBearOff, getHighestOccupiedPoint, canEnterFromBar, calculateMoveDistance, getLegalMoves, validateMove, hasPlayerWon } from '../utils/gameLogic.js'

export default function BackgammonBoard({ 
  direction = 0, 
  player = 1, 
  showBoardLabels = false, 
  showPointNumbers = true, 
  cubeOwner = 1, // -1 = black owns (near top), 0 = nobody owns (middle), 1 = white owns (near bottom)
  cubeValue = 4, // Exponent: 0-6, displayed value = 2^cubeValue (0 displays as 64)
  useCube = true,
  xgid = null,
  originalXGID = null, // Original board state before ghosts (for applying moves)
  ghostCheckers = {}, // Object mapping point numbers (1-24) to ghost checker counts, e.g. { 6: 2, 17: 1 }
  ghostCheckerPositions = {}, // Object mapping point numbers to arrays of stack positions, e.g. { 13: [5, 4] }
  ghostCheckerOwners = {}, // Object mapping point numbers to owner ('black' or 'white') for ghost checkers
  moves = [], // Array of {from, to, fromStackPosition} point numbers for arrow rendering
  dice = "00", // "00" = no dice, "XY" = dice values (e.g., "63" = 6 and 3)
  showTrays = true, // true = show trays with checkers, false = show normal border
  onPlayerChange = null, // Callback when player setting changes: (player) => void, where player is -1 (black) or 1 (white)
  onClearGhosts = null, // Callback to clear ghost checkers and arrows: () => void
  onShowGhosts = null, // Callback to show ghost checkers: () => void
  ghostsVisible = false, // Whether ghosts are currently visible
  showOptions = true, // Controls visibility of options gear icon
  isEditable = false, // Enables interactive features (drag-and-drop, clickable dice/cube)
  editingMode = 'free', // 'free' = any checker anywhere, 'play' = legal moves only
  onChange = null, // Callback when board state changes: (xgid: string) => void
  aiAnalysis = null, // Engine analysis result object (prop name kept for backward compatibility)
  aiDebug = null, // Debug/trace information from engine (prop name kept for backward compatibility)
  aiDifficulty = 'intermediate', // Engine difficulty level: 'beginner', 'intermediate', 'advanced', 'grandmaster' (prop name kept for backward compatibility)
  onAiDifficultyChange = null, // Callback for engine difficulty changes: (difficulty) => void
  onAiAnalysis = null, // Callback to trigger engine analysis: () => Promise<void>
  onClearAiAnalysis = null, // Callback to clear engine analysis: () => void
  onUsedDiceChange = null, // Callback when used dice changes: (usedDice: number[]) => void
  applyMoveTrigger = null // When this changes, apply the move from aiAnalysis (for external Apply button)
}) {
  // direction: 0 = ccw (counter-clockwise), 1 = cw (clockwise)
  // player: -1 = BLACK (show BLACK's point numbers), 1 = WHITE (show WHITE's point numbers)
  // showBoardLabels: true = show HOME and OUTER board labels, false = hide them
  // showPointNumbers: true = show point numbers based on player and direction, false = hide them
  // cubeOwner: -1 = black owns (near top), 0 = nobody owns (middle), 1 = white owns (near bottom)
  // cubeValue: exponent 0-6, displayed value = 2^cubeValue (0 displays as 64, 1=2, 2=4, 3=8, 4=16, 5=32, 6=64)
  // useCube: true = show doubling cube, false = hide doubling cube
  // xgid: XGID string to specify board position
  // ghostCheckers: Object mapping point numbers to ghost checker counts (ghost checkers are semi-transparent, 70% opacity)
  // dice: "00" = no dice shown, "XY" = dice values (e.g., "63" = 6 and 3)
  // showTrays: true = show trays with checkers, false = show normal border
  
  // Editable mode state (declared early so it can be used in effectiveXGID calculation)
  const [editableXGID, setEditableXGID] = useState(xgid)
  const [draggedChecker, setDraggedChecker] = useState(null) // {point: number, stackPosition: number, owner: string, count: number, isTray: boolean, trayOwner?: 'black' | 'white'}
  const [dragOverPoint, setDragOverPoint] = useState(null) // Current drop target point number or tray identifier
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 }) // Current mouse position during drag (SVG coordinates)
  const [dragScreenPosition, setDragScreenPosition] = useState({ x: 0, y: 0 }) // Current mouse position in screen coordinates
  const [localEditingMode, setLocalEditingMode] = useState(editingMode) // Local editing mode (can override prop)
  
  // Turn state for play mode
  const [turnState, setTurnState] = useState(null) // {currentPlayer: 'black'|'white', dice: number[], usedDice: number[], isTurnComplete: boolean, mustEnterFromBar: boolean, noLegalMoves: boolean}
  // Win state
  const [winner, setWinner] = useState(null) // 'black' | 'white' | null
  // Move number tracking (0 = before opening roll, 1 = opening move, 2+ = normal play)
  const [moveNumber, setMoveNumber] = useState(0)
  // Opening roll dice state (stores white/black dice values for opening move display)
  const [openingRollDice, setOpeningRollDice] = useState(null) // {whiteDie: number, blackDie: number, winner: 'white'|'black'} | null
  // Use a ref to track the latest turnState synchronously (React state updates are async)
  // IMPORTANT: We update the ref directly when we set turnState, and never sync it back from state
  // This prevents stale state from overwriting our ref updates
  const turnStateRef = useRef(null)
  // Track previous dice/player to detect actual changes (not just XGID changes)
  const prevDiceRef = useRef(null)
  const prevPlayerRef = useRef(null)
  const prevTurnKeyRef = useRef(null) // Track previous turnKey to detect if it actually changed

  // AI analysis state (managed by parent component)
  
  // Use editableXGID if in editable mode, otherwise use xgid prop
  const effectiveXGID = isEditable && editableXGID ? editableXGID : xgid
  
  // Derive a "turn key" that only changes when dice or player change (not on every move)
  // This prevents the useEffect from running unnecessarily when only the board position changes
  const turnKey = useMemo(() => {
    if (!effectiveXGID) return null
    const boardState = parseXGID(effectiveXGID)
    const player = boardState.player !== undefined ? boardState.player : null
    const dice = boardState.dice || null
    const key = `${player}:${dice}` // Only changes when player or dice change
    console.log('[turnKey] Calculated:', { effectiveXGID: effectiveXGID?.substring(0, 30) + '...', player, dice, key })
    return key
  }, [effectiveXGID])
  
  // Parse XGID if provided
  const boardState = effectiveXGID ? parseXGID(effectiveXGID) : {
    blackBar: 0,
    whiteBar: 0,
    points: Array(24).fill({ count: 0, owner: null }),
    cubeValue: undefined,
    cubeOwner: undefined,
    player: undefined,
    dice: undefined
  }

  // Reset move number and opening roll dice when board resets to OPEN state
  useEffect(() => {
    if (boardState.player === 0 && !openingRollDice && moveNumber > 0) {
      // Board reset to OPEN state - reset move tracking
      setMoveNumber(0)
      setOpeningRollDice(null)
    }
  }, [boardState.player, openingRollDice, moveNumber])

  // Check for win condition whenever board state changes
  // Only check when not showing ghost previews to prevent duplicate win popups
  useEffect(() => {
    if (!effectiveXGID) {
      setWinner(null)
      return
    }
    
    // Don't check for wins when showing ghost previews
    // The win will be detected when the move is actually applied
    if (ghostsVisible) {
      return
    }
    
    const currentBoardState = parseXGID(effectiveXGID)
    
    // Check if either player has won
    if (hasPlayerWon(currentBoardState, 'white')) {
      setWinner('white')
    } else if (hasPlayerWon(currentBoardState, 'black')) {
      setWinner('black')
    }
    // Don't clear winner here - once set, it stays until board is reset
  }, [effectiveXGID, ghostsVisible])
  
  // Use cubeValue from XGID if available, otherwise use prop value
  const effectiveCubeValue = boardState.cubeValue !== undefined ? boardState.cubeValue : cubeValue
  // Use cubeOwner from XGID if available, otherwise use prop value
  const effectiveCubeOwner = boardState.cubeOwner !== undefined ? boardState.cubeOwner : cubeOwner
  // Use player from XGID if available, otherwise use prop value
  const effectivePlayer = boardState.player !== undefined ? boardState.player : player
  // Use dice prop if provided (overrides XGID), otherwise use XGID value, otherwise default to "00"
  // In editable mode, always use dice from XGID (editableXGID) to reflect changes
  const effectiveDice = isEditable 
    ? (boardState.dice !== undefined ? boardState.dice : "11")
    : (dice !== undefined ? dice : (boardState.dice !== undefined ? boardState.dice : "00"))
  
  // Constants
  const BOARD_WIDTH = 800
  const BOARD_HEIGHT = 626
  const BASE_BORDER_WIDTH = 40
  const LABEL_BORDER_MULTIPLIER = 1.4
  const POINT_HEIGHT_RATIO = 0.9
  const TRAY_HEIGHT_RATIO = 0.35
  const ONE_REM = 16
  const POINT_COUNT = 6
  
  // Colors
  const COLORS = {
    bar: '#d1d5db',
    border: '#d1d5db',
    borderMediumGrey: '#808080',
    tray: '#9ca3af',
    board: '#ffffff',
    pointGrey: '#9ca3af',
    pointWhite: '#ffffff',
    stroke: '#000000',
    number: '#000000',
    checkerWhite: '#ffffff',
    checkerBlack: '#000000'
  }
  
  // Options dialog state (moved up to use in border calculations)
  // null means use XGID/props, object means user explicitly overrode settings
  const [showOptionsDialog, setShowOptionsDialog] = useState(false)
  const [localSettings, setLocalSettings] = useState(null)
  
  // Dialog drag state - load from localStorage if available
  const loadDialogPosition = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('backgammonBoardDialogPosition')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          return { x: 0, y: 0 }
        }
      }
    }
    return { x: 0, y: 0 }
  }
  
  const [dialogPosition, setDialogPosition] = useState(loadDialogPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  
  // Update editableXGID when xgid prop changes (if not currently editing)
  useEffect(() => {
    if (!isEditable || !draggedChecker) {
      setEditableXGID(xgid)
    }
  }, [xgid, isEditable, draggedChecker])
  
  // Update localEditingMode when prop changes
  useEffect(() => {
    setLocalEditingMode(editingMode)
  }, [editingMode])
  
  // Use local editing mode if in editable mode, otherwise use prop
  const effectiveEditingMode = isEditable ? localEditingMode : editingMode
  
  // Save dialog position to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('backgammonBoardDialogPosition', JSON.stringify(dialogPosition))
    }
  }, [dialogPosition])

  // AI suggestion window position and drag state
  const [aiWindowPosition, setAiWindowPosition] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('backgammonAiWindowPosition')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Ensure the saved position is still valid
        return {
          x: Math.max(0, Math.min(window.innerWidth - 400, parsed.x)),
          y: Math.max(0, Math.min(window.innerHeight - 300, parsed.y))
        }
      }
      // Default position: center-right, not too low
      return { x: Math.max(16, window.innerWidth - 450), y: Math.max(100, window.innerHeight - 400) }
    }
    return { x: 16, y: 100 }
  })
  const [isDraggingAi, setIsDraggingAi] = useState(false)
  const [aiDragStart, setAiDragStart] = useState({ x: 0, y: 0 })

  // Save AI window position to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('backgammonAiWindowPosition', JSON.stringify(aiWindowPosition))
    }
  }, [aiWindowPosition])

  // AI window drag handlers
  const handleAiMouseDown = (e) => {
    setIsDraggingAi(true)
    setAiDragStart({
      x: e.clientX - aiWindowPosition.x,
      y: e.clientY - aiWindowPosition.y
    })
    e.preventDefault()
    e.stopPropagation()
  }


  const handleGlobalMouseUp = () => {
    setIsDraggingAi(false)
    // ... existing mouse up logic ...
  }
  
  // Initialize turn state when dice are rolled (in play mode)
  // Only initialize when dice change from "00" to actual values, or when player changes
  useEffect(() => {
    const isFirstRun = prevTurnKeyRef.current === null
    const turnKeyChanged = prevTurnKeyRef.current !== turnKey
    
    console.log('[useEffect turnState init] Triggered:', { 
      turnKey, 
      prevTurnKey: prevTurnKeyRef.current,
      turnKeyChanged,
      isFirstRun,
      effectiveEditingMode, 
      isEditable, 
      refUsedDice: turnStateRef.current?.usedDice,
      stateUsedDice: turnState?.usedDice,
      effectiveXGID: effectiveXGID?.substring(0, 30) + '...'
    })
    
    // Update prevTurnKeyRef for next run
    prevTurnKeyRef.current = turnKey
    
    // If turnKey hasn't changed, skip the entire effect (unless it's the first run)
    if (!isFirstRun && !turnKeyChanged) {
      console.log('[useEffect turnState init] Skipping - turnKey unchanged:', {
        turnKey,
        prevTurnKey: prevTurnKeyRef.current,
        refUsedDice: turnStateRef.current?.usedDice
      })
      return
    }
    if (effectiveEditingMode !== 'play' || !isEditable) {
      setTurnState(null)
      turnStateRef.current = null
      return
    }

    const boardState = effectiveXGID ? parseXGID(effectiveXGID) : null
    if (!boardState) return

    const currentPlayer = boardState.player
    if (currentPlayer === undefined) return

    const owner = currentPlayer === 1 ? 'white' : 'black'
    const dice = boardState.dice

    // Check if we have an active turn BEFORE checking dice/player changes
    // This prevents resetting turnState when a move is made (which changes XGID but not dice/player)
    // IMPORTANT: Check ref FIRST - it has the latest value synchronously
    const currentTurnState = turnStateRef.current || turnState
    const hasActiveTurn = currentTurnState && 
                          currentTurnState.currentPlayer === owner && 
                          !currentTurnState.isTurnComplete &&
                          currentTurnState.usedDice && 
                          currentTurnState.usedDice.length > 0

    // Only reset/initialize if dice or player actually changed (not just XGID changed)
    const diceChanged = prevDiceRef.current !== dice
    const playerChanged = prevPlayerRef.current !== owner
    
    // If we have an active turn AND dice/player haven't changed, skip the entire effect
    // This prevents resetting turnState when a move is made
    if (hasActiveTurn && !diceChanged && !playerChanged) {
      console.log('[useEffect turnState init] Skipping - active turn preserved:', {
        dice,
        owner,
        usedDice: currentTurnState.usedDice,
        refUsedDice: turnStateRef.current?.usedDice,
        prevDice: prevDiceRef.current,
        prevPlayer: prevPlayerRef.current
      })
      return // Don't reset turnState if we have an active turn and dice/player haven't changed
    }
    
    // If dice/player haven't changed AND we don't have an active turn, also skip
    // This prevents unnecessary resets when only the board position changes
    if (!diceChanged && !playerChanged && prevDiceRef.current !== null) {
      console.log('[useEffect turnState init] Skipping - dice/player unchanged:', {
        dice,
        owner,
        prevDice: prevDiceRef.current,
        prevPlayer: prevPlayerRef.current,
        hasActiveTurn
      })
      return
    }
    
    // Update refs to track current values (only if we're actually processing)
    prevDiceRef.current = dice
    prevPlayerRef.current = owner

    // Only initialize if dice are rolled (not "00")
    if (dice && dice !== '00') {
      const die1 = parseInt(dice[0])
      const die2 = parseInt(dice[1])
      
      if (!isNaN(die1) && !isNaN(die2) && die1 > 0 && die2 > 0) {
        // Only initialize if we don't have turn state, or if player changed, or if turn was completed
        // IMPORTANT: Check ref first to get latest value (state might be stale)
        const currentTurnState = turnStateRef.current || turnState
        console.log('[useEffect turnState init] Checking turnState:', {
          effectiveXGID: effectiveXGID?.substring(0, 30) + '...',
          refUsedDice: turnStateRef.current?.usedDice,
          stateUsedDice: turnState?.usedDice,
          currentUsedDice: currentTurnState?.usedDice,
          owner,
          dice
        })
        // Don't reset if we're in the middle of a turn (has usedDice but not complete)
        const hasActiveTurn = currentTurnState && 
                              currentTurnState.currentPlayer === owner && 
                              !currentTurnState.isTurnComplete &&
                              currentTurnState.usedDice && 
                              currentTurnState.usedDice.length > 0
        
        // If we have an active turn, preserve it (don't reset)
        // Check BOTH ref and state to catch active turns even if one is stale
        const refHasActiveTurn = turnStateRef.current && 
                                 turnStateRef.current.currentPlayer === owner && 
                                 !turnStateRef.current.isTurnComplete &&
                                 turnStateRef.current.usedDice && 
                                 turnStateRef.current.usedDice.length > 0
        
        if (hasActiveTurn || refHasActiveTurn) {
          const activeTurnState = refHasActiveTurn ? turnStateRef.current : currentTurnState
          console.log('[useEffect turnState init] Preserving active turnState:', {
            currentPlayer: activeTurnState.currentPlayer,
            usedDice: activeTurnState.usedDice,
            isTurnComplete: activeTurnState.isTurnComplete,
            source: refHasActiveTurn ? 'ref' : 'state'
          })
          // Ensure ref is up to date (in case state was stale)
          turnStateRef.current = activeTurnState
          return // Don't reset, preserve the active turn
        }
        
        if (!currentTurnState || currentTurnState.currentPlayer !== owner || currentTurnState.isTurnComplete) {
          console.log('[useEffect turnState init] Resetting turnState:', {
            reason: !currentTurnState ? 'no turnState' : 
                   currentTurnState.currentPlayer !== owner ? 'player changed' : 'turn complete',
            currentPlayer: currentTurnState?.currentPlayer,
            owner,
            usedDice: currentTurnState?.usedDice
          })
          // Doubles: if both dice are the same, allow 4 moves of that number
          const diceArray = die1 === die2 ? [die1, die1, die1, die1] : [die1, die2]
          const barCount = owner === 'black' ? boardState.blackBar : boardState.whiteBar
          
          // Create initial turn state
          const initialTurnState = {
            currentPlayer: owner,
            dice: diceArray,
        usedDice: [],
            isTurnComplete: false,
            mustEnterFromBar: barCount > 0,
            noLegalMoves: false
          }
          
          // Check if there are any legal moves available
          const legalMoves = getLegalMoves(boardState, initialTurnState)
          if (legalMoves.length === 0) {
            initialTurnState.noLegalMoves = true
          }
          
          turnStateRef.current = initialTurnState // Update ref immediately
          setTurnState(initialTurnState)
        } else if (hasActiveTurn) {
          console.log('[useEffect turnState init] Preserving active turnState:', {
            currentPlayer: currentTurnState.currentPlayer,
            usedDice: currentTurnState.usedDice,
            isTurnComplete: currentTurnState.isTurnComplete
          })
          // Ensure ref is up to date (in case state was stale)
          turnStateRef.current = currentTurnState
        }
      }
    } else {
      // Reset turn state when dice are "00" (but only if we had turn state)
      // Use ref to check current state (state might be stale)
      const currentTurnState = turnStateRef.current || turnState
      if (currentTurnState) {
        turnStateRef.current = null // Update ref immediately
        setTurnState(null)
      }
    }
  }, [turnKey, effectiveEditingMode, isEditable]) // Use turnKey instead of effectiveXGID - only changes when dice/player change

  // Clear localSettings.player and dice when XGID changes in PLAY mode to ensure UI consistency
  useEffect(() => {
    if (effectiveEditingMode === 'play') {
      const boardState = effectiveXGID ? parseXGID(effectiveXGID) : null
      if (boardState) {
        // Clear player setting if it doesn't match XGID
        if (localSettings?.player !== undefined) {
          const xgidPlayer = boardState.player === 1 ? 1 : -1
          if (localSettings.player !== xgidPlayer) {
            setLocalSettings(prev => prev ? { ...prev, player: undefined } : null)
          }
        }
        // Clear dice setting if XGID dice is "00" (turn complete)
        if (localSettings?.dice !== undefined && boardState.dice === '00') {
          setLocalSettings(prev => prev ? { ...prev, dice: undefined } : null)
        }
      }
    }
  }, [effectiveXGID, effectiveEditingMode]) // Removed localSettings dependencies to prevent clearing while user is editing
  
  // Use localSettings for rendering if user has overridden, otherwise use XGID/props
  const activeDirection = localSettings?.direction !== undefined ? localSettings.direction : direction
  const activeShowTrays = localSettings?.showTrays !== undefined ? localSettings.showTrays : showTrays
  const activeShowBoardLabels = localSettings?.showBoardLabels !== undefined ? localSettings.showBoardLabels : showBoardLabels
  
  // Override with localSettings only if user has explicitly changed them, otherwise use XGID/props
  // In PLAY mode, always use the XGID values (authoritative during gameplay), otherwise use localSettings override
  const finalEffectivePlayer = effectiveEditingMode === 'play' ? effectivePlayer : (localSettings?.player !== undefined ? localSettings.player : effectivePlayer)
  const finalEffectiveCubeOwner = effectiveEditingMode === 'play' ? effectiveCubeOwner : (localSettings?.cubeOwner !== undefined ? localSettings.cubeOwner : effectiveCubeOwner)
  const finalEffectiveCubeValue = effectiveEditingMode === 'play' ? effectiveCubeValue : (localSettings?.cubeValue !== undefined ? localSettings.cubeValue : effectiveCubeValue)
  const finalEffectiveDice = effectiveEditingMode === 'play' ? effectiveDice : (localSettings?.dice !== undefined ? localSettings.dice : effectiveDice)
  const finalEffectiveUseCube = localSettings?.useCube !== undefined ? localSettings.useCube : useCube
  
  // Border widths - initial calculation
  const initialTrayBorderWidth = BASE_BORDER_WIDTH * 1.5 * 1.15
  let rightBorderWidth = activeShowTrays && activeDirection === 0 ? initialTrayBorderWidth : BASE_BORDER_WIDTH
  let leftBorderWidth = activeShowTrays && activeDirection === 1 ? initialTrayBorderWidth : BASE_BORDER_WIDTH
  const topBorderWidth = activeShowBoardLabels ? BASE_BORDER_WIDTH * LABEL_BORDER_MULTIPLIER : BASE_BORDER_WIDTH
  const bottomBorderWidth = activeShowBoardLabels ? BASE_BORDER_WIDTH * LABEL_BORDER_MULTIPLIER : BASE_BORDER_WIDTH
  
  // Calculate effective board height - increase total height when labels are shown to keep playing area constant
  // Base innerHeight = BOARD_HEIGHT - 2 * BASE_BORDER_WIDTH
  // When labels are shown, we add extra height to accommodate thicker borders while keeping innerHeight the same
  const extraTopBorderHeight = topBorderWidth - BASE_BORDER_WIDTH
  const extraBottomBorderHeight = bottomBorderWidth - BASE_BORDER_WIDTH
  const effectiveBoardHeight = BOARD_HEIGHT + extraTopBorderHeight + extraBottomBorderHeight
  
  // Board dimensions - innerHeight stays constant regardless of border thickness
  let innerWidth = BOARD_WIDTH - leftBorderWidth - rightBorderWidth
  const innerHeight = effectiveBoardHeight - topBorderWidth - bottomBorderWidth
  
  // Calculate BAR_WIDTH to equal checker diameter
  let BAR_WIDTH = (innerWidth * 0.95) / (12 + 0.95)
  
  let quadrantWidth = (innerWidth - BAR_WIDTH) / 2
  const quadrantHeight = innerHeight / 2
  let pointWidth = quadrantWidth / POINT_COUNT
  const pointHeight = quadrantHeight * POINT_HEIGHT_RATIO
  
  // Checker dimensions (calculated after pointWidth)
  let checkerDiameter = pointWidth * 0.95
  let checkerRadius = checkerDiameter / 2
  
  // Tray dimensions
  let trayWidth = checkerDiameter
  const trayHeight = BOARD_HEIGHT * TRAY_HEIGHT_RATIO
  
  // Checker thickness when placed edge-wise in tray
  const checkerThickness = Math.floor(trayHeight / 15) - 2
  
  // Adjust border width to accommodate tray (with padding for centering)
  const trayBorderPadding = trayWidth * 0.3
  const requiredTrayBorderWidth = trayWidth + 2 * trayBorderPadding
  
  // Recalculate border widths if needed (only when showTrays is true), then recalculate dependent values
  if (activeShowTrays && activeDirection === 0 && requiredTrayBorderWidth > rightBorderWidth) {
    rightBorderWidth = requiredTrayBorderWidth
    innerWidth = BOARD_WIDTH - leftBorderWidth - rightBorderWidth
    BAR_WIDTH = (innerWidth * 0.95) / (12 + 0.95)
    quadrantWidth = (innerWidth - BAR_WIDTH) / 2
    pointWidth = quadrantWidth / POINT_COUNT
    checkerDiameter = pointWidth * 0.95
    checkerRadius = checkerDiameter / 2
    trayWidth = checkerDiameter
  } else if (activeShowTrays && activeDirection === 1 && requiredTrayBorderWidth > leftBorderWidth) {
    leftBorderWidth = requiredTrayBorderWidth
    innerWidth = BOARD_WIDTH - leftBorderWidth - rightBorderWidth
    BAR_WIDTH = (innerWidth * 0.95) / (12 + 0.95)
    quadrantWidth = (innerWidth - BAR_WIDTH) / 2
    pointWidth = quadrantWidth / POINT_COUNT
    checkerDiameter = pointWidth * 0.95
    checkerRadius = checkerDiameter / 2
    trayWidth = checkerDiameter
  }
  
  // Quadrant boundaries
  const leftQuadrantX = leftBorderWidth
  const barX = leftBorderWidth + quadrantWidth
  const rightQuadrantX = barX + BAR_WIDTH
  
  // Point numbering configuration
  const getPointNumberWhite = (quadrantIndex, pointIndex) => {
    const ccwMapping = {
      0: (i) => 19 + i, // Top right (BLACK HOME): 19-24
      1: (i) => 13 + i, // Top left (BLACK OUTER): 13-18
      2: (i) => 12 - i, // Bottom left (WHITE OUTER): 12-7
      3: (i) => 6 - i   // Bottom right (WHITE HOME): 6-1
    }
    
    const cwMapping = {
      1: (i) => 24 - i, // Top left (BLACK HOME): 24-19
      0: (i) => 18 - i, // Top right (BLACK OUTER): 18-13
      2: (i) => 1 + i,  // Bottom left (WHITE HOME): 1-6
      3: (i) => 7 + i   // Bottom right (WHITE OUTER): 7-12
    }
    
    const mapping = activeDirection === 0 ? ccwMapping : cwMapping
    return mapping[quadrantIndex]?.(pointIndex) ?? 0
  }
  
  const getPointNumberBlack = (quadrantIndex, pointIndex) => {
    return 25 - getPointNumberWhite(quadrantIndex, pointIndex)
  }
  
  // Helper: Render tick marks outside tray edge
  const renderTrayTickMarks = (isTop) => {
    if (!activeShowTrays) return null
    
    const trayX = activeDirection === 0 
      ? BOARD_WIDTH - rightBorderWidth + (rightBorderWidth - trayWidth) / 2
      : (leftBorderWidth - trayWidth) / 2
    const trayY = topBorderWidth + (isTop ? 0 : quadrantHeight) + (quadrantHeight - trayHeight) / 2
    
    // Tick marks are drawn on the outer edge of the tray (opposite side from board)
    // For direction 0 (ccw), tray is on right, so tick marks go on the right edge
    // For direction 1 (cw), tray is on left, so tick marks go on the left edge
    const tickX = activeDirection === 0 
      ? trayX + trayWidth // Right edge of tray
      : trayX // Left edge of tray
    
    const tickLength = 8 // Length of tick mark
    const tickSpacing = checkerThickness * 5 // Every 5 checker sizes
    
    const ticks = []
    // Calculate how many ticks fit in the tray height
    let tickY = trayY
    
    if (isTop) {
      // Top tray (black): checkers stack from top downward
      // Tick marks at 5, 10, 15 checkers from top
      tickY = trayY + tickSpacing // First tick at 5 checkers
      while (tickY < trayY + trayHeight) {
        if (activeDirection === 0) {
          // Tray on right, tick marks extend rightward
          ticks.push(
            <line
              key={`tray-tick-top-${tickY}`}
              x1={tickX}
              y1={tickY}
              x2={tickX + tickLength}
              y2={tickY}
              stroke={COLORS.stroke}
              strokeWidth={1}
              opacity={0.6}
            />
          )
        } else {
          // Tray on left, tick marks extend leftward
          ticks.push(
            <line
              key={`tray-tick-top-${tickY}`}
              x1={tickX}
              y1={tickY}
              x2={tickX - tickLength}
              y2={tickY}
              stroke={COLORS.stroke}
              strokeWidth={1}
              opacity={0.6}
            />
          )
        }
        tickY += tickSpacing
      }
    } else {
      // Bottom tray (white): checkers stack from bottom upward
      // Tick marks at 5, 10, 15 checkers from bottom
      tickY = trayY + trayHeight - tickSpacing // First tick at 5 checkers from bottom
      while (tickY > trayY) {
        if (activeDirection === 0) {
          // Tray on right, tick marks extend rightward
          ticks.push(
            <line
              key={`tray-tick-bottom-${tickY}`}
              x1={tickX}
              y1={tickY}
              x2={tickX + tickLength}
              y2={tickY}
              stroke={COLORS.stroke}
              strokeWidth={1}
              opacity={0.6}
            />
          )
        } else {
          // Tray on left, tick marks extend leftward
          ticks.push(
            <line
              key={`tray-tick-bottom-${tickY}`}
              x1={tickX}
              y1={tickY}
              x2={tickX - tickLength}
              y2={tickY}
              stroke={COLORS.stroke}
              strokeWidth={1}
              opacity={0.6}
            />
          )
        }
        tickY -= tickSpacing
      }
    }
    
    return ticks.length > 0 ? <g>{ticks}</g> : null
  }
  
  // Helper: Render a tray rectangle
  const renderTray = (isTop) => {
    const trayX = activeDirection === 0 
      ? BOARD_WIDTH - rightBorderWidth + (rightBorderWidth - trayWidth) / 2
      : (leftBorderWidth - trayWidth) / 2
    const trayY = topBorderWidth + (isTop ? 0 : quadrantHeight) + (quadrantHeight - trayHeight) / 2
    
    return (
      <rect
        key={`tray-${isTop ? 'top' : 'bottom'}`}
        x={trayX}
        y={trayY}
        width={trayWidth}
        height={trayHeight}
        fill={COLORS.tray}
        stroke={COLORS.stroke}
        strokeWidth={1}
      />
    )
  }
  
  // Helper: Render checkers in a tray (edge-wise, as elongated rectangles)
  const renderTrayCheckers = (isTop, checkerCount) => {
    if (checkerCount === 0) return null
    
    const trayX = activeDirection === 0 
      ? BOARD_WIDTH - rightBorderWidth + (rightBorderWidth - trayWidth) / 2
      : (leftBorderWidth - trayWidth) / 2
    const trayY = topBorderWidth + (isTop ? 0 : quadrantHeight) + (quadrantHeight - trayHeight) / 2
    
    const checkers = []
    const checkerWidth = trayWidth
    const trayOwner = isTop ? 'black' : 'white'
    
    if (isTop) {
      // Black checkers in top tray: start at top, stack downward
      // Black checkers have medium grey border
      for (let i = 0; i < checkerCount; i++) {
        const checkerY = trayY + i * checkerThickness
        const stackPosition = i + 1 // 1-based from top
        const checkersToMove = 1 // Always move 1 checker from bar
        
        // Add drag handlers if editable
        const dragHandlers = isEditable ? {
          onMouseDown: (e) => {
            handleCheckerMouseDown(e, -1, stackPosition, 'black', checkersToMove, true, 'black')
          },
          style: { cursor: 'grab' }
        } : {}
        
        checkers.push(
          <rect
            key={`tray-checker-top-${i}`}
            x={trayX}
            y={checkerY}
            width={checkerWidth}
            height={checkerThickness}
            fill={COLORS.checkerBlack}
            stroke={COLORS.borderMediumGrey}
            strokeWidth={1}
            {...dragHandlers}
          />
        )
      }
    } else {
      // White checkers in bottom tray: start at bottom, stack upward
      for (let i = 0; i < checkerCount; i++) {
        const checkerY = trayY + trayHeight - (i + 1) * checkerThickness
        const stackPosition = i + 1 // 1-based from bottom (but we count from top for consistency)
        const checkersToMove = 1 // Always move 1 checker from bar
        
        // Add drag handlers if editable
        const dragHandlers = isEditable ? {
          onMouseDown: (e) => {
            handleCheckerMouseDown(e, -2, stackPosition, 'white', checkersToMove, true, 'white')
          },
          style: { cursor: 'grab' }
        } : {}
        
        checkers.push(
          <rect
            key={`tray-checker-bottom-${i}`}
            x={trayX}
            y={checkerY}
            width={checkerWidth}
            height={checkerThickness}
            fill={COLORS.checkerWhite}
            stroke={COLORS.stroke}
            strokeWidth={1}
            {...dragHandlers}
          />
        )
      }
    }
    
    return <g>{checkers}</g>
  }
  
  // Helper: Render doubling cube
  const renderDoublingCube = () => {
    if (!useCube) return null
    
    const validCubeValues = [0, 1, 2, 3, 4, 5, 6]
    if (!validCubeValues.includes(finalEffectiveCubeValue)) return null
    
    // Convert exponent to displayed value: 0 → 64, otherwise 2^finalEffectiveCubeValue
    const displayedValue = finalEffectiveCubeValue === 0 ? 64 : Math.pow(2, finalEffectiveCubeValue)
    
    const cubeSize = BAR_WIDTH * 0.8
    const barX = leftBorderWidth + (innerWidth - BAR_WIDTH) / 2
    const barCenterX = barX + BAR_WIDTH / 2
    
    let cubeY
    if (finalEffectiveCubeOwner === -1) {
      cubeY = topBorderWidth + 20 // Black owns (near top)
    } else if (finalEffectiveCubeOwner === 0) {
      cubeY = topBorderWidth + innerHeight / 2 - cubeSize / 2 // Nobody owns (middle)
    } else if (finalEffectiveCubeOwner === 1) {
      cubeY = topBorderWidth + innerHeight - cubeSize - 20 // White owns (near bottom)
    } else {
      return null
    }
    
    const cubeX = barCenterX - cubeSize / 2
    
    // Add click handler if editable
    const cubeHandlers = isEditable ? {
      onClick: handleCubeClick,
      style: { cursor: 'pointer' }
    } : {}
    
    return (
      <g key="doubling-cube" {...cubeHandlers}>
        <rect
          x={cubeX}
          y={cubeY}
          width={cubeSize}
          height={cubeSize}
          rx={cubeSize * 0.1}
          ry={cubeSize * 0.1}
          fill={COLORS.checkerWhite}
          stroke={COLORS.stroke}
          strokeWidth={2}
          pointerEvents={isEditable ? 'all' : 'none'}
        />
        <text
          x={barCenterX}
          y={cubeY + cubeSize / 2 + 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={cubeSize * 0.65}
          fontWeight="700"
          fill={finalEffectiveCubeValue === 0 ? '#808080' : COLORS.stroke}
          pointerEvents="none"
        >
          {displayedValue}
        </text>
      </g>
    )
  }
  
  // Helper: Get pip positions for a die value
  const getPipPositions = (value) => {
    const positions = {
      1: [{ x: 0, y: 0 }], // center
      2: [{ x: -1, y: -1 }, { x: 1, y: 1 }], // top-left, bottom-right
      3: [{ x: -1, y: -1 }, { x: 0, y: 0 }, { x: 1, y: 1 }], // top-left, center, bottom-right
      4: [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 }], // corners
      5: [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 0, y: 0 }, { x: -1, y: 1 }, { x: 1, y: 1 }], // corners + center
      6: [{ x: -1, y: -1 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 }] // two columns
    }
    return positions[value] || []
  }
  
  // Helper: Render dice
  const renderDice = () => {
    const currentBoardState = parseXGID(editableXGID || effectiveXGID || xgid)
    
    // For opening roll with doubles, show dice from openingRollDice state
    let diceToShow = null
    let showRerollWatermark = false
    
    if (currentBoardState.player === 0 && openingRollDice) {
      // Show dice from openingRollDice state (even if doubles)
      const higherDie = Math.max(openingRollDice.whiteDie, openingRollDice.blackDie)
      const lowerDie = Math.min(openingRollDice.whiteDie, openingRollDice.blackDie)
      diceToShow = `${higherDie}${lowerDie}`
      
      // Show re-roll watermark if dice are equal (winner is null or doubles)
      if (openingRollDice.winner === null || openingRollDice.whiteDie === openingRollDice.blackDie) {
        showRerollWatermark = true
      }
    } else {
      // Normal dice display
      // In editable mode, use dice from editableXGID (boardState.dice), otherwise use finalEffectiveDice
      // Don't show dice if value is "00" - keep it consistent with XGID
      diceToShow = isEditable 
        ? (boardState.dice !== undefined && boardState.dice !== "00" ? boardState.dice : null)
        : (finalEffectiveDice && finalEffectiveDice !== "00" ? finalEffectiveDice : null)
    }
    
    if (!diceToShow) return null
    
    // Parse dice values
    const die1 = parseInt(diceToShow[0]) || 1
    const die2 = parseInt(diceToShow[1]) || 1
    
    if (die1 === 0 || die2 === 0) return null
    
    // Dice size
    const dieSize = BAR_WIDTH * 0.8 // 80% of bar width
    const dieRadius = dieSize / 2
    const pipRadius = dieSize * 0.08 // 8% of die size
    const pipSpacing = dieSize * 0.25 // 25% spacing for pips
    
    // Position dice in right half of board, between top and bottom boards
    const diceY = topBorderWidth + innerHeight / 2 // Center vertically
    const rightHalfCenterX = leftBorderWidth + innerWidth * 0.75 // 75% across (right half)
    const die1X = rightHalfCenterX - dieSize * 0.6 // First die slightly left
    const die2X = rightHalfCenterX + dieSize * 0.6 // Second die slightly right
    
    // Determine dice colors
    let baseDieFill1, baseDieFill2, basePipFill1, basePipFill2
    
    // For opening roll doubles (player === 0, openingRollDice with null winner), show one white, one black die
    if (currentBoardState.player === 0 && openingRollDice && openingRollDice.winner === null) {
      // Opening roll doubles: show one white die, one black die (same value)
      baseDieFill1 = COLORS.checkerWhite // First die = white
      basePipFill1 = COLORS.stroke
      baseDieFill2 = COLORS.checkerBlack // Second die = black
      basePipFill2 = COLORS.checkerWhite
    } else if (moveNumber === 1 && openingRollDice && openingRollDice.winner) {
      // Opening move (moveNumber === 1): show different colored dice
      // xg5 format is "higherDie lowerDie" (e.g., "53" means 5 and 3, where 5 is higher)
      const winnerIsWhite = openingRollDice.winner === 'white'
      
      // First die (die1) is always the higher die = winner's color
      baseDieFill1 = winnerIsWhite ? COLORS.checkerWhite : COLORS.checkerBlack
      basePipFill1 = winnerIsWhite ? COLORS.stroke : COLORS.checkerWhite
      
      // Second die (die2) is always the lower die = loser's color
      baseDieFill2 = winnerIsWhite ? COLORS.checkerBlack : COLORS.checkerWhite
      basePipFill2 = winnerIsWhite ? COLORS.checkerWhite : COLORS.stroke
    } else {
      // Normal play: dice colors based on current player
      baseDieFill1 = finalEffectivePlayer === 1 ? COLORS.checkerWhite : COLORS.checkerBlack
      baseDieFill2 = baseDieFill1
      basePipFill1 = finalEffectivePlayer === 1 ? COLORS.stroke : COLORS.checkerWhite
      basePipFill2 = basePipFill1
    }
    
    // Check if dice are used (in play mode)
    // Count occurrences of each die value in usedDice
    const usedDice = (effectiveEditingMode === 'play' && turnState && turnState.usedDice) ? turnState.usedDice : []
    let die1Used, die2Used
    if (die1 === die2) {
      // Doubles: allow 4 moves, so grey dice progressively for visual feedback
      const totalUsedCount = usedDice.filter(d => d === die1).length
      die1Used = totalUsedCount >= 1 // Grey first die after 1 use
      die2Used = totalUsedCount >= 2 // Grey second die after 2 uses (both stay greyed for moves 3-4)
    } else {
      // Different values - check each independently
      die1Used = usedDice.filter(d => d === die1).length >= 1
      die2Used = usedDice.filter(d => d === die2).length >= 1
    }
    
    // Grey out used dice
    const die1Fill = die1Used ? '#888888' : baseDieFill1
    const die2Fill = die2Used ? '#888888' : baseDieFill2
    const die1PipFill = die1Used ? '#666666' : basePipFill1
    const die2PipFill = die2Used ? '#666666' : basePipFill2
    
    const diceElements = []
    
    // Add click handlers if editable
    const die1Handlers = isEditable ? {
      onClick: (e) => handleDiceClick(e, 0),
      style: { cursor: 'pointer' }
    } : {}
    
    const die2Handlers = isEditable ? {
      onClick: (e) => handleDiceClick(e, 1),
      style: { cursor: 'pointer' }
    } : {}
    
    // Render first die
    const pipPositions1 = getPipPositions(die1)
    diceElements.push(
      <g key="die-1" {...die1Handlers}>
        <rect
          x={die1X - dieRadius}
          y={diceY - dieRadius}
          width={dieSize}
          height={dieSize}
          rx={dieSize * 0.15}
          ry={dieSize * 0.15}
          fill={die1Fill}
          stroke={COLORS.stroke}
          strokeWidth={2}
          pointerEvents={isEditable ? 'all' : 'none'}
        />
        {pipPositions1.map((pos, i) => (
          <circle
            key={`pip-1-${i}`}
            cx={die1X + pos.x * pipSpacing}
            cy={diceY + pos.y * pipSpacing}
            r={pipRadius}
            fill={die1PipFill}
            pointerEvents="none"
          />
        ))}
      </g>
    )
    
    // Render second die
    const pipPositions2 = getPipPositions(die2)
    diceElements.push(
      <g key="die-2" {...die2Handlers}>
        <rect
          x={die2X - dieRadius}
          y={diceY - dieRadius}
          width={dieSize}
          height={dieSize}
          rx={dieSize * 0.15}
          ry={dieSize * 0.15}
          fill={die2Fill}
          stroke={COLORS.stroke}
          strokeWidth={2}
          pointerEvents={isEditable ? 'all' : 'none'}
        />
        {pipPositions2.map((pos, i) => (
          <circle
            key={`pip-2-${i}`}
            cx={die2X + pos.x * pipSpacing}
            cy={diceY + pos.y * pipSpacing}
            r={pipRadius}
            fill={die2PipFill}
            pointerEvents="none"
          />
        ))}
      </g>
    )
    
    // Add invisible clickable reset areas (left and right of dice) if editable
    if (isEditable) {
      const resetAreaWidth = dieSize / 2
      const resetAreaHeight = dieSize * 1.5
      const resetAreaTop = diceY - resetAreaHeight / 2
      
      // Left reset area (to the left of leftmost die)
      const leftResetAreaLeft = die1X - dieRadius - resetAreaWidth
      const leftResetAreaRight = die1X - dieRadius
      
      // Right reset area (to the right of rightmost die)
      const rightResetAreaLeft = die2X + dieRadius
      const rightResetAreaRight = die2X + dieRadius + resetAreaWidth
      
      diceElements.push(
        <g key="dice-reset-areas">
          {/* Left reset area */}
          <rect
            x={leftResetAreaLeft}
            y={resetAreaTop}
            width={resetAreaWidth}
            height={resetAreaHeight}
            fill="transparent"
            pointerEvents="all"
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()

              // Disable dice reset in PLAY mode
              if (effectiveEditingMode === 'play') return;

              const currentXGID = editableXGID || effectiveXGID || xgid
              if (!currentXGID) return
              const parts = currentXGID.split(':')
              parts[4] = '00'
              while (parts.length < 10) {
                if (parts.length === 9) {
                  parts.push('10')
                } else {
                  parts.push('0')
                }
              }
              const newXGID = parts.join(':')
              setEditableXGID(newXGID)
              if (onChange) {
                onChange(newXGID)
              }
            }}
          />
          {/* Right reset area */}
          <rect
            x={rightResetAreaLeft}
            y={resetAreaTop}
            width={resetAreaWidth}
            height={resetAreaHeight}
            fill="transparent"
            pointerEvents="all"
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()

              // Disable dice reset in PLAY mode
              if (effectiveEditingMode === 'play') return;

              const currentXGID = editableXGID || effectiveXGID || xgid
              if (!currentXGID) return
              const parts = currentXGID.split(':')
              parts[4] = '00'
              while (parts.length < 10) {
                if (parts.length === 9) {
                  parts.push('10')
                } else {
                  parts.push('0')
                }
              }
              const newXGID = parts.join(':')
              setEditableXGID(newXGID)
              if (onChange) {
                onChange(newXGID)
              }
            }}
          />
        </g>
      )
    }
    
    // Add re-roll watermark to the right of dice if needed
    if (showRerollWatermark) {
      const watermarkX = die2X + dieRadius + dieSize * 0.3 // Position to the right of second die
      diceElements.push(
        <text
          key="reroll-watermark"
          x={watermarkX}
          y={diceY}
          textAnchor="start"
          dominantBaseline="middle"
          fontSize="20"
          fill="#888888"
          opacity={0.7}
          style={{ pointerEvents: 'none' }}
        >
          Re-roll
        </text>
      )
    }
    
    return <g>{diceElements}</g>
  }
  
  // Helper: Render "No legal moves" message and "End Turn" button
  const renderNoLegalMoves = () => {
    // Only show in play mode when there are no legal moves
    if (effectiveEditingMode !== 'play' || !turnState || !turnState.noLegalMoves) {
      return null
    }
    
    const diceY = topBorderWidth + innerHeight / 2
    const rightHalfCenterX = leftBorderWidth + innerWidth * 0.75
    const dieSize = BAR_WIDTH * 0.8
    const messageY = diceY + dieSize + 20 // Below the dice
    
    const handleEndTurn = () => {
      if (!turnState) return
      
      const currentXGID = editableXGID || effectiveXGID || xgid
      if (!currentXGID) return
      
      const nextPlayer = turnState.currentPlayer === 'white' ? -1 : 1
      const parts = currentXGID.split(':')
      parts[3] = String(nextPlayer) // Update player
      parts[4] = '00' // Reset dice
      const finalXGID = parts.join(':')
      setEditableXGID(finalXGID)
      setTurnState(null)
      
      if (onChange) {
        onChange(finalXGID)
      }
    }
    
    return (
      <g>
        {/* "No legal moves" message */}
        <text
          x={rightHalfCenterX}
          y={messageY}
          textAnchor="middle"
          fontSize="14"
          fill={COLORS.stroke}
          fontWeight="bold"
        >
          No legal moves
        </text>
        {/* "End Turn" button */}
        <rect
          x={rightHalfCenterX - 50}
          y={messageY + 15}
          width={100}
          height={30}
          rx={5}
          fill={COLORS.checkerWhite}
          stroke={COLORS.stroke}
          strokeWidth={2}
          style={{ cursor: 'pointer' }}
          onClick={handleEndTurn}
        />
        <text
          x={rightHalfCenterX}
          y={messageY + 35}
          textAnchor="middle"
          fontSize="12"
          fill={COLORS.stroke}
          fontWeight="bold"
          style={{ cursor: 'pointer', pointerEvents: 'none' }}
        >
          End Turn
        </text>
      </g>
    )
  }
  
  // Helper: Render board label
  const renderLabel = (text, x, y, baseline = 'middle') => (
    <text
      key={text}
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline={baseline}
      fontSize="16"
      fontWeight="bold"
      fill={COLORS.stroke}
    >
      {text}
    </text>
  )
  
  // Board label positions
  const getLabelPositions = () => {
    const quarterWidth = (innerWidth - BAR_WIDTH) / 4
    const leftX = leftBorderWidth + quarterWidth
    const rightX = leftBorderWidth + innerWidth / 2 + quarterWidth
    const topY = 5
    const bottomY = effectiveBoardHeight - 5
    
    if (activeDirection === 0) {
      return [
        { text: 'WHITE HOME', x: rightX, y: bottomY, baseline: 'baseline' },
        { text: 'WHITE OUTER', x: leftX, y: bottomY, baseline: 'baseline' },
        { text: 'BLACK OUTER', x: leftX, y: topY, baseline: 'hanging' },
        { text: 'BLACK HOME', x: rightX, y: topY, baseline: 'hanging' }
      ]
    } else {
      return [
        { text: 'WHITE HOME', x: leftX, y: bottomY, baseline: 'baseline' },
        { text: 'WHITE OUTER', x: rightX, y: bottomY, baseline: 'baseline' },
        { text: 'BLACK OUTER', x: rightX, y: topY, baseline: 'hanging' },
        { text: 'BLACK HOME', x: leftX, y: topY, baseline: 'hanging' }
      ]
    }
  }
  
  // Helper: Render checkers on the bar
  const renderBarCheckers = (barX, barY, barHeight, topBarCount, bottomBarCount) => {
    const checkers = []
    const barCenterX = barX + BAR_WIDTH / 2
    const barTop = barY
    const barBottom = barY + barHeight
    
    // Get ghost checker counts for bar (point 0 = black bar, point 25 = white bar)
    const topBarGhostCount = ghostCheckers[0] || 0
    const bottomBarGhostCount = ghostCheckers[25] || 0
    const topBarGhostPositions = ghostCheckerPositions[0] || []
    const bottomBarGhostPositions = ghostCheckerPositions[25] || []
    const topBarGhostOwner = ghostCheckerOwners[0]
    const bottomBarGhostOwner = ghostCheckerOwners[25]
    
    // Render BLACK checkers (top bar)
    if (topBarCount > 0) {
      if (topBarCount > 3) {
        const checkerTopY = barTop + 4 * checkerDiameter
        const checkerCenterY = checkerTopY + checkerRadius
        
        // Add drag and double-click handlers if editable
        const dragHandlers = isEditable ? {
          onMouseDown: (e) => {
            handleCheckerMouseDown(e, 0, 1, 'black', 1, false, null)
          },
          onDoubleClick: (e) => {
            handleCheckerDoubleClick(e, 0, 'black', 1, false)
          },
          style: { cursor: 'grab' }
        } : {}
        
        checkers.push(
          <g key="bar-top-black-many" {...dragHandlers}>
            <circle
              cx={barCenterX}
              cy={checkerCenterY}
              r={checkerRadius}
              fill={COLORS.checkerBlack}
              stroke={COLORS.stroke}
              strokeWidth={1}
            />
            <text
              x={barCenterX}
              y={checkerCenterY + 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={checkerRadius * 0.8}
              fontWeight="bold"
              fill={COLORS.checkerWhite}
            >
              {topBarCount}
            </text>
          </g>
        )
      } else {
        if (topBarCount >= 1) {
          const firstCheckerTopY = barTop + 4 * checkerDiameter
          const firstCheckerCenterY = firstCheckerTopY + checkerRadius
          
          // Add drag and double-click handlers if editable
          const dragHandlers = isEditable ? {
            onMouseDown: (e) => {
              handleCheckerMouseDown(e, 0, 1, 'black', 1, false, null)
            },
            onDoubleClick: (e) => {
              handleCheckerDoubleClick(e, 0, 'black', 1, false)
            },
            style: { cursor: 'grab' }
          } : {}
          
          checkers.push(
            <circle
              key="bar-top-black-1"
              cx={barCenterX}
              cy={firstCheckerCenterY}
              r={checkerRadius}
              fill={COLORS.checkerBlack}
              stroke={COLORS.stroke}
              strokeWidth={1}
              {...dragHandlers}
            />
          )
        }
        if (topBarCount >= 2) {
          const secondCheckerTopY = barTop + 3 * checkerDiameter
          const secondCheckerCenterY = secondCheckerTopY + checkerRadius
          
          // Add drag and double-click handlers if editable
          const dragHandlers = isEditable ? {
            onMouseDown: (e) => {
              handleCheckerMouseDown(e, 0, 2, 'black', 1, false, null)
            },
            onDoubleClick: (e) => {
              handleCheckerDoubleClick(e, 0, 'black', 1, false)
            },
            style: { cursor: 'grab' }
          } : {}
          
          checkers.push(
            <circle
              key="bar-top-black-2"
              cx={barCenterX}
              cy={secondCheckerCenterY}
              r={checkerRadius}
              fill={COLORS.checkerBlack}
              stroke={COLORS.stroke}
              strokeWidth={1}
              {...dragHandlers}
            />
          )
        }
        if (topBarCount >= 3) {
          const thirdCheckerTopY = barTop + 2 * checkerDiameter
          const thirdCheckerCenterY = thirdCheckerTopY + checkerRadius
          
          // Add drag and double-click handlers if editable
          const dragHandlers = isEditable ? {
            onMouseDown: (e) => {
              handleCheckerMouseDown(e, 0, 3, 'black', 1, false, null)
            },
            onDoubleClick: (e) => {
              handleCheckerDoubleClick(e, 0, 'black', 1, false)
            },
            style: { cursor: 'grab' }
          } : {}
          
          checkers.push(
            <circle
              key="bar-top-black-3"
              cx={barCenterX}
              cy={thirdCheckerCenterY}
              r={checkerRadius}
              fill={COLORS.checkerBlack}
              stroke={COLORS.stroke}
              strokeWidth={1}
              {...dragHandlers}
            />
          )
        }
      }
    }
    
    // Render WHITE checkers (bottom bar)
    if (bottomBarCount > 0) {
      if (bottomBarCount > 3) {
        const checkerBottomY = barBottom - 4 * checkerDiameter
        const checkerCenterY = checkerBottomY - checkerRadius
        
        // Add drag and double-click handlers if editable
        const dragHandlers = isEditable ? {
          onMouseDown: (e) => {
            handleCheckerMouseDown(e, 25, 1, 'white', 1, false, null)
          },
          onDoubleClick: (e) => {
            handleCheckerDoubleClick(e, 25, 'white', 1, false)
          },
          style: { cursor: 'grab' }
        } : {}
        
        checkers.push(
          <g key="bar-bottom-white-many" {...dragHandlers}>
            <circle
              cx={barCenterX}
              cy={checkerCenterY}
              r={checkerRadius}
              fill={COLORS.checkerWhite}
              stroke={COLORS.stroke}
              strokeWidth={1}
            />
            <text
              x={barCenterX}
              y={checkerCenterY + 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={checkerRadius * 0.8}
              fontWeight="bold"
              fill={COLORS.stroke}
            >
              {bottomBarCount}
            </text>
          </g>
        )
      } else {
        if (bottomBarCount >= 1) {
          const firstCheckerBottomY = barBottom - 4 * checkerDiameter
          const firstCheckerCenterY = firstCheckerBottomY - checkerRadius
          
          // Add drag and double-click handlers if editable
          const dragHandlers = isEditable ? {
            onMouseDown: (e) => {
              handleCheckerMouseDown(e, 25, 1, 'white', 1, false, null)
            },
            onDoubleClick: (e) => {
              handleCheckerDoubleClick(e, 25, 'white', 1, false)
            },
            style: { cursor: 'grab' }
          } : {}
          
          checkers.push(
            <circle
              key="bar-bottom-white-1"
              cx={barCenterX}
              cy={firstCheckerCenterY}
              r={checkerRadius}
              fill={COLORS.checkerWhite}
              stroke={COLORS.stroke}
              strokeWidth={1}
              {...dragHandlers}
            />
          )
        }
        if (bottomBarCount >= 2) {
          const secondCheckerBottomY = barBottom - 3 * checkerDiameter
          const secondCheckerCenterY = secondCheckerBottomY - checkerRadius
          
          // Add drag and double-click handlers if editable
          const dragHandlers = isEditable ? {
            onMouseDown: (e) => {
              handleCheckerMouseDown(e, 25, 2, 'white', 1, false, null)
            },
            onDoubleClick: (e) => {
              handleCheckerDoubleClick(e, 25, 'white', 1, false)
            },
            style: { cursor: 'grab' }
          } : {}
          
          checkers.push(
            <circle
              key="bar-bottom-white-2"
              cx={barCenterX}
              cy={secondCheckerCenterY}
              r={checkerRadius}
              fill={COLORS.checkerWhite}
              stroke={COLORS.stroke}
              strokeWidth={1}
              {...dragHandlers}
            />
          )
        }
        if (bottomBarCount >= 3) {
          const thirdCheckerBottomY = barBottom - 2 * checkerDiameter
          const thirdCheckerCenterY = thirdCheckerBottomY - checkerRadius
          
          // Add drag and double-click handlers if editable
          const dragHandlers = isEditable ? {
            onMouseDown: (e) => {
              handleCheckerMouseDown(e, 25, 3, 'white', 1, false, null)
            },
            onDoubleClick: (e) => {
              handleCheckerDoubleClick(e, 25, 'white', 1, false)
            },
            style: { cursor: 'grab' }
          } : {}
          
          checkers.push(
            <circle
              key="bar-bottom-white-3"
              cx={barCenterX}
              cy={thirdCheckerCenterY}
              r={checkerRadius}
              fill={COLORS.checkerWhite}
              stroke={COLORS.stroke}
              strokeWidth={1}
              {...dragHandlers}
            />
          )
        }
      }
    }
    
    // Render ghost checkers on the bar (for suggested moves)
    // Top bar (black) ghost checkers - point 0
    if (topBarGhostCount > 0 && topBarGhostOwner === 'black') {
      const ghostDisplayCount = Math.min(topBarGhostCount, 5)
      const arrowColor = "#EF4444" // Red for BLACK
      
      for (let i = 0; i < ghostDisplayCount; i++) {
        const stackPosition = topBarGhostPositions[i] || (i + 1)
        const checkerTopY = barTop + (5 - stackPosition) * checkerDiameter
        const checkerCenterY = checkerTopY + checkerRadius
        
        checkers.push(
          <g key={`bar-top-black-ghost-${i}`}>
            <circle
              cx={barCenterX}
              cy={checkerCenterY}
              r={checkerRadius}
              fill={COLORS.checkerBlack}
              stroke="none"
              opacity={0.6}
            />
            {/* Color overlay on ghost checker */}
            <circle
              cx={barCenterX}
              cy={checkerCenterY}
              r={checkerRadius}
              fill={arrowColor}
              opacity={0.3}
            />
          </g>
        )
      }
    }
    
    // Bottom bar (white) ghost checkers - point 25
    if (bottomBarGhostCount > 0 && bottomBarGhostOwner === 'white') {
      const ghostDisplayCount = Math.min(bottomBarGhostCount, 5)
      const arrowColor = "#3B82F6" // Blue for WHITE
      
      for (let i = 0; i < ghostDisplayCount; i++) {
        const stackPosition = bottomBarGhostPositions[i] || (i + 1)
        const checkerBottomY = barBottom - (5 - stackPosition) * checkerDiameter
        const checkerCenterY = checkerBottomY - checkerRadius
        
        checkers.push(
          <g key={`bar-bottom-white-ghost-${i}`}>
            <circle
              cx={barCenterX}
              cy={checkerCenterY}
              r={checkerRadius}
              fill={COLORS.checkerWhite}
              stroke="none"
              opacity={0.6}
            />
            {/* Color overlay on ghost checker */}
            <circle
              cx={barCenterX}
              cy={checkerCenterY}
              r={checkerRadius}
              fill={arrowColor}
              opacity={0.3}
            />
          </g>
        )
      }
    }
    
    return checkers.length > 0 ? <g>{checkers}</g> : null
  }
  
  // Helper: Render checkers on a point
  const renderCheckers = (pointX, baseY, tipY, isTopHalf, checkerCount, owner, whitePointNumber) => {
    // Get ghost checker count for this point (ghost checkers are rendered on top, in addition to normal checkers)
    const ghostCount = ghostCheckers[whitePointNumber] || 0
    
    // If there are no checkers and no ghost checkers, don't render anything
    if ((checkerCount === 0 || !owner || owner === 'empty') && ghostCount === 0) return null
    
    const checkers = []
    const centerX = pointX + pointWidth / 2
    
    const normalCount = checkerCount // Normal checkers are what's in the XGID
    const totalVisualCount = normalCount + ghostCount // Total checkers to display visually
    
    // If there are no normal checkers but there are ghost checkers, we still need an owner for rendering
    // Use the owner from ghostCheckerOwners if available, otherwise use current owner, or default to white
    const ghostOwner = ghostCheckerOwners[whitePointNumber]
    const effectiveOwner = owner || (ghostOwner === 'black' ? 'top' : ghostOwner === 'white' ? 'bottom' : (ghostCount > 0 ? 'bottom' : null))
    
    let currentY = isTopHalf ? baseY + checkerRadius : baseY - checkerRadius
    const stackDirection = isTopHalf ? 1 : -1
    
    // Render normal checkers first
    const normalDisplayCount = Math.min(normalCount, 5)
    const showCount = totalVisualCount > 5
    
    // Base fill color for normal checkers
    const normalFillColor = effectiveOwner === 'bottom' ? COLORS.checkerWhite : COLORS.checkerBlack
    
    for (let i = 0; i < normalDisplayCount; i++) {
      const fillColor = normalFillColor
      const isLastNormalChecker = i === normalDisplayCount - 1 && ghostCount === 0
      const stackPosition = i + 1 // 1-based position from top
      // When there are more than 5 checkers, only 5 are displayed visually.
      // The 5th checker (i=4) shows the count and represents the top checker.
      // It should always move 1 checker, not normalCount - 4.
      const checkersToMove = (normalCount > 5 && i === 4) ? 1 : (normalCount - i) // Number of checkers including and above this one
      
      // Add drag and double-click handlers if editable
      const ownerStr = effectiveOwner === 'bottom' ? 'white' : 'black'
      const dragHandlers = isEditable ? {
        onMouseDown: (e) => {
          handleCheckerMouseDown(e, whitePointNumber, stackPosition, ownerStr, checkersToMove, false, null)
        },
        onDoubleClick: (e) => {
          handleCheckerDoubleClick(e, whitePointNumber, ownerStr, checkersToMove, false)
        },
        style: { cursor: 'grab' }
      } : {}
      
      checkers.push(
        <g key={`checker-${i}`} {...dragHandlers}>
          <circle
            cx={centerX}
            cy={currentY}
            r={checkerRadius}
            fill={fillColor}
            stroke={COLORS.stroke}
            strokeWidth={1}
            opacity={1}
          />
          {isLastNormalChecker && showCount && ghostCount === 0 && (
            <text
              x={centerX}
              y={currentY + 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={checkerRadius * 0.8}
              fontWeight="bold"
              fill={fillColor === COLORS.checkerWhite ? COLORS.stroke : COLORS.checkerWhite}
            >
              {checkerCount}
            </text>
          )}
        </g>
      )
      
      currentY += stackDirection * checkerDiameter
    }
    
    // Render ghost checkers (semi-transparent, 70% opacity) on top of normal checkers
    if (ghostCount > 0) {
      const ghostDisplayCount = Math.min(ghostCount, 5)
      const fillColor = effectiveOwner === 'bottom' ? COLORS.checkerWhite : COLORS.checkerBlack
      const isLastChecker = normalDisplayCount + ghostDisplayCount >= Math.min(totalVisualCount, 5)
      // Use red for BLACK ghost checkers, blue for WHITE
      const ghostOwner = ghostCheckerOwners[whitePointNumber]
      const arrowColor = ghostOwner === 'black' ? "#EF4444" : "#3B82F6" // Red for BLACK, blue for WHITE
      
      for (let i = 0; i < ghostDisplayCount; i++) {
        checkers.push(
          <g 
            key={`ghost-checker-${i}`}
            onClick={onClearGhosts ? (e) => {
              e.stopPropagation()
              onClearGhosts()
            } : undefined}
            style={onClearGhosts ? { cursor: 'pointer' } : undefined}
          >
            <circle
              cx={centerX}
              cy={currentY}
              r={checkerRadius}
              fill={fillColor}
              stroke="none"
              opacity={0.6}
              pointerEvents={onClearGhosts ? 'all' : 'none'}
            />
            {/* Color overlay on ghost checker */}
            <circle
              cx={centerX}
              cy={currentY}
              r={checkerRadius}
              fill={arrowColor}
              opacity={0.3}
              pointerEvents={onClearGhosts ? 'all' : 'none'}
            />
            {isLastChecker && showCount && (
              <text
                x={centerX}
                y={currentY + 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={checkerRadius * 0.8}
                fontWeight="bold"
                fill={fillColor === COLORS.checkerWhite ? COLORS.stroke : COLORS.checkerWhite}
                opacity={0.7}
              >
                {totalVisualCount}
              </text>
            )}
          </g>
        )
        
        currentY += stackDirection * checkerDiameter
      }
    }
    
    return <g>{checkers}</g>
  }
  
  // Map WHITE's point numbers (1-24) to quadrant and point index
  const getPointPosition = (whitePointNumber) => {
    // WHITE's perspective: points 1-24
    // For ccw board:
    //   Points 1-6: quadrant 3 (bottom right), pointIndex 5-0
    //   Points 7-12: quadrant 2 (bottom left), pointIndex 5-0
    //   Points 13-18: quadrant 1 (top left), pointIndex 0-5
    //   Points 19-24: quadrant 0 (top right), pointIndex 0-5
    
    if (activeDirection === 0) {
      // ccw
      if (whitePointNumber >= 1 && whitePointNumber <= 6) {
        return { quadrantIndex: 3, pointIndex: 6 - whitePointNumber }
      } else if (whitePointNumber >= 7 && whitePointNumber <= 12) {
        return { quadrantIndex: 2, pointIndex: 12 - whitePointNumber }
      } else if (whitePointNumber >= 13 && whitePointNumber <= 18) {
        return { quadrantIndex: 1, pointIndex: whitePointNumber - 13 }
      } else if (whitePointNumber >= 19 && whitePointNumber <= 24) {
        return { quadrantIndex: 0, pointIndex: whitePointNumber - 19 }
      }
    } else {
      // cw
      if (whitePointNumber >= 1 && whitePointNumber <= 6) {
        return { quadrantIndex: 2, pointIndex: whitePointNumber - 1 }
      } else if (whitePointNumber >= 7 && whitePointNumber <= 12) {
        return { quadrantIndex: 3, pointIndex: whitePointNumber - 7 }
      } else if (whitePointNumber >= 13 && whitePointNumber <= 18) {
        return { quadrantIndex: 0, pointIndex: 18 - whitePointNumber }
      } else if (whitePointNumber >= 19 && whitePointNumber <= 24) {
        return { quadrantIndex: 1, pointIndex: 24 - whitePointNumber }
      }
    }
    return null
  }
  
  // Get checker coordinates for a point (for arrow rendering)
  // stackPosition: 1-based from top of stack (1 = top checker, 2 = second from top, etc.)
  const getCheckerCoordinates = (whitePointNumber, isGhost = false, stackPosition = null) => {
    // Handle bar positions (0 = black bar, 25 = white bar)
    if (whitePointNumber === 0 || whitePointNumber === 25) {
      const barX = leftBorderWidth + (innerWidth - BAR_WIDTH) / 2
      const barY = topBorderWidth
      const barHeight = innerHeight
      const barCenterX = barX + BAR_WIDTH / 2
      const barTop = barY
      const barBottom = barY + barHeight
      
      if (whitePointNumber === 0) {
        // Black bar (top)
        // First checker is at barTop + 4 * checkerDiameter
        const firstCheckerTopY = barTop + 4 * checkerDiameter
        const firstCheckerCenterY = firstCheckerTopY + checkerRadius
        // For ghost checkers, use stackPosition to determine Y offset
        let checkerY = firstCheckerCenterY
        if (isGhost && stackPosition !== null) {
          // stackPosition 1 = first checker, 2 = second checker, etc.
          // Second checker is at barTop + 3 * checkerDiameter, third at barTop + 2 * checkerDiameter
          const offsetFromFirst = (stackPosition - 1) * checkerDiameter
          checkerY = firstCheckerCenterY - offsetFromFirst
        }
        return { x: barCenterX, y: checkerY }
      } else {
        // White bar (bottom) - point 25
        // First checker is at barBottom - 4 * checkerDiameter
        const firstCheckerBottomY = barBottom - 4 * checkerDiameter
        const firstCheckerCenterY = firstCheckerBottomY - checkerRadius
        // For ghost checkers, use stackPosition to determine Y offset
        let checkerY = firstCheckerCenterY
        if (isGhost && stackPosition !== null) {
          // stackPosition 1 = first checker, 2 = second checker, etc.
          // Second checker is at barBottom - 3 * checkerDiameter, third at barBottom - 2 * checkerDiameter
          const offsetFromFirst = (stackPosition - 1) * checkerDiameter
          checkerY = firstCheckerCenterY + offsetFromFirst
        }
        return { x: barCenterX, y: checkerY }
      }
    }
    
    const pos = getPointPosition(whitePointNumber)
    if (!pos) return null
    
    const { quadrantIndex, pointIndex } = pos
    const isTopHalf = quadrantIndex === 0 || quadrantIndex === 1
    const isRight = quadrantIndex === 0 || quadrantIndex === 3
    const quadrantX = isRight ? rightQuadrantX : leftQuadrantX
    const quadrantY = isTopHalf ? topBorderWidth : topBorderWidth + quadrantHeight
    
    const pointX = quadrantX + pointIndex * pointWidth
    const baseY = isTopHalf ? quadrantY : quadrantY + quadrantHeight
    const centerX = pointX + pointWidth / 2
    
    // Get checker count and owner from boardState
    let checkerCount = 0
    let checkerOwner = null
    if (xgid && whitePointNumber >= 1 && whitePointNumber <= 24) {
      const pointData = boardState.points[whitePointNumber - 1]
      checkerCount = pointData.count
      checkerOwner = pointData.owner
    }
    
    // Starting Y position
    let checkerY = isTopHalf ? baseY + checkerRadius : baseY - checkerRadius
    const stackDirection = isTopHalf ? 1 : -1
    
    if (isGhost && stackPosition !== null) {
      // Ghost checker at specific stack position (from original position)
      // stackPosition is 1-based from top of ORIGINAL stack: 1 = top checker, 2 = second from top, etc.
      // We need to calculate where this position would be in the original stack
      // The original stack had checkerCount + ghostCount checkers
      // Position 1 is at the top, so we need to count down from the top
      const ghostCount = ghostCheckers[whitePointNumber] || 0
      const originalStackSize = checkerCount + ghostCount
      const positionFromTop = stackPosition - 1 // Convert to 0-based from top (0 = top, 1 = second, etc.)
      checkerY += stackDirection * (positionFromTop * checkerDiameter)
    } else if (isGhost) {
      // Fallback: ghost checker is at the top of the stack (after normal checkers)
      checkerY += stackDirection * (checkerCount * checkerDiameter)
    } else {
      // Normal checker - use stackPosition if provided, otherwise find the last normal checker position
      if (stackPosition !== null) {
        // stackPosition is 1-based from top: 1 = top checker, 2 = second from top, etc.
        // If there are more than 5 checkers, positions 6+ should point to the 5th checker (the one with the count)
        const maxDisplayPosition = Math.min(stackPosition, 5)
        const positionFromTop = maxDisplayPosition - 1 // Convert to 0-based from top
        checkerY += stackDirection * (positionFromTop * checkerDiameter)
      } else {
        // Fallback: find the last normal checker position
        const normalDisplayCount = Math.min(checkerCount, 5)
        checkerY += stackDirection * ((normalDisplayCount - 1) * checkerDiameter)
      }
    }
    
    return { x: centerX, y: checkerY }
  }
  
  // Note: AI analysis is cleared manually by user or when new analysis starts

  // Helper functions for AI analysis
  const formatMoveForDisplay = (move) => {
    if (!move) return 'No move available'

    // Get current player from board state for coordinate conversion
    // Use the same XGID source as applyAIMove to ensure consistency
    const currentXGID = editableXGID || effectiveXGID || xgid
    const boardState = parseXGID(currentXGID)
    const currentPlayer = boardState?.player !== undefined ? boardState.player : finalEffectivePlayer
    
    // Helper to convert absolute to relative coordinates
    const absoluteToRelative = (absolutePoint, player) => {
      if (absolutePoint === 0 || absolutePoint === 25) return absolutePoint // Bar positions stay as-is
      if (absolutePoint === -1 || absolutePoint === -2) return absolutePoint // Off positions stay as-is
      if (player === 1) return absolutePoint // White: absolute = relative
      return 25 - absolutePoint // Black: relative = 25 - absolute
    }

    // Handle move combinations - check for moves array first
    if (move.moves && Array.isArray(move.moves) && move.moves.length > 0) {
      console.log('[formatMoveForDisplay] Formatting move combination:', {
        move,
        moves: move.moves,
        currentPlayer,
        description: move.description
      })
      
      // Convert each move in the combination
      const convertedMoves = move.moves.map(m => {
        const fromRel = absoluteToRelative(m.from, currentPlayer)
        const toRel = absoluteToRelative(m.to, currentPlayer)
        const from = fromRel === 0 ? 'bar' : fromRel === 25 ? 'bar' : fromRel
        const to = toRel === -1 ? 'off' : toRel === -2 ? 'off' : toRel
        const asterisk = m.hitBlot ? '*' : ''
        console.log('[formatMoveForDisplay] Converting move:', {
          absolute: { from: m.from, to: m.to },
          relative: { from: fromRel, to: toRel },
          display: `${from}/${to}${asterisk}`,
          hitBlot: m.hitBlot
        })
        return { moveStr: `${from}/${to}`, hitBlot: m.hitBlot, from: fromRel, to: toRel }
      })
      
      // Normalize order: sort by highest originating point first
      convertedMoves.sort((a, b) => {
        const aFrom = parseInt(a.moveStr.split('/')[0]) || 0
        const bFrom = parseInt(b.moveStr.split('/')[0]) || 0
        return bFrom - aFrom // Highest first
      })
      
      // Format as combined move (same checker or two checkers)
      if (convertedMoves.length === 2) {
        const [m1, m2] = convertedMoves
        const m1Parts = m1.moveStr.split('/')
        const m2Parts = m2.moveStr.split('/')
        // Check if same checker (second move starts where first ends)
        // IMPORTANT: Do NOT collapse if first move hits a blot (hitting stops the sequence)
        if (m1Parts[1] === m2Parts[0] && !m1.hitBlot) {
          const asterisk = m2.hitBlot ? '*' : ''
          const originalMoves = `${m1.moveStr}${m1.hitBlot ? '*' : ''} ${m2.moveStr}${m2.hitBlot ? '*' : ''}`
          return `${m1Parts[0]}/${m2Parts[1]}${asterisk} (${originalMoves})`
        }
        // Also check reverse order (first move starts where second ends)
        if (m2Parts[1] === m1Parts[0] && !m2.hitBlot) {
          const asterisk = m1.hitBlot ? '*' : ''
          const originalMoves = `${m2.moveStr}${m2.hitBlot ? '*' : ''} ${m1.moveStr}${m1.hitBlot ? '*' : ''}`
          return `${m2Parts[0]}/${m1Parts[1]}${asterisk} (${originalMoves})`
        }
        // Two different checkers OR sequence with hit - show both moves
        // Moves are already normalized, just format them
        return convertedMoves.map(m => `${m.moveStr}${m.hitBlot ? '*' : ''}`).join(' ')
      }
      
      // For 3+ moves, collapse sequences but don't collapse if any move hits a blot
      // Process moves to collapse sequences (same checker moving) but stop at hits
      const formattedParts = []
      let i = 0
      while (i < convertedMoves.length) {
        // If this move hits a blot, add it separately (hitting stops the sequence)
        if (convertedMoves[i].hitBlot) {
          formattedParts.push(`${convertedMoves[i].moveStr}*`)
          i++
          continue
        }
        
        // Try to form a sequence starting from this move
        let sequenceStart = convertedMoves[i].moveStr.split('/')[0]
        let sequenceEnd = convertedMoves[i].moveStr.split('/')[1]
        const sequenceMoves = [convertedMoves[i]] // Track original moves in sequence
        let j = i + 1
        
        // Check if this is part of a sequence (same checker moving)
        // Only continue if next move starts where this one ends AND doesn't hit a blot
        while (j < convertedMoves.length && 
               convertedMoves[j].moveStr.split('/')[0] === sequenceEnd && 
               !convertedMoves[j].hitBlot) {
          sequenceEnd = convertedMoves[j].moveStr.split('/')[1]
          sequenceMoves.push(convertedMoves[j])
          j++
        }
        
        // Add collapsed move (or single move if not a sequence)
        if (sequenceMoves.length > 1) {
          // Collapsed sequence - show original moves in parentheses
          const originalMovesStr = sequenceMoves.map(m => `${m.moveStr}${m.hitBlot ? '*' : ''}`).join(' ')
          formattedParts.push(`${sequenceStart}/${sequenceEnd} (${originalMovesStr})`)
        } else {
          // Single move, no collapse
          formattedParts.push(`${sequenceStart}/${sequenceEnd}${convertedMoves[i].hitBlot ? '*' : ''}`)
        }
        i = j // Move to next non-sequence move
      }
      
      return formattedParts.join(' ')
    }

    // Handle single moves - check if move has from/to properties
    if (move.from !== undefined && move.to !== undefined) {
      const fromRel = absoluteToRelative(move.from, currentPlayer)
      const toRel = absoluteToRelative(move.to, currentPlayer)
      const from = fromRel === 0 ? 'bar' : fromRel === 25 ? 'bar' : fromRel
      const to = toRel === -1 ? 'off' : toRel === -2 ? 'off' : toRel
      const asterisk = move.hitBlot ? '*' : ''
      return `${from}/${to}${asterisk}`
    }

    // Fallback to description if available
    if (move.description) {
      return move.description
    }

    return 'Invalid move format'
  }

  const applyAIMove = (move) => {
    console.log('[applyAIMove] Called with move:', move)
    if (!move) {
      console.warn('[applyAIMove] No move provided')
      return
    }

    // Use originalXGID if provided (for applying moves from original state when showing ghosts)
    // Otherwise use editableXGID or effectiveXGID or xgid
    const currentXGID = originalXGID || editableXGID || effectiveXGID || xgid
    if (!currentXGID) {
      console.warn('[applyAIMove] No XGID available')
      return
    }

    console.log('[applyAIMove] Using XGID:', currentXGID)
    const boardState = parseXGID(currentXGID)
    
    // Prevent AI moves during opening roll doubles state
    if (boardState.player === 0 && openingRollDice && openingRollDice.winner === null) {
      console.warn('[applyAIMove] Cannot apply move during opening roll doubles state')
      return
    }
    
    console.log('[applyAIMove] Board state:', {
      player: boardState.player,
      dice: boardState.dice,
      effectiveEditingMode,
      turnState
    })
    // Use boardState.player to determine whose turn it is and which checkers to move
    // This must match what updateXGIDForMove expects
    const currentPlayer = boardState.player !== undefined ? boardState.player : 1
    // moveOwner must match the current player whose turn it is
    const moveOwner = currentPlayer === 1 ? 'white' : 'black'
    
    // Helper to convert absolute coordinates (from API) to relative coordinates (for updateXGIDForMove)
    // updateXGIDForMove expects relative coordinates and will convert them back using boardState.player
    // So we need to convert absolute -> relative based on boardState.player
    const absoluteToRelative = (absolutePoint, player) => {
      if (player === 1) return absolutePoint // White: absolute = relative
      return 25 - absolutePoint // Black: relative = 25 - absolute
    }
    
    // Validate that moves belong to the correct player
    const validateMove = (m) => {
      // Handle bar moves (from = 0 or 25, or fromBar flag)
      const isBarMove = m.fromBar || m.from === 0 || m.from === 25
      if (isBarMove) {
        // Validate bar move: check if player has checkers on bar
        const barCount = moveOwner === 'white' ? boardState.whiteBar : boardState.blackBar
        if (barCount === 0) {
          console.error('Invalid bar move: no checkers on bar', {
            from: m.from,
            fromBar: m.fromBar,
            moveOwner,
            barCount
          })
          return false
        }
        return true
      }
      
      // Handle regular moves (from = 1-24)
      if (m.from >= 1 && m.from <= 24) {
        const fromPoint = boardState.points[m.from - 1]
        if (!fromPoint || fromPoint.owner !== moveOwner || fromPoint.count === 0) {
          console.error('Invalid move: checker does not belong to current player', {
            from: m.from,
            expectedOwner: moveOwner,
            actualOwner: fromPoint?.owner,
            count: fromPoint?.count,
            fromBar: m.fromBar
          })
          return false
        }
        return true
      }
      
      // Invalid from value
      console.error('Invalid move: from value out of range', {
        from: m.from,
        fromBar: m.fromBar,
        moveOwner
      })
      return false
    }

    let updatedXGID = currentXGID

    // Handle move combinations
    if (move.moves && Array.isArray(move.moves) && move.moves.length > 0) {
      console.log('Applying move combination:', {
        moves: move.moves,
        description: move.description,
        currentPlayer,
        moveOwner
      })
      
      for (let moveIndex = 0; moveIndex < move.moves.length; moveIndex++) {
        const singleMove = move.moves[moveIndex]
        // Validate move against CURRENT board state (updated after previous moves)
        const currentBoardState = parseXGID(updatedXGID)
        
        console.log(`Validating move ${moveIndex + 1} of ${move.moves.length}:`, {
          move: singleMove,
          currentBoardState: {
            whiteBar: currentBoardState.whiteBar,
            blackBar: currentBoardState.blackBar,
            player: currentBoardState.player
          },
          moveOwner,
          currentXGID: updatedXGID.substring(0, 50)
        })
        
        const validateMoveAgainstCurrentState = (m) => {
          // Defensive check: ensure move object has required properties
          if (!m || typeof m.from !== 'number') {
            console.error('Invalid move object structure:', {
              move: m,
              hasFrom: m?.hasOwnProperty('from'),
              fromType: typeof m?.from,
              fullMove: JSON.stringify(m)
            })
            return false
          }
          
          // Handle bar moves (from = 0 or 25, or fromBar flag)
          const isBarMove = m.fromBar === true || m.from === 0 || m.from === 25
          if (isBarMove) {
            // Validate bar move: check if player has checkers on bar
            const barCount = moveOwner === 'white' ? currentBoardState.whiteBar : currentBoardState.blackBar
            if (barCount === 0) {
              console.error('Invalid bar move: no checkers on bar', {
                from: m.from,
                fromBar: m.fromBar,
                moveOwner,
                barCount,
                whiteBar: currentBoardState.whiteBar,
                blackBar: currentBoardState.blackBar,
                fullMove: JSON.stringify(m)
              })
              return false
            }
            return true
          }
          
          // Handle regular moves (from = 1-24)
          if (m.from >= 1 && m.from <= 24) {
            const fromPoint = currentBoardState.points[m.from - 1]
            if (!fromPoint) {
              console.error('Invalid move: from point does not exist', {
                from: m.from,
                pointsLength: currentBoardState.points.length,
                fullMove: JSON.stringify(m)
              })
              return false
            }
            if (fromPoint.owner !== moveOwner || fromPoint.count === 0) {
              console.error('Invalid move: checker does not belong to current player', {
                from: m.from,
                expectedOwner: moveOwner,
                actualOwner: fromPoint?.owner,
                count: fromPoint?.count,
                fromBar: m.fromBar,
                fullMove: JSON.stringify(m),
                boardState: {
                  whiteBar: currentBoardState.whiteBar,
                  blackBar: currentBoardState.blackBar,
                  point: currentBoardState.points[m.from - 1]
                }
              })
              return false
            }
            return true
          }
          
          // Invalid from value
          console.error('Invalid move: from value out of range', {
            from: m.from,
            fromBar: m.fromBar,
            moveOwner,
            fullMove: JSON.stringify(m)
          })
          return false
        }
        
        if (!validateMoveAgainstCurrentState(singleMove)) {
          console.error('Skipping invalid move:', singleMove)
          continue
        }
        
        // Convert absolute coordinates to relative coordinates based on current player's perspective
        // For bar moves: convert based on owner (black bar = 0, white bar = 25)
        let fromRelative
        if (singleMove.fromBar || singleMove.from === 0 || singleMove.from === 25) {
          // Bar move: convert based on owner
          fromRelative = moveOwner === 'black' ? 0 : 25
        } else if (singleMove.from >= 1 && singleMove.from <= 24) {
          fromRelative = absoluteToRelative(singleMove.from, currentPlayer)
        } else {
          fromRelative = singleMove.from // Keep other special values as-is
        }
        
        // Convert bear-off destinations (0 or 25 in absolute) to tray values (-1 or -2)
        let toRelative
        if (singleMove.isBearOff || singleMove.to === 0 || singleMove.to === 25) {
          // Bear-off move: convert to tray value based on owner
          toRelative = moveOwner === 'black' ? -1 : -2
        } else if (singleMove.to >= 1 && singleMove.to <= 24) {
          toRelative = absoluteToRelative(singleMove.to, currentPlayer)
        } else {
          toRelative = singleMove.to // Bar positions (0, 25) stay as-is for bar moves
        }
        
        console.log('Applying single move:', {
          absolute: { from: singleMove.from, to: singleMove.to },
          relative: { from: fromRelative, to: toRelative },
          currentPlayer,
          moveOwner,
          currentBoardState: currentBoardState.points.map((p, i) => ({ point: i + 1, owner: p.owner, count: p.count }))
        })
        
        const previousXGID = updatedXGID
        updatedXGID = updateXGIDForMove(updatedXGID, fromRelative, toRelative, singleMove.count || 1, moveOwner)
        
        // Check if move was actually applied (XGID should change)
        if (updatedXGID === previousXGID) {
          console.warn('Move was not applied:', { fromRelative, toRelative, singleMove })
        } else {
          console.log('Move applied successfully')
        }
      }
    } else {
      // Validate move belongs to correct player
      if (!validateMove(move)) {
        console.error('Skipping invalid move:', move)
        return currentXGID
      }
      
      // Handle single move
      // Convert absolute coordinates to relative coordinates based on current player's perspective
      // For bar moves: convert based on owner (black bar = 0, white bar = 25)
      let fromRelative
      if (move.fromBar || move.from === 0 || move.from === 25) {
        // Bar move: convert based on owner
        fromRelative = moveOwner === 'black' ? 0 : 25
      } else if (move.from >= 1 && move.from <= 24) {
        fromRelative = absoluteToRelative(move.from, currentPlayer)
      } else {
        fromRelative = move.from // Keep other special values as-is
      }
      
      // Convert bear-off destinations (0 or 25 in absolute) to tray values (-1 or -2)
      let toRelative
      if (move.isBearOff || move.to === 0 || move.to === 25) {
        // Bear-off move: convert to tray value based on owner
        toRelative = moveOwner === 'black' ? -1 : -2
      } else if (move.to >= 1 && move.to <= 24) {
        toRelative = absoluteToRelative(move.to, currentPlayer)
      } else {
        toRelative = move.to // Bar positions (0, 25) stay as-is for bar moves
      }
      
      updatedXGID = updateXGIDForMove(updatedXGID, fromRelative, toRelative, move.count || 1, moveOwner)
    }

    // Don't call setEditableXGID yet - wait until after turn state handling

    // Handle turn state updates like regular moves
    // Initialize turnState if it doesn't exist (can happen on first move)
    let currentTurnState = turnState
    if (effectiveEditingMode === 'play' && !currentTurnState && boardState.dice && boardState.dice !== '00') {
      const die1 = parseInt(boardState.dice[0])
      const die2 = parseInt(boardState.dice[1])
      if (!isNaN(die1) && !isNaN(die2) && die1 > 0 && die2 > 0) {
        const diceArray = die1 === die2 ? [die1, die1, die1, die1] : [die1, die2]
        const barCount = moveOwner === 'black' ? boardState.blackBar : boardState.whiteBar
        currentTurnState = {
          currentPlayer: moveOwner,
          dice: diceArray,
          usedDice: [],
          isTurnComplete: false,
          mustEnterFromBar: barCount > 0,
          noLegalMoves: false
        }
        console.log('[applyAIMove] Initializing turnState:', currentTurnState)
        // Set the initialized turnState so it persists
        setTurnState(currentTurnState)
      } else {
        console.warn('[applyAIMove] Cannot initialize turnState - invalid dice:', boardState.dice)
      }
    } else if (!currentTurnState) {
      console.warn('[applyAIMove] No turnState and cannot initialize:', {
        effectiveEditingMode,
        dice: boardState.dice,
        hasTurnState: !!turnState
      })
    }

    if (effectiveEditingMode === 'play' && currentTurnState && currentTurnState.dice && currentTurnState.dice.length > 0) {
      // For AI moves, identify which specific dice are used by each move
      const usedDiceValues = []
      let availableDice = [...getAvailableDice(currentTurnState.dice, currentTurnState.usedDice || [])]
      
      console.log('[applyAIMove] Turn state:', {
        currentTurnState,
        availableDice,
        move: move.moves || move
      })

      // Helper to convert absolute coordinates to relative coordinates
      const absoluteToRelative = (absolutePoint, player) => {
        if (absolutePoint === 0 || absolutePoint === 25) return absolutePoint // Bar positions stay as-is
        if (player === 1) return absolutePoint // White: absolute = relative
        return 25 - absolutePoint // Black: relative = 25 - absolute
      }

      if (move.moves) {
        // Handle move combinations - each move should use exactly one die
        for (const singleMove of move.moves) {
          console.log('[applyAIMove] Processing single move:', {
            singleMove,
            hasDie: !!singleMove.die,
            dieValue: singleMove.die,
            fromBar: singleMove.fromBar,
            from: singleMove.from,
            availableDice
          })
          
          // For bar moves, use the die value directly from the move object
          if (singleMove.fromBar || singleMove.from === 25 || singleMove.from === 0) {
            if (singleMove.die && availableDice.includes(singleMove.die)) {
              const matchingDieIndex = availableDice.indexOf(singleMove.die)
              if (matchingDieIndex !== -1) {
                usedDiceValues.push(singleMove.die)
                availableDice.splice(matchingDieIndex, 1) // Remove this die from available dice
                console.log('[applyAIMove] Bar move - used die:', singleMove.die)
              } else {
                console.warn('[applyAIMove] Bar move die not found in available dice:', {
                  die: singleMove.die,
                  availableDice
                })
              }
            } else {
              // Fallback: calculate distance for bar moves
              const fromRelative = absoluteToRelative(singleMove.from, currentPlayer)
              const toRelative = absoluteToRelative(singleMove.to, currentPlayer)
              const distance = calculateMoveDistance(fromRelative, toRelative, moveOwner)
              console.log('[applyAIMove] Bar move fallback - calculated distance:', {
                fromRelative,
                toRelative,
                distance,
                availableDice
              })
              if (distance !== null && distance > 0 && availableDice.includes(distance)) {
                const matchingDieIndex = availableDice.indexOf(distance)
                if (matchingDieIndex !== -1) {
                  usedDiceValues.push(distance)
                  availableDice.splice(matchingDieIndex, 1)
                  console.log('[applyAIMove] Bar move fallback - used die:', distance)
                }
              }
            }
          } else if (singleMove.isBearOff || singleMove.to === 0 || singleMove.to === 25) {
            // Bear-off move: use die value from move object, or calculate based on point number
            if (singleMove.die && availableDice.includes(singleMove.die)) {
              const matchingDieIndex = availableDice.indexOf(singleMove.die)
              if (matchingDieIndex !== -1) {
                usedDiceValues.push(singleMove.die)
                availableDice.splice(matchingDieIndex, 1)
                console.log('[applyAIMove] Bear-off move - used die:', singleMove.die)
              }
            } else {
              // Fallback: for bear-off, the die should match the point number (relative 1-6)
              const fromRelative = absoluteToRelative(singleMove.from, currentPlayer)
              if (fromRelative >= 1 && fromRelative <= 6 && availableDice.includes(fromRelative)) {
                const matchingDieIndex = availableDice.indexOf(fromRelative)
                if (matchingDieIndex !== -1) {
                  usedDiceValues.push(fromRelative)
                  availableDice.splice(matchingDieIndex, 1)
                  console.log('[applyAIMove] Bear-off move fallback - used die:', fromRelative)
                }
              }
            }
          } else {
            // Regular move: convert absolute coordinates to relative coordinates for distance calculation
            const fromRelative = absoluteToRelative(singleMove.from, currentPlayer)
            const toRelative = absoluteToRelative(singleMove.to, currentPlayer)
            const distance = calculateMoveDistance(fromRelative, toRelative, moveOwner)
            if (distance !== null && distance > 0) {
              // Find an available die that matches this distance
              const matchingDieIndex = availableDice.indexOf(distance)
              if (matchingDieIndex !== -1) {
                usedDiceValues.push(distance)
                availableDice.splice(matchingDieIndex, 1) // Remove this die from available dice
                console.log('[applyAIMove] Regular move - used die:', distance)
              }
            }
          }
        }
      } else {
        // Handle single move
        console.log('[applyAIMove] Processing single move:', {
          move,
          hasDie: !!move.die,
          dieValue: move.die,
          fromBar: move.fromBar,
          from: move.from,
          availableDice
        })
        
        // For bar moves, use the die value directly from the move object
        if (move.fromBar || move.from === 25 || move.from === 0) {
          if (move.die && availableDice.includes(move.die)) {
            const matchingDieIndex = availableDice.indexOf(move.die)
            if (matchingDieIndex !== -1) {
              usedDiceValues.push(move.die)
              console.log('[applyAIMove] Single bar move - used die:', move.die)
            }
          } else {
            // Fallback: calculate distance for bar moves
            const fromRelative = absoluteToRelative(move.from, currentPlayer)
            const toRelative = absoluteToRelative(move.to, currentPlayer)
            const distance = calculateMoveDistance(fromRelative, toRelative, moveOwner)
            console.log('[applyAIMove] Single bar move fallback - calculated distance:', {
              fromRelative,
              toRelative,
              distance,
              availableDice
            })
            if (distance !== null && distance > 0 && availableDice.includes(distance)) {
              const matchingDieIndex = availableDice.indexOf(distance)
              if (matchingDieIndex !== -1) {
                usedDiceValues.push(distance)
                console.log('[applyAIMove] Single bar move fallback - used die:', distance)
              }
            }
          }
        } else if (move.isBearOff || move.to === 0 || move.to === 25) {
          // Bear-off move: use die value from move object, or calculate based on point number
          if (move.die && availableDice.includes(move.die)) {
            const matchingDieIndex = availableDice.indexOf(move.die)
            if (matchingDieIndex !== -1) {
              usedDiceValues.push(move.die)
              console.log('[applyAIMove] Single bear-off move - used die:', move.die)
            }
          } else {
            // Fallback: for bear-off, the die should match the point number (relative 1-6)
            const fromRelative = absoluteToRelative(move.from, currentPlayer)
            if (fromRelative >= 1 && fromRelative <= 6 && availableDice.includes(fromRelative)) {
              const matchingDieIndex = availableDice.indexOf(fromRelative)
              if (matchingDieIndex !== -1) {
                usedDiceValues.push(fromRelative)
                console.log('[applyAIMove] Single bear-off move fallback - used die:', fromRelative)
              }
            }
          }
        } else {
          // Regular move: convert absolute coordinates to relative coordinates for distance calculation
          const fromRelative = absoluteToRelative(move.from, currentPlayer)
          const toRelative = absoluteToRelative(move.to, currentPlayer)
          const distance = calculateMoveDistance(fromRelative, toRelative, moveOwner)
          if (distance !== null && distance > 0) {
            // Find an available die that matches this distance
            const matchingDieIndex = availableDice.indexOf(distance)
            if (matchingDieIndex !== -1) {
              usedDiceValues.push(distance)
              console.log('[applyAIMove] Single regular move - used die:', distance)
            }
          }
        }
      }

      // Update turn state with used dice
      const newUsedDice = [...(currentTurnState.usedDice || []), ...usedDiceValues]

      console.log('[applyAIMove] Dice usage:', {
        usedDiceValues,
        previousUsedDice: currentTurnState.usedDice || [],
        newUsedDice,
        totalDice: currentTurnState.dice.length,
        allDiceUsed: newUsedDice.length >= currentTurnState.dice.length
      })

      // Check if turn is complete (all dice used OR all checkers borne off)
      const allDiceUsed = newUsedDice.length >= currentTurnState.dice.length
      
      // Check if all checkers are borne off (end of game)
      const updatedBoardState = parseXGID(updatedXGID)
      const playerBarCount = moveOwner === 'white' ? updatedBoardState.whiteBar : updatedBoardState.blackBar
      let allCheckersBorneOff = playerBarCount === 0
      if (allCheckersBorneOff) {
        // Check if any checkers remain on the board
        for (let i = 0; i < 24; i++) {
          const pointData = updatedBoardState.points[i]
          if (pointData.count > 0 && pointData.owner === moveOwner) {
            allCheckersBorneOff = false
            break
          }
        }
      }

      // Check if player has won (all 15 checkers borne off)
      if (hasPlayerWon(updatedBoardState, moveOwner)) {
        setWinner(moveOwner)
      }

      if (allDiceUsed || allCheckersBorneOff) {
        console.log('[applyAIMove] Turn complete - switching player', { allDiceUsed, allCheckersBorneOff })
        // End turn - switch to next player and clear dice

        // Increment move number after opening turn completes
        if (moveNumber === 1) {
          setMoveNumber(2)
          setOpeningRollDice(null) // Clear opening roll dice after first turn
        }

        // Update XGID to switch player and clear dice
        const parts = updatedXGID.split(':')
        const currentPlayer = parseInt(parts[3])
        const nextPlayer = currentPlayer === 1 ? -1 : 1
        parts[3] = nextPlayer.toString()
        parts[4] = '00' // Clear dice
        const finalXGID = parts.join(':')

        setEditableXGID(finalXGID)
        setTurnState(null)
        
        // Notify parent that used dice should be reset (turn complete)
        if (onUsedDiceChange) {
          onUsedDiceChange([])
        }

        if (onChange) {
          onChange(finalXGID)
        }
      } else {
        // Partial turn - update board but don't switch player
        console.log('[applyAIMove] Partial turn - updating turnState with used dice')
        setEditableXGID(updatedXGID)
        const updatedTurnState = {
          ...currentTurnState,
          usedDice: newUsedDice
        }
        setTurnState(updatedTurnState)
        
        // Notify parent of used dice change
        if (onUsedDiceChange) {
          onUsedDiceChange(newUsedDice)
        }

        if (onChange) {
          onChange(updatedXGID)
        }
      }
    } else {
      // Not in PLAY mode or no turn state - just update XGID
      console.log('[applyAIMove] Not in PLAY mode - updating XGID directly')
      const updatedBoardState = parseXGID(updatedXGID)
      
      // Check if player has won (all 15 checkers borne off)
      if (hasPlayerWon(updatedBoardState, moveOwner)) {
        setWinner(moveOwner)
      }
      
      setEditableXGID(updatedXGID)
      if (onChange) {
        onChange(updatedXGID)
      }
    }

    // Clear the AI analysis after applying
    if (onClearAiAnalysis) {
      onClearAiAnalysis()
    }
  }

  // Apply move when applyMoveTrigger changes (triggered by external Apply button)
  // Only trigger when applyMoveTrigger > 0 (initial value is 0, so it won't trigger on mount)
  // Use a ref to track the last applied trigger value to prevent re-applying the same move
  const lastAppliedTriggerRef = useRef(0)
  useEffect(() => {
    console.log('[useEffect applyMoveTrigger] Triggered:', {
      applyMoveTrigger,
      lastApplied: lastAppliedTriggerRef.current,
      aiAnalysis: aiAnalysis ? { hasMove: !!aiAnalysis.move, move: aiAnalysis.move } : null
    })
    // Only apply if trigger has actually incremented (not just initialized or reset)
    // Check aiAnalysis inside the effect to get the latest value without adding it to dependencies
    if (applyMoveTrigger > 0 && applyMoveTrigger !== lastAppliedTriggerRef.current) {
      // Get the latest aiAnalysis value from the closure
      if (aiAnalysis && aiAnalysis.move) {
        console.log('[useEffect applyMoveTrigger] Calling applyAIMove')
        lastAppliedTriggerRef.current = applyMoveTrigger
        applyAIMove(aiAnalysis.move)
      } else {
        console.warn('[useEffect applyMoveTrigger] Cannot apply move - no aiAnalysis or move:', {
          hasAiAnalysis: !!aiAnalysis,
          hasMove: aiAnalysis?.move ? true : false
        })
      }
    }
  }, [applyMoveTrigger]) // Only depend on applyMoveTrigger to avoid re-running when aiAnalysis changes
  
  // ========== EDITABLE MODE UTILITY FUNCTIONS ==========
  
  /**
   * Convert board state back to XGID string format
   * @param {Object} boardState - Board state object from parseXGID
   * @param {Array} originalParts - Original XGID parts array to preserve xg2, xg3, etc.
   * @returns {string} - XGID string
   */
  const boardStateToXGID = (boardState, originalParts = []) => {
    // Character mapping: count to character
    const countToChar = (count, owner) => {
      if (count === 0) return '-'
      if (owner === 'black') {
        // Lowercase: a=1, b=2, ..., o=15
        if (count >= 1 && count <= 15) {
          return String.fromCharCode('a'.charCodeAt(0) + count - 1)
        }
      } else if (owner === 'white') {
        // Uppercase: A=1, B=2, ..., O=15
        if (count >= 1 && count <= 15) {
          return String.fromCharCode('A'.charCodeAt(0) + count - 1)
        }
      }
      return '-'
    }
    
    // Build the 26-character xg1 string
    const chars = []
    
    // Position 1: BLACK checkers on bar
    chars[0] = countToChar(boardState.blackBar, 'black')
    
    // Positions 2-25: Points 1-24 (from WHITE's perspective)
    for (let i = 1; i <= 24; i++) {
      const pointData = boardState.points[i - 1] // points array is 0-indexed
      chars[i] = countToChar(pointData.count, pointData.owner)
    }
    
    // Position 26: WHITE checkers on bar
    chars[25] = countToChar(boardState.whiteBar, 'white')
    
    // Build XGID string: xg1:xg2:xg3:xg4:xg5:xg6:xg7:xg8:xg9:xg10
    const xgidParts = [chars.join('')]
    
    // Preserve xg2 (cubeValue), xg3 (cubeOwner), xg4 (player), and xg5 (dice) from original XGID
    if (originalParts.length > 1) {
      xgidParts.push(originalParts[1]) // xg2 (cubeValue)
    }
    if (originalParts.length > 2) {
      xgidParts.push(originalParts[2]) // xg3 (cubeOwner)
    }
    if (originalParts.length > 3) {
      xgidParts.push(originalParts[3]) // xg4 (player)
    }
    if (originalParts.length > 4) {
      xgidParts.push(originalParts[4]) // xg5 (dice)
    }
    // Preserve xg6-xg10 (match play values) from original XGID, or use defaults if missing
    for (let i = 5; i < 10; i++) {
      if (originalParts.length > i) {
        xgidParts.push(originalParts[i]) // Preserve existing value
      } else {
        // Use defaults: xg6-xg9 = 0, xg10 = 10
        xgidParts.push(i === 9 ? '10' : '0')
      }
    }
    // Preserve any additional parts beyond xg10 (shouldn't normally exist)
    for (let i = 10; i < originalParts.length; i++) {
      xgidParts.push(originalParts[i])
    }
    
    return xgidParts.join(':')
  }
  
  
  /**
   * Update XGID for a move
   * @param {string} currentXGID - Current XGID string
   * @param {number} from - Source point number (1-24, 0 for black bar, 25 for white bar, -1 for black tray, -2 for white tray)
   * @param {number} to - Destination point number (same as from)
   * @param {number} count - Number of checkers to move
   * @param {string} owner - Owner of checkers ('black' or 'white')
   * @returns {string} - New XGID string
   */
  const updateXGIDForMove = (currentXGID, from, to, count, owner) => {
    if (!currentXGID) return currentXGID
    
    const boardState = parseXGID(currentXGID)
    const xgidParts = currentXGID.split(':')
    
    // Get current player for coordinate conversion
    const currentPlayer = boardState.player !== undefined ? boardState.player : 1
    
    // Handle tray moves
    if (from === -1 || from === -2) {
      // Moving from tray
      // Calculate how many checkers are in tray: 15 - bar - points
      const trayOwner = from === -1 ? 'black' : 'white'
      const barCount = trayOwner === 'black' ? boardState.blackBar : boardState.whiteBar
      const pointCount = boardState.points.reduce((sum, p) => sum + (p.owner === trayOwner ? p.count : 0), 0)
      const trayCount = 15 - barCount - pointCount
      
      // Can't move more than available
      if (count > trayCount) return currentXGID
      
      // Moving to a point (to is in relative coordinates)
      if (to >= 1 && to <= 24) {
        const toAbsolute = relativeToAbsolute(to, currentPlayer)
        const toIndex = toAbsolute - 1
        const toPointData = boardState.points[toIndex]
        
        // Prevent moving to a point occupied by opponent checkers (unless it's a single blot that can be hit)
        if (toPointData.count > 0 && toPointData.owner && toPointData.owner !== owner) {
          // Only allow hitting a single opponent checker (blot)
          if (toPointData.count > 1) {
            return currentXGID // Invalid move - point is occupied by opponent
          }
          // Handle hitting opponent blot (count === 1)
          if (toPointData.owner === 'black') {
            boardState.blackBar++
          } else {
            boardState.whiteBar++
          }
          toPointData.count = 0
          toPointData.owner = null
        }
        
        // Add checkers to destination
        if (toPointData.count === 0) {
          toPointData.owner = owner
        }
        toPointData.count += count
      } else if (to === 0 || to === 25) {
        // Moving to bar (shouldn't normally happen from tray, but allow it)
        // Enforce bar owner rules
        if (to === 0) {
          if (owner !== 'black') {
            return currentXGID // Invalid move - can't drop non-black checker on black bar
          }
          boardState.blackBar += count
        } else {
          if (owner !== 'white') {
            return currentXGID // Invalid move - can't drop non-white checker on white bar
          }
          boardState.whiteBar += count
        }
      }
      
      return boardStateToXGID(boardState, xgidParts)
    }
    
    if (to === -1 || to === -2) {
      // Moving to tray
      const trayOwner = to === -1 ? 'black' : 'white'
      
      // Always enforce tray owner rules: BLACK checkers can only go to black tray, WHITE checkers can only go to white tray
      if (owner !== trayOwner) {
        return currentXGID // Invalid move - can't drop checker on wrong tray
      }
      
      // Remove checkers from source (from is in relative coordinates)
      if (from >= 1 && from <= 24) {
        const fromAbsolute = relativeToAbsolute(from, currentPlayer)
        const fromIndex = fromAbsolute - 1
        const fromPointData = boardState.points[fromIndex]
        if (fromPointData.count < count || fromPointData.owner !== owner) {
          return currentXGID // Invalid move
        }
        fromPointData.count -= count
        if (fromPointData.count === 0) {
          fromPointData.owner = null
        }
      } else if (from === 0) {
        // Moving from black bar
        if (boardState.blackBar < count) return currentXGID
        boardState.blackBar -= count
      } else if (from === 25) {
        // Moving from white bar
        if (boardState.whiteBar < count) return currentXGID
        boardState.whiteBar -= count
      }
      
      return boardStateToXGID(boardState, xgidParts)
    }
    
    // Regular point-to-point or bar-to-point move
    // Remove from source (from is in relative coordinates)
    if (from >= 1 && from <= 24) {
      const fromAbsolute = relativeToAbsolute(from, currentPlayer)
      const fromIndex = fromAbsolute - 1
      const fromPointData = boardState.points[fromIndex]
      if (fromPointData.count < count || (effectiveEditingMode === 'play' && fromPointData.owner !== owner)) {
        return currentXGID // Invalid move
      }
      fromPointData.count -= count
      if (fromPointData.count === 0) {
        fromPointData.owner = null
      }
    } else if (from === 0) {
      // Moving from black bar
      if (boardState.blackBar < count) return currentXGID
      boardState.blackBar -= count
    } else if (from === 25) {
      // Moving from white bar
      if (boardState.whiteBar < count) return currentXGID
      boardState.whiteBar -= count
    }
    
    // Add to destination (to is in relative coordinates)
    if (to >= 1 && to <= 24) {
      const toAbsolute = relativeToAbsolute(to, currentPlayer)
      const toIndex = toAbsolute - 1
      const toPointData = boardState.points[toIndex]
      
      // Prevent moving to a point occupied by opponent checkers (unless it's a single blot that can be hit)
      if (toPointData.count > 0 && toPointData.owner && toPointData.owner !== owner) {
        // Only allow hitting a single opponent checker (blot)
        if (toPointData.count > 1) {
          return currentXGID // Invalid move - point is occupied by opponent
        }
        // Handle hitting opponent blot (count === 1)
        if (toPointData.owner === 'black') {
          boardState.blackBar++
        } else {
          boardState.whiteBar++
        }
        toPointData.count = 0
        toPointData.owner = null
      }
      
      // Add checkers to destination
      if (toPointData.count === 0) {
        toPointData.owner = owner
      }
      toPointData.count += count
    } else if (to === 0) {
      // Moving to black bar - only allow BLACK checkers
      if (owner !== 'black') {
        return currentXGID // Invalid move
      }
      boardState.blackBar += count
    } else if (to === 25) {
      // Moving to white bar - only allow WHITE checkers
      if (owner !== 'white') {
        return currentXGID // Invalid move
      }
      boardState.whiteBar += count
    }
    
    return boardStateToXGID(boardState, xgidParts)
  }
  
  /**
   * Update dice value in XGID
   * @param {string} currentXGID - Current XGID string
   * @param {number} dieIndex - Which die to update (0 or 1)
   * @returns {string} - New XGID string
   */
  const updateDice = (currentXGID, dieIndex) => {
    if (!currentXGID) return currentXGID
    
    const parts = currentXGID.split(':')
    const currentDice = parts[4] || '00'
    
    // Parse dice values - handle "00" case explicitly
    let die1 = parseInt(currentDice[0])
    let die2 = parseInt(currentDice[1])
    
    // If dice is "00" or invalid, start from 1
    if (isNaN(die1) || die1 === 0) die1 = 1
    if (isNaN(die2) || die2 === 0) die2 = 1
    
    // Cycle the clicked die: 1→2→3→4→5→6→1
    if (dieIndex === 0) {
      die1 = die1 >= 6 ? 1 : die1 + 1
    } else {
      die2 = die2 >= 6 ? 1 : die2 + 1
    }
    
    // Update dice string
    parts[4] = `${die1}${die2}`
    
    // Ensure all parts exist
    while (parts.length < 10) {
      if (parts.length === 9) {
        parts.push('10')
      } else {
        parts.push('0')
      }
    }
    
    return parts.join(':')
  }
  
  /**
   * Roll random dice and update XGID
   * @param {string} currentXGID - Current XGID string
   * @returns {string} - New XGID string with random dice values
   */
  const rollRandomDice = (currentXGID) => {
    if (!currentXGID) return currentXGID
    
    const parts = currentXGID.split(':')
    
    // Roll two random dice (1-6 each)
    const die1 = Math.floor(Math.random() * 6) + 1
    const die2 = Math.floor(Math.random() * 6) + 1
    
    // Update dice string
    parts[4] = `${die1}${die2}`
    
    // Ensure all parts exist
    while (parts.length < 10) {
      if (parts.length === 9) {
        parts.push('10')
      } else {
        parts.push('0')
      }
    }
    
    return parts.join(':')
  }
  
  /**
   * Update cube value in XGID
   * @param {string} currentXGID - Current XGID string
   * @returns {string} - New XGID string
   */
  const updateCubeValue = (currentXGID) => {
    if (!currentXGID) return currentXGID
    
    const parts = currentXGID.split(':')
    const currentCubeValue = parseInt(parts[1] || '0') || 0
    
    // Cycle cube value: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 0
    const newCubeValue = (currentCubeValue + 1) % 7
    
    parts[1] = String(newCubeValue)
    
    // Ensure all parts exist
    while (parts.length < 10) {
      if (parts.length === 9) {
        parts.push('10')
      } else {
        parts.push('0')
      }
    }
    
    return parts.join(':')
  }
  
  /**
   * Get point number from screen coordinates
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number|null} - Point number (1-24), 0 for black bar, 25 for white bar, -1 for black tray, -2 for white tray, or null
   */
  const getPointFromCoordinates = (x, y) => {
    // Check if over bar
    const barX = leftBorderWidth + (innerWidth - BAR_WIDTH) / 2
    const barLeft = barX
    const barRight = barX + BAR_WIDTH
    if (x >= barLeft && x <= barRight) {
      // Check if in top or bottom half
      const barTop = topBorderWidth
      const barBottom = topBorderWidth + innerHeight
      const barMid = topBorderWidth + innerHeight / 2
      if (y >= barTop && y <= barMid) {
        return 0 // Black bar
      } else if (y > barMid && y <= barBottom) {
        return 25 // White bar
      }
    }
    
    // Check if over trays
    if (activeShowTrays) {
      const trayX = activeDirection === 0 
        ? BOARD_WIDTH - rightBorderWidth + (rightBorderWidth - trayWidth) / 2
        : (leftBorderWidth - trayWidth) / 2
      const trayLeft = trayX
      const trayRight = trayX + trayWidth
      
      if (x >= trayLeft && x <= trayRight) {
        const topTrayY = topBorderWidth + (quadrantHeight - trayHeight) / 2
        const topTrayBottom = topTrayY + trayHeight
        const bottomTrayY = topBorderWidth + quadrantHeight + (quadrantHeight - trayHeight) / 2
        const bottomTrayBottom = bottomTrayY + trayHeight
        
        if (y >= topTrayY && y <= topTrayBottom) {
          return -1 // Black tray
        } else if (y >= bottomTrayY && y <= bottomTrayBottom) {
          return -2 // White tray
        }
      }
    }
    
    // Check points
    for (let pointNum = 1; pointNum <= 24; pointNum++) {
      const pos = getPointPosition(pointNum)
      if (!pos) continue
      
      const { quadrantIndex, pointIndex } = pos
      const isTopHalf = quadrantIndex === 0 || quadrantIndex === 1
      const isRight = quadrantIndex === 0 || quadrantIndex === 3
      const quadrantX = isRight ? rightQuadrantX : leftQuadrantX
      const quadrantY = isTopHalf ? topBorderWidth : topBorderWidth + quadrantHeight
      
      const pointX = quadrantX + pointIndex * pointWidth
      const baseY = isTopHalf ? quadrantY : quadrantY + quadrantHeight
      const tipY = isTopHalf ? baseY + pointHeight : baseY - pointHeight
      
      // Check if point is within bounds
      const pointLeft = pointX
      const pointRight = pointX + pointWidth
      const pointTop = Math.min(baseY, tipY)
      const pointBottom = Math.max(baseY, tipY)
      
      if (x >= pointLeft && x <= pointRight && y >= pointTop && y <= pointBottom) {
        // Return pointNum in white's absolute perspective (1-24)
        // This is needed for rendering with getPointPosition
        // Will be converted to relative coordinates when calling validateMove
        return pointNum
      }
    }
    
    return null
  }
  
  /**
   * Get tray identifier from coordinates
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {'black'|'white'|null} - Tray identifier or null
   */
  const getTrayFromCoordinates = (x, y) => {
    if (!activeShowTrays) return null
    
    const trayX = activeDirection === 0 
      ? BOARD_WIDTH - rightBorderWidth + (rightBorderWidth - trayWidth) / 2
      : (leftBorderWidth - trayWidth) / 2
    const trayLeft = trayX
    const trayRight = trayX + trayWidth
    
    if (x >= trayLeft && x <= trayRight) {
      const topTrayY = topBorderWidth + (quadrantHeight - trayHeight) / 2
      const topTrayBottom = topTrayY + trayHeight
      const bottomTrayY = topBorderWidth + quadrantHeight + (quadrantHeight - trayHeight) / 2
      const bottomTrayBottom = bottomTrayY + trayHeight
      
      if (y >= topTrayY && y <= topTrayBottom) {
        return 'black'
      } else if (y >= bottomTrayY && y <= bottomTrayBottom) {
        return 'white'
      }
    }
    
    return null
  }
  
  /**
   * Check if click coordinates are in the dice area (where dice would be displayed)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} - True if click is in dice area and dice are currently hidden
   */
  const isClickInDiceArea = (x, y) => {
    if (!isEditable) return false
    
    // Check if dice are currently hidden (would be "00")
    const currentXGID = editableXGID || effectiveXGID || xgid
    if (!currentXGID) return false
    const boardState = parseXGID(currentXGID)
    if (boardState.dice && boardState.dice !== "00") return false // Dice already shown
    
    // Dice area: right quadrant, centered vertically
    const diceY = topBorderWidth + innerHeight / 2
    const dieSize = BAR_WIDTH * 0.8
    const diceAreaHeight = dieSize * 2 // Area around dice center
    const diceAreaTop = diceY - diceAreaHeight / 2
    const diceAreaBottom = diceY + diceAreaHeight / 2
    
    // Check if in right quadrant horizontally
    const diceAreaLeft = rightQuadrantX
    const diceAreaRight = rightQuadrantX + quadrantWidth
    
    return x >= diceAreaLeft && x <= diceAreaRight && 
           y >= diceAreaTop && y <= diceAreaBottom
  }
  
  // Drag handlers
  const handleCheckerMouseDown = (e, point, stackPosition, owner, count, isTray = false, trayOwner = null) => {
    // Prevent dragging during opening roll doubles state
    const currentXGID = editableXGID || effectiveXGID || xgid
    if (currentXGID) {
      const boardState = parseXGID(currentXGID)
      if (boardState.player === 0 && openingRollDice && openingRollDice.winner === null) {
        // Opening roll doubles state - no moves allowed
        return
      }
    }
    if (!isEditable) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const svg = e.currentTarget.closest('svg')
    if (!svg) return
    
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Convert point to relative coordinates (point comes in as white's absolute perspective)
    // Determine current player for coordinate conversion:
    // - In PLAY mode: use turnState.currentPlayer (most accurate for game logic)
    // - In EDIT mode: use finalEffectivePlayer (display player, allows moving any checker)
    let currentPlayer = 1 // Default to white
    if (effectiveEditingMode === 'play') {
      // Play mode: use turnState which tracks the actual current player
      if (turnState && turnState.currentPlayer) {
        currentPlayer = turnState.currentPlayer === 'black' ? -1 : 1
      } else {
        // Fallback: derive from owner (in play mode you can only move your own pieces)
        currentPlayer = owner === 'black' ? -1 : 1
      }
    } else {
      // Edit mode: use display player (allows moving any checker from any perspective)
      currentPlayer = finalEffectivePlayer !== undefined ? finalEffectivePlayer : 1
    }
    
    const relativePoint = isTray 
      ? (trayOwner === 'black' ? -1 : -2)  // Trays don't need conversion
      : (point === 0 || point === 25 
          ? point  // Bars don't need conversion
          : (currentPlayer === 1 
              ? point  // White's turn - already relative
              : 25 - point))  // Black's turn - convert to relative
    
    setDraggedChecker({
      point: relativePoint,
      stackPosition,
      owner,
      count,
      isTray,
      trayOwner
    })
    setDragPosition({ x, y })
    setDragScreenPosition({ x: e.clientX, y: e.clientY })
  }
  
  // Double-click handler to move checkers to appropriate tray
  // Moves only the clicked checker and all checkers above it (same behavior as dragging)
  const handleCheckerDoubleClick = (e, point, owner, count, isTray = false) => {
    if (!isEditable) return
    
    e.preventDefault()
    e.stopPropagation()
    
    // Don't move if already in tray
    if (isTray) return
    
    // Don't move if there are no checkers
    if (count === 0) return
    
    // Determine target tray based on owner
    const targetTray = owner === 'black' ? -1 : -2
    
    const currentXGID = editableXGID || effectiveXGID || xgid
    if (!currentXGID) return
    
    const boardState = parseXGID(currentXGID)
    
    // Convert point to relative coordinates (point comes in as white's absolute perspective)
    // Use the actual current player from boardState, not the display player
    const currentPlayer = boardState.player !== undefined ? boardState.player : 1
    const relativePoint = (point === 0 || point === 25) 
      ? point  // Bars don't need conversion
      : (currentPlayer === 1 
          ? point  // White's turn - already relative
          : 25 - point)  // Black's turn - convert to relative
    
    // Use the count parameter directly - it already represents the clicked checker and all above it
    // (same as drag behavior)
    
    // Validate move (should always pass for tray moves of own checkers)
    if (validateMove(relativePoint, targetTray, count, owner, effectiveEditingMode, boardState, turnState)) {
      // Update XGID - move only the clicked checker and checkers above it to tray
      const newXGID = updateXGIDForMove(currentXGID, relativePoint, targetTray, count, owner)
      
      // Check if player has won (all 15 checkers borne off)
      const newBoardState = parseXGID(newXGID)
      if (hasPlayerWon(newBoardState, owner)) {
        setWinner(owner)
      }
      
      setEditableXGID(newXGID)
      
      // Track dice usage in PLAY mode (same logic as handleGlobalMouseUp)
      if (effectiveEditingMode === 'play' && turnState && turnState.dice && turnState.dice.length > 0) {
        const distance = calculateMoveDistance(relativePoint, targetTray, owner)
        if (distance !== null && distance > 0) {
          const availableDice = getAvailableDice(turnState.dice, turnState.usedDice || [])
          const checkersToMove = count
          const isBearingOff = (targetTray === -1 || targetTray === -2)
          
          let diceToUse = []
          if (isBearingOff) {
            // For bearing off: point N can only bear off with die N (point number = die number)
            // Exception: if lowest remaining die > highest occupied point, must bear off from highest point
            const fromPoint = relativePoint
            const bearingOff = canBearOff(boardState, owner, boardState.player)
            const highestOccupiedPoint = bearingOff ? getHighestOccupiedPoint(boardState, owner, boardState.player) : null
            
            if (highestOccupiedPoint !== null && availableDice.length > 0) {
              const lowestRemainingDie = Math.min(...availableDice)
              if (lowestRemainingDie > highestOccupiedPoint) {
                // Exception: lowest remaining die exceeds highest occupied point - must use dice to bear off from highest point
                if (fromPoint === highestOccupiedPoint) {
                  // Use multiple dice of the lowest die value (which exceeds highest occupied point) for multi-checker moves
                  const matchingDice = availableDice.filter(d => d === lowestRemainingDie)
                  if (matchingDice.length >= checkersToMove) {
                    diceToUse = matchingDice.slice(0, checkersToMove)
                  }
                }
              } else {
                // Normal bearing off: point number must equal die number
                const matchingDice = availableDice.filter(d => d === fromPoint)
                if (matchingDice.length >= checkersToMove) {
                  diceToUse = matchingDice.slice(0, checkersToMove)
                }
              }
            } else {
              // Normal bearing off: point number must equal die number
              const matchingDice = availableDice.filter(d => d === fromPoint)
              if (matchingDice.length >= checkersToMove) {
                diceToUse = matchingDice.slice(0, checkersToMove)
              }
            }
          } else {
            // For regular moves, find dice === distance
            const usableDice = availableDice.filter(d => d === distance)
            if (usableDice.length >= checkersToMove) {
              diceToUse = usableDice.slice(0, checkersToMove)
            }
          }
          
          if (diceToUse.length >= checkersToMove) {
            const newBoardState = parseXGID(newXGID)
            const updatedTurnState = {
              ...turnState,
              usedDice: [...(turnState.usedDice || []), ...diceToUse],
              noLegalMoves: false
            }
            
            const barCount = updatedTurnState.currentPlayer === 'black' ? newBoardState.blackBar : newBoardState.whiteBar
            updatedTurnState.mustEnterFromBar = barCount > 0
            
            const remainingLegalMoves = getLegalMoves(newBoardState, updatedTurnState)
            const allDiceUsed = updatedTurnState.usedDice.length >= turnState.dice.length

            if (remainingLegalMoves.length === 0) {
              updatedTurnState.isTurnComplete = true
              updatedTurnState.noLegalMoves = true
              
              // Increment move number after opening turn completes
              if (moveNumber === 1) {
                setMoveNumber(2)
                setOpeningRollDice(null) // Clear opening roll dice after first turn
              }
              
              const nextPlayer = updatedTurnState.currentPlayer === 'white' ? -1 : 1
              const parts = newXGID.split(':')
              parts[3] = String(nextPlayer)
              parts[4] = '00'
              const finalXGID = parts.join(':')
              setEditableXGID(finalXGID)
              setTurnState(null)
              
              if (onChange) {
                onChange(finalXGID)
              }
            } else if (allDiceUsed) {
              updatedTurnState.isTurnComplete = true
              
              // Increment move number after opening turn completes
              if (moveNumber === 1) {
                setMoveNumber(2)
                setOpeningRollDice(null) // Clear opening roll dice after first turn
              }
              
              const nextPlayer = updatedTurnState.currentPlayer === 'white' ? -1 : 1
              const parts = newXGID.split(':')
              parts[3] = String(nextPlayer)
              parts[4] = '00'
              const finalXGID = parts.join(':')
              setEditableXGID(finalXGID)
              setTurnState(null)
              
              if (onChange) {
                onChange(finalXGID)
              }
            } else {
              setTurnState(updatedTurnState)
      if (onChange) {
        onChange(newXGID)
              }
            }
          } else {
            if (onChange) {
              onChange(newXGID)
            }
          }
        } else {
          if (onChange) {
            onChange(newXGID)
          }
        }
      } else {
        if (onChange) {
          onChange(newXGID)
        }
      }
    }
  }
  
  // Global mouse move handler for drag (works even when mouse leaves SVG)
  useEffect(() => {
    // Set up handlers for AI dragging or regular checker dragging
    if (!isEditable || (!draggedChecker && !isDraggingAi)) return
    
    const handleGlobalMouseMove = (e) => {
      // Handle AI window dragging
      if (isDraggingAi) {
        const newX = Math.max(0, Math.min(window.innerWidth - 400, e.clientX - aiDragStart.x))
        const newY = Math.max(0, Math.min(window.innerHeight - 200, e.clientY - aiDragStart.y))
        setAiWindowPosition({
          x: newX,
          y: newY
        })
        return
      }
    
      // Find the SVG element
      const svg = document.querySelector('.backgammon-board')
      if (!svg) return
      
      const rect = svg.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      // Update screen position (always, even if outside SVG)
      setDragScreenPosition({ x: e.clientX, y: e.clientY })
      
      // Update SVG-relative position and detect drop zone only if mouse is over SVG
      if (e.clientX >= rect.left && e.clientX <= rect.right && 
          e.clientY >= rect.top && e.clientY <= rect.bottom) {
        setDragPosition({ x, y })
        const dropPoint = getPointFromCoordinates(x, y)
        setDragOverPoint(dropPoint)
      } else {
        // Clear drop zone highlight when outside SVG, but keep last SVG position
        setDragOverPoint(null)
      }
    }
    
    const handleGlobalMouseUp = (e) => {
      // Always reset AI dragging on mouse up
      if (isDraggingAi) {
        setIsDraggingAi(false)
      }

      if (!draggedChecker) return
      
      // Prevent moves during opening roll doubles state
      const currentXGID = editableXGID || effectiveXGID || xgid
      if (currentXGID) {
        const boardState = parseXGID(currentXGID)
        if (boardState.player === 0 && openingRollDice && openingRollDice.winner === null) {
          // Opening roll doubles state - no moves allowed
          setDraggedChecker(null)
          setDragPosition(null)
          setDragOverPoint(null)
          setDragScreenPosition({ x: 0, y: 0 })
          return
        }
      }
      
      // Find the SVG element
      const svg = document.querySelector('.backgammon-board')
      if (!svg) return
      
      const rect = svg.getBoundingClientRect()
      
      // Check if mouse is over SVG when released
      if (e.clientX >= rect.left && e.clientX <= rect.right && 
          e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        
        const dropPointAbsolute = getPointFromCoordinates(x, y)
        
        if (dropPointAbsolute !== null) {
          if (currentXGID) {
            const boardState = parseXGID(currentXGID)
            
            // Convert dropPoint from absolute to relative coordinates
            // dropPointAbsolute is in white's absolute perspective (1-24)
            // updateXGIDForMove expects relative coordinates based on boardState.player
            // In EDIT mode, use finalEffectivePlayer if available; in PLAY mode, use boardState.player
            const currentPlayerForConversion = effectiveEditingMode === 'play' 
              ? (boardState.player !== undefined ? boardState.player : 1)
              : (finalEffectivePlayer !== undefined ? finalEffectivePlayer : (boardState.player !== undefined ? boardState.player : 1))
            
            const dropPoint = (dropPointAbsolute >= 1 && dropPointAbsolute <= 24)
              ? (currentPlayerForConversion === -1 ? 25 - dropPointAbsolute : dropPointAbsolute)
              : dropPointAbsolute
            
            // For validation, convert to relative coordinates based on draggedChecker.owner
            const dropPointForValidation = (dropPointAbsolute >= 1 && dropPointAbsolute <= 24)
              ? (draggedChecker.owner === 'black' ? 25 - dropPointAbsolute : dropPointAbsolute)
              : dropPointAbsolute
              
            if (dropPointForValidation !== draggedChecker.point) {
            // Validate move
              if (validateMove(draggedChecker.point, dropPointForValidation, draggedChecker.count, draggedChecker.owner, effectiveEditingMode, boardState, turnState)) {
                // Update XGID - use dropPoint (relative to boardState.player) for updateXGIDForMove
              const newXGID = updateXGIDForMove(currentXGID, draggedChecker.point, dropPoint, draggedChecker.count, draggedChecker.owner)
              
              // Check if player has won (all 15 checkers borne off)
              const newBoardState = parseXGID(newXGID)
              if (hasPlayerWon(newBoardState, draggedChecker.owner)) {
                setWinner(draggedChecker.owner)
              }
              
              // Track dice usage in PLAY mode (or FREE mode if dice are present)
              // Initialize turnState if it doesn't exist (can happen on first move)
              // IMPORTANT: Always use ref first to get the latest turnState value synchronously
              // since React state updates are async and we might be reading stale state
              let currentTurnState = turnStateRef.current
              if (!currentTurnState) {
                currentTurnState = turnState
              }
              // Allow dice tracking in both 'play' and 'free' modes if dice are present
              const shouldTrackDice = (effectiveEditingMode === 'play' || effectiveEditingMode === 'free') && boardState.dice && boardState.dice !== '00'
              if (shouldTrackDice && !currentTurnState) {
                const die1 = parseInt(boardState.dice[0])
                const die2 = parseInt(boardState.dice[1])
                if (!isNaN(die1) && !isNaN(die2) && die1 > 0 && die2 > 0) {
                  const diceArray = die1 === die2 ? [die1, die1, die1, die1] : [die1, die2]
                  const moveOwner = draggedChecker.owner
                  const barCount = moveOwner === 'black' ? boardState.blackBar : boardState.whiteBar
                  currentTurnState = {
                    currentPlayer: moveOwner,
                    dice: diceArray,
                    usedDice: [],
                    isTurnComplete: false,
                    mustEnterFromBar: barCount > 0,
                    noLegalMoves: false
                  }
                  console.log('[handleGlobalMouseUp] Initializing turnState:', currentTurnState)
                  turnStateRef.current = currentTurnState // Update ref immediately
                  setTurnState(currentTurnState)
                } else {
                  console.warn('[handleGlobalMouseUp] Cannot initialize turnState - invalid dice:', boardState.dice)
                }
              } else if (!currentTurnState) {
                console.warn('[handleGlobalMouseUp] No turnState and cannot initialize:', {
                  effectiveEditingMode,
                  dice: boardState.dice,
                  hasTurnState: !!turnState
                })
              } else {
                console.log('[handleGlobalMouseUp] Using existing turnState:', {
                  currentPlayer: currentTurnState.currentPlayer,
                  dice: currentTurnState.dice,
                  usedDice: currentTurnState.usedDice
                })
              }
              
              // Update board state first (always)
              setEditableXGID(newXGID)
              
              // Then handle turn state and dice tracking (in both play and free modes if dice are present)
              if (shouldTrackDice && currentTurnState && currentTurnState.dice && currentTurnState.dice.length > 0) {
                  const distance = calculateMoveDistance(draggedChecker.point, dropPointForValidation, draggedChecker.owner)
                if (distance !== null && distance > 0) {
                  const availableDice = getAvailableDice(currentTurnState.dice, currentTurnState.usedDice || [])
                  const isBearingOff = (dropPointForValidation === -1 || dropPointForValidation === -2)
                  const checkersToMove = draggedChecker.count
                  
                  // Find dice that can be used for this move
                  let diceToUse = []
                  if (isBearingOff) {
                    // For bearing off: point N can only bear off with die N (point number = die number)
                    // Exception: if lowest remaining die > highest occupied point, must bear off from highest point
                    const fromPoint = draggedChecker.point
                    const bearingOff = canBearOff(boardState, draggedChecker.owner, boardState.player)
                    const highestOccupiedPoint = bearingOff ? getHighestOccupiedPoint(boardState, draggedChecker.owner, boardState.player) : null
                    
                    if (highestOccupiedPoint !== null && availableDice.length > 0) {
                      const lowestRemainingDie = Math.min(...availableDice)
                      if (lowestRemainingDie > highestOccupiedPoint) {
                        // Exception: lowest remaining die exceeds highest occupied point - must use dice to bear off from highest point
                        if (fromPoint === highestOccupiedPoint) {
                          // Use multiple dice of the lowest die value (which exceeds highest occupied point) for multi-checker moves
                          const matchingDice = availableDice.filter(d => d === lowestRemainingDie)
                          if (matchingDice.length >= checkersToMove) {
                            diceToUse = matchingDice.slice(0, checkersToMove)
                          }
                        }
                      } else {
                        // Normal bearing off: point number must equal die number
                        const matchingDice = availableDice.filter(d => d === fromPoint)
                        if (matchingDice.length >= checkersToMove) {
                          diceToUse = matchingDice.slice(0, checkersToMove)
                        }
                      }
                    } else {
                      // Normal bearing off: point number must equal die number
                      const matchingDice = availableDice.filter(d => d === fromPoint)
                      if (matchingDice.length >= checkersToMove) {
                        diceToUse = matchingDice.slice(0, checkersToMove)
                      }
                    }
                  } else {
                    // For regular moves, find dice === distance
                    const usableDice = availableDice.filter(d => d === distance)
                    if (usableDice.length >= checkersToMove) {
                      diceToUse = usableDice.slice(0, checkersToMove)
                    }
                  }
                  
                  // Use one die per checker moved
                  if (diceToUse.length >= checkersToMove) {
                    const newBoardState = parseXGID(newXGID)
                    const updatedTurnState = {
                      ...currentTurnState,
                      usedDice: [...(currentTurnState.usedDice || []), ...diceToUse],
                      noLegalMoves: false // Reset when a move is made
                    }
                    
                    // Check if player still has checkers on bar
                    const barCount = updatedTurnState.currentPlayer === 'black' ? newBoardState.blackBar : newBoardState.whiteBar
                    updatedTurnState.mustEnterFromBar = barCount > 0
                    
                    // Check if turn should be automatically completed (no legal moves remain)
                    const remainingLegalMoves = getLegalMoves(newBoardState, updatedTurnState)
                    const allDiceUsed = updatedTurnState.usedDice.length >= currentTurnState.dice.length
                    
                    console.log('[handleGlobalMouseUp] Dice usage:', {
                      diceToUse,
                      previousUsedDice: currentTurnState.usedDice || [],
                      newUsedDice: updatedTurnState.usedDice,
                      totalDice: currentTurnState.dice.length,
                      allDiceUsed
                    })
                    
                    // Update turn state FIRST before updating XGID to prevent useEffect from resetting it
                    if (remainingLegalMoves.length === 0) {
                      // No legal moves remain - turn is complete
                      console.log('[handleGlobalMouseUp] Turn complete - no legal moves remain')
                      updatedTurnState.isTurnComplete = true
                      updatedTurnState.noLegalMoves = true
                      
                      // Increment move number after opening turn completes
                      if (moveNumber === 1) {
                        setMoveNumber(2)
                        setOpeningRollDice(null) // Clear opening roll dice after first turn
                      }
                      
                      // Switch to next player and reset dice
                      const nextPlayer = updatedTurnState.currentPlayer === 'white' ? -1 : 1
                      const parts = newXGID.split(':')
                      parts[3] = String(nextPlayer) // Update player
                      parts[4] = '00' // Reset dice
                      const finalXGID = parts.join(':')
                      setEditableXGID(finalXGID)
                      turnStateRef.current = null // Update ref immediately
                      setTurnState(null) // Reset turn state for next player
                      
                      // Notify parent that used dice should be reset (turn complete)
                      if (onUsedDiceChange) {
                        onUsedDiceChange([])
                      }
                      
                      if (onChange) {
                        onChange(finalXGID)
                      }
                    } else if (allDiceUsed) {
                      // All dice used - turn is complete
                      console.log('[handleGlobalMouseUp] Turn complete - all dice used')
                      updatedTurnState.isTurnComplete = true
                      
                      // Increment move number after opening turn completes
                      if (moveNumber === 1) {
                        setMoveNumber(2)
                        setOpeningRollDice(null) // Clear opening roll dice after first turn
                      }
                      
                      const nextPlayer = updatedTurnState.currentPlayer === 'white' ? -1 : 1
                      const parts = newXGID.split(':')
                      parts[3] = String(nextPlayer)
                      parts[4] = '00'
                      const finalXGID = parts.join(':')
                      setEditableXGID(finalXGID)
                      turnStateRef.current = null // Update ref immediately
                      setTurnState(null)
                      
                      // Notify parent that used dice should be reset (turn complete)
                      if (onUsedDiceChange) {
                        onUsedDiceChange([])
                      }
                      
                      if (onChange) {
                        onChange(finalXGID)
                      }
                  } else {
                      // Partial turn - update turn state with used dice
                      console.log('[handleGlobalMouseUp] Partial turn - updating turnState with used dice:', {
                        before: {
                          ref: turnStateRef.current?.usedDice,
                          state: turnState?.usedDice
                        },
                        after: updatedTurnState.usedDice
                      })
                      turnStateRef.current = updatedTurnState // Update ref immediately
                      console.log('[handleGlobalMouseUp] Ref updated, verifying:', {
                        refUsedDice: turnStateRef.current?.usedDice,
                        refCurrent: turnStateRef.current?.currentPlayer
                      })
                      setTurnState(updatedTurnState)
                      
                      // Notify parent of used dice change
                      if (onUsedDiceChange) {
                        onUsedDiceChange(updatedTurnState.usedDice)
                      }
                      
                      if (onChange) {
                        onChange(newXGID)
                      }
                  }
                } else {
                    // Not enough dice - shouldn't happen if validation worked, but notify anyway
                    if (onChange) {
                      onChange(newXGID)
                    }
                  }
                } else {
                  // Invalid distance - shouldn't happen if validation worked
                  if (onChange) {
                    onChange(newXGID)
                  }
                }
              } else {
                // Not play mode or no turn state - just notify
              if (onChange) {
                  onChange(newXGID)
                }
              }
              } else {
                // Invalid move - do nothing
              }
            }
          }
        }
      }
      // If mouse released outside SVG, cancel the drag (don't apply move)
      
      // Reset drag state
      setDraggedChecker(null)
      setDragOverPoint(null)
      setDragScreenPosition({ x: 0, y: 0 })
    }
    
    const mouseMoveHandler = (e) => {
      handleGlobalMouseMove(e)
    }
    const mouseUpHandler = (e) => {
      handleGlobalMouseUp(e)
    }

    document.addEventListener('mousemove', mouseMoveHandler)
    document.addEventListener('mouseup', mouseUpHandler)

    return () => {
      document.removeEventListener('mousemove', mouseMoveHandler)
      document.removeEventListener('mouseup', mouseUpHandler)
    }
  }, [isEditable, draggedChecker, isDraggingAi, aiDragStart, editableXGID, effectiveXGID, xgid, effectiveEditingMode, onChange, turnState])
  
  // Local mouse move handler (for SVG only, but global handler above takes precedence)
  const handleMouseMove = (e) => {
    // This is now handled by global handler, but kept for compatibility
  }
  
  // Local mouse up handler (for SVG only, but global handler above takes precedence)
  const handleMouseUp = (e) => {
    // This is now handled by global handler, but kept for compatibility
  }
  
  // Dice click handler - single click cycles the die value
  const handleDiceClick = (e, dieIndex) => {
    if (!isEditable || effectiveEditingMode !== 'free') return
    
    
    e.preventDefault()
    e.stopPropagation()
    
    // Get click coordinates relative to SVG
    const svg = e.currentTarget.closest('svg')
    if (!svg) return
    
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const currentXGID = editableXGID || effectiveXGID || xgid
    if (!currentXGID) return
    
    // Cycle the die value
    const newXGID = updateDice(currentXGID, dieIndex)
    setEditableXGID(newXGID)
    
    if (onChange) {
      onChange(newXGID)
    }
  }
  
  // Cube click handler
  const handleCubeClick = (e) => {
    if (!isEditable) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const currentXGID = editableXGID || effectiveXGID || xgid
    if (!currentXGID) return
    
    const newXGID = updateCubeValue(currentXGID)
    setEditableXGID(newXGID)
    
    if (onChange) {
      onChange(newXGID)
    }
  }
  
  // Board click handler for rolling dice in empty dice area or resetting dice
  const handleBoardClick = (e) => {
    if (!isEditable) return
    
    // Only handle if not dragging and not clicking on interactive elements
    if (draggedChecker) return
    
    const svg = e.currentTarget
    if (!svg) return
    
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Check if click is in dice area (empty area to roll dice)
    if (isClickInDiceArea(x, y)) {
      e.preventDefault()
      e.stopPropagation()
      
      const currentXGID = editableXGID || effectiveXGID || xgid
      if (!currentXGID) return
      
      const currentBoardState = parseXGID(currentXGID)
      
      // Handle opening roll (player === 0)
      if (currentBoardState.player === 0) {
        // First opening roll: force doubles (same value on both dice) - one time only for verification
        if (!openingRollDice) {
          const dieValue = Math.floor(Math.random() * 6) + 1
          const whiteDie = dieValue
          const blackDie = dieValue
          
          // Show re-roll watermark (doubles require re-roll)
          setOpeningRollDice({ whiteDie, blackDie, winner: null }) // null winner indicates re-roll needed
          // Don't update XGID - keep player as 0 (OPEN state) until re-roll
          return
        }
        
        // Subsequent opening roll (re-roll after doubles): roll normally
        const whiteDie = Math.floor(Math.random() * 6) + 1
        const blackDie = Math.floor(Math.random() * 6) + 1
        
        // If dice are equal again, show re-roll watermark but don't update XGID yet
        if (whiteDie === blackDie) {
          setOpeningRollDice({ whiteDie, blackDie, winner: null }) // null winner indicates re-roll needed
          // Don't update XGID - keep player as 0 (OPEN state)
          return
        }
        
        // Different values - determine winner
        const winner = whiteDie > blackDie ? 'white' : 'black'
        const winnerPlayer = winner === 'white' ? 1 : -1
        
        // Set xg4 to winner, xg5 to dice values (higher die first)
        const higherDie = Math.max(whiteDie, blackDie)
        const lowerDie = Math.min(whiteDie, blackDie)
        const diceString = `${higherDie}${lowerDie}`
        
        const parts = currentXGID.split(':')
        parts[3] = String(winnerPlayer) // xg4 = winner
        parts[4] = diceString // xg5 = dice values
        
        // Ensure all parts exist
        while (parts.length < 10) {
          if (parts.length === 9) {
            parts.push('10')
          } else {
            parts.push('0')
          }
        }
        
        const newXGID = parts.join(':')
        
        setOpeningRollDice({ whiteDie, blackDie, winner })
        setMoveNumber(1) // Opening move
        setEditableXGID(newXGID)
        
        if (onChange) {
          onChange(newXGID)
        }
      } else {
        // Normal roll
        const newXGID = rollRandomDice(currentXGID)
        setEditableXGID(newXGID)
        
        if (onChange) {
          onChange(newXGID)
        }
      }
    }
  }
  
  // ========== END EDITABLE MODE UTILITY FUNCTIONS ==========
  
  // Render arrows for moves
  const renderMoveArrows = () => {
    if (!moves || moves.length === 0) return null
    
    const arrows = moves.map((move, index) => {
      // Moves are stored in WHITE's perspective (converted in moveApplier if needed)
      // getCheckerCoordinates expects WHITE point numbers, which map to correct physical locations
      const fromCoords = getCheckerCoordinates(move.from, true, move.fromStackPosition) // Ghost checker at specific position
      const toCoords = getCheckerCoordinates(move.to, false, move.toStackPosition) // Destination checker at specific position
      
      if (!fromCoords || !toCoords) return null
      
      // Determine arrow color based on ghost checker owner at the starting point
      // Use red for BLACK moves, blue for WHITE moves
      const moveOwner = ghostCheckerOwners[move.from]
      const arrowColor = moveOwner === 'black' ? "#EF4444" : "#3B82F6" // Red for BLACK, blue for WHITE
      
      // Calculate arrow path
      const dx = toCoords.x - fromCoords.x
      const dy = toCoords.y - fromCoords.y
      const length = Math.sqrt(dx * dx + dy * dy)
      const angle = Math.atan2(dy, dx)
      
      // Arrow head size (reduced by 10 pixels from original 24, wider angle for visibility)
      const arrowHeadSize = 24 - 10 // 14 pixels
      const arrowHeadAngle = Math.PI / 4 // 45 degrees (wider than original 30 degrees)
      
      // Start point (at center of ghost checker)
      const startX = fromCoords.x
      const startY = fromCoords.y
      
      // End point (at center of destination checker)
      const endX = toCoords.x
      const endY = toCoords.y
      
      // Arrow head base point (where the line should end, accounting for checker radius)
      // The arrow line stops at the checker edge
      const checkerEdgeOffset = checkerRadius
      const arrowHeadBaseX = endX - checkerEdgeOffset * Math.cos(angle)
      const arrowHeadBaseY = endY - checkerEdgeOffset * Math.sin(angle)
      
      // Arrow head base points - triangle with tip at checker center, base at checker edge
      const arrowHeadX1 = arrowHeadBaseX - arrowHeadSize * Math.cos(angle - arrowHeadAngle)
      const arrowHeadY1 = arrowHeadBaseY - arrowHeadSize * Math.sin(angle - arrowHeadAngle)
      const arrowHeadX2 = arrowHeadBaseX - arrowHeadSize * Math.cos(angle + arrowHeadAngle)
      const arrowHeadY2 = arrowHeadBaseY - arrowHeadSize * Math.sin(angle + arrowHeadAngle)
      
      // Center of arrowhead base (where shaft should end)
      const arrowHeadBaseCenterX = (arrowHeadX1 + arrowHeadX2) / 2
      const arrowHeadBaseCenterY = (arrowHeadY1 + arrowHeadY2) / 2
      
      // Calculate curved base arc - arc connecting the two base points with checker radius
      // The arc curves inward (toward the arrow tip)
      const arcRadius = checkerRadius
      
      // Calculate angles from tip to each base point
      const angleToPoint1 = Math.atan2(arrowHeadY1 - endY, arrowHeadX1 - endX)
      const angleToPoint2 = Math.atan2(arrowHeadY2 - endY, arrowHeadX2 - endX)
      
      // Calculate the midpoint of the base
      const baseMidX = (arrowHeadX1 + arrowHeadX2) / 2
      const baseMidY = (arrowHeadY1 + arrowHeadY2) / 2
      
      // Direction from tip to base midpoint
      const tipToMidX = baseMidX - endX
      const tipToMidY = baseMidY - endY
      const tipToMidDist = Math.sqrt(tipToMidX * tipToMidX + tipToMidY * tipToMidY)
      
      // Arc center is offset from base midpoint toward tip, then perpendicular
      // to create an arc that curves inward
      const baseDist = Math.sqrt(
        Math.pow(arrowHeadX2 - arrowHeadX1, 2) + Math.pow(arrowHeadY2 - arrowHeadY1, 2)
      ) / 2
      
      // Ensure arc radius is valid (must be >= baseDist)
      // If baseDist is too large, fall back to straight line
      if (baseDist >= arcRadius) {
        // Fallback to straight line if arc radius too small
        return (
          <g key={`arrow-${index}`}>
            <line
              x1={startX}
              y1={startY}
              x2={arrowHeadBaseCenterX}
              y2={arrowHeadBaseCenterY}
              stroke="#3B82F6"
              strokeWidth={8}
              opacity={0.8}
            />
            <polygon
              points={`${endX},${endY} ${arrowHeadX1},${arrowHeadY1} ${arrowHeadX2},${arrowHeadY2}`}
              fill="#3B82F6"
              opacity={0.8}
            />
          </g>
        )
      }
      const distToCenter = Math.sqrt(arcRadius * arcRadius - baseDist * baseDist)
      
      // Perpendicular direction (normalized)
      const perpVecX = -(arrowHeadY2 - arrowHeadY1)
      const perpVecY = arrowHeadX2 - arrowHeadX1
      const perpVecLen = Math.sqrt(perpVecX * perpVecX + perpVecY * perpVecY)
      if (perpVecLen === 0) {
        // Fallback to straight line if points are too close
        return (
          <g key={`arrow-${index}`}>
            <line
              x1={startX}
              y1={startY}
              x2={arrowHeadBaseCenterX}
              y2={arrowHeadBaseCenterY}
              stroke="#3B82F6"
              strokeWidth={8}
              opacity={0.8}
            />
            <polygon
              points={`${endX},${endY} ${arrowHeadX1},${arrowHeadY1} ${arrowHeadX2},${arrowHeadY2}`}
              fill="#3B82F6"
              opacity={0.8}
            />
          </g>
        )
      }
      
      const perpX = perpVecX / perpVecLen
      const perpY = perpVecY / perpVecLen
      
      // Choose perpendicular direction that points toward tip
      const perpToTip1 = (baseMidX + distToCenter * perpX - endX) * tipToMidX + 
                         (baseMidY + distToCenter * perpY - endY) * tipToMidY
      const usePositivePerp = perpToTip1 > 0
      
      const arcCenterX = baseMidX + (usePositivePerp ? distToCenter : -distToCenter) * perpX
      const arcCenterY = baseMidY + (usePositivePerp ? distToCenter : -distToCenter) * perpY
      
      // Calculate angles from arc center to base points
      const arcAngle1 = Math.atan2(arrowHeadY1 - arcCenterY, arrowHeadX1 - arcCenterX)
      const arcAngle2 = Math.atan2(arrowHeadY2 - arcCenterY, arrowHeadX2 - arcCenterX)
      
      // Determine sweep direction - we want the arc that curves toward the tip
      const centerToTipX = endX - arcCenterX
      const centerToTipY = endY - arcCenterY
      const centerToTipAngle = Math.atan2(centerToTipY, centerToTipX)
      
      // Check which sweep direction puts the arc midpoint closer to tip
      let angleDiff1 = arcAngle2 - arcAngle1
      while (angleDiff1 < 0) angleDiff1 += Math.PI * 2
      while (angleDiff1 >= Math.PI * 2) angleDiff1 -= Math.PI * 2
      
      const midAngle1 = arcAngle1 + angleDiff1 / 2
      const midAngle2 = arcAngle1 + (angleDiff1 > Math.PI ? angleDiff1 - Math.PI * 2 : angleDiff1) / 2
      
      const midPoint1X = arcCenterX + arcRadius * Math.cos(midAngle1)
      const midPoint1Y = arcCenterY + arcRadius * Math.sin(midAngle1)
      const midPoint2X = arcCenterX + arcRadius * Math.cos(midAngle2)
      const midPoint2Y = arcCenterY + arcRadius * Math.sin(midAngle2)
      
      const dist1 = Math.sqrt(Math.pow(endX - midPoint1X, 2) + Math.pow(endY - midPoint1Y, 2))
      const dist2 = Math.sqrt(Math.pow(endX - midPoint2X, 2) + Math.pow(endY - midPoint2Y, 2))
      
      // Always use small arc (largeArcFlag = 0) to avoid full circles
      // Choose sweep direction that curves toward tip
      const useSweep1 = dist1 < dist2
      const largeArcFlag = 0 // Always use small arc
      const sweepFlag = useSweep1 ? 1 : 0
      
      // Use the original base center and extend forward slightly to connect with curved base
      // Extend by about 4 pixels along the arrow direction
      const extendForward = 4
      const shaftEndX = arrowHeadBaseCenterX + extendForward * Math.cos(angle)
      const shaftEndY = arrowHeadBaseCenterY + extendForward * Math.sin(angle)
      
      return (
        <g key={`arrow-${index}`}>
          {/* Arrow line - extends to curved base midpoint */}
          <line
            x1={startX}
            y1={startY}
            x2={shaftEndX}
            y2={shaftEndY}
            stroke={arrowColor}
            strokeWidth={8}
            opacity={0.8}
          />
          {/* Arrowhead with curved base matching checker radius */}
          <path
            d={`M ${endX} ${endY} L ${arrowHeadX1} ${arrowHeadY1} A ${arcRadius} ${arcRadius} 0 ${largeArcFlag} ${sweepFlag} ${arrowHeadX2} ${arrowHeadY2} Z`}
            fill={arrowColor}
            opacity={0.8}
          />
        </g>
      )
    })
    
    return <g>{arrows}</g>
  }
  
  // Render a point (triangle) in a quadrant
  const renderPoint = (quadrantIndex, pointIndex, isTopHalf) => {
    const isRight = quadrantIndex === 0 || quadrantIndex === 3
    const quadrantX = isRight ? rightQuadrantX : leftQuadrantX
    const quadrantY = isTopHalf ? topBorderWidth : topBorderWidth + quadrantHeight
    
    const pointX = quadrantX + pointIndex * pointWidth
    
    const baseY = isTopHalf ? quadrantY : quadrantY + quadrantHeight
    const tipY = isTopHalf ? baseY + pointHeight : baseY - pointHeight
    
    const baseIsGrey = isTopHalf 
      ? (pointIndex % 2 === 0) 
      : (pointIndex % 2 === 1)
    const isGrey = activeDirection === 1 ? !baseIsGrey : baseIsGrey
    
    const pointNumber = finalEffectivePlayer === 1 
      ? getPointNumberWhite(quadrantIndex, pointIndex)
      : getPointNumberBlack(quadrantIndex, pointIndex)
    
    const labelY = isTopHalf 
      ? topBorderWidth - ONE_REM
      : effectiveBoardHeight - bottomBorderWidth + ONE_REM
    
    // Get checker data from boardState if xgid is provided
    let checkerCount = 0
    let checkerOwner = null
    const whitePointNumber = getPointNumberWhite(quadrantIndex, pointIndex)
    
    if (xgid) {
      if (whitePointNumber >= 1 && whitePointNumber <= 24) {
        const pointData = boardState.points[whitePointNumber - 1] // points array is 0-indexed
        checkerCount = pointData.count
        checkerOwner = pointData.owner === 'black' ? 'top' : (pointData.owner === 'white' ? 'bottom' : null)
      }
    }
    
    return (
      <g key={`point-${quadrantIndex}-${pointIndex}`}>
        <polygon
          points={`${pointX},${baseY} ${pointX + pointWidth},${baseY} ${pointX + pointWidth / 2},${tipY}`}
          fill={isGrey ? COLORS.pointGrey : COLORS.pointWhite}
          stroke={COLORS.stroke}
          strokeWidth={1}
        />
        {showPointNumbers && (
          <text
            x={pointX + pointWidth / 2}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="18"
            fontWeight="bold"
            fill={COLORS.number}
          >
            {pointNumber}
          </text>
        )}
        {renderCheckers(pointX, baseY, tipY, isTopHalf, checkerCount, checkerOwner, whitePointNumber)}
      </g>
    )
  }
  
  // Calculate tray checker counts from boardState
  const topTrayBlackCount = effectiveXGID ? (15 - boardState.blackBar - boardState.points.reduce((sum, p) => sum + (p.owner === 'black' ? p.count : 0), 0)) : 15
  const bottomTrayWhiteCount = effectiveXGID ? (15 - boardState.whiteBar - boardState.points.reduce((sum, p) => sum + (p.owner === 'white' ? p.count : 0), 0)) : 15
  
  // Determine information bar text
  let infoText
  if (boardState.player === 0) {
    // OPEN state (opening roll)
    infoText = "OPENING roll"
  } else {
    const playerName = finalEffectivePlayer === 1 ? 'WHITE' : 'BLACK'
    // Check if dice are actually shown on the board (same logic as renderDice)
    const diceToCheck = isEditable 
      ? (boardState.dice !== undefined && boardState.dice !== "00" ? boardState.dice : null)
      : (finalEffectiveDice && finalEffectiveDice !== "00" ? finalEffectiveDice : null)
    const needsToRoll = !diceToCheck
    const actionText = needsToRoll ? 'to roll' : 'to play'
    infoText = `${playerName} ${actionText}`
  }
  
  // Generate modified XGID string that reflects current effective values
  const getDisplayXGID = () => {
    const xgidToUse = effectiveXGID || xgid
    if (!xgidToUse) return null
    
    const parts = xgidToUse.split(':')
    const modifiedParts = [parts[0]] // Always keep xg1 (checker positions)
    
    // Update xg2 (cubeValue) with current effective value
    modifiedParts[1] = String(finalEffectiveCubeValue ?? 0)
    
    // Update xg3 (cubeOwner) with current effective value
    modifiedParts[2] = String(finalEffectiveCubeOwner ?? 0)
    
    // Update xg4 (player) with current effective value - allow -1, 0, or 1
    const playerValue = finalEffectivePlayer ?? 1
    modifiedParts[3] = String(playerValue === -1 ? -1 : (playerValue === 0 ? 0 : 1))
    
    // Update xg5 (dice) with current effective value - ensure it's a valid 2-digit string
    let diceValue = finalEffectiveDice
    if (!diceValue || typeof diceValue !== 'string' || diceValue.length !== 2) {
      diceValue = '00' // Default to "00" if invalid
    }
    // Validate dice format: should be "00" or two digits 1-6
    if (!/^[0-6]{2}$/.test(diceValue)) {
      diceValue = '00' // Default to "00" if invalid format
    }
    modifiedParts[4] = diceValue
    
    // Preserve xg6-xg10 from original XGID, or use defaults if missing
    for (let i = 5; i < 10; i++) {
      if (parts.length > i) {
        modifiedParts[i] = parts[i] // Preserve original value
      } else {
        // Use defaults: xg6-xg9 = 0, xg10 = 10
        modifiedParts[i] = i === 9 ? '10' : '0'
      }
    }
    
    return modifiedParts.join(':')
  }
  
  const displayXGID = getDisplayXGID()
  
  // Get current settings for dialog (use localSettings if overridden, otherwise use XGID/props)
  const dialogSettings = localSettings || {
    direction: activeDirection,
    player: finalEffectivePlayer,
    cubeOwner: finalEffectiveCubeOwner,
    cubeValue: finalEffectiveCubeValue,
    useCube: finalEffectiveUseCube,
    dice: finalEffectiveDice,
    showTrays: activeShowTrays,
    showBoardLabels: activeShowBoardLabels
  }
  
  const handleSettingsChange = (key, value) => {
    setLocalSettings(prev => {
      const current = prev || dialogSettings
      return { ...current, [key]: value }
    })
  }
  
  const handleSaveSettings = () => {
    // Ensure dice has a valid value before saving
    if (localSettings && (!localSettings.dice || localSettings.dice.length === 0)) {
      setLocalSettings(prev => ({ ...prev, dice: '00' }))
    }
    
    // Update editableXGID if player, dice, cubeValue, or cubeOwner changed
    if (localSettings && isEditable) {
      const currentXGID = editableXGID || effectiveXGID || xgid
      if (currentXGID) {
      const parts = currentXGID.split(':')
        let updated = false
        
        // Update xg4 (player) if changed
        if (localSettings.player !== undefined) {
          const newPlayer = String(localSettings.player)
          if (parts[3] !== newPlayer) {
            parts[3] = newPlayer
            updated = true
          }
        }
        
        // Update xg5 (dice) if changed
        if (localSettings.dice !== undefined) {
          const newDice = localSettings.dice || '00'
          if (parts[4] !== newDice) {
            parts[4] = newDice
            updated = true
          }
        }
      
      // Update xg2 (cubeValue) if changed
      if (localSettings.cubeValue !== undefined) {
          const newCubeValue = String(localSettings.cubeValue)
          if (parts[1] !== newCubeValue) {
            parts[1] = newCubeValue
            updated = true
          }
      }
      
      // Update xg3 (cubeOwner) if changed
      if (localSettings.cubeOwner !== undefined) {
          const newCubeOwner = String(localSettings.cubeOwner)
          if (parts[2] !== newCubeOwner) {
            parts[2] = newCubeOwner
            updated = true
          }
        }
        
        if (updated) {
          const newXGID = parts.join(':')
          setEditableXGID(newXGID)
          if (onChange) {
            onChange(newXGID)
          }

          // Reset turn state if player or dice changed in PLAY mode
          // This prevents turn state from becoming stale when changing player during play
          if (effectiveEditingMode === 'play') {
            setTurnState(null)
          }
        }
      }
    }
    
    // Notify parent if player changed
    if (localSettings && onPlayerChange && localSettings.player !== undefined) {
      onPlayerChange(localSettings.player)
    }
    
    // Settings are now applied via localSettings override
    setShowOptionsDialog(false)
  }
  
  const handleCancelSettings = () => {
    // Reset to null to use XGID/props again
    setLocalSettings(null)
    setShowOptionsDialog(false)
  }
  
  // Dialog drag handlers
  const handleDialogMouseDown = (e) => {
    if (e.target.closest('button, input, select, textarea')) {
      return // Don't drag if clicking on interactive elements
    }
    setIsDragging(true)
    setDragStart({
      x: e.clientX - dialogPosition.x,
      y: e.clientY - dialogPosition.y
    })
  }
  
  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (!isDragging) return
    
    const handleMouseMove = (e) => {
      setDialogPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart])
  
  return (
    <div id="component-backgammon-board" className="flex flex-col items-center w-full relative">
      {/* Dragged checker preview - rendered outside SVG when mouse leaves board */}
      {isEditable && draggedChecker && dragOverPoint === null && (
        <div
          style={{
            position: 'fixed',
            left: `${dragScreenPosition.x}px`,
            top: `${dragScreenPosition.y}px`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 1000
          }}
        >
          <div
            style={{
              width: `${checkerDiameter}px`,
              height: `${checkerDiameter}px`,
              borderRadius: '50%',
              backgroundColor: draggedChecker.owner === 'white' ? COLORS.checkerWhite : COLORS.checkerBlack,
              border: `2px solid ${COLORS.stroke}`,
              opacity: 0.8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: `${checkerRadius * 0.8}px`,
              fontWeight: 'bold',
              color: draggedChecker.owner === 'white' ? COLORS.stroke : COLORS.checkerWhite
            }}
          >
            {draggedChecker.count > 1 && draggedChecker.count}
          </div>
        </div>
      )}
      
      {/* Options icon button */}
      {showOptions && (
        <button
          onClick={() => {
            setShowOptionsDialog(true)
          }}
          className="absolute top-2 z-20 p-2"
          style={{ right: '0px' }}
          aria-label="Board options"
        >
          <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}
      
      {/* Options Dialog */}
      {showOptionsDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={handleCancelSettings}>
          <div 
            className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
            style={{
              transform: `translate(${dialogPosition.x}px, ${dialogPosition.y}px)`,
              cursor: isDragging ? 'grabbing' : 'default'
            }}
          >
            <div 
              className="flex justify-between items-center mb-4 cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleDialogMouseDown}
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Board Settings</h2>
              <button
                onClick={handleCancelSettings}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Player */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Player
                </label>
                <select
                  value={dialogSettings.player}
                  onChange={(e) => handleSettingsChange('player', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value={0}>OPEN</option>
                  <option value={-1}>Black</option>
                  <option value={1}>White</option>
                </select>
              </div>
              
              {/* Direction */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Direction
                </label>
                <select
                  value={dialogSettings.direction}
                  onChange={(e) => handleSettingsChange('direction', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value={0}>Counter-clockwise</option>
                  <option value={1}>Clockwise</option>
                </select>
              </div>
              
              {/* Cube Owner */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cube Owner
                </label>
                <select
                  value={dialogSettings.cubeOwner}
                  onChange={(e) => handleSettingsChange('cubeOwner', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value={-1}>Black</option>
                  <option value={0}>Nobody</option>
                  <option value={1}>White</option>
                </select>
              </div>
              
              {/* Cube Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cube Value (Exponent: 0-6)
                </label>
                <input
                  type="number"
                  min="0"
                  max="6"
                  value={dialogSettings.cubeValue}
                  onChange={(e) => handleSettingsChange('cubeValue', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Displayed value: {dialogSettings.cubeValue === 0 ? 64 : Math.pow(2, dialogSettings.cubeValue)}
                </p>
              </div>
              
              {/* Use Cube */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="useCube"
                  checked={dialogSettings.useCube}
                  onChange={(e) => handleSettingsChange('useCube', e.target.checked)}
                  className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                />
                <label htmlFor="useCube" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Show Doubling Cube
                </label>
              </div>
              
              {/* Dice */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dice (00 = to roll, XY = rolled values)
                </label>
                <input
                  type="text"
                  pattern="[0-9]{2}"
                  maxLength={2}
                  value={dialogSettings.dice}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 2)
                    handleSettingsChange('dice', value) // Allow empty value during editing
                  }}
                  onBlur={(e) => {
                    // Default to '00' only when field loses focus and is empty
                    if (!e.target.value || e.target.value.length === 0) {
                      handleSettingsChange('dice', '00')
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-mono"
                  placeholder="00"
                />
              </div>

              {/* AI Difficulty */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  AI Difficulty
                </label>
                <select
                  value={aiDifficulty}
                  onChange={(e) => onAiDifficultyChange && onAiDifficultyChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="grandmaster">Grandmaster</option>
                </select>
              </div>
              
              {/* Show Trays */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showTrays"
                  checked={dialogSettings.showTrays}
                  onChange={(e) => handleSettingsChange('showTrays', e.target.checked)}
                  className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                />
                <label htmlFor="showTrays" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Show Trays
                </label>
              </div>
              
              {/* Show Board Labels */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showBoardLabels"
                  checked={dialogSettings.showBoardLabels}
                  onChange={(e) => handleSettingsChange('showBoardLabels', e.target.checked)}
                  className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                />
                <label htmlFor="showBoardLabels" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Show Board Labels
                </label>
              </div>

            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCancelSettings}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      
      <svg
        width={BOARD_WIDTH}
        height={effectiveBoardHeight}
        viewBox={`0 0 ${BOARD_WIDTH} ${effectiveBoardHeight}`}
        className="backgammon-board max-w-full"
        preserveAspectRatio="xMidYMid meet"
        onClick={isEditable ? handleBoardClick : undefined}
        style={isEditable && draggedChecker ? { cursor: 'grabbing' } : {}}
      >
        {/* Outer border */}
        <rect
          x="0"
          y="0"
          width={BOARD_WIDTH}
          height={effectiveBoardHeight}
          fill={COLORS.border}
        />
        
        {/* Board background */}
        <rect
          x={leftBorderWidth}
          y={topBorderWidth}
          width={innerWidth}
          height={innerHeight}
          fill={COLORS.board}
          stroke={COLORS.stroke}
          strokeWidth={1}
        />
        
        {/* Vertical bar */}
        <rect
          x={leftBorderWidth + (innerWidth - BAR_WIDTH) / 2}
          y={topBorderWidth}
          width={BAR_WIDTH}
          height={innerHeight}
          fill={COLORS.bar}
          stroke={COLORS.stroke}
          strokeWidth={1}
        />
        
        {/* Bar checkers */}
        {renderBarCheckers(
          leftBorderWidth + (innerWidth - BAR_WIDTH) / 2,
          topBorderWidth,
          innerHeight,
          effectiveXGID ? boardState.blackBar : 0,
          effectiveXGID ? boardState.whiteBar : 0
        )}
        
        {/* Trays */}
        {activeShowTrays && renderTray(true)}
        {activeShowTrays && renderTray(false)}
        
        {/* Tray tick marks */}
        {activeShowTrays && renderTrayTickMarks(true)}
        {activeShowTrays && renderTrayTickMarks(false)}
        
        {/* Tray checkers */}
        {activeShowTrays && renderTrayCheckers(true, topTrayBlackCount)}
        {activeShowTrays && renderTrayCheckers(false, bottomTrayWhiteCount)}
        
        {/* Doubling cube */}
        {finalEffectiveUseCube && renderDoublingCube()}
        
        {/* Dice */}
        {renderDice()}
        
        {/* Board labels */}
        {activeShowBoardLabels && getLabelPositions().map(pos => renderLabel(pos.text, pos.x, pos.y, pos.baseline))}
        
        {/* Points */}
        {Array.from({ length: POINT_COUNT }, (_, i) => renderPoint(0, i, true))}
        {Array.from({ length: POINT_COUNT }, (_, i) => renderPoint(1, i, true))}
        {Array.from({ length: POINT_COUNT }, (_, i) => renderPoint(2, i, false))}
        {Array.from({ length: POINT_COUNT }, (_, i) => renderPoint(3, i, false))}

        {/* No legal moves message and End Turn button - rendered after points so they appear on top */}
        {renderNoLegalMoves()}
        
        {/* Move arrows - rendered last so they appear on top */}
        {renderMoveArrows()}
        
        {/* Drag feedback - rendered last so it appears on top */}
        {isEditable && draggedChecker && (
            <>
              {/* Highlight valid drop zones */}
              {dragOverPoint !== null && dragOverPoint !== draggedChecker.point && (
                <g>
                  {dragOverPoint >= 1 && dragOverPoint <= 24 && (() => {
                    const pos = getPointPosition(dragOverPoint)
                    if (!pos) return null
                    const { quadrantIndex, pointIndex } = pos
                    const isTopHalf = quadrantIndex === 0 || quadrantIndex === 1
                    const isRight = quadrantIndex === 0 || quadrantIndex === 3
                    const quadrantX = isRight ? rightQuadrantX : leftQuadrantX
                    const quadrantY = isTopHalf ? topBorderWidth : topBorderWidth + quadrantHeight
                    const pointX = quadrantX + pointIndex * pointWidth
                    const baseY = isTopHalf ? quadrantY : quadrantY + quadrantHeight
                    const tipY = isTopHalf ? baseY + pointHeight : baseY - pointHeight
                    
                    // Convert dragOverPoint from absolute to relative coordinates for validation
                    // dragOverPoint is in white's absolute perspective (1-24)
                    // draggedChecker.point is in relative perspective (from owner's view)
                    // So convert dragOverPoint to relative using the owner's perspective
                    const currentPlayerForConversion = draggedChecker.owner === 'black' ? -1 : 1
                    const dragOverPointRelative = currentPlayerForConversion === 1 
                      ? dragOverPoint 
                      : 25 - dragOverPoint
                    
                    // Validate if this is a valid drop zone
                  const isValid = validateMove(
                        draggedChecker.point,
                        dragOverPointRelative,
                        draggedChecker.count,
                        draggedChecker.owner,
                        effectiveEditingMode,
                        boardState
                      )
                  
                  return (
                    <polygon
                      key="drop-zone-highlight"
                      points={`${pointX},${baseY} ${pointX + pointWidth},${baseY} ${pointX + pointWidth / 2},${tipY}`}
                      fill={isValid ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}
                      stroke={isValid ? '#22c55e' : '#ef4444'}
                      strokeWidth={2}
                      opacity={0.5}
                    />
                  )
                })()}
                {(dragOverPoint === 0 || dragOverPoint === 25) && (() => {
                  const barX = leftBorderWidth + (innerWidth - BAR_WIDTH) / 2
                  const isValid = validateMove(
                      draggedChecker.point,
                      dragOverPoint,
                      draggedChecker.count,
                      draggedChecker.owner,
                      effectiveEditingMode,
                      boardState
                    )
                  
                  return (
                    <rect
                      key="bar-drop-zone"
                      x={barX}
                      y={dragOverPoint === 0 ? topBorderWidth : topBorderWidth + innerHeight / 2}
                      width={BAR_WIDTH}
                      height={innerHeight / 2}
                      fill={isValid ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}
                      stroke={isValid ? '#22c55e' : '#ef4444'}
                      strokeWidth={2}
                      opacity={0.5}
                    />
                  )
                })()}
                {(dragOverPoint === -1 || dragOverPoint === -2) && (() => {
                  const trayX = activeDirection === 0 
                    ? BOARD_WIDTH - rightBorderWidth + (rightBorderWidth - trayWidth) / 2
                    : (leftBorderWidth - trayWidth) / 2
                  const isTopTray = dragOverPoint === -1
                  const trayY = topBorderWidth + (isTopTray ? 0 : quadrantHeight) + (quadrantHeight - trayHeight) / 2
                  
                  // Validate tray drop (must match owner in play mode)
                  const isValid = validateMove(
                      draggedChecker.point,
                      dragOverPoint,
                      draggedChecker.count,
                      draggedChecker.owner,
                      effectiveEditingMode,
                      boardState
                    )
                  
                  return (
                    <rect
                      key="tray-drop-zone"
                      x={trayX}
                      y={trayY}
                      width={trayWidth}
                      height={trayHeight}
                      fill={isValid ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}
                      stroke={isValid ? '#22c55e' : '#ef4444'}
                      strokeWidth={2}
                      opacity={0.5}
                    />
                  )
                })()}
              </g>
            )}
            
            {/* Dragged checker preview - rendered in SVG when over board */}
            {dragOverPoint !== null && (
              <g>
                <circle
                  cx={dragPosition.x}
                  cy={dragPosition.y}
                  r={checkerRadius}
                  fill={draggedChecker.owner === 'white' ? COLORS.checkerWhite : COLORS.checkerBlack}
                  stroke={COLORS.stroke}
                  strokeWidth={2}
                  opacity={0.8}
                  style={{ pointerEvents: 'none' }}
                />
                {draggedChecker.count > 1 && (
                  <text
                    x={dragPosition.x}
                    y={dragPosition.y + 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={checkerRadius * 0.8}
                    fontWeight="bold"
                    fill={draggedChecker.owner === 'white' ? COLORS.stroke : COLORS.checkerWhite}
                    opacity={0.8}
                    style={{ pointerEvents: 'none' }}
                  >
                    {draggedChecker.count}
                  </text>
                )}
              </g>
            )}
          </>
        )}
        
      </svg>
      
      {/* Information bar */}
      <div 
        className="w-full text-center py-3 px-4"
        style={{
          backgroundColor: '#4b5563', // dark grey
          color: '#ffffff', // white font
          width: `${BOARD_WIDTH}px`,
          maxWidth: '100%'
        }}
      >
        <span className="text-lg font-semibold">{infoText}</span>
      </div>

      {/* AI Debug/Trace Area */}
      {aiDebug && (
        <div className="w-full bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-gray-700 p-4" style={{ width: `${BOARD_WIDTH}px`, maxWidth: '100%' }}>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Analysis Debug</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">XGID Sent to AI:</h4>
                <code className="block p-2 bg-gray-100 dark:bg-slate-700 rounded text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
                  {aiDebug.xgid}
                </code>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Legal Moves:</h4>
                <div className="max-h-32 overflow-y-auto">
                  {aiDebug.legalMoves && aiDebug.legalMoves.map((move, i) => (
                    <code key={i} className="block p-1 bg-gray-100 dark:bg-slate-700 rounded text-xs font-mono text-gray-900 dark:text-gray-100 mb-1">
                      {move.description}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Win message overlay */}
      {winner && (
        <div
          className="absolute inset-0 flex items-center justify-center z-50"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(2px)'
          }}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-8 text-center border-2 border-amber-600"
            style={{
              minWidth: '300px',
              maxWidth: '90%'
            }}
          >
            <h2
              className="text-4xl font-bold mb-6 text-gray-900 dark:text-white"
            >
              {winner === 'white' ? 'WHITE wins!' : 'BLACK wins!'}
            </h2>
            <button
              onClick={() => setWinner(null)}
              className="px-6 py-3 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors font-medium text-lg"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

