import { test } from "node:test";
import assert from "node:assert/strict";
import { acilisDurumu } from "../src/marka/acilisDurumu.ts";
import { filmDurumu, zeminIsigi, zeminKaymasi } from "../src/marka/filmDurumu.ts";
import { gorunur, izd } from "../src/marka/izometri.ts";
import { MODUL_TOHUM, MODUL_YERI } from "../src/marka/kagitAkisi.ts";
import { HEDEFLER, METIN } from "../src/marka/metin.ts";
import { yigin as yiginUret } from "../src/marka/nesneler.ts";
import { ATOLYE, COCUK, DONUS, KANCA, KAPANIS, STUDIO, YUK } from "../src/marka/olaylar.ts";
import { RENK, TUVAL_169 } from "../src/marka/tema.ts";
import { COCUK_YIGIN_YERI, GENEL_KAMERA, HEDEF_YERLESIMI } from "../src/marka/yerlesim.ts";
import { kare } from "../src/marka/zaman.ts";

const K9 = kare(YUK.baslik);
const K25 = kare(DONUS.tabla);
const SON = kare(33) - 1;
const metin = (f: number, id: string) => filmDurumu(f).metinler.find((m) => m.id === id);

test("Kanca kareleri açılışın birebir aynısı", () => {
  for (const f of [0, 20, 36, 50, 74, 112, K9 - 1]) {
    const a = acilisDurumu(f);
    const d = filmDurumu(f);
    assert.equal(d.itme, a.kamera, `f=${f}`);
    assert.equal(d.sarsinti, a.sarsinti, `f=${f}`);
    assert.equal(d.blok.z, a.blokZ, `f=${f}`);
    assert.deepEqual(d.blok.aci, a.blokAci, `f=${f}`);
    assert.equal(d.blok.yuz, a.yuz, `f=${f}`);
    assert.equal(d.yuva, a.yuva, `f=${f}`);
    assert.equal(d.kamera.don, 0, `f=${f}`);
    assert.deepEqual(metin(f, "kanca-baslik")!.acilis, a.satirlar, `f=${f}`);
    assert.deepEqual(metin(f, "kanca-ust")!.acilis, [a.ust], `f=${f}`);
    // v9 destesinin etiketi 6 kare önceden belirir; Kanca karşılaştırması yalnız hedef etiketleri.
    const hedef = d.etiketler.filter((e) => e.id.startsWith("hedef"));
    assert.deepEqual(hedef.map((e) => e.ilerleme), a.etiketCizgi, `f=${f}`);
    assert.deepEqual(hedef.map((e) => e.gorunum), a.etiketCip, `f=${f}`);
    assert.equal(d.kunye, 0);
  }
});

test("Kanca metni ve etiketleri v9'da çıkar, Yük başlığı ardından açılır", () => {
  assert.ok(metin(K9 + 12, "kanca-baslik") === undefined);
  assert.ok(filmDurumu(K9 + 12).etiketler.every((e) => !e.id.startsWith("hedef")));
  const y = metin(K9 + 20, "yuk-baslik")!;
  assert.equal(y.acilis[0], 1);
  assert.deepEqual(y.satirlar, ["HER MATERYAL", "AYRI."]);
});

test("her etiketli deste etiketi raptiyesine deste vuruşunda varır", () => {
  for (const d of YUK.desteler.filter((d) => d.etiket)) {
    const v = kare(d.vurus);
    const e = (f: number) => filmDurumu(f).etiketler.find((x) => x.id === `deste-${d.vurus}`);
    assert.ok(e(v - 1)!.ilerleme < 1, `v${d.vurus}`);
    assert.equal(e(v)!.ilerleme, 1, `v${d.vurus}`);
    assert.equal(e(v + 30), undefined, `v${d.vurus}`);
  }
});

test("tabla v25'te −90° döner, yüz görünür kalır", () => {
  assert.equal(filmDurumu(K25).kamera.don, 0);
  const d = filmDurumu(K25 + 36);
  assert.ok(Math.abs(d.kamera.don + Math.PI / 2) < 1e-9);
  assert.ok(gorunur({ n: [0, 1, 0] }, d.kamera));
  assert.ok(Math.abs(filmDurumu(SON).kamera.don + Math.PI / 2) < 1e-9);
});

