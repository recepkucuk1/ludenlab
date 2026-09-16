import { writeFileSync } from "node:fs";
import path from "node:path";
import { it } from "vitest";
import { articulation } from "@ludenlab/ai";
import cases from "./cases.json";
import { seeded } from "./seededBank";

/*
 * ÜCRETSİZ önizleme: her vakada modele gidecek banka kelimelerini hesaplar (API çağrısı yok).
 * Seçim kuralı route'taki pickBankWords ile aynı: yalnız kelime/cümle/bağlam düzeyi ve
 * tüm hedef sesler bankadaysa.
 */
it("banka kelimelerini hesapla", () => {
  const select = seeded(articulation.selectWordsMulti);
  const out = cases.map((c) => {
    const b = c.body;
    const banked =
      ["word", "sentence", "contextual"].includes(b.level) &&
      b.targetSounds.every((s) => articulation.WORD_BANK[articulation.soundToLetter(s)]);
    const words = banked
      ? select(articulation.WORD_BANK, b.targetSounds, b.positions as articulation.Position[], b.itemCount)
      : null;
    return {
      id: c.id,
      bankWords: words?.map((w) => ({ word: w.word, position: w.position, targetSound: w.targetSound })) ?? null,
    };
  });
  const file = path.resolve(import.meta.dirname, "bankWords.preview.json");
  writeFileSync(file, JSON.stringify(out, null, 2));
  for (const o of out) {
    console.log(o.id, o.bankWords ? `${o.bankWords.length} kelime: ${o.bankWords.map((w) => w.word).join(", ")}` : "banka yok (model üretir)");
  }
});
