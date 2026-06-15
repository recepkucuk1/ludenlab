# Track 1 — BRY → brytakip.com (Standalone) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** BRY Takip'i LudenLab merkezi sisteminden tamamen ayır; `brytakip.com`'da kendi iyzico merchant'ıyla (`101029161`) standalone çalıştır.

**Architecture:** `brytakip-api` (Fastify+MySQL) zaten `CENTRAL_BILLING` flag'i kapalı = standalone. İş = (a) kullanıcıya görünen domain string'lerini `brytakip.ludenlab.com`→`brytakip.com` çevir (tek `WEB_URL`/`WEB_HOST` helper'ı üzerinden, env'le yönetilebilir); (b) Tauri desktop app'in API base'ini repoint + imzalı yeni sürüm; (c) iyzico merchant webhook'unu brytakip.com'a al; (d) Hostinger 301'ini tersine çevir (brytakip.com primary); (e) ludenlab hub'ından BRYTAKIP'i checkout yüzeyi + script'lerden çıkar. **Düşük risk:** brytakip.com + brytakip.ludenlab.com AYNI MySQL'i paylaşıyor (F4'ten); brytakip.com app'i zaten `/api`'yi sunuyor → "geri alma" temiz.

**Tech Stack:** Fastify 5 + TypeScript (ESM, `.js` import uzantıları) + mysql2 · `@ludenlab/billing` (iyzipay SDK) · Tauri 2 (Vue/Nuxt frontend) · ludenlab pnpm monorepo (Next 16 hub).

**Repo/branch haritası (her task hangi repoda commit'lenir):**
- **B1** → `/Users/recepkucuk/brytakip-api`, yeni branch `feat/resplit-standalone`
- **B2** → `/Users/recepkucuk/Downloads/luden-bkds`, yeni branch `feat/brytakip-com-repoint`
- **B3, B4** → kod yok; iyzico paneli + Hostinger (KULLANICI)
- **B5** → `/Users/recepkucuk/ludenlab`, mevcut branch `feat/resplit-architecture`

**Test notu (TDD adaptasyonu):** `brytakip-api`'de test harness YOK ve değişiklikler domain-string/config niteliğinde → unit test eklemek YAGNI. Doğrulama = `npm run build` (tsc) + `grep` (stale domain kalmadı) + deploy sonrası `curl` smoke + canlı lisans e2e. Mantık içeren tek yeni dosya (`web-url.ts`) saf türetme; build + grep yeterli. ludenlab B5 için: `pnpm lint && pnpm typecheck && pnpm run build` (lint gotcha: `next build` eslint'i çalıştırmaz — ayrı koş).

