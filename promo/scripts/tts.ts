import { existsSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { REELS } from "./reels.ts";
import { voPath } from "../src/reels-lib/timeline.ts";
import { voiceFor } from "../src/reels-lib/voices.ts";
import { falKey, falTts } from "./lib/fal.ts";

/**
 * Seslendirmeleri ElevenLabs v3 ile (fal) üretir → public/vo/<reel>-<sahne>.mp3.
 * Var olan dosyayı yeniden üretmez (ücret); yeniden üretmek için --force.
 * Kullanım: npm run tts -- r1 r2 | npm run tts -- all [--force]
 * Anahtar: FAL_KEY ortam değişkeni ya da apps/hub/.env içindeki FAL_KEY.
 */
const PROMO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const force = args.includes("--force");
const ids = args.filter((a) => a !== "--force");
const selected = ids.includes("all") ? REELS : REELS.filter((r) => ids.includes(r.script.id));
if (selected.length === 0) {
  console.error(`Kullanım: npm run tts -- <${REELS.map((r) => r.script.id).join("|")}|all> [--force]`);
  process.exit(1);
}

const key = falKey(PROMO);
for (const { script } of selected) {
  for (const scene of script.scenes) {
    const out = resolve(PROMO, "public", voPath(script.id, scene.id));
    if (existsSync(out) && !force) {
      console.log(`· ${script.id}-${scene.id} var, atlandı`);
      continue;
    }
    const voice = voiceFor(script, scene);
    try {
      writeFileSync(out, await falTts(key, scene.vo, voice));
    } catch (e) {
      throw new Error(`${script.id}-${scene.id}: ${(e as Error).message}`);
    }
    console.log(`✓ ${script.id}-${scene.id} (${voice}): ${scene.vo}`);
  }
}
