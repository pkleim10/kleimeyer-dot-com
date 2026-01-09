# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
