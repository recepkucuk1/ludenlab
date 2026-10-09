// apps/hub/evals/lib/markdown.ts
import { TASLAK_NOTU } from "@atolye/lib/bep";
import { lower } from "./sharedChecks";

/* Markdown çıktılı (Atölye) araçların ortak yapı yardımcıları: başlıklar, maddeler, ölçüt/tanı kalıpları,
   taslak-notu karşılaştırması ve jenerik aday. BEP kontrolünden taşındı; BEP'e özgü alt bölüm adları
   (kardeş başlık listesi) burada değil `bulletsUnder`ın parametresidir, geri kalan kod BEP'tekiyle aynıdır.
   Büyük/küçük harf sözleşmesi: `OLCUT`, `TANI` ve `bulletsUnder`ın `re`si tr-TR küçük harfe indirilmiş metinde
   çalışır (çağıran `lower()` uygular); başlıklar `basligiNormalle` ile zaten küçük harfe indirilir. */

/* ── Markdown yapısı: başlıklar ve maddeler (modelin biçim seçiminden bağımsız) ── */

export interface Section {
  /** tr-TR küçük harf; `-`/`_` boşluğa, çoklu boşluk teke indirilmiş; `**`, numara ve sondaki `:` atılmış. */
  heading: string;
  level: 2 | 3 | 4 | "bold";
  /** Başlıktan sonraki satırlar (bir sonraki başlığa kadar), ham. */
  lines: string[];
}

const DIYEZ_BASLIK = /^(#{2,4})\s+(.+?)\s*#*\s*$/;
/** Yalnız kalın metinden oluşan satır (`**Kısa dönem hedefler**`, `3. **Kısa dönem hedefler:**`).
    İçi cümle sonu noktalamasıyla bitiyorsa başlık sayılmaz: tamamı kalın yazılmış hedef cümlesi
    (`1. **Verilen 10 heceyi %80 doğrulukla okur.**`) madde olarak kalır. */
const KALIN_BASLIK = /^\s*(?:\d+[.)]\s*)?\*\*([^*]+)\*\*:?\s*$/;
export const MADDE = /^(\s*)([-*+•]|\d+[.)])\s+(.*)$/;
export const TABLO = /^\s*\|/;
/** GFM tablo ayracı: yalnız `|`, `:`, `-`, boşluk; en az bir `-`. */
export const AYRAC = /^\s*\|?[\s|:-]*-[\s|:-]*$/;

/** Başlık metnini normalleştirir (`Section.heading` bu değerdir): `**`/`__` atılır, tr-TR küçük harf, baştaki
    numara (`1.`, `2)`) atılır, `-`/`_` boşluğa, çoklu boşluk teke indirilir, sondaki `:` atılır. */
export const basligiNormalle = (s: string) =>
  lower(s.replace(/\*\*|__/g, ""))
    .replace(/^\s*\d+[.)]\s*/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*:\s*$/, "")
    .trim();

/** Satır bir başlık mı? Öyleyse düzeyi ve normalleştirilmiş metni. */
export function baslikMi(line: string): { heading: string; level: Section["level"] } | null {
  const d = DIYEZ_BASLIK.exec(line);
  if (d) return { heading: basligiNormalle(d[2]!), level: d[1]!.length as 2 | 3 | 4 };
  const k = KALIN_BASLIK.exec(line);
  if (k && !/[.!?…]\s*$/.test(k[1]!)) return { heading: basligiNormalle(k[1]!), level: "bold" };
  return null;
}

/** Metni başlıklı bölümlere ayırır; ilk başlıktan önceki satırlar atılır. */
export function sections(text: string): Section[] {
  const out: Section[] = [];
  for (const line of text.split("\n")) {
    const b = baslikMi(line);
    if (b) out.push({ ...b, lines: [] });
    else out[out.length - 1]?.lines.push(line);
  }
  return out;
}

const SIRA: Record<string, number> = { 2: 2, 3: 3, 4: 4, bold: 5 };
const girinti = (s: string) => (/^[ \t]*/.exec(s)?.[0] ?? "").replace(/\t/g, "    ").length;
const temizle = (s: string) => s.replace(/\*\*|__/g, "").replace(/\s+/g, " ").trim();
const hucreler = (row: string) =>
  row
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map(temizle)
    .filter(Boolean);

