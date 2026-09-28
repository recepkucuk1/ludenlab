import { test } from "node:test";
import assert from "node:assert/strict";
import { ACILIS_KARE, DUSUS_YUKSEKLIGI, acilisDurumu } from "../src/marka/acilisDurumu.ts";
import { KANCA } from "../src/marka/olaylar.ts";
import { kare } from "../src/marka/zaman.ts";

const INIS = kare(KANCA.inis);

test("açılış 8 vuruş + 6 kare = 150 kare", () => {
  assert.equal(ACILIS_KARE, 150);
});

test("ilk kare: blok yukarıda, yüz ve etiketler yok, yuva görünür, kamera genel planda", () => {
  const d = acilisDurumu(0);
  assert.equal(d.blokZ, DUSUS_YUKSEKLIGI);
  assert.equal(d.yuz, 0);
  assert.equal(d.yuva, 1);
  assert.deepEqual(d.etiketCip, [0, 0, 0]);
  assert.deepEqual(d.etiketCizgi, [0, 0, 0]);
  assert.equal(d.kamera, 1);
  assert.equal(d.sarsinti, 0);
});

test("düşüş ivmeli: yükseklik her karede azalır, hız artar", () => {
  let oncekiZ = acilisDurumu(0).blokZ;
  let oncekiHiz = 0;
  for (let f = 1; f <= INIS; f++) {
    const z = acilisDurumu(f).blokZ;
    const hiz = oncekiZ - z;
    assert.ok(hiz > 0, `f=${f}`);
    assert.ok(hiz >= oncekiHiz - 1e-9, `f=${f}`);
    oncekiZ = z;
    oncekiHiz = hiz;
  }
});

test("iniş: vuruşun tam üstünde yerde ve düz; zıplamadan oturur", () => {
  assert.ok(acilisDurumu(INIS - 1).blokZ > 0);
  const d = acilisDurumu(INIS);
  assert.equal(d.blokZ, 0);
  assert.ok(d.blokAci.every((v) => v === 0), `${d.blokAci}`);
  let onceki = Infinity;
  for (let f = INIS; f <= INIS + 12; f++) {
    const s = acilisDurumu(f);
    assert.equal(s.blokZ, 0);
    assert.ok(s.sarsinti >= 0 && s.sarsinti <= onceki, `f=${f}`);
    onceki = s.sarsinti;
  }
  assert.equal(acilisDurumu(INIS).sarsinti, 6);
  assert.equal(acilisDurumu(INIS + 6).sarsinti, 0);
});

test("yüz inişten sonra belirir, yuva inişte söner", () => {
  assert.equal(acilisDurumu(INIS).yuz, 0);
  assert.equal(acilisDurumu(INIS + 12).yuz, 1);
  assert.equal(acilisDurumu(INIS - 1).yuva, 1);
  assert.equal(acilisDurumu(INIS + 6).yuva, 0);
});

test("başlık satırları kendi vuruşlarında açılır", () => {
  KANCA.baslik.forEach((v, i) => {
    assert.equal(acilisDurumu(kare(v) - 1).satirlar[i], 0, `satır ${i}`);
    assert.equal(acilisDurumu(kare(v) + 10).satirlar[i], 1, `satır ${i}`);
  });
});

test("üst cümle kendi vuruşunda açılır", () => {
  assert.equal(acilisDurumu(kare(KANCA.ustCumle) - 1).ust, 0);
  assert.equal(acilisDurumu(kare(KANCA.ustCumle) + 14).ust, 1);
});

test("etiket: çip önce netleşir, çizgi raptiyeye tam vuruşunda varır", () => {
  KANCA.etiketler.forEach((v, i) => {
    assert.equal(acilisDurumu(kare(v) - 16).etiketCip[i], 0, `çip ${i}`);
    assert.equal(acilisDurumu(kare(v) - 4).etiketCip[i], 1, `çip ${i}`);
    assert.equal(acilisDurumu(kare(v) - 10).etiketCizgi[i], 0, `çizgi ${i}`);
    assert.ok(acilisDurumu(kare(v) - 1).etiketCizgi[i] < 1, `çizgi ${i}`);
    assert.equal(acilisDurumu(kare(v)).etiketCizgi[i], 1, `çizgi ${i}`);
  });
});

test("kamera en çok %3 iter ve geri gitmez; sahne hiç durmaz", () => {
  let oncekiK = 1;
  let oncekiKayma = -1;
  for (let f = 0; f < ACILIS_KARE; f++) {
    const d = acilisDurumu(f);
    assert.ok(d.kamera >= oncekiK - 1e-12 && d.kamera <= 1.03 + 1e-12, `f=${f}`);
    assert.ok(d.kayma > oncekiKayma, `f=${f}`);
    oncekiK = d.kamera;
    oncekiKayma = d.kayma;
  }
});
