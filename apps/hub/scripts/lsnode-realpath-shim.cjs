/*
 * lsnode realpath shim — postbuild bunu standalone'a kopyalar ve CJS `server.js`
 * sarmalayıcısı Next'in ESM sunucusundan ÖNCE yükler (bkz. postbuild.mjs).
 *
 * NEDEN (2026-09-15 kesintisi, 12 Eylül'den beri her istek 500):
 *   Node'un JS `fs.realpathSync`'i, modül çözümlemesinde cache'li yürüyüş yaparken
 *   "cache'te sert bilinen" bir bileşene gelince paylaşılan `statValues` tamponuna bakıp
 *   "son stat bir socket/pipe ise dur" diyor. O tampon sürecin SON stat çağrısına ait.
 *   Hostinger'ın 2026-09-12'de güncellediği LiteSpeed `lsnode.js`, dinleme soketini her
 *   saniye `lstat`'ladığı için tampon hep S_IFSOCK'ta kalıyor → pnpm symlink'leri gerçek
 *   yola çözülmeden "gerçek yol" diye cache'leniyor → `.pnpm/<pkg>/node_modules/<dep>`
 *   kardeş bağımlılıkları bulunamıyor. İlk kurban Sentry'nin `require-in-the-middle`'ı
 *   (instrumentation yüklenemedi → prepare() düştü → her istek 500); onu geçince Next'in
 *   kendi runtime'ı `@swc/helpers`'ı, Turbopack'in `import("pg")`'si `pg.types`'ı kaybetti.
 *
 * ÇÖZÜM: libuv tabanlı `fs.realpathSync.native` bu kontrolü kullanmaz; loader'ın
 *   çağırdığı `fs.realpathSync`'i ona yönlendiriyoruz. Node'un ESM çözümleyicisi
 *   `realpathSync`'i kendi yüklendiği anda yakaladığı (destructure) için bu dosya ESM
 *   loader başlamadan — yani CJS sarmalayıcının ilk satırında — yüklenmek ZORUNDA.
 *
 * Yerel dev (`next dev`) bu dosyayı hiç kullanmaz; yalnız standalone çıktısında yaşar.
 */
"use strict";

const fs = require("node:fs");

const native = fs.realpathSync && fs.realpathSync.native;

if (typeof native === "function" && !fs.realpathSync.__lsnodeShim) {
  const orig = fs.realpathSync;

  function realpathSyncViaNative(p, options) {
    if (typeof p === "string" || Buffer.isBuffer(p) || p instanceof URL) {
      // options: { encoding } nesnesi ya da doğrudan encoding dizesi olabilir (Node API).
      const enc = options && typeof options === "object" ? options.encoding : options;
      try {
        return native(p, enc ? { encoding: enc } : undefined);
      } catch (err) {
        // Gerçek dosya-sistemi hataları aynen fırlar; beklenmedik bir durumda JS yoluna düş.
        if (err && (err.code === "ENOENT" || err.code === "ENOTDIR" || err.code === "EACCES" || err.code === "ELOOP")) {
          throw err;
        }
      }
    }
    return orig.apply(this, arguments);
  }

  realpathSyncViaNative.native = native;
  realpathSyncViaNative.__lsnodeShim = true;
  fs.realpathSync = realpathSyncViaNative;
}
