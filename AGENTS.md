# AGENTS.md — kleimeyer-dot-com

This document defines how AI agents (Cursor, Claude, etc.) should work on this project.

## Project Snapshot

- **Name**: kleimeyer-dot-com
- **Site**: https://kleimeyer.com
- **Type**: Multi-app Next.js site (App Router)
- **Stack**: Next.js 15 + React 18 + JavaScript + Tailwind CSS 3 + Supabase
- **Version SSOT**: `package.json` (`version`)
- **Architecture**: Modular apps under `src/apps/`; routes under `src/app/`

### Apps / areas

| Area | Routes / location | Notes |
|------|-------------------|--------|
| Launcher / home | `src/app/page.jsx` | Hub into the apps |
| Recipes | `src/app/recipe/`, `src/apps/recipes/` | Original core app |
| Family | `src/app/family/`, `src/apps/family/` | Announcements, contacts, documents, photos |
| Admin | `src/app/admin/`, `src/apps/admin/` | User / role management |
| LeaseMinder | `src/app/other-fun-stuff/LeaseMinder/` | Lease tracking |
| Medication | `src/app/other-fun-stuff/medication/` | Medication logging |
| Backgammon | `src/app/other-fun-stuff/backgammon-resources/` | Board editor + AI engine |
| Magic Playlists | `src/app/other-fun-stuff/magic-playlists/` | Spotify playlist tools |
| Lunar Lander | `/lunar-lander` → `public/lunar-lander.html` | Standalone SVG arcade game + HIGH SCORES (`lunar_lander_scores`) |
| Shared | `src/apps/shared/` | Navigation, shared UI/hooks |

## Core Workflow Rules (Non-Negotiable)

1. **After meaningful code changes**
   - Prefer verifying with the lightest useful check:
     - UI / app code: `npm run lint` (and `npm test` when touching tested areas)
     - API / utils with tests: `npm test` (or a focused Jest path)
   - Do **not** leave the tree broken: if you change behavior covered by tests, run those tests before finishing.
   - When the user asks to commit, stage the intended files and use conventional commit prefixes (`feat:`, `fix:`, `chore:`, `docs:`, etc.) so release changelog generation stays accurate.

2. **Versioning & releases**
   - Single source of truth: `package.json` → `version`.
   - Day-to-day work does **not** bump the version.
   - When the user says **release** (patch / minor / major / auto), follow `.cursor/rules/release-workflow.mdc`.
   - Order is always: **stage → commit (clean tree on `main`) → `npm run release:{patch|minor|major|auto}`**.
   - Do **not** guess the bump level — ask if unspecified.
   - `CHANGELOG.md` is updated by the release scripts from commits since the last tag. Prefer clear conventional commit subjects over hand-editing the changelog during normal work.

3. **Commit discipline**
   - Only commit when the user asks (or when executing an explicit release flow).
   - Do not commit secrets (`.env*`, credentials). `.env.example` is the safe template.
   - Prefer staging the files that belong to the change; exclude local-only noise.

4. **Testing changes**
   - For UI changes: run the app (`npm run dev`) or give the user clear repro steps.
   - For engine / utility changes with existing Jest coverage: run the relevant tests.
   - Prefer extending tests when fixing a regression in a tested module.

## Key Architectural Principles

- **App modularity**: Feature UI and logic live in `src/apps/<app>/`. Next.js routes in `src/app/` should stay thin and import from apps/shared.
- **Shared code**: Cross-app UI and hooks go in `src/apps/shared/`. Avoid duplicating navigation or auth patterns.
- **Supabase**: Client helpers live under `src/lib/` and `src/utils/`. Prefer existing patterns for anon vs service-role usage; never expose the service role key to the client.
- **Auth & roles**: Respect the existing role/permission model (`ROLE_SYSTEM.md`, `PERMISSION_SYSTEM_DESIGN.md`). Do not weaken RLS or admin checks casually.
- **Migrations**: SQL lives in `migrations/`. Document new schema changes; do not invent a parallel migration system.
- **JavaScript (not TypeScript)**: This codebase is JS/JSX with `jsconfig.json` path aliases (`@/*` → `src/*`). Do not introduce TypeScript unless the user explicitly asks for a migration.

## Build & Environment Notes

- Local env: copy `.env.example` → `.env.local` and fill values (gitignored).
- Dev server: `npm run dev` (also `dev:turbo`, `dev:clean`, `dev:clean:build`).
- Production build: `npm run build` then `npm start`.
- Node: use a current LTS that satisfies Next.js 15.

### Restarting the dev server

"Restart the dev server" means **kill the process that is already running and start a
new one** — not "make sure something is listening." A server started by another
process (an earlier session, a watcher, the user's own terminal) will not pick up
config-level changes, so leaving it running defeats the purpose of the restart.

1. Find every dev-server process for **this** project, not just the port listener:
   `ps aux | grep "next dev" | grep -v grep` and `lsof -ti:3000 -sTCP:LISTEN`.
2. Kill them, then confirm nothing remains before starting: an `npm run dev` wrapper
   can outlive the `next dev` child it spawned.
3. Scope kills to this project's path. Avoid a bare `pkill -f "next dev"` — it can
   match sibling projects' servers (and even the agent's own command line). This has
   already killed an unrelated project's dev server once.
4. After starting, verify the server you started is the one answering. A near-instant
   ready response is a red flag: a cold Next.js dev boot takes several seconds, so
   sub-second success usually means an **old process** is still serving and the new
   one failed to bind. Check the log you redirected to (e.g. for `EADDRINUSE`) rather
   than trusting an HTTP 200.

## Documentation & Planning

| Doc | Purpose |
|-----|---------|
| `README.md` | Onboarding, scripts, stack |
| `AGENTS.md` | This file — agent contract |
| `SKILLS.md` | When to use specialized skills/subagents |
| `SEMVER_GUIDE.md` | Version bump conventions |
| `CHANGELOG.md` | Shipped history (release-script maintained) |
| `CODEBASE_STRUCTURE.md` | Modular layout (may lag; prefer the tree) |
| `ROLE_SYSTEM.md` / `ADMIN_*.md` | Auth and admin |
| Domain docs (`BACKGAMMON_*`, etc.) | Feature-specific history |

When making significant changes, update the relevant document(s).

## Skills & Subagents

See `SKILLS.md` for recommended skills and when to invoke specialized subagents.

## Communication Style

- Be direct and precise.
- When proposing changes, briefly explain *why*.
- Surface uncertainty instead of guessing (especially around auth, migrations, and releases).
- Notify the user by mobile push every time a task takes longer than 1 minute to finish.

## Common Pitfalls to Avoid

- Do not run `npm run release:*` on a dirty tree or off `main`.
- Do not commit `.env.local` or real API keys.
- Do not put service-role Supabase calls in client components.
- Do not invent a second navigation or auth path when `src/apps/shared/` already has one.
- Do not treat `CODEBASE_STRUCTURE.md` as gospel if the filesystem disagrees — trust the code.
- Do not mass-convert to TypeScript or Prettier-reformat the whole repo as a drive-by.

---

This file should be the first thing an agent reads when starting work on kleimeyer-dot-com.
