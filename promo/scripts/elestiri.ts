import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

/**
 * Render'ı göstermeden önce denetler (spec "Doğrulama"): kontak föyü, 360 px telefon föyü, donuk anlar, ses.
 *   npm run elestiri -- out/marka/acilis-169.mp4 [cikti-klasoru]
 * Donukluk: 0,5 sn'yi aşan, −50 dB altında değişen anlar (sahne hiç durmaz).
 * Ses: EBU R128 bütünleşik yükseklik, gerçek tepe ve ani ses anları (efektler vuruşta mı?).
 * Not: MP4'te AAC sesi ~45 ms geciktirir; ses anları buna göre okunur.
 */
const [video, klasorArg] = process.argv.slice(2);
if (!video) {
  console.error("Kullanım: npm run elestiri -- <video.mp4> [cikti-klasoru]");
  process.exit(1);
}
const klasor = klasorArg ?? join("out", "elestiri", basename(video, ".mp4"));
mkdirSync(klasor, { recursive: true });

const ff = (args: string[]) => spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: "utf8", maxBuffer: 1 << 28 });
const sure = Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video], { encoding: "utf8" }).stdout);
if (!Number.isFinite(sure) || sure <= 0) throw new Error(`Süre okunamadı: ${video}`);
const saniye = Math.ceil(sure);

ff(["-y", "-v", "error", "-i", video, "-vf", `fps=4,scale=320:-1,tile=5x${Math.ceil((saniye * 4) / 5)}:padding=4:color=0x333333`, "-frames:v", "1", join(klasor, "kontak.png")]);
ff(["-y", "-v", "error", "-i", video, "-vf", `fps=1,scale=360:-1,tile=3x${Math.ceil(saniye / 3)}:padding=6:color=0x333333`, "-frames:v", "1", join(klasor, "telefon.png")]);

const donuk = [...ff(["-i", video, "-vf", "freezedetect=n=-50dB:d=0.5", "-map", "0:v:0", "-f", "null", "-"]).stderr.matchAll(/freeze_start: ([\d.]+)[\s\S]*?freeze_duration: ([\d.]+)/g)].map((m) => ({
  bas: Number(m[1]),
  sure: Number(m[2]),
}));

const olcum = ff(["-i", video, "-map", "0:a", "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr;
const lufs = /Integrated loudness:\s+I:\s+(-?[\d.]+) LUFS/.exec(olcum)?.[1] ?? "?";
const tepe = /True peak:\s+Peak:\s+(-?[\d.]+) dBFS/.exec(olcum)?.[1] ?? "?";

const pcm = spawnSync("ffmpeg", ["-v", "error", "-i", video, "-vn", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], { maxBuffer: 1 << 28 }).stdout as Buffer;
const PENCERE = 160; // 10 ms
const db: number[] = [];
for (let i = 0; i + PENCERE <= pcm.length / 2; i += PENCERE) {
  let s = 0;
  for (let j = 0; j < PENCERE; j++) {
    const x = pcm.readInt16LE((i + j) * 2) / 32768;
    s += x * x;
  }
  db.push(10 * Math.log10(s / PENCERE + 1e-12));
}
const anlar: number[] = [];
for (let i = 3; i < db.length; i++) {
  const once = Math.max(db[i - 3], db[i - 2], db[i - 1]);
  if (db[i] - once >= 6 && db[i] > -35 && (!anlar.length || i * 0.01 - anlar[anlar.length - 1] > 0.2)) anlar.push(Number((i * 0.01).toFixed(2)));
}

const rapor = [
  `video: ${video} (${sure.toFixed(2)} sn)`,
  `donuk anlar (≥0,5 sn): ${donuk.length ? donuk.map((d) => `${d.bas.toFixed(1)}s+${d.sure.toFixed(1)}`).join(", ") : "yok"}`,
  `ses: ${lufs} LUFS, gerçek tepe ${tepe} dBFS`,
  `ani ses anları (sn): ${anlar.join(" ") || "yok"}`,
  `föyler: ${join(klasor, "kontak.png")}, ${join(klasor, "telefon.png")}`,
].join("\n");
writeFileSync(join(klasor, "rapor.txt"), rapor + "\n");
console.log(rapor);
