# S1 — Studio → Monorepo (`apps/studio`) · Tamamlandı

> **Durum (2026-06-16, otonom):** Studio (terapimat) monorepo'ya **`apps/studio`** olarak
> taşındı. **typecheck 6/6 + build YEŞİL.** Branch `feat/studio-monorepo` — **deploy EDİLMEDİ,
> main'e merge EDİLMEDİ.** terapimat (canlı Studio) **DOKUNULMADI**, çalışmaya devam ediyor (kopya).
>
> ⚠️ **Bu S1 = "monorepo'ya saf taşıma, davranış değişmez."** Studio HÂLÂ kendi standalone app'i
> olarak derleniyor — henüz `ludenlab.com/studio` path'i altında DEĞİL (o = **S2**, ayrı faz).

---

## Yapılanlar

1. **Kopya:** `terapimat/` → `apps/studio/` (rsync; node_modules/.next/.git/.env/.claude hariç). Canlı repo'ya dokunulmadı.
2. **package.json:** `@ludenlab/studio`, `type:module`, monorepo script'leri (build=`next build && node scripts/postbuild.mjs`, start=standalone), **`@ludenlab/billing` → `workspace:*`** (npm registry yerine). Diğer tüm dep'ler korundu (Sentry, shadcn/@base-ui, @react-pdf, anthropic, vb.).
3. **next.config.ts:** atolye monorepo reçetesi — `output:standalone` + `outputFileTracingRoot:../..` + `transpilePackages:[@ludenlab/billing]` + `serverExternalPackages:[iyzipay]` + **Studio CSP header'ları korundu** + **Sentry wrap (`withSentryConfig`) korundu**. terapimat'ın elle `outputFileTracingIncludes` listesi → `scripts/postbuild.mjs` (atolye'nin iyzipay FLAT-kopya reçetesi) ile değiştirildi.
4. **Prisma clobber fix (KRİTİK):** atolye default `@prisma/client` kullanıyor → Studio çakışmasın diye **hub deseni**: generator `prisma-client` + `output:../src/generated/prisma` + `runtime:nodejs`. 13 dosyada `@prisma/client` → `@/generated/prisma/client` (seed.ts relative). `src/generated` gitignore'lu (postinstall `prisma generate` üretir).
5. **`@ludenlab/billing` tip fix:** `packages/billing/src/iyzico-client.ts` — `subscription.upgrade` için **yapısal `as unknown as` cast** eklendi. Neden: workspace `exports` billing'in **kaynağını** sunuyor → her consumer (studio/atolye/hub) billing kaynağını derliyor; `@types/iyzipay`'in `subscription` tipinde `upgrade` yok (SDK'da runtime'da var). Studio bağlamında bu hata veriyordu (billing kendi bağlamında geçiyordu). Cast **runtime'ı değiştirmez** (tip-seviyesi, JS'e erase olur) → atolye/hub typecheck/build ETKİLENMEZ (6/6 doğrulandı).
6. **pnpm install** (`--no-frozen-lockfile`): studio workspace'e bağlandı, lockfile güncellendi, postinstall `prisma generate` 3 app için de çalıştı (clobber yok).

## Doğrulama (kanıtlı)

| Kontrol | Sonuç |
|---|---|
| `pnpm typecheck` (turbo, tüm workspace) | ✅ **6/6** (ai·ui·billing·hub·atolye·studio) |
| `pnpm --filter @ludenlab/studio build` | ✅ **YEŞİL** — tam route tablosu, `proxy.ts` middleware tanındı, postbuild iyzipay closure (71 paket) + static→standalone |
| `pnpm --filter @ludenlab/studio lint` | ⚠️ **60 error + 15 warning** — hepsi **pre-existing terapimat** (`no-explicit-any` vb.); aynı kod, **migration regresyonu DEĞİL**. `next build` lint çalıştırmaz → **build/deploy bloke olmaz.** |

## Senin yapacakların / gözden geçirmen (S1 sonrası)

- [ ] **`apps/studio/.env`** terapimat'tan **kopyalandı** (build için; gitignored, commit edilmedi). İçinde terapimat'ın local/prod secret'ları var. İleride Studio monorepo'dan AYRI deploy edilecekse (S5 cutover) bu env'i gözden geçir/yönet. **Şu an canlı Studio hâlâ terapimat'tan çalışıyor — bu env sadece local build/dev için.**
- [ ] **Lint borcu (opsiyonel):** 60 `no-explicit-any` hatası terapimat'tan geliyor. İstersen ayrı bir temizlik task'ı. `pnpm lint` (turbo, tüm workspace) bu yüzden kırmızı döner — atolye/hub/billing yeşil, sadece studio'da.
- [ ] **S2 kararı (sıradaki faz):** Studio'yu `ludenlab.com/studio` PATH'i altına almak = ayrı, en yüksek riskli faz (tek-app birleştirme). Bunun için ayrı brainstorm + detaylı plan gerekir (sabah konuşuruz).
- [ ] **Merchant başvurusu** (S0) — Track 2 billing için; lead-time'da.

## NE YAPILMADI (sonraki fazlar — bilinçli)

- ❌ **Deploy yok** — apps/studio main'e merge/deploy edilmedi; terapimat canlı Studio'yu sunmaya devam.
- ❌ **S2 (tek-app birleştirme)** — Studio hâlâ kendi standalone app'i; `/studio` path'i altında değil.
- ❌ **Studio UI → @ludenlab/ui dönüşümü** — Studio kendi shadcn UI'ını koruyor (saf taşıma; dönüşüm istenirse ayrı iş).
- ❌ **Billing merkezi-entegrasyon (S3)** — `central-billing.ts` köprüsü + flag olduğu gibi taşındı, dokunulmadı.

## Branch / commit

`feat/studio-monorepo` (main'den). Değişenler: `apps/studio/**` (yeni) + `packages/billing/src/iyzico-client.ts` (cast) + `pnpm-lock.yaml`. Review için hazır; merge/deploy **senin onayınla, S2 planından sonra**.
