import { test } from "node:test";
import assert from "node:assert/strict";
import { SESLER_169 } from "../src/marka/olaylar.ts";
import type { SesOlayi } from "../src/marka/olaylar.ts";
import { ATLANAN_169, ESLEME_916, GIZLI_SES_169, atlandi169, kare169, sesler916, vurus916 } from "../src/marka/zamanEslemesi.ts";
import { BOLUMLER_169, BOLUMLER_916, kare, toplamKare } from "../src/marka/zaman.ts";

const yakin = (a: number, b: number, msg?: string) => assert.ok(Math.abs(a - b) < 1e-9, `${msg ?? ""} ${a} ≠ ${b}`);
/** kare() 'nin tersi: karenin başladığı vuruş (kesirli olabilir). */
const vurusOf = (k: number) => k / 18 + 1;
const KARE_916 = toplamKare(BOLUMLER_916);
const SON_169 = BOLUMLER_169[BOLUMLER_169.length - 1].son + 1;

test("parçalar 9:16 tarafında bitişik ve tam olarak [1,51) = 900 kareyi kaplar", () => {
  assert.equal(ESLEME_916[0].bas916, 1);
  for (let i = 1; i < ESLEME_916.length; i++) assert.equal(ESLEME_916[i].bas916, ESLEME_916[i - 1].son916, `parça ${i + 1}`);
  assert.equal(ESLEME_916[ESLEME_916.length - 1].son916, 51);
  assert.equal(kare(51) - kare(1), 900);
  assert.equal(KARE_916, 900);
  assert.equal(ESLEME_916.length, 15);
});

test("parçaların 16:9 aralıkları film içinde, kesin artan ve çakışmaz", () => {
  for (const p of ESLEME_916) {
    assert.ok(p.bas169 < p.son169, `${p.bas916}`);
    assert.ok(p.bas169 >= 1 && p.son169 <= SON_169, `${p.bas916}`);
  }
  for (let i = 1; i < ESLEME_916.length; i++) {
    assert.ok(ESLEME_916[i].bas169 >= ESLEME_916[i - 1].son169, `parça ${i + 1} öncekiyle çakışıyor`);
  }
});

test("hız 1× ya da 2×; hiz alanı aralık oranından türer", () => {
  for (const p of ESLEME_916) {
    const oran = (p.son169 - p.bas169) / (p.son916 - p.bas916);
    assert.ok(oran === 1 || oran === 2, `${p.bas916}: ${oran}`);
    assert.equal(p.hiz, oran);
  }
});

test("kare169: uçlar ve tam sayılık", () => {
  assert.equal(kare169(0), 0);
  assert.equal(kare169(899), kare(97) - 1);
  for (let f = 0; f < 900; f++) assert.ok(Number.isInteger(kare169(f)), `f=${f}`);
});

test("kare169: alan dışı kareler uçlara sıkışır", () => {
  assert.equal(kare169(-5), kare169(0));
  assert.equal(kare169(900), kare169(899));
  assert.equal(kare169(5000), kare169(899));
});

test("kare169: bilinen noktalar", () => {
  // 9:16 v16 → 16:9 v26 (Dönüş cümlesi)
  assert.equal(kare169(kare(16)), kare(26));
  // 9:16 v7 → 16:9 v9 (Yük başlar)
  assert.equal(kare169(kare(7)), kare(9));
  assert.equal(kare169(kare(5)), kare(5));
  // 2× hız: 9:16'da yarım vuruş = 16:9'da bir vuruş
  assert.equal(kare169(kare(7) + 9), kare(10));
  // her sıçrama noktası: 9:16 parça başı 16:9 parça başına oturur
  for (const p of ESLEME_916) assert.equal(kare169(kare(p.bas916)), kare(p.bas169), `v${p.bas916}`);
  // Studio kartı: atlama A (37 → 41)
  assert.equal(kare169(kare(24)), kare(41));
});

