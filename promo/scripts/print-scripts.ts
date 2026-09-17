import { REELS } from "./reels.ts";
import { voPath } from "../src/reels-lib/timeline.ts";

for (const { script } of REELS) {
  console.log(`\n=== ${script.id} — ${script.title} ===`);
  for (const scene of script.scenes) {
    console.log(`public/${voPath(script.id, scene.id)}\t${scene.vo}`);
  }
}
