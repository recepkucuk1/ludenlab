import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const ONLY = process.argv.slice(2);
const IDS = ["1-Lansman", "2-OgrenmeKarti", "3-Artikulasyon", "4-SosyalHikaye", "5-AtolyeSeans", "6-Kapanis", "7-StudioAraclar", "8-IletisimPanosu", "9-Sesletim", "10-Eslestirme", "11-EvOdevi", "12-OturumOzeti", "13-AtolyeAraclar", "14-Bep", "15-Davranis", "16-Okuma", "17-Matematik", "18-VeliMektubu"];
mkdirSync("out/posts45", { recursive: true });
for (const id of IDS.filter((i) => ONLY.length === 0 || ONLY.some((o) => i.startsWith(`${o}-`)))) {
  execFileSync("npx", ["remotion", "still", "src/index.ts", `Post45-${id}`, `out/posts45/${id.toLowerCase()}.png`], { stdio: "inherit" });
}
