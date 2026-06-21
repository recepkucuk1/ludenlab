import type { WordBank, Position, SelectedWord } from "./types";

function syllableCountOf(syllableBreak: string): number {
  return syllableBreak.split("-").length;
}

/**
 * Bankadan, seçilen pozisyonların birleşiminden rastgele + tekrarsız en fazla `count` kelime seçer.
 * `rng` enjekte edilebilir (test); [0,1) döndürmeli. Mevcut < count ise hepsini döner.
 */
export function selectWords(
  bank: WordBank,
  sound: string,
  positions: Position[],
  count: number,
  rng: () => number = Math.random,
): SelectedWord[] {
  const perSound = bank[sound];
  if (!perSound) return [];

  // Pozisyon birleşimini düzleştir (pozisyon bilgisi korunur)
  const pool: SelectedWord[] = [];
  for (const pos of positions) {
    for (const bw of perSound[pos] ?? []) {
      pool.push({ ...bw, position: pos, syllableCount: syllableCountOf(bw.syllableBreak) });
    }
  }

  // Fisher–Yates (rng enjekte) ile karıştır, ilk `count`'u al
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, Math.max(0, count));
}
