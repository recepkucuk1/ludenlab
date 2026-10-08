// apps/hub/evals/lib/sharedChecks.ts
import { yasakKalipBul } from "@/lib/prompts/ortakBloklar";

/* Her araçta ortak, ücretsiz kontroller. Puanlar 0–1. */

export const lower = (s: string) => s.toLocaleLowerCase("tr-TR");
export const str = (v: unknown) => (typeof v === "string" ? v : "");
export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const frac = <T>(xs: T[], ok: (x: T) => boolean) => (xs.length ? xs.filter(ok).length / xs.length : 0);

export function dilKurali(text: string): { hasta: number; terapist: number; odul: number; score: number } {
  const hasta = (text.match(/(?<!\p{L})hasta(?!\p{L}|ne)/giu) ?? []).length;
  const terapist = (text.match(/(?<!\p{L})terapist/giu) ?? []).length;
  const odul = (text.match(/(?<!\p{L})(ödül|çıkartma|puan tablosu|yıldız tablosu)/giu) ?? []).length;
  return { hasta, terapist, odul, score: hasta + terapist + odul === 0 ? 1 : 0 };
}

/** Uygulamanın uzmana gösterdiği içerikte rumuz kalmamalı (gerçek ad geri konmuş olmalı). */
export function rumuzYok(output: unknown, alias: string | null): number {
  if (!alias || output == null) return 1;
  return JSON.stringify(output).includes(alias) ? 0 : 1;
}

export function yasakKalip(text: string): { found: string[]; score: number } {
  const found = yasakKalipBul(text);
  return { found, score: Math.max(0, 1 - found.length / 4) };
}

/** Route'taki extractJson ile aynı kural; hata yerine null. */
export function parseJsonLoose(raw: string): Record<string, unknown> | null {
  const m = raw.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ?? raw.match(/(\{[\s\S]*\})/);
  if (!m) return null;
  try {
    return JSON.parse(m[1] ?? m[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

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
