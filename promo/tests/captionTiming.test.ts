import { test } from "node:test";
import assert from "node:assert/strict";
import { splitWords, visibleWordCount } from "../src/reels-lib/captionTiming.ts";

test("splitWords boşlukları normalize eder", () => {
  assert.deepEqual(splitWords("  Yalnız   değilsin. "), ["Yalnız", "değilsin."]);
});

test("ilk karede ilk kelime görünür", () => {
  assert.equal(visibleWordCount(4, 0, 40), 1);
});

test("kelimeler süreye eşit dağılır", () => {
  assert.equal(visibleWordCount(4, 9, 40), 1);
  assert.equal(visibleWordCount(4, 10, 40), 2);
  assert.equal(visibleWordCount(4, 39, 40), 4);
});

test("süre bitince ve sonrasında hepsi görünür, asla fazlası değil", () => {
  assert.equal(visibleWordCount(4, 40, 40), 4);
  assert.equal(visibleWordCount(4, 500, 40), 4);
});

test("negatif kare 0, sıfır süre hepsini gösterir", () => {
  assert.equal(visibleWordCount(4, -1, 40), 0);
  assert.equal(visibleWordCount(4, 0, 0), 4);
});
