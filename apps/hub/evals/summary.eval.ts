// apps/hub/evals/summary.eval.ts
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { it } from "vitest";
import { FLOW_DIR } from "./lib/core";
import { collectArms, renderSummary } from "./lib/summary";

/* <flow>/<modül>/<araç>/<kol>/results.jsonl → <flow>/ozet.md (ve stderr).
   [EVAL_FLOW=<mutlak yol>] node_modules/.bin/vitest run --config vitest.eval.config.ts evals/summary.eval.ts
   Kol dizini `<variant>[@<tag>]` (baseline|v1|v2 + isteğe bağlı etiket; başka adlar atlanır ve bildirilir). Karşılaştırılan kol, sonuç
   satırındaki `ref` alanından okunur (koşturucunun kullandığı referans); eski satırlarda dizin adından çıkarılır: `v1@r2` kendi turunun
   tabanına (`baseline@r2`, yoksa `baseline`), `v2@r2` → `v1@r2`; uyuşmazlık tabloda bildirilir.
   Karar yalnız ortak vakalar üzerinden ve kapsam %100 iken verilir; ayrıntı için evals/README.md "Özet". */

it("tüm kolların özetini yazar", () => {
  if (!existsSync(FLOW_DIR)) {
    throw new Error(`Akış dizini yok: ${FLOW_DIR}. Koşu çıktıları <akış>/<modül>/<araç>/<kol>/results.jsonl altında olmalı; başka bir dizin için EVAL_FLOW=<mutlak yol> ver.`);
  }
  const rows = collectArms(FLOW_DIR, { onSkip: (p, neden) => process.stderr.write(`atlandı: ${p} — ${neden}\n`) });
  if (!rows.length) {
    process.stderr.write(`Özetlenecek sonuç yok: ${FLOW_DIR} altında hiç <modül>/<araç>/<kol>/results.jsonl bulunamadı; ozet.md yazılmadı.\n`);
    return;
  }
  const md = renderSummary(rows);
  writeFileSync(path.join(FLOW_DIR, "ozet.md"), md + "\n");
  process.stderr.write(md + "\n");
});