test("kare169 parça içinde tekdüze artar; sıçrama yalnız parça sınırında", () => {
  for (let f = 0; f < 899; f++) {
    const fark = kare169(f + 1) - kare169(f);
    const p = ESLEME_916.find((x) => f + 1 === kare(x.bas916));
    if (p) {
      // parça sınırı: önceki parçanın sonundan yeni parçanın başına (sıçrama ya da bitişik)
      const onceki = ESLEME_916[ESLEME_916.indexOf(p) - 1];
      assert.equal(kare169(f + 1), kare(p.bas169), `f=${f}`);
      assert.equal(kare169(f), kare(onceki.son169) - onceki.hiz, `f=${f}`);
      assert.ok(fark >= 1, `f=${f}`);
    } else {
      const ic = ESLEME_916.find((x) => f >= kare(x.bas916) && f + 1 < kare(x.son916))!;
      assert.equal(fark, ic.hiz, `f=${f}`);
    }
  }
});

test("vurus916: çeşitli 16:9 vuruşlarının 9:16 karşılığı", () => {
  yakin(vurus916(65)!, 35, "TASLAK damgası");
  yakin(vurus916(66)!, 35.5, "Son söz");
  yakin(vurus916(96)!, 50, "buton");
  yakin(vurus916(93)!, 47, "logo");
  // Kanca etiketleri v5,6,7 → 5, 5.5, 6
  assert.deepEqual([5, 6, 7].map((v) => vurus916(v)), [5, 5.5, 6]);
  // hedef etiketleri v77–79 → 40.5, 41, 41.5
  assert.deepEqual([77, 78, 79].map((v) => vurus916(v)), [40.5, 41, 41.5]);
  yakin(vurus916(9)!, 7);
  yakin(vurus916(26)!, 16);
  yakin(vurus916(8.5)!, 6.75);
});

test("vurus916: atlanan vuruş null; sınırlar yarı açık", () => {
  assert.equal(vurus916(38), null);
  assert.equal(vurus916(37), null);
  assert.notEqual(vurus916(36.999), null);
  assert.equal(vurus916(40.999), null);
  yakin(vurus916(41)!, 24);
  assert.equal(vurus916(97), null);
  assert.equal(vurus916(101), null);
  assert.equal(vurus916(0.5), null);
  yakin(vurus916(1)!, 1);
});

test("vurus916 ile kare169 birbirinin tersi (tüm 9:16 kareleri)", () => {
  for (let f = 0; f < 900; f++) {
    const v = vurus916(vurusOf(kare169(f)));
    assert.notEqual(v, null, `f=${f}`);
    yakin(v!, vurusOf(f), `f=${f}`);
  }
});

test("ATLANAN_169: sıçramalar (ve film sonu) listelenir", () => {
  assert.deepEqual(ATLANAN_169, [
    { bas: 37, son: 41 }, // A: Studio kartı açılışı
    { bas: 46, son: 53 }, // B: Atölye dönüşü
    { bas: 56, son: 61 }, // C: Atölye kartı
    { bas: 69, son: 73 }, // D: Çocuk dönüşü
    { bas: 82, son: 85 }, // E: halkalar
    { bas: 97, son: 101 }, // film sonu
  ]);
});

test("ATLANAN_169 vurus916'nın null bölgesinin tamamlayıcısı", () => {
  for (let v = 0.5; v < 102; v += 0.5) {
    const iceride = ATLANAN_169.some((a) => v >= a.bas && v < a.son);
    const f = vurus916(v);
    if (v < 1 || v >= SON_169) {
      assert.equal(f, null, `v=${v}`);
    } else {
      assert.equal(f === null, iceride, `v=${v}`);
      assert.equal(atlandi169(v), iceride, `v=${v}`);
    }
  }
});

// ————— Efekt izi —————

test("sesler916: çekirdek eşlemeler", () => {
  const cikti = sesler916(SESLER_169);
  const bul = (tur: string, vurus169: number) => SESLER_169.find((s) => s.tur === tur && s.vurus === vurus169)!;
  const map = (tur: string, vurus169: number) => sesler916([bul(tur, vurus169)]);
  // Dönüş: donus sesi 25 → 15
  assert.equal(map("donus", 25)[0].vurus, 15);
  assert.equal(map("tok", 3)[0].vurus, 3);
  assert.equal(map("sayfa", 61)[0].vurus, 32);
  assert.equal(map("tok", 65)[0].vurus, 35);
  assert.ok(cikti.some((s) => s.tur === "donus" && s.vurus === 15));
  assert.ok(cikti.some((s) => s.tur === "tok" && s.vurus === 3));
  assert.ok(cikti.some((s) => s.tur === "sayfa" && s.vurus === 32));
  assert.ok(cikti.some((s) => s.tur === "tok" && s.vurus === 35));
});

