import { test } from "node:test";
import assert from "node:assert/strict";
import type { V2 } from "../src/marka/izometri.ts";
import { METIN } from "../src/marka/metin.ts";
import { TUVAL_169 } from "../src/marka/tema.ts";
import {
  GUVENLI_916,
  KAPANIS_916,
  KAPANIS_916_SAHNEDE,
  METIN_DONUSUMU,
  SAHNE_916,
  SAHNE_DONUSUMU,
  metinden916,
  sahneden916,
  sahneye169,
  sloganSatirlari,
} from "../src/marka/yerlesim916.ts";

const yakin = (a: number, b: number, e = 1e-9) => Math.abs(a - b) < e;

/** "translate(a px, b px) scale(k)" dönüşümünü noktaya uygular (transformOrigin 0 0). */
const cssUygula = (donusum: string, [x, y]: V2): V2 => {
  const m = /^translate\((-?[\d.e-]+)px, (-?[\d.e-]+)px\) scale\(([\d.e-]+)\)$/.exec(donusum);
  assert.ok(m, donusum);
  const [tx, ty, k] = m!.slice(1).map(Number);
  return [tx + k * x, ty + k * y];
};

test("sahne ve metin dönüşümleri: bilinen noktalar, CSS ile aynı, ters dönüşüm", () => {
  const p = (a: V2, b: V2) => assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9, `${a} ≠ ${b}`);
  p(sahneden916([SAHNE_916.x0, 0]), [0, SAHNE_916.oy]);
  p(sahneden916([TUVAL_169.w, 0]), [1080, SAHNE_916.oy]);
  p(sahneden916([1340, 510]), [566.5573770491803, 631.4754098360656]); // blok (odak)
  p(metinden916([TUVAL_169.sol, 330]), [GUVENLI_916.sol, 1150]);
  for (const q of [[0, 0], [1340, 510], [1920, 1080], [812.5, -40]] as V2[]) {
    p(cssUygula(SAHNE_DONUSUMU, q), sahneden916(q));
    p(cssUygula(METIN_DONUSUMU, q), metinden916(q));
    p(sahneye169(sahneden916(q)), q);
  }
  // Kapanış: halkaların hedef logosu, 9:16 logosunun sahne çerçevesindeki karşılığı.
  const L = KAPANIS_916_SAHNEDE;
  p(sahneden916([L.x, L.y]), [KAPANIS_916.logo.x, KAPANIS_916.logo.y]);
  assert.ok(yakin(L.w * SAHNE_916.k, KAPANIS_916.logo.w));
});

test("metin sütunu: en alt yazı ('02 Atölye' çipinin altı, 16:9 y 817) güvenli bandın altına 5 px içinde", () => {
  const alt = metinden916([0, 790 + 54 / 2])[1];
  assert.ok(alt <= GUVENLI_916.alt && alt > GUVENLI_916.alt - 5, `${alt}`);
});

test("slogan dikeyde iki satır, metin değişmez", () => {
  assert.deepEqual(KAPANIS_916.slogan.satirlar, ["Özel eğitimde yapay zekâ destekli", "öğrenme yönetimi."]);
  assert.equal(KAPANIS_916.slogan.satirlar.join(" "), METIN.kapanis.ekran[0]);
  assert.deepEqual(sloganSatirlari("a b c"), ["a", "b c"]);
});
