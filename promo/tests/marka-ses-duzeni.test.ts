import { test } from "node:test";
import assert from "node:assert/strict";
import { VO_IPUCLARI, voSuresi } from "../src/marka/seslendirme.ts";
import { FPS, kare, toplamKare, BOLUMLER_169 } from "../src/marka/zaman.ts";
import {
  DUCK_CARPAN,
  DUCK_CIKIS_KARE,
  DUCK_INIS_KARE,
  DUCK_ON_KARE,
  MUZIK_TABAN,
  MUZIK_TABAN_VOSUZ,
  VO_PARCALARI,
  muzikSeviyesi,
  voParcalari,
  type VoParcasi,
} from "../src/marka/sesDuzeni.ts";
import { KAPAK_KARE } from "../src/marka/kapak.ts";

const yaklasik = (a: number, b: number, mesaj?: string) => assert.ok(Math.abs(a - b) < 1e-9, `${mesaj ?? ""} ${a} ≠ ${b}`);
const TAM_DUCK = MUZIK_TABAN * DUCK_CARPAN;

test("VO parçaları: her ipucu bir parça; başlangıç = vuruş karesi, süre = ölçülmüş süre yukarı yuvarlı", () => {
  const p = voParcalari();
  assert.equal(p.length, VO_IPUCLARI.length);
  VO_IPUCLARI.forEach((ip, i) => {
    assert.equal(p[i].id, ip.id);
    assert.equal(p[i].from, kare(ip.vurus169));
    assert.equal(p[i].sure, Math.ceil(voSuresi(ip) * FPS));
  });
  // kanca-1: v2 = 18. kare, 2,116 sn → 64 kare
  assert.deepEqual(p[0], { id: "kanca-1", from: 18, sure: 64 });
  assert.deepEqual(VO_PARCALARI, p);
});

test("VO parçaları film süresi içinde ve birbirine geçmez", () => {
  const toplam = toplamKare(BOLUMLER_169);
  VO_PARCALARI.forEach((p, i) => {
    assert.ok(p.from >= 0 && p.from + p.sure <= toplam, p.id);
    const sonraki = VO_PARCALARI[i + 1];
    if (sonraki) assert.ok(p.from + p.sure <= sonraki.from, `${p.id} → ${sonraki.id}`);
  });
});

test("duck ayarı: −6 dB (×0,501), 6 kare iniş (cümleden 4 kare önce başlar), 10 kare çıkış", () => {
  yaklasik(DUCK_CARPAN, 10 ** (-6 / 20));
  assert.ok(Math.abs(DUCK_CARPAN - 0.501) < 0.001);
  assert.equal(DUCK_ON_KARE, 4);
  assert.equal(DUCK_INIS_KARE, 6);
  assert.equal(DUCK_CIKIS_KARE, 10);
  assert.ok(MUZIK_TABAN > 0 && MUZIK_TABAN <= 1);
});

test("vo kapalıyken müzik hiçbir karede kısılmaz, sabit vo'suz tabanda; vo'suz taban seslendirmeliden yüksek", () => {
  for (let f = 0; f < toplamKare(BOLUMLER_169); f++) assert.equal(muzikSeviyesi(f, false), MUZIK_TABAN_VOSUZ, `kare ${f}`);
  assert.ok(MUZIK_TABAN_VOSUZ > MUZIK_TABAN && MUZIK_TABAN_VOSUZ <= 1);
});

test("vo açıkken cümleler dışında müzik tabanda", () => {
  assert.equal(muzikSeviyesi(0, true), MUZIK_TABAN);
  // kanca-1 kare 18–82 (çıkış 92'ye dek), yuk-1 kare 162'de başlar (iniş 158'den): 120 serbest
  assert.equal(muzikSeviyesi(120, true), MUZIK_TABAN);
  assert.equal(muzikSeviyesi(toplamKare(BOLUMLER_169) - 1, true), MUZIK_TABAN);
});

test("cümle başında duck: iniş cümleden 4 kare önce başlar, 2. kareden sonra tam", () => {
  const { from } = VO_PARCALARI[0];
  assert.equal(muzikSeviyesi(from - DUCK_ON_KARE, true), MUZIK_TABAN, "iniş başlamadan");
  const ortaInis = muzikSeviyesi(from - DUCK_ON_KARE + DUCK_INIS_KARE / 2, true);
  yaklasik(ortaInis, (MUZIK_TABAN + TAM_DUCK) / 2, "iniş ortası");
  yaklasik(muzikSeviyesi(from, true), MUZIK_TABAN + ((TAM_DUCK - MUZIK_TABAN) * DUCK_ON_KARE) / DUCK_INIS_KARE, "cümle karesi");
  yaklasik(muzikSeviyesi(from - DUCK_ON_KARE + DUCK_INIS_KARE, true), TAM_DUCK, "iniş bitti");
});

