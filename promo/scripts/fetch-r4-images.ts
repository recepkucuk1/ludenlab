import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { r4Story } from "../src/reels/r4-sosyal-hikaye/story.ts";

const PUBLIC = resolve(dirname(fileURLToPath(import.meta.url)), "../public");
mkdirSync(resolve(PUBLIC, "real/r4"), { recursive: true });

for (const { file, sourceUrl } of r4Story.sentences) {
  const out = resolve(PUBLIC, file);
  // Yalnız herkese açık önbellek dosyasını okur; DB'ye/Storage'a yazma yok.
  execFileSync("curl", ["-sf", "-o", out, sourceUrl]);
  execFileSync("sips", ["-Z", "640", out], { stdio: "ignore" });
  console.log(`✓ public/${file}`);
}