test("sesler916: v72'ye kadar olayların tam sayısı ve sırası", () => {
  // 29 = Kanca 5 + Yük 14 + Dönüş 5 + Studio (donus 33, sayfa 41) 2 + Atölye (donus 53, sayfa 61, tok 65) 3
  assert.equal(sesler916(SESLER_169.filter((s) => s.vurus <= 72)).length, 29);
});

test("sesler916: atlanan ve gizli vuruşların sesleri düşer", () => {
  for (const v of [44, 45, 57, 58, 59, 67, 68, 48, 50, 37, 38, 39]) {
    const o = SESLER_169.filter((s) => s.vurus === v);
    assert.ok(o.length > 0, `test verisi: v${v} olayı yok`);
    assert.deepEqual(sesler916(o), [], `v${v} sesi 9:16'da kalmış`);
  }
  // Toplu çıktıda da bu vuruşların 9:16 karşılıklarında ses yok
  const cikti = sesler916(SESLER_169);
  for (const v of [44, 45, 67, 68]) {
    const hedef = vurus916(v)!;
    assert.ok(!cikti.some((s) => s.tur === "tik" && Math.abs(s.vurus - hedef) < 1e-9), `v${v} → ${hedef}`);
  }
});

test("GIZLI_SES_169: kart etiketi tıkları", () => {
  assert.deepEqual([...GIZLI_SES_169], [44, 45, 67, 68]);
  // Gizli vuruşlar kalan parçaların içinde: yani vurus916 null döndürmez, ses yalnız gizlendiği için düşer.
  for (const v of GIZLI_SES_169) assert.notEqual(vurus916(v), null, `v${v}`);
});

test("sesler916: her çıktı 9:16 filminin içinde ve sıralı", () => {
  const cikti = sesler916(SESLER_169);
  assert.ok(cikti.length > 0);
  let onceki = 0;
  for (const s of cikti) {
    assert.ok(s.vurus >= 1 && s.vurus < 51, `${s.tur} ${s.vurus}`);
    assert.ok(s.vurus >= onceki, `sıra ${s.vurus}`);
    onceki = s.vurus;
  }
  // çıktı kaynaktan fazla olay içermez
  assert.ok(cikti.length <= SESLER_169.length);
});

test("sesler916: 2× parçada vurusSure yarıya iner, 1× parçada değişmez; perde korunur", () => {
  const girdi: SesOlayi[] = [
    { vurus: 10, tur: "whoosh", vurusSure: 2 }, // Yük: 2×
    { vurus: 1, tur: "whoosh", vurusSure: 2 }, // Kanca: 1×
    { vurus: 30, tur: "tik", perde: 1.13 }, // künye/çipler: v29–33, 2× → 19.5
    { vurus: 25, tur: "donus", vurusSure: 2 }, // Dönüş: 1×
  ];
  const c = sesler916(girdi);
  const of = (tur: string, vurus916Sn: number) => c.find((s) => s.tur === tur && Math.abs(s.vurus - vurus916Sn) < 1e-9)!;
  assert.equal(of("whoosh", 7.5).vurusSure, 1);
  assert.equal(of("whoosh", 1).vurusSure, 2);
  assert.equal(of("donus", 15).vurusSure, 2);
  assert.equal(of("tik", 19.5).perde, 1.13);
  assert.equal(of("tik", 19.5).vurusSure, undefined);
  // sıralı: 1, 7.5, 15, 19.5
  assert.deepEqual(c.map((s) => s.vurus), [1, 7.5, 15, 19.5]);
});

test("sesler916: girdi değişmez ve sırasız girdi sıralanır", () => {
  const girdi: SesOlayi[] = [
    { vurus: 26, tur: "tik" },
    { vurus: 3, tur: "tok" },
  ];
  const kopya = structuredClone(girdi);
  const c = sesler916(girdi);
  assert.deepEqual(girdi, kopya);
  assert.deepEqual(c.map((s) => s.vurus), [3, 16]);
});
