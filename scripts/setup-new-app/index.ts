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
	// description: 'Setup a new app',
	args: normalizeArgv(process.argv.slice(2)),
	options: {
		name: { type: 'string', short: 'n', description: 'folder and app name' },
		path: { type: 'string', short: 'p', default: codePath },
		type: {
			type: 'string',
			short: 't',
			choices: ['node', 'client-server', 'swift', 'empty', 'svelte'],
			default: 'client-server',
		},
		repo: {
			type: 'string',
			short: 'g',
			description: 'github repo type',
			default: 'public',
			choices: ['public', 'private', 'internal', 'none'],
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

	const clientPort = port ?? getNextLocaliasPort();
	const apiPort = clientPort + 1;
	const clientHost = `${localhostPrefix}.localhost`;
	return {
		apiPort,
		clientHost,
		clientPort,
	};
}

void createScript(async function init() {
	const dependencies = ['@types/bun', 'lodash', 'typescript', 'oxfmt', 'oxlint', 'lefthook', 'kill-port-process'];
	const assetFilePath = (file: string) => path.join(__dirname, 'files', file);

	console.log(style.header('create root'));
	if (fs.existsSync(root)) throw new Error(`root "${root}" already exists`);
	const clientServerNetwork =
		args.type === 'client-server' || args.type === 'svelte' ? getClientServerNetworkConfig() : undefined;
	const hasBunScaffold = args.type !== 'swift' && args.type !== 'empty';
	disk.setRoot(root);
	disk.createDir('.');
	if (args.type === 'swift') {
		disk.copyFile({ from: assetFilePath('swift/.gitignore'), to: '.gitignore' });
	} else if (hasBunScaffold) {
		disk.copyFile({ from: assetFilePath('gitignore'), to: '.gitignore' });
		disk.copyFile({ from: assetFilePath('tsconfig.json'), to: 'tsconfig.json' });
		disk.copyFile({ from: assetFilePath('lefthook.yml'), to: '.lefthook.yml' });
		disk.copyFile({
			from: assetFilePath('vscode.code-workspace'),
			to: args.name + '.code-workspace',
		});
		disk.copyFile({ from: assetFilePath('oxlint.json'), to: 'oxlint.json' });
		disk.copyFile({ from: assetFilePath('.oxfmtrc.json'), to: '.oxfmtrc.json' });
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
			disk.copyFile({ from: assetFilePath('AGENTS.client-server.md'), to: 'AGENTS.md' });
			const network = clientServerNetwork!;
			disk.writeFile(
				'.env',
				network.clientHost
					? textBlock`
						API_PORT=${network.apiPort}
						CLIENT_PORT=${network.clientPort}
						CLIENT_HOST=${network.clientHost}
					`
					: textBlock`
						API_PORT=${network.apiPort}
						CLIENT_PORT=${network.clientPort}
					`,
			);
			if (network.clientHost) {
				const agentsPath = disk.getAbsolutePath('AGENTS.md');
				const agentsContent = fs.readFileSync(agentsPath, 'utf8');
				disk.writeFile(
					'AGENTS.md',
					`${agentsContent}\n- Local dev host: use https://${network.clientHost} via localias instead of localhost:${network.clientPort}. API requests should go through the client-relative /api proxy.\n`,
				);

				console.log(style.header('setup localias'));
				cmd(`localias set ${network.clientHost} ${network.clientPort}`);
			}

			console.log(style.header('create server'));
			disk.copyDir({ from: assetFilePath('server'), to: 'server' });

			console.log(style.header('create shared'));
			disk.copyDir({ from: assetFilePath('shared'), to: 'shared' });

			console.log(style.header('create client'));
			disk.copyDir({ from: assetFilePath('client'), to: 'client' });
			const bunRun =
				'bun run --elide-lines 0 --no-clear-screen --install fallback --env-file .env --env-file .env.local --filter ';
			disk.updateJsonFile('package.json', data => ({
				...data,
				workspaces: ['server', 'client'],
				scripts: {
					...data.scripts,
					'server:dev': bunRun + 'server dev',
					'client:dev': bunRun + 'client dev',
					dev: "concurrently --restart-tries=-1 --restart-after=1000 --names 'server ,client ,' --c 'green,cyan' 'bun run server:dev' 'bun run client:dev'",
				},
			}));
			dependencies.push(
				'kill-port-process',
				'concurrently',

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
			disk.copyFile({ from: assetFilePath('svelte/gitignore'), to: '.gitignore' });
			disk.copyFile({ from: assetFilePath('svelte/lefthook.yml'), to: '.lefthook.yml' });
			disk.copyFile({ from: assetFilePath('svelte/oxlint.json'), to: 'oxlint.json' });
			disk.copyFile({ from: assetFilePath('svelte/.oxfmtrc.json'), to: '.oxfmtrc.json' });
			disk.copyFile({ from: assetFilePath('svelte/tsconfig.json'), to: 'tsconfig.json' });

			const svelteNetwork = clientServerNetwork!;
			const uiUrl = svelteNetwork.clientHost
				? `http://${svelteNetwork.clientHost}`
				: `http://localhost:${svelteNetwork.clientPort}`;
			const serverUrl = `http://127.0.0.1:${svelteNetwork.apiPort}`;
			disk.writeFile(
				'.env',
				textBlock`
						# env-manager: ${args.name} | ${new Date().toISOString()}
						# env-manager ts: packages/shared/src/env.ts

						UI_URL=${uiUrl} # {url}
						SERVER_URL=${serverUrl} # {url}
						UI_PORT=${svelteNetwork.clientPort} # {int}
						PORT=${svelteNetwork.apiPort} # {int}
					`,
			);
			if (svelteNetwork.clientHost) {
				const agentsPath = disk.getAbsolutePath('AGENTS.md');
				const agentsContent = fs.readFileSync(agentsPath, 'utf8');
				disk.writeFile(
					'AGENTS.md',
					`${agentsContent}\n# Local Dev Hosts\n\n- UI: ${svelteNetwork.clientHost} -> ${svelteNetwork.clientPort}\n`,
				);

				console.log(style.header('setup localias'));
				cmd(`localias set ${svelteNetwork.clientHost} ${svelteNetwork.clientPort}`);
			}

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
					'@types/node': '^26.1.1',
					'@types/bun': '^1.3.14',
					concurrently: '^10.0.3',
					lefthook: '^2.1.10',
					oxfmt: '^0.59.0',
					oxlint: '^1.74.0',
					// svelte-check still needs the TypeScript 6 programmatic API.
					typescript: '^6.0.3',
				},
			}));
			break;
		case 'swift':
			disk.copyFile({ from: assetFilePath('swift/AGENTS.md'), to: 'AGENTS.md' });
			disk.createDir('Sources/App');
			disk.writeFile(
				'Package.swift',
				textBlock`
					// swift-tools-version: 6.0
					import PackageDescription

					let package = Package(
						name: "${args.name}",
						platforms: [
							.iOS(.v17),
							.macOS(.v14),
						],
						products: [
							.executable(name: "${args.name}", targets: ["App"]),
						],
						targets: [
							.executableTarget(name: "App"),
						]
					)
				`,
			);
			disk.writeFile(
				'Sources/App/main.swift',
				textBlock`
					@main
					struct App {
						static func main() {
							print("Hello, ${args.name}!")
						}
					}
				`,
			);
			disk.writeFile(
				'README.md',
				textBlock`
					# ${args.name}

					Lean Swift starter.

					## Commands

					\`\`\`sh
					swift build
					swift run
					\`\`\`
				`,
			);
			break;
		default:
			throw new Error(`Invalid type: ${args.type}`);
	}

	if (args.type === 'svelte') {
		cmd('bun install --ignore-scripts');
	} else if (hasBunScaffold) {
		cmd('bun add ' + Array.from(new Set(dependencies)).sort().join(' '));
	}

	cmd('git init');
	if (args.type === 'svelte') {
		cmd('bun run prepare');
		cmd('bun run lint');
	}
	cmd('git add -A');
	cmd('git commit -m "initial setup with stefan-utils/scripts/setup-new-app"');
	if (args.repo !== 'none') {
		cmd(`gh repo create ${shellQuote(args.name)} --${args.repo} --source=. --remote=origin`);
		cmd('git push -u origin master');
		const inviteAiCommand = getInviteAiCommand(args.name);
		if (inviteAiCommand) cmd(inviteAiCommand);
	}
});
