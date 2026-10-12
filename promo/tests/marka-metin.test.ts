import { test } from "node:test";
import assert from "node:assert/strict";
import { ETIKETLER, HEDEFLER, MEB_PROGRAM, METIN, kelimeSayisi } from "../src/marka/metin.ts";
import { YUK } from "../src/marka/olaylar.ts";
import { BOLUMLER_169, saniye } from "../src/marka/zaman.ts";
import { YASAK, kat, ttsYazimiHatalari } from "./marka-yasak.ts";

const tumMetin = Object.values(METIN)
  .flatMap((m) => [...m.baslik, ...m.ekran, m.vo])
  .concat(HEDEFLER.map((h) => h.metin))
  .concat(Object.values(ETIKETLER).flat())
  .concat(YUK.desteler.flatMap((d) => (d.etiket ? [d.etiket] : [])));

test("içerik kuralları: yasak ifade yok", () => {
  for (const t of tumMetin) {
    const k = kat(t);
    for (const y of YASAK) assert.ok(!y.test(k), `"${t}" içinde ${y}`);
  }
});

test("yasak ifade denetimi büyük harf ve Türkçe İ'yi yakalar", () => {
  const ihlaller = [
    "SANİYELER İÇİNDE",
    "DAKİKALAR",
    "ÜCRETSİZ BAŞLA",
    "ÖZEL EĞİTİM ÖĞRETMENLERİ İÇİN",
    "KREDİ",
    "STÜDYO",
    "ATOLYE",
    "MEB UYUMLU",
    "ANINDA SONUÇ",
    "ÜRETİM HAKKI",
    "Ayda 2 üretim hakkı",
    "MEB ONAYLI",
    "MEB’e uyumlu",
    "anındaki",
  ];
  for (const s of ihlaller) {
    const k = kat(s);
    assert.ok(YASAK.some((y) => y.test(k)), `"${s}" hiçbir kalıpla yakalanmadı`);
  }

  // "alanında"/"zamanında" gibi sözcükler "anında" alt dizesini içerir ama ayrı bir kelime değildir;
  // ayrıca varsayılan \b, ş/ç gibi Türkçe harfleri "sınır" sayar (bkz. "şanında").
  const guvenli = [
    "Dil ve konuşma alanında çalışan uzmanlar için.",
    "Öğrenme güçlüğü alanında çalışan uzmanlar için.",
    "şanında",
    "zamanında",
  ];
  for (const s of guvenli) {
    const k = kat(s);
    assert.ok(!YASAK.some((y) => y.test(k)), `"${s}" yanlışlıkla bir kalıpla eşleşti`);
  }

  // Katlama (kat) her ı'yı i'ye indirger; kalıp içinde kalan bir ı hiçbir zaman eşleşmez (ölü kalıp).
  for (const y of YASAK) assert.ok(!y.source.includes("ı"), `${y} katlamadan sonra ölü`);
});

test("MEB programı tam adıyla Atölye ekranında", () => {
  assert.equal(MEB_PROGRAM, "Öğrenme Güçlüğü Olan Bireyler İçin Destek Eğitim Programı");
  const satir = METIN.atolye.ekran.find((s) => s.includes(MEB_PROGRAM));
  assert.ok(satir, "MEB_PROGRAM Atölye ekranında bulunamadı");
  assert.ok(satir!.endsWith("· 172 hedef"));
});

test("kitle yazımı", () => {
  const tek = (l: readonly string[]) => l.map((s) => s.replace(/\n/g, " "));
  assert.ok(tek(METIN.studio.ekran).includes("Dil ve konuşma alanında çalışan uzmanlar için."));
  assert.ok(tek(METIN.atolye.ekran).includes("Öğrenme güçlüğü alanında çalışan uzmanlar için."));
});

test("seslendirme TTS yazımıyla", () => {
  for (const m of Object.values(METIN)) {
    assert.deepEqual(ttsYazimiHatalari(m.vo), [], m.vo);
  }
  assert.ok(METIN.kapanis.vo.includes("Luden Lab"));
  assert.ok(METIN.kapanis.vo.includes("ludenlab nokta com"));
});

test("her seslendirme satırı bölümüne sığar (2,0 kelime/sn, 1 vuruş gecikme)", () => {
  for (const b of BOLUMLER_169) {
    const sure = kelimeSayisi(METIN[b.id].vo) / 2.0;
    const yer = saniye(b.son + 1) - saniye(b.ilk + 1);
    assert.ok(sure <= yer, `${b.id}: ${sure.toFixed(1)} sn > ${yer.toFixed(1)} sn`);
  }
});

test("toplam seslendirme 70 kelime", () => {
  assert.equal(Object.values(METIN).reduce((s, m) => s + kelimeSayisi(m.vo), 0), 70);
});

test("başlıklar büyük harf, satırlara bölünmüş ve satır başına en çok 12 karakter", () => {
  for (const m of Object.values(METIN)) {
    for (const s of m.baslik) {
      assert.equal(s, s.toLocaleUpperCase("tr"), s);
      assert.ok(s.length <= 12, `${s}: ${s.length} karakter`);
    }
  }
  assert.deepEqual(METIN.kanca.baslik, ["HER ÇOCUK", "AYRI."]);
  assert.deepEqual(METIN.cocuk.baslik, ["VAKTİN", "ÇOCUĞA", "KALSIN."]);
});

test("çok satırlı cümleler satır satır verilir", () => {
  assert.deepEqual(METIN.yuk.ekran[0].split("\n"), ["Evrak büyüdükçe masada", "çocuğa yer kalmıyor."]);
  assert.deepEqual(METIN.donus.ekran[0].split("\n"), ["Bu yükü tek başına", "taşımak zorunda", "değilsin."]);
});

test("Studio ve Atölye cümleleri satır satır", () => {
  assert.deepEqual(METIN.studio.ekran[1].split("\n"), ["Hedef sesi seç;", "kelimeler görselleriyle", "gelsin."]);
  assert.deepEqual(METIN.atolye.ekran[2].split("\n"), ["Hedefini seç;", "seans planı taslağın", "hazırlansın."]);
});

test("etiketler: Studio üç alan, Atölye üç basamak, kart etiketleri ikişer", () => {
  assert.equal(ETIKETLER.studio.length, 3);
  assert.equal(ETIKETLER.atolye.length, 3);
  assert.equal(ETIKETLER.studioKart.length, 2);
  assert.equal(ETIKETLER.atolyeKart.length, 2);
});
