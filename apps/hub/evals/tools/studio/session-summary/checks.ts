// apps/hub/evals/tools/studio/session-summary/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { countSentences, frac, lower, mean, metinler, str } from "../../../lib/sharedChecks";

export interface SessionSummaryBody {
  sessionDate: string;
  duration: "20" | "30" | "40" | "45" | "60";
  sessionType: "individual" | "group" | "assessment" | "parent_meeting";
  goals: Array<{ goalId: string; goalTitle: string; accuracy: number; cueLevel: string }>;
  overallPerformance: "above_target" | "on_target" | "progressing" | "needs_support" | "not_assessed";
  behaviorNotes?: string;
  nextSessionNotes?: string;
}
type Rec = Record<string, unknown>;
const yuzdeler = (s: string) => [...s.matchAll(/%\s?(\d{1,3})|(\d{1,3})\s?%/g)].map((m) => Number(m[1] ?? m[2]));

/** Dizi değilse boş; nesne olmayan öğe (null, metin) boş nesne sayılır — kontroller çökmesin, öğe sayısı korunsun. */
const recs = (v: unknown): Rec[] => (Array.isArray(v) ? v : []).map((x) => (x && typeof x === "object" ? (x as Rec) : {}));

export function sessionSummaryChecks(args: { body: SessionSummaryBody; output: Rec | null; raw: Rec | null; text: string; alias: string | null }): ToolCheckOut {
  const { body, output } = args;
  const perf = recs(output?.goalPerformance);
  const hard: string[] = [];
  if (output && perf.length === 0) hard.push("hedef_yok");
  const hedefSayisi = perf.length === body.goals.length ? 1 : 0;
  // Her girilen hedef için: aynı yüzde ve aynı ipucu düzeyi (küçük harf, içerme) taşıyan bir satır var mı?
  const veriSadakati = frac(body.goals, (g) =>
    perf.some((p) => yuzdeler(str(p.accuracy)).includes(g.accuracy) && lower(str(p.cueLevel)).includes(lower(g.cueLevel))),
  );
  const girilen = new Set(body.goals.map((g) => g.accuracy));
  const ciktidaki = output ? yuzdeler(metinler(output).join(" ")) : [];
  const uydurma = ciktidaki.filter((y) => !girilen.has(y));
  const uydurmaYuzde = uydurma.length ? 0 : 1;
  const alanlar = mean(["title", "overallAssessment", "nextSessionPlan", "parentNote", "expertNotes"].map((k) => (str(output?.[k]).trim() ? 1 : 0)));
  const veliNotuCumle = countSentences(str(output?.parentNote));
  const veliNotu = veliNotuCumle >= 3 && veliNotuCumle <= 5 ? 1 : 0;
  const scores = { hedef_sayisi: hedefSayisi, veri_sadakati: veriSadakati, uydurma_yuzde: uydurmaYuzde, alanlar, veli_notu: veliNotu };
  return {
    scores: { ...scores, talimat: output ? mean(Object.values(scores)) : 0 },
    details: { ...scores, veli_notu_cumle: veliNotuCumle, uydurma: uydurma.join("|") },
    hard,
  };
}
