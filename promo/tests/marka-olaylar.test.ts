import { test } from "node:test";
import assert from "node:assert/strict";
import { HEDEFLER, METIN } from "../src/marka/metin.ts";
import { KANCA, SESLER_169 } from "../src/marka/olaylar.ts";
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
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "tik").map((s) => s.vurus), [...KANCA.etiketler]);
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
