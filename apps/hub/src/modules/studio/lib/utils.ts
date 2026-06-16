import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function logError(tag: string, error: unknown) {
  if (error instanceof Error) {
    console.error(`\n[${tag}] ${error.name}: ${error.message}`);
    if (error.stack) console.error(error.stack);
    const extra = error as unknown as Record<string, unknown>;
    if (extra.code) console.error(`  Prisma code: ${extra.code}`);
    if (extra.meta) console.error(`  Prisma meta:`, extra.meta);
  } else {
    console.error(`\n[${tag}]`, error);
  }
}

export function toInputDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return dateStr.slice(0, 10);
}

const MONTHS_TR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const DAYS_TR = [
  "Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"
];

/**
 * Merkezi tarih formatlama fonksiyonu (GG.AA.YYYY veya kapsamlı format).
 * Tarayıcı yerel ayarlarından bağımsız olarak Türkçe format (GG.AA.YYYY) döner.
 * @param date - String veya Date objesi.
 * @param formatType - Format türü: short (14.04.2026), medium (14 Nisan 2026), long (14 Nisan 2026 Pazartesi), monthYear (Nisan 2026)
 */
export function formatDate(
  date: Date | string | null | undefined,
  formatType: "short" | "medium" | "long" | "monthYear" = "short"
): string {
  if (!date) return "";
  const d = new Date(date);
  
  if (isNaN(d.getTime())) return "";

  const day = d.getDate();
  const dayPadded = String(day).padStart(2, "0");
  const month = d.getMonth(); // 0-indexed
  const monthPadded = String(month + 1).padStart(2, "0");
  const year = d.getFullYear();
  const weekday = d.getDay(); // 0 (Pazar) - 6 (Cumartesi)

  if (formatType === "short") {
    // Örnek: "14.04.2026"
    return `${dayPadded}.${monthPadded}.${year}`;
  }

  if (formatType === "medium") {
    // Örnek: "14 Nisan 2026"
    return `${day} ${MONTHS_TR[month]} ${year}`;
  }

  if (formatType === "monthYear") {
    // Örnek: "Nisan 2026"
    return `${MONTHS_TR[month]} ${year}`;
  }

  // formatType === "long" (Örnek: "14 Nisan 2026 Pazartesi")
  return `${day} ${MONTHS_TR[month]} ${year} ${DAYS_TR[weekday]}`;
}

/**
 * Extract the first JSON object from a Claude (or any LLM) response.
 *
 * Accepts either a fenced ```json block or a bare `{ ... }` substring.
 * Throws on missing / unparseable JSON. Keep this as the single source of
 * truth so every tool route handles LLM JSON parsing the same way.
 */
export function extractJson(text: string): Record<string, unknown> {
  const jsonMatch =
    text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ??
    text.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    throw new Error("Claude yanıtından JSON çıkarılamadı");
  }

  try {
    return JSON.parse(jsonMatch[1] ?? jsonMatch[0]);
  } catch {
    throw new Error("JSON parse hatası");
  }
}
