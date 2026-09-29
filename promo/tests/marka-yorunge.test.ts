import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { izd, type V2 } from "../src/marka/izometri.ts";
import { GENEL_KAMERA } from "../src/marka/yerlesim.ts";
import {
  ISARET,
  YORUNGE,
  dikeyEgim,
  elipsDonusumu,
  elipsYaricapi,
  halkaA,
  halkaAElipsi,
  halkaANoktalari,
  halkaBElipsi,
  halkaBNoktalari,
  kosular,
  onde,
} from "../src/marka/yorunge.ts";

const K = { ...GENEL_KAMERA, don: -2 * Math.PI };
const yakin = (a: number, b: number, pay = 1e-6) => Math.abs(a - b) <= pay;

test("A'nın izdüşümü yatay elips: yarı eksenler 1,2247·r·s ve 0,7071·r·s", () => {
  const e = halkaAElipsi(K);
  const [cx, cy] = izd(YORUNGE.merkez, K);
  assert.ok(yakin(e.cx, cx) && yakin(e.cy, cy));
  assert.ok(yakin(e.a, Math.sqrt(1.5) * YORUNGE.r * K.s, 1e-6), `${e.a}`);
  assert.ok(yakin(e.b, Math.SQRT1_2 * YORUNGE.r * K.s, 1e-6), `${e.b}`);
  assert.ok(yakin(Math.sin(e.aci), 0, 1e-9), `${e.aci}`);
});

test("B son eğimde dikey ve işaretin dikey yörüngesiyle aynı kısa/uzun oranında (≈ 80,5°, eksen ≈ 58,7°)", () => {
  assert.ok(yakin((YORUNGE.egim * 180) / Math.PI, 80.48, 0.02), `${(YORUNGE.egim * 180) / Math.PI}`);
  assert.ok(yakin((YORUNGE.eksen * 180) / Math.PI, 58.71, 0.02), `${(YORUNGE.eksen * 180) / Math.PI}`);
  const e = halkaBElipsi(YORUNGE.egim, K);
  assert.ok(yakin(Math.abs(Math.cos(e.aci)), 0, 1e-9), `açı ${(e.aci * 180) / Math.PI}`);
  assert.ok(yakin(e.b / e.a, ISARET.dikey.b / ISARET.dikey.a, 1e-9), `${e.b / e.a}`);
  // Uzun eksen A'nınkine eşit: bir çemberin izdüşümünde uzun eksen hep çaptır.
  assert.ok(yakin(e.a, halkaAElipsi(K).a, 1e-9));
  // Başka bir oran için de: türetme genel.
  const d = dikeyEgim(0.5);
  const n = [Math.sin(d.eksen) * Math.sin(d.egim), -Math.cos(d.eksen) * Math.sin(d.egim), Math.cos(d.egim)];
  assert.ok(yakin(-n[0] - n[1] + 2 * n[2], 0, 1e-12));
  assert.ok(yakin((n[0] + n[1] + n[2]) / Math.sqrt(3), 0.5, 1e-12));
});

test("B'nin noktaları kendi izdüşüm elipsinin üstünde; eğim 0'da A ile çakışır", () => {
  for (const egim of [0, 0.4, YORUNGE.egim]) {
    const e = halkaBElipsi(egim, K);
    for (const p of halkaBNoktalari(egim)) assert.ok(yakin(elipsYaricapi(e, izd(p, K)), 1, 1e-9));
  }
  const a = halkaAElipsi(K);
  for (const p of halkaBNoktalari(0)) assert.ok(yakin(elipsYaricapi(a, izd(p, K)), 1, 1e-9));
});

