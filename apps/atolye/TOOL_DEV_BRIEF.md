# LudenLab **Atölye** — AI Araç Geliştirme Brief'i (Claude Chat için)

> Bu belge, LudenLab Atölye'ye **yeni AI araçları** tasarlamak/kodlamak için tüm mimariyi
> anlatır. Claude Chat'in kod tabanına erişimi yok — bu yüzden desen, kurallar ve dosya
> reçetesi burada **kendi kendine yeter** şekilde verilmiştir. Yeni bir araç önerirken/kodlarken
> aşağıdaki desene ve **etik çerçeveye** birebir uy.

---

## 1. Atölye nedir, kime hizmet eder?

**LudenLab Atölye** = **özgül öğrenme güçlüğü (ÖÖB: disleksi/diskalkuli/disgrafi)** ve **DEHB** ile
çalışan **özel eğitim öğretmenleri ve uzmanları** için yapay zekâ destekli araç seti. Üretilen her
çıktı **"taslak — uzman onayı gerekir"** çerçevesindedir; araç uzmanın yerine geçmez, işini hızlandırır.

- Adres: `atolye.ludenlab.com` · Durum: ücretsiz beta.
- Mevcut araçlar: **BEP & Rapor Asistanı** (`/araclar/bep`), **Seans Planı Üreteci** (`/araclar/seans-plani`).
- Yan sayfalar: Panel (dashboard), Vakalarım (vaka listesi/detay), Kütüphane (tüm taslaklar), Takvim (seanslar), Admin.

## 2. Teknik mimari (özet)

- **Next.js 16 (App Router) + React 19**, TypeScript, path alias `@/* → src/*`. Hosting: **Hostinger Node** (standalone). Vercel YOK.
- **Auth:** next-auth v5 (Credentials + JWT). `await auth()` → `session.user.id` (account id) + `session.user.role`.
- **DB:** ayrı **klinik DB** (Supabase Postgres), Prisma 7 + `@prisma/adapter-pg`. Studio/billing'den izole.
- **AI:** `@ludenlab/ai` paketi (Anthropic SDK sarmalayıcı) — **uygulamada Anthropic SDK doğrudan ÇAĞRILMAZ**.
- **UI:** `@ludenlab/ui` "poster" tasarım sistemi (krem + ink + sert offset gölge).

```
apps/atolye/src/
  auth.ts                        # next-auth config (auth, handlers, signIn, signOut)
  app/
    layout.tsx                   # ThemeProvider + PToaster, body.poster-scope
    giris/ , kayit/              # login / register (client)
    (app)/                       # AUTHED GRUP — layout.tsx: auth guard + AppSidebar + force-dynamic
      dashboard/  araclar/  vakalarim/  kutuphane/  takvim/  admin/
      araclar/bep/page.tsx       # /araclar/bep
      araclar/seans-plani/page.tsx
    api/
      bep/route.ts  seans-plani/route.ts        # AI üretim uçları
      cases/route.ts  cases/[id]/  cases/save/  documents/[id]/   # vaka + doküman persist
      sessions/route.ts  sessions/[id]/         # takvim
      auth/[...nextauth]/  auth/register/
  components/                    # BepAssistant.tsx, SeansPlaniTool.tsx, CasesManager.tsx ... ("use client")
  lib/                           # atolye-system.ts, bep.ts, bep-prompts.ts, seans*.ts, cases.ts, sessions.ts, db.ts, doc-types.ts
```

## 3. Bir AI aracı nasıl çalışır — **5 dosyalık desen** (BEP örneği)

Her araç **client/server sınırına** sadık 5 parçadır. Yeni araç bunları birebir aynalar.

**(a) `lib/<tool>.ts`** — zod şeması + paylaşılan tip/enum'lar (client+server ortak). Vakaya bağlıysa `rumuz` (max 40, KVKK) içerir. Ortak enum'lar `KADEME` (kademe) ve `ALAN` (okuma/yazma/matematik/dikkat…) `lib/bep.ts`'tedir, tekrar kullan.

