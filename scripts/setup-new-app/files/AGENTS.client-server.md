# Stack

- Tooling: Bun + TypeScript
- Server: Bun.serve API
- Client: React + Vite + TanStack Router
- UI: Tailwind CSS (enabled in `__WEB_DIRECTORY__/src/index.css`)
- Linting and Hooks: Oxlint + Lefthook

# Structure and commands

- `__WEB_DIRECTORY__/` owns React, routes, styles, and Vite. `server/` owns the Bun API. `shared/` holds environment-independent types and contracts. Read each folder's `AGENTS.md` before changing it.
- `bun run start` runs client and server; `start:client` and `start:server` run them separately. Browser API calls use the client-relative `/api` proxy.
- A `monorepo-swift` scaffold also has `app-ios/` with native instructions and its own launcher. See that folder's docs.

# Environment

- Use env-manager's root `.env` schema and named directory targets. Edit values only in the root `.env.local`, then run `bun run env:generate`. Child values and readers are generated projections, not independent configs; commit readers exactly as generated.
- `local:true` keeps generation offline and disables automatic Git updates. Use `env-manager --help` for schema types, target selection, and remote storage.
- Read application settings through generated `src/env.ts` in each TypeScript target. The server reads them through `server/src/config.ts`, which fails at startup when production lacks a setting. The client's reader runs only in Vite's Node context; browser code must not import it.
- Keep schema and readers tracked, values files and `.env.override` ignored, and secrets scoped to the server target. Native and browser settings are public.

# Agent worktrees

- T3 Code runs the shared `agent-t3-worktree setup` when it creates a worktree: it installs, gives the worktree its own 10-port block in the git-ignored `.env.override` (main ports plus `10000 + (n - 1) * 1000`), and runs `env-manager gen --local`. Don't run setup by hand. The pre-commit hook and session start run `agent-t3-worktree check --heal`, which reruns setup when something is missing.
- Put repo-specific setup steps, such as codegen, in a `worktree:setup` package script; setup runs it last. Keep everything generic out of the repo.
- Settling the thread, or merging its PR, stops the worktree's servers and simulators and removes the merged worktree with its branch. `scripts/setup-worktree.ts` and `scripts/teardown-worktree.ts` proxy to the shared command for manual use.
