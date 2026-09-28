import { test } from "node:test";
import assert from "node:assert/strict";
import { acilisDurumu } from "../src/marka/acilisDurumu.ts";
import { filmDurumu } from "../src/marka/filmDurumu.ts";
import { gorunur } from "../src/marka/izometri.ts";
import { DONUS, KANCA, YUK } from "../src/marka/olaylar.ts";
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
  assert.ok(metin(K9 + 8, "kanca-baslik") === undefined);
  assert.ok(filmDurumu(K9 + 8).etiketler.every((e) => !e.id.startsWith("hedef")));
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
