# Stack

- Tooling: Bun + TypeScript
- Server: Bun.serve API
- Client: React + Vite + TanStack Router
- UI: Tailwind CSS (enabled in client/src/index.css)
- Linting and Hooks: Oxlint + Lefthook

# Structure and commands

- `client/` owns React, routes, styles, and Vite. `server/` owns the Bun API. `shared/` holds environment-independent types and contracts. Read each folder's `AGENTS.md` before changing it.
- `bun run start` runs client and server; `start:client` and `start:server` run them separately. Browser API calls use the client-relative `/api` proxy.
- A `monorepo-swift` scaffold also has `app-ios/` with native instructions and its own launcher. See that folder's docs.

# Environment

- Use env-manager's root `.env` schema and named directory targets. Edit values only in the root `.env.local`, then run `env-manager gen --local`. Child values and readers are generated projections, not independent configs.
- `local:true` keeps generation offline and disables automatic Git updates. Use `env-manager --help` for target selection, schema types, and remote storage.
- Read application settings through generated `src/env.ts` in each TypeScript target. The client's reader runs only in Vite's Node context; browser code must not import it.
- Keep schema and readers tracked, values files ignored, and secrets scoped to the server target. Native and browser settings are public.
