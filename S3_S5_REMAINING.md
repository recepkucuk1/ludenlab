# S3 (billing, sandbox-first) + S5 (deploy/cutover) — kalan iş

Track 2'nin kod tarafı büyük ölçüde tamam. Bu dosya **kalan adımları** (çoğu senin
tarafında: iyzico paneli, env, DNS) + cutover sırasını toplar.

## Kod-tamam (bu etapta yapıldı)
- **#1 Yeni-kayıt provisioning** — `register/route` → `ensureModuleAccounts()` (Studio
  Therapist + Atölye Account idempotent upsert). Yeni kullanıcı FREE tier'da iki modülü
  de kullanabiliyor. e2e doğrulandı. (`apps/hub/src/lib/provision.ts`)
- **#2 UI yakınsama (S2d)** — `@ludenlab/ui` poster token'ları Studio paletine hizalandı
  (light+dark; shell + Atölye); Atölye sidebar'a Studio-tarzı kullanıcı başlığı. Build
  yeşil. **Görsel review öner:** `/atolye` ile `/studio` yan yana bak (gestalt onayı).
- **#3 Checkout URL'leri path-based** — `moduleReturnUrl` + landing linkleri subdomain
  yerine `ludenlab.com/studio` · `/atolye`. (`packages/billing/src/urls.ts`)
- **Identity göçü** — `billing.Account` 9 mevcut kullanıcıyla dolduruldu (şifreler korundu).
- **Deploy çıktısı** — standalone self-contained (`server.js` + iyzipay flat + static/public).

## S3 — sandbox per-modül abonelik (SENİN tarafın; merchant 3422180)
Mimari hazır (checkout `/odeme`, webhook `/api/iyzico/webhook`, `BillingPlan`/`Subscription`,
entitlement, reconcile). Çalıştırmak için:

1. **iyzico sandbox panelinde (merchant 3422180):**
   - Ürünler: `LudenLab` (Studio) ve `LudenLab Atölye` — isimler birebir.
   - Her ürün altında 4 pricing plan (bootstrap spec'i ile aynı fiyat/interval):
     `PRO/MONTHLY 449` · `PRO/YEARLY 4579.80` · `ADVANCED/MONTHLY 1999` · `ADVANCED/YEARLY 20389.80`.
   - Webhook URL: `https://ludenlab.com/api/iyzico/webhook` (sandbox).
2. **`apps/hub/.env`:**
   ```
   IYZICO_API_KEY=<sandbox>
   IYZICO_SECRET_KEY=<sandbox>
   IYZICO_MERCHANT_ID=3422180
   IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
   NEXT_PUBLIC_CENTRAL_BILLING=true
   ```
3. **Bootstrap:** `cd apps/hub && node scripts/bootstrap-iyzico.mjs` → iyzico planlarını
   `billing.BillingPlan`'a senkronlar (8 satır beklenir).
4. **Test:** `/hesap` → modül planı seç → `/odeme` → iyzico test kartı → `/odeme/sonuc` →
   `Subscription` ACTIVE → modül sayfasında reconcile → planType yükselir.
5. **Gerçek merchant:** onay gelince env'leri prod merchant + `IYZICO_BASE_URL=https://api.iyzipay.com`
   ile değiştir, bootstrap'i prod planlarla tekrar çalıştır. (= "her şey hazır" anı.)

## S5 — deploy / cutover (gerçek merchant + onayın gelince)
Sıra (ARCHITECTURE_RESPLIT.md + reference-hostinger-nextjs-deploy reçetesi):
1. Prod env'leri Hostinger'a koy (aşağıdaki union).
2. `feat/studio-monorepo` → `main` merge + prod build (`pnpm --filter @ludenlab/hub build`).
3. ludenlab.com'u **birleşik app**'e yönlendir (standalone + hPanel Node).
4. Smoke: `/`, `/giris`, `/hesap`, `/studio/*`, `/atolye/*`, `/api/iyzico/webhook` (405 GET).
5. Eski `studio.ludenlab.com` + `atolye.ludenlab.com` subdomain app'lerini emekliye ayır
   (301 → path, sonra kapat). `apps/studio` (terapimat) + `apps/atolye` repodan temizlenebilir.

### Prod env union (merged app okur)
`HUB_DATABASE_URL` · `STUDIO_DATABASE_URL` · `ATOLYE_DATABASE_URL` · `CENTRAL_BILLING_DATABASE_URL`
· `AUTH_SECRET` · `AUTH_URL`/`NEXTAUTH_URL` · `COOKIE_DOMAIN=.ludenlab.com` · `NEXT_PUBLIC_APP_URL`
· `NEXT_PUBLIC_APEX_URL` · `NEXT_PUBLIC_CENTRAL_BILLING` · `IYZICO_API_KEY/SECRET_KEY/MERCHANT_ID/BASE_URL`
· `ANTHROPIC_API_KEY` · `RESEND_API_KEY`/`EMAIL_FROM` · `HCAPTCHA_SECRET` · `CRON_SECRET`

## Senin gözden geçirmen gereken (legal)
`apps/hub/src/app/(legal)/_legal-ui.tsx` — "ÖDEME TEK DOMAIN ... üç ürün" çerçevesi artık
**yanlış**: BRY ayrı merchant/brytakip.com. studio/atolye host'larını path'e çevir + BRY'yi
ayrı ürün olarak ayır. Legal metin olduğu için sessizce yeniden yazmadım.
