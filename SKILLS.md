# SKILLS.md — kleimeyer-dot-com

Skills, subagents, and specialized workflows for developing this project with AI assistance.

## Philosophy

Use:

- General-purpose coding for most changes
- Project rules in `.cursor/rules/` for always-on discipline
- Targeted skills / subagents for reviews, architecture, or complex refactors

Be deliberate — do not spawn specialized agents for every small edit.

## Core Project Workflows

### 1. Dev verification

After meaningful changes:

```bash
npm run lint
npm test          # when touching tested code
npm run build     # when risking Next.js / route / config breakage
```

Enforced by `.cursor/rules/dev-workflow.mdc` and summarized in `AGENTS.md`.

### 2. Release workflow

When the user says **release**, follow `.cursor/rules/release-workflow.mdc`:

1. Stage and commit work belonging in the release
2. Ensure clean tree on `main`
3. Run `npm run release:patch` / `:minor` / `:major` / `:auto`
4. Ask for the bump level if unspecified

Changelog entries are generated from conventional commits by `scripts/version-bump.js`.

### 3. Auth, roles, and Supabase

For permission or RLS work, read:

- `ROLE_SYSTEM.md`
- `PERMISSION_SYSTEM_DESIGN.md`
- `ADMIN_SETUP.md` / `ADMIN_GUIDE.md`

Prefer existing client/service-role patterns; never leak the service role key to the browser.

### 4. Feature-heavy domains

| Domain | Start here |
|--------|------------|
| Backgammon AI / engine | `src/app/api/backgammon-engine/`, `BACKGAMMON_*` docs |
| LeaseMinder | `src/app/other-fun-stuff/LeaseMinder/` |
| Recipes | `src/apps/recipes/` |
| Family / photos / documents | `src/apps/family/`, `src/app/family/`, `src/app/photos/` |
| Spotify / playlists | `src/contexts/SpotifyContext.jsx`, magic-playlists routes |

## Recommended Specialized Subagents / Skills

| Task type | Suggested approach | Why |
|-----------|--------------------|-----|
| Large refactors / architecture | Explore subagent first | Map `src/apps` vs `src/app` before editing |
| PR / CI failures | CI investigator | Faster triage of GitHub checks |
| Security-sensitive auth/API changes | Security review subagent | Roles, RLS, service-role usage |
| Bugbot-style local review | Bugbot (when explicitly requested) | Systematic diff review |
| Writing / updating Cursor rules | `create-rule` skill | Keep rules minimal and high-signal |

## Anti-Patterns

- Do not run full-repo formatters or TypeScript migrations as drive-bys.
- Do not invent parallel env, release, or migration tooling.
- Do not skip asking for patch vs minor vs major on release.
