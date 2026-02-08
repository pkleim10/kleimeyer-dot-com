# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.38.0] - 2026-02-08

### Added
- Add interactive cube ownership controls: Add clickable outline rectangles on bar for cube ownership in FREE mode

## [1.37.0] - 2026-02-07

### Added
- Add documentation comment for debug logging control: Added comment explaining debug logging is controlled by NEXT_PUBLIC_DEBUG_LOGGING env var
- Add debug logging control system: Create src/config/debug.js with centralized debug configuration
- Add development documentation and update .gitignore: Add reconstruct-features.md: detailed change tracking for backgammon engine
- Add debug logging and enhanced bar entry validation: Add debug logging to validateMove function for bar entry checks
- Add pointer cursor to ROLL text element: Add cursor='pointer' to the ROLL text for consistent hover behavior
- Add hand cursor to ROLL indicator rectangle: Add cursor='pointer' to the light grey rectangle
- Add cosmetic improvements to backgammon play page: Default editing mode to PLAY instead of FREE

### Changed
- Update debug logging documentation: Clarified that all syntax errors in debugFetchLog calls are resolved
- Change ROLL cursor to arrow pointer: Change cursor from 'pointer' (hand) to 'default' (arrow) for ROLL area

### Fixed
- UI Enhancement: Center ROLL button and dice horizontally with respect to each other: Repositioned ROLL button to be centered at the same horizontal position as dice
- UI Enhancement: Center ROLL text within the wider button: Updated ROLL text positioning from x={rightHalfCenterX} to x={rightHalfCenterX + dieSize * 0.4}
- UI Enhancement: Make ROLL button 50% wider: Increased ROLL button width from dieSize * 1.6 to dieSize * 2.4 (50% wider)
- Factor out Game State Management functions into gameState module: Created gameState/ folder with organized modules:
- Move getLegalMoves.js into moveGeneration folder: Moved getLegalMoves.js from backgammon-engine/ to backgammon-engine/moveGeneration/
- Extract Position Evaluation functions from route.js: Created src/app/api/backgammon-engine/evaluation/positionEvaluation.js (92 lines)
- Fix runMonteCarloWithMoveTracking return value and logging parameter: Fixed function to return proper object {gameMoves, totalMoves, finalBoard, winner}
- Extract Move Generation functions from route.js: Created src/app/api/backgammon-engine/moveGeneration/moveGeneration.js (176 lines)
- Extract Monte Carlo & Simulation Logic from route.js: Created src/app/api/backgammon-engine/simulation/monteCarlo.js (523 lines)
- Fix potential webpack module loading issues: Clear Next.js cache and restart dev server to resolve '__webpack_modules__[moduleId] is not a function' error
- Extract Move Evaluation functions from route.js: Created src/app/api/backgammon-engine/evaluation/moveEvaluation.js
- Extract Board Analysis & Utilities functions: Create utils/boardUtils.js with boardToArray, displayBoard, cloneBoardState, applyMoveToBoardForAnalysis, calculateFinalBoardState, parseXGID
- Extract constants and debug config from route.js: Create config/heuristicWeights.js with HEURISTIC_WEIGHTS and POSITION_WEIGHTS
- Fix onMaxMovesChange error in options modal: Removed invalid onMaxMovesChange call from handleSaveSettings
- Fix final syntax errors in debug logging calls: Fixed all remaining missing closing braces in debugFetchLog calls
- Fix complex debugFetchLog call syntax error: Simplified the 'After getLegalMoves' debugFetchLog call to avoid nested object syntax issues
- Fix extra closing parenthesis in debugFetchLog call: Removed extra closing parenthesis from 'After getLegalMoves' debugFetchLog call
- Fix debug logging condition logic: Corrected the condition in debugFetchLog from 'if (!env === true)' to 'if (env !== true)'
- Fix final syntax error in debug logging call: Fixed extra closing parenthesis in debugFetchLog call on line 1276
- Fix remaining syntax errors in debug logging calls: Fixed extra closing parentheses in debugFetchLog calls on lines 1252 and 1270
- Fix last syntax error in debug logging call: Fixed extra closing parenthesis in debugFetchLog call on line 1241
- Fix final syntax errors in debug logging calls: Fixed extra closing parentheses in remaining debugFetchLog calls
- Fix remaining syntax errors in debug logging: Fixed missing closing braces in debugFetchLog function calls
- Fix syntax errors in debug logging calls: Fixed missing closing braces in debugFetchLog calls in route.js
- Fix syntax errors in debug logging calls: Convert all remaining debugFetchLog calls from object format to proper function calls
- Fix debug config import paths to use @ alias: Update all debug.js imports to use '@/config/debug.js' instead of relative paths
- Move ROLL text down 2 pixels: Adjust y position from diceY to diceY + 2 for better visual alignment
- Center ROLL text vertically in rectangle: Move text y position to diceY (rectangle center)
- Make ROLL text bigger and bolder: Increase font size from 30% to 40% of dieSize
- Show ROLL indicator in EDIT mode too: Remove PLAY mode restriction for ROLL indicator visibility
- Fix ROLL indicator runtime error: Move ROLL indicator rendering before dice parsing to prevent null access
- Fix Monte Carlo simulation passing on valid moves: Improve canDieBeFullyUsed to check bar entry possibilities first

