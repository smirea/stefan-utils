#!/usr/bin/env bun --preserve-symlinks

import fs from 'fs';
import path from 'path';
import { env } from 'node:process';
import { parseArgv } from 'src/parseArgv';
import { cmd, createScript, disk, style } from 'src/createScript';
import { textBlock } from 'src/textBlock';

if (!env.HOME) throw new Error('HOME is not set');

const codePath = path.join(env.HOME, 'code');
const defaultLocalhostPrefixArg = '__default_localhost_prefix__';

function normalizeArgv(argv: string[]) {
	const normalized = [];
	for (let i = 0; i < argv.length; i++) {
		const value = argv[i]!;
		normalized.push(value);
		if (value === '--localhost' && (!argv[i + 1] || argv[i + 1]!.startsWith('-'))) {
			normalized.push(defaultLocalhostPrefixArg);
		}
	}
	return normalized;
}

const { args } = parseArgv({
	description: 'Scaffold an app from the shared templates',
	args: normalizeArgv(process.argv.slice(2)),
	options: {
		name: { type: 'string', short: 'n', description: 'folder and app name' },
		path: { type: 'string', short: 'p', default: codePath },
		type: {
			type: 'string',
			short: 't',
			choices: ['node', 'client-server', 'monorepo-swift', 'swift', 'empty', 'svelte'],
			default: 'client-server',
		},
		repo: {
			type: 'string',
			short: 'g',
			description: 'github repo type',
			default: 'public',
			choices: ['public', 'private', 'internal', 'none'],
		},
		'overwrite-existing-repo': {
			type: 'boolean',
			default: false,
			description: 'replace the local app folder and force-push fresh history to an existing GitHub repo',
		},
		localhost: {
			type: 'string',
			optional: true,
			description:
				'localias host prefix for client-server apps, defaults to app name; generated host uses .localhost; use "none" to disable',
		},
		port: {
			type: 'string',
			optional: true,
			description: 'client port for client-server apps, API uses the next port',
		},
	},
});

const root = path.join(args.path, args.name);
const defaultClientPort = 3000;
const assetFilePath = (file: string) => path.join(__dirname, 'files', file);
const hasClientServer = args.type === 'client-server' || args.type === 'monorepo-swift';

function shellQuote(value: string) {
	return "'" + value.replaceAll("'", "'\\''") + "'";
}

function hasPathCommand(command: string) {
	return (env.PATH ?? '').split(path.delimiter).some(dir => fs.existsSync(path.join(dir, command)));
}

function getInviteAiCommand(repo: string) {
	if (hasPathCommand('git-invite-ai-to-repos')) {
		return `git-invite-ai-to-repos --repos ${shellQuote(repo)}`;
	}

	const scriptPath = path.join(codePath, 'scripts', 'src', 'git-invite-ai-to-repos.ts');
	if (fs.existsSync(scriptPath)) {
		return `bun ${shellQuote(scriptPath)} --repos ${shellQuote(repo)}`;
	}
}

function parsePort(port: string | undefined) {
	if (!port) return;
	const parsedPort = Number(port);
	if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65534) {
		throw new Error('--port must be an integer from 1 to 65534');
	}
	return parsedPort;
}

function getNextLocaliasPort() {
	const listOutput = cmd('localias list', { stdio: 'pipe', encoding: 'utf8' }).toString();
	const ports = Array.from(listOutput.matchAll(/->\s*(\d+)/g), match => Number(match[1]));
	const maxPort = Math.max(5990, ...ports.filter(Number.isFinite));
	return Math.floor(maxPort / 10) * 10 + 10;
}

function getLocalhostPrefix(value: string) {
	const prefix = value.trim().toLowerCase();
	if (prefix === 'none') return false;
	if (prefix.endsWith('.local')) {
		throw new Error('mDNS is shit, use .localhost bro trust me');
	}
	if (!/^[a-z0-9-]+$/.test(prefix)) {
		throw new Error('--localhost must contain only letters, numbers, and dashes');
	}
	return prefix;
}

