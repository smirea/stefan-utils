# Stack

- Language: Swift
- Package Manager: Swift Package Manager
- Minimum targets: iOS 17 and macOS 14
- Keep dependencies rare and intentional

# Development

- Run `./scripts/open` to build, install, and launch the app on an iPhone simulator. It opens Device Hub on Xcode 27 or Simulator.app on earlier Xcode versions.
- Pass a device name or UDID to switch: `./scripts/open "iPhone 17"`. The selection is remembered locally in `DerivedData/simulator-udid`; use that UDID for subsequent `xcrun simctl` commands.
- The launcher selects an available iPhone automatically, or creates one using an installed iOS runtime. If no runtime is installed, add one in Xcode's settings.
- Edit SwiftUI code and resources in `Sources/App`; Xcode picks up new files automatically. Open `App.xcodeproj` and use the shared `App` scheme for debugging.
- Rerun `./scripts/open` after changes. Build output is in `DerivedData/simulator-build.log`. Use `xcrun simctl io <UDID> screenshot /tmp/app.png` to inspect the screen.
- `swift build` checks the shared code on macOS. Use the Xcode project for simulator builds and bundled resources; `swift run` launches the macOS executable.
