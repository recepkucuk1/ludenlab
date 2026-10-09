// apps/hub/evals/tools/studio/session-summary/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { countSentences, kayitlar, lower, mean, str } from "../../../lib/sharedChecks";

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

interface Bulgu {
  v: number;
  at: number;
  len: number;
}
const YUZDE = /%\s?(\d{1,3})|(\d{1,3})\s?%/g;
/** Metindeki yüzdeler: "%60" ve "60 %" biçimleri. `yalin`: yüzde işareti hiç yoksa çıplak sayılar da sayılır
    (yalnız `accuracy` alanı için; model sayı olarak da yazmış olabilir). */
function yuzdeBul(t: string, yalin = false): Bulgu[] {
  const hits = [...t.matchAll(YUZDE)].map((m) => ({ v: Number(m[1] ?? m[2]), at: m.index ?? 0, len: m[0].length }));
  if (hits.length || !yalin) return hits;
  return [...t.matchAll(/\d{1,3}(?:[.,]\d+)?/g)].map((m) => ({ v: Number(m[0].replace(",", ".")), at: m.index ?? 0, len: m[0].length }));
}
/** `accuracy` değeri: metin ("%75") ya da sayı (75). */
const accuracyMetni = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "");

/** Bu yüzdelerin çevresindeki 30 karakterde hedef/ölçüt sözcüğü varsa o yüzde uzmanın verisi değil, bir ölçüt ya da
    hedeftir ("%80 başarı ölçütü", "hedef %70"): uydurma sayılmaz. */
const PENCERE = 30;
const OLCUT = /hedef|ölçüt|hedeflen|kriter|ortalama/u;
const KESIT = 10;

export function sessionSummaryChecks(args: { body: SessionSummaryBody; output: unknown; raw?: Rec | null; text?: string; alias?: string | null }): ToolCheckOut {
  const { body } = args;
  const output = args.output && typeof args.output === "object" && !Array.isArray(args.output) ? (args.output as Rec) : null;
  const perf = kayitlar(output?.goalPerformance);
  const hard: string[] = [];
  if (output && perf.length === 0) hard.push("hedef_yok");
  const hedefSayisi = perf.length === body.goals.length ? 1 : 0;

  // Veri sadakati: her girilen hedefin yüzdesi ve ipucu düzeyi DOĞRU hedefin satırında. Prompt sırayı korur →
  // satır sayısı eşitse konumla (i. hedef = i. satır); değilse hedef adının ilk 12 karakterini içeren satırlarla.
  const konumlu = perf.length === body.goals.length;
  const satirUyar = (g: SessionSummaryBody["goals"][number], p: Rec) => {
    const acc = accuracyMetni(p.accuracy);
    const accOk = yuzdeBul(acc, true).some((h) => h.v === g.accuracy) || (g.accuracy === 0 && lower(acc).includes("değerlendir"));
    return accOk && lower(str(p.cueLevel)).includes(lower(g.cueLevel));
  };
  const satirlar = (g: SessionSummaryBody["goals"][number], i: number): Rec[] => {
    if (konumlu) return perf[i] ? [perf[i]!] : [];
    const anahtar = lower(g.goalTitle).trim().slice(0, 12);
    return anahtar ? perf.filter((p) => lower(str(p.goal)).includes(anahtar)) : [];
  };
  const veriSadakati = mean(body.goals.map((g, i) => (satirlar(g, i).some((p) => satirUyar(g, p)) ? 1 : 0)));

  // Uydurma yüzde: yalnız uzmana/veliye dönük sayısal iddia alanları taranır (hedef satırı `accuracy` + `analysis`,
  // genel değerlendirme, veli notu); girilmemiş bir yüzde (ölçüt/hedef bağlamı hariç) uydurmadır.
  const girilen = new Set(body.goals.map((g) => g.accuracy));
  const alanlari: Array<{ t: string; yalin: boolean }> = [
    ...perf.flatMap((p) => [
      { t: accuracyMetni(p.accuracy), yalin: true },
      { t: str(p.analysis), yalin: false },
    ]),
    { t: str(output?.overallAssessment), yalin: false },
    { t: str(output?.parentNote), yalin: false },
  ];
  const uydurma: string[] = [];
  for (const { t, yalin } of alanlari) {
    for (const h of yuzdeBul(t, yalin)) {
      if (girilen.has(h.v)) continue;
      const pencere = lower(t.slice(Math.max(0, h.at - PENCERE), h.at + h.len + PENCERE));
      if (OLCUT.test(pencere)) continue;
      uydurma.push(`${h.v} («${t.slice(Math.max(0, h.at - KESIT), h.at + h.len + KESIT).replace(/\s+/g, " ").trim()}»)`);
    }
  }
  // Çıktı yoksa "uydurma yok" kanıtlanamaz: 0.
  const uydurmaYuzde = output && !uydurma.length ? 1 : 0;

  // Oturum bilgisi: üründeki sessionInfo, girilen süre (dakika) ve tarihle (gün + yıl) tutarlı.
  const info = (output?.sessionInfo && typeof output.sessionInfo === "object" ? output.sessionInfo : {}) as Rec;
  const sayiVar = (t: string, n: string) => new RegExp(`(?<!\\d)0?${n}(?!\\d)`).test(t);
  const sure = sayiVar(str(info.duration), String(Number(body.duration))) ? 1 : 0;
  const tarih = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(body.sessionDate);
  const gunYil = tarih ? (sayiVar(str(info.date), String(Number(tarih[3]))) && sayiVar(str(info.date), tarih[1]!) ? 1 : 0) : null;
  const oturumBilgisi = mean(gunYil === null ? [sure] : [sure, gunYil]);

  const alanlar = mean(["title", "overallAssessment", "nextSessionPlan", "parentNote", "expertNotes"].map((k) => (str(output?.[k]).trim() ? 1 : 0)));
  const veliNotuCumle = countSentences(str(output?.parentNote));
  const veliNotu = veliNotuCumle >= 3 && veliNotuCumle <= 5 ? 1 : 0;
  const scores = { hedef_sayisi: hedefSayisi, veri_sadakati: veriSadakati, uydurma_yuzde: uydurmaYuzde, oturum_bilgisi: oturumBilgisi, alanlar, veli_notu: veliNotu };
  return {
    scores: { ...scores, talimat: output ? mean(Object.values(scores)) : 0 },
    details: { ...scores, veli_notu_cumle: veliNotuCumle, uydurma: uydurma.join(" | ") },
    hard,
  };
}
