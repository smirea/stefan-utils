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
    const dependencies = ['@types/bun', 'lodash', 'typescript'];

    console.log(style.header('create root'));
    if (fs.existsSync(root)) throw new Error(`root "${root}" already exists`);
    disk.createDir(root);
    writeGitignore(path.join(root, '.gitignore'));
    writeTsconfig(path.join(root, 'tsconfig.json'));
    disk.writeJsonFile(
        path.join(root, args.name + '.code-workspace'),
        {
            'folders': [{ 'path': '.' }],
            'settings': {},
        },
    );
    const eslintCmd = `./generate-eslintConfig.ts ${args.type === 'client-server' ? '--react' : '--no-react'}`;
    disk.writeFile(
        path.join(root, 'eslint.config.js'),
        cmd(eslintCmd, { cwd: __dirname, stdio: 'pipe' }).toString(),
    );
    dependencies.push(
        ...cmd(eslintCmd + ' --print-dependencies', { cwd: __dirname, stdio: 'pipe' }).toString().split(/\s+/).filter(Boolean)
    )
    cmd.setCWD(root);

    switch (args.type) {
        case 'node':
            const src = path.join(root, 'src');
            disk.createDir(src);
            disk.writeFile(
                path.join(src, 'index.ts'),
                `console.log('Hello, ${args.name}!');`
            );
            disk.writeJsonFile(
                path.join(root, 'package.json'),
                {
                    name: args.name,
                    private: true,
                    scripts: {
                        dev: 'bun --watch src/index.ts',
                        test: 'bun test',
                    },
                },
            );
            cmd('bun add ' + dependencies.sort().join(' '));
            break;
        case 'client-server':
            disk.writeFile('.env', textBlock`
                API_PORT=3000
                CLIENT_PORT=3000
            `);
            disk.writeJsonFile(
                path.join(root, 'package.json'),
                {
                    name: args.name,
                    private: true,
                },
            );
            writeTsconfig(path.join(root, 'tsconfig.json'));
            dependencies.push('react', 'react-dom', 'vite');
            cmd('bun add ' + dependencies.sort().join(' '));

            console.log(style.header('create server'));
            const serverDir = path.join(root, 'server');
            const serverSrc = path.join(serverDir, 'src');
            disk.createDir(serverDir);
            disk.createDir(serverSrc);
            disk.writeFile(
                path.join(serverSrc, 'index.ts'),
                textBlock`
                    const server = Bun.serve({
                        development: true,
                        port: process.env.API_PORT,
                        routes: {
                            '/status': Response.json({ ok: true }),
                            '/*':  Response.json({ ok: false, error: 'Not found' }, { status: 404 }),
                        },
                    });

                    console.log('Server running at:', server.url);
                `
            );
            disk.writeJsonFile(
                path.join(serverDir, 'package.json'),
                {
                    name: 'server',
                    private: true,
                    scripts: {
                        dev: 'bun --watch src/index.ts',
                        test: 'bun test',
                    },
                },
            );
            disk.writeJsonFile(
                path.join(root, 'server', 'tsconfig.json'),
                {
                    extends: '../tsconfig.json',
                },
            );

            console.log(style.header('create client'));
            const clientDir = path.join(root, 'client');
            const clientSrc = path.join(clientDir, 'src');
            disk.createDir(clientSrc);
            disk.writeFile(
                path.join(clientSrc, 'main.ts'),
                textBlock`
                    import { StrictMode } from 'react'
                    import { createRoot } from 'react-dom/client'
                    import './index.css'
                    import App from './App.tsx'

                    createRoot(document.getElementById('root')!).render(
                        <StrictMode>
                            <App />
                        </StrictMode>,
                    )
                `
            );
            break;
        default:
            throw new Error(`Invalid type: ${args.type}`);
    }

    cmd('git init');
    cmd('git add -A');
    cmd('git commit -m "initial setup with stefan-utils/scripts/setup-new-app"');
    if (args.repo !== 'none') {
        cmd(`gh repo create ${args.name} --${args.repo} --source=. --remote=origin`);
    }
    cmd('git push -u origin master');
});

function writeGitignore(filePath: string) {
    disk.writeFile(
        filePath,
        textBlock`
            node_modules

            # output
            out
            dist
            *.tgz

            # dotenv environment variable files
            .env
            .env.development.local
            .env.test.local
            .env.production.local
            .env.local

            # caches
            .eslintcache
            .cache
            *.tsbuildinfo

            # other
            .DS_Store
        `
    );
}

function writeTsconfig(filePath: string) {
    disk.writeJsonFile(
        filePath,
        // pulled from bun init
        {
            'compilerOptions': {
                'lib': ['ESNext'],
                'target': 'ESNext',
                'module': 'Preserve',
                'moduleDetection': 'force',
                'jsx': 'react-jsx',
                'allowJs': true,

                'moduleResolution': 'bundler',
                'allowImportingTsExtensions': true,
                'verbatimModuleSyntax': true,
                'noEmit': true,

                'strict': true,
                'skipLibCheck': true,
                'noFallthroughCasesInSwitch': true,
                // 'noUncheckedIndexedAccess': true, // annoying
                'noImplicitOverride': true,

                'noUnusedLocals': false,
                'noUnusedParameters': false,
                'noPropertyAccessFromIndexSignature': false
            }
        },
    );
}
