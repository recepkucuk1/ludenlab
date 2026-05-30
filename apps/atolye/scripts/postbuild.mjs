// Next `output: standalone`, `static` ve `public`'i standalone bundle'a KOPYALAMAZ.
// Hostinger (ve her Node host) standalone'u kendi-kendine-yeterli çalıştırabilsin diye
// build sonrası bunları standalone içine kopyalıyoruz. Yoksa /_next/static 404 olur.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const appDir = path.resolve(import.meta.dirname, "..");
const standaloneApp = path.join(appDir, ".next", "standalone", "apps", "atolye");

if (!existsSync(path.join(standaloneApp, "server.js"))) {
  console.error("[postbuild] standalone server.js bulunamadı — output:standalone build alındı mı?");
  process.exit(1);
}

// .next/static (zorunlu)
const staticSrc = path.join(appDir, ".next", "static");
const staticDst = path.join(standaloneApp, ".next", "static");
mkdirSync(path.dirname(staticDst), { recursive: true });
cpSync(staticSrc, staticDst, { recursive: true });

// public (varsa)
const publicSrc = path.join(appDir, "public");
if (existsSync(publicSrc)) {
  cpSync(publicSrc, path.join(standaloneApp, "public"), { recursive: true });
}

console.log("[postbuild] static (+public) → standalone kopyalandı:", standaloneApp);
