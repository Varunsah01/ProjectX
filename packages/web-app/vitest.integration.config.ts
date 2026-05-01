import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["__tests__/tenant-isolation.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    pool: "forks",
    maxWorkers: 1,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
