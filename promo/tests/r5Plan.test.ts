import { test } from "node:test";
import assert from "node:assert/strict";
import { MEB_MODULLER } from "../../apps/hub/src/modules/atolye/lib/meb-program.ts";
import { R5_MEB, R5_PLAN_MD, R5_COUNTS } from "../src/reels/r5-meb-atolye/plan.ts";

test("MEB seçimi resmî veriyle birebir aynı", () => {
  const modul = MEB_MODULLER.find((m) => m.no === R5_MEB.modul.no)!;
  assert.equal(modul.ad, R5_MEB.modul.ad);
  const bolum = modul.bolumler.find((b) => b.kod === R5_MEB.bolum.kod)!;
  assert.equal(bolum.ad, R5_MEB.bolum.ad);
  const hedef = bolum.hedefler.find((h) => h.kod === R5_MEB.hedef.kod)!;
  assert.equal(hedef.metin, R5_MEB.hedef.metin);
  for (const d of R5_MEB.davranislar) {
    assert.equal(hedef.hedefDavranislar.find((x) => x.kod === d.kod)?.metin, d.metin);
  }
});

test("program sayıları gerçek veriden", () => {
  const hedefler = MEB_MODULLER.flatMap((m) => m.bolumler.flatMap((b) => b.hedefler));
  assert.equal(MEB_MODULLER.length, R5_COUNTS.modul);
  assert.equal(hedefler.length, R5_COUNTS.hedef);
  assert.equal(hedefler.flatMap((h) => h.hedefDavranislar).length, R5_COUNTS.davranis);
});

test("taslak ürün prompt'unun bölümlerini taşır, ad/hız iddiası yok", () => {
  for (const h of ["Seans Künyesi", "Etkinlik Akışı", "Materyaller", "Ölçme", "Ev Görevi", "Sonraki Adım"]) {
    assert.match(R5_PLAN_MD, new RegExp(`## ${h}`));
  }
  for (const a of ["Isınma", "Ana Etkinlik", "Tekrar/Oyun", "Kapanış"]) assert.match(R5_PLAN_MD, new RegExp(a));
  assert.doesNotMatch(R5_PLAN_MD, /saniye|dakikada|\b(Ali|Ayşe|Eymen|Zeynep|Elif)\b/);
});