/** Satırlardaki maddeler: `-`/`*`/`+`/`•` ve `1.`/`1)` maddeleri (girintili alt maddeler ve girintili
    devam satırları üst maddeye katılır) + GFM tablo gövde satırları (başlık ve ayraç atlanır, hücreler " · " ile). */
function maddeler(lines: string[]): string[] {
  const out: string[] = [];
  let ust: { indent: number; i: number } | null = null;
  for (let k = 0; k < lines.length; k++) {
    const l = lines[k]!;
    if (!l.trim()) continue;
    if (TABLO.test(l)) {
      ust = null;
      if (AYRAC.test(l) || AYRAC.test(lines[k + 1] ?? "x")) continue; // ayraç ya da başlık satırı
      const h = hucreler(l);
      if (h.length) out.push(h.join(" · "));
      continue;
    }
    const m = MADDE.exec(l);
    if (m) {
      const t = temizle(m[3]!);
      const indent = girinti(m[1]!);
      if (ust && indent > ust.indent) out[ust.i] += ` ${t}`;
      else if (t) {
        out.push(t);
        ust = { indent, i: out.length - 1 };
      }
      continue;
    }
    if (ust && girinti(l) > ust.indent) out[ust.i] += ` ${temizle(l)}`;
    else ust = null;
  }
  return out.map((x) => x.trim()).filter(Boolean);
}

/** Durumsuz kopya: `g`/`y` bayraklı bir RegExp `test()` çağrılarında `lastIndex` taşırdı. */
export const durumsuz = (r: RegExp) => new RegExp(r.source, r.flags.replace(/[gy]/g, ""));

/**
 * Başlığı `re`ye uyan bölümlerin maddeleri. `re` küçük harf, `i` bayraksız (başlık normalleştirilmiş).
 * Eşleşen bölümün altındaki DAHA DERİN başlıklar (ör. `### Kısa dönem hedefler` altında `#### Hedef 1`
 * ya da `**Hedef 1**`) kapsama girer; aynı ya da daha üst düzey bir başlıkta, `re`ye yeniden uyan bir
 * başlıkta ya da `kardes` listesindeki bir kalıba uyan başlıkta durulur. `kardes` araca özgü kardeş bölüm
 * adlarıdır (ör. BEP'te uzun dönem, yöntem, ölçme, iş birliği); varsayılan boştur: yalnız düzey ve `re` durdurur.
 * `re` ve `kardes` kalıpları `g`/`y` bayraklıysa bayraksız kopyaları kullanılır (`lastIndex` durumu taşınmaz).
 */
export function bulletsUnder(text: string, re: RegExp, kardes: readonly RegExp[] = []): string[] {
  const r = durumsuz(re);
  const ks = kardes.map(durumsuz);
  const secs = sections(text);
  const out: string[] = [];
  for (let i = 0; i < secs.length; i++) {
    const s = secs[i]!;
    if (!r.test(s.heading)) continue;
    const lines = [...s.lines];
    for (let j = i + 1; j < secs.length; j++) {
      const t = secs[j]!;
      if (SIRA[t.level]! <= SIRA[s.level]! || r.test(t.heading) || ks.some((k) => k.test(t.heading))) break;
      lines.push(...t.lines);
    }
    out.push(...maddeler(lines));
  }
  return out;
}

/* ── Kalıplar ── */

const SAYI = "(?<!\\p{L})(?:bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on)";
/** "bir ardışık dizi" (belirsizlik sıfatı) ölçüt değildir: ardışık/art arda önünde "bir" sayılmaz. */
const SAYI_BIRSIZ = "(?<!\\p{L})(?:iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on)";
/**
 * Ölçülebilir hedef imzası (küçük harfe indirilmiş madde üzerinde): yüzde, oran, "10 denemenin 8'inde",
 * "beşte dört", ardışık/art arda + sayı, sayı + deneme/oturum/seans, sayı + birim (kelime, dakika, sn, hata…).
 * Bilinen yanlış pozitif: "3 ardışık sayıyı sıralar" gibi içerik tanımı ölçüt sayılır (sayı + ardışık).
 * "ardışık sayıları sayar" ve "bir ardışık dizi" sayılmaz.
 */
