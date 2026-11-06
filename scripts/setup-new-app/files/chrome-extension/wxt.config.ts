import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-react'],
	// Explicit imports keep entrypoints readable without WXT's generated globals.
	imports: false,
	manifest: {
		permissions: ['storage'],
	},
	webExt: {
		// A persistent dev profile keeps logins and extension state between `bun run dev` runs.
		chromiumArgs: ['--user-data-dir=./.wxt/chrome-data'],
	},
	vite: () => ({
		plugins: [tailwindcss()],
	}),
});
