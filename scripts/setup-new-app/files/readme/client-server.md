Bun API, React web client, and shared TypeScript contracts.

- `server/`: Bun API
- `{{WEB_DIRECTORY}}/`: React, Vite, TanStack Router, and Tailwind
- `shared/`: types and contracts used by both

```sh
bun install            # also installs the git hooks
bun run env:generate   # after editing .env or .env.local
bun run start          # web client and API, with reload
```

The web client runs at {{WEB_URL}} and proxies `/api/*` to the API without the `/api` prefix.

Configuration lives in the root `.env` (tracked schema and defaults) and `.env.local` (ignored local values), managed by `env-manager`. Secrets belong to the server; browser settings are public.

`AGENTS.md` and each folder's `AGENTS.md` cover conventions, the environment setup, and agent worktrees.
