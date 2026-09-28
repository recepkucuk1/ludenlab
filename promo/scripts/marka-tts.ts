import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Voice } from "../src/reels-lib/types.ts";
import { METIN } from "../src/marka/metin.ts";
import type { BolumId } from "../src/marka/zaman.ts";
import { falKey, falTts } from "./lib/fal.ts";

/**
 * Marka filmi seslendirmesi (ElevenLabs v3, fal).
 *   npm run marka:tts -- deneme [--force]
 *     → public/marka/vo-deneme/<ses>-<bölüm>.mp3: Kanca ve Yük satırları, Chris ve Matilda (anlatıcı seçimi, onay kapısı 1).
 * Var olan dosyayı yeniden üretmez (ücret); yeniden üretmek için --force.
 */
const PROMO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DENEME_SESLER: Voice[] = ["Chris", "Matilda"];
const DENEME_BOLUMLER: BolumId[] = ["kanca", "yuk"];

const args = process.argv.slice(2);
if (args[0] !== "deneme") {
  console.error("Kullanım: npm run marka:tts -- deneme [--force]");
  process.exit(1);
}
const force = args.includes("--force");

const key = falKey(PROMO);
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
