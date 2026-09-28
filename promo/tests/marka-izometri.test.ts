import { test } from "node:test";
import assert from "node:assert/strict";
import { derinlik, gorunur, izd, kabuk, karistir, kup, prizma, yuzMatrisi, yuzRengi, type Kamera, type V3 } from "../src/marka/izometri.ts";

const K: Kamera = { s: 100, ox: 1000, oy: 500, don: 0 };
const C30 = Math.cos(Math.PI / 6);
const yakin = (a: number[], b: number[], eps = 1e-6) => a.every((v, i) => Math.abs(v - b[i]) < eps);
const yon = (n: V3) => n.map((v) => Math.round(v) + 0).join(",");

test("izdüşüm: merkez, yukarı, +x ve +y yönleri", () => {
  assert.deepEqual(izd([0, 0, 0], K), [1000, 500]);
  assert.ok(yakin(izd([0, 0, 1], K), [1000, 400]));
  assert.ok(yakin(izd([1, 0, 0], K), [1000 + C30 * 100, 550]));
  assert.ok(yakin(izd([0, 1, 0], K), [1000 - C30 * 100, 550]));
});

test("küp: düz bakışta üst, +x ve +y yüzleri görünür", () => {
  const gorunen = kup([0, 0, 0.5], 1).filter((y) => gorunur(y, K)).map((y) => yon(y.n));
  assert.deepEqual(gorunen.sort(), ["0,0,1", "0,1,0", "1,0,0"]);
});

test("tabla 90° dönünce -y yüzü görünür olur", () => {
  const k = { ...K, don: Math.PI / 2 };
  const gorunen = kup([0, 0, 0.5], 1).filter((y) => gorunur(y, k)).map((y) => yon(y.n));
  assert.equal(gorunen.length, 3);
  assert.ok(gorunen.includes("0,-1,0"));
});

test("prizma: üst yüz + dört yan yüz, normaller dışa bakar", () => {
  const yuzler = prizma([[0, 0], [2, 0], [2, 1], [0, 1]], 0, 0.5);
  assert.equal(yuzler.length, 5);
  assert.equal(yon(yuzler[0].n), "0,0,1");
  assert.deepEqual(yuzler.slice(1).map((y) => yon(y.n)).sort(), ["-1,0,0", "0,-1,0", "0,1,0", "1,0,0"]);
});

test("yüz rengi: üst açık boya, +x sağ, +y sol", () => {
  const b = { ust: "#ffffff", sol: "#aaaaaa", sag: "#000000" };
  const yuzler = kup([0, 0, 0.5], 1);
  const bul = (n: string) => yuzler.find((y) => yon(y.n) === n)!;
  assert.equal(yuzRengi(bul("0,0,1"), K, b), "#ffffff");
  assert.equal(yuzRengi(bul("1,0,0"), K, b), "rgb(0,0,0)");
  assert.equal(yuzRengi(bul("0,1,0"), K, b), "rgb(170,170,170)");
});

test("karıştır: iki renk arası doğrusal", () => {
  assert.equal(karistir("#000000", "#ffffff", 0.5), "rgb(128,128,128)");
});

test("kabuk: içteki noktalar düşer", () => {
  assert.equal(kabuk([[0, 0], [4, 0], [4, 4], [0, 4], [2, 2], [1, 3]]).length, 4);
});

test("derinlik: izleyiciye yakın ve yüksek olan sonra çizilir", () => {
  assert.ok(derinlik([1, 1, 0], K) > derinlik([-1, -1, 0], K));
  assert.ok(derinlik([0, 0, 1], K) > derinlik([0, 0, 0], K));
});

test("yüz matrisi: 64'lük kutunun köşeleri yüz köşelerine gider", () => {
  const p0: V3 = [0, 0.5, 1], pu: V3 = [1, 0.5, 1], pv: V3 = [0, 0.5, 0];
  const m = yuzMatrisi(p0, pu, pv, K).match(/matrix\(([^)]+)\)/)![1].split(" ").map(Number);
  const uygula = (x: number, y: number) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  assert.ok(yakin(uygula(0, 0), izd(p0, K), 0.01));
  assert.ok(yakin(uygula(64, 0), izd(pu, K), 0.01));
  assert.ok(yakin(uygula(0, 64), izd(pv, K), 0.01));
});
