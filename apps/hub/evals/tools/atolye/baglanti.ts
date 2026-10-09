// apps/hub/evals/tools/atolye/baglanti.ts
import { readFileSync } from "node:fs";

/* Atölye adaptörlerinin "gerçek rota" bağlantı testlerinin ortak yardımcıları (geçici akış dizini `lib/testFlow`dan; selftest dosyaları kullanır; `*.eval.ts`
   olmadığı için vitest bunu test dosyası olarak toplamaz). Alt-ajan düzeneği: istek `pending.json`'a yazılır, yanıt
   `responseTxt`'ten okunur; hiçbir model çağrılmaz. */

export interface Bekleyen {
  key: string;
  requestMd: string;
  responseTxt: string;
}

export const bekleyenler = (p: string) => JSON.parse(readFileSync(p, "utf8")) as Bekleyen[];
export const sonuclar = (p: string) => readFileSync(p, "utf8").trim().split("\n").map((l) => JSON.parse(l) as Record<string, unknown>);

export async function kos(tool: string, flowDir: string, cases: string[]) {
  const { runEval } = await import("../../lib/runner");
  return runEval({ tool, variant: "baseline", backend: "subagent", flowDir, cases, timeoutS: 30 });
}

/** Vakanın üretim isteği (md). */
export function istek(rows: Bekleyen[], vakaId: string): { md: string; row: Bekleyen } {
  const row = rows.find((r) => r.key.startsWith(`${vakaId}_`));
  if (!row) throw new Error(`${vakaId} için bekleyen istek yok: ${rows.map((r) => r.key).join(", ")}`);
  return { md: readFileSync(row.requestMd, "utf8"), row };
}

/** İstek md'sindeki öğrenci rumuzu ("- Öğrenci: X"). */
export const rumuzOku = (md: string) => /- Öğrenci: ([^,\n]+)/.exec(md)?.[1]?.trim();
