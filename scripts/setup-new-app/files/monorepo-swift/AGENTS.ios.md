# Environment

- When nested in `monorepo-swift`, this directory is an env-manager target of the root `.env`. Edit local values only in the root `.env.local` and run `env-manager gen --local` from either directory.
- Generated `Config/LocalSecrets.xcconfig` is ignored. `Config/Base.xcconfig` includes it when it exists, for Debug and Release; `Config/Info.plist` makes `API_URL` available to `AppEnvironment.apiURL`.
- `Config/check-env.sh` is generated and committed. It runs as the App target's first build phase and fails the build, naming each setting, when a required one is missing or malformed, so a broken configuration never reaches a simulator or TestFlight. CI builds with no xcconfig at all: xcodebuild resolves `$(API_URL)` from the workflow's `env:`.
- Saving generated configuration also triggers the launcher watcher. Native settings are bundled into the app, so keep server credentials out of the Swift target.
