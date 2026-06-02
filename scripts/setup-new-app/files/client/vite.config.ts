import { defineConfig } from 'vite';
import { env } from 'node:process';
// import MillionLint from "@million/lint";
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import tailwindcss from '@tailwindcss/vite';

if (!env.CLIENT_PORT) throw new Error('CLIENT_PORT is not set');
if (!env.API_PORT) throw new Error('API_PORT is not set');

const clientPort = Number(env.CLIENT_PORT);
const apiPort = Number(env.API_PORT);
if (Number.isNaN(clientPort)) throw new Error('CLIENT_PORT must be a valid number');
if (Number.isNaN(apiPort)) throw new Error('API_PORT must be a valid number');
const allowedHosts = env.CLIENT_HOST ? [env.CLIENT_HOST] : undefined;

// https://vite.dev/config/
export default defineConfig({
	resolve: {
		tsconfigPaths: true,
	},
	server: {
		allowedHosts,
		port: clientPort,
		strictPort: true,
		proxy: {
			'/api': {
				target: `http://localhost:${apiPort}`,
				changeOrigin: true,
				secure: false,
				rewrite: (path: string) => path.replace(/^\/api/, ''),
			},
		},
	},
	plugins: [
		tanstackRouter({
			target: 'react',
			autoCodeSplitting: true,
		}) as any,
		react(),
		tailwindcss() as any,
	],
});
