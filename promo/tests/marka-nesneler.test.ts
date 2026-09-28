import { test } from "node:test";
import assert from "node:assert/strict";
import { kagitCizgileri, rng, sekmeDortgeni, yigin } from "../src/marka/nesneler.ts";

test("rng: aynı tohum aynı dizi", () => {
  const a = rng(5), b = rng(5);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
});

test("yığın: kâğıtlar üst üste, çizgi ve sekme yalnız en üstte", () => {
  const y = yigin({ cx: 1, cy: -1, adet: 4, tohum: 3, sekme: "#4a90e2", t: 0.1 });
  assert.equal(y.kagitlar.length, 4);
  assert.deepEqual(y.kagitlar.map((k) => Number(k.z0.toFixed(6))), [0, 0.1, 0.2, 0.3]);
  assert.ok(Math.abs(y.ustZ - 0.4) < 1e-9);
  assert.deepEqual(y.kagitlar.map((k) => k.ust), [false, false, false, true]);
  assert.deepEqual(y.kagitlar.map((k) => k.sekme), [null, null, null, "#4a90e2"]);
});

test("yığın: sapma 0 ise kâğıtlar hizalı", () => {
  const y = yigin({ cx: 0, cy: 0, adet: 3, sapma: 0 });
  for (const k of y.kagitlar) assert.deepEqual(k.taban, y.kagitlar[0].taban);
});

test("kâğıt çizgileri ve sekme üst yüzde", () => {
  const y = yigin({ cx: 0, cy: 0, adet: 2, t: 0.1, sekme: "#ffce52" });
  const ust = y.kagitlar[1];
  const cizgiler = kagitCizgileri(ust);
  assert.equal(cizgiler.length, 3);
  for (const [a, b] of cizgiler) {
    assert.ok(Math.abs(a[2] - 0.2) < 1e-9);
    assert.ok(Math.abs(b[2] - 0.2) < 1e-9);
  }
  assert.equal(sekmeDortgeni(ust).length, 4);
});
