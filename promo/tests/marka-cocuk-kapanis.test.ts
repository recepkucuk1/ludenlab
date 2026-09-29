import { test } from "node:test";
import assert from "node:assert/strict";
import { DONUS_KARE, INCE_ADET, cocukKapanisKatmani, cocukYiginlari, type Sahne } from "../src/marka/cocukKapanis.ts";
import { izd, type V2 } from "../src/marka/izometri.ts";
import { MODUL_ADET, MODUL_TOHUM, modulYigini } from "../src/marka/kagitAkisi.ts";
import { HEDEFLER, METIN } from "../src/marka/metin.ts";
import { yigin, type Kagit } from "../src/marka/nesneler.ts";
import { COCUK, KAPANIS } from "../src/marka/olaylar.ts";
import { LOGO_VIEWBOX, RENK } from "../src/marka/tema.ts";
import { COCUK_YIGIN_YERI, GENEL_KAMERA, HEDEF_YERLESIMI, KAPANIS_YERI } from "../src/marka/yerlesim.ts";
import { ISARET, elipsYaricapi } from "../src/marka/yorunge.ts";
import { kare } from "../src/marka/zaman.ts";

const K73 = kare(COCUK.tabla);

// Başlangıç: Studio 8 kâğıt; Atölye 7 (üst kâğıdı kartına dönüşmüş, Plan 3B) — filmDurumu(K73 − 1)'in yığınları gibi.
const BAS: Record<"studio" | "atolye", Kagit[]> = { studio: modulYigini("studio", MODUL_ADET).kagitlar, atolye: modulYigini("atolye", MODUL_ADET - 1).kagitlar };
const TAM = { studio: 1, atolye: 1 };
const yigini = (f: number, m: "studio" | "atolye") => cocukYiginlari(f, BAS, TAM).find((g) => g.id === `modul-${m}`)!;
const kalkanlar = (f: number, m: "studio" | "atolye") => cocukYiginlari(f, BAS, TAM).filter((g) => g.id.startsWith(`kalkan-${m}`));
const ayni = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test("v73'te yığınlar olduğu gibi: aynı kâğıtlar aynı yerde (sıçrama yok)", () => {
  for (const m of ["studio", "atolye"] as const) {
    const hepsi = cocukYiginlari(K73, BAS, TAM)
      .filter((g) => g.id === `modul-${m}` || g.id.startsWith(`kalkan-${m}`))
      .flatMap((g) => g.kagitlar);
    assert.equal(hepsi.length, BAS[m].length, m);
    hepsi.forEach((k, i) => {
      assert.ok(ayni(k.z0, BAS[m][i].z0), `${m} ${i} z`);
      k.taban.forEach((p, j) => assert.ok(ayni(p[0], BAS[m][i].taban[j][0]) && ayni(p[1], BAS[m][i].taban[j][1]), `${m} ${i} taban`));
    });
  }
});

test("üst kâğıtlar tepeden başlayarak kalkar ve söner; dönüş bitmeden yığın 3 kâğıt kalır", () => {
  // İlk kalkan en üstteki: K73 + 4'te o yükselmiş, altındakiler yerinde.
  const k = kalkanlar(K73 + 4, "studio");
  const enUst = k.find((g) => g.id === `kalkan-studio-${MODUL_ADET - INCE_ADET - 1}`)!;
  assert.ok(enUst.kagitlar[0].z0 > BAS.studio[MODUL_ADET - 1].z0 + 0.1, "en üst kalkmadı");
  assert.ok(ayni(k.find((g) => g.id === "kalkan-studio-0")!.kagitlar[0].z0, BAS.studio[INCE_ADET].z0), "alttaki erken kalktı");
  for (const m of ["studio", "atolye"] as const) {
    assert.equal(kalkanlar(K73 + DONUS_KARE - 8, m).length, 0, `${m} kalkanlar gitmedi`);
    assert.equal(yigini(K73 + DONUS_KARE - 8, m).kagitlar.length, INCE_ADET);
  }
  // Kalkan kâğıdın opaklığı hiç artmaz.
  let once = 1;
  for (let f = K73; f < K73 + 20; f++) {
    const g = kalkanlar(f, "studio").find((g) => g.id === "kalkan-studio-4");
    const o = g ? g.kagitlar[0].opaklik! : 0;
    assert.ok(o <= once + 1e-12, `f=${f}`);
    once = o;
  }
});

