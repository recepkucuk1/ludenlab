import { test } from "node:test";
import assert from "node:assert/strict";
import { GIZLI_METINLER, ITME_ERIME, durum916, gizliEtiket } from "../src/marka/durum916.ts";
import { filmDurumu, zeminIsigi, type FilmDurumu } from "../src/marka/filmDurumu.ts";
import type { V2 } from "../src/marka/izometri.ts";
import { ATOLYE, KAPANIS, STUDIO } from "../src/marka/olaylar.ts";
import { LOGO_VIEWBOX } from "../src/marka/tema.ts";
import { KAPANIS_916, sahneden916 } from "../src/marka/yerlesim916.ts";
import { ISARET, elipsYaricapi } from "../src/marka/yorunge.ts";
import { BOLUMLER_916, kare, toplamKare } from "../src/marka/zaman.ts";
import { kare169, vurus916 } from "../src/marka/zamanEslemesi.ts";

const KARE = toplamKare(BOLUMLER_916);
const yakin = (a: number, b: number, e = 1e-9) => Math.abs(a - b) < e;
/** 9:16 karesinin durumu, bir kez hesaplanır (testler 900 kareyi birkaç kez tarar). */
const onbellek = new Map<number, FilmDurumu>();
const d916 = (f: number) => {
  let d = onbellek.get(f);
  if (!d) onbellek.set(f, (d = durum916(f)));
  return d;
};
/** 16:9 karesinin sıçradığı 9:16 kareleri (bir önceki kareden 2'den fazla ileri). */
const SICRAMALAR = Array.from({ length: KARE - 1 }, (_, i) => i + 1).filter((f) => kare169(f) - kare169(f - 1) > 2);
/** Sıçramanın itme basamağının eridiği pencerede mi (sıçrama karesi dahil, ITME_ERIME kare)? */
const erimede = (f: number) => SICRAMALAR.some((j) => f >= j && f < j + ITME_ERIME);

// ————— Zaman eşlemesinin tüketimi —————

test("9:16 durumu, 16:9 filmin eşlenmiş karesinin durumu: kamera, itme (sıçrama pencereleri dışında), blok, kâğıtlar, yuva, künye, çipler aynen", () => {
  for (let f = 0; f < KARE; f++) {
    const d = d916(f);
    const a = filmDurumu(kare169(f));
    assert.deepEqual(d.kamera, a.kamera, `f=${f}`);
    if (!erimede(f)) assert.equal(d.itme, a.itme, `f=${f}`);
    assert.equal(d.sarsinti, a.sarsinti, `f=${f}`);
    assert.deepEqual([d.blok.z, d.blok.aci, d.blok.yuz, d.blok.soluk], [a.blok.z, a.blok.aci, a.blok.yuz, a.blok.soluk], `f=${f}`);
    assert.deepEqual(d.kagitlar, a.kagitlar, `f=${f}`);
    assert.deepEqual([d.yuva, d.kunye, d.kunyeCikis, d.arka], [a.yuva, a.kunye, a.kunyeCikis, a.arka], `f=${f}`);
    assert.deepEqual(d.cipler, a.cipler, `f=${f}`);
  }
});

test("sıçramalar: A, B, C, D, E (9:16 v24, v29, v32, v37, v43)", () => {
  assert.deepEqual(SICRAMALAR, [24, 29, 32, 37, 43].map((v) => kare(v)));
});

// ————— Süzgeç —————

test("gizlenen öğeler 9:16'nın hiçbir karesinde yok; 16:9 karşılığında var (süzgeç boşa çalışmıyor)", () => {
  const goruldu = new Set<string>();
  for (let f = 0; f < KARE; f++) {
    const d = d916(f);
    for (const e of d.etiketler) assert.ok(!gizliEtiket(e.id), `f=${f} ${e.id}`);
    for (const m of d.metinler) assert.ok(!GIZLI_METINLER.includes(m.id), `f=${f} ${m.id}`);
    const a = filmDurumu(kare169(f));
    for (const e of a.etiketler) if (gizliEtiket(e.id)) goruldu.add(e.id.replace(/-\d+$/, ""));
    for (const m of a.metinler) if (GIZLI_METINLER.includes(m.id)) goruldu.add(m.id);
  }
  assert.deepEqual([...goruldu].sort(), ["atolye-araclar", "atolye-kart", "basamak", "studio", "studio-araclar", "studio-kart"]);
});

