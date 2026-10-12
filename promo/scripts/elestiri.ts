import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

/**
 * Render'ı göstermeden önce denetler (spec "Doğrulama"): kontak föyü, telefon föyü, donuk anlar, ses.
 *   npm run elestiri -- out/marka/acilis-169.mp4 [cikti-klasoru]
 * Föyler süreye göre ölçeklenir (kontak ≤ 60 kare, telefon ≤ 20 kare; kare hep 4/2/1/0,5 fps'ten biri).
 * Donukluk: 0,5 sn'yi aşan, −50 dB altında değişen anlar (sahne hiç durmaz); videonun sonuna kadar süren donma da yakalanır.
 * Ses: EBU R128 bütünleşik yükseklik, gerçek tepe ve ani ses anları (efektler vuruşta mı?).
 * Not: MP4'te AAC sesi ~45 ms geciktirir; ses anları buna göre okunur.
 * Çıkış kodu: 0 tamam, 1 okunamayan girdi / föy üretilemedi, 2 ses akışı yok (rapor yine yazılır).
 */
const dur = (mesaj: string): never => {
  console.error(`elestiri: ${mesaj}`);
  process.exit(1);
};

const [video, klasorArg] = process.argv.slice(2);
if (!video) dur("kullanım: npm run elestiri -- <video.mp4> [cikti-klasoru]");

// Girdiyi klasör açmadan önce yokla. Süre, konteynerin değil VİDEO akışınındır (ses videodan uzun olabilir).
const probe = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=duration,width,height", "-of", "default=noprint_wrappers=1", video], { encoding: "utf8" });
if (probe.error) dur(`ffprobe çalıştırılamadı (${probe.error.message})`);
const alan = (ad: string) => Number(new RegExp(`^${ad}=(\\S+)`, "m").exec(probe.stdout)?.[1]);
const genislikV = alan("width");
const yukseklikV = alan("height");
let sureV = alan("duration");
if (probe.status !== 0 || !Number.isFinite(genislikV) || !Number.isFinite(yukseklikV)) dur(`video okunamadı: ${video}`);
if (!Number.isFinite(sureV)) {
  // Bazı kaplarda (mkv/webm) akış süresi yazılmaz; konteyner süresine düş.
  sureV = Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video], { encoding: "utf8" }).stdout);
}
if (!Number.isFinite(sureV) || sureV <= 0) dur(`video süresi okunamadı: ${video}`);
const sesVar = spawnSync("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=index", "-of", "csv=p=0", video], { encoding: "utf8" }).stdout.trim() !== "";

const klasor = klasorArg ?? join("out", "elestiri", basename(video, ".mp4"));
try {
  mkdirSync(klasor, { recursive: true });
} catch (e) {
  dur(`çıktı klasörü açılamadı: ${klasor} (${(e as Error).message})`);
}

const ff = (args: string[]) => spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: "utf8", maxBuffer: 1 << 28 });
const foy = (dosya: string, sure: string) => {
  const yol = join(klasor, dosya);
  const r = ff(["-y", "-v", "error", "-i", video, "-vf", sure, "-frames:v", "1", yol]);
  if (r.status !== 0 || !existsSync(yol)) {
    const ozet = (r.error?.message ?? r.stderr ?? "").trim().split("\n").slice(-3).join(" | ");
    dur(`${dosya} üretilemedi (ffmpeg çıkış ${r.status ?? "?"}): ${ozet}`);
  }
};

// Kontak: ≤ 60 kare; 30'dan fazla karede 10 sütun, dar kareler. Satır hep yukarı yuvarlanır.
const kontakFps = [4, 2, 1, 0.5].find((f) => sureV * f <= 60) ?? 0.5;
const kontakKare = Math.ceil(sureV * kontakFps);
const kontakSutun = kontakKare > 30 ? 10 : 5;
const kontakGenislik = kontakSutun === 10 ? 216 : 320;
foy("kontak.png", `fps=${kontakFps},scale=${kontakGenislik}:-1,tile=${kontakSutun}x${Math.ceil(kontakKare / kontakSutun)}:padding=4:color=0x333333`);

// Telefon: 360 px kareler (Reels'in telefondaki boyu), ≤ 20 kare; yatayda 3, dikeyde 5 sütun.
const telefonAdim = Math.max(1, Math.ceil(sureV / 20));
const telefonKare = Math.ceil(sureV / telefonAdim);
const telefonSutun = genislikV >= yukseklikV ? 3 : 5;
foy("telefon.png", `fps=1/${telefonAdim},scale=360:-1,tile=${telefonSutun}x${Math.ceil(telefonKare / telefonSutun)}:padding=6:color=0x333333`);

// Donukluk: her freeze_start'ı kendi freeze_duration'ıyla eşle; süre yoksa donma videonun sonuna kadar sürmüştür.
const donuk: { bas: number; sure?: number }[] = [];
for (const m of ff(["-i", video, "-vf", "freezedetect=n=-50dB:d=0.5", "-map", "0:v:0", "-f", "null", "-"]).stderr.matchAll(/freeze_(start|duration): ([-+\d.eE]+)/g)) {
  if (m[1] === "start") donuk.push({ bas: Number(m[2]) });
  else if (donuk.length && donuk[donuk.length - 1].sure === undefined) donuk[donuk.length - 1].sure = Number(m[2]);
}
const donukYazi = donuk.map((d) => (d.sure === undefined ? `${d.bas.toFixed(1)}s+sona kadar (${(sureV - d.bas).toFixed(1)})` : `${d.bas.toFixed(1)}s+${d.sure.toFixed(1)}`));

const rapor = [`video: ${video} (${sureV.toFixed(2)} sn, ${genislikV}×${yukseklikV})`, `donuk anlar (≥0,5 sn): ${donukYazi.length ? donukYazi.join(", ") : "yok"}`];

if (sesVar) {
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
  rapor.push(`ses: ${lufs} LUFS, gerçek tepe ${tepe} dBFS`, `ani ses anları (sn): ${anlar.join(" ") || "yok"}`);
} else {
  rapor.push("ses: ses akışı yok");
}
rapor.push(`föyler: ${join(klasor, "kontak.png")}, ${join(klasor, "telefon.png")}`);

writeFileSync(join(klasor, "rapor.txt"), rapor.join("\n") + "\n");
console.log(rapor.join("\n"));
// Sesi olmayan bir render, filmin bir kusurudur: raporu yazdıktan sonra 2 ile çık (process.exit değil; stdout boşalsın).
if (!sesVar) process.exitCode = 2;
