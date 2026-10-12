import { test } from "node:test";
import assert from "node:assert/strict";
import { filmDurumu } from "../src/marka/filmDurumu.ts";
import { ATOLYE_KART, modulKatmani, STUDIO_KART } from "../src/marka/moduller.ts";
import { ATOLYE, STUDIO } from "../src/marka/olaylar.ts";
import { CIP, DAMGA_BOYUT, TUVAL_169 } from "../src/marka/tema.ts";
import { kare } from "../src/marka/zaman.ts";

const K33 = kare(STUDIO.tabla);
const K53 = kare(ATOLYE.tabla);
const K73 = kare(73);
const etiket = (f: number, id: string) => modulKatmani(f).etiketler.find((e) => e.id === id);
const kart = (f: number, id: string) => modulKatmani(f).kartlar.find((k) => k.id === id);

test("Studio etiketleri vuruşlarında raptiyeye varır, kart açılırken çıkar", () => {
  STUDIO.etiketler.forEach((v, i) => {
    assert.ok(etiket(kare(v) - 1, `studio-${i}`)!.ilerleme < 1, `v${v}`);
    assert.equal(etiket(kare(v), `studio-${i}`)!.ilerleme, 1, `v${v}`);
  });
  assert.equal(etiket(kare(STUDIO.kart) + 12, "studio-0"), undefined);
});

test("Atölye basamakları vuruşlarında varır; ikinci ve üçüncü bir öncekine bağlı", () => {
  ATOLYE.basamaklar.forEach((v, i) => {
    const e = etiket(kare(v), `basamak-${i}`)!;
    assert.equal(e.ilerleme, 1, `v${v}`);
    if (i > 0) assert.ok(e.capaEkran, `basamak ${i} ekran çapası`);
  });
});

test("Studio kartı yığından açılır: başta küçük ve dönük, 36 karede yerinde", () => {
  const k41 = kare(STUDIO.kart);
  assert.equal(kart(k41 - 1, "studio-0"), undefined);
  const bas = kart(k41, "studio-0")!;
  assert.ok(bas.olcek < 0.3 && bas.rotY > 30, `${bas.olcek} ${bas.rotY}`);
  const son = kart(k41 + 36, "studio-0")!;
  assert.equal(son.olcek, 1);
  assert.equal(son.rotY, 0);
  assert.equal(son.cx, STUDIO_KART.cx);
  assert.equal(son.cy, STUDIO_KART.cy);
});

test("deste çevirme: v48'de Artikülasyon döner, Sosyal Hikaye öne; v50'de Öğrenme Kartı öne", () => {
  const [c1, c2] = STUDIO.cevir.map((v) => kare(v));
  // Vuruştan hemen önce ön kart hâlâ Artikülasyon ve düz.
  const once = kart(c1 - 1, "studio-0")!;
  assert.equal(once.sira, 0);
  assert.equal(once.rotY, 0);
  // İlk çevirme vuruşta başlar: ön kart 8 karede gider, sonra Sosyal Hikaye öne oturur.
  assert.equal(kart(c1 + 8, "studio-0")?.opaklik ?? 0, 0);
  const r4 = kart(c1 + 10, "studio-1")!;
  assert.equal(r4.sira, 0);
  assert.equal(r4.cx, STUDIO_KART.cx);
  // İkincisi de aynı biçimde: Öğrenme Kartı öne gelir.
  const r2 = kart(c2 + 10, "studio-2")!;
  assert.equal(r2.sira, 0);
  assert.equal(r2.cy, STUDIO_KART.cy);
});

test("TASLAK damgası v65'te tam ölçekte iner", () => {
  const k = kare(ATOLYE.damga);
  assert.equal(modulKatmani(k - 7).damga?.opaklik ?? 0, 0);
  const d = modulKatmani(k).damga!;
  assert.equal(d.opaklik, 1);
  assert.ok(Math.abs(d.olcek - 1) < 1e-9, `${d.olcek}`);
});

