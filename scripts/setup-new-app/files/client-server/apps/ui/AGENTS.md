# Web UI

- SvelteKit 5 SPA (`@sveltejs/adapter-static`) with TanStack Query configured in `src/routes/+layout.svelte`.
- Tailwind CSS v4 is wired through `@tailwindcss/vite`. Global styles live in `src/routes/layout.css` and theme tokens in `src/routes/theme.css` (`html[data-theme]`). Prefer Svelte component CSS for styling; use Tailwind for small inline layout utilities.
- Run `bun run ui:dev` from the root, or `bun run dev` here. Scripts pass `--env-file=.env.local` explicitly; `env.ts` is only for Node-side Vite configuration and must not be imported by browser code.
- Browser API requests use same-origin `/api/*`; Vite proxies them directly to `API_URL`.
- Edit schema and values at the repo root and run `bun run env:generate` to update child outputs; do not maintain a child `.env` schema.
