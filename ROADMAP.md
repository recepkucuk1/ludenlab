# LudenLab — Yol Haritası

> Çatı + subdomain modeli. **iyzico/billing en sona** alındı: yeni billing kodu ve
> Atölye ücretlendirmesi son fazda. Studio'nun **mevcut canlı billing'ine hiç
> dokunulmaz** — merchant'ın tek webhook ingress'i o, süreç boyunca öyle kalır.

## Kilitli kararlar

- **Çatı = LudenLab.** Tek tüzel kişi, **tek iyzico merchant**, tek domain (`ludenlab.com`).
- **Monorepo** (Turborepo + pnpm) — React/Next app'leri + ortak paketler için. BRY'nin
  Tauri yerel app'i (Vue/Nuxt) monorepo dışı; sadece TS lisans-sözleşmesini paylaşır.
- **iyzico tek inbound webhook** = panelde tanımlı tek URL (kodda değil). Bu uç ince bir
  **router**'dır (en olgun app Studio'da durur), abonelik ref'ine göre ürüne dağıtır:
  studio→kredi · atolye→erişim · bry→lisans. `callbackUrl` per-request → her ürün kendi
  subdomain'ine döner. Yani billing "2-3-4'te", tek inbound uç hariç.
- **Hosting: her şey Hostinger.** Sunucu-app → `output: standalone` + hPanel Node app;
  vitrin → `output: export` + FTP. **Edge middleware kullanılamaz** (Hostinger build'i
  patlatıyor → auth route handler'larda). Vercel yok.
- **Veri sınırları:** Atölye klinik verisi **ayrı DB + sıkı RLS** (versiyonlu SQL
  migration, asla `db push`). Çocuk adı yerine **kod/rumuz**. AI çıktıları "taslak —
  uzman onayı gerekir".
- **Ortak kimlik:** merkezi `Account/Organization` (kimlik + billing); klinik/PII
  ürün-içinde izole. SSO geç gelir ama şema gün 1'den ortak.

## Fazlar

### Faz 2 — Monorepo temeli + Hub + Atölye (ücretsiz beta) · ŞİMDİ
- Turborepo + pnpm workspace; `packages/{config,ui,ai}`; `packages/billing` **yalnız
  arayüz kabuğu** (canlı çağrı yok).
- `packages/ui`: poster tasarım sistemi (Studio token'larından çıkarıldı) — ortak
  tasarım dilinin temeli.
- `apps/hub`: 3 servise yönlendiren statik vitrin → `ludenlab.com` (geçici subdomain'de
  yayınlanır; `ludenlab.com` swap'i Faz 5'te).
- `apps/atolye`: greenfield Next (standalone), poster-first. İlk modül **BEP & Rapor
  Asistanı** (3 çıktı: BEP hedef taslağı / ilerleme raporu / aile özeti). Ayrı klinik
  DB + RLS. Ortak `Account` şeması. **Ücretsiz/kapalı beta** (billing yok).
- CI: turbo lint + typecheck + build. Her app/pakette `.env.example`.

### Faz 3 — Atölye derinleşir + tasarım sistemi olgunlaşır
- Atölye'ye ek modüller; `packages/ui` genişler. Hâlâ ücretsiz.

### Faz 4 — BRY web göçü (billing dışı kısımlar)
- `brytakip-api` → `apps/bry`. Landing + lisans-doğrulama yüzeyi `bry.ludenlab.com`.
  Tauri app'in lisans ucu re-point. `brytakip.com` → 301. (Sadece test aboneliği var,
  temiz kesim.)

### Faz 5 — Studio göçü + cutover + TÜM iyzico konsolidasyonu (FINAL)
- `luden` → `apps/studio`; in-repo billing'i `packages/billing`'e çökert; npm→pnpm.
- **Cutover:** hub `ludenlab.com`'u devralır, Studio `studio.ludenlab.com`'a geçer →
  **iyzico panel webhook URL + `NEXTAUTH_URL` + DNS** eşzamanlı güncellenir.
- Tek webhook router'ı 3 ürüne genelleştir; Atölye ücretli plana geçer; BRY lisans
  fulfillment. Forward köprüsü emekli.
- Birleşik **SSO** + observability (`/admin/audit`, `/admin/webhooks`).

## Sadece kullanıcı yapabilir (CLI dışı)
- hPanel'de subdomain başına Node.js app + DNS (tek seferlik).
- iyzico panelinde webhook URL ayarı/değişimi (özellikle Faz 5 cutover).
- Atölye KVKK rıza/yasal metin içerikleri.
