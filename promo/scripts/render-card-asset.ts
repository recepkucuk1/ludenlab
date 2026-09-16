import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const PROMO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HUB = resolve(PROMO, "../apps/hub");
const HUB_PUBLIC = resolve(HUB, "public");
const OUT_DIR = resolve(PROMO, "out/assets");

type Asset = { entry: string; exportName: string; png: string };
const ASSETS: Record<string, Asset> = {
  r2: { entry: "r2-card-entry.tsx", exportName: "renderCardPdf", png: "public/real/r2-kart" },
  r3: { entry: "r3-worksheet-entry.tsx", exportName: "renderWorksheetPdf", png: "public/real/r3-kagit" },
  r4: { entry: "r4-story-entry.tsx", exportName: "renderStoryPdf", png: "public/real/r4-hikaye" },
};

const id = process.argv[2] ?? "";
const asset = ASSETS[id];
if (!asset) {
  console.error(`Kullanım: node scripts/render-card-asset.ts <${Object.keys(ASSETS).join("|")}>`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
const bundle = resolve(OUT_DIR, `${id}.mjs`);
const pdf = resolve(OUT_DIR, `${id}.pdf`);

await build({
  entryPoints: [resolve(PROMO, "scripts/assets", asset.entry)],
  bundle: true,
  platform: "node",
  format: "esm",
  jsx: "automatic",
  alias: { "@studio": resolve(HUB, "src/modules/studio") },
  // Hub dosyaları kendi node_modules'ünü (worktree'de yok) değil promo'nunkini kullansın.
  nodePaths: [resolve(PROMO, "node_modules")],
  external: ["@react-pdf/renderer", "react"],
  outfile: bundle,
  logLevel: "warning",
});

// CardPDFDocument font yolunu window.location.origin + "/fonts" ile kurar:
// Node'da hub'ın public/ klasörüne işaret ettiriyoruz → NotoSans yerel dosyadan yüklenir.
(globalThis as { window?: unknown }).window = { location: { origin: HUB_PUBLIC } };
const mod = (await import(pathToFileURL(bundle).href)) as Record<
  string,
  (out: string, promoRoot: string, hubPublic: string) => Promise<void>
>;
await mod[asset.exportName](pdf, PROMO, HUB_PUBLIC);

// İlk sayfa, 200 dpi PNG (A4 → 1654×2339)
execFileSync("pdftoppm", ["-png", "-r", "200", "-f", "1", "-l", "1", "-singlefile", pdf, resolve(PROMO, asset.png)], {
  stdio: "inherit",
});
console.log(`✓ ${asset.png}.png`);