### Removed
- Remove border from ROLL indicator rectangle: Remove stroke and strokeWidth properties from the ROLL background

## [1.36.0] - 2026-02-02

### Added
- Major backgammon engine and UI improvements: Backgammon Engine Enhancements:
- Make maxMoves configurable with default 40: Add maxMoves parameter to runMonteCarlo with default 40 (up from 20)
- Add simulation counter to verify actual simulations run: Add totalSims counter in runMonteCarlo function
- Display simulation parameters in Simulation Results section: Add 'Simulation Parameters' section showing maxMoves and numSimulations

### Fixed
- Normalize HE scores before hybrid calculation: HE scores range ~0.5-2.5, MC scores range 0-1
- Update simulation results highlighting to show MC cutoff moves: Highlight moves that made the MC cutoff with green background
- Properly handle MC score ties in move selection: Fix top MC performers selection to include all moves tied for 4th place
- Display moves in relative coordinates from player's perspective: Update API to format move descriptions using currentPlayer instead of absolute coordinates

## [1.35.0] - 2026-01-25

### Added
- Implement selective winner selection from top 4 MC performers: Changed move selection logic: first identify top 4 MC performers
- Add highRollBonus weight to HEURISTIC_WEIGHTS constant: Moved hardcoded 0.06 weight to HEURISTIC_WEIGHTS.highRollBonus
- Add High Roll Bonus factor to heuristic evaluation: New factor with 0.06 weight for high pip gain (≥6) and deep runs
- Implement dual move display system for play page: Raw moves in code: Always use full sequences like '13/11 11/10'
- Implement sequence collapsing for normalized move display: Add collapseSequences option to formatMoveCombination and formatMove functions
- Add simulation results toggle to play backgammon page: Add toggle button (OFF by default) to show/hide simulation results
- Add deduplication of moves leading to identical final positions: Prevents wasteful Monte Carlo simulations on equivalent moves
- Enhance backgammon engine with bar entry fix and configurable scoring: Fix bar entry bug: checkers on bar now properly prioritized over board moves
- Add collapsed move path functionality and update text: Add findCollapsedMovePath function to validate multi-step moves
- Add help overlay helpers 7-9 and improve styling: Add helper 7 for info bar (right side, horizontal arrow)
- Add clickable info bar to cycle players in EDIT mode and improve dice area interaction: Info bar cycles through WHITE > BLACK > OPEN players in EDIT mode
- Combine button bars and add Reset functionality: Merge two button bars into one wider bar with all buttons
- Implement opening roll feature for backgammon: Add support for xg4=0 (OPEN state) in XGID parser and validation
- Add end-of-game detection and win message overlay: Add hasPlayerWon utility function to check if all 15 checkers are borne off
- HAM heuristic and MC engine improvements: Rename backgammon-ai to backgammon-engine throughout codebase
- Implement hybrid heuristic + MC engine for backgammon AI: Remove LLM dependency and xAI API calls

