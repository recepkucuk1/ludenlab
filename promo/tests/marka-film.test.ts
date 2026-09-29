import { test } from "node:test";
import assert from "node:assert/strict";
import { acilisDurumu } from "../src/marka/acilisDurumu.ts";
import { filmDurumu } from "../src/marka/filmDurumu.ts";
import { gorunur, izd } from "../src/marka/izometri.ts";
import { MODUL_YERI } from "../src/marka/kagitAkisi.ts";
import { ATOLYE, DONUS, KANCA, STUDIO, YUK } from "../src/marka/olaylar.ts";
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
    // Dönüş: kart 12 karede blur-out olurken kâğıt geri belirir; sonunda yığın tek parça, kâğıt tam opak.
    for (let f = donus - 1; f <= donus + 14; f++) {
      if (f >= donus) assert.ok(ustOpaklik(f, mid) + kartGorunurlugu(f, mid) >= 1 - 1e-9, `${mid} dönüş f=${f}`);
    }
    assert.equal(ustOpaklik(donus - 1, mid), 0);
    assert.equal(yigin(donus + 12, mid).length, 8);
    assert.equal(ustOpaklik(donus + 12, mid), 1);
    assert.ok(yigin(donus + 12, mid).every((k) => k.opaklik === undefined), `${mid} birleşmiş yığında kâğıt başına opaklık yok`);
    // Kare kare süreklilik: kâğıt opaklığı en çok 1/6 oynar (pop yok).
    for (let f = acilis - 1; f < donus + 14; f++) assert.ok(Math.abs(ustOpaklik(f + 1, mid) - ustOpaklik(f, mid)) <= 1 / 6 + 1e-9, `${mid} f=${f}`);
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
