import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Model değerlendirmeleri (evals/**) — birim testlerden AYRI çalışır, çünkü gerçek API çağırır
 * ve para harcar. Varsayılan `vitest run` bunları hiç görmez (include: src/**\/*.test.ts).
 *
 *   node_modules/.bin/vitest run --config vitest.eval.config.ts evals/articulation/run.eval.ts
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["evals/**/*.eval.ts"],
    testTimeout: 3 * 60 * 60 * 1000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@studio": path.resolve(import.meta.dirname, "src/modules/studio"),
      "@atolye": path.resolve(import.meta.dirname, "src/modules/atolye"),
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
});