### Changed
- Change HE/MC weighting from 60/40 to 35/65: Heuristic weight: 0.6 → 0.35 (35%)
- Enhance Points Made factor with quality-based scoring: Each newly made point gets base score of 1.0
- Update HEURISTIC_WEIGHTS for clarity and adjust Builder Coverage: Change blots weight from -0.5 to -0.25 to match actual calculation
- Optimize hybrid simulation process: deduplicate before HE calculation: Reorder process: Generate → Deduplicate → HE scores → MC selection
- Update arrow endpoints and remove close button from help overlay: Update helpers 1-4 to point to button edges instead of centers
- Update arrow endpoints for helpers 7, 8, and 9: Helper 7 (info bar): arrow points to right edge instead of center
- Improve move display and ghost checker normalization: Add Show/Clear button toggle: Clear button changes to Show when clicked, allowing users to restore ghost checkers

### Fixed
- Correct jspdf version string - remove invalid backtick
- Fix debug info timing issue - move debugInfo creation after hybrid analysis: debugInfo was trying to access hybridAnalysis before it was declared
- Fix heuristic evaluation sorting issue: Root cause: Intermittent race condition in Array.sort()
- Regenerate factors.md with complete 10-factor system documentation: Updated to reflect all 10 current heuristic factors
- Increase golden points bonus to 1.0 in Points Made factor: Points 4 and 5 now get +1.0 bonus (maximum value)
- Increase golden points bonus from 0.5 to 0.8 in Points Made factor: Points 4 and 5 now get +0.8 bonus instead of +0.5
- Display moves in normalized absolute coordinates in simulation results table: Add normalizedMoveDescription field to API factorScores (absolute coords)
- Replace HE scores list with formatted table showing HE, MC, and Hybrid scores per move: Display top 10 moves in tabular format with Move | HE | MC | Hybrid columns
- Increase numSimulations from 20 to 1000 for more accurate MC evaluation: Each move analysis now runs 1000 Monte Carlo simulations (50x more than before)
- Fix MC/Hybrid score display - include score fields in API response: Add mcScore, hybridScore, heuristicScore to validateAndReturnMove function
- Debug MC/Hybrid score display issues: Add console logging to see what API returns
- Redesign Builder Coverage factor with strategic differentiation: Points 9-11: +1.0 for single checker, +0.5 for stacks
- Reduce Points Made weight from 0.4 to 0.3: Decrease emphasis on creating new made points
- Fix heuristic normalization bug: ensure position-based evaluation: Reorder buildVerifiedMoveAnalysis to calculate hits during move sequence
- Restore collapsed move functionality and fix dice click regression: Add findCollapsedMovePath function to gameLogic.js (was missing from previous commit)
- Fix drag and drop jitter near trays by separating checker positioning from drop zone detection
- Fix dice highlighting for doubles rolls with progressive greying pattern
- Fix bearing off logic and coordinate conversion issues: Fix bearing off validation: only allow exact match (point N with die N)
- PLAY: Start | Suggest Move | Move Notation | Apply | Clear | Reset]
- Fix bear-off move application and coordinate conversion: Fix bear-off coordinate conversion: convert to === 0 or 25 to -1 or -2 for updateXGIDForMove
- Fix manual move dice tracking by preventing component remount on every move: Changed BackgammonBoard key prop to only depend on showGhosts instead of boardXGID
- Fix flicker when clicking Show button for ghost moves: Add key prop to BackgammonBoard that changes when switching between ghost/normal modes
- Fix ghost checker display for suggested moves: Fix ghost checkers showing correctly for collapsed sequences (e.g., 13/8 from 13/10 10/8)

