SwiftUI app for iOS 17+ and macOS 14+. Requires Bun and Xcode 16 or newer.

```sh
./scripts/run               # build, launch, and relaunch on save
./scripts/run --targets     # list devices and simulators
./scripts/run -t simulator  # or -t mac, -t "iPhone 17"
```

Open `App.xcodeproj` with the shared `App` scheme to debug. Physical devices need signing: pass `--team YOUR_TEAM_ID` or set `SWIFT_RUN_DEVELOPMENT_TEAM`.

`AGENTS.md` covers target selection, simulators, and build logs.
