# Scaffolding

- Keep CLI orchestration in `scripts/setup-new-app/index.ts` and reusable generated files in `scripts/setup-new-app/files/`.
- `client-server` and `monorepo-swift` share web templates. `scaffoldSwift` initializes standalone Swift or nested `app-ios/`; update the shared Swift assets instead of copying them into a second template.
- Use env-manager for environment generation. The root `.env` declares schemas and directory targets; root `.env.local` supplies values, and child values/readers are generated. Scaffolding runs `init --local` and `gen --local` without AWS or automatic Git updates.
- Keep project-level docs high level and put component development details in nested AGENTS and README files. Never put secret values in templates, schemas, generated readers, or commits.
- Overwrite mode deliberately deletes the entire local folder. Reuse external GitHub and existing localias setup, create a localias mapping only when missing, then force-push the new default-branch history; preserve no local files.
- Validate generated apps as well as this repo. Check CLI help, env-manager config and target outputs, web startup/proxying, and the shared Swift launcher/Xcode configuration when those change.