test("dönüş sonunda ince yığınlar storyboard F10'daki yerde, stil karesiyle aynı kâğıtlar", () => {
  const f = K73 + DONUS_KARE;
  const sekme = { studio: RENK.studio, atolye: RENK.atolye };
  for (const m of ["studio", "atolye"] as const) {
    const g = yigini(f, m);
    assert.ok(ayni(g.p[0], COCUK_YIGIN_YERI[m][0]) && ayni(g.p[1], COCUK_YIGIN_YERI[m][1]) && g.p[2] === 0, `${g.p}`);
    const ref = yigin({ cx: COCUK_YIGIN_YERI[m][0], cy: COCUK_YIGIN_YERI[m][1], adet: INCE_ADET, tohum: MODUL_TOHUM[m], sapma: 0.02, sekme: sekme[m] }).kagitlar;
    assert.equal(g.kagitlar.length, ref.length);
    g.kagitlar.forEach((k, i) => {
      assert.ok(ayni(k.z0, ref[i].z0));
      assert.equal(k.sekme, ref[i].sekme);
      assert.equal(k.ust, ref[i].ust);
      k.taban.forEach((p, j) => assert.ok(ayni(p[0], ref[i].taban[j][0]) && ayni(p[1], ref[i].taban[j][1]), `${m} ${i}`));
    });
  }
});

// Ayırıcı eksen boşluğu (dünya birimi, blok 1 × 1): yığın önce dışa açıldığından köşesi bloğun köşesine ≥ 0,15 uzak kalır.
test("kayan yığınlar bloğa değmez (ayırıcı eksende ≥ 0,15 boşluk)", () => {
  for (let f = K73; f <= K73 + DONUS_KARE; f++) {
    for (const g of cocukYiginlari(f, BAS, TAM)) {
      for (const k of g.kagitlar) {
        const xs = k.taban.map((p) => p[0]);
        const ys = k.taban.map((p) => p[1]);
        const bosluk = Math.max(Math.min(...xs) - 0.5, -0.5 - Math.max(...xs), Math.min(...ys) - 0.5, -0.5 - Math.max(...ys));
        assert.ok(bosluk >= 0.15, `f=${f} ${g.id} boşluk ${bosluk.toFixed(3)}`);
      }
    }
  }
});

const K85 = kare(COCUK.yorunge);
const K89 = kare(KAPANIS.cekilme);
const K90 = kare(KAPANIS.dikey);
const K93 = kare(KAPANIS.donusum);
const K95 = kare(KAPANIS.slogan);
const K96 = kare(KAPANIS.dugme);
const ODAK = izd([0, 0, 0.5], GENEL_KAMERA);
const sahne = (itme = 1): Sahne => ({ kamera: { ...GENEL_KAMERA, don: -2 * Math.PI }, itme, odak: ODAK });
const katman = (f: number, itme = 1) => cocukKapanisKatmani(f, sahne(itme));

test("hedef etiketleri v77–79'da modül rengiyle raptiyeye varır, v85'te çıkar", () => {
  COCUK.etiketler.forEach((v, i) => {
    const e = (f: number) => katman(f).etiketler.find((x) => x.id === `cocuk-hedef-${i}`);
    assert.ok(e(kare(v) - 1)!.ilerleme < 1);
    const var_ = e(kare(v))!;
    assert.equal(var_.ilerleme, 1);
    assert.equal(var_.metin, HEDEFLER[i].metin);
    assert.equal(var_.nokta, RENK[HEDEFLER[i].modul]);
    assert.deepEqual([var_.capa, var_.x, var_.y, var_.hiza], [HEDEF_YERLESIMI[i].capa, HEDEF_YERLESIMI[i].x, HEDEF_YERLESIMI[i].y, HEDEF_YERLESIMI[i].hiza]);
    assert.equal(e(K85 + 12), undefined);
  });
});