**(b) `lib/<tool>-prompts.ts`** *(SERVER-ONLY — client'tan import edilmez)* — `definePrompt` ile:
```ts
import { definePrompt } from "@ludenlab/ai";
import { ATOLYE_SYSTEM } from "./atolye-system";
const seansPlani = definePrompt<SeansInput>({
  name: "seans_plani", temperature: 0.4, maxTokens: 3200,
  system: ATOLYE_SYSTEM,                       // ← her araç bu sistem promptunu kullanır
  user: (input) => `Aşağıdaki profil için ÇOK DUYULU SEANS PLANI üret.\nPROFİL\n${profil(input)}\nİSTENEN YAPI: Künye → Isınma → Ana Etkinlik → Tekrar → Kapanış → Materyaller → Ölçme → Ev Görevi`,
});
export function generateSeans(input: SeansInput) { return seansPlani.run(input); }
```
Guardrail: prompt'ta "Veriler yetersizse VARSAYIM ÜRETME, sayı uydurma" gibi sınırlar olur.

**(c) `app/api/<tool>/route.ts`** — ince uç:
```ts
export const runtime = "nodejs"; export const maxDuration = 60;
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "AI yapılandırılmamış" }, { status: 503 });
  const parsed = seansInputSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz", issues: parsed.error.issues }, { status: 422 });
  const { text, model, usage } = await generateSeans(parsed.data);
  return NextResponse.json({ text, model, credits: estimateCredits(model, usage) });
}
```
Yanıt sözleşmesi: **`{ text: string, model: string, credits: number }`**.

**(d) `components/<Tool>Tool.tsx`** *(`"use client"`)* — poster 2 kolon: sol form (her alan `useState`), sağ sonuç. `fetch("/api/<tool>")` → sonucu `<ReactMarkdown>` ile göster → **Kopyala** + **Vakaya kaydet** aksiyonları + kalıcı `PAlert tone="warning"` + alt satırda `⚠️ {TASLAK_NOTU}`.

**(e) `app/(app)/araclar/<tool>/page.tsx`** *(server)* — `metadata`, `const s = await auth(); if (!s?.user) redirect("/giris")`, `<header>` + `<TheClientComponent/>`. (`force-dynamic` gerekmez — `(app)/layout.tsx`'ten miras.)

**Ek:** aracı `araclar/page.tsx`'teki `TOOLS` dizisine ekle (kart grid). Yeni çıktı tipi varsa `lib/doc-types.ts`'teki `type → label` haritasına ekle.

## 4. `@ludenlab/ai` (her araç bunu kullanır)

- `definePrompt<TInput>({ name, model?, maxTokens?, temperature?, system, user })` → `.run(input)` döner `{ text, model, stopReason, usage }`.
- `DEFAULT_MODEL = "claude-sonnet-4-6"` (maliyet-bilinçli; gerekirse `model` ile override). Sistem bloğu **otomatik prompt-cache**lenir.
- `estimateCredits(model, usage)` → UI'daki "~N kredi" rozeti (1 kredi ≈ 0.01 USD; placeholder, gerçek billing Faz 5).

## 5. ⚠️ ATOLYE_SYSTEM — etik + MEB çerçevesi (PAZARLIK DIŞI)

`lib/atolye-system.ts`'teki ortak sistem promptu **her araca** dayatır:
- **MEB ÖRGM "Öğrenme Güçlüğü Olan Bireyler İçin Destek Eğitim Programı (Mart 2025)"** çerçevesi + değerlendirme basamakları.
- **Ölçülebilir, bireyselleştirilmiş hedefler** (davranış + ölçüt + koşul). **Çok duyulu** yöntem ilkeleri. **Güçlü yön odaklı, damgalamayan dil.**
- **ETİK SINIR:** tıbbi **tanı koymaz** ("eğitsel gözlem / güçlük profili" der); tanıyı psikiyatri + RAM'a bırakır; **gerçek ad / TC / okul ÜRETMEZ, İSTEMEZ** — yalnız **kod/rumuz**.
- Çıktı **Türkçe Markdown**; **her zaman son satıra `⚠️ {TASLAK_NOTU}`** ekler (taslak — uzman onayı).

> Yeni bir araç farklı bir etik/biçim kuralı gerektiriyorsa ATOLYE_SYSTEM'i genişlet ama `TASLAK_NOTU`'nu koru.

## 6. Veri modeli + kalıcılık (klinik DB)

| Model | Anahtar alanlar |
|---|---|
| **Account** | id, email@unique, passwordHash, role (`practitioner`\|`admin`) |
| **Case** (vaka) | id, **ownerId**, **code** (rumuz — gerçek ad DEĞİL), kademe, notes? |
| **GeneratedDocument** | id, caseId, **type** (`bep_hedef`\|`ilerleme_raporu`\|`aile_ozeti`\|`seans_plani`…), content, model, credits |
| **Session** (seans) | id, ownerId, caseId?, title, date, startTime/endTime, status, isRecurring |

- **PII YOK** — çocuklar yalnız **kod/rumuz** ile.
- **İzolasyon:** **birincil mekanizma `ownerId` filtresi** — her klinik sorgu `where: { ownerId: accountId }` (veya `where:{ case:{ ownerId } }`) taşır; mutasyonlar `updateMany/deleteMany` ile ownerId-kapsamlı. (Supabase `postgres` rolü **BYPASSRLS** olduğu için RLS tek başına yetmez; `withRls` var ama aktif değil, defans katmanı.) Şema/RLS değişikliği **yalnız versiyonlu migration** (asla `db push`).
- **Kaydetme deseni:** `saveToCase()` → `POST /api/cases/save` `{ code, kademe, type, content, model, credits }` → `saveDocument` vakayı `(ownerId, code)` ile **bul-veya-oluştur** + `GeneratedDocument` ekler. Aynı çıktı şeklini kullanan yeni araçlar **migration gerektirmez**.

## 7. Tasarım sistemi (`@ludenlab/ui` — poster)

Bileşenler: `PButton, PCard, PSection, PField, PInput, PSelect, PTextarea, PBadge, PAlert, PSpinner, AppSidebar, PModal, PTabs, toast`. Tipik araç-sayfası iskeleti:
```tsx
<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem" }}>
  <form onSubmit={onSubmit}>
    <PSection title="Profil">
      <PField label="Kod / rumuz" hint="KVKK — gerçek ad girmeyin"><PInput .../></PField>
      <PField label="Kademe"><PSelect>…</PSelect></PField> …
    </PSection>
    {error && <PAlert tone="error">{error}</PAlert>}
    <PButton type="submit" size="lg" disabled={loading}>{loading ? "Üretiliyor…" : "Taslak üret →"}</PButton>
  </form>
  <div>
    <PAlert tone="warning">Bu araç tıbbi tanı koymaz; çıktı taslaktır, uzman onayı gerekir.</PAlert>
    {result && <PSection title="Taslak" action={<>~{credits} kredi · Kopyala · Vakaya kaydet</>}>
      <div className="md"><ReactMarkdown>{result.text}</ReactMarkdown></div>
      <p>⚠️ {TASLAK_NOTU}</p>
    </PSection>}
  </div>
</div>
```

## 8. ✅ Yeni araç ekleme reçetesi

1. `lib/<tool>.ts` — zod input şeması + tip + (gerekirse) enum (KADEME/ALAN tekrar kullan).
2. `lib/<tool>-prompts.ts` *(server-only)* — `definePrompt({ system: ATOLYE_SYSTEM, user })` + `generate<Tool>()`.
3. `app/api/<tool>/route.ts` — auth 401 + ANTHROPIC_API_KEY 503 + zod 422 + `{ text, model, credits }`.
4. `components/<Tool>Tool.tsx` *(client)* — poster 2-kolon form→sonuç + Kopyala + Vakaya kaydet + warning + TASLAK_NOTU.
5. `app/(app)/araclar/<tool>/page.tsx` *(server)* — auth + redirect + header + client bileşen.
6. `araclar/page.tsx` `TOOLS` dizisine kart ekle. Yeni çıktı tipi → `lib/doc-types.ts`'e `type→label`.
7. **Yalnız** çıktı yepyeni bir şekil/ilişki istiyorsa: `prisma/schema.prisma` + versiyonlu migration + (yeni klinik tablo ise) RLS migration + ownerId-kapsamlı lib helper. Aksi halde mevcut `GeneratedDocument` + `/api/cases/save` yeter.

## 9. Olası araç fikirleri (ÖÖB/DEHB — başlangıç için)
- **Materyal Üreteci** (çalışma yaprağı / etkinlik kartı — çok duyulu, ilgi alanına uyarlı)
- **Veli Görüşme/Bilgilendirme Mektubu** (güçlü-yön odaklı, sade dil)
- **Davranış Destek Planı** (DEHB — öncül/sonuç, sınıf-içi stratejiler)
- **Okuma Akıcılığı / Disleksi Egzersiz Seti** (fonolojik farkındalık basamaklı)
- **İlerleme İzleme Çizelgesi** (BEP hedefine bağlı, ölçülebilir göstergeler)
- **RAM Yönlendirme / Eğitsel Değerlendirme Özeti** (tanı koymadan, gözlem temelli)

> Her fikir aynı 5-dosya desenini + ATOLYE_SYSTEM'i kullanır; çoğu mevcut `GeneratedDocument` şemasına sığar (yeni migration gerekmez).
