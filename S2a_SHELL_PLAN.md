# S2a — Birleşik Shell (Hesap + Launcher + Onboarding) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hub'ı büyüt: tek `Account` ile **`/hesap`** (hesap + modül launcher + billing paneli) + kayıt sonrası `/hesap` onboarding'i (ücretsiz başla **veya** abone ol) + landing'de "Hesabım" linki.

**Architecture:** Hub'da merkezi `billing.Account` auth + `/odeme` checkout + `getEntitlement(accountId, module)` ZATEN var (`S2_MERGE.md` §0). S2a bunların üstüne **salt shell** ekler: `/hesap` server-component'i merkezi `Subscription`'dan per-modül entitlement + `BillingPlan` okur; abone-ol linkleri mevcut `/odeme` akışını tetikler; FREE = abonelik yokluğu (yeni kayıt = FREE). studioDb/atolyeDb client'ları ve modül yüzeyleri **S2b/c'de** (YAGNI — burada gerekmez).

**Tech Stack:** Next 16 (App Router, server components) · next-auth v5 (`@/auth`) · Prisma (`@/lib/db` = billing şeması) · `@ludenlab/ui` (poster: `PCard`; CSS sınıfları `p-eyebrow`/`p-h3`/`p-body`; `--poster-*` değişkenleri) · `@ludenlab/billing` (`getEntitlement`/`resolveEntitlement`).

