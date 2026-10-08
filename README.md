# stefan-utils

Shared Bun utilities and app scaffolding templates. Run `./scripts/setup-new-app/index.ts --help` for options (or the installed `setup-new-app` wrapper).

```sh
setup-new-app --name my-app --type monorepo-swift
setup-new-app --name my-app --type monorepo-swift --overwrite-existing-repo
setup-new-app --name local-app --type client-server --repo none --localhost none
```

Types: `node`, `client-server`, `monorepo-swift`, `swift`, `empty`, and `svelte`. `monorepo-swift` extends the React client/Bun server scaffold with a SwiftUI app in `app-ios/`. Root `start` runs client and server; `start:client`, `start:server`, and `start:ios` run each individually. Swift launcher arguments pass through, for example `bun run start:ios -t simulator`.

Client/server scaffolds use env-manager's single root `.env` schema with directory targets. Setup runs `env-manager init --local` and `env-manager gen --local`, generating nested values files, TypeScript readers, and the native xcconfig. Edit root `.env.local` and regenerate; generated child values are outputs. See each generated app's README and AGENTS files, plus `env-manager --help`, for details.

Overwrite mode deletes the entire local app folder, including ignored files and local values. It rebuilds current templates, skips GitHub repo creation and collaborator invitations, and force-pushes a fresh initial commit to the existing repo's default branch. Existing localias mappings are reused; missing mappings are created using `--port` or the next available port block. An explicit port must match an existing mapping. It requires an existing GitHub repo. `--repo none` cannot be combined with overwrite mode.

Templates live in `scripts/setup-new-app/files/`; generation lives in `scripts/setup-new-app/index.ts`. Client/server and monorepo Swift share the same web templates. Standalone and nested Swift share one initializer, source, Xcode project, launcher, and docs. Svelte retains its own framework templates; root config copying and localias setup are shared.
