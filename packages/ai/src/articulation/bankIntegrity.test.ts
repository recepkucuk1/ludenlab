import { describe, it, expect } from "vitest";
import { WORD_BANK } from "./wordBank";

describe("WORD_BANK bütünlüğü", () => {
  for (const [sound, positions] of Object.entries(WORD_BANK)) {
    for (const [pos, words] of Object.entries(positions)) {
      for (const w of words) {
        it(`${sound}/${pos} "${w.word}"`, () => {
          const lw = w.word.toLocaleLowerCase("tr-TR");
          // Pozisyon kontrolü: başta→harfle başlar, sonda→harfle biter, ortada→iç kısımda geçer.
          if (pos === "initial") {
            expect(lw.startsWith(sound), `"${w.word}" başta /${sound}/ ile başlamalı`).toBe(true);
          } else if (pos === "final") {
            expect(lw.endsWith(sound), `"${w.word}" sonda /${sound}/ ile bitmeli`).toBe(true);
          } else {
            expect(lw.slice(1, -1).includes(sound), `"${w.word}" ortada (iç) /${sound}/ içermeli`).toBe(true);
          }
          expect(w.syllableBreak.replace(/-/g, ""), `"${w.word}" syllableBreak ↔ word tutmalı`).toBe(w.word);
          expect(w.visualPrompt.trim().length, `"${w.word}" visualPrompt boş olmamalı`).toBeGreaterThan(0);
        });
      }
    }
  }
  it("en az bir test çalışsın (boş bankada da geçer)", () => expect(true).toBe(true));
});
