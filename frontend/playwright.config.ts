import { defineConfig } from "@playwright/test";
import path from "path";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: [
    {
      command: `bun run ${path.resolve(__dirname, "../offchain/src/main.ts")}`,
      cwd: path.resolve(__dirname, "../offchain"),
      port: 3001,
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "bun run dev",
      port: 3000,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