export const OLCUT = new RegExp(
  [
    String.raw`%\s?\d`,
    String.raw`\d\s?%`,
    String.raw`yüzde\s?\d`,
    String.raw`\d+\s?\/\s?\d+`,
    String.raw`\d+\s+\p{L}+\s+\d+\s*['’]\s*\p{L}`,
    `${SAYI}(?:da|de|ta|te)\\s+${SAYI}`,
    `(?:\\d+|${SAYI_BIRSIZ})\\s+(?:ardışık|art arda)`,
    String.raw`(?:ardışık|art arda)\s+\d+`,
    String.raw`\d+\s+(?:denemede|oturumda|seansta)`,
    String.raw`\d+\s*(?:kelime|sözcük|dakika|dk|saniye|sn|hece|soru|kez|kere|defa|hata)`,
  ].join("|"),
  "u",
);

const TANI_SOZCUGU = "(?:disleksi|dehb|diskalkuli|disgrafi|ööb)";
const EK_FIIL = "(?:d[iıuü]r|t[iıuü]r)";
/** Tanı cümlesi (tr-TR küçük harfe indirilmiş metinde; çağıran `lower()` uygular): "disleksiktir", "dehb'dir",
    "ööb'lidir", "özgül öğrenme bozukluğudur". "tanılı" gibi tanı belirtmeyen ifadeleri yakalamaz. */
export const TANI = new RegExp(
  `${TANI_SOZCUGU}(?:k?['’]?${EK_FIIL}|['’]?l[iı]${EK_FIIL})(?!\\p{L})` +
    `|özgül öğrenme (?:bozukluğu|güçlüğü)['’]?${EK_FIIL}(?!\\p{L})` +
    `|tanısı (?:vardır|konmuştur|mevcuttur)`,
  "u",
);

/** Taslak notu karşılaştırması: uyumlu ayrıştırma (NFKD) + birleşik işaretler atılır, tr-TR küçük harf,
    ı→i, harf/rakam dışı her şey (`*`, `_`, `>`, ters tırnak, boşluk, emoji, noktalama) atılır. */
export const notNormalize = (s: string) =>
  lower(s.normalize("NFKD").replace(/\p{M}/gu, ""))
    .replace(/ı/g, "i")
    .replace(/[^\p{L}\p{N}]/gu, "");
export const TASLAK_NORM = notNormalize(TASLAK_NOTU);

/* ── Jenerik aday ── */

/** Rakamsız jenerik cümleler: jenerik adayda hiçbir hedef ölçüt taşımasın. */
const GENERIC_BULLETS = [
  "Çok duyulu yaklaşım kullanın.",
  "Bireysel farklılıklara dikkat edin.",
  "Düzenli tekrar önemlidir.",
  "Gelişimini takip edin.",
];

/** Başlıklar, tablo başlık/ayraç satırları ve taslak notu kalır; diğer her içerik satırı (madde, numaralı
    madde, tablo gövde hücresi, düz paragraf) sırayla dönen jenerik cümlelerle değiştirilir. */
export function genericMarkdown(text: string): string {
  const lines = text.split("\n");
  let i = 0;
  const g = () => GENERIC_BULLETS[i++ % GENERIC_BULLETS.length]!;
  let son = lines.length - 1;
  while (son >= 0 && !lines[son]!.trim()) son--;
  return lines
    .map((l, k) => {
      if (!l.trim() || /^\s*#{1,6}\s/.test(l) || baslikMi(l)) return l;
      if (notNormalize(l).includes(TASLAK_NORM) || (k === son && l.includes("⚠"))) return l;
      if (TABLO.test(l)) {
        if (AYRAC.test(l) || AYRAC.test(lines[k + 1] ?? "x")) return l;
        const n = Math.max(1, l.trim().replace(/^\||\|$/g, "").split("|").length);
        return `| ${Array.from({ length: n }, g).join(" | ")} |`;
      }
      const m = MADDE.exec(l);
      return m ? `${m[1]}${m[2]} ${g()}` : g();
    })
    .join("\n");
}
