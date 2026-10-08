# Client and server

Bun API in `server/`, React + Vite + TanStack Router in `__WEB_DIRECTORY__/`, and shared TypeScript contracts in `shared/`. Each app owns its entry points and generated environment reader; shared code should stay independent of app configuration.

```sh
bun install
env-manager gen --local
bun run start                  # web client and API, with watch/reload
bun run start:client
bun run start:server
```

The client proxies `/api/*` to the API and removes the `/api` prefix. For example, `/api/status` reaches the server's `/status`. The local web hostname and ports are configured during scaffolding; inspect the root `.env` for defaults.

## Environment

`env-manager` manages one root `.env` schema with directory targets. The root `.env.local` is the only place to edit local values. Run `env-manager gen --local` after editing either file; it generates `__WEB_DIRECTORY__/.env.local`, `server/.env.local`, and each target's `src/env.ts`. Commands from child directories find the owning root. There are no independent child schemas.

The scaffold runs `env-manager init --local` and `env-manager gen --local`. Persistent `local:true` keeps setup offline and avoids automatic Git commits. See `env-manager --help` for schema types, target selection, and opting into remote storage with `--no-local`.

Keep `.env` and generated TypeScript readers tracked. Ignore all `.env.local` files and generated Swift values. Read server configuration through `server/src/env.ts`; the client's reader is for Vite's Node-side configuration, not browser code. Browser requests use `/api` and must never import server secrets or the environment reader.
