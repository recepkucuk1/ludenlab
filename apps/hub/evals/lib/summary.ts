// apps/hub/evals/lib/summary.ts
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { readJsonl } from "./core";
import { mean } from "./sharedChecks";

/* Araç × kol özet tablosu. Girdi: koşturucunun yazdığı `results.jsonl` satırları (`runner.ts` → `appendJsonl(resultsPath, …)`).
   Çıktı: Markdown. Karar etiketleri spec B6. */

export interface ResultRow {
  prompt_id: string;
  rep: number;
  grade: Record<string, number>;
  hard_fail: string[];
  out_tokens: number | null | undefined;
  status?: string;
  usage_estimated?: boolean;
}
export interface ArmSummary {
  n: number;
  win: number;
  /** En az bir sert hata içeren satır sayısı. */
  hard: number;
  /** Sert hata nedenleri: `hard_fail` MADDESİ başına sayı (bir satırda iki neden varsa ikisi de sayılır → toplam `hard`'dan büyük olabilir). */
  hardReasons: Record<string, number>;
  talimat: number;
  out_tokens: number;
  truncated: number;
  estimated: boolean;
}
export interface ArmRow {
  tool: string;
  arm: string;
  s: ArmSummary;
  /** Karşılaştırılan kol (v2 için v1[@etiket]); verilmezse baseline. */
  ref?: string;
}

export function armSummary(rows: ResultRow[]): ArmSummary {
  const hardReasons: Record<string, number> = {};
  for (const r of rows) for (const neden of r.hard_fail ?? []) hardReasons[neden] = (hardReasons[neden] ?? 0) + 1;
  return {
    n: rows.length,
    win: mean(rows.map((r) => r.grade.win ?? 0)),
    hard: rows.filter((r) => r.hard_fail?.length).length,
    hardReasons,
    talimat: mean(rows.map((r) => r.grade.talimat ?? 0)),
    // Token'ı kaydedilmemiş satır (hata/eksik kullanım) 0 sayılıp ortalamayı aşağı çekmesin.
    out_tokens: mean(rows.map((r) => r.out_tokens).filter((t): t is number => typeof t === "number" && Number.isFinite(t))),
    truncated: rows.filter((r) => r.status === "truncated").length,
    estimated: rows.some((r) => r.usage_estimated === true),
  };
}

const head = (arm: string) => arm.split("@")[0]!;
const tag = (arm: string) => arm.split("@")[1];

/** v2 kolunun referansı: `v2` → `v1`, `v2@r2` → `v1@r2` (EVAL_REF=v1[@etiket] ile koşulmuş olmalı). Başka kolun referansı yok. */
export function refOf(arm: string): string | undefined {
  return head(arm) === "v2" ? arm.replace(/^v2/, "v1") : undefined;
}

/** Bir kolun "tabana göre" karşılaştırıldığı taban kol: etiketli kol önce kendi turunun tabanına (`baseline@r2`), o yoksa
    etiketsiz `baseline`'a göre ölçülür; yeniden koşulan taban (`baseline@r2`) ilk tabana göre. Etiketsiz baseline'ın tabanı yok. */
export function baseOf(arm: string, arms: string[]): string | undefined {
  if (arm === "baseline") return undefined;
  const t = tag(arm);
  if (head(arm) !== "baseline" && t && arms.includes(`baseline@${t}`)) return `baseline@${t}`;
  return arms.includes("baseline") ? "baseline" : undefined;
}

const pct = (a: number, b: number) => (b ? `${a - b >= 0 ? "+" : ""}${Math.round(((a - b) / b) * 100)}%` : "—");
const f2 = (x: number) => x.toFixed(2);

/** "dil_kurali: 4, rumuz_yok: 1" (çoktan aza, eşitlikte ada göre); neden yoksa "—". Tablo hücresi: `|` kaçırılır. */
function nedenler(s: ArmSummary): string {
  const e = Object.entries(s.hardReasons).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return e.length ? e.map(([k, v]) => `${k.replace(/\|/g, "\\|")}: ${v}`).join(", ") : "—";
}

/** Spec B6 karar etiketi. `base`: tabana göre kol; `ref`: v2'nin karşılaştırıldığı kol. */
function karar(r: ArmRow, base: ArmSummary | undefined, ref: ArmSummary | undefined): string {
  const v = head(r.arm);
  if (v === "v1") {
    if (!base) return "baseline yok";
    const tokenOk = r.s.out_tokens <= base.out_tokens * 1.2;
    if (r.s.win >= 0.65 && r.s.hard <= base.hard && tokenOk) return "KABUL ADAYI";
    return r.s.win >= 0.65 ? "win tamam, bütçe/sert hata gerilemesi" : "—";
  }
  if (v === "v2") {
    if (!ref) return `referans ${r.ref ?? "baseline"} yok`;
    return r.s.win >= 0.4 && r.s.hard === 0 ? "HAIKU ADAYI" : "—";
  }
  return "";
}

export function renderSummary(rows: ArmRow[]): string {
  const byTool = new Map<string, ArmRow[]>();
  for (const r of rows) byTool.set(r.tool, [...(byTool.get(r.tool) ?? []), r]);
  const out = [
    "| Araç | Kol | n | win | sert hata | sert hata (neden) | talimat | çıktı token | tabana göre | kesilen | karar |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const [tool, arms] of byTool) {
    const adlar = arms.map((a) => a.arm);
    const kol = (ad: string | undefined) => (ad ? arms.find((a) => a.arm === ad)?.s : undefined);
    for (const r of arms) {
      const base = kol(baseOf(r.arm, adlar));
      const ref = r.ref ? kol(r.ref) : base;
      out.push(
        `| ${tool} | ${r.arm} | ${r.s.n} | ${f2(r.s.win)} | ${r.s.hard} | ${nedenler(r.s)} | ${f2(r.s.talimat)} | ${Math.round(r.s.out_tokens)}${r.s.estimated ? "~" : ""} | ${base ? pct(r.s.out_tokens, base.out_tokens) : "—"} | ${r.s.truncated} | ${karar(r, base, ref)} |`,
      );
    }
  }
  out.push(
    "",
    "`~` = alt-ajan tahmini token (chars/3,2); mutlak maliyet iddiası YOK, yalnız kollar arası göreli karşılaştırma.",
    "`sert hata` = en az bir sert hata içeren vaka-tekrar sayısı; `(neden)` sütunu hata maddelerini sayar, bu yüzden toplamı `sert hata`'dan büyük olabilir.",
  );
  return out.join("\n");
}

const alt = (dir: string) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort()
    : [];

/** `<flow>/<modül>/<araç>/<kol>/results.jsonl` → kol özetleri. Hakem kontrolleri (`controls[@etiket]`), boş ve sonuçsuz kollar atlanır;
    `v2[@etiket]` kolunun referansı `v1[@etiket]`'tir. Sıra: modül (studio, atolye) → araç → kol adı. */
export function collectArms(flowDir: string): ArmRow[] {
  const rows: ArmRow[] = [];
  for (const mod of ["studio", "atolye"]) {
    for (const tool of alt(path.join(flowDir, mod))) {
      for (const arm of alt(path.join(flowDir, mod, tool))) {
        if (arm.startsWith("controls")) continue;
        const r = readJsonl<ResultRow>(path.join(flowDir, mod, tool, arm, "results.jsonl"));
        if (!r.length) continue;
        const ref = refOf(arm);
        rows.push({ tool: `${mod}/${tool}`, arm, s: armSummary(r), ...(ref ? { ref } : {}) });
      }
    }
  }
  return rows;
}