function getClientServerNetworkConfig() {
	const port = parsePort(args.port);
	const localhost = args.localhost;
	const localhostPrefix = getLocalhostPrefix(
		!localhost || localhost === defaultLocalhostPrefixArg ? args.name : localhost,
	);
	if (localhostPrefix === false) {
		const clientPort = port ?? defaultClientPort;
		const apiPort = clientPort + 1;
		return {
			apiPort,
			clientPort,
		};
	}

	const clientHost = `${localhostPrefix}.localhost`;
	let clientPort = port;
	if (args['overwrite-existing-repo']) {
		const listOutput = cmd('localias list', { stdio: 'pipe', encoding: 'utf8' }).toString();
		const mapping = listOutput.split('\n').map(line => line.trim().split(/\s*->\s*/));
		const existingPort = parsePort(mapping.find(([host]) => host === clientHost)?.[1]);
		if (!existingPort) throw new Error(`No existing localias mapping for ${clientHost}`);
		if (port && port !== existingPort)
			throw new Error(`Existing localias mapping for ${clientHost} uses port ${existingPort}`);
		clientPort = existingPort;
	}
	clientPort ??= getNextLocaliasPort();
	const apiPort = clientPort + 1;
	return {
		apiPort,
		clientHost,
		clientPort,
	};
}

function scaffoldSwift(directory = '.') {
	const target = (file: string) => path.join(directory, file);
	const runner = directory === '.' ? 'scripts/run' : 'run';
	const hasConfig = directory !== '.';
	disk.createDir(directory);
	for (const file of ['.gitignore', 'AGENTS.md', 'README.md', 'Package.swift']) {
		const template = fs.readFileSync(assetFilePath('swift/' + file), 'utf8');
		disk.writeFile(
			target(file),
			template
				.replaceAll('__APP_NAME__', () => args.name)
				.replaceAll('__PACKAGE_NAME__', () => JSON.stringify(args.name))
				.replaceAll('__RUN_COMMAND__', './' + runner),
		);
	}
	for (const folder of ['Sources', 'App.xcodeproj']) {
		disk.copyDir({ from: assetFilePath('swift/' + folder), to: target(folder) });
	}
	disk.createDir(target(path.dirname(runner)));
	disk.copyFile({ from: assetFilePath('swift/scripts/run'), to: target(runner) });
	fs.chmodSync(disk.getAbsolutePath(target(runner)), 0o755);
	const projectFile = target('App.xcodeproj/project.pbxproj');
	const template = fs.readFileSync(disk.getAbsolutePath(projectFile), 'utf8');
	const bundleName = args.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
	disk.writeFile(
		projectFile,
		template
			.replaceAll('__APP_NAME__', () => JSON.stringify(args.name))
			.replaceAll('__BUNDLE_ID__', `com.stefan.${bundleName}`)
			.replaceAll('__CONFIG_GROUP_CHILD__', hasConfig ? 'A00000000000000000000016, ' : '')
			.replaceAll(
				'__CONFIG_FILE_REFERENCE__',
				hasConfig
					? 'A00000000000000000000016 = { isa = PBXFileReference; lastKnownFileType = text.xcconfig; path = Config/Base.xcconfig; sourceTree = "<group>"; };'
					: '',
			)
			.replaceAll('__CONFIG_REFERENCE__', hasConfig ? 'baseConfigurationReference = A00000000000000000000016;' : '')
			.replaceAll('__CONFIG_BUILD_SETTINGS__', hasConfig ? 'INFOPLIST_FILE = Config/Info.plist;' : ''),
	);
	if (directory !== '.') {
		disk.copyDir({ from: assetFilePath('monorepo-swift/Config'), to: target('Config') });
		disk.copyFile({
			from: assetFilePath('monorepo-swift/Environment.swift'),
			to: target('Sources/App/Environment.swift'),
		});
	}
}