### Removed
- Remove duplicate factor sections 8 and 9 from factors.md: Eliminated duplicate Stack Penalty and Opponent Blot Count sections
- Remove redundant MC Score and Hybrid Score boxes below the move scores table: The table now shows all HE, MC, and Hybrid scores for all moves

## [1.34.0] - 2026-01-19

### Changed
- Update backgammon AI prompt and roll outputs
- Improve move generation and prompt guidance
- Update backgammon AI scoring output

## [1.33.0] - 2026-01-12

### Added
- Add experimental warning label to AI button: Add '** EXPERIMENTAL **' label in red bold text next to 'Get AI Move' button
- Implement AI playability improvements: button relocation, debug display, and draggable window: Move 'Get AI Move' button from options dialog to main editor control bar next to Start button
- Implement API-based AI system for backgammon: Create /api/backgammon-ai route for server-side AI analysis
- Add hybrid AI backgammon opponent system: Implement xAI/Grok integration for strategic move analysis

### Changed
- Update README to clarify server-side AI API usage: Document that backgammon AI now uses server-side API calls for secure access to XAI_API_KEY, eliminating the client-side access issue.

### Fixed
- Fix AI backgammon analysis to properly use both dice in combinations: Implement proper move combination generation that uses both dice when possible
- Fix AI analysis issues: player perspective, legal moves, and UI positioning: Fix AI analysis to provide correct player perspective (WHITE/BLACK)
- Fix AI analysis by embedding core functions in API route: Resolve module import issues by copying parseXGID and getLegalMoves directly into /api/backgammon-ai
- Improve AI error handling when XAI_API_KEY not configured: Add graceful fallback when xAI API key is missing
- Complete hybrid AI backgammon opponent system: Create aiBackgammon.js with xAI/Grok integration for strategic analysis

## [1.32.0] - 2026-01-11

### Added
- Add editable XGID input field with validation: Replace read-only XGID display with editable input field
- Add no legal moves UI and update .gitignore: Add .cursor/ to .gitignore

### Fixed
- Disable dice reset in PLAY mode: Added check to prevent dice reset when effectiveEditingMode is 'play'
- Fix dice reset areas to not overlap with dice and make them visible: Added 5px gap between reset areas and dice boundaries to prevent overlap
- Fix options dialog player selection not working in PLAY mode: Removed localSettings.player from useEffect dependency array to prevent clearing while user edits
- Fix UI player display inconsistency in PLAY mode: Added useEffect to clear localSettings.player when XGID player changes in PLAY mode
- Fix black checker highlighting and coordinate conversion in EDIT mode: Modified getPointFromCoordinates to return absolute coordinates for rendering
- Allow multi-checker moves on doubles in play mode: Modified validateMove to detect doubles and allow 1-4 checkers per move
- Fix bar checker drag to always move 1 checker: Bar checkers now always move exactly 1 checker regardless of which checker is clicked or how many are in the bar
- Fix remaining backgammon UI issues: Dice cycling now only available in EDIT mode, not PLAY mode
- Fix backgammon bearing off and coordinate conversion bugs: Fix bearing off validation: require all checkers in play to be in home board before allowing bearing off
- Fix checker count validation and doubles handling in backgammon: Enforce one checker per move in play mode (one checker per die)
- Fix black player moves and dice greying in backgammon board: Fix updateXGIDForMove to convert relative coordinates to absolute before accessing boardState.points

## [1.31.0] - 2026-01-09

### Added
- Add board editor improvements - Edit mode toggle, Start button, dice reset areas, cube value display enhancements
- Add Board Editor page, navigation/breadcrumbs, and showBoardLabels option: Created new Board Editor page accessible from Backgammon Resources

## [1.30.0] - 2026-01-09

### Added
- Add click-to-clear ghost checkers functionality and update options icon styling

## [1.29.0] - 2026-01-09

### Changed
- Refactor backgammon parameters and integrate full XGID format support: Change cubeValue domain to exponent-based [0-6] (displayed as 2^cubeValue, 0=64)

