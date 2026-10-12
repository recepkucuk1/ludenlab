// apps/hub/evals/vakaListesi.eval.ts
import path from "node:path";
import { it } from "vitest";
import { REPO_ROOT } from "./lib/core";
import { writeVakaListesi } from "./lib/vakaListesi";

/* docs/superpowers/evals/2026-10-vakalar.md — araç × vaka × amaç tablosu (kullanıcı onayı); `cases.json` dosyalarından ÜRETİLİR.
   node_modules/.bin/vitest run --config vitest.eval.config.ts evals/vakaListesi.eval.ts
   Biçimleme ve toplama evals/lib/vakaListesi.ts'te (öz-testli); burada yalnız gerçek hedefe yazılır. */

const HEDEF = path.join(REPO_ROOT, "docs/superpowers/evals/2026-10-vakalar.md");

it("vaka listesi dokümanını üretir", async () => {
  const { toplam } = await writeVakaListesi(HEDEF);
  process.stderr.write(`${HEDEF} yazıldı (${toplam.arac} araç, ${toplam.vaka} vaka)\n`);
});
