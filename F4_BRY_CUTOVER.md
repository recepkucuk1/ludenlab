# Faz 4 — BRY web göçü (brytakip.ludenlab.com) · Cutover Runbook

> **Karar:** `brytakip-api` kendi reposunda/stack'inde kalır (Fastify + MySQL + Passenger);
> Next/pnpm monorepo'ya TAŞINMAZ. iyzico **tek merchant** üzerinden kalır (zaten öyle);
> temiz billing router'ı F5'te (Studio + `packages/billing`) gelir.

---

## ✅ DURUM (2026-05-31) — kod & release TARAFI TAMAM

| # | Adım | Durum |
|---|------|-------|
| 1 | `brytakip.ludenlab.com` ayağa kalksın | ✅ **AYRI yeni Node.js Web App** (re-domain DEĞİL), ludenlab.com altında, repo `recepkucuk1/brytakip-api`, brytakip.com app'inin build+env'i birebir kopya (npm · `dist/server.js` · **aynı MySQL** + iyzico key'leri). `/` 200, `/api/license/verify` POST 400. |
| 2 | DNS | ✅ subdomain Hostinger DNS'inde, SSL auto. |
| 3 | Tauri re-point + release | ✅ luden-bkds `4bd5b0a`, **v0.6.7** imzalı release (macOS+Windows), `latest.json` GitHub Release'de. |
| 4 | Billing forward'ı çevir | ⏸️ **ERTELENDİ** (billing/EN SON). |
| 5 | iyzico paneli | ⏸️ **ERTELENDİ** (billing/EN SON). |
| 6 | `brytakip.com` → 301 | 🔴 **KALAN** — install 0.6.7'ye geçtiği teyit edilince (aşağıda). |

> **ÖNEMLİ FARK (plandan sapma):** `bry.ludenlab.com` değil **`brytakip.ludenlab.com`** kullanıldı.
> Re-domain yerine **iki app paralel** çalışıyor (brytakip.com + brytakip.ludenlab.com, aynı DB) —
> böylece eski Tauri install'ları (0.6.6) kırılmadı; auto-update ile 0.6.7'ye geçiyorlar.

---

## Yapılanın detayı (referans)

### Tauri re-point (luden-bkds `4bd5b0a`)
- `frontend/composables/useLicense.ts`: `API_BASE` (24) + openCheckout signup/panel (137/142) → `brytakip.ludenlab.com`
- `frontend/pages/settings.vue:675`: lisans linki → `brytakip.ludenlab.com`
- `desktop/src-tauri/tauri.conf.json`: ölü `brytakip.com/updates/latest.json` updater endpoint **kaldırıldı**
  (manifest zaten **GitHub Releases**'tan = `.github/workflows/build.yml`; o endpoint hep 404'tü).
- **Korundu (bilinçli):** ekran-metni marka ref'leri (index.vue mesajları, offline footer),
  `mailto:info@brytakip.com`, localStorage key'leri (`brytakip-license`/`brytakip-machine-id`).
- Sürüm 0.6.6 → **0.6.7** (tauri.conf + Cargo.toml + Cargo.lock).

### Release / imzalama
- Tetikleyici: `git tag v*` push → CI macOS aarch64 + Windows x64 build, **`TAURI_SIGNING_*` repo secrets** ile imzalı.
  (İmza CI'da; lokal anahtar gerekmiyor.) `latest.json` → GitHub Release'e basılır.
- Updater zinciri doğrulandı: `latest.json` → version 0.6.7, iki platform, signature ✓.

---

## 🔴 KALAN ADIM — `brytakip.com` → 301 — **[SEN: Hostinger]**

**Önce (1 dk):** bir test install'ı yeniden başlat → Ayarlar'da sürüm **0.6.7** görünsün +
lisans aktif kalsın (artık brytakip.ludenlab.com'a gidiyor). Bu, hiçbir install'ın
brytakip.com'a bağımlı kalmadığını garanti eder — sonra 301 güvenli.

**Sonra:** Hostinger → `brytakip.com` sitesi → **Domains → Redirects** →
`brytakip.com` → `https://brytakip.ludenlab.com` (301, kalıcı).
- Bu redirect, brytakip.com'daki Node app'in yerine geçer (app efektif emekli olur).
- 301 GET için sorunsuz; install'lar 0.6.7'de olduğu için POST lisans çağrısı zaten
  doğrudan brytakip.ludenlab.com'a gidiyor (brytakip.com'a değil) → 301'in POST'u bozması sorun değil.

**En son (opsiyonel):** brytakip.com Node app'i silinebilir (redirect yeterli).

---

## ⏸️ ERTELENEN (billing/EN SON — kullanıcı kararı)
- **Studio hPanel env:** `BRYTAKIP_WEBHOOK_URL=https://brytakip.ludenlab.com/api/webhooks/iyzico`
  (BRY abonelik event'leri ludenlab merchant webhook'undan brytakip.ludenlab.com'a forward).
- **iyzico paneli:** merchant webhook URL'i değişmez; BRY checkout callback/return `brytakip.com`
  referans ediyorsa `brytakip.ludenlab.com`'a güncelle (brytakip-api `.env`).
- **F5/billing:** ad-hoc forward → `packages/billing` ürün-yönlendirmeli tek router.
- **NOT:** iyzico panel webhook'u şu an `ludenlab.com`'a (parked) bakıyor → event'ler DÜŞMÜYOR;
  billing fazında `studio.ludenlab.com/api/webhooks/iyzico`'ya çevrilecek (bkz. umbrella memory).

## Doğrulama (cutover sonrası) — ✅ TAMAM (2026-05-31)
- [x] `brytakip.ludenlab.com/` → 200 (BRY)
- [x] `brytakip.ludenlab.com/api/license/verify` POST → 400 (route çalışıyor)
- [x] v0.6.7 imzalı release + `latest.json` (updater zinciri version 0.6.7 + sig ✓)
- [x] Tauri app 0.6.7'ye güncellendi → lisans aktif (brytakip.ludenlab.com)
- [x] `brytakip.com` + `www` → **301 → brytakip.ludenlab.com** (kök `/`)

### Redirect nüansı (önemli)
Hostinger panel Redirect yalnız **kök `/`**'u yönlendiriyor; `/api/*` alt-path'leri hâlâ
eski **brytakip.com Node app**'i sunuyor (Passenger app'i intercept ediyor, panel redirect'i
bypass'lıyor). Bu **kasıtlı tampon**: güncellenmemiş 0.6.6 install'ı varsa lisans POST'u
çalışmaya devam eder; SPA hash-link'leri (`/#/panel`) tarayıcıda fragment korunarak yönlenir.

### Tam emeklilik (opsiyonel, sonra)
Tüm install'lar 0.6.7 olduğuna emin olunca **brytakip.com Node app'ini SİL** (Hostinger website).
DB ayrı kaynak → silinmez. App gidince `/api/*` de redirect'e/404'e düşer = brytakip.com tamamen emekli.
