import { test } from "node:test";
import assert from "node:assert/strict";
import { r2Card } from "../src/reels/r2-kartlar/cardData.ts";

test("kart ürünün GeneratedCard alanlarının hepsini dolu taşır", () => {
  for (const key of ["title", "objective", "therapistNotes", "homeExercise"] as const) {
    assert.ok(r2Card[key].length > 0, key);
  }
  assert.ok(r2Card.materials.length >= 3);
  assert.ok(r2Card.instructions.length >= 3);
  assert.ok(r2Card.exercises.length >= 2);
  assert.ok(r2Card.progressIndicators.length >= 2);
  assert.equal(r2Card.category, "speech");
  assert.equal(r2Card.difficulty, "medium");
  assert.equal(r2Card.ageGroup, "3-6");
});

test("adımlar ürün biçiminde 'Adım N:' ile başlar (PDF bunu kırpar)", () => {
  r2Card.instructions.forEach((s, i) => assert.match(s, new RegExp(`^Adım ${i + 1}: `)));
});

test("içerik kuralları: öğrenci adı / hız iddiası yok", () => {
  const all = JSON.stringify(r2Card);
  assert.doesNotMatch(all, /saniye|dakikada/i);
  assert.doesNotMatch(all, /\b(Ali|Ayşe|Eymen|Zeynep|Elif)\b/);
});
