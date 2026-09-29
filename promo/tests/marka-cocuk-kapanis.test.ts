import { test } from "node:test";
import assert from "node:assert/strict";
import { DONUS_KARE, INCE_ADET, cocukYiginlari } from "../src/marka/cocukKapanis.ts";
import { MODUL_ADET, MODUL_TOHUM, modulYigini } from "../src/marka/kagitAkisi.ts";
import { yigin, type Kagit } from "../src/marka/nesneler.ts";
import { COCUK } from "../src/marka/olaylar.ts";
import { RENK } from "../src/marka/tema.ts";
import { COCUK_YIGIN_YERI } from "../src/marka/yerlesim.ts";
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
