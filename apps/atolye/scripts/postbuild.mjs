// Next `output: standalone`, `static` ve `public`'i standalone bundle'a KOPYALAMAZ.
// Hostinger (ve her Node host) standalone'u kendi-kendine-yeterli çalıştırabilsin diye
// build sonrası bunları standalone içine kopyalıyoruz. Yoksa /_next/static 404 olur.
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
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

// iyzipay SDK, lib/resources'ı runtime'da fs.readdirSync ile okur (require DEĞİL) →
// Next tracer bunu statik tespit edemez, standalone'a kopyalamaz → checkout'ta
// ENOENT (.../iyzipay/lib/resources). Build sonrası tam dizini elle kopyalıyoruz.
const monorepoRoot = path.resolve(appDir, "..", "..");
const standaloneRoot = path.join(appDir, ".next", "standalone");

function findIyzipaySrc(root) {
  const pnpmDir = path.join(root, "node_modules", ".pnpm");
  if (!existsSync(pnpmDir)) return null;
  const entry = readdirSync(pnpmDir).find((e) => e.startsWith("iyzipay@"));
  if (!entry) return null;
  const dir = path.join(pnpmDir, entry, "node_modules", "iyzipay");
  return existsSync(dir) ? dir : null;
}

const iyziSrc = findIyzipaySrc(monorepoRoot);
if (iyziSrc) {
  const rel = path.relative(monorepoRoot, iyziSrc); // node_modules/.pnpm/iyzipay@x/node_modules/iyzipay
  cpSync(iyziSrc, path.join(standaloneRoot, rel), { recursive: true });
  console.log("[postbuild] iyzipay (lib/resources dahil) → standalone:", rel);
} else {
  console.warn("[postbuild] iyzipay kaynak dizini bulunamadı — checkout ENOENT riski!");
}

console.log("[postbuild] static (+public) → standalone kopyalandı:", standaloneApp);
