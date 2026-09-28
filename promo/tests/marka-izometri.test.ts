import { test } from "node:test";
import assert from "node:assert/strict";
import {
  derinlik,
  dikdortgenTaban,
  dondur3,
  gorunur,
  izd,
  kabuk,
  karistir,
  kup,
  prizma,
  yuvarlakTaban,
  yuzMatrisi,
  yuzRengi,
  type Kamera,
  type V2,
  type V3,
} from "../src/marka/izometri.ts";

const K: Kamera = { s: 100, ox: 1000, oy: 500, don: 0 };
const C30 = Math.cos(Math.PI / 6);
const yakin = (a: number[], b: number[], eps = 1e-6) => a.every((v, i) => Math.abs(v - b[i]) < eps);
const yon = (n: V3) => n.map((v) => Math.round(v) + 0).join(",");
/** Shoelace formülüyle çokgen alanı (mutlak değer). */
const alan = (ps: V2[]) => {
  let toplam = 0;
  for (let i = 0; i < ps.length; i++) {
    const [x0, y0] = ps[i];
    const [x1, y1] = ps[(i + 1) % ps.length];
    toplam += x0 * y1 - x1 * y0;
  }
  return Math.abs(toplam) / 2;
};

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
  assert.deepEqual(gorunen.sort(), ["0,-1,0", "0,0,1", "1,0,0"]);
});

test("görünen yüzler izdüşüm kabuğunu tam örter (dönüşlü küp ve prizma)", () => {
  const donlar = [0, 0.45, Math.PI / 2, 2.1, -1.3];
  const aciler: V3[] = [
    [0, 0, 0],
    [0.5, 0.35, 0.45],
    [1.1, -0.7, 2.3],
    [-0.4, 1.3, 0.2],
  ];
  const sekiller = [
    ...aciler.map((aci) => kup([0.3, -0.2, 0.5], 1, aci)),
    prizma(dikdortgenTaban(0.4, -0.6, 1.25, 0.9, 0.3), 0.2, 0.1),
    prizma(yuvarlakTaban(-2.6, -2.6, 2.6, 2.6, 0.55), -0.32, 0.32),
    // Merkezî simetrisi olmayan (kenarları eşleşmeyen) taban: küpün ve dikdörtgen/
    // yuvarlak tabanların karşılıklı yüzleri merkeze göre nokta-simetriktir, bu yüzden
    // izdüşümdeki alanları hep eşittir — yanlış yüz seçilse bile toplam alan değişmez.
    // Bu asimetrik taban, yüz seçimindeki hatayı (izd'nin don işaretini ters çevirmesi gibi)
    // gerçekten yakalayabilmek için eklendi.
    prizma([[0, 0], [3, 0], [2.2, 1.6], [0, 0.9]], 0, 0.5),
  ];
  for (const yuzler of sekiller) {
    for (const don of donlar) {
      const k: Kamera = { ...K, don };
      const gorunenAlan = yuzler
        .filter((y) => gorunur(y, k))
        .reduce((toplam, y) => toplam + alan(y.ps.map((p) => izd(p, k))), 0);
      const tumKoseler = yuzler.flatMap((y) => y.ps.map((p) => izd(p, k)));
      const kabukAlani = alan(kabuk(tumKoseler));
      assert.ok(
        Math.abs(gorunenAlan - kabukAlani) / kabukAlani < 1e-9,
        `don=${don}: görünen=${gorunenAlan} kabuk=${kabukAlani}`,
      );
    }
  }
});

test("küp: yüz normalleri de merkez dönüşüyle (yalnız köşeler değil) birlikte döner", () => {
  // Küpün karşılıklı yüzleri her zaman merkeze göre nokta-simetriktir, bu yüzden
  // yukarıdaki alan-örtüşme testi yanlış yüz normali seçilse bile bunu yakalayamaz
  // (toplam izdüşüm alanı değişmez). Bu yüzden doğrudan karşılaştırma gerekir:
  // n alanı da köşeler (ps) gibi dondur3(n, aci) ile dönmeli, ham taban normali değil.
  const aci: V3 = [0.5, 0.35, 0.45];
  const taban = kup([0, 0, 0], 1);
  const donmus = kup([0, 0, 0], 1, aci);
  donmus.forEach((y, i) => {
    assert.ok(yakin(y.n, dondur3(taban[i].n, aci), 1e-9));
  });
});

test("prizma: üst yüz + dört yan yüz, normaller dışa bakar", () => {
  const yuzler = prizma([[0, 0], [2, 0], [2, 1], [0, 1]], 0, 0.5);
  assert.equal(yuzler.length, 5);
  assert.equal(yon(yuzler[0].n), "0,0,1");
  assert.deepEqual(yuzler.slice(1).map((y) => yon(y.n)).sort(), ["-1,0,0", "0,-1,0", "0,1,0", "1,0,0"]);
});

test("prizma: saat yönündeki tabanda da normaller dışa bakar", () => {
  const yuzler = prizma([[0, 1], [2, 1], [2, 0], [0, 0]], 0, 0.5);
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
  const ps = kabuk([[0, 0], [4, 0], [4, 4], [0, 4], [2, 2], [1, 3], [2, 0]]);
  assert.deepEqual(ps.map(([x, y]) => `${x},${y}`).sort(), ["0,0", "0,4", "4,0", "4,4"]);
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
