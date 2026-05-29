# Deploy — Hostinger

Vercel kullanılmıyor. İki reçete var.

## Hub (statik vitrin) — otomatik

`apps/hub` → `output: export` → GitHub Actions FTP ile Hostinger `public_html`.
- Workflow: [`.github/workflows/deploy-hub.yml`](.github/workflows/deploy-hub.yml)
- Gerekli GitHub repo **secrets**: `HUB_FTP_SERVER`, `HUB_FTP_USERNAME`, `HUB_FTP_PASSWORD`, `HUB_FTP_DIR`
- `main`'e push'ta (hub/ui değişince) otomatik; elle tetik: Actions → "Deploy Hub" → Run.

## Atölye (sunucu-app) — standalone + hPanel Node

`apps/atolye` → `output: standalone`. Studio'nun çalışan reçetesiyle aynı.

**Tek seferlik (hPanel'de, kullanıcı):**
1. `atolye.ludenlab.com` için subdomain + DNS oluştur.
2. hPanel → Node.js → yeni uygulama; başlangıç dosyası: `apps/atolye/server.js`
   (standalone çıktısında `.next/standalone/apps/atolye/server.js`).
3. Ortam değişkenleri (hPanel): `ANTHROPIC_API_KEY`, (sonra) `ATOLYE_DATABASE_URL`, `NEXT_PUBLIC_APP_URL=https://atolye.ludenlab.com`.

**Her sürümde:**
```bash
pnpm --filter @ludenlab/atolye build
# Yüklenecek: apps/atolye/.next/standalone/  (server.js + izlenmiş node_modules)
#           + apps/atolye/.next/static/  → standalone/apps/atolye/.next/static/
#           + apps/atolye/public/        → standalone/apps/atolye/public/
```
Standalone klasörünü hPanel Node app köküne yükleyip uygulamayı yeniden başlatın.

> Notlar: Edge middleware KULLANILMAZ (Hostinger build'ini patlatır → auth route
> handler'larda). `outputFileTracingRoot` monorepo köküne ayarlı; pnpm symlink'li
> workspace bağımlılıkları standalone'a böyle dahil olur. iyzipay benzeri, dosyayı
> runtime'da `fs` ile okuyan paketler eklenirse `outputFileTracingIncludes` gerekir.
