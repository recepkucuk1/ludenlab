import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { R3_WORDS } from "../src/reels/r3-artikulasyon/words.ts";

test("6 kelime, hepsi /r/ ile başlar", () => {
  assert.equal(R3_WORDS.length, 6);
  for (const w of R3_WORDS) assert.match(w.word, /^r/);
});

test("artefaktlı görseller (reçel 'Fruit Jam', rende 'Kyl') seçilmez", () => {
  for (const w of R3_WORDS) assert.doesNotMatch(w.sourceUrl, /recel|rende/);
});

test("her kelimenin yerel görseli public/real/r3 altında var", () => {
  for (const w of R3_WORDS) {
    assert.ok(existsSync(resolve(import.meta.dirname, "../public", w.file)), w.file);
  }
});
