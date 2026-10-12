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

test("üst yüz eşlemesi ve yerleşim", () => {
  const [kg] = yigin({ cx: 1, cy: -1, adet: 1, sapma: 0, z: 0.5 }).kagitlar;
  const [p] = sekmeDortgeni(kg);
  assert.ok(Math.abs(p[0] - (1 - 0.625 + 0.08 * 1.25)) < 1e-9);
  assert.ok(Math.abs(p[1] - (-1 - 0.45 + 0.14 * 0.9)) < 1e-9);
  assert.ok(Math.abs(p[2] - 0.6) < 1e-9);
});

test("tohum dağınıklığı belirler; adet artınca alttakiler kıpırdamaz", () => {
  const a = yigin({ cx: 0, cy: 0, adet: 3, tohum: 7 }), b = yigin({ cx: 0, cy: 0, adet: 5, tohum: 7 });
  assert.deepEqual(b.kagitlar.slice(0, 3).map((k) => k.taban), a.kagitlar.map((k) => k.taban));
  assert.notDeepEqual(yigin({ cx: 0, cy: 0, adet: 3, tohum: 8 }).kagitlar[0].taban, a.kagitlar[0].taban);
  assert.notDeepEqual(a.kagitlar[0].taban, yigin({ cx: 0, cy: 0, adet: 1, sapma: 0 }).kagitlar[0].taban);
});

test("dağınıklık açısı sapma ile sınırlı", () => {
  const sapma = 0.1;
  const y = yigin({ cx: 0, cy: 0, adet: 20, tohum: 11, sapma });
  let maxAbs = 0;
  for (const k of y.kagitlar) {
    const [c0, c1] = k.taban;
    const aci = Math.atan2(c1[1] - c0[1], c1[0] - c0[0]);
    assert.ok(Math.abs(aci) <= sapma + 1e-9);
    maxAbs = Math.max(maxAbs, Math.abs(aci));
  }
  assert.ok(maxAbs > 0.01);
});

test("cizgili: false ise hiçbir kâğıtta ust true değildir, sekme yine en üstte", () => {
  const y = yigin({ cx: 0, cy: 0, adet: 3, sekme: "#4a90e2", cizgili: false });
  assert.ok(y.kagitlar.every((k) => k.ust === false));
  assert.deepEqual(y.kagitlar.map((k) => k.sekme), [null, null, "#4a90e2"]);
});