test("künye v29'da gelir; Dönüş cümlesi ve çipleri görünür", () => {
  assert.equal(filmDurumu(kare(DONUS.kunye) - 11).kunye, 0);
  assert.equal(filmDurumu(kare(DONUS.kunye)).kunye, 1);
  const d = filmDurumu(kare(31));
  assert.deepEqual(metin(kare(31), "donus-cumle")!.acilis, [1, 1, 1]);
  assert.deepEqual(d.cipler.map((c) => c.gorunum), [1, 1]);
});

test("hareket sürekli: ardışık karelerde itme ve dönüş sıçramaz, zemin hep kayar", () => {
  for (let f = 0; f < SON; f++) {
    const a = filmDurumu(f);
    const b = filmDurumu(f + 1);
    // Sınırlar eğrilerin tepe eğimine göre (kare başına): itme inOut(cubic) 3·0,14/18 ≈ 0,023;
    // dönüş inOut(sin) (π/2)·(π/2)/36 ≈ 0,069. Gerçek bir sıçrama (ör. 1,07 → 0,93) bunların birkaç katı olurdu.
    assert.ok(Math.abs(b.itme - a.itme) < 0.025, `itme f=${f}`);
    assert.ok(Math.abs(b.kamera.don - a.kamera.don) < 0.1, `don f=${f}`);
    assert.ok(b.kayma > a.kayma, `kayma f=${f}`);
  }
});

test("Kanca'da ilk vuruşlar değişmedi (KANCA sabitleri)", () => {
  assert.equal(KANCA.inis, 3);
});

const K33 = kare(STUDIO.tabla);
const K53 = kare(ATOLYE.tabla);
const K73 = kare(73);

test("tabla v33'te −180°, v53'te −270°; kamera Studio'da 120, Atölye'de 130", () => {
  const s = filmDurumu(K33 + 36);
  assert.ok(Math.abs(s.kamera.don + Math.PI) < 1e-9);
  assert.equal(s.kamera.s, 120);
  const a = filmDurumu(K53 + 36);
  assert.ok(Math.abs(a.kamera.don + (3 * Math.PI) / 2) < 1e-9);
  assert.equal(a.kamera.s, 130);
});

test("odak yığınları ekranda beklenen yerde", () => {
  const s = filmDurumu(K33 + 36).kamera;
  const [sx, sy] = izd([MODUL_YERI.studio[0], MODUL_YERI.studio[1], 0.8], s);
  assert.ok(Math.abs(sx - 1340) < 6 && Math.abs(sy - 701) < 6, `${sx} ${sy}`);
  const a = filmDurumu(K53 + 36).kamera;
  const [ax, ay] = izd([MODUL_YERI.atolye[0], MODUL_YERI.atolye[1], 0.8], a);
  assert.ok(Math.abs(ax - 1350) < 6 && Math.abs(ay - 533) < 6, `${ax} ${ay}`);
});

test("Studio ve Atölye katmanı filme geçer; odak dışı soluk", () => {
  const d = filmDurumu(K33 + 30);
  assert.ok(Math.abs(d.blok.opaklik - 0.3) < 1e-9);
  assert.ok(Math.abs(d.kagitlar.find((g) => g.id === "modul-atolye")!.opaklik! - 0.3) < 1e-9);
  assert.ok(Math.abs(d.kagitlar.find((g) => g.id === "modul-studio")!.opaklik! - 1) < 1e-9);
  assert.ok(d.kilitler.some((k) => k.id === "kilit-studio"));
  assert.ok(filmDurumu(kare(STUDIO.kart) + 40).kartlar.length === 3);
});

test("kart açılınca Studio yığını bir kâğıt eksik (üst kâğıt kartla çapraz geçişle söndükten sonra)", () => {
  const n = (f: number) => filmDurumu(f).kagitlar.find((g) => g.id === "modul-studio")!.kagitlar.length;
  assert.equal(n(kare(STUDIO.kart) - 1), 8);
  assert.equal(n(kare(STUDIO.kart) + 6), 7);
});

// Üst kâğıt kartına dönüşürken pop olmasın: kart belirirken kâğıt sönerek, kart giderken belirerek el değiştirir.
const yigin = (f: number, mid: "studio" | "atolye") => filmDurumu(f).kagitlar.find((g) => g.id === `modul-${mid}`)!.kagitlar;
const ustOpaklik = (f: number, mid: "studio" | "atolye") => {
  const l = yigin(f, mid);
  return l.length === 8 ? (l[7].opaklik ?? 1) : 0;
};
const kartGorunurlugu = (f: number, mid: "studio" | "atolye") =>
  Math.max(0, ...filmDurumu(f).kartlar.filter((k) => k.id.startsWith(mid)).map((k) => k.opaklik * (1 - k.cikis)));

