import { test } from "node:test";
import assert from "node:assert/strict";
import { HEDEFLER, MEB_PROGRAM, METIN, kelimeSayisi } from "../src/marka/metin.ts";
import { BOLUMLER_169, saniye } from "../src/marka/zaman.ts";

const tumMetin = Object.values(METIN)
  .flatMap((m) => [...m.ekran, m.vo])
  .concat(HEDEFLER.map((h) => h.metin));

// Türkçe büyük harf sorunu: JS'in varsayılan /i bayrağı İ→i, I→ı'yı tr yerel ayarı dışında katlamaz.
// Karşılaştırmadan önce küçült (tr yerel ayarı) + kalan ı'yı i'ye indir + boşlukları sadeleştir.
const kat = (s: string) => s.normalize("NFC").toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/\s+/g, " ");

// Spec "İçerik kuralları": hız iddiası, ücretsiz/fiyat/üretim hakkı, yanlış kitle, genel MEB iddiası, eski terimler, yanlış yazım.
const YASAK = [/saniye/, /dakika/, /anında/, /ücretsiz/, /bedava/, /fiyat|₺|üretim hakkı/, /özel eğitim öğretmen/, /meb('?e)? (uyumlu|uygun|onaylı)|meb müfredat/, /kredi|jeton|token/, /stüdyo/, /(?<!\/)atolye/];

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
  ];
  for (const s of ihlaller) {
    const k = kat(s);
    assert.ok(YASAK.some((y) => y.test(k)), `"${s}" hiçbir kalıpla yakalanmadı`);
  }
});

test("MEB programı tam adıyla Atölye ekranında", () => {
  assert.equal(MEB_PROGRAM, "Öğrenme Güçlüğü Olan Bireyler İçin Destek Eğitim Programı");
  const satir = METIN.atolye.ekran.find((s) => s.includes(MEB_PROGRAM));
  assert.ok(satir, "MEB_PROGRAM Atölye ekranında bulunamadı");
  assert.ok(satir!.endsWith("· 172 hedef"));
});

test("kitle yazımı", () => {
  assert.ok(METIN.studio.ekran.includes("Dil ve konuşma alanında çalışan uzmanlar için."));
  assert.ok(METIN.atolye.ekran.includes("Öğrenme güçlüğü alanında çalışan uzmanlar için."));
});

test("seslendirme TTS yazımıyla", () => {
  for (const m of Object.values(METIN)) {
    const k = kat(m.vo);
    assert.ok(!/ludenlab(?! nokta)/.test(k), m.vo);
    assert.ok(!/\w\.\w/.test(k), m.vo);
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