test("Studio destesi 9:16'da çevrilmez: B'den sonra çıkan deste Artikülasyon önde, sıçramada kartlar kıpırdamaz", () => {
  const B = kare(vurus916(ATOLYE.tabla)!);
  const kartlar = (f: number) => d916(f).kartlar.filter((k) => k.id.startsWith("studio-"));
  const once = kartlar(B - 1);
  assert.equal(once.length, 3);
  for (let f = B; f < B + 12; f++) {
    const k = kartlar(f);
    assert.deepEqual(k.map((x) => [x.id, x.resim, x.cx, x.cy, x.olcek, x.rotY, x.egim, x.sira]), once.map((x) => [x.id, x.resim, x.cx, x.cy, x.olcek, x.rotY, x.egim, x.sira]), `f=${f}`);
    k.forEach((x) => assert.ok(yakin(x.cikis, (kare169(f) - kare(ATOLYE.tabla)) / 12), `f=${f} ${x.id} ${x.cikis}`));
  }
  assert.equal(once[0].resim, "real/r3-kagit.png");
  assert.equal(kartlar(B + 12).length, 0);
  // 16:9'da aynı an çevrilmiş deste: süzgeç olmasa ön kart Öğrenme Kartı olurdu.
  assert.deepEqual(filmDurumu(kare169(B)).kartlar.filter((k) => k.id.startsWith("studio-")).map((k) => k.resim), ["real/r2-kart.png"]);
  assert.ok(kare169(B - 1) < kare(STUDIO.cevir[0]));
});

test("Studio kilidi B sıçramasından 6 kare önce çıkmaya başlar, sıçramada 16:9'un değerine varır", () => {
  const B = kare(vurus916(ATOLYE.tabla)!);
  const cikis = (f: number) => d916(f).kilitler.find((k) => k.id === "kilit-studio")!.cikis;
  assert.equal(cikis(B - 7), 0);
  for (let f = B - 6; f <= B; f++) assert.ok(yakin(cikis(f), (f - (B - 6)) / 12), `f=${f}`);
  assert.equal(cikis(B), filmDurumu(kare169(B)).kilitler.find((k) => k.id === "kilit-studio")!.cikis);
});

/** Görünen kâğıtlar (kâğıt opaklığı > 0): konum, yükseklik, opaklık, grubun soluklığı. */
const gorunenKagitlar = (d: FilmDurumu) =>
  d.kagitlar.flatMap((g) => g.kagitlar.map((k) => ({ k, o: k.opaklik ?? 1, s: g.soluk ?? 1 }))).filter((x) => x.o > 0);
/** Öğe görünürlükleri (0–1). */
const gorunurluk = (d: FilmDurumu) => {
  const m = new Map<string, number>();
  for (const e of d.etiketler) m.set(`etiket ${e.id}`, e.gorunum * (1 - e.cikis));
  for (const e of d.metinler) m.set(`metin ${e.id}`, Math.max(...e.acilis) * (1 - e.cikis));
  for (const e of d.kilitler) m.set(`kilit ${e.id}`, e.gorunum * (1 - e.cikis));
  for (const e of d.cipler) m.set(`cip ${e.id}`, e.gorunum * (1 - e.cikis));
  for (const e of d.kartlar) m.set(`kart ${e.id} ${e.resim}`, e.opaklik * (1 - e.cikis));
  if (d.damga) m.set("damga", d.damga.opaklik * (1 - d.damga.cikis));
  m.set("kunye", d.kunye * (1 - d.kunyeCikis));
  m.set("blok soluk", d.blok.soluk);
  return m;
};

test("sıçramalar dikişsiz: kamera ve tabla aynı, öğe görünürlüğü en çok bir çıkış karesi (1/12) oynar, kâğıtlar yerinde; yalnız itme ≤ 0,012 değişir", () => {
  for (const f of SICRAMALAR) {
    const [a, b] = [d916(f - 1), d916(f)];
    assert.deepEqual([b.kamera.don, b.kamera.s, b.kamera.ox, b.kamera.oy], [a.kamera.don, a.kamera.s, a.kamera.ox, a.kamera.oy], `f=${f} kamera`);
    assert.ok(Math.abs(b.itme - a.itme) <= 0.012, `f=${f} itme ${a.itme} → ${b.itme}`);
    const [ga, gb] = [gorunurluk(a), gorunurluk(b)];
    for (const id of new Set([...ga.keys(), ...gb.keys()])) {
      const fark = Math.abs((ga.get(id) ?? 0) - (gb.get(id) ?? 0));
      assert.ok(fark <= 1 / 12 + 1e-9, `f=${f} ${id}: ${ga.get(id) ?? 0} → ${gb.get(id) ?? 0}`);
    }
    const [ka, kb] = [gorunenKagitlar(a), gorunenKagitlar(b)];
    assert.equal(kb.length, ka.length, `f=${f} kâğıt sayısı`);
    ka.forEach((x, i) => {
      assert.ok(yakin(x.k.z0, kb[i].k.z0) && yakin(x.o, kb[i].o) && yakin(x.s, kb[i].s), `f=${f} kâğıt ${i}`);
      x.k.taban.forEach((p, j) => assert.ok(Math.hypot(p[0] - kb[i].k.taban[j][0], p[1] - kb[i].k.taban[j][1]) < 1e-9, `f=${f} kâğıt ${i}`));
    });
  }
});