test("A, sol uçtan (ön/arka sınırı) tabla dönüşü yönünde çizilir: önce önden geçer", () => {
  assert.deepEqual(halkaANoktalari(0), []);
  const ps = halkaANoktalari(0.25);
  assert.equal(ps.length, YORUNGE.parca / 4 + 1);
  const [x0] = izd(ps[0], K);
  assert.ok(x0 < izd(YORUNGE.merkez, K)[0] - 140, "sol uçtan başlamıyor");
  assert.ok(onde(ps[1]) && onde(ps[ps.length - 2]), "ilk çeyrek bloğun önünde değil");
  const tam = halkaANoktalari(1);
  assert.equal(tam.length, YORUNGE.parca + 1);
  assert.ok(tam[0].every((v, i) => yakin(v, tam[tam.length - 1][i], 1e-9)), "tam halka kapanmıyor");
  // Kısmi oran: son nokta tam açıda.
  const k = halkaANoktalari(0.3);
  const son = halkaA(YORUNGE.basAci - 2 * Math.PI * 0.3);
  assert.ok(k[k.length - 1].every((v, i) => yakin(v, son[i], 1e-12)));
});

test("koşular: tam halka bir ön bir arka koşu; sınırlar elipsin uzun ekseninin uçlarında", () => {
  for (const ps of [halkaANoktalari(1), halkaBNoktalari(YORUNGE.egim)]) {
    const k = kosular(ps);
    assert.equal(k.length, 2);
    assert.notEqual(k[0].on, k[1].on);
    assert.equal(k[0].noktalar.length + k[1].noktalar.length, YORUNGE.parca + 2);
  }
  const e = halkaAElipsi(K);
  const sinir = kosular(halkaANoktalari(1)).map((k) => izd(k.noktalar[0], K));
  for (const [x] of sinir) assert.ok(yakin(Math.abs(x - e.cx), e.a, 1), `${x}`);
});

test("elips dönüşümü: u = 0 birim, u = 1'de kaynak elipsin noktaları hedef elipsin üstünde", () => {
  const kaynak = halkaAElipsi(K);
  const hedef = { cx: 1200, cy: 380, a: 108, b: 31, aci: (-13.44 * Math.PI) / 180 };
  const ps: V2[] = halkaANoktalari(1).map((p) => izd(p, K));
  const bir = elipsDonusumu(kaynak, hedef, 0);
  for (const p of ps) assert.ok(bir(p).every((v, i) => yakin(v, p[i], 1e-9)));
  const son = elipsDonusumu(kaynak, hedef, 1);
  for (const p of ps) assert.ok(yakin(elipsYaricapi(hedef, son(p)), 1, 1e-9));
  // Dikey kaynak (±90°) hedefe yarım turdan az dönerek varır.
  const b = halkaBElipsi(YORUNGE.egim, K);
  const orta = elipsDonusumu(b, { ...hedef, aci: (89.33 * Math.PI) / 180 }, 0.5);
  const p = izd(halkaBNoktalari(YORUNGE.egim)[0], K);
  assert.ok(Number.isFinite(orta(p)[0]));
});

