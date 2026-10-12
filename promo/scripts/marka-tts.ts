import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Voice } from "../src/reels-lib/types.ts";
import { METIN } from "../src/marka/metin.ts";
import { ANLATICI, VO_KAYITLARI } from "../src/marka/seslendirme.ts";
import type { BolumId } from "../src/marka/zaman.ts";
import { falKey, falTts } from "./lib/fal.ts";

/**
 * Marka filmi seslendirmesi (ElevenLabs v3, fal). Ücretlidir; yalnız bilerek çalıştır.
 *   npm run marka:tts -- deneme [--force]
 *     → public/marka/vo-deneme/<ses>-<bölüm>.mp3: Kanca ve Yük satırları, Chris ve Matilda (anlatıcı seçimi, onay kapısı 1).
 *   npm run marka:tts -- tam [--force]
 *     → public/marka/vo/<ipucu>.mp3 (+ .txt: üretildiği metin), anlatıcı ANLATICI; süreler src/marka/voSureleri.ts'e yazılır.
 *       16:9 ve 9:16 ipuçlarının kimliğe göre tekil birleşimi (VO_KAYITLARI): paylaşılan satırlar tek mp3'tür.
 * Metni değişmemiş dosyayı yeniden üretmez (ücret); yeniden üretmek için --force.
 */
const PROMO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DENEME_SESLER: Voice[] = ["Chris", "Matilda"];
const DENEME_BOLUMLER: BolumId[] = ["kanca", "yuk"];

const [mod, ...args] = process.argv.slice(2);
if (mod !== "deneme" && mod !== "tam") {
  console.error("Kullanım: npm run marka:tts -- deneme|tam [--force]");
  process.exit(1);
}
const force = args.includes("--force");

const mp3Suresi = (dosya: string) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", dosya], { encoding: "utf8" }).trim());

const key = falKey(PROMO);

if (mod === "deneme") {
  for (const ses of DENEME_SESLER) {
    for (const bolum of DENEME_BOLUMLER) {
      const out = resolve(PROMO, "public", `marka/vo-deneme/${ses.toLowerCase()}-${bolum}.mp3`);
      if (existsSync(out) && !force) {
        console.log(`· ${ses}-${bolum} var, atlandı`);
        continue;
      }
      mkdirSync(dirname(out), { recursive: true });
      try {
        writeFileSync(out, await falTts(key, METIN[bolum].vo, ses));
      } catch (e) {
        throw new Error(`${ses}-${bolum}: ${(e as Error).message}`, { cause: e });
      }
      console.log(`✓ ${ses}-${bolum}: ${METIN[bolum].vo}`);
    }
  }
} else {
  const sureler: Record<string, number> = {};
  for (const ip of VO_KAYITLARI) {
    const out = resolve(PROMO, "public", `marka/vo/${ip.id}.mp3`);
    const yan = out.replace(/\.mp3$/, ".txt");
    const guncel = existsSync(out) && existsSync(yan) && readFileSync(yan, "utf8") === ip.metin;
    if (guncel && !force) {
      console.log(`· ${ip.id} güncel, atlandı`);
    } else {
      mkdirSync(dirname(out), { recursive: true });
      try {
        writeFileSync(out, await falTts(key, ip.metin, ANLATICI));
      } catch (e) {
        throw new Error(`${ip.id}: ${(e as Error).message}`, { cause: e });
      }
      writeFileSync(yan, ip.metin);
      console.log(`✓ ${ip.id}: ${ip.metin}`);
    }
    sureler[ip.id] = Math.round(mp3Suresi(out) * 1000) / 1000;
  }
  const satirlar = Object.entries(sureler).map(([id, s]) => `  "${id}": ${s},`);
  writeFileSync(
    resolve(PROMO, "src/marka/voSureleri.ts"),
    [
      "// Üretilmiş dosya: `npm run marka:tts -- tam` mp3 sürelerini (sn) buraya yazar. Elle düzenleme.",
      "export const VO_SURELERI: Partial<Record<string, number>> = {",
      ...satirlar,
      "};",
      "",
    ].join("\n"),
  );
  console.log("src/marka/voSureleri.ts yazıldı");
}
