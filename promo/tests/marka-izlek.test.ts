import { test } from "node:test";
import assert from "node:assert/strict";
import { Easing } from "remotion";
import { izlek } from "../src/marka/izlek.ts";

test("anahtarlardan önce ilk, sonra son değer; anahtarlarda tam değer", () => {
  const z = izlek([{ f: 10, d: 1 }, { f: 20, d: 3 }, { f: 30, d: 0 }]);
  assert.equal(z(0), 1);
  assert.equal(z(10), 1);
  assert.equal(z(20), 3);
  assert.equal(z(30), 0);
  assert.equal(z(99), 0);
  assert.equal(z(15), 2);
});

test("parçanın eğrisi bitiş anahtarında verilir", () => {
  const z = izlek([{ f: 0, d: 0 }, { f: 10, d: 1, e: Easing.in(Easing.quad) }]);
  assert.ok(Math.abs(z(5) - 0.25) < 1e-9);
});

test("artmayan anahtarlar reddedilir", () => {
  assert.throws(() => izlek([{ f: 5, d: 0 }, { f: 5, d: 1 }]));
  assert.throws(() => izlek([]));
});
