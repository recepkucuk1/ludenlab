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
/** `accuracy` değeri: metin ("%75") ya da sayı (75). Kontrol ve hakem çizimi aynı yardımcıyı kullanır. */
export const accuracyMetni = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "");

/** Hedef/ölçüt başlığı normalizasyonu: tr-TR küçük harf; tire/kesme/tırnak türleri birleşir; boşluklar tek; sondaki noktalama atılır. */
const baslikNorm = (s: string) =>
  lower(s)
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\u2018\u2019\u201B\u02BC`´]/g, "'")
    .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')
    .replace(/\s+/g, " ")
    .replace(/[\s.,;:!?…]+$/u, "")
    .trim();

/* Uydurma-yüzde muafiyeti (DAR): yalnız serbest metin alanlarında ve yalnız sayıya BİTİŞİK ifadelerle; `accuracy`
   alanında hiçbir muafiyet yoktur. Genel "hedef" sözcüğü muaf tutmaz ("bu hedefte %75", "Hedefe yönelik … %90").
   Bitişik = hedef sözcüğü sayıdan önce/sonra en çok bir kısa sözcük (≤ 12 karakter, noktalama yok) arayla gelir. */
const KISA = String.raw`(?:[^\s.!?;:,]{1,12}\s+)?`;
const bitisikOnce = (kelime: string) => new RegExp(String.raw`(?<!\p{L})(?:${kelime})\p{L}*:?\s+${KISA}$`, "u");
const bitisikSonra = (kelime: string) => new RegExp(String.raw`^\s*${KISA}(?:${kelime})\p{L}*`, "u");
const HEDEFLI_ONCE = bitisikOnce("hedeflen|ölçüt|kriter");
const HEDEFLI_SONRA = bitisikSonra("hedeflen|ölçüt|kriter");
const HEDEF_YALIN = /(?<!\p{L})hedef(?:i|imiz)?\s*:?\s*$/u; // "hedef %70", "hedefi %70", "hedefimiz %70": sayı hemen arkada
/** Yalnız HEDEF/KİP biçimleri muaf: "%85'e ulaşması bekleniyor", "%90'a ulaşılabilir", "%90 doğruluğa ulaşması hedeflenir".
    BAŞARI iddiaları ("%90'a ulaştı", "ulaştığı görüldü") muaf değildir. Sayıyla `ulaş…` arasında en çok bir kısa
    sözcük olur (`KISA`; "'a" eki de böyle bir sözcük sayılır). */
const ULASMA = new RegExp(String.raw`^\s*${KISA}ulaş(?:ma(?:sı|k|yı|ya)|ıl(?:ma|abil)|abil)`, "u");
/** Sayıdan hemen sonra gelen "doğrulukla / başarıyla / ile / 'la / 'le" bir PERFORMANS iddiasıdır ("%90 doğrulukla
    tamamladı"): hedef ya da ölçüt sözcüğü yakında olsa da hiçbir muafiyet tanınmaz. */
const BASARI_ISARETI = /^\s*(?:doğrulukla|başarıyla|ile(?!\p{L})|['’](?:la|le)(?!\p{L}))/u;
const ORTALAMA_ONCE = bitisikOnce("ortalama");
const ORTALAMA_SONRA = bitisikSonra("ortalama");
const KESIT = 10;

export function sessionSummaryChecks(args: { body: SessionSummaryBody; output: unknown; raw?: Rec | null; text?: string; alias?: string | null }): ToolCheckOut {
  const { body } = args;
  const output = args.output && typeof args.output === "object" && !Array.isArray(args.output) ? (args.output as Rec) : null;
  const perf = kayitlar(output?.goalPerformance);
  const hard: string[] = [];
  if (output && perf.length === 0) hard.push("hedef_yok");
  const hedefSayisi = perf.length === body.goals.length ? 1 : 0;

  // Veri sadakati: her girilen hedefin yüzdesi ve ipucu düzeyi DOĞRU hedefin satırında. Model hedefleri yeniden
  // sıralayabilir ama veriyi başka hedefe taşıyamaz: satır önce TAM BAŞLIKLA bulunur (normalize; tam eşitlik, yoksa
  // iki yönlü içerme; yalnız TEK eşleşme geçerli). Başlıkla bulunamayan hedefler, başlıkla ZATEN ATANMIŞ satırlar
  // atlanarak kalan satırlarla sırayla eşlenir (hiçbir başlık eşleşmezse bu düz konumdur: i. hedef = i. satır).
  const satirAdlari = perf.map((p) => ({ p, ad: baslikNorm(str(p.goal)) }));
  const satirUyar = (g: SessionSummaryBody["goals"][number], p: Rec) => {
    const acc = accuracyMetni(p.accuracy);
    const accOk = yuzdeBul(acc, true).some((h) => h.v === g.accuracy) || (g.accuracy === 0 && lower(acc).includes("değerlendir"));
    return accOk && lower(str(p.cueLevel)).includes(lower(g.cueLevel));
  };
  /** Hedefin başlıkla bulunan tek satırının dizini; yoksa -1. */
  const baslikSatiri = (g: SessionSummaryBody["goals"][number]): number => {
    const baslik = baslikNorm(g.goalTitle);
    if (!baslik) return -1;
    const indeksler = (ok: (ad: string) => boolean) => satirAdlari.flatMap((x, k) => (ok(x.ad) ? [k] : []));
    const tam = indeksler((ad) => ad === baslik);
    if (tam.length === 1) return tam[0]!;
    if (tam.length > 0) return -1;
    const ice = indeksler((ad) => ad.length >= 3 && baslik.length >= 3 && (ad.includes(baslik) || baslik.includes(ad)));
    return ice.length === 1 ? ice[0]! : -1;
  };
  const baslikla = body.goals.map(baslikSatiri);
  const atanmis = new Set(baslikla.filter((k) => k >= 0));
  const kalanSatirlar = perf.flatMap((_, k) => (atanmis.has(k) ? [] : [k]));
  let sonraki = 0;
  const veriSadakati = mean(
    body.goals.map((g, i) => {
      const k = baslikla[i]! >= 0 ? baslikla[i]! : kalanSatirlar[sonraki++];
      const p = k === undefined ? undefined : perf[k];
      return p && satirUyar(g, p) ? 1 : 0;
    }),
  );

  // Uydurma yüzde: yalnız sayısal iddia taşıyan alanlar taranır (hedef satırı `accuracy` + `analysis`, genel
  // değerlendirme, veli notu); girilmemiş bir yüzde uydurmadır. Muafiyet yalnız serbest metinde ve dardır (yukarıda);
  // "ortalama" yalnız sayı girilen yüzdelerin ortalamasının taban/yuvarlama/tavanıysa muaf tutar.
  const girilen = new Set(body.goals.map((g) => g.accuracy));
  const ort = mean(body.goals.map((g) => g.accuracy));
  const ortalamalar = new Set([Math.floor(ort), Math.round(ort), Math.ceil(ort)]);
  const muaf = (t: string, h: Bulgu): boolean => {
    const once = lower(t.slice(Math.max(0, h.at - 40), h.at));
    const sonra = lower(t.slice(h.at + h.len, h.at + h.len + 40));
    if (BASARI_ISARETI.test(sonra)) return false;
    if (HEDEF_YALIN.test(once) || ULASMA.test(sonra) || HEDEFLI_ONCE.test(once) || HEDEFLI_SONRA.test(sonra)) return true;
    return ortalamalar.has(h.v) && (ORTALAMA_ONCE.test(once) || ORTALAMA_SONRA.test(sonra));
  };
  const alanlari: Array<{ t: string; serbest: boolean }> = [
    ...perf.flatMap((p) => [
      { t: accuracyMetni(p.accuracy), serbest: false },
      { t: str(p.analysis), serbest: true },
    ]),
    { t: str(output?.overallAssessment), serbest: true },
    { t: str(output?.parentNote), serbest: true },
  ];
  const uydurma: string[] = [];
  for (const { t, serbest } of alanlari) {
    for (const h of yuzdeBul(t, !serbest)) {
      if (girilen.has(h.v) || (serbest && muaf(t, h))) continue;
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
