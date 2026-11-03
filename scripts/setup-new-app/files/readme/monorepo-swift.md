## iOS app

`app-ios/` holds the SwiftUI app and its launcher. Arguments pass through to `app-ios/scripts/run`:

```sh
bun run start:ios --targets
bun run start:ios -t simulator
```

The app reads `API_URL` from the root env as `AppEnvironment.apiURL`. On a physical device, set it to a reachable host; `127.0.0.1` is the device itself. `app-ios/README.md` covers targets and signing.
