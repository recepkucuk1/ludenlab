import { test } from "node:test";
import assert from "node:assert/strict";
import { durum916 } from "../src/marka/durum916.ts";
import type { FilmDurumu } from "../src/marka/filmDurumu.ts";
import type { V2 } from "../src/marka/izometri.ts";
import { KAPAK_916_KARE } from "../src/marka/kapak.ts";
import { CIP, DAMGA_BOYUT, DUGME, LOGO_VIEWBOX, TUVAL_169 } from "../src/marka/tema.ts";
import { GUVENLI_916, KAPANIS_916, KUNYE_916, metinden916, sahneden916 } from "../src/marka/yerlesim916.ts";
import { BOLUMLER_916, kare, toplamKare } from "../src/marka/zaman.ts";

// 9:16 kesimde Instagram güvenli alanı: kritik yazı x 60–1020, y 200–1600; metin sütunu 1150–1600 bandında.

const KARE = toplamKare(BOLUMLER_916);

type Kutu = { ad: string; x0: number; y0: number; x1: number; y1: number };
/** Çip genişliği tahmini (moduller testiyle aynı; stil karesinde ölçülen genişliklerin ~%5 üstü). */
const cipGenisligi = (metin: string, nokta?: string) => metin.length * CIP.boyut * 0.5 + 2 * CIP.yan + 2 * CIP.kenar + (nokta ? CIP.nokta : 0);
const CIP_YUKSEKLIK = 54;
/** Yazı genişliği tahmini: 16:9 renderında ölçülen en geniş satırların üstünde (Bricolage 800 büyük harf ≤ 0,64 em, Satoshi ≤ 0,51 em). */
const yaziGenisligi = (s: string, boyut: number, font: "baslik" | "govde") => s.length * boyut * (font === "baslik" ? 0.68 : 0.55);
const SATIR = { baslik: 0.95, govde: 1.3 };

/** 9:16 karesindeki kritik yazıların kutuları (çıkış hareketi sayılmaz: yalnız küçültür, bulanıklaştırır). */
const yaziKutulari = (d: FilmDurumu): { sahne: Kutu[]; sutun: Kutu[]; kart: Kutu[] } => {
  const sahneNoktasi = ([x, y]: V2): V2 => sahneden916([d.odak[0] + (x - d.odak[0]) * d.itme, d.odak[1] + (y - d.odak[1]) * d.itme + d.sarsinti]);
  const sahneKutusu = (ad: string, x0: number, y0: number, x1: number, y1: number): Kutu => {
    const [a, b] = [sahneNoktasi([x0, y0]), sahneNoktasi([x1, y1])];
    return { ad, x0: a[0], y0: a[1], x1: b[0], y1: b[1] };
  };
  const sutunKutusu = (ad: string, x0: number, y0: number, x1: number, y1: number): Kutu => {
    const [a, b] = [metinden916([x0, y0]), metinden916([x1, y1])];
    return { ad, x0: a[0], y0: a[1], x1: b[0], y1: b[1] };
  };
  const sahne: Kutu[] = [];
  for (const e of d.etiketler.filter((e) => e.gorunum > 0 && e.cikis < 1)) {
    const w = cipGenisligi(e.metin, e.nokta);
    const [x0, x1] = e.hiza === "sol" ? [e.x, e.x + w] : [e.x - w, e.x];
    sahne.push(sahneKutusu(`etiket ${e.id}`, x0, e.y - CIP_YUKSEKLIK / 2, x1, e.y + CIP_YUKSEKLIK / 2));
  }
  if (d.damga && d.damga.opaklik > 0 && d.damga.cikis < 1) {
    const r = (d.damga.aci * Math.PI) / 180;
    const [w, h] = [DAMGA_BOYUT.w * d.damga.olcek, DAMGA_BOYUT.h * d.damga.olcek];
    const [yw, yh] = [(w * Math.abs(Math.cos(r)) + h * Math.abs(Math.sin(r))) / 2, (w * Math.abs(Math.sin(r)) + h * Math.abs(Math.cos(r))) / 2];
    sahne.push(sahneKutusu("damga", d.damga.x - yw, d.damga.y - yh, d.damga.x + yw, d.damga.y + yh));
  }
  const sutun: Kutu[] = [];
  for (const m of d.metinler.filter((m) => Math.max(...m.acilis) > 0 && m.cikis < 1)) {
    let satir = 0;
    let gen = 0;
    for (const s of m.satirlar) {
      const w = yaziGenisligi(s, m.boyut, m.font);
      satir += m.genislik ? Math.ceil(w / m.genislik) : 1;
      gen = Math.max(gen, m.genislik ? Math.min(w, m.genislik) : w);
    }
    sutun.push(sutunKutusu(`metin ${m.id}`, TUVAL_169.sol, m.top, TUVAL_169.sol + gen, m.top + satir * m.boyut * SATIR[m.font]));
  }
  for (const k of d.kilitler.filter((k) => k.gorunum > 0 && k.cikis < 1)) sutun.push(sutunKutusu(`kilit ${k.id}`, TUVAL_169.sol, k.top, TUVAL_169.sol + 162 + yaziGenisligi(k.kelime, 112, "baslik"), k.top + 124 + 7));
  for (const c of d.cipler.filter((c) => c.gorunum > 0 && c.cikis < 1)) sutun.push(sutunKutusu(`cip ${c.id}`, c.x, c.y - CIP_YUKSEKLIK / 2, c.x + cipGenisligi(c.metin, c.nokta), c.y + CIP_YUKSEKLIK / 2));
  const kart: Kutu[] = [];
  // Künye: logo SVG'sinin sol iç boşluğu (20,5/260 × yükseklik) yazı değildir.
  if (d.kunye > 0 && d.kunyeCikis < 1) kart.push({ ad: "künye", x0: KUNYE_916.x + (KUNYE_916.yukseklik * 20.5) / LOGO_VIEWBOX.h, y0: KUNYE_916.y, x1: KUNYE_916.x + (KUNYE_916.yukseklik * LOGO_VIEWBOX.w) / LOGO_VIEWBOX.h, y1: KUNYE_916.y + KUNYE_916.yukseklik });
  const c = d.kapanis;
  if (c) {
    const [mx, my] = KAPANIS_916.merkez;
    const it = (ad: string, x0: number, y0: number, x1: number, y1: number): Kutu => ({ ad, x0: mx + (x0 - mx) * c.itme, y0: my + (y0 - my) * c.itme, x1: mx + (x1 - mx) * c.itme, y1: my + (y1 - my) * c.itme });
    const ortali = (ad: string, w: number, y0: number, y1: number) => it(ad, 540 - w / 2, y0, 540 + w / 2, y1);
    if (c.logo.gorunum > 0) kart.push(it("logo", c.logo.x, c.logo.y, c.logo.x + c.logo.w, c.logo.y + (c.logo.w * LOGO_VIEWBOX.h) / LOGO_VIEWBOX.w));
    if (c.slogan.acilis > 0) KAPANIS_916.slogan.satirlar.forEach((s, i) => kart.push(ortali(`slogan ${i}`, yaziGenisligi(s, 44, "govde"), c.slogan.top + i * 44 * SATIR.govde, c.slogan.top + (i + 1) * 44 * SATIR.govde)));
    const satir = c.cagri.cipler.reduce((t, h) => t + cipGenisligi(h.metin, h.nokta) + 22, 0) + yaziGenisligi(c.cagri.dugme.metin, DUGME.boyut, "govde") + 2 * DUGME.yan + DUGME.golge;
    kart.push(ortali("çağrı satırı", satir, c.cagri.top, c.cagri.top + DUGME.yukseklik + DUGME.golge));
  }
  return { sahne, sutun, kart };
};

