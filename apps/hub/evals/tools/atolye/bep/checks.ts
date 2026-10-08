// apps/hub/evals/tools/atolye/bep/checks.ts
import { ALAN, TASLAK_NOTU, type Alan } from "@atolye/lib/bep";
import type { CheckResult } from "../../../lib/core";
import { dilKurali, frac, lower, mean, rumuzYok, yasakKalip } from "../../../lib/sharedChecks";

export interface BepBody {
  alanlar: Alan[];
  gucluYonler?: string;
  guclukAlanlari: string;
  ekNotlar?: string;
  mebHedefKod?: string;
  mebDavranisKodlari?: string[];
}

/* ── Markdown yapısı: başlıklar ve maddeler (modelin biçim seçiminden bağımsız) ── */

export type BaslikDuzeyi = 2 | 3 | 4 | "bold";
export interface Bolum {
  /** tr-TR küçük harf; `-`/`_` boşluğa, çoklu boşluk teke indirilmiş; `**`, numara ve sondaki `:` atılmış. */
  heading: string;
  level: BaslikDuzeyi;
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

const basligiNormalle = (s: string) =>
  lower(s.replace(/\*\*|__/g, ""))
    .replace(/^\s*\d+[.)]\s*/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*:\s*$/, "")
    .trim();

/** Satır bir başlık mı? Öyleyse düzeyi ve normalleştirilmiş metni. */
export function baslikMi(line: string): { heading: string; level: BaslikDuzeyi } | null {
  const d = DIYEZ_BASLIK.exec(line);
  if (d) return { heading: basligiNormalle(d[2]!), level: d[1]!.length as 2 | 3 | 4 };
  const k = KALIN_BASLIK.exec(line);
  if (k && !/[.!?…]\s*$/.test(k[1]!)) return { heading: basligiNormalle(k[1]!), level: "bold" };
  return null;
}

