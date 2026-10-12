import { test } from "node:test";
import assert from "node:assert/strict";
import { BOLUMLER_169, BOLUMLER_916, VURUS_KARE, bolumKare, kare, saniye, toplamKare, type Bolum } from "../src/marka/zaman.ts";

const bitisik = (b: Bolum[]) =>
  b.every((x, i) => (i === 0 ? x.ilk === 1 : x.ilk === b[i - 1].son + 1) && x.son >= x.ilk);

test("100 BPM, 30 fps: bir vuruş 18 kare", () => {
  assert.equal(VURUS_KARE, 18);
  assert.equal(kare(1), 0);
  assert.equal(kare(2), 18);
  assert.equal(kare(101), 1800);
  assert.equal(saniye(77), 45.6);
});

test("16:9 bölümleri boşluksuz, 100 vuruş = 1800 kare", () => {
  assert.ok(bitisik(BOLUMLER_169));
  assert.deepEqual(BOLUMLER_169.map((b) => b.id), ["kanca", "yuk", "donus", "studio", "atolye", "cocuk", "kapanis"]);
  assert.equal(toplamKare(BOLUMLER_169), 1800);
});

test("9:16 kesim boşluksuz, 50 vuruş = 900 kare, aynı bölüm sırası", () => {
  assert.ok(bitisik(BOLUMLER_916));
  assert.deepEqual(BOLUMLER_916.map((b) => b.id), BOLUMLER_169.map((b) => b.id));
  assert.equal(toplamKare(BOLUMLER_916), 900);
});

test("bölüm karesi: başlangıç ve süre", () => {
  const studio = BOLUMLER_169.find((b) => b.id === "studio")!;
  assert.deepEqual(bolumKare(studio), { from: 576, durationInFrames: 360 });
});

test("bölümler kare düzeyinde bitişik ve toplamı toplamKare", () => {
  for (const liste of [BOLUMLER_169, BOLUMLER_916]) {
    let bas = 0;
    for (const b of liste) {
      const { from, durationInFrames } = bolumKare(b);
      assert.equal(from, bas, b.id);
      assert.ok(Number.isInteger(durationInFrames), b.id);
      bas = from + durationInFrames;
    }
    assert.equal(bas, toplamKare(liste));
  }
});
