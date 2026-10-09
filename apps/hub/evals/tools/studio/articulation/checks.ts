// apps/hub/evals/tools/studio/articulation/checks.ts
import { articulation } from "@ludenlab/ai";
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { fnv1a, mulberry32 } from "../../../lib/seed";
import { countSentences, frac, lower, mean, str } from "../../../lib/sharedChecks";

export type Level = "isolated" | "syllable" | "word" | "sentence" | "contextual";
export interface ArticulationBody {
  targetSounds: string[];
  positions: Array<"initial" | "medial" | "final">;
  level: Level;
  itemCount: number;
}

/** toolHandler scrubDeep hatası: öğrenci seçiliyken banka kelimeleri enrichContent'e ulaşmaz (word → items: [],
    sentence/contextual → modelin kelimeleri). Prompt kelimeleri yine listeler; yalnız sistem sonradan yeniden yazmaz.
    Düzeltme gelince false yap; art-07/09 referansları yeniden üretilir (bkz. `banka_kaybi_tutarsiz`). */
export const BANKA_STASH_KAYBI = true;
export const BANKA_DUZEYLERI: ReadonlySet<Level> = new Set<Level>(["word", "sentence", "contextual"]);

/** Eval tohumu: route'un seçim argümanları (1A düzeneği ve gerçek Sonnet 4.6 referanslarıyla aynı). Adaptörün
    `seedKey`i ve `bankaKelimeleri` bunu kullanır. */
export const bankaTohumu = (b: Pick<ArticulationBody, "targetSounds" | "positions" | "itemCount">) =>
  JSON.stringify([b.targetSounds, b.positions, b.itemCount]);

/** Route'un `pickBankWords`'ünün aynası (src/app/studio/api/tools/articulation/route.ts) + eval tohumu: o vakada
    route'un seçeceği banka kelimeleri, sırasıyla. Banka düzeyi değilse ya da seslerden biri bankada yoksa []. Saf:
    kendi üretecini kullanır, Math.random akımına dokunmaz. */
export function bankaKelimeleri(body: ArticulationBody): string[] {
  if (!BANKA_DUZEYLERI.has(body.level) || body.targetSounds.length === 0) return [];
  if (!body.targetSounds.every((s) => articulation.WORD_BANK[articulation.soundToLetter(s)])) return [];
  const rng = mulberry32(fnv1a(bankaTohumu(body)));
  return articulation.selectWordsMulti(articulation.WORD_BANK, body.targetSounds, body.positions, body.itemCount, rng).map((w) => w.word);
}

/* Yardımcılar (letterOf, stems, containsWord, syllabify, keepsFinalPosition) eski evals/articulation/checks.ts
   (@4ed4864) ile birebir aynıdır (ünlü kümesi düzeltme işaretli â/î/û dahil). */
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
const harfler = (s: string) => lower(s).replace(/[^\p{L}]/gu, "");
const acik = (hece: string) => VOWELS.has(hece.at(-1)!);

/** Hece türü etiketi DOĞRU mu? Etiketteki "açık"/"kapalı" sözcükleri sırasıyla okunur (yoksa yanlış: "yarım",
    "tekrar"). Açık = ünlüyle, kapalı = ünsüzle biter.
    - Tek etiket: `word` tire/boşlukla parçalanır, hedef harfi taşıyan parça (yoksa ilk) yargılanır ("a-şa" → "şa").
    - Bileşik etiket ("açık–kapalı", "kapalı–açık", "açık–açık"): parçalar etiket sırasıyla eşleşmeli; parça sayısı
      etiket sayısına eşit olmalı. `word` tek parça yazılmışsa `syllabify` ile hecelenir ("şapka" → şap-ka). */
export function heceTuruDogru(word: string, label: string, letters: string[]): boolean {
  const etiketler = lower(label).match(/açık|kapalı/gu) ?? [];
  if (!etiketler.length) return false;
  let parcalar = lower(word).split(/[-–—\s]+/u).map(harfler).filter(Boolean);
  if (!parcalar.length) return false;
  if (etiketler.length === 1) {
    const hece = parcalar.find((p) => letters.some((l) => p.includes(l))) ?? parcalar[0]!;
    return (etiketler[0] === "açık") === acik(hece);
  }
  if (parcalar.length === 1) parcalar = syllabify(parcalar[0]!);
  return parcalar.length === etiketler.length && etiketler.every((e, k) => (e === "açık") === acik(parcalar[k]!));
}

const ayniKelimeler = (its: Rec[], bank: string[]) =>
  its.length === bank.length && its.every((i, k) => lower(str(i.word)) === lower(bank[k]!));

