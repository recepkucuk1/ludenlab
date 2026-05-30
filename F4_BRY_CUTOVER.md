# Faz 4 — BRY web göçü (bry.ludenlab.com) · Cutover Runbook

> **Karar:** `brytakip-api` kendi reposunda/stack'inde kalır (Fastify + MySQL + Passenger);
> Next/pnpm monorepo'ya TAŞINMAZ (UI paylaşılmıyor; doc'un kendi notu). Yalnızca
> `bry.ludenlab.com`'a re-domain edilir. iyzico **tek merchant** üzerinden kalır
> (zaten öyle); temiz billing router'ı F5'te (Studio + `packages/billing`) gelir.

## iyzico: zaten ludenlab merchant'ında

- Tek iyzico merchant tüm ürünlerde paylaşımlı. Merchant'ın **tek webhook URL'i**
  şu an **ludenlab.com (Studio)**'ya düşer.
- Studio, tanımadığı abonelikleri `BRYTAKIP_WEBHOOK_URL` (varsayılan
  `https://brytakip.com/api/webhooks/iyzico`) adresine **forward** eder.
- BRY checkout'u da aynı merchant'ı kullanır → ödeme zaten ludenlab tüzel kişiliği/merchant'ı üzerinden.
- **F4'te tek billing değişikliği:** bu forward hedefini `bry.ludenlab.com`'a çevirmek (aşağıda).
- **F5/billing fazında:** ad-hoc forward köprüsü, `packages/billing` ürün-yönlendirmeli
  tek router ile değiştirilecek (Studio monorepo'ya girince).

## Cutover sırası (kırmamak için bu sırayla)

### 1) `bry.ludenlab.com` ayağa kalksın — **[SEN: Hostinger]**
- Hostinger'da `brytakip-api`'yi `bry.ludenlab.com` subdomain'ine bağla (mevcut
  brytakip.com Node app'ini re-domain et **veya** yeni subdomain + aynı app).
- SSL (Hostinger auto). `/api/license/verify` ve `/healthz` yanıt vermeli.
- `public/` içindeki landing + `/api/*` aynı app'ten servis edilmeye devam eder.

### 2) DNS — **[SEN: DNS]**
- `bry.ludenlab.com` → Hostinger app (A/CNAME, Hostinger panelinden).

### 3) Tauri masaüstü app'i re-point — **[BEN: kod · SEN: imzalı release]**
Repo: `/Users/recepkucuk/Downloads/luden-bkds`
- **Lisans ucu** — `frontend/composables/useLicense.ts:24`
  ```diff
  - const API_BASE = 'https://brytakip.com';
  + const API_BASE = 'https://bry.ludenlab.com';
  ```
- **Updater endpoint** — `desktop/src-tauri/tauri.conf.json` (~satır 60)
  ```diff
  - "https://brytakip.com/updates/latest.json",
  + "https://bry.ludenlab.com/updates/latest.json",
  ```
  (GitHub releases fallback'i kalsın.)
- UI içindeki kullanıcıya görünen `brytakip.com` linklerini de güncelle
  (`frontend/pages/index.vue`, `settings.vue`).
- **Release:** sürüm no'yu 4 dosyada eşitle → `git tag vX.Y.Z` → GitHub Actions imzalı
  build + `latest.json` üretir. İmza anahtarı senin makinende (`~/.tauri/luden-bkds.key`).
- **ÖNEMLİ:** bu release'i ADIM 1 tamamlanmadan ÇIKARMA — yoksa canlı app boş domaine bakar.
- `bry.ludenlab.com/updates/latest.json` servis edilmeli (Hostinger'da `public/updates/`
  ya da GitHub release fallback'i yeterli).

### 4) Billing forward'ı çevir — **[SEN: Studio hPanel env]**
- Studio (terapimat) hPanel env:
  ```
  BRYTAKIP_WEBHOOK_URL=https://bry.ludenlab.com/api/webhooks/iyzico
  ```
- Böylece BRY abonelik event'leri ludenlab merchant webhook'undan → bry.ludenlab.com'a akar.
  (Kod değişmez; sadece env.)

### 5) iyzico paneli — **[SEN: iyzico]**
- Merchant webhook URL'i ludenlab.com/Studio'da KALIR (değişmez).
- BRY checkout'unun callback/return URL'i `brytakip.com` referans ediyorsa
  `bry.ludenlab.com`'a güncelle (brytakip-api `.env` / iyzico ayarları).

### 6) 301 — **[SEN: Hostinger]**
- `brytakip.com` → `bry.ludenlab.com` kalıcı yönlendirme (SEO + eski linkler).

## Doğrulama (cutover sonrası)
- [ ] `https://bry.ludenlab.com/healthz` → 200
- [ ] `https://bry.ludenlab.com` → BRY landing
- [ ] Tauri app (yeni sürüm) → lisans doğrulama OK (test lisansıyla)
- [ ] Test aboneliğiyle bir iyzico renewal → Studio webhook → bry.ludenlab.com forward → lisans uzar
- [ ] `brytakip.com` → 301 → bry.ludenlab.com

## Bende kalan (kod) — hazır olunca
- Tauri re-point diff'ini `luden-bkds`'te bir branch'e uygulamak (release zamanlamasını
  sen kontrol et diye main'e değil).
- F5'te: `packages/billing` (iyzico client + imza + ürün-yönlendirmeli router + pluggable
  fulfillment: studio=kredi · atolye=erişim · bry=lisans) — "tek webhook router" buraya iner.

## Neden monorepo'ya almıyoruz (özet)
Fastify + MySQL + ham SQL + Passenger; Next/Prisma/Postgres/pnpm hattıyla aynı değil.
UI paylaşılamıyor (yalnız API/lisans sözleşmesi). Tek-repo kazancı düşük, sürtünme + canlı
deploy riski yüksek. Re-domain hepsini çözer.