## [1.28.0] - 2026-01-08

### Added
- Add showTrays parameter, rename boardLabels/pointNumbers to showBoardLabels/showPointNumbers, support BLACK moves, reduce ghost checker opacity to 0.6

## [1.27.0] - 2026-01-08

### Changed
- Improve backgammon arrow rendering: curved base matching checker radius, proper shaft length

## [1.26.1] - 2026-01-08

### Fixed
- Fix ghost checker rendering bug and add visual feedback for incorrect answers: Fix ghost checkers not rendering when all checkers are moved from a point

## [1.26.0] - 2026-01-08

### Added
- Add interactive move visualization and answer page enhancements: Allow clicking choices to preview board positions in both question and answer modes

## [1.25.0] - 2026-01-08

### Added
- Add move visualization with ghost checkers and arrows to opening moves quiz: Updated moveApplier.js to track stack positions for moved checkers
- Add information bar and improve quiz dice rolling
- Add ghost checkers and dice display to BackgammonBoard: Add ghost checker support: semi-transparent checkers (70% opacity) for move notation
- Add backgammon resources with opening moves quiz and board component: Add BackgammonBoard component with full board rendering (points, bar, trays, checkers)

### Changed
- Improve UX for opening moves quiz action buttons and choices layout: Made action buttons sticky at bottom of viewport for easy access

### Fixed
- Replace opening move answer images with dynamic BackgammonBoard component: Created moveApplier.js utility to parse and apply backgammon moves to board positions

## [1.24.2] - 2026-01-06

### Fixed
- Escape quotes in EditTimeLabelsDialog to fix build error
- Remove duplicate entry from changelog v1.24.1

## [1.24.1] - 2026-01-06

### Changed
- Improve changelog generation with detailed commit messages: Regenerate entire changelog from git history

## [1.24.0] - 2026-01-05

### Added
- Add time labels to medication groups: Add time_labels column to medication_groups table

## [1.23.0] - 2026-01-05

### Fixed
- Allow Family/Admin users to edit medications in shared groups: Remove user_id filter from medication update/delete queries

## [1.22.1] - 2026-01-05

### Changed
- Remove unused code and assets: Remove unused /public/assets directory and images

## [1.22.0] - 2025-12-06

### Fixed
- Improve playlist generation error handling and UI: Fix normalize function to handle null/undefined values by converting to string first

## [1.21.4] - 2025-12-06

### Changed
- Optimize playlist generation for production - address Vercel timeout issues: Increase max_tokens to 4000 to ensure AI returns all requested songs

## [1.21.3] - 2025-12-05

### Fixed
- Fix playlist generation stopping early - track processed suggestions and continue on stream errors: Add processedSuggestions Set to track which suggestions have been checked

## [1.21.2] - 2025-12-05

### Fixed
- Fix playlist generation stopping early - ensure loop continues until 20 tracks are found: Add logging to track initial AI response vs requested count

## [1.21.1] - 2025-12-05

### Fixed
- Improve error handling and logging for playlist generation: Enhanced send() function to detect stream closure and log failures

## [1.21.0] - 2025-12-05

### Changed
- Update Grok models and improve playlist generation UX: Updated Grok model list in generate-playlist API with latest models

## [1.20.0] - 2025-12-05

### Removed
- Remove debug modal and add track deletion feature

## [1.19.3] - 2025-12-05

### Fixed
- Style Magic Playlists greeting box with yellow background and border, include heading and icon

## [1.19.2] - 2025-12-05

### Added
- Add M3U import feature for playlists: Import M3U files to load playlists
- Add M3U export feature for playlists: Export playlist to M3U file format
- Add detailed logging for 401 authentication errors: Log auth header presence and format
- Add navigation and breadcrumbs for Magic Playlists page

