import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup/env.ts"],
    testTimeout: 30_000,
    hookTimeout: 120_000,

    sequence: {
      concurrent: false,
    },

    fileParallelism: false,
  },
});