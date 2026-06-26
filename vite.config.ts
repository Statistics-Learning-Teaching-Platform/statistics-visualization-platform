import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2020",
    sourcemap: true,
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
