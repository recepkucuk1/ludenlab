# DEPLOY — direkt cutover (ludenlab.com → birleşik app, sandbox iyzico)

**Karar:** staging YOK, direkt cutover; iyzico **sandbox** (FREE çalışır, ödeme test-kart;
gerçek merchant sonra). Hosting **Hostinger hPanel Node** (standalone). Fiziksel upload sende.

> **SIRA ÖNEMLİ:** önce env, sonra app. Merged app 3 DB + auth secret olmadan açılırsa kırılır.
> **Veri taşıma YOK** — merged app eski studio/atölye Supabase'lerinin AYNISINI kullanıyor;
> cutover sadece routing değişikliği. Eski subdomain app'leri rollback için **kapatma**, sadece sustur.

---

## 0) Ön-uçuş (deploy'dan önce, lokal — bende hazır)
- [x] Identity migration koştu (9 user `billing.Account`'ta) → mevcut kullanıcılar giriş yapabilir
- [x] Build deploy-ready (standalone self-contained: `server.js` + iyzipay flat + static/public)
- [ ] **iyzico sandbox** kurulu mu? (panel ürün/plan + `bootstrap-iyzico.mjs` → `BillingPlan` 8 satır) — yoksa checkout boş; FREE yine de çalışır. Bkz. `S3_S5_REMAINING.md`.

## 1) Hostinger'a PROD ENV (app'i değiştirmeden ÖNCE)
hPanel → Node app → Environment variables. Değerleri mevcut `apps/hub/.env`'den kopyala;
**prod'a özel** olanları aşağıdaki gibi ayarla:

| Key | Değer |
|---|---|
| `HUB_DATABASE_URL` · `STUDIO_DATABASE_URL` · `ATOLYE_DATABASE_URL` · `CENTRAL_BILLING_DATABASE_URL` | .env'den (canlı Supabase'ler, değişmiyor) |
| `AUTH_SECRET` | .env'den (AYNI kalmalı — yoksa mevcut oturumlar düşer) |
| `AUTH_URL` / `NEXTAUTH_URL` | `https://ludenlab.com` |
| `COOKIE_DOMAIN` | `.ludenlab.com` (veya boş bırak — tek origin için host-cookie de yeter) |
| `NEXT_PUBLIC_APP_URL` · `NEXT_PUBLIC_APEX_URL` | `https://ludenlab.com` |
| `NEXT_PUBLIC_CENTRAL_BILLING` | `true` |
| `IYZICO_API_KEY` · `IYZICO_SECRET_KEY` | sandbox kimlikleri |
| `IYZICO_MERCHANT_ID` | `3422180` (sandbox) |
| `IYZICO_BASE_URL` | `https://sandbox-api.iyzipay.com` |
| `ANTHROPIC_API_KEY` · `RESEND_API_KEY` · `EMAIL_FROM` · `HCAPTCHA_SECRET` · `CRON_SECRET` | .env'den |

Node sürümü: **20+**. Entry/başlangıç komutu: `node .next/standalone/apps/hub/server.js`
(çalışma dizini standalone kökü; `PORT` Hostinger atar, `HOSTNAME=0.0.0.0`).

## 2) Build + upload
```bash
# lokal (veya CI):
cd /Users/recepkucuk/ludenlab
git checkout main && git merge feat/studio-monorepo   # (bunu ben yapabilirim)
pnpm install
pnpm --filter @ludenlab/hub build                     # → .next/standalone + iyzipay flat
```
Upload (FTP/git): `.next/standalone/` ağacının TAMAMI (içinde `apps/hub/server.js`,
`node_modules/` flat iyzipay, `apps/hub/.next/static`, `apps/hub/public`).

## 3) Domain'i çevir (cutover anı)
- hPanel → `ludenlab.com` (ana domain) → bu Node app'e bağla (eski hub app'ini değiştir).
- HTTPS/SSL açık olsun (prod cookie `__Secure-` → HTTPS şart).

## 4) Smoke (cutover sonrası hemen)
```bash
curl -I https://ludenlab.com/                          # 200
curl -I https://ludenlab.com/giris                     # 200
curl -sI https://ludenlab.com/hesap | head -1          # 307 → /giris (girişsiz)
curl -sI https://ludenlab.com/studio/dashboard | head -1   # 307 → /giris
curl -sI https://ludenlab.com/atolye/dashboard | head -1   # 307 → /giris
curl -sI https://ludenlab.com/api/iyzico/webhook | head -1 # 405 (GET; POST imzalı)
```
+ tarayıcıdan gerçek bir kullanıcıyla giriş → /studio + /atolye render + yeni kayıt (provisioning).

## 5) Eski subdomain'leri 301 (cutover doğrulandıktan SONRA)
`studio.ludenlab.com/*` → `https://ludenlab.com/studio/$1`, `atolye.ludenlab.com/*` →
`https://ludenlab.com/atolye/$1` (hPanel redirect veya subdomain app'ini 301-statik yap).
Bookmark/SEO kırılmasın. App'leri **bir süre ayakta tut** (rollback), sonra emekliye al.

## ROLLBACK (kırılırsa)
Eski hub app'i duruyor → `ludenlab.com`'u ona geri bağla (anında geri dönüş). Merged app
eski DB'leri bozmaz (yazımlar aynı şemalara), veri kaybı yok. Sakin sakin sebebi bul.

## SONRA (gerçek merchant gelince)
iyzico env → prod merchant + `IYZICO_BASE_URL=https://api.iyzipay.com`, `bootstrap-iyzico.mjs`
prod planlarla, webhook → prod. Sandbox→prod billing geçişi. (= S3 canlı.)