**Cutover sırası & güvenlik:** B1 (additive, brytakip.com app'i zaten canlı) → B3 (merchant webhook→brytakip.com) → B2 (Tauri 0.6.8 release) → install'lar auto-update → B4 (brytakip.ludenlab.com→301→brytakip.com; `/api` buffer'ı install'lar 0.6.8'e geçene kadar açık). B5 bağımsız, herhangi bir zamanda. Paylaşılan MySQL sayesinde interim'de her iki domain de çalışır → sıra esnek, correctness riski yok.

---

## Task B1.1: Paylaşılan `WEB_URL`/`WEB_HOST` helper'ı (brytakip-api)

**Files:**
- Create: `/Users/recepkucuk/brytakip-api/src/lib/web-url.ts`

- [ ] **Step 1: Branch aç**

```bash
cd /Users/recepkucuk/brytakip-api && git checkout -b feat/resplit-standalone
```

- [ ] **Step 2: Helper dosyasını oluştur**

`/Users/recepkucuk/brytakip-api/src/lib/web-url.ts`:

```ts
/**
 * BRY web yüzeyi (brytakip.com). Kullanıcıya görünen tüm linkler + CORS origin'i
 * buradan türetilir → domain tek yerden (env ile) yönetilir.
 *
 * BRYTAKIP_WEB_URL set değilse default https://brytakip.com.
 */
export const WEB_URL = (process.env.BRYTAKIP_WEB_URL || 'https://brytakip.com').replace(/\/+$/, '');

/** Şemasız host (prose: "brytakip.com adresinden ödeme yapın" gibi metinler için). */
export const WEB_HOST = WEB_URL.replace(/^https?:\/\//, '');
```

- [ ] **Step 3: Build doğrula**

Run: `cd /Users/recepkucuk/brytakip-api && npm run build`
Expected: tsc hatasız tamamlanır; `dist/lib/web-url.js` oluşur.

---

## Task B1.2: `server.ts` CORS allowlist → brytakip.com

**Files:**
- Modify: `/Users/recepkucuk/brytakip-api/src/server.ts:30` (import) + `:98-106` (CORS_ALLOWLIST)

- [ ] **Step 1: Import ekle**

Replace:
```ts
import cors from '@fastify/cors';
```
With:
```ts
import cors from '@fastify/cors';
import { WEB_URL } from './lib/web-url.js';
```

- [ ] **Step 2: CORS_ALLOWLIST'i değiştir** (ludenlab origin'lerini at, brytakip.com koy)

Replace:
```ts
  const CORS_ALLOWLIST = [
    'https://brytakip.ludenlab.com',
    'https://brytakip.ludenlab.com',          // eski domain — redirect öncesi cache veya bookmark
    'http://brytakip.ludenlab.com',
    'https://studio.ludenlab.com',   // ludenlab studio forward (server-to-server origin'siz olsa da)
    'tauri://localhost',
    'http://tauri.localhost',
    'https://tauri.localhost',
  ];
```
With:
```ts
  const CORS_ALLOWLIST = [
    WEB_URL,                          // https://brytakip.com (BRYTAKIP_WEB_URL ile override edilebilir)
    'https://www.brytakip.com',
    'https://brytakip.ludenlab.com',  // eski subdomain — 301 geçişi tamamlanana kadar buffer
    'tauri://localhost',              // macOS Tauri webview
    'http://tauri.localhost',         // Windows/Linux Tauri webview
    'https://tauri.localhost',
  ];
```

- [ ] **Step 3: Build doğrula**

Run: `cd /Users/recepkucuk/brytakip-api && npm run build`
Expected: hatasız.

---

## Task B1.3: `mailer.ts` linkleri → `WEB_URL`

**Files:**
- Modify: `/Users/recepkucuk/brytakip-api/src/lib/mailer.ts:19` (import) + `:80,156,178,253,272`

- [ ] **Step 1: Import ekle**

Replace:
```ts
import nodemailer, { type Transporter } from 'nodemailer';
```
With:
```ts
import nodemailer, { type Transporter } from 'nodemailer';
import { WEB_URL } from './web-url.js';
```

- [ ] **Step 2: admin link (satır 80)**

Replace:
```ts
  const adminUrl = 'https://brytakip.ludenlab.com/admin.html';
```
With:
```ts
  const adminUrl = `${WEB_URL}/admin.html`;
```

- [ ] **Step 3: "Uygulama indirme" text (satır 156)**

Replace:
```ts
    'Uygulama indirme: https://brytakip.ludenlab.com',
```
With:
```ts
    `Uygulama indirme: ${WEB_URL}`,
```

- [ ] **Step 4: "Uygulamayı İndir" HTML butonu (satır 178)**

Replace:
```ts
        <a href="https://brytakip.ludenlab.com" style="display: inline-block; padding: 8px 16px; background: #6b46c1; color: white; text-decoration: none; border-radius: 8px;">Uygulamayı İndir</a>
```
With:
```ts
        <a href="${WEB_URL}" style="display: inline-block; padding: 8px 16px; background: #6b46c1; color: white; text-decoration: none; border-radius: 8px;">Uygulamayı İndir</a>
```

- [ ] **Step 5: "Aboneliğinizi başlatın" text link (satır 253)**

Replace:
```ts
    `  https://brytakip.ludenlab.com/?email=${encodeURIComponent(input.to)}`,
```
With:
```ts
    `  ${WEB_URL}/?email=${encodeURIComponent(input.to)}`,
```

- [ ] **Step 6: "Aboneliği Başlat" HTML butonu (satır 272)**

Replace:
```ts
        <a href="https://brytakip.ludenlab.com/?email=${encodeURIComponent(input.to)}" style="display: inline-block; padding: 12px 22px; background: ${color}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Aboneliği Başlat</a>
```
With:
```ts
        <a href="${WEB_URL}/?email=${encodeURIComponent(input.to)}" style="display: inline-block; padding: 12px 22px; background: ${color}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Aboneliği Başlat</a>
```

- [ ] **Step 7: Build doğrula**

Run: `cd /Users/recepkucuk/brytakip-api && npm run build`
Expected: hatasız.

---

## Task B1.4: `license.ts` prose mesajları → `WEB_HOST`

**Files:**
- Modify: `/Users/recepkucuk/brytakip-api/src/routes/license.ts:20` (import) + `:119,121,122,155`

- [ ] **Step 1: Import ekle**

Replace:
```ts
import { centralBillingEnabled, reconcileFromCentral } from '../lib/central-billing.js';
```
With:
```ts
import { centralBillingEnabled, reconcileFromCentral } from '../lib/central-billing.js';
import { WEB_HOST } from '../lib/web-url.js';
```

- [ ] **Step 2: 3 hata mesajını değiştir (satır 119-122)**

Replace:
```ts
          lic.subStatus === 'TRIAL'
              ? 'Deneme süreniz doldu. Aboneliğinizi başlatmak için brytakip.ludenlab.com adresinden ödeme yapın.'
              : lic.subStatus === 'EXPIRED'
                ? 'Aboneliğiniz sona erdi. Yenilemek için brytakip.ludenlab.com adresinden ödeme yapın.'
                : 'Aboneliğiniz aktif değil. Detay için brytakip.ludenlab.com.',
```
With:
```ts
          lic.subStatus === 'TRIAL'
              ? `Deneme süreniz doldu. Aboneliğinizi başlatmak için ${WEB_HOST} adresinden ödeme yapın.`
              : lic.subStatus === 'EXPIRED'
                ? `Aboneliğiniz sona erdi. Yenilemek için ${WEB_HOST} adresinden ödeme yapın.`
                : `Aboneliğiniz aktif değil. Detay için ${WEB_HOST}.`,
```

- [ ] **Step 3: Yorum satırını güncelle (satır 155)**

Replace:
```ts
        // Tauri Settings'te 'Aboneliği Yönet' butonu için — brytakip.ludenlab.com'a
```
With:
```ts
        // Tauri Settings'te 'Aboneliği Yönet' butonu için — brytakip.com'a
```

- [ ] **Step 4: Build doğrula**

Run: `cd /Users/recepkucuk/brytakip-api && npm run build`
Expected: hatasız.

---

## Task B1.5: webhook yorumu + `.env.example` dokümantasyonu + stale-domain taraması

**Files:**
- Modify: `/Users/recepkucuk/brytakip-api/src/routes/iyzico-webhook.ts:8`
- Modify: `/Users/recepkucuk/brytakip-api/.env.example`

- [ ] **Step 1: webhook header yorumunu güncelle**

Replace:
```ts
 *   POST https://brytakip.ludenlab.com/api/webhooks/iyzico
```
With:
```ts
 *   POST https://brytakip.com/api/webhooks/iyzico
```

- [ ] **Step 2: `.env.example`'a iyzico + web-url + central-billing bölümü ekle**

`.env.example` sonuna (satır 27'den sonra) ekle:

```bash

# ─── iyzico (BRY kendi merchant'ı: 101029161) ───────────────
# brytakip.com'a kayıtlı merchant. Key'ler Hostinger env'inde (chat'e düşmez).
# PROD cutover'da rotate edilmiş key'leri gir.
IYZICO_API_KEY="prod-api-key"
IYZICO_SECRET_KEY="prod-secret-key"
IYZICO_MERCHANT_ID="101029161"
IYZICO_BASE_URL="https://api.iyzipay.com"
# setup-iyzico-product.ts çıktısı; mevcut BRY planı (249₺/ay):
IYZICO_PRICING_PLAN_REF="dd82b6e9-4196-494d-a562-6853a02a172a"

# ─── Web yüzeyi ─────────────────────────────────────────────
# Kullanıcıya görünen linkler + CORS. Set değilse default https://brytakip.com.
BRYTAKIP_WEB_URL="https://brytakip.com"

# ─── Merkezi billing (KAPALI = standalone) ──────────────────
# BRY artık ludenlab merkezine bağlı DEĞİL. Bu ikisini BOŞ/unset bırak.
# CENTRAL_BILLING=
# CENTRAL_BILLING_DATABASE_URL=
# APEX_URL=
```

- [ ] **Step 3: Stale domain taraması (tüm src)**

Run: `cd /Users/recepkucuk/brytakip-api && grep -rn "brytakip.ludenlab.com\|studio.ludenlab.com" src/`
Expected: **sadece** `src/server.ts`'teki buffer CORS satırı (`'https://brytakip.ludenlab.com',  // eski subdomain ... buffer`). Başka eşleşme YOK. (Başka çıkarsa o dosyayı da WEB_URL/WEB_HOST ile düzelt.)

- [ ] **Step 4: Final build + commit**

```bash
cd /Users/recepkucuk/brytakip-api && npm run build
git add src/lib/web-url.ts src/server.ts src/lib/mailer.ts src/routes/license.ts src/routes/iyzico-webhook.ts .env.example
git commit -m "feat(resplit): brytakip.com'a repoint — WEB_URL helper + domain stringleri + env docs

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Expected: build hatasız; commit oluştu.

---

## Task B1.6: Hostinger env + standalone teyidi (KULLANICI + doğrulama)

Bu task kod değil — `brytakip.com` Node app'inin env'ini ayarlama + standalone davranış teyidi.

- [ ] **Step 1: (KULLANICI) Hostinger → brytakip.com Node app → Environment** şu değerleri ayarla/teyit et:
  - `IYZICO_API_KEY` / `IYZICO_SECRET_KEY` = merchant **101029161**'in **rotate edilmiş PROD** key'leri
  - `IYZICO_MERCHANT_ID=101029161`
  - `IYZICO_BASE_URL=https://api.iyzipay.com`
  - `IYZICO_PRICING_PLAN_REF=dd82b6e9-4196-494d-a562-6853a02a172a`
  - `BRYTAKIP_WEB_URL=https://brytakip.com`
  - `CENTRAL_BILLING` → **BOŞ/unset** (standalone) · `CENTRAL_BILLING_DATABASE_URL`/`APEX_URL` → unset
  - Mevcut: `DATABASE_URL`, `ADMIN_TOKEN`, `SMTP_*`, `NOTIFY_EMAIL` korunur

- [ ] **Step 2: Deploy + smoke** (B1 commit'i brytakip.com app'ine deploy edildikten sonra)

Run:
```bash
curl -s -o /dev/null -w "%{http_code}" https://brytakip.com/
curl -s -o /dev/null -w "%{http_code}" -X POST https://brytakip.com/api/license/verify -H "Content-Type: application/json" -d '{}'
```
Expected: `/` → `200`; `/api/license/verify` POST → `400` (route çalışıyor, body eksik).

- [ ] **Step 3: Checkout standalone teyidi** — brytakip.com landing'de "Aboneliğinizi başlatın" akışı **apex'e DEĞİL** in-app iyzico formuna gitmeli (flag kapalı). Bir signup→checkout dene; iyzico formu brytakip.com üzerinde açılmalı.

---

## Task B2.1: Tauri desktop app API base + linkler → brytakip.com (luden-bkds)

**Files:**
- Modify: `/Users/recepkucuk/Downloads/luden-bkds/frontend/composables/useLicense.ts:8,24,137,142`
- Modify: `/Users/recepkucuk/Downloads/luden-bkds/frontend/pages/settings.vue:675`

- [ ] **Step 1: Branch aç**

```bash
cd /Users/recepkucuk/Downloads/luden-bkds && git checkout -b feat/brytakip-com-repoint
```

- [ ] **Step 2: `useLicense.ts` API_BASE (satır 24)**

Replace:
```ts
const API_BASE = 'https://brytakip.ludenlab.com';
```
With:
```ts
const API_BASE = 'https://brytakip.com';
```

- [ ] **Step 3: `useLicense.ts` signup URL (satır 137)**

Replace:
```ts
    let url = 'https://brytakip.ludenlab.com/#/signup';
```
With:
```ts
    let url = 'https://brytakip.com/#/signup';
```

- [ ] **Step 4: `useLicense.ts` panel URL (satır 142)**

Replace:
```ts
      url = `https://brytakip.ludenlab.com/?${qs.toString()}#/panel`;
```
With:
```ts
      url = `https://brytakip.com/?${qs.toString()}#/panel`;
```

- [ ] **Step 5: `useLicense.ts` doc yorumu (satır 8)**

Replace:
```ts
 *  4. `verify(key)` brytakip.ludenlab.com/api/license/verify'a POST atar
```
With:
```ts
 *  4. `verify(key)` brytakip.com/api/license/verify'a POST atar
```

- [ ] **Step 6: `settings.vue` lisans linki (satır 675)**

Replace:
```html
          <a href="https://brytakip.ludenlab.com" target="_blank" class="text-brand underline">brytakip.ludenlab.com</a>
```
With:
```html
          <a href="https://brytakip.com" target="_blank" class="text-brand underline">brytakip.com</a>
```

- [ ] **Step 7: Stale domain taraması**

Run: `cd /Users/recepkucuk/Downloads/luden-bkds && grep -rn "brytakip.ludenlab.com" frontend/ desktop/ | grep -v node_modules`
Expected: **hiç eşleşme yok**.

---

## Task B2.2: Sürüm bump 0.6.7 → 0.6.8 + commit

**Files:**
- Modify: `/Users/recepkucuk/Downloads/luden-bkds/desktop/src-tauri/tauri.conf.json:4`
- Modify: `/Users/recepkucuk/Downloads/luden-bkds/desktop/src-tauri/Cargo.toml` (version)

- [ ] **Step 1: tauri.conf.json version**

Replace:
```json
  "version": "0.6.7",
```
With:
```json
  "version": "0.6.8",
```

- [ ] **Step 2: Cargo.toml version** — `desktop/src-tauri/Cargo.toml`'da `[package]` altındaki `version = "0.6.7"` → `version = "0.6.8"`.

Run (doğrula): `grep -n '^version' /Users/recepkucuk/Downloads/luden-bkds/desktop/src-tauri/Cargo.toml`
Expected: `version = "0.6.8"`.

- [ ] **Step 3: Cargo.lock güncelle** (paket sürümü)

Run: `cd /Users/recepkucuk/Downloads/luden-bkds/desktop/src-tauri && cargo update -p brytakip-backend 2>/dev/null || cargo generate-lockfile`
Expected: `Cargo.lock`'ta paket version 0.6.8'e güncellenir. (Paket adı farklıysa `cargo metadata --no-deps` ile teyit et.)

- [ ] **Step 4: Commit**

```bash
cd /Users/recepkucuk/Downloads/luden-bkds
git add frontend/composables/useLicense.ts frontend/pages/settings.vue desktop/src-tauri/tauri.conf.json desktop/src-tauri/Cargo.toml desktop/src-tauri/Cargo.lock
git commit -m "feat(resplit): API base + linkler brytakip.com'a; v0.6.8

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 5: (KULLANICI) İmzalı release** — `git tag v0.6.8 && git push origin v0.6.8` → CI (macOS aarch64 + Windows x64, `TAURI_SIGNING_*` secrets) imzalı build + `latest.json`'ı GitHub Release'e basar. Updater endpoint zaten GitHub Releases (`tauri.conf.json:60`), değişiklik yok.

- [ ] **Step 6: Updater zinciri doğrula**

Run: `curl -sL https://github.com/recepkucuk1/luden-bkds/releases/latest/download/latest.json | grep -E '"version"|signature' | head`
Expected: `"version": "0.6.8"` + iki platform için signature alanı dolu.

- [ ] **Step 7: (KULLANICI) Bir test install'ı 0.6.8'e güncelle** → Ayarlar'da sürüm 0.6.8 + lisans aktif (artık brytakip.com'a gidiyor). Bu, B4'teki 301'i güvenli kılar.

