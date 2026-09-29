import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { KAPAK_916_KARE, KAPAK_KARE } from "../src/marka/kapak.ts";
import { sesSeviyesi } from "./lib/sesSeviye.ts";

/**
 * Marka filmi nihai çıktıları:
 *   npm run marka:render -- [169|916|kapak|hepsi]      (varsayılan hepsi)
 * Bir biçim için önce efekt ve müzik izleri üretilir (ücretsiz, yerel; TTS ÇALIŞMAZ, seslendirme mp3'leri hazır durur),
 * her sürüm out/marka/.ham/'a basılır, sesi −16 LUFS'a getirilip out/marka/'ya yazılır. `kapak`, iki kapağı (16:9, 9:16) PNG basar.
 */
const PROMO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CIKTI = resolve(PROMO, "out/marka");
const HAM = resolve(CIKTI, ".ham");
const HEDEF_LUFS = -16;
const ZAMAN_ASIMI_MS = 120_000;

type Surum = { kompozisyon: string; dosya: string };
type Bicim = { ad: string; hazirlik: string[]; surumler: Surum[] };

const BICIMLER: Record<"169" | "916", Bicim> = {
  "169": {
    ad: "16:9",
    hazirlik: ["scripts/marka-sfx.ts", "scripts/marka-muzik.ts"],
    surumler: [
      { kompozisyon: "MarkaFilmi169", dosya: "ludenlab-marka-169" },
      { kompozisyon: "MarkaFilmi169Vo", dosya: "ludenlab-marka-169-vo" },
    ],
  },
  "916": {
    ad: "9:16",
    hazirlik: ["scripts/marka-sfx.ts", "scripts/marka-muzik.ts"],
    surumler: [
      { kompozisyon: "MarkaFilmi916", dosya: "ludenlab-marka-916" },
      { kompozisyon: "MarkaFilmi916Vo", dosya: "ludenlab-marka-916-vo" },
    ],
  },
};
const KAPAKLAR = [
  { kompozisyon: "MarkaFilmi169", dosya: "ludenlab-marka-kapak.png", kare: KAPAK_KARE },
  { kompozisyon: "MarkaFilmi916", dosya: "ludenlab-marka-916-kapak.png", kare: KAPAK_916_KARE },
];

const KULLANIM = "kullanım: npm run marka:render -- [169|916|kapak|hepsi]";
const arg = process.argv[2] ?? "hepsi";
if (process.argv.length > 3 || !["169", "916", "kapak", "hepsi"].includes(arg)) {
  console.error(`marka-render: ${KULLANIM}`);
  process.exit(1);
}

const dur = (mesaj: string): never => {
  console.error(`marka-render: ${mesaj}`);
  process.exit(1);
};
/** Alt süreci PROMO'da çalıştırır, çıktısını olduğu gibi gösterir; hata verirse betik durur. */
const calistir = (komut: string, args: string[]) => {
  const r = spawnSync(komut, args, { cwd: PROMO, stdio: "inherit" });
  if (r.error) dur(`${komut} çalıştırılamadı: ${r.error.message}`);
  if (r.status !== 0) dur(`${komut} ${args.slice(0, 3).join(" ")} çıkış kodu ${r.status}`);
};
const remotion = (args: string[]) => calistir(resolve(PROMO, "node_modules/.bin/remotion"), args);
const sn = (t0: number) => `${((Date.now() - t0) / 1000).toFixed(0)} sn`;

function bicimBas(anahtar: "169" | "916") {
  const b = BICIMLER[anahtar];
  console.log(`— ${b.ad} —`);
  for (const betik of b.hazirlik) calistir(process.execPath, [betik]);
  for (const s of b.surumler) {
    const ham = resolve(HAM, `${s.dosya}.mp4`);
    const cikti = resolve(CIKTI, `${s.dosya}.mp4`);
    const t0 = Date.now();
    remotion(["render", "src/index.ts", s.kompozisyon, ham, `--timeout=${ZAMAN_ASIMI_MS}`]);
    const tBasim = sn(t0);
    const r = sesSeviyesi(ham, cikti, HEDEF_LUFS);
    console.log(
      `${s.dosya}: basım ${tBasim}, toplam ${sn(t0)} · ses ${r.once.I} LUFS (tepe ${r.once.tepe} dBFS) → ${r.sonra.I} LUFS (gerçek tepe ${r.sonra.tepe} dBFS), ` +
        `kazanç ${r.kazancDb.toFixed(1)} dB, limit ${r.limit.toFixed(3)}, ${r.deneme} kodlama${r.hedefte ? "" : " (hedefe ulaşılamadı)"}\n  → ${cikti}`,
    );
  }
}

function kapakBas() {
  for (const k of KAPAKLAR) {
    const cikti = resolve(CIKTI, k.dosya);
    remotion(["still", "src/index.ts", k.kompozisyon, cikti, `--frame=${k.kare}`, `--timeout=${ZAMAN_ASIMI_MS}`]);
    console.log(`kapak ${k.kompozisyon} (kare ${k.kare}) → ${cikti}`);
  }
}

mkdirSync(HAM, { recursive: true });
const t0 = Date.now();
if (arg === "169" || arg === "hepsi") bicimBas("169");
if (arg === "916" || arg === "hepsi") bicimBas("916");
if (arg === "kapak" || arg === "hepsi") kapakBas();
console.log(`bitti (${sn(t0)})`);
