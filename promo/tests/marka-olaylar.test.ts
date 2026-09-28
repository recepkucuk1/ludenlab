import { test } from "node:test";
import assert from "node:assert/strict";
import { HEDEFLER, METIN } from "../src/marka/metin.ts";
import { ATOLYE, DONUS, KANCA, SESLER_169, STUDIO, YUK } from "../src/marka/olaylar.ts";
import { BOLUMLER_169 } from "../src/marka/zaman.ts";

test("ses olayları vuruş ızgarasında, sıralı ve film içinde", () => {
  const son = BOLUMLER_169[BOLUMLER_169.length - 1].son;
  let onceki = 0;
  for (const s of SESLER_169) {
    assert.ok(Number.isInteger(s.vurus), `${s.vurus}`);
    assert.ok(s.vurus >= 1 && s.vurus <= son, `${s.vurus}`);
    assert.ok(s.vurus >= onceki, `sıra: ${s.vurus}`);
    onceki = s.vurus;
  }
});

test("kanca: whoosh inişte biter, tok inişte, her etikette tık", () => {
  const w = SESLER_169.find((s) => s.tur === "whoosh")!;
  assert.equal(w.vurus, KANCA.dusus);
  assert.equal(w.vurus + (w.vurusSure ?? 0), KANCA.inis);
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "tok" && s.vurus <= 8).map((s) => s.vurus), [KANCA.inis]);
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "tik" && s.vurus <= 8).map((s) => s.vurus), [...KANCA.etiketler]);
});

test("kanca vuruşları Kanca bölümünün içinde", () => {
  const kanca = BOLUMLER_169.find((b) => b.id === "kanca")!;
  for (const v of [KANCA.dusus, KANCA.inis, ...KANCA.baslik, KANCA.ustCumle, ...KANCA.etiketler]) {
    assert.ok(v >= kanca.ilk && v <= kanca.son, `${v}`);
  }
});

test("etiket ve başlık vuruşları metinle eşleşir", () => {
  assert.equal(KANCA.etiketler.length, HEDEFLER.length);
  assert.equal(KANCA.baslik.length, METIN.kanca.baslik.length);
});

test("yük: v9–22 her vuruşta bir deste; son yığınlar 11/12/14/21", () => {
  assert.deepEqual(YUK.desteler.map((d) => d.vurus), [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);
  const toplam = (id: string) => YUK.desteler.filter((d) => d.yigin === id).reduce((s, d) => s + d.adet, 0);
  assert.deepEqual(["S1", "S2", "S3", "S4"].map(toplam), [11, 12, 14, 21]);
  assert.equal(YUK.desteler.filter((d) => d.etiket).length, 7);
});

test("yük: her deste inişinde kâğıt sesi", () => {
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "kagit").map((s) => s.vurus), YUK.desteler.map((d) => d.vurus));
});

test("dönüş: tabla sesi v25'te 2 vuruş; yerleşme tıkları ve künye tıkı", () => {
  const donus = (s: { vurus: number }) => s.vurus >= DONUS.tabla && s.vurus <= 32;
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "donus" && donus(s)).map((s) => [s.vurus, s.vurusSure]), [[DONUS.tabla, 2]]);
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "tik" && s.vurus > 8 && donus(s)).map((s) => s.vurus), [...DONUS.yerlesme, DONUS.kunye]);
});

test("yük ve dönüş vuruşları kendi bölümlerinde", () => {
  const b = (id: string) => BOLUMLER_169.find((x) => x.id === id)!;
  for (const v of [YUK.baslik, YUK.altCumle, ...YUK.desteler.map((d) => d.vurus)]) assert.ok(v >= b("yuk").ilk && v <= b("yuk").son, `${v}`);
  for (const v of [DONUS.tabla, DONUS.cumle, DONUS.kunye, ...DONUS.cipler, ...DONUS.yerlesme]) assert.ok(v >= b("donus").ilk && v <= b("donus").son, `${v}`);
});

test("studio: dönüş, etiket tıkları, kart açılışı ve iki deste çevirme", () => {
  const b = (s: { vurus: number }) => s.vurus >= 33 && s.vurus <= 52;
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "donus" && b(s)).map((s) => s.vurus), [STUDIO.tabla]);
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "tik" && b(s)).map((s) => s.vurus), [...STUDIO.etiketler, ...STUDIO.kartEtiketleri]);
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "sayfa" && b(s)).map((s) => s.vurus), [STUDIO.kart, ...STUDIO.cevir]);
});

test("atölye: basamak tıklarında perde yükselir, damgada tok", () => {
  const b = (s: { vurus: number }) => s.vurus >= 53 && s.vurus <= 72;
  const basamak = SESLER_169.filter((s) => s.tur === "tik" && ATOLYE.basamaklar.includes(s.vurus as 57 | 58 | 59));
  assert.deepEqual(basamak.map((s) => s.vurus), [...ATOLYE.basamaklar]);
  const perdeler = basamak.map((s) => s.perde ?? 1);
  assert.ok(perdeler[0] < perdeler[1] && perdeler[1] < perdeler[2], `${perdeler}`);
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "tok" && b(s)).map((s) => s.vurus), [ATOLYE.damga]);
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "sayfa" && b(s)).map((s) => s.vurus), [ATOLYE.kart]);
});

test("studio ve atölye vuruşları kendi bölümlerinde", () => {
  const b = (id: string) => BOLUMLER_169.find((x) => x.id === id)!;
  const s = [STUDIO.tabla, STUDIO.kilit, STUDIO.kitle, ...STUDIO.etiketler, STUDIO.kart, STUDIO.cumle, ...STUDIO.kartEtiketleri, STUDIO.araclar, ...STUDIO.cevir];
  for (const v of s) assert.ok(v >= b("studio").ilk && v <= b("studio").son, `studio ${v}`);
  const a = [ATOLYE.tabla, ATOLYE.kilit, ATOLYE.kitle, ATOLYE.meb, ...ATOLYE.basamaklar, ATOLYE.kart, ATOLYE.cumle, ATOLYE.damga, ATOLYE.sonSoz, ...ATOLYE.kartEtiketleri, ATOLYE.araclar];
  for (const v of a) assert.ok(v >= b("atolye").ilk && v <= b("atolye").son, `atölye ${v}`);
});
