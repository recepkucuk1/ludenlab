import { test } from "node:test";
import assert from "node:assert/strict";
import { DUSUS_KARE, KAGIT_T, MODUL_ADET, MODUL_YERI, MODUL_YERINDEKI, UCUS_KARE, YIGIN_YERI, inmisAdet, kagitSahnesi } from "../src/marka/kagitAkisi.ts";
import { DONUS, YUK, type YiginId } from "../src/marka/olaylar.ts";
import { kare } from "../src/marka/zaman.ts";

const IDLER: YiginId[] = ["S1", "S2", "S3", "S4"];
// Yerdeki (z = 0) yığın grubu; havadaki uçan kâğıt grubu aynı xy'ye inse bile yığın sayılmaz.
const yer = (g: { p: number[] }, p: readonly number[]) => g.p[0] === p[0] && g.p[1] === p[1] && g.p[2] === 0;
const modulAdet = (f: number) =>
  kagitSahnesi(f)
    .filter((g) => yer(g, MODUL_YERI.studio) || yer(g, MODUL_YERI.atolye))
    .reduce((s, g) => s + g.kagitlar.length, 0);

test("Yük başlamadan tablada kâğıt yok", () => {
  assert.equal(kagitSahnesi(kare(YUK.baslik) - DUSUS_KARE).length, 0);
});

test("Yük sonunda yığınlar 11/12/14/21", () => {
  assert.deepEqual(IDLER.map((id) => inmisAdet(id, kare(24))), [11, 12, 14, 21]);
});

test("deste tam vuruşunda iner; bir kare önce yığının üstünde havada", () => {
  for (const d of YUK.desteler) {
    const v = kare(d.vurus);
    const once = inmisAdet(d.yigin, v - 1);
    assert.equal(inmisAdet(d.yigin, v) - once, d.adet, `v${d.vurus}`);
    const g = kagitSahnesi(v - 1).find((g) => yer(g, YIGIN_YERI[d.yigin]))!;
    assert.equal(g.kagitlar.length, once + d.adet, `v${d.vurus}`);
    assert.ok(g.kagitlar[once].z0 > once * KAGIT_T + 1e-6, `v${d.vurus}`);
  }
});

test("dönüş sonunda kaynaklar boş, iki modül yığını 8'er, havada kâğıt yok", () => {
  const g = kagitSahnesi(kare(DONUS.yerlesme[DONUS.yerlesme.length - 1]));
  assert.equal(g.length, 2);
  for (const m of g) assert.equal(m.kagitlar.length, MODUL_ADET);
});

test("dönüşte uçan kâğıtlar yay çizer", () => {
  const f = kare(DONUS.tabla) + 2 + 7;
  const ucanlar = kagitSahnesi(f).filter((g) => g.kagitlar.length === 1 && g.p[2] > 0);
  assert.ok(ucanlar.length > 0);
  assert.ok(ucanlar.some((g) => g.p[2] > 1.2));
});

test("dönüşte modül yığınları yalnız büyür, kaynaklar yalnız küçülür", () => {
  let oncekiModul = 0;
  let oncekiKaynak = Infinity;
  for (let f = kare(DONUS.tabla); f <= kare(29); f++) {
    const m = modulAdet(f);
    const k = kagitSahnesi(f).filter((g) => IDLER.some((id) => yer(g, YIGIN_YERI[id]))).reduce((s, g) => s + g.kagitlar.length, 0);
    assert.ok(m >= oncekiModul, `modül f=${f}`);
    assert.ok(k <= oncekiKaynak, `kaynak f=${f}`);
    oncekiModul = m;
    oncekiKaynak = k;
  }
});

// Sahnedeki bir kâğıdın xy merkezi (taban köşegeninin orta noktası).
const merkez = (k: { taban: number[][] }) => [(k.taban[0][0] + k.taban[2][0]) / 2, (k.taban[0][1] + k.taban[2][1]) / 2];
const modulSayisi = (f: number, m: "studio" | "atolye") => kagitSahnesi(f).find((g) => yer(g, MODUL_YERI[m]))?.kagitlar.length ?? 0;
const MODULLER = ["studio", "atolye"] as const;

