import { test } from "node:test";
import assert from "node:assert/strict";
import { METIN, kelimeSayisi } from "../src/marka/metin.ts";
import { ATOLYE, COCUK, DONUS, KAPANIS, STUDIO, YUK } from "../src/marka/olaylar.ts";
import { VO_IPUCLARI, VO_IPUCLARI_916, VO_KAYITLARI, voSuresi } from "../src/marka/seslendirme.ts";
import { vurus916 } from "../src/marka/zamanEslemesi.ts";
import { BOLUMLER_169, BOLUMLER_916, saniye } from "../src/marka/zaman.ts";
import { YASAK, kat, ttsYazimiHatalari } from "./marka-yasak.ts";

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

// ————— 9:16 kesim (30 sn) —————

const YENI_916 = ["studio-916", "atolye-916", "kapanis-916"];

test("9:16 ipuçları: sıra, kimlik ve vuruşlar", () => {
  assert.deepEqual(
    VO_IPUCLARI_916.map((i) => [i.id, i.vurus916]),
    [
      ["kanca-1", 2],
      ["yuk-1", 8],
      ["donus-1", 16],
      ["studio-916", 22],
      ["atolye-916", 30],
      ["cocuk-1", 38],
      ["kapanis-916", 45],
    ],
  );
  assert.equal(new Set(VO_IPUCLARI_916.map((i) => i.id)).size, VO_IPUCLARI_916.length);
  for (let i = 1; i < VO_IPUCLARI_916.length; i++) assert.ok(VO_IPUCLARI_916[i].vurus916 > VO_IPUCLARI_916[i - 1].vurus916, VO_IPUCLARI_916[i].id);
});

test("9:16 ipuçları: yeniden kullanılan kayıtlar 16:9'daki kimlik ve metinle aynı", () => {
  const yeniden = VO_IPUCLARI_916.filter((i) => !YENI_916.includes(i.id));
  assert.deepEqual(yeniden.map((i) => i.id), ["kanca-1", "yuk-1", "donus-1", "cocuk-1"]);
  for (const ip of yeniden) {
    const ana = VO_IPUCLARI.find((x) => x.id === ip.id);
    assert.ok(ana, `${ip.id} 16:9'da yok`);
    assert.equal(ip.metin, ana!.metin, ip.id);
  }
  // Yeni kimlikler 16:9'da yok (başka kaydı ezmesin).
  for (const id of YENI_916) assert.ok(!VO_IPUCLARI.some((x) => x.id === id), id);
});

test("9:16 ipuçları: yeniden kullanılan cümle, 16:9'daki eşinin eşlenmiş anından bir vuruş içinde başlar", () => {
  for (const ip of VO_IPUCLARI_916) {
    const ana = VO_IPUCLARI.find((x) => x.id === ip.id);
    if (!ana) continue;
    const eslenmis = vurus916(ana.vurus169);
    assert.notEqual(eslenmis, null, `${ip.id}: 16:9 vuruşu ${ana.vurus169} atlanmış`);
    assert.ok(ip.vurus916 >= eslenmis! && ip.vurus916 < eslenmis! + 1, `${ip.id}: ${ip.vurus916} ∉ [${eslenmis}, ${eslenmis! + 1})`);
  }
});

test("9:16 yeni satırlar: metinler", () => {
  const metin = (id: string) => VO_IPUCLARI_916.find((i) => i.id === id)!.metin;
  assert.equal(metin("studio-916"), "Studio'da hedef sesi seç, kelimeler görselleriyle gelsin.");
  assert.equal(metin("atolye-916"), "Atölye'de hedefini seç, taslağın hazırlansın; son söz senin.");
  assert.equal(metin("kapanis-916"), "Her şey çocuğun etrafında. Luden Lab.");
});

test("9:16 satırları: yasak ifade ve TTS yazımı denetimi (16:9 ile aynı kurallar)", () => {
  for (const ip of VO_IPUCLARI_916) {
    const k = kat(ip.metin);
    for (const y of YASAK) assert.ok(!y.test(k), `"${ip.metin}" içinde ${y}`);
    assert.deepEqual(ttsYazimiHatalari(ip.metin), [], ip.metin);
  }
  assert.ok(VO_IPUCLARI_916.find((i) => i.id === "kapanis-916")!.metin.includes("Luden Lab"));
});

test("her 9:16 ipucu bir sonrakinden, kendi bölümünden ve 30,0 sn'den önce biter (süre + 0,2 sn)", () => {
  for (let i = 0; i < VO_IPUCLARI_916.length; i++) {
    const ip = VO_IPUCLARI_916[i];
    const bitis = saniye(ip.vurus916) + voSuresi(ip) + 0.2;
    const b = BOLUMLER_916.find((x) => ip.vurus916 >= x.ilk && ip.vurus916 <= x.son);
    assert.ok(b, `${ip.id}: bölüm yok`);
    assert.ok(bitis <= saniye(b!.son + 1), `${ip.id}: ${bitis.toFixed(2)} > bölüm (${b!.id}) sonu ${saniye(b!.son + 1)}`);
    assert.ok(bitis <= 30.0, `${ip.id}: ${bitis.toFixed(2)} > 30,0 sn`);
    const sonraki = VO_IPUCLARI_916[i + 1];
    if (sonraki) assert.ok(bitis <= saniye(sonraki.vurus916), `${ip.id} → ${sonraki.id}: ${bitis.toFixed(2)} > ${saniye(sonraki.vurus916)}`);
  }
});

test("VO_KAYITLARI: iki kesimin kimliğe göre tekil birleşimi (üretilecek mp3'ler)", () => {
  const kimlikler = VO_KAYITLARI.map((k) => k.id);
  assert.equal(new Set(kimlikler).size, kimlikler.length);
  assert.equal(kimlikler.length, VO_IPUCLARI.length + YENI_916.length);
  // 16:9 sırası korunur, 9:16'ya özgüler sona eklenir
  assert.deepEqual(kimlikler, [...VO_IPUCLARI.map((i) => i.id), ...YENI_916]);
  // Aynı kimlik iki kesimde aynı metin: tek mp3.
  for (const ip of [...VO_IPUCLARI, ...VO_IPUCLARI_916]) assert.equal(VO_KAYITLARI.find((k) => k.id === ip.id)!.metin, ip.metin, ip.id);
});

test("Çocuk ve Kapanış cümleleri ekrandaki karşılıklarıyla aynı vuruşta", () => {
  const vurus = (id: string) => VO_IPUCLARI.find((i) => i.id === id)!.vurus169;
  assert.equal(vurus("cocuk-1"), COCUK.baslik[0]);
  assert.equal(vurus("kapanis-1"), KAPANIS.baslik[0]);
  assert.equal(vurus("kapanis-2"), KAPANIS.logo);
});
