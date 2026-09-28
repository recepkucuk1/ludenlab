import { test } from "node:test";
import assert from "node:assert/strict";
import { izd } from "../src/marka/izometri.ts";
import { HEDEFLER } from "../src/marka/metin.ts";
import { GENEL_KAMERA, HEDEF_YERLESIMI } from "../src/marka/yerlesim.ts";

test("her hedefin bir yerleşimi var", () => {
  assert.equal(HEDEF_YERLESIMI.length, HEDEFLER.length);
});

test("etiket çapaları bloğun yan yüzlerinde değil (onay kapısı 1)", () => {
  for (const { capa } of HEDEF_YERLESIMI) {
    const [x, y, z] = capa;
    const ustYuzde = z === 1 && Math.abs(x) <= 0.5 && Math.abs(y) <= 0.5;
    const tablada = z === 0 && (Math.abs(x) > 0.5 || Math.abs(y) > 0.5);
    assert.ok(ustYuzde || tablada, `${capa}`);
  }
});

test("genel plan kamerası: blok ekranın sağ yarısında", () => {
  assert.ok(izd([0, 0, 0.5], GENEL_KAMERA)[0] > 960);
});
