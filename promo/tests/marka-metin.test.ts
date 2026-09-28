import { test } from "node:test";
import assert from "node:assert/strict";
import { HEDEFLER, MEB_PROGRAM, METIN, kelimeSayisi } from "../src/marka/metin.ts";
import { BOLUMLER_169 } from "../src/marka/zaman.ts";

const tumMetin = Object.values(METIN)
  .flatMap((m) => [...m.ekran, m.vo])
  .concat(HEDEFLER.map((h) => h.metin));
// Spec "İçerik kuralları": hız iddiası, ücretsiz plan, yanlış kitle, genel MEB iddiası, eski terimler, yanlış yazım.
const YASAK = [/saniye/iu, /dakika/iu, /ücretsiz/iu, /özel eğitim öğretmen/iu, /MEB uyumlu/iu, /kredi|jeton|token/iu, /Stüdyo/u, /Atolye/u];

test("içerik kuralları: yasak ifade yok", () => {
  for (const t of tumMetin) for (const y of YASAK) assert.ok(!y.test(t), `"${t}" içinde ${y}`);
});

test("MEB programı tam adıyla Atölye ekranında", () => {
  assert.ok(METIN.atolye.ekran.some((s) => s.includes(MEB_PROGRAM)));
});

test("kitle yazımı", () => {
  assert.ok(METIN.studio.ekran.includes("Dil ve konuşma alanında çalışan uzmanlar için."));
  assert.ok(METIN.atolye.ekran.includes("Öğrenme güçlüğü alanında çalışan uzmanlar için."));
});

test("seslendirme TTS yazımıyla", () => {
  for (const m of Object.values(METIN)) {
    assert.ok(!m.vo.includes("LudenLab"), m.vo);
    assert.ok(!m.vo.includes("ludenlab.com"), m.vo);
  }
});

test("her seslendirme satırı bölümüne sığar (2,3 kelime/sn, 1 vuruş gecikme)", () => {
  for (const b of BOLUMLER_169) {
    const sure = kelimeSayisi(METIN[b.id].vo) / 2.3;
    const yer = (b.son - b.ilk + 1) * 0.6 - 0.6;
    assert.ok(sure <= yer, `${b.id}: ${sure.toFixed(1)} sn > ${yer.toFixed(1)} sn`);
  }
});

test("toplam seslendirme 70 kelime", () => {
  assert.equal(Object.values(METIN).reduce((s, m) => s + kelimeSayisi(m.vo), 0), 70);
});
