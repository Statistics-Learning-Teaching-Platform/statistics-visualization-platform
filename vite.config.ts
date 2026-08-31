import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		proxy: {
			"/st-qselector": {
				target: "http://127.0.0.1:3200",
				changeOrigin: true,
				// Next.js dev mode completes client hydration through its development
				// runtime websocket. Proxy the upgrade as well as ordinary HTTP;
				// otherwise the server-rendered question bank is visible but remains
				// inert when it is opened through the shared portal.
				ws: true,
			},
		},
	},
	build: {
		target: "es2020",
		// Public source maps expose implementation details and can retain local
		// build paths. Keep them out of deployment artifacts.
		sourcemap: false,
		rollupOptions: {
			output: {
				// The -cf2 suffix versions the chunk URL space. Cloudflare keys
				// edge entries partly by Sec-Fetch-Dest and caches /assets/* as
				// immutable, so a fallback served during a deploy-propagation
				// window sticks for browser fetches until the URL changes (see
				// functions/assets/[[path]].ts for the structural guard; this
				// suffix is the escape hatch when an entry is already poisoned).
				chunkFileNames: "assets/[name]-[hash]-cf3.js",
				entryFileNames: "assets/[name]-[hash]-cf3.js",
			},
		},
	},
	// Pyodide's worker uses split ESM imports, which cannot be emitted in
	// Vite's default IIFE worker format.
	worker: {
		format: "es",
	},
	test: {
		// jsdom so component render tests have a DOM; Node APIs (fs, process)
		// remain available, so the file-based inventory tests still pass.
		// globals: true so the setup file's @testing-library/jest-dom can extend
		// the global expect (the tsconfig already ships vitest/globals types).
		environment: "jsdom",
		globals: true,
		setupFiles: ["test/setup.ts"],
		include: ["test/**/*.test.{ts,tsx}", "apps/*/test/**/*.test.{ts,tsx}"],
	},
});
