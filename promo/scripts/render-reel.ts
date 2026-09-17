import { execFileSync } from "node:child_process";
import { REELS } from "./reels.ts";

const args = process.argv.slice(2);
const ids = args[0] === "all" ? REELS.map((r) => r.script.id) : args;
const unknown = ids.filter((id) => !REELS.some((r) => r.script.id === id));

if (ids.length === 0 || unknown.length > 0) {
  const known = REELS.map((r) => r.script.id).join("|");
  console.error(`Kullanım: npm run reel -- <${known}> | npm run reels${unknown.length ? `\nBilinmeyen: ${unknown.join(", ")}` : ""}`);
  process.exit(1);
}

const render = (compositionId: string, out: string, extra: string[] = []) =>
  execFileSync("npx", ["remotion", "render", "src/index.ts", compositionId, out, ...extra], { stdio: "inherit" });

for (const id of ids) {
  const { script, compositionId } = REELS.find((r) => r.script.id === id)!;
  render(compositionId, `out/reels/${script.slug}-vo.mp4`);
  render(compositionId, `out/reels/${script.slug}.mp4`, ["--muted"]);
}
