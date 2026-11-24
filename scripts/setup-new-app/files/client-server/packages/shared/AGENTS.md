# Shared contracts

- Keep shared types and domain helpers here. Both apps import them from `@repo/shared`.
- Keep this package independent of app-specific environment readers, server-only code, and browser frameworks. Each app owns its env-manager target.
