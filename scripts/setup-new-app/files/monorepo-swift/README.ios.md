## Environment

The parent `.env` declares this folder as an env-manager target. Edit local values in the parent `.env.local`, then regenerate from here or the repo root:

```sh
env-manager gen --local
```

This creates `Config/LocalSecrets.xcconfig`. `Config/Base.xcconfig` includes it, and `Config/Info.plist` exposes `API_URL` through `AppEnvironment.apiURL`. Regeneration triggers a rebuild while the launcher is watching.

Native configuration is bundled into the app. Keep credentials in the server target. For physical devices, set `API_URL` to a reachable API host; `127.0.0.1` refers to the device itself.