/** Artikülasyona özgü kontroller (fabrikanın `checks` imzası + `ogrencili`). JSON geçerliliği, dil kuralı, rumuz ve
    yasak kalıp `studioAdapter`da ortaktır. `ogrencili` adaptörden gelir (öğrencisiz istekte rumuz yoktur).

    Route modelin öğelerini sonradan işler (hedef harfsiz öğeyi eler; bankalı düzeylerde kelimeyi bankayla yazar, kelime
    düzeyinde öğeleri bankadan kurar). Modelin hatası son içerikte görünmeyebileceği için `hedef_harf`, `oge_sayisi`,
    `items_bos` ve `banka_uyumu` modelin HAM JSON'undan (`raw`; çözülemezse 0) puanlanır; `cumle_kelime`, `sonda_eksiz`,
    `paragraf`, hece puanları ve `alanlar` uzmanın gördüğü son içerikten. */
export function articulationChecks(args: { body: ArticulationBody; output: unknown; raw: Rec | null; text: string; ogrencili?: boolean }): ToolCheckOut {
  const { body, raw } = args;
  const output = (args.output ?? null) as Rec | null;
  const its = items(output);
  const n = its.length;
  const ham = items(raw);
  const nHam = ham.length;
  const letters = body.targetSounds.map(letterOf);
  const bank = bankaKelimeleri(body);
  const bankali = bank.length > 0;
  /** Kelime düzeyi + banka: model öğe ÜRETMEZ ("items": [] talimatı), öğeleri sistem bankadan kurar. */
  const kelimeBankasi = bankali && body.level === "word";
  const bankaKaybi = BANKA_STASH_KAYBI && args.ogrencili === true && bankali;
  /** Bilinen ürün hatası: öğrencili kelime düzeyinde son içerik boş kalır. */
  const bosBeklenir = bankaKaybi && body.level === "word";
  const hard: string[] = [];
  if (output && n === 0 && !bosBeklenir) hard.push("oge_yok");
  // Bayat bayrak: öğrencili kelime düzeyinde son içerik bankayla dolmuşsa ürün düzeltmesi gelmiştir. O zaman
  // BANKA_STASH_KAYBI false yapılmalı ve hatalı davranışla üretilmiş art-07/09 referansları yeniden üretilmelidir.
  // (Modelin kendi öğeleri — talimata uymaması — bu bayrağı tetiklemez; onu `items_bos` cezalandırır.)
  if (bosBeklenir && n > 0 && ayniKelimeler(its, bank)) hard.push("banka_kaybi_tutarsiz");

  const harfli = (i: Rec) => letters.some((l) => lower(str(i.word)).includes(l));
  const scores: Record<string, number> = {};
  if (kelimeBankasi) {
    scores.items_bos = raw && Array.isArray(raw.items) && nHam === 0 ? 1 : 0;
    scores.hedef_harf = !raw ? 0 : nHam ? frac(ham, harfli) : 1;
  } else {
    // Bankalı cümle/bağlam: banka istenenden kısa olabilir → en az bir öğe yeter. Diğerleri: istenen sayıya oran.
    scores.oge_sayisi = !raw ? 0 : bankali ? (nHam >= 1 ? 1 : 0) : Math.min(1, nHam / body.itemCount);
    scores.hedef_harf = raw && nHam ? frac(ham, harfli) : 0;
  }
  scores.alanlar = mean([
    str(output?.title).trim() ? 1 : 0,
    str(output?.expertNotes).trim() ? 1 : 0,
    Array.isArray(output?.cueTypes) && (output!.cueTypes as unknown[]).some((c) => str(c).trim()) ? 1 : 0,
    str(output?.homeGuidance).trim() ? 1 : 0,
  ]);
  const details: ToolCheckOut["details"] = { oge: n, oge_ham: nHam, banka: bank.length, banka_kaybi: bankaKaybi ? 1 : 0 };

  if (body.level === "syllable") {
    const ses = (i: Rec) => (str(i.targetSound) ? [letterOf(str(i.targetSound))] : letters);
    scores.hece_turu = n ? frac(its, (i) => heceTuruDogru(str(i.word), str(i.syllableType), ses(i))) : 0;
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
    // Prompt listeyi AYNI SIRADA verir; ham kelimeler sırasıyla bankayla karşılaştırılır (±1 öğe tolerans).
    if (bankali) {
      scores.banka_uyumu =
        !raw || Math.abs(nHam - bank.length) > 1 ? 0 : bank.filter((w, k) => lower(str(ham[k]?.word)) === lower(w)).length / bank.length;
    }
  }
  if (body.level === "contextual") {
    scores.paragraf = n
      ? frac(its, (i) => {
          const c = countSentences(str(i.sentence));
          return c >= 3 && c <= 5;
        })
      : 0;
  }

  const talimat = output ? mean(Object.values(scores)) : 0;
  return { scores: { ...scores, talimat }, details: { ...details, ...scores }, hard };
}
