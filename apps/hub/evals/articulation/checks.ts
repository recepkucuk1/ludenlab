/* Otomatik (ücretsiz) kontroller. Her ölçüt 0–1 arası; model-bağımsız ürün davranışı ölçülmez.

   Girdi: vakanın isteği, uygulamanın kullanıcıya döndürdüğü son içerik (`drill`) ve modelin HAM
   metni. Ham metin şart: route, hedef harfi içermeyen öğeleri sessizce eler ve kelime düzeyinde
   modelin öğelerini bankayla ezer — son içeriğe bakan bir kontrol modelin hatasını göremez. */

export interface CaseBody {
  targetSounds: string[];
  positions: string[];
  level: string;
  itemCount: number;
}

type Item = Record<string, unknown>;

const VOWELS = new Set([..."aeıioöuüâîû"]);
const lower = (s: string) => s.toLocaleLowerCase("tr-TR");
const str = (v: unknown) => (typeof v === "string" ? v : "");
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const frac = <T>(xs: T[], ok: (x: T) => boolean) => (xs.length ? xs.filter(ok).length / xs.length : 0);

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

export function countSentences(text: string): number {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 2).length;
}

/** Modelin ham metninden JSON (route'taki extractJson ile aynı kural). */
export function parseRaw(raw: string): Record<string, unknown> | null {
  const m = raw.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ?? raw.match(/(\{[\s\S]*\})/);
  if (!m) return null;
  try {
    return JSON.parse(m[1] ?? m[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function notesFields(d: Record<string, unknown>): number {
  return mean([
    str(d.title).trim() ? 1 : 0,
    str(d.expertNotes).trim() ? 1 : 0,
    Array.isArray(d.cueTypes) && d.cueTypes.some((c) => str(c).trim()) ? 1 : 0,
    str(d.homeGuidance).trim() ? 1 : 0,
  ]);
}

function itemLetters(it: Item, body: CaseBody): string[] {
  const own = str(it.targetSound);
  return own ? [letterOf(own)] : body.targetSounds.map(letterOf);
}

function positionOk(example: string, letter: string, position: string): boolean {
  const w = lower(example);
  if (position === "initial") return w.startsWith(letter);
  if (position === "final") return w.endsWith(letter);
  if (position === "medial") return w.slice(1, -1).includes(letter);
  return true;
}

export interface CheckResult {
  talimat: number;
  dil_kurali: number;
  rumuz_yok: number;
  details: Record<string, number | string | boolean>;
}

export function runChecks(args: {
  body: CaseBody;
  drill: Record<string, unknown> | null;
  rawText: string;
  alias: string | null;
}): CheckResult {
  const { body, drill, rawText, alias } = args;
  const raw = parseRaw(rawText);
  const rawItems = (Array.isArray(raw?.items) ? raw!.items : []) as Item[];
  const finalItems = (Array.isArray(drill?.items) ? drill!.items : []) as Item[];
  const details: CheckResult["details"] = {};
  let talimat = 0;

  if (!drill || !raw) {
    talimat = 0;
    details.not = "içerik yok ya da JSON çözülemedi";
  } else if (body.level === "isolated") {
    const letterFrac = frac(rawItems, (it) => itemLetters(it, body).some((l) => lower(str(it.word)).includes(l)));
    const countRatio = Math.min(1, rawItems.length / body.itemCount);
    Object.assign(details, { ogeler: rawItems.length, hedef_harf: letterFrac, sayi_orani: countRatio });
    talimat = mean([letterFrac, countRatio]);
  } else if (body.level === "syllable") {
    const letterFrac = frac(rawItems, (it) => itemLetters(it, body).some((l) => lower(str(it.word)).includes(l)));
    const typeFrac = frac(rawItems, (it) => {
      const seg = lower(str(it.word)).split(/[-\s]+/).filter(Boolean).at(-1) ?? "";
      const type = lower(str(it.syllableType));
      if (!seg || !type) return false;
      const open = VOWELS.has(seg.at(-1)!);
      return open ? type.startsWith("açık") : type.startsWith("kapalı");
    });
    const exampleFrac = frac(rawItems, (it) => {
      const syl = lower(str(it.word)).split(/[-\s]+/).filter(Boolean)[0] ?? "";
      const ex = lower(str(it.exampleWord));
      return !!syl && syllabify(ex).includes(syl) && itemLetters(it, body).some((l) => ex.includes(l));
    });
    const withPos = rawItems.filter((it) => str(it.position) && str(it.exampleWord));
    const posFrac = withPos.length
      ? frac(withPos, (it) => itemLetters(it, body).some((l) => positionOk(str(it.exampleWord), l, str(it.position))))
      : null;
    const countRatio = Math.min(1, rawItems.length / body.itemCount);
    Object.assign(details, {
      ogeler: rawItems.length,
      hedef_harf: letterFrac,
      hece_turu: typeFrac,
      ornek_kelime: exampleFrac,
      ...(posFrac === null ? {} : { pozisyon: posFrac }),
      sayi_orani: countRatio,
    });
    talimat = mean([letterFrac, typeFrac, exampleFrac, ...(posFrac === null ? [] : [posFrac]), countRatio]);
  } else if (body.level === "word") {
    const itemsEmpty = Array.isArray(raw.items) && rawItems.length === 0 ? 1 : 0;
    const fields = notesFields(drill);
    Object.assign(details, { items_bos: itemsEmpty, not_alanlari: fields, gereksiz_oge: rawItems.length });
    talimat = mean([itemsEmpty, fields]);
  } else if (body.level === "sentence") {
    const sentenceFrac = frac(finalItems, (it) => !!str(it.sentence).trim() && containsWord(str(it.sentence), str(it.word)));
    const finals = finalItems.filter((it) => str(it.position) === "final");
    const finalFrac = finals.length ? frac(finals, (it) => keepsFinalPosition(str(it.sentence), str(it.word))) : null;
    const fields = notesFields(drill);
    Object.assign(details, {
      cumlede_kelime: sentenceFrac,
      ...(finalFrac === null ? {} : { sonda_korunuyor: finalFrac }),
      not_alanlari: fields,
      ogeler: finalItems.length,
    });
    talimat = mean([sentenceFrac, ...(finalFrac === null ? [] : [finalFrac]), fields]);
  } else if (body.level === "contextual") {
    const paraFrac = frac(finalItems, (it) => {
      const n = countSentences(str(it.sentence));
      return n >= 3 && n <= 4;
    });
    const wordFrac = frac(finalItems, (it) => containsWord(str(it.sentence), str(it.word)));
    const finals = finalItems.filter((it) => str(it.position) === "final");
    const finalFrac = finals.length ? frac(finals, (it) => keepsFinalPosition(str(it.sentence), str(it.word))) : null;
    const fields = notesFields(drill);
    Object.assign(details, {
      paragraf_3_4: paraFrac,
      paragrafta_kelime: wordFrac,
      ...(finalFrac === null ? {} : { sonda_korunuyor: finalFrac }),
      not_alanlari: fields,
    });
    talimat = mean([paraFrac, wordFrac, ...(finalFrac === null ? [] : [finalFrac]), fields]);
  }

  const text = rawText;
  const hasta = (text.match(/(?<!\p{L})hasta/giu) ?? []).length;
  const terapist = (text.match(/(?<!\p{L})terapist/giu) ?? []).length;
  const odul = (text.match(/(?<!\p{L})(ödül|çıkartma|puan tablosu|yıldız tablosu)/giu) ?? []).length;
  Object.assign(details, { hasta, terapist, odul_bahsi: odul });
  const dil_kurali = hasta + terapist === 0 ? 1 : 0;

  const rumuz_yok = alias && drill ? (JSON.stringify(drill).includes(alias) ? 0 : 1) : 1;
  return { talimat, dil_kurali, rumuz_yok, details };
}
