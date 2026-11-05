import { gunAy } from "@studio/lib/probe/contextLine";

/* Bağlam bloğu "Veli geri bildirimi" satırları (spec §7): en yeni 2, tarih ARTAN, 'Veli: ' öneki düşer. */
export const VELI_SATIR_TAVANI = 2;

export function parentContextLines(rows: { text: string; createdAt: Date }[]): string[] {
  return [...rows]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, VELI_SATIR_TAVANI)
    .reverse()
    .map((r) => `- ${gunAy(r.createdAt)}: ${r.text.replace(/^Veli:\s*/u, "")}`);
}
