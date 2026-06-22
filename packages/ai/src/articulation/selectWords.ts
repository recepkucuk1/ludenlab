import type { WordBank, Position, SelectedWord } from "./types";
import { soundToLetter } from "./wordBank";

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

/**
 * ÇOK-SESLİ seçim — banka-tabanlı. Seçili seslerin HEPSİ bankadan çekilir; tek bir kelime bile
 * banka dışından ÜRETİLMEZ. Her sesten yaklaşık eşit pay alınır, sonuçlar serpiştirilip `count`'a
 * indirilir. Her kelime kendi `targetSound`'unu taşır (ör. çok-sesli /s/+/z/ drilinde "saat"→"/s/").
 * Bankada olmayan sesler sessizce atlanır. Hiçbiri bankada değilse [] döner.
 */
export function selectWordsMulti(
  bank: WordBank,
  sounds: string[],
  positions: Position[],
  count: number,
  rng: () => number = Math.random,
): SelectedWord[] {
  const valid = sounds
    .map((sound) => ({ sound, letter: soundToLetter(sound) }))
    .filter(({ letter }) => bank[letter]);
  if (valid.length === 0 || count <= 0) return [];

  // Her sesten biraz fazla çek → dedupe + cap sonrası dengeli kalsın.
  const perSound = Math.ceil(count / valid.length) + 1;
  const seen = new Set<string>();
  const merged: SelectedWord[] = [];
  for (const { sound, letter } of valid) {
    for (const w of selectWords(bank, letter, positions, perSound, rng)) {
      if (seen.has(w.word)) continue; // bir kelime birden çok seste olabilir → tekrarsız
      seen.add(w.word);
      merged.push({ ...w, targetSound: sound });
    }
  }
  // Sesleri serpiştir (Fisher–Yates), sonra count'a indir.
  for (let i = merged.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [merged[i], merged[j]] = [merged[j]!, merged[i]!];
  }
  return merged.slice(0, count);
}
