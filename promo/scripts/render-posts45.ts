import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const FULL = process.argv.includes("--full");
const STORY = FULL || process.argv.includes("--story");
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const PREFIX = FULL ? "StoryFull916" : STORY ? "Story916" : "Post45";
const DIR = FULL ? "out/stories916-tam" : STORY ? "out/stories916" : "out/posts45";
const IDS = ["1-Lansman", "2-OgrenmeKarti", "3-Artikulasyon", "4-SosyalHikaye", "5-AtolyeSeans", "6-Kapanis", "7-StudioAraclar", "8-IletisimPanosu", "9-Sesletim", "10-Eslestirme", "11-EvOdevi", "12-OturumOzeti", "13-AtolyeAraclar", "14-Bep", "15-Davranis", "16-Okuma", "17-Matematik", "18-VeliMektubu"];
mkdirSync(DIR, { recursive: true });
for (const id of IDS.filter((i) => ONLY.length === 0 || ONLY.some((o) => i.startsWith(`${o}-`)))) {
  execFileSync("npx", ["remotion", "still", "src/index.ts", `${PREFIX}-${id}`, `${DIR}/${id.toLowerCase()}.png`], { stdio: "inherit" });
}
