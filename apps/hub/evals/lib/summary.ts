// apps/hub/evals/lib/summary.ts
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { TOOL_IDS } from "../tools/registry";
import { readJsonl } from "./core";
import { mean } from "./sharedChecks";

/* Araç × kol özet tablosu. Girdi: koşturucunun yazdığı `results.jsonl` satırları (`runner.ts` → `appendJsonl(resultsPath, …)`).
   Çıktı: Markdown. Karar etiketleri spec B6 (üç koşul: win, sert kontroller, token; DÖRDÜNCÜ koşul "kör oy aleyhte değil" tabloda YOK).

   İlkeler (etiket karar anında yanlış olmasın):
   1. VAKA BAZLI toplama: satırlar `prompt_id`'ye göre gruplanır; vakanın win'i = tekrarların ortalaması, sert hatası = tekrarlar boyunca
      NEDEN KÜMESİ, token'ı = ortalama. Kol puanı vaka ortalamalarının ortalamasıdır (çok tekrarlı vaka kolu ezmez).
   2. Karşılaştırma iki kolun ORTAK vaka kimlikleri üzerindedir (kol kendi vakalarının bir kısmını koştuysa elmayla armut kıyaslanmaz).
   3. Sert hata gerilemesi NEDEN BAZLI (spec: "sert kontroller gerilemez"): her neden için aday oranı ≤ taban oranı; `rumuz_sizintisi` /
      `pii` sınıfı neden adayda varsa KABUL ADAYI HİÇBİR ZAMAN verilmez.
   4. KAPSAM: kolun sonuç verdiği vaka sayısı beklenen kümeye (taban/referans vakaları ∪ aracın cases.json'u) eşit değilse etiket verilmez
      ("eksik kapsam"); eksik vakalar tablonun altında nedenleriyle (bekliyor / hata / koşulmadı) listelenir.
   5. Referans: sonuç satırındaki `ref` (koşturucunun kullandığı `refKey`) esastır; satırda yoksa dizin adından çıkarılır, uyuşmazlık bildirilir. */

export interface ResultRow {
  prompt_id: string;
  rep: number;
  grade?: Record<string, number>;
  hard_fail?: string[];
  out_tokens?: number | null;
  status?: string;
  usage_estimated?: boolean;
  /** Koşturucunun bu satırı karşılaştırdığı referans kol (`refKey`: baseline, baseline@r2, v1, …). */
  ref?: string;
  explanation?: Record<string, string>;
  meta?: { judge_orders?: number };
}

/** Token değerlerinin kaynağı: tümü alt-ajan tahmini, tümü gerçek, ikisi karışık, hiç kayıt yok. */
export type TokenKind = "tahmini" | "gercek" | "karisik" | "yok";

export interface CaseAgg {
  id: string;
  /** Bu vakanın sonuç satırı (tekrar) sayısı. */
  reps: number;
  /** Sonuç satırı olan tekrar numaraları (sıralı; eksik tekrar tespiti için). */
  repIds: number[];
  win: number;
  talimat: number;
  /** Tekrarlar boyunca sert hata nedenleri (küme, sıralı). */
  reasons: string[];
  /** Tekrarların ortalama çıktı token'ı; kayıtlı token yoksa null. */
  tokens: number | null;
  truncated: number;
  /** En düşük win'li tekrarın `explanation.win` ilk satırı. */
  explanation: string;
}

export interface ArmSummary {
  /** Vaka sayısı (benzersiz `prompt_id`). */
  n: number;
  /** Toplam sonuç satırı (vaka × tekrar). */
  satir: number;
  tekrarMin: number;
  tekrarMax: number;
  win: number;
  /** En az bir sert hata içeren VAKA sayısı. */
  hard: number;
  /** Neden → o nedenle sert hata alan VAKA sayısı. */
  hardReasons: Record<string, number>;
  talimat: number;
  /** Vaka ortalamalarının ortalaması; hiç kayıtlı token yoksa null. */
  out_tokens: number | null;
  tokenKind: TokenKind;
  /** Kesilen (`status: "truncated"`) SATIR sayısı. */
  truncated: number;
  /** Hakem sırası sayısı (satırların `meta.judge_orders`'ının en büyüğü; yoksa 1): win granülerliği için. */
  orders: number;
  cases: CaseAgg[];
}

