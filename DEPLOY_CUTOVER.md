# DEPLOY — direkt cutover (ludenlab.com → birleşik app, sandbox iyzico)

**Karar:** staging YOK, direkt cutover; iyzico **sandbox** (FREE çalışır, ödeme test-kart;
gerçek merchant sonra). Hosting **Hostinger** — `ludenlab.com` Node app'i bu repo'nun
`apps/hub`'ından **`main`'den OTOMATİK deploy** ediyor (git push main → build + deploy).

> ⚠️ **`main`'e push = anında cutover.** ludenlab.com push'ta rebuild olur. Bu yüzden
> **env'i push'tan ÖNCE** koy (build NEXT_PUBLIC_* için, runtime DB/secret için ister).
>
> **İyi haber:** merged app = aynı `apps/hub` (büyüdü). ludenlab.com'un build/start komutu
> zaten apps/hub için doğru → **sadece YENİ env değişkenleri** eklenecek.
>
> **Veri taşıma YOK** — aynı studio/atölye Supabase'leri. Eski subdomain app'leri (studio./
> atolye.) çalışmaya devam edebilir (rollback + geçiş güvenliği); 301 sonra.

---

## 1) ludenlab.com app env (push'tan ÖNCE — TEK kritik adım)
ludenlab.com Node app → Environment. **Eski hub'ın ZATEN sahip olduğu** (dokunma):
`HUB_DATABASE_URL` · `AUTH_SECRET` (AYNI kalmalı) · `AUTH_URL=https://ludenlab.com` ·
`COOKIE_DOMAIN=.ludenlab.com` · `NEXT_PUBLIC_APP_URL` · `NEXT_PUBLIC_APEX_URL` · `CRON_SECRET`.

**EKLE** (merged app'in studio/atölye için ihtiyacı; değerler `apps/hub/.env`'den):
| Key | Not |
|---|---|
| `STUDIO_DATABASE_URL` | studio Supabase (public) — **şart**, yoksa /studio runtime crash |
| `ATOLYE_DATABASE_URL` | atölye Supabase — **şart**, yoksa /atolye crash |
| `CENTRAL_BILLING_DATABASE_URL` | = `HUB_DATABASE_URL` değeri (atölye reconcile) |
| `NEXT_PUBLIC_CENTRAL_BILLING` | `true` (build-time → push'tan önce şart) |
| `ANTHROPIC_API_KEY` | studio/atölye AI araçları |
| `RESEND_API_KEY` · `EMAIL_FROM` | e-posta (doğrulama/davet) |
| `HCAPTCHA_SECRET` | formlar (varsa) |

**SANDBOX'a ayarla/doğrula:** `IYZICO_MERCHANT_ID=3422180` · `IYZICO_BASE_URL=https://sandbox-api.iyzipay.com`
· `IYZICO_API_KEY`/`IYZICO_SECRET_KEY` = sandbox kimlikleri.

> Pratik: ludenlab.com env'i `apps/hub/.env` ile eşitle (URL'ler prod kalsın, iyzico sandbox).

**Build/entry config DOĞRULA (ludenlab.com app):**
- Build command: **`pnpm run build:hub`** (SADECE hub). Root `pnpm run build` atolye+hub
  ikisini build eder → gereksiz + ekstra başarısızlık noktası. `build:hub`'a çevir.
- Output: `apps/hub/.next/standalone` · Entry: **`apps/hub/.next/standalone/apps/hub/server.js`** (tam yol)
- Node **22.x** · Root `./` · pnpm · Framework: Other (deploy reçetesi)

## 2) Cutover = main'e push (ben yaparım, sen "env hazır" deyince)
`feat/studio-monorepo` → `main` **fast-forward** (23 commit ileri, 0 geri → conflict yok).
Push → Hostinger ludenlab.com'u otomatik rebuild + deploy eder (birkaç dk; build sırasında
kısa kesinti olabilir). Build script: `next build && node scripts/postbuild.mjs` (iyzipay flat).

## 3) Smoke (deploy bitince — birlikte)
```
curl -I https://ludenlab.com/                          # 200
curl -sI https://ludenlab.com/hesap | head -1          # 307 → /giris
curl -sI https://ludenlab.com/studio/dashboard | head -1   # 307 → /giris
curl -sI https://ludenlab.com/atolye/dashboard | head -1   # 307 → /giris
curl -sI https://ludenlab.com/api/iyzico/webhook | head -1 # 405
```
+ tarayıcı: gerçek kullanıcı login → /studio + /atolye render + yeni kayıt (provisioning).

## 4) Eski subdomain'ler (cutover doğrulandıktan SONRA, acele yok)
`studio.ludenlab.com` + `atolye.ludenlab.com` çalışmaya devam ediyor (aynı DB → bozulma yok).
Doğrulandıktan sonra 301 → `ludenlab.com/studio|atolye`, sonra app'leri emekliye al.

## ROLLBACK (cutover kırılırsa)
`main`'i eski hub commit'ine geri al + push (`git reset --hard bd9dfbb && git push --force-with-lease`,
veya revert) → Hostinger eski hub'ı otomatik geri deploy eder. Veri kaybı yok (aynı şemalar).
Eski subdomain'ler zaten ayakta → studio/atölye erişimi hiç kesilmez.

## SONRA — gerçek merchant
iyzico env → prod merchant + `IYZICO_BASE_URL=https://api.iyzipay.com`, `bootstrap-iyzico.mjs`
prod planlarla, webhook prod. (= S3 canlı.)
