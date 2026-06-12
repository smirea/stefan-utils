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

- Environment files are managed by `env-manager`.
- Keep `.env` tracked with harmless/default values and `.env.local` ignored for local values.

# Frontend

- Tailwind CSS v4 is wired through `@tailwindcss/vite`.
- Global styles are imported from `apps/ui/src/routes/layout.css`.
- Theme values live in `apps/ui/src/routes/theme.css` and are selected with `html[data-theme]`.
- Prefer Svelte component CSS for styling. Use Tailwind only for small inline layout utilities when that is simpler than adding a class.
- TanStack Query is configured in `apps/ui/src/routes/+layout.svelte`.
