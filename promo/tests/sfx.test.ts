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
  for (const s of SESLER_169.filter((s) => s.tur === "tik")) {
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
