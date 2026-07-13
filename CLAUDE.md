# kleimeyer-dot-com — Claude / Cursor Instructions

See the following foundation documents for how to work on this project:

- **[AGENTS.md](./AGENTS.md)** — Primary agent contract (read this first)
- **[SKILLS.md](./SKILLS.md)** — Skills and subagent usage
- **[SEMVER_GUIDE.md](./SEMVER_GUIDE.md)** — Versioning conventions
- **[README.md](./README.md)** — Local setup and scripts

## Quick Reference

```bash
npm install
cp .env.example .env.local   # then fill values
npm run dev
```

Useful checks after code changes:

```bash
npm run lint
npm test
```

For releases (clean tree on `main`), see `.cursor/rules/release-workflow.mdc`:

```bash
npm run release:patch   # or :minor / :major / :auto
```
