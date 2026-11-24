# Native app

- SwiftUI lives in `app-ios/`; read its `AGENTS.md` for native development. The root `start:ios` script delegates to `app-ios/scripts/run` and forwards launcher arguments. Agents run `bun run start:ios -t "$(agent-simulator udid)" --headless` on the worktree's own simulator.
- The SvelteKit web UI lives in `apps/ui/` and the Bun API in `apps/server/`. Root `bun run dev` runs both together; `ui:dev` and `server:dev` run each individually; iOS runs separately.
- The root env-manager schema declares each directory target with explicit output paths: TypeScript values at `.env.local` with readers at `apps/ui/env.ts` and `apps/server/src/env.ts`, and native values at `app-ios/Config/LocalSecrets.xcconfig` with the committed check script `app-ios/Config/check-env.sh`. Regenerate outputs with `bun run env:generate`; never hand-edit `app-ios/Config/LocalSecrets.xcconfig`.
- `Config/Base.xcconfig` and `Config/Info.plist` bridge `API_URL` into `AppEnvironment.apiURL`. Native settings are bundled; server credentials belong exclusively to the `apps/server` target.
- The pre-commit hook runs `swift test` in `app-ios/` when a Swift file is staged and `app-ios/Tests` exists.
