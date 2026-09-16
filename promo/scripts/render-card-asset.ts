import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const PROMO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HUB = resolve(PROMO, "../apps/hub");
const OUT_DIR = resolve(PROMO, "out/assets");
const BUNDLE = resolve(OUT_DIR, "r2-card.mjs");
const PDF = resolve(OUT_DIR, "r2-kart.pdf");
const PNG_BASE = resolve(PROMO, "public/real/r2-kart");

mkdirSync(OUT_DIR, { recursive: true });

await build({
  entryPoints: [resolve(PROMO, "scripts/assets/r2-card-entry.tsx")],
  bundle: true,
  platform: "node",
  format: "esm",
  jsx: "automatic",
  alias: { "@studio": resolve(HUB, "src/modules/studio") },
  // Hub dosyaları kendi node_modules'ünü (worktree'de yok) değil promo'nunkini kullansın.
  nodePaths: [resolve(PROMO, "node_modules")],
  external: ["@react-pdf/renderer", "react"],
  outfile: BUNDLE,
  logLevel: "warning",
});

// CardPDFDocument font yolunu window.location.origin + "/fonts" ile kurar:
// Node'da hub'ın public/ klasörüne işaret ettiriyoruz → NotoSans yerel dosyadan yüklenir.
(globalThis as { window?: unknown }).window = { location: { origin: resolve(HUB, "public") } };
const { renderCardPdf } = (await import(pathToFileURL(BUNDLE).href)) as {
  renderCardPdf: (out: string) => Promise<void>;
};
await renderCardPdf(PDF);

// İlk sayfa, 200 dpi PNG (A4 → 1654×2339)
execFileSync("pdftoppm", ["-png", "-r", "200", "-f", "1", "-l", "1", "-singlefile", PDF, PNG_BASE], {
  stdio: "inherit",
});
console.log(`✓ ${PNG_BASE}.png`);
