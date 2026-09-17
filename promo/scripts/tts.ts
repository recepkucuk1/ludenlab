import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { REELS } from "./reels.ts";
import { voPath } from "../src/reels-lib/timeline.ts";
import { voiceFor } from "../src/reels-lib/voices.ts";

/**
 * Seslendirmeleri ElevenLabs v3 ile (fal) üretir → public/vo/<reel>-<sahne>.mp3.
 * Var olan dosyayı yeniden üretmez (ücret); yeniden üretmek için --force.
 * Kullanım: npm run tts -- r1 r2 | npm run tts -- all [--force]
 * Anahtar: FAL_KEY ortam değişkeni ya da ../apps/hub/.env içindeki FAL_KEY.
 */
const PROMO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENDPOINT = "https://fal.run/fal-ai/elevenlabs/tts/eleven-v3";

function falKey(): string {
  if (process.env.FAL_KEY) return process.env.FAL_KEY;
  const envFile = resolve(PROMO, "../apps/hub/.env");
  if (existsSync(envFile)) {
    const line = readFileSync(envFile, "utf8").split("\n").find((l) => l.startsWith("FAL_KEY="));
    if (line) return line.slice("FAL_KEY=".length).replace(/^"|"$/g, "");
  }
  throw new Error("FAL_KEY bulunamadı (ortam değişkeni ya da apps/hub/.env)");
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const ids = args.filter((a) => a !== "--force");
const selected = ids.includes("all") ? REELS : REELS.filter((r) => ids.includes(r.script.id));
if (selected.length === 0) {
  console.error(`Kullanım: npm run tts -- <${REELS.map((r) => r.script.id).join("|")}|all> [--force]`);
  process.exit(1);
}

const key = falKey();
for (const { script } of selected) {
  for (const scene of script.scenes) {
    const out = resolve(PROMO, "public", voPath(script.id, scene.id));
    if (existsSync(out) && !force) {
      console.log(`· ${script.id}-${scene.id} var, atlandı`);
      continue;
    }
    const voice = voiceFor(script, scene);
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: scene.vo, voice, stability: 0.5, language_code: "tr" }),
    });
    if (!res.ok) throw new Error(`${script.id}-${scene.id}: fal ${res.status} ${await res.text()}`);
    const { audio } = (await res.json()) as { audio: { url: string } };
    const mp3 = await fetch(audio.url);
    if (!mp3.ok) throw new Error(`${script.id}-${scene.id}: indirme ${mp3.status}`);
    writeFileSync(out, Buffer.from(await mp3.arrayBuffer()));
    console.log(`✓ ${script.id}-${scene.id} (${voice}): ${scene.vo}`);
  }
}
