// apps/hub/evals/summary.eval.ts
import { writeFileSync } from "node:fs";
import path from "node:path";
import { it } from "vitest";
import { FLOW_DIR } from "./lib/core";
import { collectArms, renderSummary } from "./lib/summary";

/* <flow>/<modül>/<araç>/<kol>/results.jsonl → <flow>/ozet.md (ve stderr).
   [EVAL_FLOW=…] node_modules/.bin/vitest run --config vitest.eval.config.ts evals/summary.eval.ts
   Kol dizini `<variant>[@<tag>]`: `v1@r2` kendi turunun tabanına (`baseline@r2`, yoksa `baseline`) göre ölçülür;
   v2 kolları için referans `v1`'dir (`v2@r2` → `v1@r2`; EVAL_REF=v1[@etiket] ile koşulmuş olmalı). */

it("tüm kolların özetini yazar", () => {
  const md = renderSummary(collectArms(FLOW_DIR));
  writeFileSync(path.join(FLOW_DIR, "ozet.md"), md + "\n");
  process.stderr.write(md + "\n");
});