// Seans planı görselinde ("MEB hedefi" satırı) satırın üst kenarı kartın kendi çerçevesinde y ≈ 148,8 (görselden ölçüldü).
const MEB_SATIRI_UST = 148.8;
const rad = (a: number) => (a * Math.PI) / 180;
const don = (x: number, y: number, aci: number): [number, number] => [x * Math.cos(rad(aci)) - y * Math.sin(rad(aci)), x * Math.sin(rad(aci)) + y * Math.cos(rad(aci))];

test("TASLAK damgasının dört köşesi kartın üstünde; MEB hedefi satırını ve raptiyeleri örtmez", () => {
  const d = modulKatmani(kare(ATOLYE.damga)).damga!;
  const { cx, cy, w, h, egim } = ATOLYE_KART;
  const [hw, hh] = [(DAMGA_BOYUT.w / 2) * d.olcek, (DAMGA_BOYUT.h / 2) * d.olcek];
  // Ekran noktası → kartın kendi çerçevesi (eğim geri alınır, sol üst köşe orijin).
  const yerel = (px: number, py: number) => {
    const [x, y] = don(px - cx, py - cy, -egim);
    return [x + w / 2, y + h / 2];
  };
  const kose = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => {
    const [dx, dy] = don(x, y, d.aci);
    return yerel(d.x + dx, d.y + dy);
  });
  for (const [x, y] of kose) {
    assert.ok(x >= 6 && x <= w - 6 && y >= 6 && y <= h - 6, `köşe kartın dışında: ${x.toFixed(1)}, ${y.toFixed(1)}`);
  }
  const enAlt = Math.max(...kose.map(([, y]) => y));
  assert.ok(enAlt <= MEB_SATIRI_UST - 4, `damga MEB hedefi satırına biniyor: ${enAlt.toFixed(1)} > ${MEB_SATIRI_UST - 4}`);
  // Raptiyeler damganın (döndürülmüş) dikdörtgeninin dışında, 8 px payla.
  for (const id of ["atolye-kart-0", "atolye-kart-1"]) {
    const capa = etiket(kare(ATOLYE.kartEtiketleri[1]), id)!.capaEkran!;
    const [px, py] = don(capa[0] - d.x, capa[1] - d.y, -d.aci);
    assert.ok(Math.abs(px) > hw + 8 || Math.abs(py) > hh + 8, `${id} raptiyesi damganın altında`);
  }
});

test("kilitler: 01 Studio v33'te, 02 Atölye v53'te; Studio kilidi Atölye'de çıkar", () => {
  assert.equal(modulKatmani(K33 + 24).kilitler.find((k) => k.id === "kilit-studio")!.gorunum, 1);
  assert.equal(modulKatmani(K53 + 12).kilitler.find((k) => k.id === "kilit-studio"), undefined);
  assert.equal(modulKatmani(K53 + 24).kilitler.find((k) => k.id === "kilit-atolye")!.gorunum, 1);
});

test("kilitler çakışmaz: iki kutu birlikte görünmez; Studio kilidi giden Dönüş cümlesinin üstüne binmez", () => {
  for (let f = K33 - 12; f < K73; f++) {
    const d = filmDurumu(f);
    const gorunen = d.kilitler.filter((k) => k.gorunum > 0 && k.cikis < 1);
    assert.ok(gorunen.length <= 1, `f=${f}: ${gorunen.map((k) => k.id)}`);
    if (gorunen.some((k) => k.id === "kilit-studio")) assert.ok(!d.metinler.some((m) => m.id === "donus-cumle"), `f=${f}`);
  }
});

test("odak: Studio'da blok ve Atölye yığını soluk; Atölye'de blok ve Studio yığını soluk", () => {
  const yakin = (x: number[], y: number[]) => x.every((v, i) => Math.abs(v - y[i]) < 1e-9);
  const s = modulKatmani(K33 + 18).soluk;
  assert.ok(yakin([s.blok, s.studio, s.atolye], [0.3, 1, 0.3]), `${[s.blok, s.studio, s.atolye]}`);
  const a = modulKatmani(K53 + 18).soluk;
  assert.ok(yakin([a.blok, a.studio, a.atolye], [0.3, 0.3, 1]), `${[a.blok, a.studio, a.atolye]}`);
});

