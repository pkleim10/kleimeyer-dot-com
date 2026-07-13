# kleimeyer.com

Personal multi-app site built with **Next.js 15** (App Router), **React 18**, **Tailwind CSS**, and **Supabase**.

Production: [https://kleimeyer.com](https://kleimeyer.com)

## Apps

| App | Path |
|-----|------|
| Recipes | `/recipe` |
| Family | `/family` |
| Photos | `/photos` |
| Admin | `/admin` |
| LeaseMinder | `/other-fun-stuff/LeaseMinder` |
| Medication | `/other-fun-stuff/medication` |
| Backgammon | `/other-fun-stuff/backgammon-resources` |
| Magic Playlists | `/other-fun-stuff/magic-playlists` |

Feature code lives under `src/apps/`; routes under `src/app/`. See `AGENTS.md` for agent/workflow conventions.

## Local development

```bash
npm install
cp .env.example .env.local
# edit .env.local with your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Jest |
| `npm run test:coverage` | Coverage report |
| `npm run release:patch` / `:minor` / `:major` / `:auto` | Version bump, changelog, tag, push (clean `main` only) |

## Environment

See `.env.example`. Minimum for core apps:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server / scripts only)

Optional feature keys: Spotify, xAI (`XAI_API_KEY`), Groq (`GROQ_API_KEY`).

## Releases

1. Commit work on `main` with conventional prefixes (`feat:`, `fix:`, …).
2. Ensure a clean working tree.
3. Run `npm run release:patch` (or minor/major/auto).

Details: `SEMVER_GUIDE.md`, `.cursor/rules/release-workflow.mdc`.

## Agent docs

- [`AGENTS.md`](./AGENTS.md) — primary agent contract
- [`CLAUDE.md`](./CLAUDE.md) — short pointer
- [`SKILLS.md`](./SKILLS.md) — when to use specialized workflows
