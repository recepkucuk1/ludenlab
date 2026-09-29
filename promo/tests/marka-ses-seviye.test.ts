import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LIMIT_ILK, TEPE_UST, TOLERANS_LU, olcumuOku, sonrakiDeneme, sesSeviyesi } from "../scripts/lib/sesSeviye.ts";

const ORNEK = `[Parsed_ebur128_0 @ 0x1234] Summary:

  Integrated loudness:
    I:         -20.2 LUFS
    Threshold: -30.7 LUFS

  Loudness range:
    LRA:         9.9 LU
    Threshold: -40.5 LUFS
    LRA low:   -27.0 LUFS
    LRA high:  -17.1 LUFS

  True peak:
    Peak:       -1.9 dBFS
`;

test("ffmpeg ebur128 özetinden bütünleşik yükseklik ve gerçek tepe okunur", () => {
  assert.deepEqual(olcumuOku(ORNEK), { I: -20.2, tepe: -1.9 });
});

test("ölçüm okunamazsa açık hata", () => {
  assert.throws(() => olcumuOku("Input #0, wav"), /ölçülemedi/);
  assert.throws(() => olcumuOku(ORNEK.replace(/I:\s+-20\.2 LUFS/, "I:  -inf LUFS")), /ölçülemedi/);
});

test("sonraki deneme: hedefte ve tepe sınırın altındaysa biter", () => {
  const d = { kazanc: 4.2, limit: LIMIT_ILK };
  assert.equal(sonrakiDeneme(d, { I: -16.1, tepe: -1.4 }, -16), null);
  assert.equal(sonrakiDeneme(d, { I: -16 + TOLERANS_LU, tepe: TEPE_UST }, -16), null);
});

test("sonraki deneme: tepe sınırı aşıyorsa limit sıkılaşır, kazanç aynı kalır", () => {
  const d = { kazanc: 4.2, limit: 0.84 };
  const s = sonrakiDeneme(d, { I: -16.0, tepe: -0.4 }, -16)!;
  assert.equal(s.kazanc, 4.2);
  // aşım 0,6 dB + 0,1 dB pay: limit 0,7 dB kısılır
  assert.ok(Math.abs(20 * Math.log10(s.limit / 0.84) - -0.7) < 1e-9, `${s.limit}`);
});

test("sonraki deneme: tepe tamam ama sessizse kazanç eksik kadar artar, limit aynı", () => {
  const s = sonrakiDeneme({ kazanc: 4.2, limit: 0.84 }, { I: -17.4, tepe: -1.5 }, -16)!;
  assert.ok(Math.abs(s.kazanc - 5.6) < 1e-9, `${s.kazanc}`);
  assert.equal(s.limit, 0.84);
});

test("sonraki deneme: hedeften yüksekse kazanç düşer", () => {
  const s = sonrakiDeneme({ kazanc: 8, limit: 0.84 }, { I: -15.2, tepe: -1.6 }, -16)!;
  assert.ok(Math.abs(s.kazanc - 7.2) < 1e-9, `${s.kazanc}`);
});

test("tepe aşımı yükseklikten önceliklidir", () => {
  const s = sonrakiDeneme({ kazanc: 4, limit: 0.84 }, { I: -18, tepe: -0.2 }, -16)!;
  assert.equal(s.kazanc, 4);
  assert.ok(s.limit < 0.84);
});

const ffmpegVar = spawnSync("ffmpeg", ["-version"]).status === 0;

test("uçtan uca: sessiz bir mp4 −16 LUFS'a çıkar, gerçek tepe ≤ −1,0 dBFS, görüntü kopyalanır", { skip: !ffmpegVar && "ffmpeg yok" }, () => {
  const klasor = mkdtempSync(join(tmpdir(), "ses-seviye-"));
  try {
    const girdi = join(klasor, "girdi.mp4");
    const cikti = join(klasor, "cikti.mp4");
    // Alçak seviyeli ton + sık, yüksek tepeli tıklar (efekt benzeri): kazanç ve limiter birlikte gerekir.
    const uret = spawnSync("ffmpeg", [
      "-y", "-hide_banner", "-loglevel", "error",
      "-f", "lavfi", "-i", "color=c=black:s=128x72:d=6:r=10",
      "-f", "lavfi", "-i", "sine=f=330:d=6:sample_rate=48000",
      "-f", "lavfi", "-i", "aevalsrc='0.85*lt(mod(t,0.5),0.004)*sin(2*PI*90*t)':d=6:s=48000",
      "-filter_complex", "[1:a]volume=-29dB[a];[2:a][a]amix=inputs=2:normalize=0[m]",
      "-map", "0:v", "-map", "[m]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", girdi,
    ]);
    assert.equal(uret.status, 0, uret.stderr?.toString());
    const s = sesSeviyesi(girdi, cikti, -16);
    assert.ok(s.once.I < -22, `girdi ${s.once.I}`);
    assert.ok(s.sonra.tepe <= TEPE_UST, `tepe ${s.sonra.tepe}`);
    assert.ok(Math.abs(s.sonra.I - -16) <= 0.6, `yükseklik ${s.sonra.I}`);
    const akis = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,codec_type", "-of", "csv=p=0", cikti], { encoding: "utf8" }).stdout;
    assert.match(akis, /h264,video/);
    assert.match(akis, /aac,audio/);
  } finally {
    rmSync(klasor, { recursive: true, force: true });
  }
});
