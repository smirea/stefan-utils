# Stack

- Tooling: Bun + TypeScript
- Server: Bun.serve API (`apps/server/`)
- UI: SvelteKit SPA (`apps/ui/`) with Svelte 5, TanStack Query, and Tailwind CSS v4
- Shared: `@repo/shared` (`packages/shared/`)
- Linting and Hooks: Oxlint + Lefthook

# Structure and commands

- `apps/ui/` owns Svelte routes, styles, and Vite. `apps/server/` owns the Bun API and serves the built UI. `packages/shared/` holds environment-independent types and helpers. Read each folder's `AGENTS.md` before changing it.
- `bun run dev` runs UI and API together; `ui:dev` and `server:dev` run them separately. `bun run start` runs the API serving the built UI. Browser API calls use the same-origin `/api/*` proxy.
- A `monorepo-swift` scaffold also has `app-ios/` with native instructions and its own launcher. See that folder's docs.

# Environment

- Use env-manager's root `.env` schema and named directory targets. Edit values only in the root `.env.local`, then run `bun run env:generate`. Child values and readers are generated projections, not independent configs; commit readers exactly as generated.
- env-manager is a global tool on the developer's machine, never a dependency and never run in CI. A new required setting needs a harmless default in the root `.env`; a secret stays optional in the schema and is required by the server's config in production. If CI fails naming a variable, add its default to the workflow's `env:`, or pass a secret with `${{ secrets.NAME }}` after `env-manager sync github <env> --only NAME`.
- `local:true` keeps generation offline and disables automatic Git updates. Use `env-manager --help` for schema types, target selection, and remote storage.
- Read application settings through generated readers (`apps/ui/env.ts` and `apps/server/src/env.ts`). The server reads them through `apps/server/src/config.ts`, which fails at startup when production lacks a setting. The UI's reader runs only in Vite's Node context; browser code must not import it.
- Keep schema and readers tracked, values files and `.env.override` ignored, and secrets scoped to the server target. Native and browser settings are public.

# Agent worktrees

- T3 Code runs the shared `agent-t3-worktree setup` when it creates a worktree: it installs, gives the worktree its own 10-port block in the git-ignored `.env.override` (main ports plus `10000 + (n - 1) * 1000`), and runs `env-manager gen --local`. Don't run setup by hand. The pre-commit hook and session start run `agent-t3-worktree check --heal`, which reruns setup when something is missing.
- Put repo-specific setup steps, such as codegen, in a `worktree:setup` package script; setup runs it last. Keep everything generic out of the repo.
- Settling the thread, or merging its PR, stops the worktree's servers and simulators and removes the merged worktree with its branch.
