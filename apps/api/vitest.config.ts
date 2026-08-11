import { resolve } from "node:path";

import { config } from "dotenv";
import { defineConfig } from "vitest/config";

// Load .env.test BEFORE modules parse env — must be top-level in config file
config({ path: resolve(__dirname, ".env.test") });

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./test/helpers/setup.ts"],
    globals: true,
    include: ["test/**/*.test.ts"],
    // Suites share one Postgres/Redis, and setup.ts TRUNCATEs Player + flushes
    // Redis per test — parallel files delete each other's rows mid-run.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts"],
    },
    testTimeout: 30_000,
  },
});
