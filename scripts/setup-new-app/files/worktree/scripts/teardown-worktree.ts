/**
 * Removes an agent's worktree through the shared `agent-t3-worktree teardown <path | branch> [--force]`. Settling a
 * thread or merging its PR already removes it, so this is for worktrees T3 doesn't track.
 */
const command = `${process.env.HOME}/bin/agent-t3-worktree`;
if (!(await Bun.file(command).exists()))
	throw new Error(`${command} is missing. Install it: bun ~/code/scripts/src/setup.ts`);
process.exit(
	Bun.spawnSync([command, 'teardown', ...process.argv.slice(2)], { stdio: ['inherit', 'inherit', 'inherit'] }).exitCode,
);