export interface ArmRow {
  tool: string;
  arm: string;
  s: ArmSummary;
  /** Kolun karşılaştırıldığı kol: satırlardaki `ref`; yoksa dizin adından çıkarım. Yoksa `refOf`/`baseOf` kullanılır. */
  ref?: string;
  /** Kayıtlı ref dizin çıkarımıyla uyuşmuyorsa: "ref uyumsuz: satır v1@r2, dizin v1". */
  refNote?: string;
  /** Satırlar kendi içinde farklı referanslarla koşmuş. */
  refMixed?: boolean;
  /** Referans kolun results'ı yok ama `ref/` dosyaları var (artikülasyon: gerçek Sonnet 4.6 referansları). */
  refOnly?: boolean;
  /** Beklenen vaka kimlikleri (kapsam paydası; aracın cases.json'u, çözülmezse referans kolun vakaları). Verilirse karar yalnız bu vakalar
      üzerinden verilir (cases.json dışındaki eski kimlikler, ör. yeniden adlandırılmış vakalar, kapsamı ve kararı etkilemez).
      Verilmezse: kolun kendi vakaları ∪ referans kolun vakaları. */
  expected?: string[];
  /** Eksik vaka → neden ("bekliyor (üretim)", "hata: tool_parse", "koşulmadı"). */
  whyMissing?: Record<string, string>;
  /** Eksik tekrar ("<vaka> rep<n>") → neden; yalnız kolun tekrar sayıları eşit değilse. */
  whyMissingReps?: Record<string, string>;
}

const KABUL_WIN = 0.65;
const KABUL_TOKEN = 1.2;
const HAIKU_WIN = 0.4;
/** Aday kolda varsa KABUL ADAYI'nı her zaman engelleyen sert hata nedenleri (çocuk adı sızıntısı sınıfı). */
const HER_ZAMAN_ENGEL = /rumuz_sizinti|pii/;

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const firstLine = (s: unknown): string => (typeof s === "string" ? (s.split("\n").find((l) => l.trim()) ?? "").trim() : "");

function tokenKindOf(rows: ResultRow[]): TokenKind {
  const withTokens = rows.filter((r) => typeof r.out_tokens === "number" && Number.isFinite(r.out_tokens));
  if (!withTokens.length) return "yok";
  const est = withTokens.filter((r) => r.usage_estimated === true).length;
  return est === withTokens.length ? "tahmini" : est === 0 ? "gercek" : "karisik";
}

export function armSummary(rows: ResultRow[]): ArmSummary {
  const grouped = new Map<string, ResultRow[]>();
  for (const r of rows) grouped.set(r.prompt_id, [...(grouped.get(r.prompt_id) ?? []), r]);
  const cases: CaseAgg[] = [...grouped.entries()]
    .sort(([a], [b]) => byId(a, b))
    .map(([id, rs]) => {
      const tok = rs.map((r) => r.out_tokens).filter((t): t is number => typeof t === "number" && Number.isFinite(t));
      const lowest = rs.reduce((m, r) => ((r.grade?.win ?? 0) < (m.grade?.win ?? 0) ? r : m), rs[0]!);
      return {
        id,
        reps: rs.length,
        repIds: [...new Set(rs.map((r) => r.rep))].sort((a, b) => a - b),
        win: mean(rs.map((r) => r.grade?.win ?? 0)),
        talimat: mean(rs.map((r) => r.grade?.talimat ?? 0)),
        reasons: [...new Set(rs.flatMap((r) => r.hard_fail ?? []))].sort(),
        tokens: tok.length ? mean(tok) : null,
        truncated: rs.filter((r) => r.status === "truncated").length,
        explanation: firstLine(lowest.explanation?.win),
      };
    });
  const hardReasons: Record<string, number> = {};
  for (const c of cases) for (const neden of c.reasons) hardReasons[neden] = (hardReasons[neden] ?? 0) + 1;
  const tokens = cases.map((c) => c.tokens).filter((t): t is number => t !== null);
  const reps = cases.map((c) => c.reps);
  return {
    n: cases.length,
    satir: rows.length,
    tekrarMin: reps.length ? Math.min(...reps) : 0,
    tekrarMax: reps.length ? Math.max(...reps) : 0,
    win: mean(cases.map((c) => c.win)),
    hard: cases.filter((c) => c.reasons.length).length,
    hardReasons,
    talimat: mean(cases.map((c) => c.talimat)),
    out_tokens: tokens.length ? mean(tokens) : null,
    tokenKind: tokenKindOf(rows),
    truncated: cases.reduce((a, c) => a + c.truncated, 0),
    orders: Math.max(1, ...rows.map((r) => r.meta?.judge_orders ?? 1)),
    cases,
  };
}

