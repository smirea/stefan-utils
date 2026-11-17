# Stack

- Runtime: Bun API server
- Language: TypeScript, Svelte
- UI: SvelteKit SPA
- Styling: Svelte CSS with Tailwind CSS v4 available
- Data Fetching: TanStack Query
- Linting: Oxlint + oxfmt
- Git Hooks: Lefthook

# Architecture

- Vite serves the UI in dev and proxies same-origin `/api/*` requests to Bun.
- The Bun server owns API routes and serves the built UI for `bun run start`.
- Shared environment parsing lives in `packages/shared/src/env.ts`.

# Environment

- Environment files are managed by `env-manager`. Keep `.env` tracked with harmless defaults and `.env.local` ignored for local values.
- Edit root `.env.local`, run `bun run env:generate`, and commit the reader exactly as generated. `local:true` avoids AWS calls and automatic Git updates.
- env-manager is a global tool on the developer's machine, never a dependency and never run in CI. A new required setting needs a harmless default in the root `.env`; a secret stays optional in the schema and is required by the server's config in production. Bun loads the tracked defaults for scripts run from the repository root, so CI needs no values file. A job that needs a credential takes it with `${{ secrets.NAME }}` after `env-manager sync github <env> --only NAME`.
- The server reads settings through `apps/server/src/config.ts`, which fails at startup when production lacks a setting.

# Frontend

- Tailwind CSS v4 is wired through `@tailwindcss/vite`.
- Global styles are imported from `apps/ui/src/routes/layout.css`.
- Theme values live in `apps/ui/src/routes/theme.css` and are selected with `html[data-theme]`.
- Prefer Svelte component CSS for styling. Use Tailwind only for small inline layout utilities when that is simpler than adding a class.
- TanStack Query is configured in `apps/ui/src/routes/+layout.svelte`.
