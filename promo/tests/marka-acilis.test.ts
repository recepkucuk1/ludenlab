import { test } from "node:test";
import assert from "node:assert/strict";
import { ACILIS_KARE, DUSUS_YUKSEKLIGI, acilisDurumu } from "../src/marka/acilisDurumu.ts";
import { izd, kup } from "../src/marka/izometri.ts";
import { KANCA } from "../src/marka/olaylar.ts";
import { GENEL_KAMERA } from "../src/marka/yerlesim.ts";
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
    if (f >= 2) assert.ok(hiz > oncekiHiz + 1e-9, `f=${f}`);
    oncekiZ = z;
    oncekiHiz = hiz;
  }
});

test("blok ilk karede kadrajın üstünde", () => {
  const d = acilisDurumu(0);
  const ekranlar = kup([0, 0, 0.5 + d.blokZ], 1, d.blokAci).flatMap((y) => y.ps.map((p) => izd(p, GENEL_KAMERA)));
  assert.ok(ekranlar.length > 0);
  assert.ok(ekranlar.every(([, y]) => y < 0), `en aşağı köşe y=${Math.max(...ekranlar.map(([, y]) => y))}`);
});

test("takla düşüşün görünen kısmında seçilir", () => {
  for (const f of [23, 29]) {
    const en = Math.max(...acilisDurumu(f).blokAci.map(Math.abs));
    assert.ok(en >= 0.12, `f=${f} en büyük açı=${en}`);
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

test("sarsıntı inişten önce hiç yok", () => {
  for (let f = 0; f <= INIS - 1; f++) assert.equal(acilisDurumu(f).sarsinti, 0, `f=${f}`);
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

test("metin ara karelerde kısmen açık (anında belirmez)", () => {
  const satir = acilisDurumu(kare(KANCA.baslik[0]) + 5).satirlar[0];
  assert.ok(satir > 0 && satir < 1, `satır=${satir}`);
  const ust = acilisDurumu(kare(KANCA.ustCumle) + 7).ust;
  assert.ok(ust > 0 && ust < 1, `ust=${ust}`);
});

test("etiket: çip önce netleşir, çizgi raptiyeye tam vuruşunda varır", () => {
  KANCA.etiketler.forEach((v, i) => {
    assert.equal(acilisDurumu(kare(v) - 24).etiketCip[i], 0, `çip ${i}`);
    assert.equal(acilisDurumu(kare(v) - 6).etiketCip[i], 1, `çip ${i}`);
    // Çizgi başlarken çip neredeyse net.
    assert.ok(acilisDurumu(kare(v) - 10).etiketCip[i] >= 0.85, `çip ${i}`);
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

test("kamera en az %2 iter", () => {
  assert.ok(acilisDurumu(ACILIS_KARE - 1).kamera >= 1.02);
});

test("ışık sürekli kayar", () => {
  let onceki = -Infinity;
  for (let f = 0; f < ACILIS_KARE; f++) {
    const isik = acilisDurumu(f).isik;
    assert.ok(isik > onceki, `f=${f}`);
    onceki = isik;
  }
});