const head = (arm: string) => arm.split("@")[0]!;
const tag = (arm: string) => arm.split("@")[1];

/** v2 kolunun referansı: `v2` → `v1`, `v2@r2` → `v1@r2` (EVAL_REF=v1[@etiket] ile koşulmuş olmalı). Başka kolun referansı yok. */
export function refOf(arm: string): string | undefined {
  return head(arm) === "v2" ? arm.replace(/^v2/, "v1") : undefined;
}

/** Bir kolun "tabana göre" karşılaştırıldığı taban kol: etiketli kol önce kendi turunun tabanına (`baseline@r2`), o yoksa etiketsiz
    `baseline`'a göre ölçülür; yeniden koşulan taban (`baseline@r2`) ilk tabana göre. Etiketsiz baseline'ın tabanı yok. */
export function baseOf(arm: string, arms: string[]): string | undefined {
  if (arm === "baseline") return undefined;
  const t = tag(arm);
  if (head(arm) !== "baseline" && t && arms.includes(`baseline@${t}`)) return `baseline@${t}`;
  return arms.includes("baseline") ? "baseline" : undefined;
}

/** Dizin adından çıkarılan referans (satırda `ref` yoksa ya da uyuşmazlık denetiminde): v2 → v1[@etiket], v1 → baseline[@etiket], baseline → yok. */
function inferRef(arm: string, arms: string[]): string | undefined {
  const h = head(arm);
  if (h === "v2") return refOf(arm);
  if (h === "v1") return baseOf(arm, arms);
  return undefined;
}

const f2 = (x: number) => x.toFixed(2);
const fmtTr = (x: number) => String(Math.round(x * 1000) / 1000).replace(".", ",");
const delta = (a: number, b: number) => `${a - b >= 0 ? "+" : ""}${Math.round(((a - b) / b) * 100)}%`;
const cell = (s: string) => s.replace(/\|/g, "\\|");

/** "dil_kurali: 3/4, rumuz_yok: 1/4" (çoktan aza, eşitlikte ada göre); neden yoksa "—". */
function nedenler(s: ArmSummary): string {
  const e = Object.entries(s.hardReasons).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return e.length ? e.map(([k, v]) => `${cell(k)}: ${v}/${s.n}`).join(", ") : "—";
}

function tekrarMetni(s: ArmSummary): string {
  if (!s.n) return "0";
  return `${s.n}×${s.tekrarMin === s.tekrarMax ? s.tekrarMin : `${s.tekrarMin}–${s.tekrarMax}`}`;
}

function tokenMetni(s: ArmSummary): string {
  if (s.out_tokens === null) return "—";
  const sonek = s.tokenKind === "tahmini" ? "~" : s.tokenKind === "karisik" ? "~?" : "";
  return `${Math.round(s.out_tokens)}${sonek}`;
}

/** Ortak vakalarla kısıtlanmış kol ölçüleri. */
interface Sub {
  n: number;
  win: number;
  hard: number;
  reasons: Record<string, number>;
  tokens: number | null;
}
function restrict(s: ArmSummary, ids: ReadonlySet<string>): Sub {
  const cs = s.cases.filter((c) => ids.has(c.id));
  const reasons: Record<string, number> = {};
  for (const c of cs) for (const k of c.reasons) reasons[k] = (reasons[k] ?? 0) + 1;
  const tok = cs.map((c) => c.tokens).filter((t): t is number => t !== null);
  return { n: cs.length, win: mean(cs.map((c) => c.win)), hard: cs.filter((c) => c.reasons.length).length, reasons, tokens: tok.length ? mean(tok) : null };
}
function ortak(a: ArmSummary, b: ArmSummary): Set<string> {
  const bs = new Set(b.cases.map((c) => c.id));
  return new Set(a.cases.filter((c) => bs.has(c.id)).map((c) => c.id));
}

/** Token karşılaştırması: hücre metni, bütçe sorunu (varsa) ve oran. Kaynak türleri (tahmini/gerçek) farklıysa ya da karışıksa kıyas YOK. */
function tokenKarsilastir(cand: ArmSummary, candSub: Sub, base: ArmSummary, baseSub: Sub): { cell: string; problem: string | null } {
  if (candSub.tokens === null) return { cell: "—", problem: "aday token yok" };
  if (baseSub.tokens === null || baseSub.tokens === 0) return { cell: "—", problem: "taban token yok" };
  if (cand.tokenKind !== base.tokenKind || cand.tokenKind === "karisik") {
    return { cell: "karşılaştırılamaz (~/gerçek)", problem: "bütçe karşılaştırılamaz (~/gerçek)" };
  }
  const d = delta(candSub.tokens, baseSub.tokens);
  return { cell: d, problem: candSub.tokens <= baseSub.tokens * KABUL_TOKEN + 1e-9 ? null : `bütçe ${d}` };
}