test("itme basamağı sıçramada ITME_ERIME (18) karede erir: sıçramada kare başına < 0,002; pencerede erime filmin kendi hareketine kare başına < 0,002 ekler", () => {
  assert.equal(ITME_ERIME, 18);
  const itme169 = (f: number) => filmDurumu(kare169(f)).itme;
  for (const j of SICRAMALAR) {
    // Sıçrama karesi: 16:9'da basamak 0,004–0,012; 9:16'da yok.
    assert.ok(Math.abs(itme169(j) - itme169(j - 1)) > 0.004, `f=${j} basamak`);
    for (let f = j - 1; f <= j; f++) assert.ok(Math.abs(d916(f).itme - d916(f - 1).itme) < 0.002, `f=${f} itme ${d916(f - 1).itme} → ${d916(f).itme}`);
    // Pencerede: kare başına değişim, filmin eşlenmiş karelerindeki kendi değişiminden en çok 0,002 sapar (B'de Atölye
    // dönüşünün 1,04 → 1,00 geri çekilmesi 16:9'da da kare başına 0,006'ya varır; o filmin kendi hareketidir).
    for (let f = j + 1; f <= j + ITME_ERIME; f++) {
      const adim = d916(f).itme - d916(f - 1).itme;
      const kendi = itme169(f) - itme169(f - 1);
      assert.ok(Math.abs(adim - kendi) < 0.002, `f=${f} adım ${adim} / kendi ${kendi}`);
    }
    // Pencere bitince filmin itmesi aynen.
    assert.equal(d916(j + ITME_ERIME).itme, itme169(j + ITME_ERIME), `f=${j + ITME_ERIME}`);
  }
  // A, C, D, E pencerelerinde (filmin kendi hareketi yavaş) kare başına değişim her yerde < 0,002.
  for (const j of SICRAMALAR.filter((j) => j !== kare(vurus916(ATOLYE.tabla)!))) {
    for (let f = j - 1; f <= j + ITME_ERIME; f++) assert.ok(Math.abs(d916(f).itme - d916(f - 1).itme) < 0.002, `f=${f}`);
  }
});

test("zemin 9:16 karesiyle akar: ızgara karede 0,4 px kayar, ışık zeminIsigi(f) (sıçramada sıçramaz)", () => {
  for (let f = 0; f < KARE; f++) {
    assert.ok(yakin(d916(f).kayma, 0.4 * f), `f=${f}`);
    assert.equal(d916(f).isik, zeminIsigi(f), `f=${f}`);
    if (f > 0) assert.ok(Math.abs(d916(f).isik - d916(f - 1).isik) < 0.001, `f=${f}`);
  }
});

// ————— Kapanış —————

test("kapanış halkaları 9:16 ekranında logo işaretinin yörüngelerine, blok kesişime oturur", () => {
  const f = kare(vurus916(KAPANIS.slogan)!);
  const d = d916(f);
  const k = KAPANIS_916.logo.w / LOGO_VIEWBOX.w;
  const ekran = ([x, y]: V2): V2 => sahneden916([d.odak[0] + (x - d.odak[0]) * d.itme, d.odak[1] + (y - d.odak[1]) * d.itme]);
  const hedef = (e: typeof ISARET.genis) => ({ cx: KAPANIS_916.logo.x + e.cx * k, cy: KAPANIS_916.logo.y + e.cy * k, a: e.a * k, b: e.b * k, aci: e.aci });
  for (const [id, e] of [["yorunge-a", ISARET.genis], ["yorunge-b", ISARET.dikey]] as const) {
    const ps = d.yorungeler.filter((y) => y.id.startsWith(id)).flatMap((y) => y.cizgi);
    assert.ok(ps.length > 100, id);
    for (const q of ps) assert.ok(Math.abs(elipsYaricapi(hedef(e), ekran(q)) - 1) < 1e-6, id);
  }
  const b = ekran(d.blok.iz!.merkez);
  assert.ok(Math.hypot(b[0] - (KAPANIS_916.logo.x + ISARET.kesisim[0] * k), b[1] - (KAPANIS_916.logo.y + ISARET.kesisim[1] * k)) < 1e-6);
  // Kart 9:16 yerinde; animasyon değerleri 16:9'unkiyle aynı.
  const a = filmDurumu(kare169(f)).kapanis!;
  assert.deepEqual(d.kapanis!.logo, { ...KAPANIS_916.logo, gorunum: a.logo.gorunum });
  assert.deepEqual([d.kapanis!.slogan.top, d.kapanis!.cagri.top], [KAPANIS_916.slogan.top, KAPANIS_916.cagri]);
  assert.deepEqual([d.kapanis!.itme, d.kapanis!.slogan.acilis, d.kapanis!.cagri.dugme], [a.itme, a.slogan.acilis, a.cagri.dugme]);
});
