// apps/hub/src/modules/studio/lib/probe/buildSeries.ts
import { articulation } from "@ludenlab/ai";
import { POSITION_LABEL, PROBE_MIN_BANK_WORDS, type ProbePosition, type ProbeWord } from "./schema";

/* Sabit set (spec §5): bankadan `count` kelime (rng enjekte edilebilir), her kelime için YALNIZ önbellekteki görsel
   (üretim yok, kredi yok). Bankada 3'ten az kelime → BankaYetersizError (rota 400'e çevirir). */

export class BankaYetersizError extends Error {
  constructor(sound: string, position: ProbePosition, found: number) {
    super(`Bu ses ve pozisyon için bankada yeterli kelime yok (${sound} ${POSITION_LABEL[position]}: ${found})`);
    this.name = "BankaYetersizError";
  }
}

export interface BuildSeriesDeps {
  lookupImage: (word: string) => Promise<string | null>;
  rng?: () => number;
}

export async function buildSeriesWords(
  sound: string,
  position: ProbePosition,
  count: number,
  deps: BuildSeriesDeps,
): Promise<ProbeWord[]> {
  const letter = articulation.soundToLetter(sound);
  const picked = articulation.selectWords(articulation.WORD_BANK, letter, [position], count, deps.rng ?? Math.random);
  if (picked.length < PROBE_MIN_BANK_WORDS) throw new BankaYetersizError(sound, position, picked.length);
  // Görsel araması hata verirse (reddedilen söz VEYA senkron fırlatma) o kelime null'a düşer; set yine döner.
  const urls = await Promise.all(
    picked.map(async (w) => {
      try { return await deps.lookupImage(w.word); } catch { return null; }
    }),
  );
  return picked.map((w, i) => ({ word: w.word, syllableBreak: w.syllableBreak, imageUrl: urls[i] ?? null }));
}