### Fixed
- Improve error handling for M3U import and Spotify playlist creation: Better error messages with specific details
- Improve error handling for empty API error responses: Better parsing of error responses (handles empty JSON, plain text, etc.)
- Improve error handling and logging for playlist generation: Add better error logging for Spotify API errors
- Fix Next.js 15 config warnings: move serverExternalPackages and remove deprecated api config
- Fix profile page role badge display

### Security
- Security and navigation improvements: Updated Next.js to 15.5.7 to fix CVE-2025-66478 vulnerability
- Security: Update Next.js to 15.5.7 to fix CVE-2025-66478 vulnerability
- Role-based permission system and profile page fixes: Implemented 3-role system (Member, Family, Admin) replacing granular permissions

### Removed
- Remove redundant 'Added to Spotify!' message, keep playlist creation box
- Remove authentication requirement from generate-playlist API: API uses server-side Spotify Client Credentials, no user auth needed

## [1.17.0] - 2025-12-05

### Added
- Remove Spotify auth requirement for playlist generation, use Client Credentials for search: Use Spotify Client Credentials Flow for search (no user auth needed)

### Fixed
- 1.17.0
- Improve error handling in playlist generation to prevent early stopping
- Add missing NextResponse import in generate-playlist API route
- Escape quotes and apostrophes in JSX to fix build errors

## [1.16.0] - 2025-12-04

### Added
- Add Magic Playlists feature with Spotify integration, obscurity slider, and improved OAuth flow
- Add detailed logging and error handling to Spotify redirect page
- Add Spotify OAuth redirect handler for development

### Changed
- Remove old spotify-redirect page component (replaced with route)
- Update spotify-redirect to support Authorization Code flow: Handle authorization code from Spotify and forward to API callback
- Improve Spotify redirect handling for dev and prod

### Fixed
- Improve error handling in Spotify callback to identify missing env vars
- Switch Spotify OAuth to Authorization Code flow: Add API route /api/spotify/callback to exchange code for tokens
- Fix home page announcement check loop
- Fix Spotify redirect to return to Magic Playlists

## [1.15.2] - 2025-11-21

### Added
- Add PDF download to Thanksgiving checklist and rename Volunteer to Contributor: Add Download PDF button to Thanksgiving checklist page

## [1.15.1] - 2025-11-21

### Changed
- Rename 'Just for Me' to 'Other Fun Stuff': Rename all routes from /just-for-me to /other-fun-stuff

## [1.15.0] - 2025-11-21

### Added
- Add wraparound day sorting for medication schedules: Add day_start_time and day_end_time fields to medication_groups table

## [1.14.4] - 2025-11-21

### Fixed
- Make dosage field optional when adding and editing medications

## [1.14.3] - 2025-11-21

### Security
- Fix shared medication group access: allow users with edit permissions to create medications

## [1.14.2] - 2025-11-21

### Fixed
- Fix stale session issue: add session validation and proper 401 error handling

## [1.14.1] - 2025-11-21

### Fixed
- Fix authentication redirect for Thanksgiving Checklist page

## [1.14.0] - 2025-11-20

### Added
- Add Thanksgiving Checklist page with full CRUD operations for family members

## [1.13.1] - 2025-11-20

### Added
- Add medication notes to PDF summary and reorder checklist columns

### Changed
- Update package.json version to 1.12.0 to match tag

### Fixed
- Medication management improvements: Fix visibility badge showing 'Only Me' instead of 'Shared' for shared groups

## [1.13.0] - 2025-11-20

### Added
- Migrate medication management from localStorage to Supabase: Create database migration for medication_groups, medications, and medication_logs tables

## [1.12.0] - 2025-11-20

### Added
- Add medication groups feature with dedicated permission category: Add Group concept to medication management (highest-level construct)

## [1.11.3] - 2025-11-19

### Added
- Add keywords array to JSON-LD structured data: Add keywords attribute as array of strings to JSON-LD

## [1.11.2] - 2025-11-19

### Added
- Add recipeCuisine field to JSON-LD structured data: Add recipeCuisine attribute to JSON-LD with same value as recipeCategory