test("başlıklar: Çocuk satırları v74–76'da açılır ve v88'de çıkar; Kapanış v89–91'de açılır, v93'te çıkar; üst üste binmez", () => {
  const m = (f: number, id: string) => katman(f).metinler.find((x) => x.id === id);
  assert.equal(m(kare(74) - 1, "cocuk-baslik"), undefined);
  assert.deepEqual(m(kare(76) + 10, "cocuk-baslik")!.acilis, [1, 1, 1]);
  assert.deepEqual(m(kare(76) + 10, "cocuk-baslik")!.satirlar, METIN.cocuk.baslik);
  assert.equal(m(kare(COCUK.baslikCikis) + 12, "cocuk-baslik"), undefined);
  assert.deepEqual(m(kare(91) + 10, "kapanis-baslik")!.acilis, [1, 1, 1]);
  assert.equal(m(K93 + 12, "kapanis-baslik"), undefined);
  for (let f = K73; f < K95; f++) assert.ok(katman(f).metinler.length <= 1, `f=${f}`);
});

test("yatay yörünge v85–90 arasında çizilir, dikey yörünge v90–92'de kalkar; ön koşu bloğun önünde", () => {
  assert.equal(katman(K85 - 1).yorungeler.length, 0);
  const n = (f: number) => katman(f).yorungeler.filter((y) => y.id.startsWith("yorunge-a")).reduce((s, y) => s + y.cizgi.length, 0);
  let once = 0;
  for (let f = K85 + 1; f <= K90; f += 3) {
    assert.ok(n(f) >= once, `f=${f}`);
    once = n(f);
  }
  const k90 = katman(K90);
  assert.deepEqual(k90.yorungeler.filter((y) => y.id.startsWith("yorunge-a")).map((y) => y.on), [true, false]);
  assert.ok(k90.yorungeler.some((y) => y.id.startsWith("yorunge-b")));
  const b = katman(kare(92)).yorungeler.filter((y) => y.id.startsWith("yorunge-b"));
  const xs = b.flatMap((y) => y.cizgi.map((p) => p[0]));
  const ys = b.flatMap((y) => y.cizgi.map((p) => p[1]));
  assert.ok(Math.max(...xs) - Math.min(...xs) < 0.35 * (Math.max(...ys) - Math.min(...ys)), "dikey yörünge dar ve uzun değil");
});

test("dönüşüm sonunda (v95) halkalar logo işaretinin yörüngelerinde (ekranda, itme dahil)", () => {
  const itme = 1.013;
  const s = sahne(itme);
  const k = KAPANIS_YERI.logo.w / LOGO_VIEWBOX.w;
  const ekran = ([x, y]: V2): V2 => [s.odak[0] + (x - s.odak[0]) * itme, s.odak[1] + (y - s.odak[1]) * itme];
  const hedef = (e: typeof ISARET.genis) => ({ cx: KAPANIS_YERI.logo.x + e.cx * k, cy: KAPANIS_YERI.logo.y + e.cy * k, a: e.a * k, b: e.b * k, aci: e.aci });
  const y = cocukKapanisKatmani(K95, s).yorungeler;
  for (const [id, e] of [["yorunge-a", ISARET.genis], ["yorunge-b", ISARET.dikey]] as const) {
    const ps = y.filter((c) => c.id.startsWith(id)).flatMap((c) => c.cizgi);
    assert.ok(ps.length > 100, id);
    for (const p of ps) assert.ok(Math.abs(elipsYaricapi(hedef(e), ekran(p)) - 1) < 1e-6, `${id}`);
  }
});

test("blok v93'te kesişime akarak küçülür, v95'ten önce kaybolur; halkalar v95 + 2'de tümüyle söner", () => {
  assert.equal(katman(K93 - 1).blokIzi, null);
  const b = katman(K93).blokIzi!;
  assert.equal(b.olcek, 1);
  assert.deepEqual(b.merkez, b.kaynak);
  const son = katman(K95 - 6).blokIzi!;
  assert.equal(son.olcek, 0);
  const k = KAPANIS_YERI.logo.w / LOGO_VIEWBOX.w;
  const hedef = [KAPANIS_YERI.logo.x + ISARET.kesisim[0] * k, KAPANIS_YERI.logo.y + ISARET.kesisim[1] * k];
  const k95 = katman(K95).blokIzi!;
  assert.ok(Math.hypot(k95.merkez[0] - hedef[0], k95.merkez[1] - hedef[1]) < 1e-6);
  assert.equal(katman(K95 + 2).yorungeler.length, 0);
});

