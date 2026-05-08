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
			choices: ['node', 'client-server'],
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
				'localias host prefix for client-server apps, defaults to app name; generated domains use .localhost; use "none" to disable',
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
			viteApiUrl: `http://localhost:${apiPort}`,
		};
	}

	const clientPort = port ?? getNextLocaliasPort();
	const apiPort = clientPort + 1;
	const clientHost = `${localhostPrefix}.localhost`;
	const apiHost = `${localhostPrefix}-api.localhost`;
	return {
		apiHost,
		apiPort,
		clientHost,
		clientPort,
		viteApiUrl: `https://${apiHost}`,
	};
}

void createScript(async function init() {
	const dependencies = [
		'@types/bun',
		'lodash',
		'typescript',
		'@typescript/native-preview',
		'oxfmt',
		'oxlint',
		'lefthook',
		'kill-port-process',
	];
	const assetFilePath = (file: string) => path.join(__dirname, 'files', file);

	console.log(style.header('create root'));
	if (fs.existsSync(root)) throw new Error(`root "${root}" already exists`);
	const clientServerNetwork = args.type === 'client-server' ? getClientServerNetworkConfig() : undefined;
	disk.setRoot(root);
	disk.createDir('.');
	disk.copyFile({ from: assetFilePath('gitignore'), to: '.gitignore' });
	disk.copyFile({ from: assetFilePath('tsconfig.json'), to: 'tsconfig.json' });
	disk.copyFile({ from: assetFilePath('lefthook.yml'), to: '.lefthook.yml' });
	disk.copyFile({
		from: assetFilePath('vscode.code-workspace'),
		to: args.name + '.code-workspace',
	});
	disk.copyFile({ from: assetFilePath('oxlint.json'), to: 'oxlint.json' });
	disk.copyFile({ from: assetFilePath('.oxfmtrc.json'), to: '.oxfmtrc.json' });
	cmd.setCWD(root);

	disk.writeJsonFile('package.json', {
		name: args.name,
		private: true,
		scripts: {
			lint: 'oxlint --fix && oxfmt',
			test: 'bun test',
		},
	});

	switch (args.type) {
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
						API_HOST=${network.apiHost}
						VITE_API_URL=${network.viteApiUrl}
					`
					: textBlock`
						API_PORT=${network.apiPort}
						CLIENT_PORT=${network.clientPort}
						VITE_API_URL=${network.viteApiUrl}
					`,
			);
			if (network.clientHost) {
				const agentsPath = disk.getAbsolutePath('AGENTS.md');
				const agentsContent = fs.readFileSync(agentsPath, 'utf8');
				disk.writeFile(
					'AGENTS.md',
					`${agentsContent}\n- Local dev hosts: use https://${network.clientHost} and https://${network.apiHost} via localias instead of localhost:${network.clientPort} and localhost:${network.apiPort}.\n`,
				);

				console.log(style.header('setup localias'));
				cmd(`localias set ${network.clientHost} ${network.clientPort}`);
				cmd(`localias set ${network.apiHost} ${network.apiPort}`);
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
		default:
			throw new Error(`Invalid type: ${args.type}`);
	}

	cmd('bun add ' + Array.from(new Set(dependencies)).sort().join(' '));

	cmd('git init');
	cmd('git add -A');
	cmd('git commit -m "initial setup with stefan-utils/scripts/setup-new-app"');
	if (args.repo !== 'none') {
		cmd(`gh repo create ${shellQuote(args.name)} --${args.repo} --source=. --remote=origin`);
		cmd('git push -u origin master');
		cmd(`git-invite-ai-to-repos --repos ${shellQuote(args.name)}`);
	}
});
