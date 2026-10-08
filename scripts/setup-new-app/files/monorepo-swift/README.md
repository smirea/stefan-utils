## iOS app

`app-ios/` contains the SwiftUI app, Xcode project, Swift package, and executable `scripts/run` launcher. It uses the same Swift template as the standalone scaffold.

```sh
bun run start:ios --targets
bun run start:ios -t simulator
bun run start:ios -t mac --no-watch
```

`app-web/` contains the web client. `start:client` runs it; `start` runs the web client and API; launch iOS separately with `start:ios`. Arguments pass through to `app-ios/scripts/run`. See `app-ios/README.md` and `app-ios/AGENTS.md` for native development and signing.

The root `.env` declares `app-web format=ts path=.env.local generate=src/env.ts`, the server target with the same output paths, and `app-ios format=swift path=Config/LocalSecrets.xcconfig`. Paths are relative to each target directory. `env-manager gen --local` projects its selected values into `app-ios/Config/LocalSecrets.xcconfig`. `API_URL` is shared by Vite's proxy and the native app; read it in Swift with `AppEnvironment.apiURL`. Configure a reachable API host in the root `.env.local` for physical devices: `127.0.0.1` points at the device itself. Regenerate and rebuild after changing values. Client and native configuration ships to users, so keep credentials scoped to the server.