test("dönüşte uçan kâğıt ve modül yığını hiçbir Yük yığınıyla iç içe geçmez", () => {
  // Merkezleri 0.9'dan yakın iki kâğıdın (kısa kenar) alt tabanları kesin örtüşür; örtüşenlerin z aralığı ayrık olmalı.
  // Uçan kâğıt havadan geçerken kendi kaynak yığınının üstünden yükselir (yerindeki kaynaklar modül yerinin yanında):
  // temas serbest (kayan nokta payı kadar).
  const PAY = 1e-6;
  for (let f = kare(DONUS.tabla); f <= kare(29); f++) {
    const gruplar = kagitSahnesi(f);
    const yuk = gruplar.filter((g) => IDLER.some((id) => yer(g, YIGIN_YERI[id])));
    for (const g of gruplar.filter((g) => !yuk.includes(g))) {
      for (const k of g.kagitlar) {
        for (const y of yuk) {
          for (const yk of y.kagitlar) {
            const [ax, ay] = merkez(k);
            const [bx, by] = merkez(yk);
            if (Math.hypot(ax - bx, ay - by) >= 0.9) continue;
            const ic = Math.min(k.z0 + k.h, yk.z0 + yk.h) - Math.max(k.z0, yk.z0);
            assert.ok(ic <= PAY, `f=${f} iç içe ${ic.toFixed(3)}`);
          }
        }
      }
    }
  }
});

test("modül yığını 8'i aşmaz, kareden kareye en çok bir kâğıt büyür ve 8'e tam ulaşır", () => {
  for (const m of MODULLER) {
    let onceki = 0;
    for (let f = kare(DONUS.tabla); f <= kare(29); f++) {
      const n = modulSayisi(f, m);
      assert.ok(n <= MODUL_ADET, `${m} f=${f} n=${n}`);
      assert.ok(n - onceki <= 1, `${m} f=${f} sıçrama ${onceki}→${n}`);
      onceki = n;
    }
    assert.equal(onceki, MODUL_ADET, m);
  }
});

test("her iniş tam oturur: yığın büyüdüğü karede uçan kâğıt modül yerinde, yığının üstündedir", () => {
  for (const m of MODULLER) {
    for (let f = kare(DONUS.tabla); f < kare(29); f++) {
      const once = modulSayisi(f, m);
      if (modulSayisi(f + 1, m) <= once) continue;
      const [mx, my] = MODUL_YERI[m];
      const iner = kagitSahnesi(f).filter(
        (g) => g.kagitlar.length === 1 && g.p[2] > 0 && Math.hypot(merkez(g.kagitlar[0])[0] - mx, merkez(g.kagitlar[0])[1] - my) < 1e-9,
      );
      assert.ok(iner.some((g) => Math.abs(g.kagitlar[0].z0 - once * KAGIT_T) < 1e-9), `${m} f=${f} iniş yok/uyuşmuyor`);
    }
  }
});

const yukSayisi = (f: number, id: YiginId) => kagitSahnesi(f).find((g) => yer(g, YIGIN_YERI[id]))?.kagitlar.length ?? 0;
/** Modülün ilk inişinin karesi: modül yığınının ilk göründüğü kare. */
const ilkInis = (m: "studio" | "atolye") => {
  let f = kare(DONUS.tabla);
  while (modulSayisi(f, m) === 0) f++;
  return f;
};

test("yerindeki kaynak yığın ilk inişten önce boşalır", () => {
  for (const m of MODULLER) {
    const ilk = ilkInis(m);
    assert.equal(ilk, kare(DONUS.tabla) + 2 + UCUS_KARE, `${m} ilk iniş`);
    const yerinde = MODUL_YERINDEKI[m];
    assert.equal(yukSayisi(kare(DONUS.tabla) + 1, yerinde), inmisAdet(yerinde, kare(24)), `${m} kalkıştan önce dolu`);
    assert.equal(yukSayisi(ilk - 1, yerinde), 0, `${m} f=${ilk - 1}`);
    assert.equal(yukSayisi(ilk, yerinde), 0, `${m} f=${ilk}`);
  }
});

test("öteki kaynak yığın ilk inişe kadar dokunulmaz, sonra akışla boşalır", () => {
  const OTEKI: Record<"studio" | "atolye", YiginId> = { studio: "S3", atolye: "S2" };
  for (const m of MODULLER) {
    const ilk = ilkInis(m);
    const oteki = OTEKI[m];
    assert.equal(yukSayisi(ilk - 1, oteki), inmisAdet(oteki, kare(24)), `${m} f=${ilk - 1}`);
    assert.ok(yukSayisi(ilk + 6, oteki) < inmisAdet(oteki, kare(24)), `${m} akış başlamadı`);
  }
});

test("iki modül yığını v28'de tamamlanır, ondan önce tamamlanmaz", () => {
  const v28 = kare(28);
  for (const m of MODULLER) {
    assert.ok(modulSayisi(v28 - 1, m) < MODUL_ADET, `${m} f=${v28 - 1}`);
    assert.equal(modulSayisi(v28, m), MODUL_ADET, `${m} f=${v28}`);
  }
});
