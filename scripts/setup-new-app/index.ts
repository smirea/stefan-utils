#!/usr/bin/env bun --preserve-symlinks

import fs from 'fs';
import path from 'path';
import { parseArgv } from 'src/parseArgv';
import { cmd, createScript,disk,style } from 'src/createScript';
import { textBlock } from 'src/textBlock';

const codePath = path.join(process.env.HOME!, 'code');

const { args } = parseArgv({
    // description: 'Setup a new app',
    options: {
        name: { type: 'string', short: 'n', description: 'folder and app name' },
        path: { type: 'string', short: 'p', default: codePath },
        type: { type: 'string', choices: ['node', 'client-server'], default: 'client-server' },
        repo: { type: 'string', description: 'github repo type', default: 'public', choices: ['public', 'private', 'internal', 'none'] },
    },
});

const root = path.join(args.path, args.name);

void createScript(async function init() {
    const dependencies = ['@types/bun', 'lodash', 'typescript', '@typescript/native-preview', 'oxlint', 'lefthook', 'kill-port-process'];
    const assetFilePath = (file: string) => path.join(__dirname, 'files', file);

    console.log(style.header('create root'));
    if (fs.existsSync(root)) throw new Error(`root "${root}" already exists`);
    disk.setRoot(root);
    disk.createDir('.');
    disk.copyFile({ from: assetFilePath('gitignore'), to: '.gitignore' });
    disk.copyFile({ from: assetFilePath('tsconfig.json'), to: 'tsconfig.json' });
    disk.copyFile({ from: assetFilePath('lefthook.yml'), to: '.lefthook.yml' });
    disk.copyFile({ from: assetFilePath('vscode.code-workspace'), to: args.name + '.code-workspace' });
    disk.copyFile({ from: assetFilePath('oxlint.json'), to: 'oxlint.json' });
    cmd.setCWD(root);

    disk.writeJsonFile(
        'package.json',
        {
            name: args.name,
            private: true,
            scripts: {
                lint: 'oxlint --fix',
                test: 'bun test',
            },
        },
    );

    switch (args.type) {
        case 'node':
            disk.copyFile({ from: assetFilePath('AGENTS.node.md'), to: 'AGENTS.md' });
            const src = path.join(root, 'src');
            disk.createDir(src);
            disk.writeFile(
                'src/index.ts',
                `console.log('Hello, ${args.name}!');`
            );
            disk.updateJsonFile('package.json', (data) => ({
                ...data,
                scripts: {
                    ...data.scripts,
                    dev: 'bun --watch src/index.ts',
                },
            }));
            break;
        case 'client-server':
            disk.copyFile({ from: assetFilePath('AGENTS.client-server.md'), to: 'AGENTS.md' });
            disk.writeFile('.env', textBlock`
                API_PORT=3001
                CLIENT_PORT=3000
                VITE_API_URL=http://localhost:3001
            `);

            console.log(style.header('create server'));
            disk.copyDir({ from: assetFilePath('server'), to: 'server' });

            console.log(style.header('create client'));
            disk.copyDir({ from: assetFilePath('client'), to: 'client' });
            const bunRun = 'bun run --elide-lines 0 --no-clear-screen --install fallback --env-file .env --env-file .env.local --filter ';
            disk.updateJsonFile('package.json', (data) => ({
                ...data,
                scripts: {
                    ...data.scripts,
                    'server:dev': bunRun + 'server dev',
                    'client:dev': bunRun + 'client dev',
                    dev: "concurrently --restart-tries=-1 --restart-after=1000 --names 'server ,client ,' --c 'green,cyan' 'bun run server:dev' 'bun run client:dev'"
                },
            }));
            dependencies.push(
                'kill-port-process',
                'concurrently',

                'react',
                'react-dom',
                'vite',
                'antd',
                '@ant-design/icons',
                '@vitejs/plugin-react',
                '@tanstack/router-plugin',
                '@emotion/react',
                '@emotion/styled',
                '@phosphor-icons/react',
                'vite-tsconfig-paths',
                '@tailwindcss/vite',
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
        cmd(`gh repo create ${args.name} --${args.repo} --source=. --remote=origin`);
        cmd('git push -u origin master');
    }
});
