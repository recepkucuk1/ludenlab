// apps/hub/evals/lib/sharedChecks.ts
import { yasakKalipBul } from "@/lib/prompts/ortakBloklar";
import { extractJson } from "@studio/lib/utils";

/* Her araçta ortak, ücretsiz kontroller. Puanlar 0–1. */

export const lower = (s: string) => s.toLocaleLowerCase("tr-TR");
export const str = (v: unknown) => (typeof v === "string" ? v : "");
/** Boş liste → 0: ölçülecek öğe yoksa başarısızlık sayılır. */
export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
/** Boş liste → 0: ölçülecek öğe yoksa başarısızlık sayılır. */
export const frac = <T>(xs: T[], ok: (x: T) => boolean) => (xs.length ? xs.filter(ok).length / xs.length : 0);

/**
 * "hasta"/"terapist" (çekimli biçimler dahil; hastane/hastalık/hastalanmak hariç) sert dil hatasıdır.
 *
 * Ödül/çıkartma sayımı yalnız ayrıntıda raporlanır, `score`'a girmez — olumsuz bağlam
 * ("dışsal ödül önerilmez") ve eş seslilik ("toplama-çıkartma", "dil çıkartma") sert hata
 * üretmesin; nüans hakemin `dil_etik` ölçütünde. "puan" tek başına bilerek sayılmaz
 * (BEP/ölçme metinlerinde meşru).
 */
export function dilKurali(text: string): { hasta: number; terapist: number; odul: number; score: number } {
  const t = lower(text);
  const hasta = (t.match(/(?<!\p{L})hasta(?!ne|l[ıi][kğ]|lan)/gu) ?? []).length;
  const terapist = (t.match(/(?<!\p{L})terapist/gu) ?? []).length;
  const odul = (t.match(/(?<!\p{L})(ödül|çıkartma|puan tablosu|yıldız tablosu)/gu) ?? []).length;
  return { hasta, terapist, odul, score: hasta + terapist === 0 ? 1 : 0 };
}

/**
 * Görsel sağlayıcısına giden alanlar: bu alanlarda rumuz BİLEREK kalır, görsel sağlayıcıya
 * gerçek ad gitmez. `src/modules/studio/lib/pseudonym.ts` `restoreNameDeep` ile eşzamanlı
 * tutulmalı.
 */
const IMAGE_PROMPT_KEYS = new Set(["visualPrompt", "imagePrompt", "scenePrompt"]);

const EKLER = "nden|ndan|nde|nda|nin|nın|nun|nün|den|dan|ten|tan|ler|lar|yle|yla|yi|yı|yu|yü|ye|ya|de|da|te|ta|in|ın|un|ün|le|la|li|lı|lu|lü";
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function collectStrings(v: unknown, out: string[]): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) for (const x of v) collectStrings(x, out);
  else if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) if (!IMAGE_PROMPT_KEYS.has(k)) collectStrings(x, out);
  }
  return out;
}

/**
 * Uygulamanın uzmana gösterdiği içerikte rumuz kalmamalı (gerçek ad geri konmuş olmalı).
 * Rumuz bütün kelime olarak (Türkçe ekleri ve büyük harf biçimiyle) aranır; görsel prompt
 * alanları hariç.
 */
export function rumuzYok(output: unknown, alias: string | null): number {
  if (!alias || output == null) return 1;
  const re = new RegExp(
    `(?<!\\p{L})(?:${esc(alias)}|${esc(alias.toLocaleUpperCase("tr-TR"))})(?:'|’)?(?:${EKLER})?(?!\\p{L})`,
    "u",
  );
  return collectStrings(output, []).some((s) => re.test(s)) ? 0 : 1;
}

const YASAK_KALIP_TOLERANSI = 4; // bu kadar kalıpta puan 0'a iner (uzunluktan bağımsız, bilinçli sadelik)

export function yasakKalip(text: string): { found: string[]; score: number } {
  const found = yasakKalipBul(text);
  return { found, score: Math.max(0, 1 - found.length / YASAK_KALIP_TOLERANSI) };
}

/** Route'taki `extractJson` ile aynı kural (doğrudan onu kullanır); hata yerine null. */
export function parseJsonLoose(raw: string): Record<string, unknown> | null {
  try {
    return extractJson(raw);
  } catch {
    return null;
  }
}

/** Sezgisel: kısaltma ("vb.") cümleyi böler, tek kelimelik cümle sayılmaz. */
export function countSentences(text: string): number {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 2).length;
}

export function markdownHeadings(text: string): string[] {
  return text
    .split("\n")
    .filter((l) => /^#{2,3}\s+/.test(l))
    .map((l) => l.replace(/^#{2,3}\s+/, "").trim());
}
