SvelteKit UI and Bun API in a Bun workspace.

- `apps/ui/`: SvelteKit SPA with TanStack Query and Tailwind
- `apps/server/`: Bun API that also serves the built UI
- `packages/shared/`: shared code and the generated env reader

```sh
bun install            # also installs the git hooks
bun run env:generate   # after editing .env or .env.local
bun run dev            # UI and API, with reload
```

The UI runs at {{WEB_URL}} and proxies `/api/*` to the API. Configuration lives in the root `.env` (tracked schema and defaults) and `.env.local` (ignored local values), managed by `env-manager`.

`AGENTS.md` lists the stack and conventions.
