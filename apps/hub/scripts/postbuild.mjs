// Next `output: standalone`, `static` ve `public`'i standalone bundle'a KOPYALAMAZ.
// Hostinger (ve her Node host) standalone'u kendi-kendine-yeterli çalıştırabilsin diye
// build sonrası bunları standalone içine kopyalıyoruz. Yoksa /_next/static 404 olur.
// + iyzipay SDK kapanışını FLAT kopyala (bkz. apps/atolye/scripts/postbuild.mjs — aynı reçete).
import { cpSync, existsSync, mkdirSync, readdirSync, lstatSync, readlinkSync } from "node:fs";
import path from "node:path";

const appDir = path.resolve(import.meta.dirname, "..");
const standaloneApp = path.join(appDir, ".next", "standalone", "apps", "hub");

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

// iyzipay SDK sorunu (Hostinger standalone):
//  (1) lib/resources'ı runtime'da fs.readdirSync ile okur (require DEĞİL) → tracer kaçırır.
//  (2) iyzipay serverExternalPackages → transitive dep'leri (postman-request, bluebird, …)
//      standalone'a alınmaz → runtime "Cannot find module".
// Çözüm: iyzipay'i (resources dahil) .pnpm yerine + tüm bağımlılık KAPANIŞINI standalone'un
// KÖK node_modules'una FLAT kopyala (Node yukarı doğru çözer; pnpm symlink derdi yok).
const monorepoRoot = path.resolve(appDir, "..", "..");
const standaloneRoot = path.join(appDir, ".next", "standalone");
const pnpmSrc = path.join(monorepoRoot, "node_modules", ".pnpm");
const standaloneNm = path.join(standaloneRoot, "node_modules");

const entryFromLink = (t) => {
  const m = String(t).match(/([^/]+)\/node_modules\//);
  return m ? m[1] : null;
};

if (existsSync(pnpmSrc)) {
  const iyziEntry = readdirSync(pnpmSrc).find((e) => e.startsWith("iyzipay@"));
  if (!iyziEntry) {
    console.warn("[postbuild] iyzipay .pnpm entry bulunamadı — checkout ENOENT riski!");
  } else {
    // (1) iyzipay tam dizini (lib/resources dahil) → standalone .pnpm yerine
    cpSync(
      path.join(pnpmSrc, iyziEntry, "node_modules", "iyzipay"),
      path.join(standaloneRoot, "node_modules", ".pnpm", iyziEntry, "node_modules", "iyzipay"),
      { recursive: true },
    );

    // (2) bağımlılık kapanışını BFS ile bul
    const closure = new Set();
    const queue = [iyziEntry];
    while (queue.length) {
      const entry = queue.shift();
      if (!entry || closure.has(entry)) continue;
      const nm = path.join(pnpmSrc, entry, "node_modules");
      if (!existsSync(nm)) continue;
      closure.add(entry);
      for (const item of readdirSync(nm)) {
        const ip = path.join(nm, item);
        let st;
        try { st = lstatSync(ip); } catch { continue; }
        if (st.isSymbolicLink()) {
          const e = entryFromLink(readlinkSync(ip));
          if (e) queue.push(e);
        } else if (item.startsWith("@") && st.isDirectory()) {
          for (const s of readdirSync(ip)) {
            try {
              const sp = path.join(ip, s);
              if (lstatSync(sp).isSymbolicLink()) {
                const e = entryFromLink(readlinkSync(sp));
                if (e) queue.push(e);
              }
            } catch { /* skip */ }
          }
        }
      }
    }

    // (3) her paketin gerçek dizinini FLAT kopyala (kök node_modules'a)
    let n = 0;
    for (const entry of closure) {
      const nm = path.join(pnpmSrc, entry, "node_modules");
      for (const item of readdirSync(nm)) {
        const ip = path.join(nm, item);
        let st;
        try { st = lstatSync(ip); } catch { continue; }
        if (st.isSymbolicLink()) continue; // dep symlink — gerçek paket değil
        if (item.startsWith("@")) {
          for (const s of readdirSync(ip)) {
            const sp = path.join(ip, s);
            try {
              if (!lstatSync(sp).isSymbolicLink()) {
                cpSync(sp, path.join(standaloneNm, item, s), { recursive: true, dereference: true });
                n++;
              }
            } catch { /* skip */ }
          }
        } else {
          cpSync(ip, path.join(standaloneNm, item), { recursive: true, dereference: true });
          n++;
        }
      }
    }
    console.log(`[postbuild] iyzipay closure: ${closure.size} entry, ${n} paket FLAT → standalone`);
  }
}

console.log("[postbuild] static (+public) → standalone kopyalandı:", standaloneApp);
