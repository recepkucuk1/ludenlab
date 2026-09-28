import { test } from "node:test";
import assert from "node:assert/strict";
import { HEDEFLER, METIN } from "../src/marka/metin.ts";
import { DONUS, KANCA, SESLER_169, YUK } from "../src/marka/olaylar.ts";
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
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "tok").map((s) => s.vurus), [KANCA.inis]);
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
  const d = SESLER_169.filter((s) => s.tur === "donus");
  assert.deepEqual(d.map((s) => [s.vurus, s.vurusSure]), [[DONUS.tabla, 2]]);
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "tik" && s.vurus > 8).map((s) => s.vurus), [...DONUS.yerlesme, DONUS.kunye]);
});

test("yük ve dönüş vuruşları kendi bölümlerinde", () => {
  const b = (id: string) => BOLUMLER_169.find((x) => x.id === id)!;
  for (const v of [YUK.baslik, YUK.altCumle, ...YUK.desteler.map((d) => d.vurus)]) assert.ok(v >= b("yuk").ilk && v <= b("yuk").son, `${v}`);
  for (const v of [DONUS.tabla, DONUS.cumle, DONUS.kunye, ...DONUS.cipler, ...DONUS.yerlesme]) assert.ok(v >= b("donus").ilk && v <= b("donus").son, `${v}`);
});
