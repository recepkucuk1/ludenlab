import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { R3_WORDS } from "../src/reels/r3-artikulasyon/words.ts";

const PUBLIC = resolve(dirname(fileURLToPath(import.meta.url)), "../public");
mkdirSync(resolve(PUBLIC, "real/r3"), { recursive: true });

for (const { word, file, sourceUrl } of R3_WORDS) {
  const out = resolve(PUBLIC, file);
  // Yalnız herkese açık önbellek dosyasını okur; DB'ye/Storage'a yazma yok.
  execFileSync("curl", ["-sf", "-o", out, sourceUrl]);
  // 1024 → 512 px: reels'te kart görseli ~300 px, repo'yu şişirmesin.
  execFileSync("sips", ["-Z", "512", out], { stdio: "ignore" });
  console.log(`✓ ${word} → public/${file}`);
}