test("üst kâğıt ile kart çapraz geçer: toplam görünürlük hiç düşmez, kâğıt sayısı 7'nin altına inmez", () => {
  const olaylar = { studio: [kare(STUDIO.kart), K53], atolye: [kare(ATOLYE.kart), K73] } as const;
  for (const mid of ["studio", "atolye"] as const) {
    const [acilis, donus] = olaylar[mid];
    // Açılış: kart 6 karede belirir, kâğıt aynı sürede söner.
    for (let f = acilis - 2; f <= acilis + 8; f++) {
      assert.ok(yigin(f, mid).length >= 7, `${mid} f=${f}`);
      if (f < acilis) continue;
      assert.ok(ustOpaklik(f, mid) + kartGorunurlugu(f, mid) >= 1 - 1e-9, `${mid} açılış f=${f}: ${ustOpaklik(f, mid)} + ${kartGorunurlugu(f, mid)}`);
    }
    assert.equal(ustOpaklik(acilis, mid), 1, `${mid} açılışın ilk karesi kâğıt tam`);
    assert.equal(ustOpaklik(acilis + 6, mid), 0, `${mid} kâğıt 6 karede gider`);
    assert.equal(ustOpaklik(donus - 1, mid), 0);
    // Studio'nun kartı v53'te giderken üst kâğıt geri belirir; sonunda yığın tek parça, kâğıt tam opak. Atölye'nin kartı
    // v73'te gider ama üst kâğıt geri gelmez: Çocuk'ta yığın incelir, üst kâğıtlar kalkar (cocukKapanis.ts, Plan 3C).
    if (mid === "studio") {
      for (let f = donus; f <= donus + 14; f++) assert.ok(ustOpaklik(f, mid) + kartGorunurlugu(f, mid) >= 1 - 1e-9, `${mid} dönüş f=${f}`);
      assert.equal(yigin(donus + 12, mid).length, 8);
      assert.equal(ustOpaklik(donus + 12, mid), 1);
      assert.ok(yigin(donus + 12, mid).every((k) => k.opaklik === undefined), `${mid} birleşmiş yığında kâğıt başına opaklık yok`);
    }
    // Kare kare süreklilik: kâğıt opaklığı en çok 1/6 oynar (pop yok).
    const son = mid === "studio" ? donus + 14 : donus - 1;
    for (let f = acilis - 1; f < son; f++) assert.ok(Math.abs(ustOpaklik(f + 1, mid) - ustOpaklik(f, mid)) <= 1 / 6 + 1e-9, `${mid} f=${f}`);
  }
});

test("hareket v33–72 boyunca sürekli", () => {
  for (let f = SON; f < K73 - 1; f++) {
    const a = filmDurumu(f);
    const b = filmDurumu(f + 1);
    assert.ok(Math.abs(b.itme - a.itme) < 0.025, `itme f=${f}`);
    assert.ok(Math.abs(b.kamera.don - a.kamera.don) < 0.1, `don f=${f}`);
    assert.ok(Math.abs(b.kamera.s - a.kamera.s) < 1.5, `s f=${f}`);
    assert.ok(Math.abs(b.kamera.ox - a.kamera.ox) < 20 && Math.abs(b.kamera.oy - a.kamera.oy) < 20, `o f=${f}`);
  }
});

const SON_KARE = 1799;

test("Çocuk: tabla v73'te −360°'ye döner, kamera genel plana; soluklaştırma aynı sürede kalkar", () => {
  const d = filmDurumu(K73 + 36);
  assert.ok(Math.abs(d.kamera.don + 2 * Math.PI) < 1e-9);
  assert.deepEqual([d.kamera.s, d.kamera.ox, d.kamera.oy], [GENEL_KAMERA.s, GENEL_KAMERA.ox, GENEL_KAMERA.oy]);
  assert.ok(Math.abs(d.blok.opaklik - 1) < 1e-9);
  for (const g of d.kagitlar) assert.ok(Math.abs((g.opaklik ?? 1) - 1) < 1e-9, g.id);
  assert.equal(filmDurumu(K73).blok.opaklik, filmDurumu(K73 - 1).blok.opaklik);
});

