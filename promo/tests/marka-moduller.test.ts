import { test } from "node:test";
import assert from "node:assert/strict";
import { modulKatmani, STUDIO_KART } from "../src/marka/moduller.ts";
import { ATOLYE, STUDIO } from "../src/marka/olaylar.ts";
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

test("kilitler: 01 Studio v33'te, 02 Atölye v53'te; Studio kilidi Atölye'de çıkar", () => {
  assert.equal(modulKatmani(K33 + 24).kilitler.find((k) => k.id === "kilit-studio")!.gorunum, 1);
  assert.equal(modulKatmani(K53 + 12).kilitler.find((k) => k.id === "kilit-studio"), undefined);
  assert.equal(modulKatmani(K53 + 24).kilitler.find((k) => k.id === "kilit-atolye")!.gorunum, 1);
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