## [1.11.1] - 2025-11-19

### Changed
- Replace recipe modal with direct navigation and improve breadcrumbs: Remove RecipeViewModal usage from RecipeCard

## [1.11.0] - 2025-11-19

### Added
- Add JSON-LD structured data for recipes: Add JSON-LD script tag to recipe detail pages

## [1.10.1] - 2025-11-09

### Added
- Add keep-alive workflow to prevent Supabase from sleeping

## [1.10.0] - 2025-10-05

### Added
- Add document preview modal with frosted glass styling: Add DocumentPreviewModal component with frosted glass UI

## [1.9.0] - 2025-09-21

### Added
- Improve file upload system with size management: Implement 5MB file size limit for photo uploads

## [1.8.0] - 2025-09-21

### Added
- Enhance screen view calendar and fix print preview dark mode: Show all appointments in screen view (remove 2-appointment limit)

## [1.7.3] - 2025-09-21

### Fixed
- Add expiration logic for recurring appointments: Set recurring appointment expiration to 2 hours after last occurrence

## [1.7.2] - 2025-09-21

### Fixed
- Standardize screen view calendar cell height: Set all calendar days to 120px minimum height in screen view

## [1.7.1] - 2025-09-21

### Fixed
- Optimize print calendar cell height for consistent layout: Set all calendar days to 118px minimum height (height of day with 2 appointments)

## [1.7.0] - 2025-09-21

### Added
- Implement separate screen and print calendar views: Add admin-only toggle between Screen View and Print Preview

## [1.6.0] - 2025-09-21

### Removed
- Remove list view toggle and dashboard calendar link: Remove 'List View' toggle from calendar page, keeping only calendar view

## [1.5.0] - 2025-09-21

### Fixed
- Revert to standard browser time controls with 1-minute intervals: Removed custom dropdown approach for time selection

## [1.4.2] - 2025-09-20

### Fixed
- Add permissions to GitHub Actions workflow for release creation: Add 'contents: write' permission to allow release creation

## [1.4.1] - 2025-09-20

### Changed
- Simplify GitHub Actions workflow: Remove unnecessary build and test steps (Vercel handles builds)

### Fixed
- Resolve thumbnail corruption when deleting multiple photos from upload queue: Add unique IDs to photo previews to prevent array index misalignment
- Skip tests in GitHub Actions release workflow: Tests fail due to missing Supabase environment variables in CI

## [1.4.0] - 2025-09-20

### Added
- Add high-quality lightbox API for better image display: Create dedicated lightbox API endpoint for high-quality image URLs

## [1.3.1] - 2025-09-20

### Fixed
- Resolve JavaScript hoisting issue with touch handlers: Move touch handlers after navigatePhoto function definition

## [1.3.0] - 2025-09-20

### Added
- Add bulk delete functionality with progress tracking: Add visual selection system for photos with blue rings and checkmarks

## [1.2.2] - 2025-09-19

### Fixed
- Eliminate jarring loader during local state updates: Replace async filtering with synchronous useMemo for instant updates

## [1.2.1] - 2025-09-19

### Changed
- Optimize photo operations to update local state instead of refetching: Upload photos: Add new photos directly to local state instead of refetching all photos

## [1.2.0] - 2025-09-19

### Added
- Enhance photo upload dialog and slideshow UI: Add drag-and-drop functionality to photo upload dialog

## [1.1.2] - 2025-09-19

### Fixed
- Add null checks for album data in photo album page: Add null check in handleSetCover function to prevent 'Cannot read properties of null' error

## [1.1.1] - 2025-09-19

### Fixed
- Update photos page heading from 'Family Photo Albums' to 'Photo Albums': Simplify heading to match the new dedicated photos route

## [1.1.0] - 2025-09-19

### Added
- Migrate photo albums to dedicated /photos route: Move photo album feature from /family/photos to top-level /photos route

## [1.0.1] - 2025-09-19

### Fixed
- See commit history for detailed changes