test("v72 → v73 geçişinde modül yığınları sıçramaz: aynı görünen kâğıtlar, aynı yer, aynı opaklık", () => {
  const gorunen = (f: number, m: string) =>
    filmDurumu(f)
      .kagitlar.filter((g) => g.id === `modul-${m}` || g.id.startsWith(`kalkan-${m}`))
      .flatMap((g) => g.kagitlar.map((k) => ({ k, o: (g.opaklik ?? 1) * (k.opaklik ?? 1) })))
      .filter((x) => x.o > 0);
  for (const m of ["studio", "atolye"]) {
    const [a, b] = [gorunen(K73 - 1, m), gorunen(K73, m)];
    assert.equal(b.length, a.length, m);
    a.forEach((x, i) => {
      assert.ok(Math.abs(x.k.z0 - b[i].k.z0) < 1e-9 && Math.abs(x.o - b[i].o) < 1e-9, `${m} ${i}`);
      x.k.taban.forEach((p, j) => assert.ok(Math.hypot(p[0] - b[i].k.taban[j][0], p[1] - b[i].k.taban[j][1]) < 1e-9, `${m} ${i}`));
    });
  }
});

test("v82 = storyboard F10 (stil karesi): genel kamera, ince yığınlar, blok, hedef etiketleri, başlık, künye", () => {
  const f = kare(82);
  const d = filmDurumu(f);
  for (const p of [[0, 0, 0], [1.2, -0.7, 0.5], [-1.6, 1.5, 0.3]] as [number, number, number][]) {
    const [a, b] = [izd(p, d.kamera), izd(p, GENEL_KAMERA)];
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6, `${p}`);
  }
  assert.deepEqual(d.kagitlar.map((g) => g.id).sort(), ["modul-atolye", "modul-studio"]);
  const sekme = { studio: RENK.studio, atolye: RENK.atolye };
  for (const m of ["studio", "atolye"] as const) {
    const g = d.kagitlar.find((x) => x.id === `modul-${m}`)!;
    const ref = yiginUret({ cx: COCUK_YIGIN_YERI[m][0], cy: COCUK_YIGIN_YERI[m][1], adet: 3, tohum: MODUL_TOHUM[m], sapma: 0.02, sekme: sekme[m] }).kagitlar;
    assert.equal(g.kagitlar.length, 3);
    g.kagitlar.forEach((k, i) => k.taban.forEach((p, j) => assert.ok(Math.hypot(p[0] - ref[i].taban[j][0], p[1] - ref[i].taban[j][1]) < 1e-9, m)));
    assert.equal(g.kagitlar[2].sekme, sekme[m]);
  }
  assert.deepEqual([d.blok.opaklik, d.blok.z, d.blok.yuz, d.blok.iz], [1, 0, 1, null]);
  assert.deepEqual(d.etiketler.map((e) => e.id), ["cocuk-hedef-0", "cocuk-hedef-1", "cocuk-hedef-2"]);
  d.etiketler.forEach((e, i) => {
    const y = HEDEF_YERLESIMI[i];
    assert.deepEqual([e.capa, e.x, e.y, e.hiza, e.metin, e.nokta, e.gorunum, e.ilerleme, e.cikis], [y.capa, y.x, y.y, y.hiza, HEDEFLER[i].metin, RENK[HEDEFLER[i].modul], 1, 1, 0]);
  });
  assert.deepEqual(d.metinler.map((m) => [m.id, m.satirlar, m.top, m.boyut, m.acilis]), [["cocuk-baslik", METIN.cocuk.baslik, 360, 104, [1, 1, 1]]]);
  assert.deepEqual([d.kunye, d.kunyeCikis, d.kartlar.length, d.kilitler.length, d.damga, d.yorungeler.length, d.arka, d.kapanis], [1, 0, 0, 0, null, 0, null, null]);
  assert.ok(d.itme > 0.97 && d.itme < 1.01, `${d.itme}`);
});

// Stil karesinde ölçülen çip genişlikleri (px; out/marka/stil-karesi.png, satır taraması) + 4 px pay.
const HEDEF_CIP_GENISLIGI: Record<string, number> = { "/r/ sesi": 166, "okuma akıcılığı": 272, "sıra beklemek": 256 };

