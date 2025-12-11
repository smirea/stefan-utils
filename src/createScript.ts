import { execSync, type ExecSyncOptions } from 'child_process';
import fs from 'fs';

import chalk from 'chalk';
import { formatDate } from 'date-fns';
import _ from 'lodash';

export async function createScript(fn: () => any) {
    process.on('unhandledRejection', err => {
        console.error(chalk.red.bold('[Unhandled promise rejection]'), err);
    });

    await new Promise(resolve => setTimeout(resolve, 1)); // nice to have so that you can define things anywhere in the script file without worrying about initialization order

    try {
        await fn();
        process.exit(0);
    } catch (err) {
        console.error(err);
        if ((err as any).data) {
            console.error(chalk.red.bold('error.data ='), (err as any).data);
        }
        process.exit(1);
    }

}

let groupLevel = (() => {
    const old = {
        group: console.group.bind(console),
        groupEnd: console.groupEnd.bind(console),
    };
    console.group = (...args: any[]) => {
        groupLevel++;
        return old.group(...args);
    };
    console.groupEnd = () => {
        groupLevel--;
        return old.groupEnd();
    };
    return 0;
})();

export const cmd = (() => {
    let cwd = process.cwd();

    return Object.assign(function cmd(command: string, options?: ExecSyncOptions) {
        console.log(
            chalk.gray(`[${formatDate(new Date(), 'HH:mm:ss')}]`),
            chalk.bold('run cmd:'),
            chalk.green(command),
        );
        return execSync(command, { stdio: 'inherit', cwd, ...options });
    }, {
        setCWD: (target: string) => { cwd = target; },
    });
})();

const isEmpty = (t: any) => !!(t == null || t === '');

export const trunc = (n: number, s: string) => _.truncate(s, { length: n, omission: '…' });

export const style = {
    header: (title: string) =>
        chalk.bgBlue.white.bold(
            ` ⬥ ${title}`.padEnd(process.stdout.columns - groupLevel * 2),
        ),
    bool: (value: any, label: string) =>
        isEmpty(value)
            ? ''
            : style.label(label, chalk[value ? 'green' : 'red'](value ? '✔' : '✘')),
    number: (value: any, label: string) =>
        isEmpty(value) ? '' : style.label(label, chalk.yellow(_.round(value, 2))),
    label: (label: any, value: any) =>
        isEmpty(value)
            ? ''
            : chalk.bold(label + ': ') +
              (value && typeof value === 'object' ? trunc(30, JSON.stringify(value)) : value),
};

export function getTimer() {
    const start = Date.now();
    return (log?: string) => {
        const durationInSeconds = _.round((Date.now() - start) / 1000, 1);
        if (log) console.info(style.label('⏱︎ ' + log, chalk.yellow(durationInSeconds + 's')));
        return durationInSeconds;
    };
}

export function exitError(err: any) {
    console.error(chalk.red.bold('[Error]'), err);
    process.exit(1);
}

export const disk = {
    touchedPaths: new Set<string>([]),

    prettyPath: (p: string) => p.replace(process.cwd(), '').replace(/^\//, ''),

    createDir: (path: string) => {
        disk.touchedPaths.add(path);
        console.info(chalk.bold(`- create dir:`, chalk.green(disk.prettyPath(path))));
        fs.mkdirSync(path, { recursive: true });
    },

    writeFile: (path: string, content: string) => {
        disk.touchedPaths.add(path);
        console.info(chalk.bold(`- write file:`, chalk.green(disk.prettyPath(path))));
        fs.writeFileSync(path, content, 'utf-8');
    },

    writeJsonFile: (path: string, content: Record<string, any>) => {
        disk.writeFile(path, JSON.stringify(content, null, 4));
    },

    updateFile: (path: string, update: (data: Record<string, any>) => Record<string, any>) => {
        disk.touchedPaths.add(path);
        console.info(chalk.bold(`- update file:`, chalk.green(disk.prettyPath(path))));
        const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
        const updated = update(data as Record<string, any>);
        fs.writeFileSync(path, JSON.stringify(updated, null, 4), 'utf-8');
    },

    gitAddTouchedPaths: ({ reset = false, commit = '' } = {}) => {
        if (reset) cmd('git reset');
        cmd(`git add ${Array.from(disk.touchedPaths).join(' ')}`);
        if (commit) cmd(`git commit -m '${commit}'`);
    },
};
