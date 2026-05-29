# LudenLab — Çatı Monorepo

Luden'in tüm yazılım ürünlerini barındıran çatı. Tek domain (`ludenlab.com`) + subdomain modeli.

| Ürün | Subdomain | Açıklama | Durum |
|---|---|---|---|
| **Hub** | `ludenlab.com` | Vitrin — 3 servise yönlendiren tek sayfa | bu repo (`apps/hub`) |
| **Studio** | `studio.ludenlab.com` | Dil-konuşma-işitme (DKT) AI araçları SaaS'ı | canlı (Faz 5'te taşınacak) |
| **Atölye** | `atolye.ludenlab.com` | Özgül Öğrenme Bozukluğu (ÖÖB) & DEHB araçları | bu repo (`apps/atolye`) |
| **BRY Takip** | `bry.ludenlab.com` | Özel eğitim merkezi yoklama/lisans | Faz 4'te taşınacak |

## Yapı

```
ludenlab/
├── apps/
│   ├── hub/        # ludenlab.com — statik vitrin (output: export)
│   └── atolye/     # atolye.ludenlab.com — ÖÖB; ilk modül: BEP & Rapor Asistanı
├── packages/
│   ├── ui/         # Poster tasarım sistemi (React) — token + P* primitive'ler
│   ├── ai/         # Claude client + prompt kütüphanesi + kredi ölçümü
│   ├── billing/    # iyzico arayüz kabuğu (mantık Faz 5'te — bkz. ROADMAP.md)
│   └── config/     # paylaşılan tsconfig / eslint
└── ROADMAP.md      # fazlı plan
```

## Kurulum

```bash
corepack enable pnpm   # pnpm'i corepack üzerinden aktive et
pnpm install
pnpm dev               # tüm app'ler (turbo)
pnpm --filter @ludenlab/atolye dev   # tek app
```

## Toolchain

- **Node** ≥ 20 (`.nvmrc` → 22) · **pnpm** 9 (corepack) · **Turborepo** 2
- **Next.js** 16 · **React** 19 · **Tailwind** v4 (CSS-first) · **TypeScript** 5 (strict)
- Deploy: **Hostinger** (sunucu-app → standalone + hPanel Node; vitrin → static export + FTP). Vercel kullanılmıyor.

## Önemli kararlar

Mimari kararların gerekçeleri ve fazlı plan için **[ROADMAP.md](./ROADMAP.md)**.
