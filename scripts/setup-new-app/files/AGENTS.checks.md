# Checks and tests

- `bun run lint`, `bun run typecheck`, and `bun run test` each finish in seconds. The pre-commit hook runs all three in parallel: lint and format fixes on the staged files, then the type check and the whole test suite. CI runs them again with `build`, one parallel job each. `.github/CI.md` has the details.
- Read the `tests` skill before adding, changing, or fixing a test. Tests are `*.test.ts` files beside the code they cover and run in-process under `bun test`, with no browser, server, or network. Logic worth testing lives in a plain module that imports no framework, so a test can call it directly.
- A new check is a package script first. Add it to the hook only if it finishes in seconds, and to CI as its own entry in the `task` matrix.