const icinde = (k: Kutu, f: number, ust: number = GUVENLI_916.ust) =>
  assert.ok(
    k.x0 >= GUVENLI_916.sol && k.x1 <= GUVENLI_916.sag && k.y0 >= ust && k.y1 <= GUVENLI_916.alt,
    `f=${f} ${k.ad}: x ${k.x0.toFixed(0)}–${k.x1.toFixed(0)}, y ${k.y0.toFixed(0)}–${k.y1.toFixed(0)}`,
  );

test("kritik yazılar 900 karenin hepsinde güvenli alanda (x 60–1020, y 200–1600); metin sütunu 1150–1600 bandında", () => {
  let sayi = 0;
  for (let f = 0; f < KARE; f++) {
    const { sahne, sutun, kart } = yaziKutulari(durum916(f));
    for (const k of [...sahne, ...kart]) icinde(k, f);
    for (const k of sutun) icinde(k, f, 1150 - 1e-9);
    sayi += sahne.length + sutun.length + kart.length;
  }
  assert.ok(sayi > 2000, `${sayi}`); // 2489 kutu (denetim boşa çalışmıyor)
});

test("9:16 kapağı (v42): üç hedef etiketi varmış, Çocuk başlığı tam açık, kart ve yörünge yok", () => {
  assert.equal(KAPAK_916_KARE, kare(42));
  const d = durum916(KAPAK_916_KARE);
  assert.deepEqual(d.etiketler.map((e) => [e.id, e.gorunum, e.ilerleme, e.cikis]), [0, 1, 2].map((i) => [`cocuk-hedef-${i}`, 1, 1, 0]));
  assert.deepEqual(d.metinler.map((m) => [m.id, m.acilis, m.cikis]), [["cocuk-baslik", [1, 1, 1], 0]]);
  assert.deepEqual([d.kartlar.length, d.yorungeler.length, d.kapanis, d.kunye], [0, 0, null, 1]);
});