test("arka plan v89–91 bulanıklaşıp söner; künye v92–93'te gider", () => {
  assert.equal(katman(K89 - 1).arka, null);
  assert.deepEqual(katman(K89).arka, { bulaniklik: 0, opaklik: 1, olcek: 1 });
  const a = katman(kare(91)).arka!;
  assert.ok(ayni(a.bulaniklik, 20) && ayni(a.opaklik, 0) && ayni(a.olcek, 0.9));
  assert.equal(katman(kare(92)).kunyeCikis, 0);
  assert.equal(katman(K93).kunyeCikis, 1);
});

test("kapanış kartı: logo v94'te netleşir, slogan v95'te açılır, düğme v96'da basılıp yarıya geri çıkar", () => {
  assert.equal(katman(kare(94) + 5).kapanis, null);
  const k = katman(K95 + 4).kapanis!;
  assert.equal(k.logo.gorunum, 1);
  assert.deepEqual([k.logo.x, k.logo.y, k.logo.w], [KAPANIS_YERI.logo.x, KAPANIS_YERI.logo.y, KAPANIS_YERI.logo.w]);
  assert.equal(k.slogan.metin, METIN.kapanis.ekran[0]);
  assert.deepEqual(k.cagri.cipler.map((c) => [c.metin, c.nokta]), [[METIN.kapanis.ekran[1], RENK.studio], [METIN.kapanis.ekran[2], RENK.atolye]]);
  assert.equal(k.cagri.dugme.metin, METIN.kapanis.ekran[3]);
  const d = (f: number) => katman(f).kapanis!.cagri.dugme;
  assert.equal(d(K96 - 2).gorunum, 1, "düğme basılmadan önce tam görünür değil");
  assert.ok(ayni(d(K96 - 1).basma, 0));
  assert.ok(ayni(d(K96 + 3).basma, 1));
  assert.ok(ayni(d(K96 + 9).basma, 0.5));
  assert.ok(ayni(d(kare(100)).basma, 0.5));
});

test("son itme kapanış kartını v95'ten filmin son karesine dek yavaşça büyütür (donuk an yok)", () => {
  assert.equal(katman(K95).kapanis!.itme, 1);
  for (let f = K95; f < 1799; f++) assert.ok(katman(f + 1).kapanis!.itme - katman(f).kapanis!.itme > 2e-4, `f=${f}`);
});

test("hedef logo: varsayılanı kapanış kartının logosu; başka bir yer verilirse halkalar ve blok o logonun işaretine oturur, kart yerinde kalır", () => {
  for (const f of [K85 + 20, K93 + 10, K95]) assert.deepEqual(cocukKapanisKatmani(f, sahne(1.01), KAPANIS_YERI.logo), cocukKapanisKatmani(f, sahne(1.01)), `f=${f}`);
  const logo = { x: 880, y: 465, w: 858 };
  const itme = 1.013;
  const s = sahne(itme);
  const k = logo.w / LOGO_VIEWBOX.w;
  const ekran = ([x, y]: V2): V2 => [s.odak[0] + (x - s.odak[0]) * itme, s.odak[1] + (y - s.odak[1]) * itme];
  const hedef = (e: typeof ISARET.genis) => ({ cx: logo.x + e.cx * k, cy: logo.y + e.cy * k, a: e.a * k, b: e.b * k, aci: e.aci });
  const c = cocukKapanisKatmani(K95, s, logo);
  for (const [id, e] of [["yorunge-a", ISARET.genis], ["yorunge-b", ISARET.dikey]] as const) {
    const ps = c.yorungeler.filter((y) => y.id.startsWith(id)).flatMap((y) => y.cizgi);
    assert.ok(ps.length > 100, id);
    for (const p of ps) assert.ok(Math.abs(elipsYaricapi(hedef(e), ekran(p)) - 1) < 1e-6, id);
  }
  for (const y of c.yorungeler) assert.ok(Math.abs(y.kalinlik * itme - (ISARET.kalinlik * logo.w) / LOGO_VIEWBOX.w) < 1e-9, y.id);
  const u = c.blokIzi!;
  const kes = [logo.x + ISARET.kesisim[0] * k, logo.y + ISARET.kesisim[1] * k];
  assert.ok(Math.hypot(ekran(u.merkez)[0] - kes[0], ekran(u.merkez)[1] - kes[1]) < 1e-6, "blok kesişimde");
  assert.deepEqual([c.kapanis!.logo.x, c.kapanis!.logo.y, c.kapanis!.logo.w], [KAPANIS_YERI.logo.x, KAPANIS_YERI.logo.y, KAPANIS_YERI.logo.w]);
});