/** Sert hata: neden bazlı gerileme (aday oranı > taban oranı; ortak vakalarda payda aynı → sayı karşılaştırması) ve her zaman engelleyen nedenler. */
function sertHataSorunu(cand: Sub, base: Sub | null): string | null {
  const girdiler: string[] = [];
  for (const [neden, sayi] of Object.entries(cand.reasons).sort((a, b) => a[0].localeCompare(b[0]))) {
    const taban = base?.reasons[neden] ?? 0;
    const geriledi = base !== null && sayi > taban;
    const engel = HER_ZAMAN_ENGEL.test(neden);
    if (geriledi) girdiler.push(`${neden} +${sayi - taban}/${cand.n}${engel ? " (her zaman engel)" : ""}`);
    else if (engel) girdiler.push(`${neden} ${sayi}/${cand.n} (her zaman engel)`);
  }
  return girdiler.length ? `sert hata: ${girdiler.join(", ")}` : null;
}

interface Kapsam {
  total: number;
  covered: number;
  missing: string[];
}
function kapsamOf(r: ArmRow, refRow: ArmRow | undefined): Kapsam {
  const own = new Set(r.s.cases.map((c) => c.id));
  const expected = [...new Set(r.expected ?? [...own, ...(refRow?.s.cases.map((c) => c.id) ?? [])])].sort(byId);
  const missing = expected.filter((id) => !own.has(id));
  return { total: expected.length, covered: expected.length - missing.length, missing };
}

/** Beklenen kümedeki (verildiyse) vakalar. */
function sinirla(r: ArmRow, ids: Set<string>): Set<string> {
  if (!r.expected) return ids;
  const beklenen = new Set(r.expected);
  return new Set([...ids].filter((id) => beklenen.has(id)));
}

/** Tekrar sayıları eşit değilse (vaka başına satır sayısı farklı) eksik tekrar metni; yoksa null. Tüm tekrarlar 0..en çok−1 aralığında beklenir;
    neden `whyMissingReps`'ten ("koşulmadı" varsayılan). Uzun listeler 3 öğeye kısaltılır. */
function eksikTekrarMetni(r: ArmRow): string | null {
  if (r.s.tekrarMin >= r.s.tekrarMax) return null;
  const beklenen = r.expected ? new Set(r.expected) : null;
  const ogeler: string[] = [];
  for (const c of r.s.cases) {
    if (beklenen && !beklenen.has(c.id)) continue;
    if (c.reps >= r.s.tekrarMax) continue;
    const eksik = Array.from({ length: r.s.tekrarMax }, (_, n) => n).filter((n) => !c.repIds.includes(n));
    if (!eksik.length) ogeler.push(`${c.id} (tekrar sayısı ${c.reps}/${r.s.tekrarMax})`);
    for (const n of eksik) ogeler.push(`${c.id} rep${n} (${r.whyMissingReps?.[`${c.id} rep${n}`] ?? "koşulmadı"})`);
  }
  if (!ogeler.length) return null;
  return ogeler.length > 3 ? `${ogeler.slice(0, 3).join(", ")}, +${ogeler.length - 3}` : ogeler.join(", ");
}

