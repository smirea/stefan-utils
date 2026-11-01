/**
 * Prepares a linked worktree for an agent through the shared `agent-t3-worktree setup`, which T3 Code already runs
 * when it creates one. Repo-specific steps belong in a `worktree:setup` package script.
 */
const command = `${process.env.HOME}/bin/agent-t3-worktree`;
if (!(await Bun.file(command).exists()))
	throw new Error(`${command} is missing. Install it: bun ~/code/scripts/src/setup.ts`);
process.exit(
	Bun.spawnSync([command, 'setup', ...process.argv.slice(2)], { stdio: ['inherit', 'inherit', 'inherit'] }).exitCode,
);
