# **APP_NAME**

SwiftUI app for iOS 17+ and macOS 14+. Requires Bun and Xcode 16 or newer.

```sh
__RUN_COMMAND__                       # select a target; watch by default
__RUN_COMMAND__ --targets             # list targets; * marks the default
__RUN_COMMAND__ -t simulator
__RUN_COMMAND__ -t "iPhone 17"         # name or identifier
__RUN_COMMAND__ -t mac
__RUN_COMMAND__ --no-watch            # build and launch once
```

Edit `Sources/App`; saving rebuilds and relaunches the app. Build errors leave the watcher running. Stop with Ctrl-C. Temporary app state resets after relaunch.

Target selection prefers a connected iOS device, then a booted simulator, available simulator, or My Mac. Set `SWIFT_RUN_DEFAULT_TARGET` to override; `-t` takes precedence. Duplicate simulator names prefer a booted instance, then the newest runtime. Use an identifier for an exact selection. Install simulator runtimes in Xcode's settings.

Physical devices need Xcode pairing, Developer Mode, and an unlocked screen. Configure automatic signing in Xcode, pass `--team YOUR_TEAM_ID`, or set `SWIFT_RUN_DEVELOPMENT_TEAM`.

Open `App.xcodeproj` and select the shared `App` scheme to debug. `swift build` checks the shared code on macOS; use the launcher for bundled resources and simulator builds. Logs live in `DerivedData/device/build.log`, `DerivedData/simulator/build.log`, or `DerivedData/mac/build.log`.

When this folder is part of `monorepo-swift`, environment configuration belongs to the parent `.env` and `.env.local`. Run `env-manager gen --local` from the monorepo or this folder to regenerate `Config/LocalSecrets.xcconfig`. `Config/Base.xcconfig` includes it, and `Config/Info.plist` exposes `API_URL` through `AppEnvironment.apiURL`. These values are bundled into the app; keep server secrets in the server target.
