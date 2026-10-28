# Decisions

- Read [`docs/decisions/README.md`](docs/decisions/README.md) and the area files your work touches before starting.
- Whenever a new concept, goal, paradigm, or high-level system decision comes up, record it in the matching area file under `docs/decisions/` in the same PR as the work. Add a new file and list it in the index when no area fits.

# Workflow

Full rules in [`docs/decisions/workflow.md`](docs/decisions/workflow.md).

- One PR per thread, never stacked. Rebase only when GitHub reports a real conflict.
- {{?worktree}}In a fresh git worktree, run `bun scripts/setup-worktree.ts [branch]` first. T3 Code threads already ran it, so check for `node_modules` and `.env.override` first, and never pass `[branch]` there: T3 owns the branch name. `bun scripts/teardown-worktree.ts <worktree | branch>` removes it from the main checkout once the PR is merged.
- After opening a PR, run `bun scripts/pr-ship.ts [--merge]` in the foreground until it exits 0. Its exit code names the next step.
- Never skip git hooks. Fix the failure instead.
- Run only the relevant tests locally; CI runs the full suite.
- Development speed is a goal. When friction shows up (a manual step, a prompt you click through, a slow command, a flaky tool), fix it in the same thread if it is small; otherwise open a GitHub issue with what you found and a proposed fix, and say so in your reply.
- Set up for the default path. Dev and test environments start the way people use the app, with every permission granted and realistic data seeded; an agent testing a denied or empty state revokes or clears it itself.
