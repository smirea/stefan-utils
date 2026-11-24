import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import env from "./env.ts";

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      adapter: adapter({
        fallback: "index.html",
      }),
      compilerOptions: {
        warningFilter: (warning) => !warning.code.startsWith("a11y_"),
      },
    }),
  ],
  clearScreen: false,
  optimizeDeps: {
    exclude: ["@tanstack/svelte-query"],
  },
  server: {
    allowedHosts: env.UI_HOST ? [env.UI_HOST] : undefined,
    port: env.UI_PORT,
    strictPort: true,
    proxy: {
      "/api": {
        target: env.API_URL,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
