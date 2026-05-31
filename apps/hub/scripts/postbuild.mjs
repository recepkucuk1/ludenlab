// Next `output: standalone`, `static`+`public`'i standalone bundle'a kopyalamaz →
// elle kopyala (yoksa /_next/static 404). Bkz. apps/atolye/scripts/postbuild.mjs.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const appDir = path.resolve(import.meta.dirname, "..");
const standaloneApp = path.join(appDir, ".next", "standalone", "apps", "hub");

if (!existsSync(path.join(standaloneApp, "server.js"))) {
  console.error("[postbuild] standalone server.js yok — output:standalone build alındı mı?");
  process.exit(1);
}

const staticDst = path.join(standaloneApp, ".next", "static");
mkdirSync(path.dirname(staticDst), { recursive: true });
cpSync(path.join(appDir, ".next", "static"), staticDst, { recursive: true });

const publicSrc = path.join(appDir, "public");
if (existsSync(publicSrc)) {
  cpSync(publicSrc, path.join(standaloneApp, "public"), { recursive: true });
}

console.log("[postbuild] static (+public) → standalone kopyalandı:", standaloneApp);
