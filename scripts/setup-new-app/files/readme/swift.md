SwiftUI app for iOS 27+ and macOS 27+. Requires Bun and Xcode 27 or newer.

```sh
./scripts/run               # build, launch, and relaunch on save
./scripts/run --targets     # list devices and simulators
./scripts/run -t simulator  # or -t mac, -t "iPhone 17"
```

Open `App.xcodeproj` with the shared `App` scheme to debug. Physical devices need signing: pass `--team YOUR_TEAM_ID` or set `SWIFT_RUN_DEVELOPMENT_TEAM`.

`AGENTS.md` covers target selection, simulators, and build logs.
