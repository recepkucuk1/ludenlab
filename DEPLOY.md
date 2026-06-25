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
  (Next bunu kendiliğinden yapmaz; yoksa `/_next/static` 404 olur).
- Sonuç: `apps/hub/.next/standalone/` kendi-kendine-yeterli (server.js + node_modules +
  static + public).

## hPanel — tek seferlik kurulum (kullanıcı)

1. `ludenlab.com` için Node.js uygulaması (hPanel → Node.js).
2. Başlangıç dosyası: `apps/hub/.next/standalone/apps/hub/server.js`.
3. Repo'yu `main`'e bağla (git deployment).
4. Ortam değişkenleri (hPanel'de; `.env` **gitignore'lu**, commit edilmez) —
   tam liste için **`apps/hub/.env.example`**. Kategoriler:
   - DB: `HUB_DATABASE_URL` (Supabase `billing` şeması), `STUDIO_DATABASE_URL`,
     (+ Atölye DB değişkenleri)
   - Kimlik: `AUTH_SECRET`, `AUTH_URL=https://ludenlab.com`, `NEXT_PUBLIC_APP_URL`
   - Ödeme (Paynkolay): `PAYNKOLAY_*` (prod base URL + gerçek sx/secret)
   - E-posta (Hostinger SMTP): `SMTP_*`, `EMAIL_FROM`
   - Görsel/AI: `IMAGE_PROVIDER`, `OPENAI_API_KEY` / `FAL_KEY`, Supabase Storage
     (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)

## Manuel upload (git-deploy yoksa — yedek yol)

```bash
pnpm build
# Yükle: apps/hub/.next/standalone/  → hPanel Node app köküne (static+public dahil)
```
Sonra hPanel'de uygulamayı yeniden başlat.

## Notlar

- **Edge middleware KULLANILMAZ** (Hostinger build'ini patlatır → auth route
  handler'larda yapılır).
- `outputFileTracingRoot` monorepo köküne ayarlı; pnpm symlink'li workspace
  bağımlılıkları standalone'a böyle dahil olur.
- Runtime'da `fs` ile dosya okuyan paketler eklenirse `outputFileTracingIncludes` gerekir.
