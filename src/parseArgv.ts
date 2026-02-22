import { type ParseArgsConfig, type ParseArgsOptionDescriptor, parseArgs } from 'util';
import chalk from 'chalk';

// 1. Type Definitions for the enhanced config
interface ExtendedOption extends ParseArgsOptionDescriptor {
	description?: string;
	optional?: boolean; // Custom: marks argument as not required
	choices?: readonly string[]; // Custom: restricts value to specific choices
}

export type ArgConfig = Record<string, ExtendedOption>;

// 2. Type Inference Magic: Calculates the exact return type based on config
// Pure type inference without optional handling
type InferredArgsBase<T extends ArgConfig> = {
	[K in keyof T]: T[K]['type'] extends 'boolean'
		? boolean
		: T[K] extends { choices: readonly string[] }
			? T[K]['choices'][number]
			: string;
};

// Makes fields optional based on optional and default fields
type InferredArgs<T extends ArgConfig> = {
	[K in keyof T]: T[K]['optional'] extends true ? InferredArgsBase<T>[K] | undefined : InferredArgsBase<T>[K];
};

export interface ParseArgvConfig<T extends ArgConfig> extends Omit<ParseArgsConfig, 'options'> {
	description?: string;
	options: T;
}

export function parseArgv<const T extends ArgConfig>({
	options,
	description,
	...rest
}: ParseArgvConfig<T>): { usage: () => string; args: InferredArgs<T> } {
	// Inject automatic help option
	const optionsWithHelp = {
		...options,
		help: { type: 'boolean', short: 'h', description: 'Show this help message' },
	} as const;

	// Parse arguments using Node's built-in util
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: optionsWithHelp,
		allowNegative: true,
		strict: true,
		...rest,
	});

	// Helper to generate padded help text
	const usage = () => {
		const lines: string[] = [];
		if (description) lines.push(description, '');

		lines.push('Usage:');

		// Calculate padding based on longest flag combo
		const rows = Object.entries(optionsWithHelp).map(([key, opt]) => {
			const flag = `--${key as string}${opt.short ? `, -${opt.short}` : ''}`;
			let type = '';
			if (opt.type === 'string') {
				if ('choices' in opt && opt.choices && opt.choices.length > 0) {
					type = ` <${opt.choices.join('|')}>`;
				} else {
					type = ' <string>';
				}
			}
			let description = opt.description || '';
			if ('choices' in opt && opt.choices && opt.choices.length > 0 && description) {
				description += ` (choices: ${opt.choices.join(', ')})`;
			}
			return {
				left: `${flag}${type}`,
				right: description,
			};
		});

		const maxPad = Math.max(...rows.map(r => r.left.length)) + 4;

		rows.forEach(r => {
			lines.push(`    ${r.left.padEnd(maxPad)}${r.right}`);
		});

		return lines.join('\n');
	};

	// 1. Handle Help Flag Immediately
	if ((values as any).help) {
		console.log(usage());
		process.exit(0);
	}

	// 2. Enforce 'Required by default' logic
	// Note: Booleans in parseArgs default to false, so they are always 'present'
	for (const [key, opt] of Object.entries(options)) {
		if (opt.type === 'string' && !opt.optional && opt.default === undefined && (values as any)[key] === undefined) {
			console.error(chalk.red(`Error: Missing required argument: --${key}\n`));
			console.log(usage());
			process.exit(1);
		}
	}

	// 3. Validate choices if provided
	for (const [key, opt] of Object.entries(options)) {
		if ('choices' in opt && opt.choices && opt.choices.length > 0 && (values as any)[key] !== undefined) {
			const value = (values as any)[key] as string;
			if (!opt.choices.includes(value)) {
				console.error(
					chalk.red(`Error: Invalid value for --${key}: "${value}". Must be one of: ${opt.choices.join(', ')}\n`),
				);
				console.log(usage());
				process.exit(1);
			}
		}
	}

	return {
		usage,
		args: values as unknown as InferredArgs<T>,
	};
}
