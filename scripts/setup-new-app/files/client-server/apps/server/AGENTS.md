# API server

- Bun routes live in `src/index.ts`, which also serves the built UI from `apps/ui/build/`. Run `bun run server:dev` from the root, or `bun run dev` here.
- Read settings from `config` in `src/config.ts`, which wraps the generated `src/env.ts`. Add any secret production needs to `REQUIRED_IN_PRODUCTION` there so the server fails at startup without it. Declare server-only secrets in the `apps/server` scope of the root `.env`; edit values only in root `.env.local` and run `bun run env:generate`.
- API routes live under `/api/*` (for example `/api/status`). Shared contracts belong in `packages/shared/` (`@repo/shared`), independent of server configuration.