void createScript(async function init() {
	const dependencies = [
		'@types/bun',
		'es-toolkit',
		'lodash',
		'typescript',
		'oxfmt',
		'oxlint',
		'lefthook',
		'kill-port-process',
	];

	console.log(style.header('create root'));
	const overwriteExistingRepo = args['overwrite-existing-repo'];
	if (overwriteExistingRepo && args.repo === 'none') {
		throw new Error('--overwrite-existing-repo cannot be used with --repo none');
	}
	if (overwriteExistingRepo && (args.name === '.' || args.name === '..' || path.basename(args.name) !== args.name)) {
		throw new Error('--name must be a folder name when using --overwrite-existing-repo');
	}
	if (fs.existsSync(root) && !overwriteExistingRepo) throw new Error(`root "${root}" already exists`);
	const existingRepo: { sshUrl: string; defaultBranchRef: { name: string } | null } | undefined = overwriteExistingRepo
		? JSON.parse(
				cmd(`gh repo view ${shellQuote(args.name)} --json sshUrl,defaultBranchRef`, {
					stdio: 'pipe',
					encoding: 'utf8',
				}).toString(),
			)
		: undefined;
	const clientServerNetwork = hasClientServer || args.type === 'svelte' ? getClientServerNetworkConfig() : undefined;
	const hasBunScaffold = args.type !== 'swift' && args.type !== 'empty';
	if (overwriteExistingRepo) fs.rmSync(root, { recursive: true, force: true });
	disk.setRoot(root);
	disk.createDir('.');
	if (args.type === 'swift') {
		disk.copyFile({ from: assetFilePath('swift/vscode.code-workspace'), to: args.name + '.code-workspace' });
	} else if (hasBunScaffold) {
		const prefix = args.type === 'svelte' ? 'svelte/' : '';
		for (const file of [
			'gitignore',
			'tsconfig.json',
			'lefthook.yml',
			'oxlint.json',
			'.oxfmtrc.json',
			'vscode.code-workspace',
		]) {
			const destination =
				file === 'gitignore' ? '.gitignore' : file === 'vscode.code-workspace' ? args.name + '.code-workspace' : file;
			disk.copyFile({ from: assetFilePath(prefix + file), to: destination });
		}
	}
	cmd.setCWD(root);

	if (hasBunScaffold) {
		disk.writeJsonFile('package.json', {
			name: args.name,
			private: true,
			scripts: {
				lint: 'oxlint --fix && oxfmt',
				test: 'bun test',
			},
		});
	}

	switch (args.type) {
		case 'empty':
			disk.writeFile('README.md', 'the start of something exciting');
			break;
		case 'node':
			disk.copyFile({ from: assetFilePath('AGENTS.node.md'), to: 'AGENTS.md' });
			const src = path.join(root, 'src');
			disk.createDir(src);
			disk.writeFile('src/index.ts', `console.log('Hello, ${args.name}!');`);
			disk.updateJsonFile('package.json', data => ({
				...data,
				scripts: {
					...data.scripts,
					dev: 'bun --watch src/index.ts',
				},
			}));
			break;
		case 'client-server':
		case 'monorepo-swift':
			const network = clientServerNetwork!;
			const hasIos = args.type === 'monorepo-swift';
			disk.copyFile({ from: assetFilePath('AGENTS.client-server.md'), to: 'AGENTS.md' });
			for (const directory of ['server', 'shared', 'client']) {
				disk.copyDir({ from: assetFilePath(directory), to: directory });
			}
			disk.writeFile(
				'.env',
				textBlock`
					# env-manager: ${args.name}
					# env-manager local:true
					# env-manager target: client format=ts
					# env-manager target: server format=ts
					${hasIos ? '# env-manager target: app-ios format=swift' : ''}

					# env-manager targets: ${hasIos ? 'client,app-ios' : 'client'}
					API_URL=http://127.0.0.1:${network.apiPort} # {url}

					# env-manager targets: client
					CLIENT_PORT=${network.clientPort} # {int:min(1),max(65535)}
					CLIENT_HOST=${network.clientHost ?? ''} # {optional string}

					# env-manager targets: server
					API_PORT=${network.apiPort} # {int:min(1),max(65535)}
				`,
			);
			disk.updateJsonFile('package.json', data => ({
				...data,
				workspaces: ['server', 'client'],
				scripts: {
					...data.scripts,
					start: 'concurrently --raw -k -s first "bun run start:server" "bun run start:client"',
					'start:client': 'bun run --cwd client start',
					'start:server': 'bun run --cwd server start',
					...(hasIos ? { 'start:ios': 'bun app-ios/run' } : {}),
					dev: 'bun run start',
					'client:dev': 'bun run start:client',
					'server:dev': 'bun run start:server',
					'env:generate': 'env-manager gen --local',
				},
			}));
			disk.copyFile({ from: assetFilePath('README.client-server.md'), to: 'README.md' });
			if (hasIos) {
				scaffoldSwift('app-ios');
				for (const file of ['README.md', 'AGENTS.md']) {
					const content = fs.readFileSync(disk.getAbsolutePath(file), 'utf8');
					disk.writeFile(file, content + fs.readFileSync(assetFilePath('monorepo-swift/' + file), 'utf8'));
				}
			}
			dependencies.push(
				'concurrently',
				'zod',
				'react',
				'react-dom',
				'vite',
				'@types/react',
				'@types/react-dom',
				'@vitejs/plugin-react',
				'@tanstack/react-router',
				'@tanstack/router-plugin',
				'@phosphor-icons/react',
				'@tailwindcss/vite',
				'tailwindcss',
			);
			break;
		case 'svelte':
			disk.copyFile({ from: assetFilePath('svelte/AGENTS.md'), to: 'AGENTS.md' });

			const svelteNetwork = clientServerNetwork!;
			const uiUrl = svelteNetwork.clientHost
				? `http://${svelteNetwork.clientHost}`
				: `http://localhost:${svelteNetwork.clientPort}`;
			const serverUrl = `http://127.0.0.1:${svelteNetwork.apiPort}`;
			disk.writeFile(
				'.env',
				textBlock`
						# env-manager: ${args.name} | ${new Date().toISOString()}
						# env-manager local:true
						# env-manager generate: packages/shared/src/env.ts

						UI_URL=${uiUrl} # {url}
						SERVER_URL=${serverUrl} # {url}
						UI_PORT=${svelteNetwork.clientPort} # {int}
						PORT=${svelteNetwork.apiPort} # {int}
					`,
			);

			console.log(style.header('create server'));
			disk.copyDir({ from: assetFilePath('svelte/apps/server'), to: 'apps/server' });

			console.log(style.header('create ui'));
			disk.copyDir({ from: assetFilePath('svelte/apps/ui'), to: 'apps/ui' });

			console.log(style.header('create shared'));
			disk.copyDir({ from: assetFilePath('svelte/packages/shared'), to: 'packages/shared' });
			disk.updateJsonFile('package.json', data => ({
				...data,
				type: 'module',
				workspaces: ['apps/*', 'packages/*'],
				scripts: {
					build: 'bun --filter @repo/ui build && bun --filter @repo/server typecheck',
					dev: 'concurrently --raw -k -s first "bun --filter @repo/server dev" "bun --filter @repo/ui dev --host 127.0.0.1"',
					format: 'oxfmt --write .',
					lint: 'oxlint --fix && oxfmt --write .',
					prepare: 'lefthook install',
					'server:dev': 'bun --filter @repo/server dev',
					'server:start': 'bun --filter @repo/server start',
					'server:typecheck': 'bun --filter @repo/server typecheck',
					start: 'bun --filter @repo/server start',
					test: 'bun test --pass-with-no-tests',
					typecheck: 'bun --filter @repo/ui check && bun --filter @repo/server typecheck',
					'ui:build': 'bun --filter @repo/ui build',
					'ui:check': 'bun --filter @repo/ui check',
					'ui:dev': 'bun --filter @repo/ui dev --host 127.0.0.1',
					'ui:preview': 'bun --filter @repo/ui preview',
				},
				devDependencies: {
					'@typescript/native': 'npm:typescript@^7.0.2',
					'@types/node': '^26.2.0',
					'@types/bun': '^1.3.14',
					concurrently: '^10.0.5',
					lefthook: '^2.1.10',
					oxfmt: '^0.64.0',
					oxlint: '^1.79.0',
					// svelte-check still needs the TypeScript 6 programmatic API.
					typescript: '^6.0.3',
				},
			}));
			break;
		case 'swift':
			scaffoldSwift();
			break;
		default:
			throw new Error(`Invalid type: ${args.type}`);
	}

	if (clientServerNetwork?.clientHost) {
		const { clientHost, clientPort } = clientServerNetwork;
		const agentsContent = fs.readFileSync(disk.getAbsolutePath('AGENTS.md'), 'utf8');
		disk.writeFile(
			'AGENTS.md',
			`${agentsContent}\n- Local web host: ${clientHost} -> ${clientPort}; browser API calls use the /api proxy.\n`,
		);
		if (!overwriteExistingRepo) cmd(`localias set ${clientHost} ${clientPort}`);
	}
	if (hasClientServer || args.type === 'svelte') {
		cmd('env-manager init --local');
		cmd('env-manager gen --local');
	}

	if (args.type === 'svelte') {
		cmd('bun install --ignore-scripts');
	} else if (hasBunScaffold) {
		cmd('bun add ' + Array.from(new Set(dependencies)).sort().join(' '));
	}

	const branch = existingRepo?.defaultBranchRef?.name ?? 'master';
	cmd(`git init -b ${shellQuote(branch)}`);
	if (args.type === 'svelte') {
		cmd('bun run prepare');
		cmd('bun run lint');
	}
	cmd('git add -A');
	cmd('git commit -m "initial setup with stefan-utils/scripts/setup-new-app"');
	if (args.repo !== 'none') {
		if (existingRepo) {
			cmd(`git remote add origin ${shellQuote(existingRepo.sshUrl)}`);
		} else {
			cmd(`gh repo create ${shellQuote(args.name)} --${args.repo} --source=. --remote=origin`);
		}
		cmd(`git push ${overwriteExistingRepo ? '--force ' : ''}-u origin ${shellQuote(branch)}`);
		if (!overwriteExistingRepo) {
			const inviteAiCommand = getInviteAiCommand(args.name);
			if (inviteAiCommand) cmd(inviteAiCommand);
		}
	}
});
