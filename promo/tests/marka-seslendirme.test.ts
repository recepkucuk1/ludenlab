import { test } from "node:test";
import assert from "node:assert/strict";
import { METIN, kelimeSayisi } from "../src/marka/metin.ts";
import { ATOLYE, DONUS, STUDIO, YUK } from "../src/marka/olaylar.ts";
import { VO_IPUCLARI, voSuresi } from "../src/marka/seslendirme.ts";
import { BOLUMLER_169, saniye } from "../src/marka/zaman.ts";

test("her bölümün ipuçları birleşince bölümün seslendirme satırını verir", () => {
  for (const b of BOLUMLER_169) {
    const birlesik = VO_IPUCLARI.filter((i) => i.bolum === b.id)
      .map((i) => i.metin)
      .join(" ");
    assert.equal(birlesik, METIN[b.id].vo, b.id);
  }
});

test("ipuçları sıralı, kimlikleri tekil ve her biri kendi bölümünde", () => {
  const kimlikler = new Set(VO_IPUCLARI.map((i) => i.id));
  assert.equal(kimlikler.size, VO_IPUCLARI.length);
  for (let i = 1; i < VO_IPUCLARI.length; i++) assert.ok(VO_IPUCLARI[i].vurus169 > VO_IPUCLARI[i - 1].vurus169, VO_IPUCLARI[i].id);
  for (const ip of VO_IPUCLARI) {
    const b = BOLUMLER_169.find((x) => x.id === ip.bolum)!;
    assert.ok(ip.vurus169 >= b.ilk && ip.vurus169 <= b.son, ip.id);
  }
});

test("cümleler ekrandaki karşılıklarıyla aynı vuruşta başlar", () => {
  const vurus = (id: string) => VO_IPUCLARI.find((i) => i.id === id)!.vurus169;
  assert.equal(vurus("yuk-2"), YUK.altCumle);
  assert.equal(vurus("donus-1"), DONUS.cumle);
  assert.equal(vurus("studio-1"), STUDIO.kitle);
  assert.equal(vurus("studio-2"), STUDIO.cumle);
  assert.equal(vurus("atolye-1"), ATOLYE.kitle);
  // Taslak kartı açılırken başlar (bir vuruş önce): "Son söz" cümlesine yer kalsın.
  assert.equal(vurus("atolye-2"), ATOLYE.kart);
  assert.equal(vurus("atolye-3"), ATOLYE.sonSoz + 1);
});

test("her ipucu bir sonrakinden ve bölüm sonundan önce biter (ölçülmüş ya da tahmini süre + 0,2 sn)", () => {
  for (let i = 0; i < VO_IPUCLARI.length; i++) {
    const ip = VO_IPUCLARI[i];
    const bitis = saniye(ip.vurus169) + voSuresi(ip) + 0.2;
    const b = BOLUMLER_169.find((x) => x.id === ip.bolum)!;
    assert.ok(bitis <= saniye(b.son + 1), `${ip.id}: ${bitis.toFixed(2)} > bölüm sonu ${saniye(b.son + 1)}`);
    const sonraki = VO_IPUCLARI[i + 1];
    if (sonraki) assert.ok(bitis <= saniye(sonraki.vurus169), `${ip.id} → ${sonraki.id}: ${bitis.toFixed(2)} > ${saniye(sonraki.vurus169)}`);
  }
});

test("tahmini süre anlatıcının ölçülmüş hızıyla (2,4 kelime/sn)", () => {
  const ip = { id: "yok", bolum: "yuk" as const, vurus169: 9, metin: "bir iki üç dört beş altı" };
  assert.equal(voSuresi(ip), kelimeSayisi(ip.metin) / 2.4);
});

test("Kapanış: önce cümle, logo oturunca marka ve adres", () => {
  const k = VO_IPUCLARI.filter((i) => i.bolum === "kapanis");
  assert.deepEqual(
    k.map((i) => i.metin),
    ["Her şey çocuğun etrafında.", "Luden Lab. ludenlab nokta com."],
  );
});