/** Spec B6 karar etiketi. `base`: v1'in karşılaştırıldığı kol; `refRow`: v2'nin referansı. */
function karar(r: ArmRow, effRef: string | undefined, base: ArmRow | undefined, cov: Kapsam, baseCov: Kapsam | null): string {
  const v = head(r.arm);
  const tekrar = eksikTekrarMetni(r);
  if (v !== "v1" && v !== "v2") return cov.missing.length ? `eksik kapsam ${cov.covered}/${cov.total}` : tekrar ? `eksik tekrar ${tekrar}` : "";
  const not = r.refNote ? ` · ${r.refNote}` : "";
  if (r.refMixed) return `ref karışık (satırlar farklı referansla koşmuş)${not}`;
  // Referansın TÜRÜ yanlışsa (v1 taban dışında, v2 v1 dışında bir kola karşı ölçülmüş) win başka bir şeyi ölçer: etiket yok.
  // Yalnız etiket farkı (v1@r2 ↔ baseline) not düşer, etiketi engellemez.
  const beklenenTur = v === "v1" ? "baseline" : "v1";
  if (effRef && head(effRef) !== beklenenTur) {
    const t = tag(r.arm);
    return `referans ${beklenenTur} değil (${effRef}) — EVAL_REF=${beklenenTur}${t ? `@${t}` : ""} ile yeniden koş${not}`;
  }
  if (cov.missing.length) return `eksik kapsam ${cov.covered}/${cov.total}${not}`;
  if (tekrar) return `eksik tekrar ${tekrar}${not}`;
  const refAdi = effRef ?? (v === "v1" ? "baseline" : "v1");
  const winTamam = (esik: number, w: number) => (w >= esik ? "win tamam" : "win yetersiz");

  if (v === "v1") {
    if (!base) {
      if (r.refOnly) {
        // Referans yalnız dosya olarak var (sonuç satırı yok): yalnız win ölçülebilir; sert hata/token tabanı bilinmiyor.
        const engel = sertHataSorunu(restrict(r.s, sinirla(r, new Set(r.s.cases.map((c) => c.id)))), null);
        return `${winTamam(KABUL_WIN, r.s.win)}; ${engel ? `${engel}; ` : ""}taban sert hata/token bilinmiyor${not}`;
      }
      return `${refAdi} yok${not}`;
    }
    if (baseCov && baseCov.missing.length) return `taban eksik kapsam ${baseCov.covered}/${baseCov.total}${not}`;
    const tabanTekrar = eksikTekrarMetni(base);
    if (tabanTekrar) return `taban eksik tekrar ${tabanTekrar}${not}`;
    const ids = sinirla(r, ortak(r.s, base.s));
    if (!ids.size) return `ortak vaka yok${not}`;
    const c = restrict(r.s, ids);
    const b = restrict(base.s, ids);
    if (c.win < KABUL_WIN) return `—${not}`;
    const sorunlar = [sertHataSorunu(c, b), tokenKarsilastir(r.s, c, base.s, b).problem].filter((x): x is string => x !== null);
    return sorunlar.length ? `win tamam; ${sorunlar.join("; ")}${not}` : `KABUL ADAYI${not}`;
  }

  // v2: referansa (v1) göre win ≥ 0,40 ve TÜM vakalarda sıfır sert hata.
  const refRow = base;
  if (!refRow && !r.refOnly) return `referans ${refAdi} yok${not}`;
  if (refRow && baseCov && baseCov.missing.length) return `taban eksik kapsam ${baseCov.covered}/${baseCov.total}${not}`;
  const refTekrar = refRow ? eksikTekrarMetni(refRow) : null;
  if (refTekrar) return `taban eksik tekrar ${refTekrar}${not}`;
  const ids = sinirla(r, refRow ? ortak(r.s, refRow.s) : new Set(r.s.cases.map((c) => c.id)));
  if (!ids.size) return `ortak vaka yok${not}`;
  const c = restrict(r.s, ids);
  if (c.win < HAIKU_WIN) return `—${not}`;
  const sert = c.hard > 0 ? `sert hata: ${Object.entries(c.reasons).sort((a, b) => a[0].localeCompare(b[0])).map(([k, n]) => `${k} ${n}/${c.n}`).join(", ")}` : null;
  return sert ? `${winTamam(HAIKU_WIN, c.win)}; ${sert}${not}` : `HAIKU ADAYI${not}`;
}

/** Win granülerliği: kol win'i `0,5 / (hakem sırası × satır)` adımlarıyla değişir; eşiğe ulaşan en küçük değer. */
function granulerlik(rows: ArmRow[]): string[] {
  const satirlar = new Map<string, string>();
  const v2Var = rows.some((r) => head(r.arm) === "v2");
  for (const r of rows) {
    if (head(r.arm) === "baseline" || !r.s.satir) continue;
    const step = 0.5 / (r.s.orders * r.s.satir);
    const ulasilan = (esik: number) => Math.ceil(esik / step - 1e-9) * step;
    const esikler = `≥${fmtTr(KABUL_WIN)} pratikte ≥${fmtTr(ulasilan(KABUL_WIN))}${v2Var ? `, ≥${fmtTr(HAIKU_WIN)} pratikte ≥${fmtTr(ulasilan(HAIKU_WIN))}` : ""}`;
    const metin = `${r.s.n} vaka × ${r.s.tekrarMin === r.s.tekrarMax ? r.s.tekrarMin : `${r.s.tekrarMin}–${r.s.tekrarMax}`} tekrar × ${r.s.orders} sıra: win ${fmtTr(step)} adımlarla değişir; ${esikler}.`;
    satirlar.set(metin, metin);
  }
  return [...satirlar.values()];
}

