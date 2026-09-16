import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { it } from "vitest";
import casesJson from "./cases.json";
import { runChecks } from "./checks";
import type { CaseDef } from "./judge";
import { FLOW_DIR, readJsonl } from "./lib";

interface ResultRow {
  prompt_id: string;
  rep: number;
  status?: string;
  grade: Record<string, number>;
  meta: Record<string, unknown>;
}

/* Otomatik kontroller değiştiğinde kaydedilmiş satırları API'siz yeniden puanlar.
   Ham metin trace'ten, son içerik out/'tan okunur; hakem puanı (win) korunur. */
it("kaydedilmiş satırları yeniden puanla", () => {
  const cases = new Map((casesJson as CaseDef[]).map((c) => [c.id, c]));
  for (const variant of ["baseline", "v1", "v2"]) {
    const file = path.join(FLOW_DIR, variant, "results.jsonl");
    if (!existsSync(file)) continue;
    const rows = readJsonl<ResultRow>(file).map((row) => {
      if (row.status === "truncated") return row;
      const c = cases.get(row.prompt_id)!;
      const trace = JSON.parse(readFileSync(path.join(FLOW_DIR, variant, "traces", `${row.prompt_id}_rep${row.rep}.json`), "utf8"));
      const out = JSON.parse(readFileSync(path.join(FLOW_DIR, variant, "out", `${row.prompt_id}_rep${row.rep}.json`), "utf8"));
      const userPrompt = String(trace[1]?.content ?? "");
      const alias = c.student ? (/- Ad: ([^,\n]+)/.exec(userPrompt)?.[1]?.trim() ?? null) : null;
      const checks = runChecks({ body: c.body, drill: out.drill, rawText: String(trace[2]?.content ?? ""), alias });
      return {
        ...row,
        grade: { ...row.grade, talimat: checks.talimat, dil_kurali: checks.dil_kurali, rumuz_yok: checks.rumuz_yok },
        meta: { ...row.meta, checks: checks.details },
      };
    });
    writeFileSync(file + ".tmp", rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
    renameSync(file + ".tmp", file);
    process.stderr.write(`[yeniden puanlama] ${variant}: ${rows.length} satır\n`);
  }
});
