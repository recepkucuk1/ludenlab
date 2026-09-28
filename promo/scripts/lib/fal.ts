import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Voice } from "../../src/reels-lib/types.ts";

export const FAL_TTS = "https://fal.run/fal-ai/elevenlabs/tts/eleven-v3";

const envDosyasindan = (dosya: string): string | null => {
  if (!existsSync(dosya)) return null;
  const satir = readFileSync(dosya, "utf8").split("\n").find((l) => l.startsWith("FAL_KEY="));
  return satir ? satir.slice("FAL_KEY=".length).replace(/^"|"$/g, "") : null;
};

/**
 * FAL_KEY sırası: ortam değişkeni → <repo>/apps/hub/.env → ana checkout'un apps/hub/.env'i
 * (git worktree'lerinde .env yoktur; ortak .git dizininden ana checkout bulunur).
 */
export function falKey(promoDir: string): string {
  if (process.env.FAL_KEY) return process.env.FAL_KEY;
  const yerel = envDosyasindan(resolve(promoDir, "../apps/hub/.env"));
  if (yerel) return yerel;
  const ortakGit = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: promoDir, encoding: "utf8" }).trim();
  const ana = envDosyasindan(resolve(dirname(ortakGit), "apps/hub/.env"));
  if (ana) return ana;
  throw new Error("FAL_KEY bulunamadı (ortam değişkeni ya da apps/hub/.env)");
}

/** ElevenLabs v3 (fal) ile Türkçe seslendirme; mp3 baytlarını döndürür. */
export async function falTts(key: string, text: string, voice: Voice): Promise<Buffer> {
  const res = await fetch(FAL_TTS, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice, stability: 0.5, language_code: "tr" }),
  });
  if (!res.ok) throw new Error(`fal ${res.status} ${await res.text()}`);
  const { audio } = (await res.json()) as { audio: { url: string } };
  const mp3 = await fetch(audio.url);
  if (!mp3.ok) throw new Error(`indirme ${mp3.status}`);
  return Buffer.from(await mp3.arrayBuffer());
}