test("cümle boyunca tam duck; bitişte çıkış 10 karede", () => {
  for (const p of VO_PARCALARI) {
    const orta = p.from + Math.floor(p.sure / 2);
    yaklasik(muzikSeviyesi(orta, true), TAM_DUCK, `${p.id} ortası`);
    yaklasik(muzikSeviyesi(p.from + p.sure, true), TAM_DUCK, `${p.id} bitişi`);
    yaklasik(muzikSeviyesi(p.from + p.sure + DUCK_CIKIS_KARE / 2, true), (MUZIK_TABAN + TAM_DUCK) / 2, `${p.id} çıkış ortası`);
    assert.equal(muzikSeviyesi(p.from + p.sure + DUCK_CIKIS_KARE, true), MUZIK_TABAN, `${p.id} çıkış bitti`);
  }
});

test("müzik hiçbir karede duck tabanının altına inmez, tabanı aşmaz, karelik değişim küçük (tık yok)", () => {
  const enFazlaAdim = ((MUZIK_TABAN - TAM_DUCK) / Math.min(DUCK_INIS_KARE, DUCK_CIKIS_KARE)) * 1.0001;
  let onceki = muzikSeviyesi(0, true);
  for (let f = 1; f < toplamKare(BOLUMLER_169); f++) {
    const v = muzikSeviyesi(f, true);
    assert.ok(v >= TAM_DUCK - 1e-12 && v <= MUZIK_TABAN + 1e-12, `kare ${f}: ${v}`);
    assert.ok(Math.abs(v - onceki) <= enFazlaAdim, `kare ${f}: adım ${Math.abs(v - onceki)}`);
    onceki = v;
  }
});

test("üst üste binen duck pencereleri: her kare tekil duck'ların en küçüğü, tabanın altına inmez", () => {
  const a: VoParcasi = { id: "a", from: 100, sure: 50 };
  const b: VoParcasi = { id: "b", from: 145, sure: 40 }; // a'nın içinde başlar
  const c: VoParcasi = { id: "c", from: 160, sure: 10 }; // b'nin tamamen içinde
  const d: VoParcasi = { id: "d", from: 300, sure: 20 };
  const e: VoParcasi = { id: "e", from: 328, sure: 30 }; // d'nin çıkış rampasında başlar
  const hepsi = [a, b, c, d, e];
  let enKucuk = Infinity;
  for (let f = 80; f < 400; f++) {
    const v = muzikSeviyesi(f, true, hepsi);
    enKucuk = Math.min(enKucuk, v);
    assert.ok(v >= TAM_DUCK - 1e-12 && v <= MUZIK_TABAN + 1e-12, `kare ${f}: ${v}`);
    const tekiller = Math.min(...hepsi.map((p) => muzikSeviyesi(f, true, [p])));
    yaklasik(v, tekiller, `kare ${f}`);
  }
  yaklasik(enKucuk, TAM_DUCK);
  // a ve b birbirini kesintisiz taşır: a'nın inişi bittiği kareden b'nin sonuna dek toparlanma yok
  for (let f = 100 - DUCK_ON_KARE + DUCK_INIS_KARE; f <= 145 + 40; f++) yaklasik(muzikSeviyesi(f, true, hepsi), TAM_DUCK, `kare ${f}`);
  // d'nin çıkışı e'nin inişiyle kesişir: aradaki en yüksek değer tabanın altında kalır
  let ara = 0;
  for (let f = 320; f <= 330; f++) ara = Math.max(ara, muzikSeviyesi(f, true, hepsi));
  assert.ok(ara < MUZIK_TABAN, `${ara}`);
});

test("parçasız film: vo açık olsa da müzik tabanda", () => {
  assert.equal(muzikSeviyesi(300, true, []), MUZIK_TABAN);
});

test("kapak karesi film içinde (varsayılan v84)", () => {
  assert.equal(KAPAK_KARE, kare(84));
  assert.ok(KAPAK_KARE >= 0 && KAPAK_KARE < toplamKare(BOLUMLER_169));
});
