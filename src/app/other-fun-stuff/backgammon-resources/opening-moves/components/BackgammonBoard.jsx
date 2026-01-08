'use client'

import { parseXGID } from '../utils/xgidParser'

export default function BackgammonBoard({ 
  direction = 0, 
  player = 0, 
  boardLabels = true, 
  pointNumbers = true, 
  cubeOwner = 1, 
  cubeValue = 16, 
  useCube = true,
  xgid = null,
  ghostCheckers = {}, // Object mapping point numbers (1-24) to ghost checker counts, e.g. { 6: 2, 17: 1 }
  dice = "00" // "00" = no dice, "XY" = dice values (e.g., "63" = 6 and 3)
}) {
  // direction: 0 = ccw (counter-clockwise), 1 = cw (clockwise)
  // player: 0 = WHITE (show WHITE's point numbers), 1 = BLACK (show BLACK's point numbers)
  // boardLabels: true = show HOME and OUTER board labels, false = hide them
  // pointNumbers: true = show point numbers based on player and direction, false = hide them
  // cubeOwner: 0 = nobody owns (middle), 1 = white owns (near bottom), 2 = black owns (near top)
  // cubeValue: one of [2, 4, 8, 16, 32, 64]
  // useCube: true = show doubling cube, false = hide doubling cube
  // xgid: XGID string to specify board position
  // ghostCheckers: Object mapping point numbers to ghost checker counts (ghost checkers are semi-transparent, 70% opacity)
  // dice: "00" = no dice shown, "XY" = dice values (e.g., "63" = 6 and 3)
  
  // Parse XGID if provided
  const boardState = xgid ? parseXGID(xgid) : {
    blackBar: 0,
    whiteBar: 0,
    points: Array(24).fill({ count: 0, owner: null })
  }
  
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
  
  // Border widths - initial calculation
  const initialTrayBorderWidth = BASE_BORDER_WIDTH * 1.5 * 1.15
  let rightBorderWidth = direction === 0 ? initialTrayBorderWidth : BASE_BORDER_WIDTH
  let leftBorderWidth = direction === 1 ? initialTrayBorderWidth : BASE_BORDER_WIDTH
  const topBorderWidth = boardLabels ? BASE_BORDER_WIDTH * LABEL_BORDER_MULTIPLIER : BASE_BORDER_WIDTH
  const bottomBorderWidth = boardLabels ? BASE_BORDER_WIDTH * LABEL_BORDER_MULTIPLIER : BASE_BORDER_WIDTH
  
  // Board dimensions
  let innerWidth = BOARD_WIDTH - leftBorderWidth - rightBorderWidth
  const innerHeight = BOARD_HEIGHT - topBorderWidth - bottomBorderWidth
  
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
  
  // Recalculate border widths if needed, then recalculate dependent values
  if (direction === 0 && requiredTrayBorderWidth > rightBorderWidth) {
    rightBorderWidth = requiredTrayBorderWidth
    innerWidth = BOARD_WIDTH - leftBorderWidth - rightBorderWidth
    BAR_WIDTH = (innerWidth * 0.95) / (12 + 0.95)
    quadrantWidth = (innerWidth - BAR_WIDTH) / 2
    pointWidth = quadrantWidth / POINT_COUNT
    checkerDiameter = pointWidth * 0.95
    checkerRadius = checkerDiameter / 2
    trayWidth = checkerDiameter
  } else if (direction === 1 && requiredTrayBorderWidth > leftBorderWidth) {
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
    
    const mapping = direction === 0 ? ccwMapping : cwMapping
    return mapping[quadrantIndex]?.(pointIndex) ?? 0
  }
  
  const getPointNumberBlack = (quadrantIndex, pointIndex) => {
    return 25 - getPointNumberWhite(quadrantIndex, pointIndex)
  }
  
  // Helper: Render a tray rectangle
  const renderTray = (isTop) => {
    const trayX = direction === 0 
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
    
    const trayX = direction === 0 
      ? BOARD_WIDTH - rightBorderWidth + (rightBorderWidth - trayWidth) / 2
      : (leftBorderWidth - trayWidth) / 2
    const trayY = topBorderWidth + (isTop ? 0 : quadrantHeight) + (quadrantHeight - trayHeight) / 2
    
    const checkers = []
    const checkerWidth = trayWidth
    
    if (isTop) {
      // Black checkers in top tray: start at top, stack downward
      // Black checkers have medium grey border
      for (let i = 0; i < checkerCount; i++) {
        const checkerY = trayY + i * checkerThickness
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
          />
        )
      }
    } else {
      // White checkers in bottom tray: start at bottom, stack upward
      for (let i = 0; i < checkerCount; i++) {
        const checkerY = trayY + trayHeight - (i + 1) * checkerThickness
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
          />
        )
      }
    }
    
    return <g>{checkers}</g>
  }
  
  // Helper: Render doubling cube
  const renderDoublingCube = () => {
    if (!useCube) return null
    
    const validCubeValues = [2, 4, 8, 16, 32, 64]
    if (!validCubeValues.includes(cubeValue)) return null
    
    const cubeSize = BAR_WIDTH * 0.8
    const barX = leftBorderWidth + (innerWidth - BAR_WIDTH) / 2
    const barCenterX = barX + BAR_WIDTH / 2
    
    let cubeY
    if (cubeOwner === 0) {
      cubeY = topBorderWidth + innerHeight / 2 - cubeSize / 2
    } else if (cubeOwner === 1) {
      cubeY = topBorderWidth + innerHeight - cubeSize - 20
    } else if (cubeOwner === 2) {
      cubeY = topBorderWidth + 20
    } else {
      return null
    }
    
    const cubeX = barCenterX - cubeSize / 2
    
    return (
      <g key="doubling-cube">
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
        />
        <text
          x={barCenterX}
          y={cubeY + cubeSize / 2 + 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={cubeSize * 0.65}
          fontWeight="700"
          fill={COLORS.stroke}
        >
          {cubeValue}
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
    if (!dice || dice === "00") return null
    
    // Parse dice values
    const die1 = parseInt(dice[0]) || 0
    const die2 = parseInt(dice[1]) || 0
    
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
    
    // Dice colors based on player
    const dieFill = player === 0 ? COLORS.checkerWhite : COLORS.checkerBlack
    const pipFill = player === 0 ? COLORS.stroke : COLORS.checkerWhite
    
    const diceElements = []
    
    // Render first die
    const pipPositions1 = getPipPositions(die1)
    diceElements.push(
      <g key="die-1">
        <rect
          x={die1X - dieRadius}
          y={diceY - dieRadius}
          width={dieSize}
          height={dieSize}
          rx={dieSize * 0.15}
          ry={dieSize * 0.15}
          fill={dieFill}
          stroke={COLORS.stroke}
          strokeWidth={2}
        />
        {pipPositions1.map((pos, i) => (
          <circle
            key={`pip-1-${i}`}
            cx={die1X + pos.x * pipSpacing}
            cy={diceY + pos.y * pipSpacing}
            r={pipRadius}
            fill={pipFill}
          />
        ))}
      </g>
    )
    
    // Render second die
    const pipPositions2 = getPipPositions(die2)
    diceElements.push(
      <g key="die-2">
        <rect
          x={die2X - dieRadius}
          y={diceY - dieRadius}
          width={dieSize}
          height={dieSize}
          rx={dieSize * 0.15}
          ry={dieSize * 0.15}
          fill={dieFill}
          stroke={COLORS.stroke}
          strokeWidth={2}
        />
        {pipPositions2.map((pos, i) => (
          <circle
            key={`pip-2-${i}`}
            cx={die2X + pos.x * pipSpacing}
            cy={diceY + pos.y * pipSpacing}
            r={pipRadius}
            fill={pipFill}
          />
        ))}
      </g>
    )
    
    return <g>{diceElements}</g>
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
    const bottomY = BOARD_HEIGHT - 5
    
    if (direction === 0) {
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
    
    // Render BLACK checkers (top bar)
    if (topBarCount > 0) {
      if (topBarCount > 3) {
        const checkerTopY = barTop + 4 * checkerDiameter
        const checkerCenterY = checkerTopY + checkerRadius
        
        checkers.push(
          <g key="bar-top-black-many">
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
          checkers.push(
            <circle
              key="bar-top-black-1"
              cx={barCenterX}
              cy={firstCheckerCenterY}
              r={checkerRadius}
              fill={COLORS.checkerBlack}
              stroke={COLORS.stroke}
              strokeWidth={1}
            />
          )
        }
        if (topBarCount >= 2) {
          const secondCheckerTopY = barTop + 3 * checkerDiameter
          const secondCheckerCenterY = secondCheckerTopY + checkerRadius
          checkers.push(
            <circle
              key="bar-top-black-2"
              cx={barCenterX}
              cy={secondCheckerCenterY}
              r={checkerRadius}
              fill={COLORS.checkerBlack}
              stroke={COLORS.stroke}
              strokeWidth={1}
            />
          )
        }
        if (topBarCount >= 3) {
          const thirdCheckerTopY = barTop + 2 * checkerDiameter
          const thirdCheckerCenterY = thirdCheckerTopY + checkerRadius
          checkers.push(
            <circle
              key="bar-top-black-3"
              cx={barCenterX}
              cy={thirdCheckerCenterY}
              r={checkerRadius}
              fill={COLORS.checkerBlack}
              stroke={COLORS.stroke}
              strokeWidth={1}
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
        
        checkers.push(
          <g key="bar-bottom-white-many">
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
          checkers.push(
            <circle
              key="bar-bottom-white-1"
              cx={barCenterX}
              cy={firstCheckerCenterY}
              r={checkerRadius}
              fill={COLORS.checkerWhite}
              stroke={COLORS.stroke}
              strokeWidth={1}
            />
          )
        }
        if (bottomBarCount >= 2) {
          const secondCheckerBottomY = barBottom - 3 * checkerDiameter
          const secondCheckerCenterY = secondCheckerBottomY - checkerRadius
          checkers.push(
            <circle
              key="bar-bottom-white-2"
              cx={barCenterX}
              cy={secondCheckerCenterY}
              r={checkerRadius}
              fill={COLORS.checkerWhite}
              stroke={COLORS.stroke}
              strokeWidth={1}
            />
          )
        }
        if (bottomBarCount >= 3) {
          const thirdCheckerBottomY = barBottom - 2 * checkerDiameter
          const thirdCheckerCenterY = thirdCheckerBottomY - checkerRadius
          checkers.push(
            <circle
              key="bar-bottom-white-3"
              cx={barCenterX}
              cy={thirdCheckerCenterY}
              r={checkerRadius}
              fill={COLORS.checkerWhite}
              stroke={COLORS.stroke}
              strokeWidth={1}
            />
          )
        }
      }
    }
    
    return checkers.length > 0 ? <g>{checkers}</g> : null
  }
  
  // Helper: Render checkers on a point
  const renderCheckers = (pointX, baseY, tipY, isTopHalf, checkerCount, owner, whitePointNumber) => {
    if (checkerCount === 0 || !owner || owner === 'empty') return null
    
    const checkers = []
    const centerX = pointX + pointWidth / 2
    
    // Get ghost checker count for this point (ghost checkers are always the last ones)
    const ghostCount = ghostCheckers[whitePointNumber] || 0
    const normalCount = checkerCount - ghostCount
    
    let currentY = isTopHalf ? baseY + checkerRadius : baseY - checkerRadius
    const stackDirection = isTopHalf ? 1 : -1
    
    // Render normal checkers first
    const normalDisplayCount = Math.min(normalCount, 5)
    const showCount = checkerCount > 5
    
    for (let i = 0; i < normalDisplayCount; i++) {
      const fillColor = owner === 'bottom' ? COLORS.checkerWhite : COLORS.checkerBlack
      const isLastNormalChecker = i === normalDisplayCount - 1 && ghostCount === 0
      
      checkers.push(
        <g key={`checker-${i}`}>
          <circle
            cx={centerX}
            cy={currentY}
            r={checkerRadius}
            fill={fillColor}
            stroke={COLORS.stroke}
            strokeWidth={1}
            opacity={1}
          />
          {isLastNormalChecker && showCount && (
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
    
    // Render ghost checkers (semi-transparent, 70% opacity)
    if (ghostCount > 0) {
      const ghostDisplayCount = Math.min(ghostCount, 5)
      const fillColor = owner === 'bottom' ? COLORS.checkerWhite : COLORS.checkerBlack
      const isLastChecker = normalDisplayCount + ghostDisplayCount >= Math.min(checkerCount, 5)
      
      for (let i = 0; i < ghostDisplayCount; i++) {
        checkers.push(
          <g key={`ghost-checker-${i}`}>
            <circle
              cx={centerX}
              cy={currentY}
              r={checkerRadius}
              fill={fillColor}
              stroke={COLORS.stroke}
              strokeWidth={1}
              opacity={0.7}
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
                {checkerCount}
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
    
    if (direction === 0) {
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
    const isGrey = direction === 1 ? !baseIsGrey : baseIsGrey
    
    const pointNumber = player === 0 
      ? getPointNumberWhite(quadrantIndex, pointIndex)
      : getPointNumberBlack(quadrantIndex, pointIndex)
    
    const labelY = isTopHalf 
      ? topBorderWidth - ONE_REM
      : BOARD_HEIGHT - bottomBorderWidth + ONE_REM
    
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
        {pointNumbers && (
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
  const topTrayBlackCount = xgid ? (15 - boardState.blackBar - boardState.points.reduce((sum, p) => sum + (p.owner === 'black' ? p.count : 0), 0)) : 15
  const bottomTrayWhiteCount = xgid ? (15 - boardState.whiteBar - boardState.points.reduce((sum, p) => sum + (p.owner === 'white' ? p.count : 0), 0)) : 15
  
  return (
    <div className="flex justify-center w-full">
      <svg
        width={BOARD_WIDTH}
        height={BOARD_HEIGHT}
        viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
        className="backgammon-board max-w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Outer border */}
        <rect
          x="0"
          y="0"
          width={BOARD_WIDTH}
          height={BOARD_HEIGHT}
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
          xgid ? boardState.blackBar : 0,
          xgid ? boardState.whiteBar : 0
        )}
        
        {/* Trays */}
        {renderTray(true)}
        {renderTray(false)}
        
        {/* Tray checkers */}
        {renderTrayCheckers(true, topTrayBlackCount)}
        {renderTrayCheckers(false, bottomTrayWhiteCount)}
        
        {/* Doubling cube */}
        {renderDoublingCube()}
        
        {/* Dice */}
        {renderDice()}
        
        {/* Board labels */}
        {boardLabels && getLabelPositions().map(pos => renderLabel(pos.text, pos.x, pos.y, pos.baseline))}
        
        {/* Points */}
        {Array.from({ length: POINT_COUNT }, (_, i) => renderPoint(0, i, true))}
        {Array.from({ length: POINT_COUNT }, (_, i) => renderPoint(1, i, true))}
        {Array.from({ length: POINT_COUNT }, (_, i) => renderPoint(2, i, false))}
        {Array.from({ length: POINT_COUNT }, (_, i) => renderPoint(3, i, false))}
      </svg>
    </div>
  )
}

