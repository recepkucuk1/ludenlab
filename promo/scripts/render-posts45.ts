import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const IDS = ["1-Lansman", "2-OgrenmeKarti", "3-Artikulasyon", "4-SosyalHikaye", "5-AtolyeSeans", "6-Kapanis"];
mkdirSync("out/posts45", { recursive: true });
for (const id of IDS) {
  execFileSync("npx", ["remotion", "still", "src/index.ts", `Post45-${id}`, `out/posts45/${id.toLowerCase()}.png`], { stdio: "inherit" });
}