test("Çocuk'un hedef çipleri kamera itmesiyle 120–1800 px sütununda kalır", () => {
  for (let f = K73; f < kare(COCUK.yorunge) + 12; f++) {
    const d = filmDurumu(f);
    const ekran = (x: number) => d.odak[0] + (x - d.odak[0]) * d.itme;
    for (const e of d.etiketler.filter((e) => e.id.startsWith("cocuk-hedef") && e.gorunum > 0)) {
      const w = HEDEF_CIP_GENISLIGI[e.metin];
      const [a, b] = e.hiza === "sol" ? [e.x, e.x + w] : [e.x - w, e.x];
      assert.ok(ekran(b) <= TUVAL_169.w - TUVAL_169.sol && ekran(a) >= TUVAL_169.sol, `f=${f} ${e.metin}: ${ekran(a).toFixed(0)}–${ekran(b).toFixed(0)}`);
    }
  }
});

test("hareket v72–100 boyunca sürekli ve hiç durmaz (son kareye dek)", () => {
  const kartItmesi = (d: ReturnType<typeof filmDurumu>) => d.kapanis?.itme ?? 1;
  for (let f = K73 - 1; f < SON_KARE; f++) {
    const a = filmDurumu(f);
    const b = filmDurumu(f + 1);
    assert.ok(Math.abs(b.itme - a.itme) < 0.025, `itme f=${f}`);
    assert.ok(Math.abs(b.kamera.don - a.kamera.don) < 0.1, `don f=${f}`);
    assert.ok(Math.abs(b.kamera.s - a.kamera.s) < 1.5, `s f=${f}`);
    assert.ok(Math.abs(b.kamera.ox - a.kamera.ox) < 20 && Math.abs(b.kamera.oy - a.kamera.oy) < 20, `o f=${f}`);
    const hareket = Math.abs(b.itme - a.itme) > 5e-5 || Math.abs(b.kamera.don - a.kamera.don) > 1e-4 || Math.abs(kartItmesi(b) - kartItmesi(a)) > 5e-5;
    assert.ok(hareket, `donuk f=${f}`);
  }
});

test("kapanışta yığınlar bloğun, yörüngeler yığınların ekran kutusuna girmez (iki katman ayrılırken sıra değişmez)", () => {
  const kutu = (ps: [number, number][]) => ({ x0: Math.min(...ps.map((p) => p[0])), x1: Math.max(...ps.map((p) => p[0])), y0: Math.min(...ps.map((p) => p[1])), y1: Math.max(...ps.map((p) => p[1])) });
  const kesisir = (a: ReturnType<typeof kutu>, b: ReturnType<typeof kutu>) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  for (let f = kare(COCUK.yorunge); f <= kare(KAPANIS.donusum); f += 2) {
    const d = filmDurumu(f);
    const k = d.kamera;
    const blok = kutu([-0.5, 0.5].flatMap((x) => [-0.5, 0.5].flatMap((y) => [0, 1].map((z) => izd([x, y, z], k)))));
    const yorunge = kutu(d.yorungeler.flatMap((y) => y.cizgi));
    for (const g of d.kagitlar) {
      const y = kutu(g.kagitlar.flatMap((kg) => kg.taban.flatMap(([x, yy]) => [izd([x, yy, kg.z0], k), izd([x, yy, kg.z0 + kg.h], k)])));
      assert.ok(!kesisir(y, blok), `f=${f} ${g.id} bloğa biniyor`);
      if (d.yorungeler.length) assert.ok(!kesisir(y, yorunge), `f=${f} ${g.id} yörüngeye biniyor`);
    }
  }
});

test("hedef logo yalnız yörüngeleri ve bloğun izini değiştirir; zemin zeminKaymasi(f) ve zeminIsigi(f)", () => {
  const logo = { x: 880, y: 465, w: 858 };
  const disi = (d: ReturnType<typeof filmDurumu>) => ({ ...d, yorungeler: [], blok: { ...d.blok, iz: null } });
  for (const f of [0, 500, 1300, 1520, 1640, 1670, 1700]) assert.deepEqual(disi(filmDurumu(f, logo)), disi(filmDurumu(f)), `f=${f}`);
  assert.notDeepEqual(filmDurumu(1670, logo).yorungeler, filmDurumu(1670).yorungeler);
  assert.notDeepEqual(filmDurumu(1670, logo).blok.iz, filmDurumu(1670).blok.iz);
  for (let f = 0; f < SON_KARE; f++) {
    const d = filmDurumu(f);
    assert.deepEqual([zeminKaymasi(f), zeminIsigi(f)], [d.kayma, d.isik], `f=${f}`);
  }
});
