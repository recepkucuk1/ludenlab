// apps/hub/src/modules/studio/lib/probe/contextLine.ts
import { LEVEL_KISA, POSITION_KISA, type ProbePosition } from "./schema";

/* Bağlam bloğu "Son ölçümler" satırları (spec §8): seri başına tek satır, son N koşu tarih ARTAN.
   Saf; tarih biçimi enjekte edilir (bağlam bloğu gözlemlerle aynı `formatDate(d, "short")` = "14.10.2026" kullanır). */
export const OLCUM_SERI_TAVANI = 3;
export const OLCUM_KOSU_TAVANI = 3;

/** Grafik x-ekseni etiketi: "14.10" (yıl yok, dar alan). İstemci ve sunucuda aynı sonuç (yerel saat). */
export function gunAy(d: Date | string): string {
  const x = new Date(d);
  return `${String(x.getDate()).padStart(2, "0")}.${String(x.getMonth() + 1).padStart(2, "0")}`;
}

export interface ProbeSeriesSummary {
  sound: string;
  position: ProbePosition;
  level: string;
  runs: { date: Date; pct: number }[];
}

export function probeContextLines(series: ProbeSeriesSummary[], fmt: (d: Date) => string): string[] {
  const out: string[] = [];
  for (const s of series) {
    if (out.length >= OLCUM_SERI_TAVANI) break;
    if (!s.runs.length) continue;
    const son = [...s.runs].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-OLCUM_KOSU_TAVANI);
    const pos = POSITION_KISA[s.position] ?? s.position;
    const lvl = (LEVEL_KISA as Record<string, string>)[s.level] ?? s.level;
    out.push(`- ${s.sound} ${pos} ${lvl}: ${son.map((r) => `%${r.pct}`).join(" → ")} (${son.map((r) => fmt(r.date)).join(", ")})`);
  }
  return out;
}