test("kartına dönüşen üst kâğıt yığından eksilir", () => {
  assert.equal(modulKatmani(kare(STUDIO.kart) - 1).eksik.studio, 0);
  assert.equal(modulKatmani(kare(STUDIO.kart)).eksik.studio, 1);
  assert.equal(modulKatmani(K53 + 12).eksik.studio, 0);
  assert.equal(modulKatmani(kare(ATOLYE.kart)).eksik.atolye, 1);
  assert.equal(modulKatmani(K73 - 1).eksik.atolye, 1);
});

test("Atölye bölümünde görsel üretimi çağrıştıran kart yok (yalnız taslak)", () => {
  const kartlar = modulKatmani(kare(70)).kartlar;
  assert.deepEqual(kartlar.map((k) => k.resim), ["real/r5-taslak.png"]);
});

test("araçlar satırı: 've N araç daha' kendi satırında (sayı adından kopmaz)", () => {
  const satirlar = (f: number, id: string) => modulKatmani(f).metinler.find((m) => m.id === id)!.satirlar;
  assert.deepEqual(satirlar(kare(STUDIO.araclar) + 20, "studio-araclar"), ["Öğrenme Kartı · Sosyal Hikaye · Artikülasyon", "ve 7 araç daha"]);
  assert.deepEqual(satirlar(kare(ATOLYE.araclar) + 20, "atolye-araclar"), ["Seans Planı · BEP & Rapor · Veli Mektubu", "ve 8 araç daha"]);
});

test("çıkışlar erken başlar: sonraki öğe belirirken önceki neredeyse gitmiş, kartı giden etiket artık işaret etmez", () => {
  const kS = kare(STUDIO.kart);
  const kA = kare(ATOLYE.kart);
  const c1 = kare(STUDIO.cevir[0]);
  STUDIO.etiketler.forEach((_, i) => {
    assert.ok(etiket(kS, `studio-${i}`)!.cikis >= 0.5, `dil/konuşma/işitme ${i}`);
    assert.equal(etiket(kS + 6, `studio-${i}`), undefined, `studio-${i} kart yükselirken hâlâ çiziliyor`);
  });
  ATOLYE.basamaklar.forEach((_, i) => {
    assert.ok(etiket(kA, `basamak-${i}`)!.cikis >= 0.5, `basamak ${i}`);
    assert.equal(etiket(kA + 6, `basamak-${i}`), undefined, `basamak-${i} kart açılırken hâlâ çiziliyor`);
  });
  // Ön kart 8 karede gider; kart etiketleri o kare çizilmez (eskiden 4 kare daha solarak işaret ediyordu).
  assert.equal(kart(c1 + 8, "studio-0"), undefined);
  STUDIO.kartEtiketleri.forEach((_, i) => assert.equal(etiket(c1 + 8, `studio-kart-${i}`), undefined, `studio-kart-${i}`));
});

// Hap çipin genişliği: Satoshi 700 harf başına ortalama 0,44 em (ölçülen 0,33–0,58); 0,5 uzun cümlelerde ~%10 pay bırakır.
const cipGenisligi = (e: { metin: string; nokta?: string }) => e.metin.length * CIP.boyut * 0.5 + 2 * CIP.yan + 2 * CIP.kenar + (e.nokta ? CIP.nokta : 0);

test("etiket çipleri v33–72 boyunca 120–1800 px sütununda kalır (kamera itmesi dahil)", () => {
  const sol = TUVAL_169.sol;
  const sag = TUVAL_169.w - TUVAL_169.sol;
  for (let f = K33; f < K73; f++) {
    const d = filmDurumu(f);
    const ekran = (x: number) => d.odak[0] + (x - d.odak[0]) * d.itme;
    for (const e of d.etiketler) {
      if (e.gorunum <= 0) continue;
      const w = cipGenisligi(e);
      const [a, b] = e.hiza === "sol" ? [e.x, e.x + w] : [e.x - w, e.x];
      assert.ok(ekran(b) <= sag, `f=${f} ${e.id} "${e.metin}" sağ kenar ${ekran(b).toFixed(0)} > ${sag}`);
      assert.ok(ekran(a) >= sol, `f=${f} ${e.id} "${e.metin}" sol kenar ${ekran(a).toFixed(0)} < ${sol}`);
    }
  }
});
