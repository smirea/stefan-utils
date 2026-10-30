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
