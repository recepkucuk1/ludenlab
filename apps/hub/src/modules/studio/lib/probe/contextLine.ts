// apps/hub/src/modules/studio/lib/probe/contextLine.ts
import { LEVEL_KISA, POSITION_KISA, type ProbePosition } from "./schema";

/* Bağlam bloğu "Son ölçümler" satırları (spec §8): seri başına tek satır, son N koşu tarih ARTAN.
   Saf; tarih biçimi enjekte edilebilir; varsayılan `gunAy` ("14.10"). */
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

/** Seriler YENİ → ESKİ gelir; anahtar (ses|pozisyon|düzey) başına yalnız ilk görülen (koşulu en yeni set) yazılır. */
export function probeContextLines(series: ProbeSeriesSummary[], fmt: (d: Date) => string = gunAy): string[] {
  const out: string[] = [];
  const gorulen = new Set<string>();
  for (const s of series) {
    if (out.length >= OLCUM_SERI_TAVANI) break;
    if (!s.runs.length) continue;
    const anahtar = `${s.sound}|${s.position}|${s.level}`;
    if (gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    const son = [...s.runs].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-OLCUM_KOSU_TAVANI);
    const pos = POSITION_KISA[s.position] ?? s.position;
    const lvl = (LEVEL_KISA as Record<string, string>)[s.level] ?? s.level;
    out.push(`- ${s.sound} ${pos} ${lvl}: ${son.map((r) => `%${r.pct}`).join(" → ")} (${son.map((r) => fmt(r.date)).join(", ")})`);
  }
  return out;
}
