import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/tests/**/*.test.ts"],
    exclude: ["src/tests/unit/api.test.ts"], // Uses bun:test (run with `bun test`)
    testTimeout: 15000,
  },
});
