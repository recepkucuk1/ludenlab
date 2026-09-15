# Deploy — Hostinger

Vercel kullanılmıyor. **Tek birleşik uygulama:** `apps/hub` (LudenLab apex — Studio,
Atölye ve merkezi billing/kimlik aynı Next.js app'i içinde **modül**). Eski ayrı
`apps/studio` / `apps/atolye` standalone'ları kaldırıldı.

`apps/hub` → `output: standalone` (Node sunucu app, **statik export DEĞİL** — auth, DB,
API route'ları var). Hostinger hPanel Node üzerinde çalışır.

## Otomatik deploy (asıl yol)

**`main`'e push → Hostinger otomatik git-deploy.** Hostinger repo'yu çeker, `pnpm install`
+ `pnpm build` çalıştırır, Node app'i `apps/hub/.next/standalone/apps/hub/server.js`
ile yeniden başlatır. ~CI süresi içinde canlı (doğrulandı 2026-06-25).

Yani sürüm yayınlamak = branch'i `main`'e merge + push. Başka manuel adım gerekmez.

## CI (`.github/workflows/ci.yml`)

`main` push + PR'larda çalışır. **Sadece doğrular, deploy ETMEZ.** Adımlar:
- **Lint** — advisory (`continue-on-error`, job'u bloklamaz; göç edilen kodda pre-existing borç).
- **Typecheck** — `pnpm typecheck` (kapı).
- **Build** — `pnpm build` (kapı).

> Deploy'un gerçek kapısı `next build`'tir — `tsc` yetmez (tip hatası deploy'u patlatır,
> eski build canlı kalır). Bkz. proje hafızası `deploy-verify-next-build`.

## Build & standalone çıktısı

```bash
pnpm build   # = cd apps/hub && next build && node scripts/postbuild.mjs
```

- `next build` → `apps/hub/.next/standalone/apps/hub/server.js` (+ izlenmiş `node_modules`).
- `scripts/postbuild.mjs` → `.next/static` ve `public/`'i standalone içine **kopyalar**
  (Next bunu kendiliğinden yapmaz; yoksa `/_next/static` 404 olur); iyzipay kapanışını
  düz kopyalar; **`server.js`'i CJS sarmalayıcıya çevirir** (aşağıda).
- Sonuç: `apps/hub/.next/standalone/` kendi-kendine-yeterli (server.js + node_modules +
  static + public).

### `server.js` sarmalayıcısı + lsnode realpath shim (2026-09-15 kesintisi)

Hostinger 2026-09-12'de LiteSpeed `lsnode.js`'i güncelledi: yeni sürüm dinleme soketini
her saniye `lstat`'lıyor. Node'un JS `fs.realpathSync`'i cache'li modül çözümlemesinde
paylaşılan `statValues`'a bakıp "son stat socket ise dur" dediği için pnpm symlink'leri
gerçek yola çözülmeden cache'lendi → kardeş bağımlılıklar bulunamadı → **her istek 500**
(ilk kurban Sentry'nin `require-in-the-middle`'ı; sonra Next runtime `@swc/helpers`,
`pg.types`). Kod/env/build değişmemişti; 3 gün fark edilmedi (uptime/Sentry DSN yok).

Çare, postbuild'in ürettiği yapı:
- `server.next.mjs` = Next'in ürettiği ESM sunucu (adı değişti, içeriği aynı).
- `server.js` = CJS sarmalayıcı: önce `lsnode-realpath-shim.cjs` (`fs.realpathSync` →
  libuv tabanlı `.native`), sonra `require("./server.next.mjs")` (Node ≥ 22.12).
- Standalone **kopyasındaki** `package.json` `type: commonjs` (kaynak `"module"` kalır;
  `.next/` zaten kendi `package.json`'ıyla commonjs). Passenger startup dosyası hPanel'de
  `.../server.js` diye sabit olduğu için ad korunur.

Shim'in ESM loader'dan **önce** kurulması şart (Node'un ESM çözümleyicisi `realpathSync`'i
yüklenirken yakalar); bu yüzden `server.js` içinden `import` ile değil, CJS sarmalayıcıyla
yüklenir. Birim testi: `src/lib/lsnodeRealpathShim.test.ts`. Kaynak:
`apps/hub/scripts/lsnode-realpath-shim.cjs`. Hostinger lsnode'u düzeltse bile zararsız.

Sunucuda canlı log: `~/domains/ludenlab.com/hbuilds/current/nodejs/console.log` (JSON
satırlar). Restart: `touch ~/domains/ludenlab.com/hbuilds/current/nodejs/tmp/restart.txt`.
Aynı build'i canlıdan bağımsız prova etmek için: `LSNODE_ROOT=<nodejs dizini>/
LSNODE_STARTUP_FILE=<server.js> LSNODE_BIND_SOCKET=1 LSNODE_SOCKET=/tmp/x.sock
node /usr/local/lsws/fcgi-bin/lsnode.js` → `curl --unix-socket /tmp/x.sock http://localhost/`.

## hPanel — tek seferlik kurulum (kullanıcı)

1. `ludenlab.com` için Node.js uygulaması (hPanel → Node.js).
2. Başlangıç dosyası: `apps/hub/.next/standalone/apps/hub/server.js`.
3. Repo'yu `main`'e bağla (git deployment).
4. Ortam değişkenleri (hPanel'de; `.env` **gitignore'lu**, commit edilmez) —
   tam liste için **`apps/hub/.env.example`**. Kategoriler:
   - DB: `HUB_DATABASE_URL` (Supabase `billing` şeması), `STUDIO_DATABASE_URL`,
     `ATOLYE_DATABASE_URL` — üçü de Supavisor pooler host'unda, **session modu (5432)**.
     6543 (transaction) BİLEREK kullanılmıyor: 2026-09-15 testinde oturum durumu
     (`search_path`) istemciler arası sızdı; `central-billing.ts` raw SQL kullanıyor.
   - DB TLS: `DB_SSL_CA` = Supabase Root 2021 CA (PEM ya da base64(PEM) tek satır).
     Sertifika: `openssl s_client -starttls postgres -connect aws-1-eu-west-1.pooler.supabase.com:5432 -showcerts`
     zincirindeki 3. sertifika (SHA256 `80:70:25:AD:…:E6:CA:FA`). Yoksa açılışta uyarı.
   - Sıkı mod: `ENV_STRICT=true` — prod'da iyzico sandbox/boş ise süreç açılmaz.
   - Kimlik: `AUTH_SECRET`, `AUTH_URL=https://ludenlab.com`, `NEXT_PUBLIC_APP_URL`
   - Ödeme (iyzico): `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL`
     (prod `https://api.iyzipay.com`), `IYZICO_MERCHANT_ID`
   - Cron: `CRON_SECRET` (bkz. aşağıda `cron-call.sh`)
   - AI: `ANTHROPIC_API_KEY`; görsel: `IMAGE_PROVIDER`, `OPENAI_API_KEY` / `FAL_KEY`,
     Supabase Storage (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TOOL_IMAGES_BUCKET`)
   - E-posta (Hostinger SMTP): `SMTP_*`, `EMAIL_FROM`
   - Bot koruması: `NEXT_PUBLIC_HCAPTCHA_SITEKEY` + `HCAPTCHA_SECRET` (çift; yoksa kapalı)
   - Ziyaret istatistiği: `NEXT_PUBLIC_UMAMI_WEBSITE_ID` (yoksa script yüklenmez)
   - Hata raporlama (opsiyonel): `SENTRY_DSN`

   `NEXT_PUBLIC_*` değişkenleri **build anında** gömülür → panelde değiştirince
   redeploy şart. Diğer env değişiklikleri de hot uygulanmaz: **main'e boş commit** at
   (`git commit --allow-empty -m "chore(deploy): env yenileme"`) ya da hPanel'den redeploy.

## Manuel upload (git-deploy yoksa — yedek yol)

```bash
pnpm build
# Yükle: apps/hub/.next/standalone/  → hPanel Node app köküne (static+public dahil)
```
Sonra hPanel'de uygulamayı yeniden başlat.

## Cron Jobs (hPanel → Cron Jobs)

Cron kabuğunda uygulama env'i **yoktur** — `-H "Authorization: Bearer $CRON_SECRET"`
yazan doğrudan `curl` komutları secret'ı boş gönderir ve uç 401 döner. (2026-08-28:
üç görevin ikisi tam olarak bu yüzden başarısızdı, panelde de yalnız son çıktı
tutulduğu için fark edilmemişti.) Bu yüzden çağrılar sarmalayıcıdan geçer:

```
0  3 * * *  bash ~/domains/ludenlab.com/<repo>/apps/hub/scripts/cron-call.sh iyzico-sweep
0  4 * * *  bash ~/domains/ludenlab.com/<repo>/apps/hub/scripts/cron-call.sh studio-cleanup
10 4 * * *  bash ~/domains/ludenlab.com/<repo>/apps/hub/scripts/cron-call.sh atolye-cleanup
```

`cron-call.sh` secret'ı sırayla arar (`CRON_SECRET` env → `CRON_ENV_FILE` →
`~/.env.cron` → Hostinger'ın `.builds/config/.env` kopyası), çağrıyı yapar ve
**tarih + HTTP kodu + süre + yanıt gövdesini** hem `~/cron-logs/ludenlab/cron.log`
dosyasına hem panele (stdout) yazar. HTTP 2xx değilse non-zero çıkar → Hostinger
görevi başarısız işaretler. Secret log'a **yazılmaz** (yalnız hangi kaynaktan
okunduğu). Log dizini bilerek deploy dizininin dışındadır; deploy log'u silmesin.

En hızlı kurulum: `~/.env.cron` içine tek satır `CRON_SECRET=<hPanel'deki değer>`.

**Kaldırılmış görev:** `/api/paynkolay/cron/subscription-renewal` — route `5c51af4`
("Paynkolay tamamen kaldırıldı") ile silindi, yenilemeyi iyzico yönetiyor. hPanel'de
bu görev hâlâ duruyorsa her gece 404 alıyordur; **silinmeli**, yerine bir şey
konmamalı.

## Notlar

- **Edge middleware KULLANILMAZ** (Hostinger build'ini patlatır → auth route
  handler'larda yapılır).
- `outputFileTracingRoot` monorepo köküne ayarlı; pnpm symlink'li workspace
  bağımlılıkları standalone'a böyle dahil olur.
- Runtime'da `fs` ile dosya okuyan paketler eklenirse `outputFileTracingIncludes` gerekir.