/** Metni başlıklı bölümlere ayırır; ilk başlıktan önceki satırlar atılır. */
export function sections(text: string): Bolum[] {
  const out: Bolum[] = [];
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

/** Alt bölüm kalıpları (normalleştirilmiş başlıkta; `i` bayrağı YOK, başlık zaten küçük harf). */
const ALT_KALIPLAR = [/uzun (dönem|vadeli)/, /kısa (dönem|vadeli)/, /yöntem|teknik|strateji/, /ölçme|değerlendirme/];
const KARDES_KALIPLAR = [...ALT_KALIPLAR, /iş ?birliği/];

/**
 * Başlığı `re`ye uyan bölümlerin maddeleri. `re` küçük harf, `i` bayraksız (başlık normalleştirilmiş).
 * Eşleşen bölümün altındaki DAHA DERİN başlıklar (ör. `### Kısa dönem hedefler` altında `#### Hedef 1`
 * ya da `**Hedef 1**`) kapsama girer; kardeş bir alt bölüm başlığında (uzun dönem, yöntem, ölçme,
 * iş birliği) ya da `re`ye yeniden uyan başlıkta durulur.
 */
export function bulletsUnder(text: string, re: RegExp): string[] {
  const secs = sections(text);
  const out: string[] = [];
  for (let i = 0; i < secs.length; i++) {
    const s = secs[i]!;
    if (!re.test(s.heading)) continue;
    const lines = [...s.lines];
    for (let j = i + 1; j < secs.length; j++) {
      const t = secs[j]!;
      if (SIRA[t.level]! <= SIRA[s.level]! || re.test(t.heading) || KARDES_KALIPLAR.some((k) => k.test(t.heading))) break;
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
/** Tanı cümlesi (küçük harfe indirilmiş metinde): "disleksiktir", "DEHB'dir", "ÖÖB'lidir", "özgül öğrenme bozukluğudur". */
const TANI = new RegExp(
  `${TANI_SOZCUGU}(?:k?['’]?${EK_FIIL}|['’]?l[iı]${EK_FIIL})(?!\\p{L})` +
    `|özgül öğrenme (?:bozukluğu|güçlüğü)['’]?${EK_FIIL}(?!\\p{L})` +
    `|tanısı (?:vardır|konmuştur|mevcuttur)`,
  "u",
);

/** Taslak notu karşılaştırması: uyumlu ayrıştırma (NFKD) + birleşik işaretler atılır, tr-TR küçük harf,
    ı→i, harf/rakam dışı her şey (`*`, `_`, `>`, ters tırnak, boşluk, emoji, noktalama) atılır. */
export const notNormu = (s: string) =>
  lower(s.normalize("NFKD").replace(/\p{M}/gu, ""))
    .replace(/ı/g, "i")
    .replace(/[^\p{L}\p{N}]/gu, "");
export const TASLAK_NORM = notNormu(TASLAK_NOTU);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Alan başlığında aranacak anahtar: parantez atılmış etiketin ilk kelimesi; kısaysa (ör. "öz") ilk iki kelime. */
function alanAnahtari(a: Alan): string {
  const w = basligiNormalle(ALAN[a].replace(/\(.*?\)/g, "")).split(" ").filter(Boolean);
  return (w[0]?.length ?? 0) >= 4 ? w[0]! : w.slice(0, 2).join(" ");
}

export function bepChecks(args: { body: BepBody; output: unknown; rawText: string; alias: string | null }): CheckResult {
  const { body, output, rawText, alias } = args;
  const text = typeof output === "string" ? output : "";
  const dolu = text.trim().length > 0;
  const hard: string[] = [];
  if (!dolu) hard.push("cikti_yok");

  const alanSayisi = Math.max(1, body.alanlar.length);
  const secs = sections(text);
  // Alan başlığı: `##` ya da hiçbir `##` başlığının altında olmayan (üst düzey) kalın sözde başlık.
  const ilkIki = secs.findIndex((s) => s.level === 2);
  const alanBasliklari = secs
    .filter((s, i) => s.level === 2 || (s.level === "bold" && (ilkIki < 0 || i < ilkIki)))
    .map((s) => s.heading);
  const alanFrac = frac(body.alanlar, (a) => alanBasliklari.some((h) => h.includes(alanAnahtari(a))));
  const altFrac = mean(ALT_KALIPLAR.map((re) => Math.min(1, secs.filter((s) => re.test(s.heading)).length / alanSayisi)));

  const hedefler = bulletsUnder(text, ALT_KALIPLAR[1]!).map(lower);
  const olcutluHedef = hedefler.length ? frac(hedefler, (h) => OLCUT.test(h)) : 0;
  const hedefSayisiOk = hedefler.length >= 3 * alanSayisi && hedefler.length <= 6 * alanSayisi ? 1 : 0;

  const satirlar = text.split("\n").filter((l) => l.trim());
  const metinNorm = notNormu(text);
  const taslakSonda =
    notNormu(satirlar[satirlar.length - 1] ?? "").includes(TASLAK_NORM) || metinNorm.endsWith(TASLAK_NORM) ? 1 : 0;
  if (dolu && !metinNorm.includes(TASLAK_NORM)) hard.push("taslak_notu_yok");

  const kodRe = body.mebHedefKod ? new RegExp(`(?<![\\d.])${esc(body.mebHedefKod.trim())}(?!\\d)`, "u") : null;
  // Kod verildiyse: kodu (ya da alt kodunu, ör. 3.2.5 → 3.2.5.1) taşıyan kısa dönem hedeflerin oranı.
  const mebKod = kodRe ? frac(hedefler, (h) => kodRe.test(h)) : null;
  const isbirligi = /iş\s?birliği/u.test(lower(text)) ? 1 : 0;
  const taniCumlesi = TANI.test(lower(text)) ? 1 : 0;

  const talimat = dolu
    ? mean([alanFrac, altFrac, olcutluHedef, hedefSayisiOk, taslakSonda, mebKod ?? 1, isbirligi, taniCumlesi ? 0 : 1])
    : 0;

  const dk = dilKurali(rawText);
  const yk = yasakKalip(rawText);
  const rz = rumuzYok(text, alias);
  if (dk.score === 0) hard.push("dil_kurali");
  if (rz === 0) hard.push("rumuz_sizintisi");

  const details: CheckResult["details"] = {
    alan_basliklari: alanFrac,
    alt_bolumler: altFrac,
    hedef_sayisi: hedefler.length,
    hedef_sayisi_ok: hedefSayisiOk,
    olcutlu_hedef: olcutluHedef,
    taslak_sonda: taslakSonda,
    meb_kod: mebKod ?? "—",
    isbirligi,
    tani_cumlesi: taniCumlesi,
    hasta: dk.hasta,
    terapist: dk.terapist,
    odul: dk.odul,
    yasak_kalip: yk.found.join("|"),
  };
  return { scores: { talimat, dil_kurali: dk.score, rumuz_yok: rz, yasak_kalip: yk.score }, details, hard_fail: hard };
}
