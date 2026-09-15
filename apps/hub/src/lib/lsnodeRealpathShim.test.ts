import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

/**
 * scripts/lsnode-realpath-shim.cjs — postbuild bunu standalone server.js'in başına
 * import ettirir (bkz. postbuild.mjs). Hostinger'ın lsnode.js'i (2026-09-12) dinleme
 * soketini her saniye lstat'ladığı için Node'un JS realpathSync'i symlink'leri gerçek
 * yola çözmeden cache'liyordu (2026-09-15 kesintisi). Shim, loader'ın kullandığı
 * fs.realpathSync'i libuv tabanlı realpathSync.native'e yönlendirir; burada davranışın
 * korunduğunu (symlink çözümü, encoding seçenekleri, ENOENT, idempotentlik) sabitliyoruz.
 */
const require = createRequire(import.meta.url);
const SHIM = "../../scripts/lsnode-realpath-shim.cjs";

describe("lsnode realpath shim", () => {
  let dir: string;
  let real: string;
  let link: string;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "lsnode-shim-"));
    real = path.join(dir, "real");
    fs.mkdirSync(real);
    fs.writeFileSync(path.join(real, "index.js"), "module.exports = 1;\n");
    link = path.join(dir, "link");
    fs.symlinkSync("real", link); // pnpm gibi GÖRELİ hedef
    require(SHIM);
  });

  it("fs.realpathSync'i sarmalar ve symlink'i gerçek yola çözer", () => {
    expect((fs.realpathSync as unknown as { __lsnodeShim?: boolean }).__lsnodeShim).toBe(true);
    expect(fs.realpathSync(path.join(link, "index.js"))).toBe(
      fs.realpathSync.native(path.join(real, "index.js")),
    );
  });

  it("encoding seçeneklerini korur (nesne ve dize biçimi)", () => {
    expect(Buffer.isBuffer(fs.realpathSync(link, { encoding: "buffer" }))).toBe(true);
    expect(fs.realpathSync(link, "utf8")).toBe(fs.realpathSync.native(real));
  });

  it("olmayan yolda ENOENT fırlatır", () => {
    expect(() => fs.realpathSync(path.join(dir, "yok"))).toThrow(/ENOENT/);
  });

  it(".native erişilebilir kalır ve yeniden yüklenince iki kez sarmalamaz", () => {
    expect(typeof fs.realpathSync.native).toBe("function");
    const before = fs.realpathSync;
    delete require.cache[require.resolve(SHIM)];
    require(SHIM);
    expect(fs.realpathSync).toBe(before);
  });
});