---

## Task B3: iyzico merchant 101029161 webhook → brytakip.com (KULLANICI)

Kod yok. iyzico panelinde merchant **101029161** ayarları.

- [ ] **Step 1:** iyzico panel → merchant 101029161 → **Webhook URL** → `https://brytakip.com/api/webhooks/iyzico` (success+failure aynı uç).
- [ ] **Step 2:** Checkout callback/return referansları brytakip.com'u gösteriyor (kod `req.hostname`'den türetiyor — `subscription.ts:153` — ekstra ayar gerekmez; panel tarafında sabit bir return URL varsa brytakip.com yap).
- [ ] **Step 3 (NOT — interim):** Bu merchant'ta hâlâ Studio+Atölye ürünleri var ama **gerçek recurring ödeyen YOK** → webhook'u brytakip.com'a almak studio+atolye'yi etkilemez (onlar Track 2'de YENİ merchant'a geçecek). Studio+Atölye ürünleri bu merchant'tan Track 2/S0'da silinecek.
- [ ] **Step 4: Doğrula** — küçük bir gerçek/sandbox abonelik event'i brytakip.com webhook'una düşüyor mu (log/DB'de `Subscription` güncellendi mi).

---

## Task B4: Hostinger 301 tersine çevir — brytakip.com primary (KULLANICI)

Kod yok. **Önkoşul:** B2 Step 7 (install'lar 0.6.8'de, brytakip.com'a gidiyor).

- [ ] **Step 1:** Hostinger → `brytakip.com` → **Domains → Redirects** → mevcut `brytakip.com → brytakip.ludenlab.com` 301'ini **KALDIR**. brytakip.com Node app'i kökü doğrudan sunar.
- [ ] **Step 2:** `brytakip.ludenlab.com` → **301 → brytakip.com** (kök `/`). **Buffer:** `/api/*` alt-path'leri brytakip.ludenlab.com app'inde bir süre daha açık kalsın (güncellenmemiş 0.6.7 install'ları lisans POST'u atabilsin; aynı MySQL).
- [ ] **Step 3: Doğrula**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}" https://brytakip.com/
curl -s -o /dev/null -w "%{http_code} %{redirect_url}" https://brytakip.ludenlab.com/
```
Expected: brytakip.com `/` → `200`; brytakip.ludenlab.com `/` → `301` → `https://brytakip.com/`.

- [ ] **Step 4 (sonra, opsiyonel):** Tüm install'lar 0.6.8 olduğuna emin olunca `brytakip.ludenlab.com` Node app'ini SİL (tam emeklilik; MySQL ayrı kaynak, silinmez).

---

## Task B5.1: Hub checkout yüzeyinden BRYTAKIP'i çıkar (ludenlab)

**Files:**
- Modify: `/Users/recepkucuk/ludenlab/packages/billing/src/urls.ts:6,10-14,30-32`
- Modify: `/Users/recepkucuk/ludenlab/apps/hub/src/app/odeme/page.tsx:6,41`
- Modify: `/Users/recepkucuk/ludenlab/apps/hub/src/app/api/odeme/init/route.ts:8`

> **Kapsam kararı:** `BillingModule` enum'u (Prisma `schema.prisma` + `0001_init_billing.sql` + generated client) ve `entitlement.ts` type union'ları **DOKUNULMAZ** — bir enum değerini canlı Postgres'ten DROP etmek riskli DDL (Prisma drift disiplini) ve gereksiz. BRYTAKIP enum değeri **inert** kalır; Track 2/S0'da merkezi tablolar yeni merchant için yeniden kurulurken doğal olarak düşer. B5 yalnız **checkout yüzeyi + script + plan satırı**nı temizler.

- [ ] **Step 1: `urls.ts` — CheckoutModule + MODULE_BASE_URL + moduleReturnUrl**

Replace:
```ts
export type CheckoutModule = "STUDIO" | "ATOLYE" | "BRYTAKIP";
export type CheckoutInterval = "MONTHLY" | "YEARLY";

const APEX_URL = "https://ludenlab.com";
const MODULE_BASE_URL: Record<CheckoutModule, string> = {
  STUDIO: "https://studio.ludenlab.com",
  ATOLYE: "https://atolye.ludenlab.com",
  BRYTAKIP: "https://brytakip.ludenlab.com",
};
```
With:
```ts
export type CheckoutModule = "STUDIO" | "ATOLYE";
export type CheckoutInterval = "MONTHLY" | "YEARLY";

const APEX_URL = "https://ludenlab.com";
const MODULE_BASE_URL: Record<CheckoutModule, string> = {
  STUDIO: "https://studio.ludenlab.com",
  ATOLYE: "https://atolye.ludenlab.com",
};
```

- [ ] **Step 2: `urls.ts` — moduleReturnUrl BRYTAKIP özel-durumunu kaldır**

Replace:
```ts
/** Ödeme sonrası kullanıcının döneceği modül subdomain URL'i. */
export function moduleReturnUrl(module: CheckoutModule, path?: string): string {
  // BRYTAKIP (Fastify SPA) `/abonelik` route'u yok → landing'e (`/`) dön; oradaki status
  // poll'u reconcile eder. Studio/Atölye (Next) `/abonelik`'i sunar.
  const p = path ?? (module === "BRYTAKIP" ? "/" : "/abonelik");
  return `${MODULE_BASE_URL[module]}${p}`;
}
```
With:
```ts
/** Ödeme sonrası kullanıcının döneceği modül subdomain URL'i. */
export function moduleReturnUrl(module: CheckoutModule, path?: string): string {
  // Studio/Atölye (Next) `/abonelik`'i sunar.
  const p = path ?? "/abonelik";
  return `${MODULE_BASE_URL[module]}${p}`;
}
```

> Not (B5.1 sonrası bilgi): `urls.ts:3` yorumundaki "STUDIO | ATOLYE | BRYTAKIP" ifadesi artık eski — istersen yorumu "STUDIO | ATOLYE" yap (zorunlu değil, sadece yorum).

- [ ] **Step 3: `odeme/page.tsx` — MODULES + cast**

Replace:
```tsx
const MODULES = ["STUDIO", "ATOLYE", "BRYTAKIP"];
```
With:
```tsx
const MODULES = ["STUDIO", "ATOLYE"];
```

Replace:
```tsx
            module: moduleParam as "STUDIO" | "ATOLYE" | "BRYTAKIP",
```
With:
```tsx
            module: moduleParam as "STUDIO" | "ATOLYE",
```

- [ ] **Step 4: `api/odeme/init/route.ts` — MODULES**

Replace:
```ts
const MODULES = ["STUDIO", "ATOLYE", "BRYTAKIP"] as const;
```
With:
```ts
const MODULES = ["STUDIO", "ATOLYE"] as const;
```

- [ ] **Step 5: typecheck + lint**

Run: `cd /Users/recepkucuk/ludenlab && pnpm typecheck && pnpm lint`
Expected: hub + billing yeşil. (Hata çıkarsa: BRYTAKIP'i `CheckoutModule` ile çağıran başka bir yer kalmış demektir → bul ve düzelt.)

---

## Task B5.2: Bootstrap + prod-ref script'lerinden BRYTAKIP'i çıkar

**Files:**
- Modify: `/Users/recepkucuk/ludenlab/apps/hub/scripts/bootstrap-iyzico.mjs:79-83`
- Modify: `/Users/recepkucuk/ludenlab/apps/hub/scripts/set-prod-plan-refs.mjs:28`

- [ ] **Step 1: `bootstrap-iyzico.mjs` SPEC'ten BRYTAKIP girişini sil**

Replace:
```js
  {
    module: "ATOLYE",
    product: "LudenLab Atölye",
    plans: [
      { code: "PRO", interval: "MONTHLY", price: 449 },
      { code: "PRO", interval: "YEARLY", price: 4579.8 },
      { code: "ADVANCED", interval: "MONTHLY", price: 1999 },
      { code: "ADVANCED", interval: "YEARLY", price: 20389.8 },
    ],
  },
  {
    module: "BRYTAKIP",
    product: "BRY Takip",
    plans: [{ code: "STANDARD", interval: "MONTHLY", price: 279 }],
  },
];
```
With:
```js
  {
    module: "ATOLYE",
    product: "LudenLab Atölye",
    plans: [
      { code: "PRO", interval: "MONTHLY", price: 449 },
      { code: "PRO", interval: "YEARLY", price: 4579.8 },
      { code: "ADVANCED", interval: "MONTHLY", price: 1999 },
      { code: "ADVANCED", interval: "YEARLY", price: 20389.8 },
    ],
  },
];
```

- [ ] **Step 2: `set-prod-plan-refs.mjs` PROD_REFS'ten BRYTAKIP satırını sil**

Replace:
```js
  ["ATOLYE", "ADVANCED", "YEARLY", "8fa33f9f-5487-4ddd-9c35-c07dcc15aa81"],
  ["BRYTAKIP", "STANDARD", "MONTHLY", "dd82b6e9-4196-494d-a562-6853a02a172a"],
];
```
With:
```js
  ["ATOLYE", "ADVANCED", "YEARLY", "8fa33f9f-5487-4ddd-9c35-c07dcc15aa81"],
];
```

- [ ] **Step 3: Syntax doğrula**

Run: `cd /Users/recepkucuk/ludenlab && node --check apps/hub/scripts/bootstrap-iyzico.mjs && node --check apps/hub/scripts/set-prod-plan-refs.mjs`
Expected: çıktı yok (syntax OK).

---

## Task B5.3: Merkezi DB'den BRY BillingPlan satırını sil + commit

**Files:**
- Çalıştır: pg DELETE (HUB_DATABASE_URL) — `apps/hub/.env`

> **Güvenlik:** Bu **veri temizliği** (DELETE), DDL değil → düşük risk. Enum değeri DROP edilMEZ (B5.1 notu). BRYTAKIP `Subscription` satırı **olmamalı** (gerçek BRY abonesi merkeze hiç girmedi); yine de önce SELECT ile say.

- [ ] **Step 1: Önce say (dry görünüm)**

Run (apps/hub içinden):
```bash
cd /Users/recepkucuk/ludenlab/apps/hub && node --env-file=.env -e '
import("pg").then(async ({ default: pg }) => {
  const c = new pg.Client({ connectionString: process.env.HUB_DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const p = await c.query(`SELECT count(*) FROM billing."BillingPlan" WHERE module=$1`, ["BRYTAKIP"]);
  const s = await c.query(`SELECT count(*) FROM billing."Subscription" WHERE module=$1`, ["BRYTAKIP"]);
  console.log("BRYTAKIP BillingPlan:", p.rows[0].count, "| Subscription:", s.rows[0].count);
  await c.end();
});'
```
Expected: `BillingPlan: 1` (bootstrap'tan), `Subscription: 0`. Eğer Subscription > 0 ise DUR ve incele (beklenmedik).

- [ ] **Step 2: Sil**

Run (apps/hub içinden):
```bash
cd /Users/recepkucuk/ludenlab/apps/hub && node --env-file=.env -e '
import("pg").then(async ({ default: pg }) => {
  const c = new pg.Client({ connectionString: process.env.HUB_DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`DELETE FROM billing."BillingPlan" WHERE module=$1`, ["BRYTAKIP"]);
  console.log("Silinen BillingPlan satırı:", r.rowCount);
  await c.end();
});'
```
Expected: `Silinen BillingPlan satırı: 1`.

- [ ] **Step 3: Full doğrulama (lint + typecheck + build)**

Run: `cd /Users/recepkucuk/ludenlab && pnpm lint && pnpm typecheck && pnpm run build`
Expected: üçü de yeşil (lint `next build`'ten ayrı — gotcha). Build `apps/hub/.next/standalone` üretir.

- [ ] **Step 4: Commit**

```bash
cd /Users/recepkucuk/ludenlab
git add packages/billing/src/urls.ts apps/hub/src/app/odeme/page.tsx apps/hub/src/app/api/odeme/init/route.ts apps/hub/scripts/bootstrap-iyzico.mjs apps/hub/scripts/set-prod-plan-refs.mjs
git commit -m "feat(resplit): hub checkout yüzeyinden BRYTAKIP'i çıkar (B5)

BRY artık brytakip.com'da standalone. CheckoutModule/MODULES/return-url +
bootstrap/set-prod script'lerinden BRYTAKIP kaldırıldı; central BillingPlan
satırı silindi. BillingModule enum değeri inert bırakıldı (Track 2'de düşecek).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Self-Review (writing-plans)

**1. Spec coverage (ARCHITECTURE_RESPLIT §5, B1-B5):**
- B1 (sertleştir: flag off teyit + domain string + BRYTAKIP_WEB_URL + iyzico key/plan) → Task B1.1–B1.6 ✓
- B2 (Tauri repoint + imzalı release + updater doğrula) → Task B2.1–B2.2 ✓
- B3 (iyzico merchant webhook → brytakip.com) → Task B3 ✓
- B4 (Hostinger 301 geri al + brytakip.ludenlab.com→301; e2e) → Task B4 ✓
- B5 (hub enum/bootstrap/router/return-url/migrate temizliği; plan satırı) → Task B5.1–B5.3 ✓ (enum'un bilinçli inert bırakılması §5/§9 disiplinine uygun)

**2. Placeholder taraması:** Tüm kod-değişen adımlar tam before/after blok içeriyor; "TBD/uygun şekilde" yok. ✓

**3. Tip tutarlılığı:** `WEB_URL`/`WEB_HOST` B1.1'de tanımlandı, B1.2/1.3 `WEB_URL`, B1.4 `WEB_HOST` kullanıyor — tutarlı. `CheckoutModule` B5.1'de daraltıldı; tüm BRYTAKIP kullanıcıları (odeme page/init, moduleReturnUrl) aynı task'ta güncellendi. ✓

**4. Açık bağımlılık:** B5'te enum DROP edilmiyor (riskli DDL); `entitlement.ts`/`schema.prisma` BRYTAKIP içermeye devam eder (inert, DB ile tutarlı). `migrate-subscriptions.mjs` BRYTAKIP'i zaten modül-listesinden türetiyorsa ek dokunuş gerekmez; çalıştırılmıyor (Track 1'de göç yok).

---

## Execution Handoff

Plan tamam. İki yürütme seçeneği:
1. **Subagent-Driven (önerilen)** — her task için taze subagent, task'lar arası review, hızlı iterasyon.
2. **Inline Execution** — bu oturumda executing-plans ile checkpoint'li toplu yürütme.
