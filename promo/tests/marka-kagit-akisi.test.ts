import { test } from "node:test";
import assert from "node:assert/strict";
import { DUSUS_KARE, KAGIT_T, MODUL_ADET, MODUL_YERI, YIGIN_YERI, inmisAdet, kagitSahnesi } from "../src/marka/kagitAkisi.ts";
import { DONUS, YUK, type YiginId } from "../src/marka/olaylar.ts";
import { kare } from "../src/marka/zaman.ts";

const IDLER: YiginId[] = ["S1", "S2", "S3", "S4"];
const yer = (g: { p: number[] }, p: readonly number[]) => g.p[0] === p[0] && g.p[1] === p[1];
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
  const ucanlar = kagitSahnesi(f).filter((g) => g.kagitlar.length === 1 && !g.kagitlar[0].ust && g.kagitlar[0].sekme === null);
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
