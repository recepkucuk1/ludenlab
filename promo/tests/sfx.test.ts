import { test } from "node:test";
import assert from "node:assert/strict";
import { ORNEKLEME, sesIzi, wavYaz } from "../scripts/lib/sfx.ts";
import { SESLER_169 } from "../src/marka/olaylar.ts";
import { BPM, saniye } from "../src/marka/zaman.ts";

const iz = sesIzi(SESLER_169, BPM);
const rms = (a: number, b: number) => {
  const i0 = Math.max(0, Math.round(a * ORNEKLEME)), i1 = Math.round(b * ORNEKLEME);
  let s = 0;
  for (let i = i0; i < i1; i++) s += iz[i] ** 2;
  return Math.sqrt(s / Math.max(1, i1 - i0));
};

test("iz son olayı ve 2 sn kuyruğu kapsar", () => {
  const son = Math.max(...SESLER_169.map((s) => saniye(s.vurus) + (s.vurusSure ?? 0) * (60 / BPM)));
  assert.ok(Math.abs(iz.length - ORNEKLEME * (son + 2)) <= 1, `${iz.length}`);
});

test("her tık vuruşunda duyulur, öncesi sessiz", () => {
  for (const s of SESLER_169.filter((s) => s.tur === "tik" && s.vurus <= 8)) {
    const t0 = saniye(s.vurus);
    assert.ok(rms(t0, t0 + 0.02) > 10 * rms(t0 - 0.06, t0 - 0.01), `v${s.vurus}`);
  }
});

test("tok inişte güçlü bir darbe (tepesi genel tepenin en az %70'i)", () => {
  const t0 = saniye(SESLER_169.find((s) => s.tur === "tok")!.vurus);
  let tepe = 0, tokTepe = 0;
  iz.forEach((x, i) => {
    tepe = Math.max(tepe, Math.abs(x));
    if (i >= t0 * ORNEKLEME && i < (t0 + 0.05) * ORNEKLEME) tokTepe = Math.max(tokTepe, Math.abs(x));
  });
  assert.ok(tokTepe >= 0.7 * tepe, `${tokTepe} / ${tepe}`);
});

test("aynı girdi aynı iz (tohumlu gürültü)", () => {
  assert.ok(Buffer.from(sesIzi(SESLER_169, BPM).buffer).equals(Buffer.from(iz.buffer)));
});

test("WAV: başlık, iki kanal, tepe 0,8", () => {
  const w = wavYaz(iz);
  assert.equal(w.toString("ascii", 0, 4), "RIFF");
  assert.equal(w.toString("ascii", 8, 12), "WAVE");
  assert.equal(w.readUInt16LE(22), 2);
  assert.equal(w.readUInt32LE(24), ORNEKLEME);
  assert.equal(w.length, 44 + iz.length * 4);
  let tepe = 0;
  for (let i = 44; i < w.length; i += 2) tepe = Math.max(tepe, Math.abs(w.readInt16LE(i)));
  assert.ok(Math.abs(tepe - Math.round(0.8 * 32767)) <= 1, `${tepe}`);
});

test("kâğıt sesleri deste vuruşlarında duyulur", () => {
  for (const s of SESLER_169.filter((s) => s.tur === "kagit")) {
    const t0 = saniye(s.vurus);
    assert.ok(rms(t0, t0 + 0.05) > 4 * rms(t0 - 0.2, t0 - 0.05), `v${s.vurus}`);
  }
});

test("tabla dönüş sesi ortasında en güçlü (yükselip alçalır)", () => {
  const s = SESLER_169.find((s) => s.tur === "donus")!;
  const t0 = saniye(s.vurus), sure = (s.vurusSure ?? 1) * (60 / BPM);
  const orta = rms(t0 + sure * 0.4, t0 + sure * 0.6);
  assert.ok(orta > 3 * rms(t0, t0 + sure * 0.08), "baş");
  assert.ok(orta > 3 * rms(t0 + sure * 0.92, t0 + sure), "son");
});

test("sayfa sesleri kendi vuruşlarında duyulur", () => {
  for (const s of SESLER_169.filter((s) => s.tur === "sayfa")) {
    const t0 = saniye(s.vurus);
    assert.ok(rms(t0 + 0.05, t0 + 0.2) > 4 * rms(t0 - 0.2, t0 - 0.05), `v${s.vurus}`);
  }
});

test("basamak tıklarının perdesi yükselir (sıfır geçişi artar)", () => {
  const gecis = (t0: number) => {
    const i0 = Math.round((t0 + 0.004) * ORNEKLEME), i1 = Math.round((t0 + 0.024) * ORNEKLEME);
    let n = 0;
    for (let i = i0 + 1; i < i1; i++) if (Math.sign(iz[i]) !== Math.sign(iz[i - 1])) n++;
    return n;
  };
  const g = SESLER_169.filter((s) => s.tur === "tik" && (s.perde ?? 1) > 1 || (s.tur === "tik" && s.vurus === 57)).map((s) => gecis(saniye(s.vurus)));
  assert.equal(g.length, 3);
  assert.ok(g[0] < g[1] && g[1] < g[2], `${g}`);
});

// Belirli pencerede sıfır geçişi sayısı (perde karşılaştırması).
const gecisSayisi = (t0: number, a = 0.004, b = 0.024) => {
  const i0 = Math.round((t0 + a) * ORNEKLEME), i1 = Math.round((t0 + b) * ORNEKLEME);
  let n = 0;
  for (let i = i0 + 1; i < i1; i++) if (Math.sign(iz[i]) !== Math.sign(iz[i - 1])) n++;
  return n;
};

test("Çocuk etiket tıkları Kanca tıkından pes (yumuşak tık)", () => {
  const kanca = gecisSayisi(saniye(5));
  for (const s of SESLER_169.filter((s) => s.tur === "tik" && (s.perde ?? 1) < 1)) {
    assert.ok(gecisSayisi(saniye(s.vurus)) < kanca, `v${s.vurus}: ${gecisSayisi(saniye(s.vurus))} ≥ ${kanca}`);
  }
});

test("kapanış whoosh'u yükselir ve v89'da susar", () => {
  const s = SESLER_169.filter((s) => s.tur === "whoosh").at(-1)!;
  const t0 = saniye(s.vurus), t1 = saniye(s.vurus + (s.vurusSure ?? 1));
  assert.ok(rms(t1 - 0.2, t1 - 0.03) > 3 * rms(t0, t0 + 0.3), "yükselmiyor");
  assert.ok(rms(t1 + 0.05, t1 + 0.3) < 0.1 * rms(t1 - 0.2, t1 - 0.03), "doruktan sonra susmuyor");
});

test("çan vuruşunda başlar, öncesi sessiz, bir saniye sonra hâlâ çınlar", () => {
  const t0 = saniye(SESLER_169.find((s) => s.tur === "can")!.vurus);
  const bas = rms(t0 + 0.01, t0 + 0.1);
  assert.ok(bas > 10 * rms(t0 - 0.3, t0 - 0.02), "öncesi sessiz değil");
  const sonra = rms(t0 + 1.0, t0 + 1.1);
  assert.ok(sonra > 0.15 * bas && sonra < bas, `${sonra} / ${bas}`);
});