// --- İşaret ölçümünün doğrulaması: resmî SVG'deki turuncu işaret yolu (M, c, l, h, v, s, Z) → çokgenler (çift-tek dolgu).
const isaretCokgenleri = (): V2[][] => {
  const svg = readFileSync(new URL("../public/brand/ludenlab-logo.svg", import.meta.url), "utf8");
  const d = /<g fill="#fe703a"><path d="([^"]+)"/.exec(svg)![1];
  const tok = d.match(/[MmLlHhVvCcSsZz]|-?\d*\.?\d+(?:e-?\d+)?/g)!;
  const cokgenler: V2[][] = [];
  let cur: V2[] = [];
  let [x, y, sx, sy] = [0, 0, 0, 0];
  let cmd = "";
  let son: V2 | null = null;
  let i = 0;
  const n = () => Number(tok[i++]);
  const bez = (p0: V2, p1: V2, p2: V2, p3: V2) => {
    for (let k = 1; k <= 16; k++) {
      const t = k / 16, m = 1 - t;
      cur.push([m ** 3 * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t ** 3 * p3[0], m ** 3 * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t ** 3 * p3[1]]);
    }
  };
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i])) cmd = tok[i++];
    const g = cmd === cmd.toLowerCase();
    switch (cmd.toUpperCase()) {
      case "M": {
        if (cur.length) cokgenler.push(cur);
        [x, y] = [n() + (g ? x : 0), n() + (g ? y : 0)];
        [sx, sy] = [x, y];
        cur = [[x, y]];
        cmd = g ? "l" : "L";
        son = null;
        break;
      }
      case "L":
        [x, y] = [n() + (g ? x : 0), n() + (g ? y : 0)];
        cur.push([x, y]);
        son = null;
        break;
      case "H":
        x = n() + (g ? x : 0);
        cur.push([x, y]);
        son = null;
        break;
      case "V":
        y = n() + (g ? y : 0);
        cur.push([x, y]);
        son = null;
        break;
      case "C": {
        const v = [n(), n(), n(), n(), n(), n()].map((a, j) => a + (g ? (j % 2 ? y : x) : 0));
        bez([x, y], [v[0], v[1]], [v[2], v[3]], [v[4], v[5]]);
        son = [v[2], v[3]];
        [x, y] = [v[4], v[5]];
        break;
      }
      case "S": {
        const v = [n(), n(), n(), n()].map((a, j) => a + (g ? (j % 2 ? y : x) : 0));
        const c1: V2 = son ? [2 * x - son[0], 2 * y - son[1]] : [x, y];
        bez([x, y], c1, [v[0], v[1]], [v[2], v[3]]);
        son = [v[0], v[1]];
        [x, y] = [v[2], v[3]];
        break;
      }
      case "Z":
        [x, y] = [sx, sy];
        if (cur.length) cokgenler.push(cur);
        cur = [];
        son = null;
        cmd = "";
        break;
      default:
        throw new Error(`yol komutu: ${cmd}`);
    }
  }
  if (cur.length) cokgenler.push(cur);
  return cokgenler;
};
const icinde = (cs: V2[][], [px, py]: V2) => {
  let ic = false;
  for (const c of cs)
    for (let a = 0, b = c.length - 1; a < c.length; b = a++) {
      if (c[a][1] > py !== c[b][1] > py && px < ((c[b][0] - c[a][0]) * (py - c[a][1])) / (c[b][1] - c[a][1]) + c[a][0]) ic = !ic;
    }
  return ic;
};

test("ISARET elipsleri resmî işaretin yörüngelerinin orta çizgisinde; kesişim noktası iki yörüngenin arasındaki boşlukta", () => {
  const cs = isaretCokgenleri();
  const svg = readFileSync(new URL("../public/brand/ludenlab-logo.svg", import.meta.url), "utf8");
  assert.ok(svg.includes('viewBox="0 0 611 260"'), "logo viewBox değişmiş: LOGO_VIEWBOX'ı güncelle");
  for (const e of [ISARET.genis, ISARET.dikey]) {
    let ic = 0;
    for (let t = 0; t < 360; t++) {
      const a = (t * Math.PI) / 180;
      const [u, v] = [e.a * Math.cos(a), e.b * Math.sin(a)];
      if (icinde(cs, [e.cx + u * Math.cos(e.aci) - v * Math.sin(e.aci), e.cy + u * Math.sin(e.aci) + v * Math.cos(e.aci)])) ic++;
    }
    assert.ok(ic >= 355, `elipsin ${ic}/360 noktası işaretin içinde`);
  }
  assert.ok(!icinde(cs, ISARET.kesisim), "kesişim noktası işaretin çizgisine düşüyor");
  assert.ok(elipsYaricapi(ISARET.genis, ISARET.kesisim) < 1 && elipsYaricapi(ISARET.dikey, ISARET.kesisim) < 1, "kesişim iki yörüngenin içinde değil");
});
