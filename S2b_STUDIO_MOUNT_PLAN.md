# S2b — Studio'yu `/studio` Altına Mount · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (checkpoint'li, **big-bang DEĞİL** — her faz sonunda build/typecheck yeşil olmadan ilerleme). Steps checkbox (`- [ ]`).

**Goal:** S1'deki `apps/studio` yüzeyini birleşik hub app'ine **`/studio/*`** altına taşı; Studio auth'unu **merkezi `Account`'a e-posta köprüsüyle** bağla; davranış değişmeden tek origin/tek üyelikle çalışsın.

**Architecture:** Base = hub (`S2_MERGE.md`). Studio kodu hub'a iki yere girer: route'lar `src/app/studio/*`, modül-içi kod `src/modules/studio/*` (yeni `@studio/*` tsconfig alias'ı). Studio'nun kendi next-auth'u KALKAR → merkezi `@/auth` (Account) + `currentTherapist()` köprüsü (Account e-postası → `Therapist`). Studio domain verisi yeni **studioDb** Prisma client'ıyla (Studio Supabase `public`).

**Tech Stack:** Next 16 App Router · next-auth v5 (merkezi) · Prisma 7 (3. client, custom output) + adapter-pg · `@ludenlab/billing` entitlement · Studio'nun shadcn/poster CSS'i (`.poster-scope` zaten class-scoped).

**Ölçek (recon):** ~180 hardcoded path · ~yüzlerce `@/` import · 31 doğrudan `auth()` sitesi · 5 layout · 64 API route. **YÜKSEK efor — fazlar arası checkpoint ŞART.**

**Branch:** `feat/studio-monorepo` (S1+S2a üstüne; **deploy YOK** — S5). terapimat canlı paralel kalır → rollback = birleşik app'i deploy etmemek.

**Test notu:** hub'da test harness yok → her faz `pnpm --filter @ludenlab/hub typecheck` (+ son fazda `build` + dev smoke). Davranış-değişmez göç → doğrulama = derleme + route smoke.

---

## Faz 1 — studioDb Prisma client (hub'da 2. şema)

**Files:** Create `apps/hub/prisma/studio/schema.prisma`, `apps/hub/src/lib/db/studio.ts`; Modify `apps/hub/package.json`, `apps/hub/.env`.

- [ ] **Step 1: Studio şemasını hub'a kopyala + generator output'unu ayarla**

```bash
cd /Users/recepkucuk/ludenlab
mkdir -p apps/hub/prisma/studio
cp apps/studio/prisma/schema.prisma apps/hub/prisma/studio/schema.prisma
# generator output: schema konumuna göre relative → hub/src/generated/studio
sed -i '' 's#output   = "../src/generated/prisma"#output   = "../../src/generated/studio"#' apps/hub/prisma/studio/schema.prisma
grep -n "output" apps/hub/prisma/studio/schema.prisma   # doğrula: ../../src/generated/studio
```
> Studio şeması `generator client { provider="prisma-client"; output=...; runtime="nodejs" }` + `datasource db { provider="postgresql" }` (url YOK — generate url istemez; runtime adapter-pg verir).

- [ ] **Step 2: studioDb client'ı oluştur**

`apps/hub/src/lib/db/studio.ts`:
```ts
import { PrismaClient } from "@/generated/studio/client";
import { PrismaPg } from "@prisma/adapter-pg";

/** Studio domain DB = Studio Supabase `public` (Therapist/Student/Card/Lesson/...). */
const g = globalThis as unknown as { studioDb: PrismaClient | undefined };

function create() {
  const url = process.env.STUDIO_DATABASE_URL;
  const adapter = new PrismaPg({
    connectionString: url,
    ssl: url?.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
  });
  return new PrismaClient({ adapter, log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] });
}

export const studioDb = g.studioDb ?? create();
if (process.env.NODE_ENV !== "production") g.studioDb = studioDb;
```

- [ ] **Step 3: postinstall'a studio generate ekle + env**

`apps/hub/package.json` — `"postinstall"` satırını değiştir:
```
"postinstall": "prisma generate && prisma generate --schema prisma/studio/schema.prisma",
```
`apps/hub/.env` — ekle (Studio Supabase `public` bağlantısı; terapimat/.env'deki `DATABASE_URL` ile aynı):
```
STUDIO_DATABASE_URL="<terapimat/.env DATABASE_URL değeri>"
```

- [ ] **Step 4: generate + typecheck**

```bash
cd /Users/recepkucuk/ludenlab && pnpm --filter @ludenlab/hub exec prisma generate --schema prisma/studio/schema.prisma
pnpm --filter @ludenlab/hub typecheck
```
Expected: `src/generated/studio` üretilir; typecheck yeşil (studioDb tipleri çözülür).

- [ ] **Step 5: Commit** — `git add apps/hub/prisma/studio apps/hub/src/lib/db/studio.ts apps/hub/package.json && git commit -m "feat(s2b/1): hub'a studioDb (Studio public şeması, 2. prisma client)"`

---

## Faz 2 — Studio kodunu taşı + import re-alias (`@studio/*`)

**Files:** rsync `apps/studio/src/{lib,components,hooks,types}` → `apps/hub/src/modules/studio/*`; `apps/studio/src/app/{(main),(admin)}` → `apps/hub/src/app/studio/*`; tsconfig alias; sed importlar.

- [ ] **Step 1: tsconfig'e `@studio/*` alias ekle**

`apps/hub/tsconfig.json` `compilerOptions.paths`'e ekle:
```json
"@studio/*": ["./src/modules/studio/*"]
```

- [ ] **Step 2: Modül-içi kodu taşı (lib/components/hooks/types)**

```bash
cd /Users/recepkucuk/ludenlab
mkdir -p apps/hub/src/modules/studio
rsync -a apps/studio/src/lib apps/studio/src/components apps/studio/src/hooks apps/studio/src/types apps/hub/src/modules/studio/
```

- [ ] **Step 3: Route'ları `app/studio/` altına taşı**

```bash
cd /Users/recepkucuk/ludenlab
mkdir -p apps/hub/src/app/studio
rsync -a "apps/studio/src/app/(main)" "apps/studio/src/app/(admin)" apps/hub/src/app/studio/
# api: auth HARİÇ (merkezi) — studio api'lerini /studio/api'ye
mkdir -p apps/hub/src/app/studio/api
rsync -a --exclude=auth apps/studio/src/app/api/ apps/hub/src/app/studio/api/
```
> **DROP edilenler (bilinçli):** `(landing)` (hub'ın kendi `/` + legal'i var), `(auth)/login`+`register` (merkezi `/giris`+`/kayit`), `api/auth/*` (merkezi). **GAP (follow-up, S2b dışı):** `verify-email`, `forgot-password`, `reset-password` + ilgili API'ler şimdilik taşınmaz → merkezi hub'a eklenecek ayrı task (bkz. Faz 5 notu). Studio'da o akışlar geçici devre dışı.

- [ ] **Step 4: Studio importlarını `@/`→`@studio/` re-alias (auth HARİÇ)**

```bash
cd /Users/recepkucuk/ludenlab
# Taşınan studio dosyalarında @/ → @studio/ (modules + app/studio); @/auth'u DIŞLA (merkezi kalacak)
find apps/hub/src/modules/studio apps/hub/src/app/studio -type f \( -name '*.ts' -o -name '*.tsx' \) \
  -exec sed -i '' -E 's#from "@/(lib\|components\|hooks\|types\|generated)#from "@studio/\1#g' {} +
echo "kalan ham @/ (auth + edge'ler — incele):"
grep -rn 'from "@/' apps/hub/src/modules/studio apps/hub/src/app/studio | grep -v '@/auth' | head -30
```
> Not: `@/auth` (merkezi) + `@/generated/studio` (studioDb client) ham kalmalı. `@studio/generated` üretilmez → studio'nun `@/generated/prisma` importları Faz 1'deki studioDb'ye köprülenir (Step 5).

- [ ] **Step 5: `@studio/lib/db` → studioDb köprüsü**

`apps/hub/src/modules/studio/lib/db.ts`'i TAMAMEN değiştir:
```ts
// Studio domain DB → merkezi hub studioDb client'ına köprü (Studio Supabase public).
export { studioDb as prisma } from "@/lib/db/studio";
```
Ayrıca studio kodunda `@studio/generated/prisma/client` (eski) referansları varsa → studioDb üzerinden gelir; doğrudan client importu (ör. enum) için:
```bash
find apps/hub/src/modules/studio apps/hub/src/app/studio -type f \( -name '*.ts' -o -name '*.tsx' \) \
  -exec sed -i '' 's#@studio/generated/prisma/client#@/generated/studio/client#g' {} +
```

- [ ] **Step 6: typecheck (import çözümü)** — `pnpm --filter @ludenlab/hub typecheck 2>&1 | tail -40`
Expected: çoğu çözülür; KALAN hatalar = (a) `@/auth` köprüsü (Faz 3), (b) path/handler detayları. Auth-kaynaklı olmayan import hatalarını burada düzelt (eksik @studio alias, kaçan @/ vb.). Auth tipi hatalarını Faz 3'e bırak.

---

## Faz 3 — Auth köprüsü (merkezi Account → Therapist)

**Files:** Create `apps/hub/src/modules/studio/auth-bridge.ts`, `apps/hub/src/middleware.ts`; Modify `apps/hub/src/modules/studio/lib/auth-helpers.ts` + 31 `auth()` sitesi; Delete studio'nun `auth.ts`/`auth.config.ts`/`proxy.ts` kopyaları.

- [ ] **Step 1: `currentTherapist()` köprüsü**

`apps/hub/src/modules/studio/auth-bridge.ts`:
```ts
import { auth } from "@/auth";
import { studioDb } from "@/lib/db/studio";

/** Merkezi Account session'ı → Studio Therapist (e-posta köprüsü). Yoksa null. */
export async function currentTherapist() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) return null;
  return studioDb.therapist.findUnique({ where: { email } });
}
```
> Merkezi `@/auth` session'ı `user.email` taşır (next-auth default + hub authorize `email` döndürür). Studio her yerde `session.user.id`'yi **therapistId** sanıyordu (eski Studio auth'unda öyleydi) → artık `currentTherapist().id` kullanılmalı.

- [ ] **Step 2: `auth-helpers.ts`'i merkezileştir** (`apps/hub/src/modules/studio/lib/auth-helpers.ts`)

`requireAuth`/`requireAdmin`'i Therapist döndürür yap:
```ts
import { NextResponse } from "next/server";
import { currentTherapist } from "@studio/auth-bridge";
import { studioDb as prisma } from "@/lib/db/studio";

function unauthorized() { return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 }); }
function forbidden(m = "Yetkisiz erişim") { return NextResponse.json({ error: m }, { status: 403 }); }
function notFound(m: string) { return NextResponse.json({ error: m }, { status: 404 }); }

/** Auth'lu therapist ya da 401. Eski `requireAuth().session.user.id` yerine `requireAuth().therapist.id`. */
export async function requireAuth() {
  const therapist = await currentTherapist();
  if (!therapist) return unauthorized();
  return { therapist };
}
export async function requireAdmin() {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  if (gate.therapist.role !== "admin") return forbidden();
  return gate;
}
export async function requireStudentOwnership(studentId: string, therapistId: string, options?: { select?: Record<string, boolean> }) {
  const student = await prisma.student.findFirst({ where: { id: studentId, therapistId }, select: options?.select ?? { id: true } });
  if (!student) return notFound("Öğrenci bulunamadı");
  return { student: student as { id: string } & Record<string, unknown> };
}
export async function requireCardOwnership(cardId: string, therapistId: string) {
  const card = await prisma.card.findFirst({ where: { id: cardId, therapistId }, select: { id: true } });
  if (!card) return notFound("Kart bulunamadı");
  return { card };
}
```
> Çağıranlar `gate.session.user.id` → `gate.therapist.id` olmalı (Step 4'te toplu).

- [ ] **Step 3: Studio'nun kendi auth'unu sil + tek middleware**

```bash
cd /Users/recepkucuk/ludenlab
rm -f apps/hub/src/modules/studio/lib/auth.ts apps/hub/src/modules/studio/auth.config.ts 2>/dev/null
# (varsa) taşınan auth.ts/proxy.ts kopyaları — studio kendi next-auth'unu kullanmaz
```
`apps/hub/src/middleware.ts` (Studio `proxy.ts` deseninden, merkezi auth'la):
```ts
import { auth } from "@/auth";

export default auth((req) => {
  const authed = !!req.auth?.user;
  const p = req.nextUrl.pathname;
  // /studio/* korumalı (auth gate); değilse merkezi /giris'e.
  if (p.startsWith("/studio") && !authed) {
    const url = new URL("/giris", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", p);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
```
> Hostinger: middleware Node runtime'da çalışır (Studio'da proven; terapimat canlı). Edge gerektirmez.

- [ ] **Step 4: 31 doğrudan `auth()` sitesini köprüye geçir**

Desen: `const session = await auth(); if (!session?.user?.id) return <401>;` + `session.user.id` (therapistId).
→ `const therapist = await currentTherapist(); if (!therapist) return <401>;` + `therapist.id`.

Recon listesinden başla (`api/tools/*`, `api/cards`, `api/students`, `(main)/layout.tsx`, `(admin)/layout.tsx`, ...). Yarı-otomatik:
```bash
cd /Users/recepkucuk/ludenlab
# import ekle/çevir (manuel review şart — desen dosyadan dosyaya değişir):
grep -rln 'await auth()' apps/hub/src/app/studio apps/hub/src/modules/studio
```
Her dosyada: `import { auth } from "@/auth"` → `import { currentTherapist } from "@studio/auth-bridge"`; `session.user.id` → `therapist.id`; `requireAuth` kullananlarda `.session.user.id` → `.therapist.id`. **Bu manuel/dikkatli adım** (31 site + helper çağıranları) — her birini düzelt, sonra typecheck.

- [ ] **Step 5: typecheck (auth tipleri kapanır)** — `pnpm --filter @ludenlab/hub typecheck 2>&1 | tail -40`
Expected: auth-kaynaklı hatalar biter. Kalan hata varsa o siteyi düzelt. Yeşilde Commit:
`git add -A && git commit -m "feat(s2b/3): studio auth → merkezi Account e-posta köprüsü + tek middleware"`

---

## Faz 4 — Path-prefix (`/studio`)

**Files:** Modify taşınan studio dosyaları (nav + fetch path'leri).

- [ ] **Step 1: Nav path'leri `/studio` prefix (auth path'leri HARİÇ → merkezi)**

```bash
cd /Users/recepkucuk/ludenlab
SF="apps/hub/src/app/studio apps/hub/src/modules/studio"
# href / Link / router.push|replace / redirect: "/x" → "/studio/x"  (dış/fragment/auth hariç)
find $SF -type f \( -name '*.ts' -o -name '*.tsx' \) -exec sed -i '' -E \
  's#(href=\|router\.(push\|replace)\(\|redirect\()"/(?!studio\|giris\|kayit\|odeme\|hesap\|api/auth)#\1"/studio/#g' {} +
```
> ⚠️ macOS `sed` POSIX — yukarıdaki lookahead `(?!...)` ÇALIŞMAZ. Bunun yerine **iki-aşama:** (a) toplu `"/` → `"/studio/`; (b) yanlış-prefix'lenenleri geri al:
```bash
find $SF -type f \( -name '*.ts' -o -name '*.tsx' \) -exec perl -pi -e \
  's{(href=|router\.(?:push|replace)\(|redirect\()"/(?!studio/)(?!giris)(?!kayit)(?!odeme)(?!hesap)(?!api/auth)}{$1"/studio/}g' {} +
```
(Perl PCRE lookahead var → tek geçişte; auth/merkezi path'ler ve zaten-prefix'liler hariç.)

- [ ] **Step 2: fetch API path'leri `/studio/api` (auth hariç)**

```bash
cd /Users/recepkucuk/ludenlab
find $SF -type f \( -name '*.ts' -o -name '*.tsx' \) -exec perl -pi -e \
  's{(fetch\(\s*[`"'\''])/api/(?!auth)}{${1}/studio/api/}g' {} +
echo "kalan ham /api (auth + edge — incele):"; grep -rn 'fetch([`"'\'']/api/' $SF | grep -v '/studio/api' | grep -v '/api/auth' | head
```

- [ ] **Step 3: Elle review (edge'ler)** — template-literal/dinamik path'ler, `NextResponse.redirect(new URL(...))`, mutlak `SITE_URL` birleşimleri:
```bash
grep -rn 'redirect(\|NextResponse.redirect\|router.push(`\|href={`' $SF | grep -v '/studio' | head -40
```
Her birini elle `/studio` ile düzelt (auth → merkezi). typecheck ara: `pnpm --filter @ludenlab/hub typecheck`.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(s2b/4): studio nav+fetch path'leri /studio prefix"`

---

## Faz 5 — CSS/layout + studio root layout + build green + smoke

**Files:** Create `apps/hub/src/app/studio/layout.tsx`; Modify globals (gerekirse); cleanup.

- [ ] **Step 1: Studio root layout (poster-scope + provider'lar)**

`apps/hub/src/app/studio/layout.tsx` — Studio'nun eski root layout'unun gövdesi (ThemeProvider/AuthSessionProvider/poster-scope), ama `<html>/<body>` YOK (o hub root layout'ta). Studio'nun globals.css'i bu segment'e import et:
```tsx
import "@studio/styles/studio.css"; // (apps/studio/src/app/globals.css buraya kopyalanır — Step 2)
import { ThemeProvider } from "@studio/components/theme-provider"; // path projeye göre
// ... Studio'nun (main)/(admin) zaten kendi alt-layout'larında poster-scope sarıyor.
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
```
> Studio `globals.css` `:root` KİRLETMEZ (`.poster-scope` class-scoped) → hub'ın poster kabuğuyla çakışmaz. Studio CSS'i yalnız `/studio/*`'ta yüklenir.

```bash
cd /Users/recepkucuk/ludenlab
mkdir -p apps/hub/src/modules/studio/styles
cp apps/studio/src/app/globals.css apps/hub/src/modules/studio/styles/studio.css
# studio.css'te hub ile çakışan global @import "tailwindcss" zaten hub globals'ta var → tekrarı kaldır (gerekirse).
```

- [ ] **Step 2: full hub build (prod gate)** — `pnpm --filter @ludenlab/hub build 2>&1 | tail -40`
Expected: build yeşil; route tablosunda `/studio/...` route'ları + `/studio/api/...` görünür. Hata çıkarsa (eksik import/path/CSS) düzelt + tekrar.

- [ ] **Step 3: Dev smoke (manuel)**

```bash
cd /Users/recepkucuk/ludenlab/apps/hub
set -a; . ./.env 2>/dev/null || true; set +a
PORT=3000 HOSTNAME=127.0.0.1 node .next/standalone/apps/hub/server.js &
```
Doğrula (kayıtlı bir Account + aynı e-postalı Therapist gerekir — köprü):
- `/studio/dashboard` (girişsiz) → `/giris?callbackUrl=/studio/dashboard` (middleware ✓).
- Giriş yap → `/studio/dashboard` render; bir araç sayfası (`/studio/tools/...`) açılır; API çağrısı `/studio/api/...` 200.
- Entitlement: Studio'da plan/limit merkezi `Subscription`'dan (e-posta köprüsü) okunuyor mu (FREE/PRO).
Server'ı durdur.

> **Köprü ön-koşulu:** Studio'nun `Therapist` tablosundaki e-posta = merkezi `Account` e-postası. Dev test: aynı e-postayla hem Account (`/kayit`) hem Therapist (Studio DB'de mevcut) olmalı. Gerçek kullanıcı eşlemesi = S4 hafif göç (cutover).

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(s2b/5): studio root layout + CSS scope + build green"`

---

## Self-Review (writing-plans)

**1. Spec coverage (S2_MERGE §4 S2b):** `/studio` mount (Faz 2) ✓ · Therapist e-posta köprüsü (Faz 3) ✓ · Studio auth sayfaları kalkar→merkezi (Faz 2-3) ✓ · entitlement merkezi Subscription (mevcut `getEntitlement`/`getEntitlementByEmail`; studio sayfaları köprüyle okur — Faz 5 smoke) ✓ · studioDb (Faz 1) ✓ · klinik DB DOKUNULMAZ (S2c, burada yok) ✓.

**2. Placeholder taraması:** Yeni dosyalar (studioDb, auth-bridge, auth-helpers, middleware, studio layout) tam kod. Mekanik bulk (180 path + import re-alias + 31 auth site) = **kesin script + exclusion + manuel review adımı** (enumerate edilmez — bu ölçekte script doğru "içerik"). GAP'ler (verify-email/forgot/reset) bilinçli işaretli (ayrı follow-up task).

**3. Tip tutarlılığı:** `currentTherapist()` → Therapist|null; `requireAuth()` → `{therapist}`|NextResponse; çağıranlar `.therapist.id` (eski `.session.user.id` değil). `studioDb` = `@/lib/db/studio`. `@studio/*` alias tutarlı.

**4. Riskli edge'ler (executor dikkat):** (a) macOS sed lookahead yok → **perl** kullan; (b) `@/auth` re-alias'tan DIŞLA (merkezi); (c) auth path'leri (`/login`→`/giris`) `/studio/login` OLMAZ; (d) `verify-email`/`reset` GAP'i smoke'u kısmen sınırlar — ayrı task; (e) e-posta köprüsü ön-koşulu (Account.email = Therapist.email).

---

## Execution Handoff

Plan tamam. **Öneri: executing-plans ile FAZ-FAZ** (her faz sonu typecheck/build yeşil + commit; bir faz kırmızıyken sonrakine geçme). Big-bang yapma. Fazlar bağımsız commit → herhangi bir fazda takılırsa temiz rollback. S2b yüksek-efor → ayrı odaklı bir yürütme oturumu mantıklı (taze bağlam).
