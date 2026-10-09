// apps/hub/evals/tools/studio/articulation/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { countSentences, frac, lower, mean, str } from "../../../lib/sharedChecks";

export type Level = "isolated" | "syllable" | "word" | "sentence" | "contextual";
export interface ArticulationBody {
  targetSounds: string[];
  positions: Array<"initial" | "medial" | "final">;
  level: Level;
  itemCount: number;
}

/** toolHandler scrubDeep hatası: öğrenci seçiliyken banka kelimeleri enrichContent'e ulaşmaz (word → items: [],
    sentence/contextual → modelin kelimeleri). Düzeltme gelince false yap; referanslar yeniden değerlendirilir. */
export const BANKA_STASH_KAYBI = true;
const BANKA_DUZEYLERI = new Set<Level>(["word", "sentence", "contextual"]);

/* Yardımcılar (letterOf, stems, containsWord, syllabify, keepsFinalPosition) eski evals/articulation/checks.ts ile
   birebir aynıdır (ünlü kümesi düzeltme işaretli â/î/û dahil). */
const VOWELS = new Set([..."aeıioöuüâîû"]);

export function letterOf(sound: string): string {
  return lower(sound.replace(/\//g, "").trim());
}

/** Türkçe ek almış hâlleri de yakalayan gövde adayları (kitap→kitab-ı, ağaç→ağac-ı, burun→burn-u). */
export function stems(word: string): string[] {
  const w = lower(word).trim();
  const out = new Set([w]);
  if (w.length >= 3) {
    const last = w.at(-1)!;
    const base = w.slice(0, -1);
    const soft: Record<string, string> = { p: "b", ç: "c", t: "d", k: "ğ" };
    if (soft[last]) out.add(base + soft[last]);
    if (last === "k" && base.endsWith("n")) out.add(base + "g");
    if (VOWELS.has(last) && base.length >= 3) out.add(base);
    if (!VOWELS.has(last) && VOWELS.has(w.at(-2)!) && w.length >= 5) out.add(w.slice(0, -2) + last);
  }
  return [...out].filter((s) => s.length >= 3 || s === w);
}

export function containsWord(text: string, word: string): boolean {
  const t = lower(text);
  return stems(word).some((s) => t.includes(s));
}

/** Türkçe heceleme (kural tabanlı): iki ünlü arasındaki son ünsüz sonraki heceye geçer (ka-pı, türk-çe, sa-at). */
export function syllabify(word: string): string[] {
  const chars = [...lower(word).replace(/[^\p{L}]/gu, "")];
  const vowels = chars.flatMap((ch, i) => (VOWELS.has(ch) ? [i] : []));
  if (vowels.length <= 1) return [chars.join("")];
  const cuts = vowels.slice(0, -1).map((v, k) => {
    const next = vowels[k + 1]!;
    return next - v - 1 === 0 ? next : next - 1;
  });
  const out: string[] = [];
  let start = 0;
  for (const cut of cuts) {
    out.push(chars.slice(start, cut).join(""));
    start = cut;
  }
  out.push(chars.slice(start).join(""));
  return out;
}

/** Sonda hedeflenen kelime cümlede EKSİZ (ya da ünsüzle başlayan ekle bile değil) tam kelime olarak mı geçiyor? */
export function keepsFinalPosition(text: string, word: string): boolean {
  const w = lower(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<!\\p{L})${w}(?!\\p{L})`, "u").test(lower(text));
}

type Rec = Record<string, unknown>;
const items = (o: Rec | null) => (Array.isArray(o?.items) ? (o!.items as Rec[]) : []);
/** Hece/örnek kelime karşılaştırması için yalın biçim: tr-TR küçük harf; tire, en/em tire, boşluk ve kesme atılır
    ("a-şa" → "aşa", "dağ’ı" → "dağı"). */
const yalin = (s: string) => lower(s).replace(/[-–—\s'’‘]/gu, "");
/** Hece türü etiketi "açık" ya da "kapalı" İÇERİYOR mu (bileşik "açık–kapalı", "kapalı hece" de kabul; "yarım" değil). */
const HECE_TURU = /açık|kapalı/u;

/** Artikülasyona özgü kontroller (fabrikanın `checks` imzası + `ogrencili`). JSON geçerliliği, dil kuralı, rumuz ve
    yasak kalıp `studioAdapter`da ortaktır. `ogrencili` adaptörden gelir (öğrencisiz istekte rumuz yoktur). */
export function articulationChecks(args: { body: ArticulationBody; output: unknown; raw: Rec | null; text: string; ogrencili?: boolean }): ToolCheckOut {
  const { body } = args;
  const output = (args.output ?? null) as Rec | null;
  const its = items(output);
  const n = its.length;
  const letters = body.targetSounds.map(letterOf);
  const hard: string[] = [];
  const bankaKaybi = BANKA_STASH_KAYBI && args.ogrencili === true && BANKA_DUZEYLERI.has(body.level);
  const bosBeklenir = bankaKaybi && body.level === "word";
  if (output && n === 0 && !bosBeklenir) hard.push("oge_yok");

  const hedefHarf = n ? frac(its, (i) => letters.some((l) => lower(str(i.word)).includes(l))) : bosBeklenir ? 1 : 0;
  const ogeSayisi = bosBeklenir ? 1 : BANKA_DUZEYLERI.has(body.level) ? (n >= 1 ? 1 : 0) : n >= body.itemCount - 1 && n <= body.itemCount + 1 ? 1 : 0;
  const alanlar = mean([
    str(output?.title).trim() ? 1 : 0,
    str(output?.expertNotes).trim() ? 1 : 0,
    Array.isArray(output?.cueTypes) && (output!.cueTypes as unknown[]).length ? 1 : 0,
    str(output?.homeGuidance).trim() ? 1 : 0,
  ]);
  const scores: Record<string, number> = { oge_sayisi: ogeSayisi, hedef_harf: hedefHarf, alanlar };
  const details: ToolCheckOut["details"] = { oge: n, banka_kaybi: bankaKaybi ? 1 : 0 };

  if (body.level === "syllable") {
    scores.hece_turu = n ? frac(its, (i) => HECE_TURU.test(lower(str(i.syllableType)))) : 0;
    scores.ornek_kelime = n
      ? frac(its, (i) => {
          const hece = yalin(str(i.word));
          return hece !== "" && yalin(str(i.exampleWord)).includes(hece);
        })
      : 0;
  }
  if (body.level === "sentence" || body.level === "contextual") {
    scores.cumle_kelime = n ? frac(its, (i) => containsWord(str(i.sentence), str(i.word))) : 0;
    if (body.positions.includes("final") && body.positions.length === 1) {
      scores.sonda_eksiz = n ? frac(its, (i) => keepsFinalPosition(str(i.sentence), str(i.word))) : 0;
    }
  }
  if (body.level === "contextual") scores.paragraf = n ? frac(its, (i) => countSentences(str(i.sentence)) >= 3) : 0;

  const talimat = output ? mean(Object.values(scores)) : 0;
  return { scores: { ...scores, talimat }, details: { ...details, ...scores }, hard };
}