**Branch:** `feat/studio-monorepo` (S1 + S2 spec üstüne; **deploy YOK** — S5'e kadar branch-only).

**Test notu:** hub'da test harness YOK → doğrulama = `pnpm --filter @ludenlab/hub typecheck` + `build` + **dev smoke** (kayıt → /hesap render → abone-ol → /odeme sandbox formu). Authed sayfa olduğu için curl yerine dev server + tarayıcı/manuel smoke.

---

## File Structure

- **Create** `apps/hub/src/app/hesap/page.tsx` — server component; auth gate + per-modül entitlement + plan listesi + modül kartları (launcher + abone-ol). Tek sorumluluk: birleşik hesap/launcher ekranı.
- **Modify** `apps/hub/src/app/kayit/page.tsx:48` — kayıt sonrası varsayılan yönlendirme `/` → `/hesap` (onboarding).
- **Modify** `apps/hub/src/app/page.tsx` (TopBar, ~satır 29-33) — nav'a "Hesabım" linki (`/hesap`).

Mevcut + dokunulmayan: `@/auth`, `@/lib/db`, `@/lib/entitlement` (`getEntitlement`), `/odeme` + `/api/odeme/init` (checkout), `billing.BillingPlan` (bootstrap'lı), `/giris`.

---

## Task 1: `/hesap` — hesap + launcher + billing paneli

**Files:**
- Create: `apps/hub/src/app/hesap/page.tsx`

- [ ] **Step 1: `/hesap` server sayfasını oluştur**

`apps/hub/src/app/hesap/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getEntitlement } from "@/lib/entitlement";
import { PCard } from "@ludenlab/ui";

export const runtime = "nodejs";

type ModuleKey = "STUDIO" | "ATOLYE";

const MODULES: { key: ModuleKey; name: string; desc: string; color: string; path: string }[] = [
  { key: "STUDIO", name: "Stüdyo", desc: "Dil-konuşma-işitme (DKT) AI araçları", color: "var(--poster-deep-teal)", path: "/studio" },
  { key: "ATOLYE", name: "Atölye", desc: "Özgül öğrenme güçlüğü & DEHB araçları", color: "var(--poster-accent)", path: "/atolye" },
];

const intervalTr = (i: string) => (i === "YEARLY" ? "yıl" : "ay");

// Poster aksiyon linkleri (server component → <a>; PButton bir <button> olduğu için <a> içine konmaz).
const btnPrimary: React.CSSProperties = {
  display: "inline-block", padding: "9px 16px", borderRadius: 10, fontWeight: 600,
  background: "var(--poster-accent)", color: "#fff", textDecoration: "none", fontSize: "0.92rem",
};
const btnOutline: React.CSSProperties = {
  display: "inline-block", padding: "9px 16px", borderRadius: 10, fontWeight: 600,
  border: "1.5px solid var(--poster-ink-4)", color: "var(--poster-ink-1)", textDecoration: "none", fontSize: "0.92rem",
};

export default async function HesapPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris?callbackUrl=/hesap");
  const accountId = session.user.id;

  const plans = await prisma.billingPlan.findMany({
    where: { module: { in: ["STUDIO", "ATOLYE"] }, active: true },
    orderBy: [{ module: "asc" }, { price: "asc" }],
    select: { module: true, code: true, interval: true, name: true, price: true },
  });

  const entEntries = await Promise.all(
    MODULES.map(async (m) => [m.key, await getEntitlement(accountId, m.key)] as const),
  );
  const entitlements = new Map(entEntries);

  return (
    <div style={{ maxWidth: 860, margin: "clamp(1.5rem,5vh,3.5rem) auto", padding: "0 1rem" }}>
      <div style={{ marginBottom: 26 }}>
        <span className="p-eyebrow">HESABIM</span>
        <h1 className="p-h3" style={{ margin: "6px 0 4px", fontSize: "1.9rem" }}>
          Merhaba{session.user.name ? `, ${session.user.name}` : ""}
        </h1>
        <p className="p-body" style={{ color: "var(--poster-ink-3)" }}>
          Kullanmak istediğin modülü seç — ücretsiz başla ya da abone ol.
        </p>
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        {MODULES.map((m) => {
          const ent = entitlements.get(m.key)!;
          const modulePlans = plans.filter((p) => p.module === m.key);
          return (
            <PCard key={m.key} style={{ borderTop: `4px solid ${m.color}` }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div>
                  <h2 className="p-h3" style={{ margin: "0 0 2px", color: m.color }}>{m.name}</h2>
                  <p className="p-body" style={{ margin: 0, color: "var(--poster-ink-3)" }}>{m.desc}</p>
                </div>
                <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 700, color: "#fff", background: ent.active ? m.color : "var(--poster-ink-4)" }}>
                  {ent.active ? "Aktif abonelik" : "Ücretsiz"}
                </span>
              </div>

              <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 10 }}>
                <a href={m.path} style={btnOutline}>{m.name} →</a>
                {!ent.active &&
                  modulePlans.map((p) => (
                    <a key={`${p.code}-${p.interval}`} href={`/odeme?module=${m.key}&code=${p.code}&interval=${p.interval}`} style={btnPrimary}>
                      {p.name} · {Number(p.price).toLocaleString("tr-TR")}₺/{intervalTr(p.interval)}
                    </a>
                  ))}
              </div>
            </PCard>
          );
        })}
      </div>

      <p style={{ marginTop: 22, fontSize: "0.9rem", color: "var(--poster-ink-3)" }}>
        Tek hesap, modül-bazlı abonelik. İstediğin an ikinci modülü ekleyebilir veya planını değiştirebilirsin.
      </p>
    </div>
  );
}
```

> Not: `m.path` (`/studio`,`/atolye`) yüzeyleri **S2b/c'de** gelir → o linkler S2a'da 404 verir (beklenen; S2a'nın testi hesap+abonelik akışı, modül-girişi sonra). `getEntitlement` `Entitlement{active,...}` döner; FREE (abonelik yok) → `active:false`.

- [ ] **Step 2: typecheck**

Run: `cd /Users/recepkucuk/ludenlab && pnpm --filter @ludenlab/hub typecheck`
Expected: hatasız (`getEntitlement`/`prisma.billingPlan`/`auth` tipleri çözülür).

---

## Task 2: Kayıt sonrası `/hesap` onboarding'ine yönlendir

**Files:**
- Modify: `apps/hub/src/app/kayit/page.tsx:48`

- [ ] **Step 1: Varsayılan callbackUrl'i `/hesap` yap**

Replace:
```tsx
      const cb = new URLSearchParams(window.location.search).get("callbackUrl") || "/";
```
With:
```tsx
      const cb = new URLSearchParams(window.location.search).get("callbackUrl") || "/hesap";
```

> Sonuç: yeni kayıt → otomatik giriş → `/hesap` (modülleri görür, ücretsiz başlar ya da abone olur = "kayıtta free-or-subscribe"). Açık `callbackUrl` varsa (ör. `/odeme`'den gelen) korunur.

- [ ] **Step 2: typecheck**

Run: `cd /Users/recepkucuk/ludenlab && pnpm --filter @ludenlab/hub typecheck`
Expected: hatasız.

---

## Task 3: Landing TopBar'a "Hesabım" linki

**Files:**
- Modify: `apps/hub/src/app/page.tsx` (TopBar `nav`)

- [ ] **Step 1: nav'a Hesabım linki ekle**

Replace:
```tsx
      <nav className="yb-nav">
        {PRODUCTS.map((p) => (
          <a key={p.id} href={p.href} target="_blank" rel="noopener" className="yb-navlink">{p.name}</a>
        ))}
      </nav>
```
With:
```tsx
      <nav className="yb-nav">
        {PRODUCTS.map((p) => (
          <a key={p.id} href={p.href} target="_blank" rel="noopener" className="yb-navlink">{p.name}</a>
        ))}
        <a href="/hesap" className="yb-navlink">Hesabım</a>
      </nav>
```

> `/hesap` girişsizse `/giris`'e yönlendirir (Task 1 auth gate) → tek link iki durumu da karşılar; client `useSession`/SessionProvider gerekmez (YAGNI).

- [ ] **Step 2: typecheck + lint**

Run: `cd /Users/recepkucuk/ludenlab && pnpm --filter @ludenlab/hub typecheck && pnpm --filter @ludenlab/hub lint`
Expected: ikisi de yeşil.

---

## Task 4: Full build + dev smoke + commit

- [ ] **Step 1: hub build (prod gate — typecheck/lint yakalamayanı yakalar)**

Run: `cd /Users/recepkucuk/ludenlab && pnpm --filter @ludenlab/hub build`
Expected: build yeşil; route tablosunda `/hesap` (ƒ dynamic, auth() kullanır) görünür; postbuild çalışır.

- [ ] **Step 2: Dev smoke (manuel — authed sayfa)**

```bash
cd /Users/recepkucuk/ludenlab/apps/hub
set -a; . ./.env 2>/dev/null || true; set +a
PORT=3000 HOSTNAME=127.0.0.1 node .next/standalone/apps/hub/server.js &
```
Tarayıcıda doğrula (ya da kayıtlı bir hesapla):
- `/kayit` → kayıt ol → otomatik `/hesap`'a düşer.
- `/hesap` → Stüdyo + Atölye kartları, ikisi de "Ücretsiz" rozeti + plan(lar)ın "abone ol" linkleri.
- Bir "abone ol" linki → `/odeme?module=…` → iyzico **sandbox** formu yüklenir (env'de sandbox key + `IYZICO_BASE_URL`).
- `/` → TopBar'da "Hesabım" → `/hesap` (ya da girişsizse `/giris`).
- (Beklenen) "Stüdyo →" / "Atölye →" linkleri 404 — yüzeyler S2b/c'de.

Smoke bitince server'ı durdur (`kill %1` ya da süreç PID).

> NOT: `/hesap`'ta plan görünmüyorsa, hub DB'sinde STUDIO/ATOLYE `BillingPlan` satırları olmalı (`bootstrap-iyzico.mjs` ile sandbox'a yazılmıştı; yoksa çalıştır). Bu **veri** sorunu, kod değil.

- [ ] **Step 3: Commit**

```bash
cd /Users/recepkucuk/ludenlab
git add apps/hub/src/app/hesap/page.tsx apps/hub/src/app/kayit/page.tsx apps/hub/src/app/page.tsx
git commit -m "feat(s2a): birleşik /hesap (launcher+billing paneli) + kayıt onboarding + Hesabım linki

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Self-Review (writing-plans)

**1. Spec coverage (S2_MERGE §4 S2a):** launcher (`/hesap` modül kartları + git linkleri) ✓ · `/hesap` billing paneli (per-modül entitlement + abone ol) ✓ · free-or-subscribe signup (kayıt→/hesap; abone ol→/odeme, free=hiçbir şey) ✓. **Rafine:** 3-DB client iskelesi S2a'dan çıkarıldı (YAGNI → S2b/c; spec §4'te belirtilmişti, plan notu açıklıyor). Hub'ın mevcut Account auth + /odeme korunur ✓.

**2. Placeholder taraması:** Tüm adımlar tam kod/komut. "uygun şekilde" yok. Modül-git 404'ü bilinçli + belgeli (S2b/c).

**3. Tip tutarlılığı:** `ModuleKey` = "STUDIO"|"ATOLYE"; `getEntitlement(accountId, ModuleKey)` (lib imzasıyla uyumlu, BRYTAKIP Track-1'de düştü); `prisma.billingPlan.findMany` select alanları (module/code/interval/name/price) hub şemasıyla uyumlu; `ent.active` `Entitlement` tipinden.

**4. Bağımlılık:** `BillingPlan` verisi gerekir (bootstrap'lı) — kod değil veri; Step 2 notunda. `/odeme` + `/api/odeme/init` mevcut (dokunulmaz).

---

## Execution Handoff

Plan tamam. İki yürütme seçeneği:
1. **Subagent-Driven (önerilen)** — her task için taze subagent + aralarda review.
2. **Inline** — bu oturumda executing-plans ile checkpoint'li.