export function renderSummary(rows: ArmRow[]): string {
  const byTool = new Map<string, ArmRow[]>();
  for (const r of rows) byTool.set(r.tool, [...(byTool.get(r.tool) ?? []), r]);
  const out = [
    "| Araç | Kol | n | kapsam | win | sert hata | sert hata (neden) | talimat | çıktı token | tabana göre | kesilen | karar |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  const eksikler: string[] = [];
  const ayrinti: string[] = [];
  for (const [tool, arms] of byTool) {
    const adlar = arms.map((a) => a.arm);
    const kol = (ad: string | undefined) => (ad ? arms.find((a) => a.arm === ad) : undefined);
    for (const r of arms) {
      const h = head(r.arm);
      // Karşılaştırılan kol: satırdaki ref (esas), yoksa dizin çıkarımı. "tabana göre" sütunu v2 ve yeniden koşulan tabanlar için baseline ailesine göredir.
      const effRef = h === "baseline" ? undefined : (r.ref ?? inferRef(r.arm, adlar));
      const refRow = kol(effRef);
      const cov = kapsamOf(r, refRow);
      const baseCov = refRow ? kapsamOf(refRow, undefined) : null;
      const tabanRow = h === "v1" ? (effRef && head(effRef) === "baseline" ? refRow : undefined) : kol(baseOf(r.arm, adlar));
      let tabana = "—";
      if (tabanRow && r.arm !== tabanRow.arm) {
        const ids = ortak(r.s, tabanRow.s);
        if (ids.size) tabana = tokenKarsilastir(r.s, restrict(r.s, ids), tabanRow.s, restrict(tabanRow.s, ids)).cell;
      }
      out.push(
        `| ${tool} | ${r.arm} | ${tekrarMetni(r.s)} | ${cov.covered}/${cov.total} | ${f2(r.s.win)} | ${r.s.hard}/${r.s.n} | ${nedenler(r.s)} | ${f2(r.s.talimat)} | ${tokenMetni(r.s)} | ${tabana} | ${r.s.truncated} | ${karar(r, effRef, refRow, cov, baseCov)} |`,
      );
      if (cov.missing.length) {
        eksikler.push(`- ${tool} ${r.arm}: ${cov.missing.map((id) => `${id} (${r.whyMissing?.[id] ?? "koşulmadı"})`).join(", ")}`);
      }
      const tekrarEksik = eksikTekrarMetni(r);
      if (tekrarEksik) eksikler.push(`- ${tool} ${r.arm}: eksik tekrar ${tekrarEksik}`);
      if (h !== "baseline") {
        ayrinti.push(
          "",
          `#### ${tool} · ${r.arm}`,
          "",
          "| Vaka | tekrar | win | sert hata | win gerekçesi (ilk satır) |",
          "|---|---|---|---|---|",
          ...r.s.cases.map((c) => `| ${c.id} | ${c.reps} | ${f2(c.win)} | ${c.reasons.length ? cell(c.reasons.join(", ")) : "—"} | ${c.explanation ? cell(c.explanation.length > 200 ? `${c.explanation.slice(0, 199)}…` : c.explanation) : "—"} |`),
        );
      }
    }
  }
  out.push("");
  if (eksikler.length) out.push("Eksik kapsam (sonuç satırı olmayan vaka/tekrarlar; etiket verilmedi):", ...eksikler, "");
  out.push(
    "`~` = alt-ajan tahmini token (chars/3,2); `~?` = tahmini ve gerçek token karışık; mutlak maliyet iddiası YOK, yalnız kollar arası göreli karşılaştırma (tahmini ile gerçek token kıyaslanmaz).",
    "Vaka bazlı toplama: tekrarlar vaka içinde birleşir (win/token ortalaması, sert hata = neden kümesi); `n` = vakalar×tekrar; `sert hata` = en az bir sert hata içeren VAKA; karar ORTAK vakalar üzerinden ve yalnız kapsam %100 iken verilir.",
    "Kör oy (spec B6 dördüncü koşul: kullanıcının kör oyu aleyhte değil) bu tabloda YOK; KABUL ADAYI ilk üç koşulun özetidir.",
    ...granulerlik(rows),
  );
  if (ayrinti.length) out.push("", "### Vaka ayrıntısı (aday kollar)", ...ayrinti);
  return out.join("\n");
}

/* ── Akış dizininden toplama ── */

/** Kol dizin adı: `baseline|v1|v2` + isteğe bağlı `@etiket`. (`controls[@etiket]` hakem kontrolleridir, kol değildir.) */
export const KOL_ADI = /^(baseline|v1|v2)(@[A-Za-z0-9._-]+)?$/;

const alt = (dir: string) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort()
    : [];

/** Aracın cases.json vaka kimlikleri; araç kayıt defterinde değilse ya da dosya yoksa null (beklenen küme taban/referanstan çıkarılır). */
export function varsayilanVakalar(tool: string): string[] | null {
  if (!TOOL_IDS.includes(tool)) return null;
  const file = path.resolve(import.meta.dirname, "../tools", tool, "cases.json");
  if (!existsSync(file)) return null;
  try {
    const cases = JSON.parse(readFileSync(file, "utf8")) as Array<{ id?: unknown }>;
    return cases.flatMap((c) => (typeof c.id === "string" ? [c.id] : []));
  } catch {
    return null;
  }
}

export interface CollectOpts {
  /** Araç → beklenen vaka kimlikleri (varsayılan: kayıt defteri + cases.json). */
  casesFor?: (tool: string) => string[] | null;
  /** Kol adı geçersiz dizinler (`controls*` sessizce atlanır, bildirilmez). */
  onSkip?: (relPath: string, neden: string) => void;
}

function modeOf(xs: string[]): string | undefined {
  const sayac = new Map<string, number>();
  for (const x of xs) sayac.set(x, (sayac.get(x) ?? 0) + 1);
  return [...sayac.entries()].sort((a, b) => b[1] - a[1] || byId(a[0], b[0]))[0]?.[0];
}

/** Kolun `pending.json`'ı (bekliyor) ve `errors.jsonl`'ı (hata sınıfı) → eksik vaka/tekrar nedeni. Anahtar `<vaka>:<tekrar>`. */
function nedenleriOku(armDir: string): { bekleyen: Map<string, string>; hatalar: Map<string, string> } {
  const bekleyen = new Map<string, string>();
  try {
    const p = JSON.parse(readFileSync(path.join(armDir, "pending.json"), "utf8")) as Array<{ key?: unknown; role?: unknown }>;
    for (const row of Array.isArray(p) ? p : []) {
      const m = typeof row.key === "string" ? /^(.*?)_rep(\d+)/.exec(row.key) : null;
      if (m) bekleyen.set(`${m[1]}:${m[2]}`, row.role === "judge" ? "bekliyor (hakem)" : "bekliyor (üretim)");
    }
  } catch {
    /* pending.json yok ya da bozuk: bekleyen yok */
  }
  const hatalar = new Map<string, string>();
  for (const e of readJsonl<{ prompt_id?: unknown; rep?: unknown; failure_class?: unknown }>(path.join(armDir, "errors.jsonl"))) {
    if (typeof e.prompt_id !== "string") continue;
    hatalar.set(`${e.prompt_id}:${typeof e.rep === "number" ? e.rep : 0}`, `hata: ${typeof e.failure_class === "string" ? e.failure_class : "error"}`);
  }
  return { bekleyen, hatalar };
}

/** Eksik VAKALARIN nedeni (herhangi bir tekrarın bekleyeni/hatası): önce bekliyor, sonra hata, yoksa "koşulmadı". */
function eksikNedenleri(armDir: string, ids: string[]): Record<string, string> {
  const { bekleyen, hatalar } = nedenleriOku(armDir);
  const bul = (m: Map<string, string>, id: string) => [...m.entries()].filter(([k]) => k.startsWith(`${id}:`)).at(-1)?.[1];
  return Object.fromEntries(ids.map((id) => [id, bul(bekleyen, id) ?? bul(hatalar, id) ?? "koşulmadı"]));
}

/** Eksik TEKRARLARIN nedeni (`<vaka> rep<n>` → neden): o tekrarın bekleyeni, hatası; yoksa "koşulmadı". */
function eksikTekrarNedenleri(armDir: string, eksik: Array<{ id: string; rep: number }>): Record<string, string> {
  const { bekleyen, hatalar } = nedenleriOku(armDir);
  return Object.fromEntries(eksik.map(({ id, rep }) => [`${id} rep${rep}`, bekleyen.get(`${id}:${rep}`) ?? hatalar.get(`${id}:${rep}`) ?? "koşulmadı"]));
}

/** `<flow>/<modül>/<araç>/<kol>/results.jsonl` → kol özetleri. Sonuçsuz kollar atlanır; ref (satırdaki `ref`, yoksa dizin adı), beklenen vaka
    kümesi ve eksik vakaların nedeni de çıkarılır. Sıra: modül (studio, atolye) → araç → kol adı. */
export function collectArms(flowDir: string, opts: CollectOpts = {}): ArmRow[] {
  const casesFor = opts.casesFor ?? varsayilanVakalar;
  const rows: ArmRow[] = [];
  for (const mod of ["studio", "atolye"]) {
    for (const toolName of alt(path.join(flowDir, mod))) {
      const tool = `${mod}/${toolName}`;
      const toolDir = path.join(flowDir, mod, toolName);
      const adlar: string[] = [];
      for (const arm of alt(toolDir)) {
        if (KOL_ADI.test(arm)) adlar.push(arm);
        else if (!arm.startsWith("controls")) opts.onSkip?.(`${tool}/${arm}`, "kol adı geçersiz (baseline|v1|v2[@etiket])");
      }
      const sonuc = new Map<string, ResultRow[]>();
      for (const arm of adlar) {
        const rs = readJsonl<ResultRow>(path.join(toolDir, arm, "results.jsonl")).filter((r) => typeof r?.prompt_id === "string");
        if (rs.length) sonuc.set(arm, rs);
      }
      const beklenenCases = casesFor(tool);
      for (const arm of adlar) {
        const rs = sonuc.get(arm);
        if (!rs) continue;
        const s = armSummary(rs);
        const h = head(arm);
        const kayitli = rs.map((r) => r.ref).filter((x): x is string => typeof x === "string" && x !== "");
        const cikarim = inferRef(arm, adlar);
        const row: ArmRow = { tool, arm, s };
        // Beklenen küme: kayıtlı araçta YALNIZ cases.json (yeniden adlandırılan vakanın eski kimliği kapsamı sonsuza dek engellemesin);
        // cases.json çözülmezse (kayıtsız araç) referans kolun vakaları (sonuç satırları ve ref/ dosyaları), baseline kolunda kendi vakaları.
        const casesJson = beklenenCases?.length ? beklenenCases : null;
        let refKimlikleri: string[] = [];
        if (h !== "baseline") {
          const ref = modeOf(kayitli) ?? cikarim;
          if (ref) row.ref = ref;
          if (new Set(kayitli).size > 1) row.refMixed = true;
          const kayitliRef = modeOf(kayitli);
          if (kayitliRef && cikarim && kayitliRef !== cikarim) row.refNote = `ref uyumsuz: satır ${kayitliRef}, dizin ${cikarim}`;
          if (ref) {
            refKimlikleri = [...(sonuc.get(ref)?.map((r) => r.prompt_id) ?? []), ...readRefFiles(path.join(toolDir, ref, "ref"))];
            if (!sonuc.has(ref) && refKimlikleri.length) row.refOnly = true;
          }
        }
        const own = s.cases.map((c) => c.id);
        const expected = casesJson ?? (refKimlikleri.length ? refKimlikleri : own);
        row.expected = [...new Set(expected)].sort(byId);
        const armDir = path.join(toolDir, arm);
        const eksik = row.expected.filter((id) => !own.includes(id));
        if (eksik.length) row.whyMissing = eksikNedenleri(armDir, eksik);
        if (s.tekrarMin < s.tekrarMax) {
          const beklenen = new Set(row.expected);
          const eksikTekrar = s.cases
            .filter((c) => beklenen.has(c.id) && c.reps < s.tekrarMax)
            .flatMap((c) => Array.from({ length: s.tekrarMax }, (_, n) => n).filter((n) => !c.repIds.includes(n)).map((rep) => ({ id: c.id, rep })));
          if (eksikTekrar.length) row.whyMissingReps = eksikTekrarNedenleri(armDir, eksikTekrar);
        }
        rows.push(row);
      }
    }
  }
  return rows;
}

/** `<kol>/ref/` altındaki vaka dosyaları (dondurulmuş referanslar; dosya adı = vaka kimliği). */
function readRefFiles(dir: string): string[] {
  return existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isFile())
        .map((d) => d.name)
    : [];
}
