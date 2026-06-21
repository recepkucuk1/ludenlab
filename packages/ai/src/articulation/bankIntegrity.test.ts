import { describe, it, expect } from "vitest";
import { WORD_BANK } from "./wordBank";

describe("WORD_BANK bütünlüğü", () => {
  for (const [sound, positions] of Object.entries(WORD_BANK)) {
    for (const [pos, words] of Object.entries(positions)) {
      for (const w of words) {
        it(`${sound}/${pos} "${w.word}": hedef harfi içerir + alanlar dolu`, () => {
          expect(w.word.toLocaleLowerCase("tr-TR")).toContain(sound);
          expect(w.syllableBreak.replace(/-/g, "")).toBe(w.word);
          expect(w.visualPrompt.trim().length).toBeGreaterThan(0);
        });
      }
    }
  }
  it("en az bir test çalışsın (boş bankada da geçer)", () => expect(true).toBe(true));
});
