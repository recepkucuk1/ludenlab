import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { r4Story } from "../src/reels/r4-sosyal-hikaye/story.ts";

test("Carol Gray: dört cümle türünün hepsi, sırayla", () => {
  assert.deepEqual(
    r4Story.sentences.map((s) => s.type),
    ["descriptive", "perspective", "directive", "affirmative"],
  );
});

test("her cümlenin yerel görseli var", () => {
  for (const s of r4Story.sentences) {
    assert.ok(existsSync(resolve(import.meta.dirname, "../public", s.file)), s.file);
  }
});

test("içerik kuralları: öğrenci adı / hız iddiası yok", () => {
  const all = JSON.stringify(r4Story);
  assert.doesNotMatch(all, /saniye|dakikada/i);
  assert.doesNotMatch(all, /\b(Ali|Ayşe|Eymen|Zeynep|Elif|Deniz)\b/);
});
