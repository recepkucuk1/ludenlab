# LudenLab — UI/UX Mimarisi
### Claude Design için ürün & arayüz bilgi dokümanı
**Sürüm:** 2026-08-18 · **Kaynak:** `ludenlab` monorepo, `main` (e9f24ef) · **Kanonik doğruluk:** kod > bu doküman

> Kardeş doküman: `docs/brand/ludenlab-gorsel-tasarim-claude-project.md` (marka, logo, renk, tipografi, sosyal medya).
> **Bu doküman onun üzerine gelir:** orada "marka nasıl görünür", burada **"ürün nasıl kurgulanır, nereye ne konur, kullanıcı nasıl ilerler"** anlatılır.

---

## 0. Bu doküman nasıl kullanılır

Claude Design'da yeni bir Proje aç, bu dosyayı **bilgi tabanına (knowledge)** ekle ve aşağıdaki bloğu **sistem talimatı** olarak yapıştır.

```
Sen LudenLab'in ürün tasarımcısısın. LudenLab; Türkiye'de özel eğitim ve
dil-konuşma-işitme alanında çalışan uzmanlar için yapay zekâ destekli bir
üretim ve takip platformudur. Tek hesap, iki modül: Studio (DKT) ve Atölye
(ÖÖG & DEHB). Arayüz dili "poster" sistemidir: krem kâğıt zemin, 2px ink
kenarlık, BLURSUZ katı ofset gölge (0 Ypx 0 ink), tek turuncu CTA, pill
yarıçaplar. Tüm metinler Türkçe.

Kurallar:
1. Yeni ekran tasarlarken önce bu dokümandaki SAYFA ARKETİPİNİ seç (§7);
   yeni bir düzen icat etme, mevcut arketipi uyarla.
2. Renk/gölge/yarıçap/tipografi HER ZAMAN token'la ifade edilir (§6.1).
   Yeni hex uydurma. Gradient yok (tek istisna: dark sayfa zemini).
3. Her ekranın 4 durumu tasarlanır: boş · yüklenirken · hata · dolu (§9).
4. Mobil önce doğrulanır: 375px'te tek kolon, input ≥16px, dokunma hedefi
   ≥44px, sidebar overlay olur (§10).
5. Üretim (AI) ekranlarında "hak" ekonomisi görünür olmalı: kalan üretim
   hakkı, tükenince kilitli CTA + yükseltme yolu (§8.2, §8.3).
6. Terminolojiye sadık kal (§13). "Kredi" DEME → "üretim hakkı".
7. Çıktıyı HTML olarak üret; poster token bloğunu :root'a koy.
```

---

## 1. Kuşbakışı: ürün ve teknik zemin

**Tek Next.js 16 uygulaması** (`apps/hub`, App Router, React 19) üç kullanıcı yüzeyini birden servis eder. Eski standalone `apps/studio` ve `apps/atolye` silindi; ikisi de artık `src/modules/*` altında **modül**.

| Yüzey | Kök | Ne? | Kullanıcı |
|---|---|---|---|
| **Hub (apex)** | `/` | Pazarlama + kimlik + ödeme + hesap merkezi | Ziyaretçi, tüm üyeler |
| **Studio** | `/studio/*` | Dil-konuşma-işitme (DKT) araçları, öğrenci & kart kütüphanesi | Dil ve konuşma terapisti |
| **Atölye** | `/atolye/*` | ÖÖG & DEHB araçları, BEP, vaka & materyal | Özel eğitim öğretmeni / uzmanı |

```
ludenlab/
├─ apps/hub/                 ← TEK deploy edilen uygulama (ludenlab.com)
│  └─ src/
│     ├─ app/                ← rotalar (marketing · auth · hesap · studio · atolye · api)
│     ├─ components/         ← apex-ortak (AuthShell, LogoutButton, ModuleSwitchButton…)
│     └─ modules/
│        ├─ studio/          ← Studio'nun bileşen + stil + lib'i (@studio/*)
│        └─ atolye/          ← Atölye'nin bileşen + stil + lib'i (@atolye/*)
├─ packages/ui/              ← @ludenlab/ui — ORTAK tasarım sistemi + poster.css (kanonik)
├─ packages/ai · billing · config
└─ docs/brand/               ← marka + bu doküman
```

**Tasarım açısından kritik sonuç:** üç yüzey aynı `<html>` gövdesini paylaşır (`body.poster-scope`), yani **token'lar globaldir**; ayrıştırma layout ve kabuk düzeyinde yapılır, tema düzeyinde değil.

---

## 2. Kullanıcı bağlamı

| | Studio kullanıcısı | Atölye kullanıcısı |
|---|---|---|
| Rol | Dil ve konuşma terapisti (DKT) | Özel eğitim öğretmeni, ÖÖG/DEHB uzmanı |
| Ortam | Klinik / özel eğitim merkezi | Okul, destek eğitim odası, merkez |
| Cihaz | Masaüstü ağırlıklı (seans arası), telefon ikinci ekran | Aynı; veliyle konuşurken telefon |
| Tipik oturum | 5–15 dk, seans arası "hızlı üret & yazdır" | 10–30 dk, BEP/rapor hazırlığı |
| Duygu durumu | Zaman baskısı + evrak yorgunluğu | Aynı + resmî belge kaygısı (MEB uyumu) |
| Beklenti | "Bunu bana 30 saniyede hazırla, çıktısı basılabilir olsun" | Aynı + "resmî dile uygun olsun" |

**UX çıkarımı:** hız ve güven ana metrik. Uzun form → kısa yol yok; bu yüzden formlar **öğrenci seçince otomatik dolar** (`StudentPicker` kademe/ilgi alanı/MEB bölümü doldurur). Üretim beklerken kullanıcı ekranı terk etmemeli → beklemenin görünür ve açıklamalı olması gerekir.

---

## 3. Bilgi mimarisi — tam rota haritası

Kolonlar: **Kabuk** = hangi çerçeve (§5), **Kapı** = erişim, **Tema** = light zorunlu mu.

### 3.1 Hub / pazarlama & kimlik (light zorunlu)
| Rota | Ekran | Kabuk | Kapı |
|---|---|---|---|
| `/` | Ana sayfa (tam landing, `FullLanding`) | Poster landing (`.yb-*`) | Açık |
| `/fiyatlandirma` | Plan karşılaştırma | Marketing | Açık |
| `/giris` · `/kayit` | Giriş / kayıt (`?module=studio\|atolye`) | **AuthShell** (split-screen) | Açık |
| `/sifremi-unuttum` · `/sifre-sifirla` · `/verify-email` | Parola & e-posta doğrulama | AuthShell | Açık |
| `/odeme` | Checkout (plan + fatura profili + kart) | Sade merkezî kolon | Oturum |
| `/odeme/sonuc` (route) · `/odeme/hata` | 3DS dönüşü / hata | Sade | Oturum |
| `/gizlilik` · `/kosullar` · `/kvkk` | Hukuki metinler | **Legal** (dar okuma kolonu) | Açık |

### 3.2 Hesap merkezi — `/hesap/*` (AppSidebar)
`/hesap` (genel bakış) · `/hesap/profil` · `/hesap/abonelik` · `/hesap/tahsilat` *(yalnız admin)*
> Modülden bağımsız, **merkezî** hesap/abonelik yeri. Modül içindeki `/studio/subscription` ve `/atolye/abonelik` bunun modül-yüzü.

### 3.3 Studio — `/studio/*`
| Grup | Rotalar |
|---|---|
| Vitrin | `/studio` (modül landing; üyeyse dashboard'a yönlenir) |
| `(main)` | `/dashboard` · `/tools` · `/generate` · `/students` · `/students/[id]` · `/cards` · `/cards/[id]` · `/calendar` · `/profile` · `/subscription` |
| Araçlar (9+1) | `tools/social-story` · `articulation` · `homework` · `weekly-plan` · `goal-tracker` · `session-summary` · `matching-game` · `phonation` · `comm-board` (+ `/generate` = Öğrenme Kartı) |
| `(admin)` | `/admin` · `users` · `users/[id]` · `audit` · `health` · `revenue` · `usage` · `webhooks` |

Araç kataloğu 3 sekmeli gruplanır: **Üretici · Organizatör · Aktiviteler** (renk: blue · accent · yellow).

### 3.4 Atölye — `/atolye/*`
| Grup | Rotalar |
|---|---|
| Vitrin | `/atolye` (modül landing) |
| `(app)` | `/dashboard` · `/araclar` · `/vakalarim` · `/vakalarim/[caseId]` · `/kutuphane` · `/takvim` · `/abonelik` · `/profil` · `/admin*` |
| Araçlar (11) | `araclar/bep` · `uyarlama` · `ilerleme-cizelgesi` · `seans-plani` · `materyal` · `okuma` · `matematik` · `davranis` · `sosyal-oyku` · `veli-mektubu` · `ev-odevi` |

Araç kataloğu 4 kategoriye ayrılır: **BEP & Değerlendirme · Seans & Müdahale Materyalleri · Sosyal & Davranışsal Destek · Veli & Ev Koordinasyonu**.

### 3.5 Kapı mantığı (middleware)
- `/studio/*` ve `/atolye/*` çerez yoksa → `/giris?callbackUrl=…`
- **İstisna:** `/studio` ve `/atolye` kökleri açıktır (girişsiz ziyaretçi modül landing'ini görür).
- API rotaları redirect edilmez, kendi 401 JSON'unu döner.
- Eski `/studio/login` gibi yollar → merkezî `/giris?module=studio`'ya taşınır (404 üretmemek için).

---

## 4. Navigasyon modeli

Beş kabuk tipi vardır; **yeni ekran bunlardan birine oturur.**

1. **Poster landing** (`/`) — üst bar + hero + yatay eşit modül kartları + footer. Kartlar hover'da genişler (`flex-grow: 1.7`), mobilde akordeon değil, içerik hep açık (hydration/CLS güvenliği).
2. **AppSidebar** (`@ludenlab/ui`) — Atölye `(app)` ve `/hesap`. 244px sabit sol menü; üstte kullanıcı başlığı (baş harf avatarı + ad + rol), ortada nav, altta tema toggle + e-posta + çıkış. ≤860px'te **overlay** olur, üstte mobil bar belirir.
3. **Studio Sidebar** (`@studio/components/poster/sidebar`) — **daraltılabilir** (256px ↔ 72px), profil avatarı ve plan etiketini API'den çeker; ≤768px'te üstten açılan mobil menü.
4. **AuthShell** — 1024px üstü split-screen: solda modüle göre temalanan poster paneli (eyebrow rozeti, tagline, iki eğik stat kartı), sağda ≤420px form. Mobilde sol panel gizlenir.
5. **Legal** — 820px okuma kolonu, üstte logo, altta çapraz linkler.

**Modüller arası geçiş:** iki modüle de üyeliği olan kullanıcıya sidebar footer'ında `ModuleSwitchButton` ("Studio'ya geç" / "Atölye'ye geç") çıkar. Bu, ürünün "tek hesap iki modül" vaadinin tek görünür yeridir — tasarımda güçlendirilmeye açık.

**Aktif durum kuralı:** `p-navitem--active` = turuncu dolgu + ink kenar + katı gölge; `aria-current="page"`. Alt-rota eşleşmesi prefix'e göre (index item'ları `exact`).

---

## 5. Kabuk & layout katmanları

```
app/layout.tsx                    <html lang="tr"> + <body class="poster-scope">
│  ├─ FOUC tema script'i (inline)  → yalnız /studio/* ve /atolye/* ALT rotalarında .dark eklenebilir
│  └─ Font <link>'leri            → Satoshi (Fontshare) + Bricolage Grotesque (Google)
│
├─ app/(legal)/layout.tsx         Legal kabuk
├─ app/hesap/layout.tsx           auth gate + AppSidebar
├─ app/atolye/layout.tsx          ThemeProvider + PToaster + atolye.css
│   └─ (app)/layout.tsx           auth gate + billing reconcile + AppSidebar
└─ app/studio/layout.tsx          ThemeProvider + AuthSessionProvider + PToaster + CookieBanner + studio.css
    ├─ (main)/layout.tsx          Sidebar + <main> (kendi scroll'u)
    │   └─ template.tsx           her rota geçişinde 150ms opacity fade (framer-motion)
    └─ (admin)/layout.tsx         admin kabuk
```

**Tema politikası (tasarımı doğrudan bağlar):**
- Pazarlama, auth, hukuki, ödeme ve **modül landing'leri her zaman LIGHT** — kullanıcının sistemi koyu olsa bile. `AuthShell` bunu bir MutationObserver ile zorlar.
- **Dark yalnız uygulama içinde** (`/studio/dashboard`, `/atolye/araclar/*` gibi alt rotalar) ve yalnız kullanıcı tercih ettiyse (`luden-theme` localStorage; `system` de destekli).
- Pratik sonuç: **her uygulama ekranı iki temada da tasarlanmalı; her pazarlama ekranı yalnız light.**

**Not:** `(app)`/`(main)` layout'ları `export const dynamic = "force-dynamic"` — auth cookie okundukları için statik prerender yok. Tasarımda "anlık statik açılış" varsayma; ilk boyamada **skeleton** planla.

---

## 6. Tasarım sistemi katmanı

### 6.1 Token'lar — kanonik kaynak `packages/ui/src/styles/poster.css`

```css
:root, .poster-scope{
  /* yüzey & mürekkep (LIGHT) */
  --poster-bg:#fff8ec; --poster-bg-2:#fde8c7; --poster-panel:#ffffff;
  --poster-ink:#0e1e26; --poster-ink-2:rgba(14,30,38,.7);
  --poster-ink-3:rgba(14,30,38,.6); --poster-ink-faint:rgba(14,30,38,.12);

  /* aksan & kategorik */
  --poster-accent:#fe703a; --poster-accent-ink:#e3602e; --accent-on:#fff;
  --poster-green:#2cc069; --poster-yellow:#ffce52;
  --poster-pink:#ff6b9d;  --poster-blue:#4a90e2; --poster-danger:#c53030;

  /* derinlik paleti */
  --poster-deep-teal:#0C3B3C; --poster-clay:#B0432A;
  --poster-plum:#6E2440;      --poster-ochre:#B07512;
  --logo-wordmark:#023435;

  /* yumuşak tint'ler (gradient YERİNE) */
  --poster-accent-soft:#FDE6DA; --poster-green-soft:#DCF1E4;
  --poster-yellow-soft:#FBEFCE; --poster-blue-soft:#DEEAF6;
  --poster-danger-soft:#F6DCD9; --poster-deep-teal-soft:#D7E5E2;

  /* geometri */
  --poster-radius-sm:10px; --poster-radius-md:14px;
  --poster-radius-lg:18px; --poster-radius-xl:22px; --poster-radius-pill:999px;
  --poster-border:2px solid var(--poster-ink);

  /* İMZA: katı ofset gölge — blur YOK */
  --poster-shadow-sm:0 2px 0 var(--poster-ink);
  --poster-shadow-md:0 4px 0 var(--poster-ink);
  --poster-shadow-lg:0 6px 0 var(--poster-ink);
  --poster-shadow-xl:0 9px 0 var(--poster-ink);

  /* hareket */
  --ease-out-expo:cubic-bezier(.16,1,.3,1);
  --dur-press:80ms; --dur-hover:150ms; --dur-panel:280ms;

  /* tipografi */
  --font-display:"Bricolage Grotesque","Satoshi",system-ui,sans-serif;
  --font-body:"Satoshi",system-ui,sans-serif;
  --font-mono:ui-monospace,"SF Mono",Menlo,monospace;

  /* 4px grid */
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px;
  --space-5:20px; --space-6:24px; --space-8:32px; --space-10:40px;
  --space-12:56px; --space-16:72px;
}
.dark{ /* derin kraft — ink ↔ krem yer değiştirir */
  --poster-bg:#15100a; --poster-bg-2:#1e1811; --poster-panel:#1e1811;
  --poster-ink:#f5e8c7; --poster-danger:#ff7a7a; --logo-wordmark:#f5e8c7;
  --poster-deep-teal:#2E8C84; --poster-clay:#DF6A45;
  --poster-plum:#B45876;      --poster-ochre:#E0A93A;
}
```

**Kategorik renkler iki temada da aynıdır** (chip/badge tanınırlığı bozulmasın diye). `--poster-ink` tema ile *anlam değiştirir*, o yüzden `#0e1e26` yazmak yerine daima `var(--poster-ink)`.

Semantik köprüler: `--bg`, `--bg-elevated`, `--fg1/2/3`, `--accent`, `--alert-*-bg/border/text`, çalışma alanı renkleri `--workarea-speech|language|hearing`.

**Dar ekran kuralı:** ≤640px'te ofset gölgeler otomatik küçülür (6px → 3px) — yatay taşma önlenir. Mobil mock'larda kalın gölge çizme.

### 6.2 Sınıf katalogu (`.p-*`) — hazır gramer
`p-h1 p-h2 p-h3 p-h4 p-lead p-body p-small p-mono p-eyebrow p-link` ·
`p-btn` (+`--accent|solid|white|danger|ghost`, `--sm|md|lg`) ·
`p-card` (+`--hover|flat|ink`) · `p-section` (+`__head/__body`) ·
`p-field p-label p-hint p-input p-textarea p-select p-chips p-chip` ·
`p-badge` (+11 ton) · `p-alert` (+`error|success|warning|info`) ·
`p-spinner p-progress p-skeleton` · `p-appbar` · `p-shell p-sidebar p-navitem` ·
`p-stat` · `p-tabs p-tab` · `p-modal` · `p-reveal-on-scroll`

**Etkileşim gramerleri (değişmez):**
- **Basma:** `translateY(4px)` + `box-shadow: 0 0 0` — düğme kâğıda basılır. 80ms.
- **Hover kaldırma:** `translateY(-1px/-2px)` + gölge +1–2px. Yoğun listelerde satırlarda **yok** (titreme).
- **Odak:** 2px ink outline, 2px offset (global `:focus-visible`).
- **Chip seçili:** `aria-pressed="true"` → ink dolgu + krem yazı.

### 6.3 Bileşen envanteri

**`@ludenlab/ui` (ortak, kanonik):** `Logo` · `PButton` · `PCard` `PSection` · `PField PInput PTextarea PSelect PTextField` · `PBadge PAlert PSpinner PSkeleton` · `PStatCard` · `PTabs` · `PModal` · `AppShell` `AppSidebar` · `ThemeProvider ThemeToggle` · `PToaster/toast` (sonner) · `cn()`.

**`@studio/components/poster` (ikinci, Studio'ya özel):** `PBtn PCard PBadge Blob Squiggle` · `PInput PTextarea PLabel PFieldHint PSelect PCheckbox PSwitch PAlert` · `PTable(+Header,Row) PProgress PSkeleton` · `PModal PTabs PToaster PSpinner PEmptyState PStatCard PHoverPanel PSection` · `Sidebar` · `glass-calendar` · `pricing`.

**Modül-özel akış bileşenleri:** Atölye `StudentPicker · MebHedefSelect · MebModulSecici · ToolResult · TaslakViewerModal · Markdown` · Studio `ToolShell/ToolHeader/ToolEmptyState/ToolLoadingCard · CardGeneratorForm · *View (8 çıktı görünümü) · CardPDFDocument · SwipeableCard · CurriculumPicker · ProgressTab`.

> ⚠️ **Bilinen borç:** iki paralel primitive seti var (§14-A). Yeni tasarımlar **`@ludenlab/ui` + `.p-*` gramerini** referans almalı; Studio'ya özel `P*` yalnız mevcut Studio ekranları düzenlenirken.

---

## 7. Sayfa arketipleri

Yeni ekran = bu dokuzdan biri. Her arketip anatomisi + responsive davranışı sabittir.

### A. Poster Landing (`/`, `/studio`, `/atolye`)
`Üst bar (wordmark + nav + durum pill)` → `Hero (eyebrow · h1 + sarı marker vurgusu · alt metin · chip'ler · dekoratif blob/squiggle)` → `Modül/özellik kartları (eşit kolon, hover'da genişler, üstte 8px renk şeridi, ikon karosu, özellik listesi, mockup, CTA)` → `Footer (telif · e-posta · hukuki linkler · ödeme rozetleri)`.
**Mobil (≤980px):** kartlar tek kolona iner, tilt/gölge sadeleşir, nav gizlenir, tüm içerik açık kalır.

### B. Auth (`/giris`, `/kayit`, parola akışları)
Split-screen. Sol: modüle göre temalanmış poster panel (Studio = deep teal, Atölye = turuncu, generic = LudenLab). Sağ: 420px form — `AuthLabel` + `AuthInput` + `PasswordMeter` + `AuthAlert` + tek turuncu CTA + alt geçiş linki.
**Her zaman light.** Mobilde yalnız form + üstte logo.

### C. Dashboard (`/studio/dashboard`, `/atolye/dashboard`)
`Selamlama (İyi günler, {ad} 👋 + özet satır) + birincil CTA ("Üret")` → `Stat şeridi (auto-fit minmax(190px,1fr), PStatCard: ikon karosu + değer + etiket)` → `Hızlı araçlar (kart ızgarası, rozetli)` → `Son üretilenler / son öğrenciler listesi` → `boşsa: onboarding boş durumu`.
Atölye stat seti: Aktif öğrenci · Üretilen taslak · Seans · **Kalan üretim hakkı**.

### D. Araç kataloğu (`/studio/tools`, `/atolye/araclar`)
Kategori başlıkları (Studio'da `PTabs` ile filtreli, Atölye'de düz gruplar) + kart ızgarası. Kart = 44px renkli ikon karosu + başlık + 2 satır açıklama + (opsiyonel) `POPÜLER` / `Yakında` rozeti. Hover'da kaldırma.

### E. **Araç / üretim ekranı** *(ürünün kalbi)*
İki kolon: **sol form (≈380–420px veya 1fr) · sağ sonuç (1fr)**; `.poster-tool-grid` ile ≤900px'te tek kolona iner.
- Sol: `p-eyebrow` + `p-h3` başlık → `PSection` grupları (Öğrenci bilgisi / Hedef / Kısıtlar) → `StudentPicker` (seçince kademe, ilgi alanı, MEB bölümü otomatik dolar) → alanlar → tek turuncu **Üret** CTA (yükleniyorken `PSpinner` + "Üretiliyor…", disabled).
- Sağ: **boş durum** (kesikli kenarlı, ikonlu, "Sol taraftan … doldurup üretin") → **yükleme kartı** (spinner + dönüşümlü açıklayıcı mesaj) → **sonuç** (`ToolResult` / `*View`: markdown veya yapılandırılmış görünüm + Kopyala / PDF / Kaydet aksiyonları).
- Üstte Studio'da `ToolHeader`: "← Araçlara Dön" + başlık + açıklama + sağda aksiyonlar.

### F. Liste / tablo (`/studio/students`, `/cards`, `/atolye/vakalarim`, `/kutuphane`, admin)
Poster-list reçetesi: 2px ink dış kap + 18px yarıçap + `shadow-lg`, başlık satırı `--poster-bg-2` üstünde 11px/800 büyük harf, satır ayracı **2px dashed `--poster-ink-faint`**, satır hover'da zemin `--poster-bg-2` (transform yok), 44px renkli baş-harf avatarı, kategori `PBadge`, sayısal hücre (22px/800 değer + 10px birim), `PProgress`, sonda turuncu `→`.
Kolon şablonu (kişi listesi): `52px 1fr 180px 200px 40px`.

### G. Detay (`/students/[id]`, `/vakalarim/[caseId]`, `/cards/[id]`)
Üstte kimlik başlığı (avatar + ad + rozetler + aksiyonlar) → `PTabs` (Profil · İlerleme · Kartlar/Taslaklar · Seanslar) → sekme gövdesi kart ızgarası. Silme gibi yıkıcı işlemler `PModal` onayı ister.

### H. Ayarlar / Abonelik (`/hesap/*`, `/studio/subscription`, `/atolye/abonelik`, `/fiyatlandirma`)
`PSection` yığını: Mevcut plan kartı (plan adı + kalan hak + dönem bitişi) → plan karşılaştırma (aylık/yıllık toggle, yıllık %15 indirim rozeti) → fatura profili formu → tehlikeli bölge (iptal / downgrade) en altta, `PendingDowngradeBanner` ile bekleyen değişiklik görünür.
> Public `/fiyatlandirma` ile giriş-arkası `/hesap/abonelik` **aynı `AbonelikGrid` bileşenini** paylaşır (public sürümde `active:false` → abonelik banner'ı çıkmaz). Fiyat kartı tasarımı değişirse ikisi birden değişir.

### I. Admin (`/studio/admin/*`, `/atolye/admin/*`)
Yoğunluk öncelikli: stat şeridi + filtre barı + tablo + toplu işlem + `ManageUserModal`. Poster dili korunur ama gölge/rotasyon minimum; CSV dışa aktarma standart aksiyon.

---

## 8. Çekirdek akışlar (UX kritik)

### 8.1 Edinme → hesap
```
/  ─(modül kartı CTA)→  /studio | /atolye (modül landing)
   └─(Fiyatlandırma)→   /fiyatlandirma
/kayit?module=X → e-posta doğrulama (/verify-email) → /giris → callbackUrl → modül dashboard
```
Ayrım noktası: **kayıt merkezîdir, modül `?module` ile yalnız görsel bağlam verir.** Tasarımda kullanıcının "hangi ürüne kaydoluyorum?" sorusu sol panelde yanıtlanır.

### 8.2 Üretim akışı (en sık kullanılan yol)
```
Araç kataloğu → araç sayfası → öğrenci seç (form otomatik dolar) → alanları tamamla
   → [Üret] → POST /{modul}/api/{arac}
      ├─ hızlı hatalar normal JSON (401 · 403 · 422 · kota)
      └─ yavaş yol SSE-heartbeat (streamingJson): ~15sn'de bir ping, sonuç tek `result` event'i
   → sonuç paneli: görüntüle · kopyala · PDF · kaydet (Kütüphane)
```
**Neden önemli:** üretim 60 saniyeyi aşabiliyor (BEP prod'da 67sn ölçüldü). Safari sessiz isteği kesiyordu; SSE-heartbeat ile çözüldü. **Tasarım gereği:** bekleme ekranı 60+ saniyeyi taşıyabilmeli — tek dönen spinner yetmez; dönüşümlü açıklayıcı mesaj, ilerleme hissi ve "sekmeyi kapatma" güvencesi gerekir. (Bugün `ToolLoadingCard` bunun temelini veriyor, iyileştirmeye açık.)

### 8.3 Hak (kota) ekonomisi
1 üretim = 1 hak. FREE 2 · PRO 100 · ADVANCED 500 · ENTERPRISE sınırsız (aylık).
Görünürlük noktaları: dashboard stat kartı ("Kalan üretim hakkı") · abonelik sayfası · üretim reddi.
**Tasarlanması gereken an:** hak bittiğinde üretim çağrısı hata döner. Bugün bu jenerik hata metni olarak görünüyor — arzu edilen: **kilitli CTA + kalan hak rozetleri + "Planı yükselt" yolu** (bkz. §14-D).

### 8.4 Ödeme (iyzico, native abonelik)
```
Plan seç (/fiyatlandirma veya modül abonelik sayfası)
 → /odeme?module=&code=&interval=   (oturum yoksa /giris'e, callbackUrl korunur)
 → fatura profili + kart formu → 3DS
 → /odeme/sonuc (başarı) | /odeme/hata (başarısız)
 → entitlement reconcile → modül planType + hak yenilenir
```
Downgrade **dönem sonunda** uygulanır; `PendingDowngradeBanner` ile beklemedeki değişim her sayfada görünür. İptal sonrası erişim dönem sonuna kadar sürer — bu mesaj net verilmeli.

### 8.5 Modül geçişi
İki modüle de üyelik varsa sidebar footer'ında geçiş butonu. Üyelik yoksa buton yok (keşfedilebilirlik borcu — §14-E).

---

## 9. Durum & geri bildirim grameri

| Durum | Bugünkü çözüm | Kural |
|---|---|---|
| Boş | Kesikli 2px kenar + `--poster-bg-2` zemin + ikon + başlık + ipucu (`ToolEmptyState`, `PEmptyState`) | Boş durum **her zaman bir sonraki adımı söyler** |
| Yükleniyor (kısa) | `PSpinner` (turuncu üst kenarlı halka) buton içinde + disabled | Buton metni "Üretiliyor…" olur |
| Yükleniyor (uzun/AI) | Sonuç panelinde yükleme kartı | 60sn+ taşıyacak anlatım gerekir |
| İskelet | `p-skeleton` (bg-2 + faint kenar + pulse) | SSR sonrası liste/dashboard için |
| Hata (alan) | `aria-invalid="true"` → kırmızı kenar + `0 2px 0 danger` gölge + `p-field-error` | Alan altında, kısa, çözüm önerili |
| Hata (form/istek) | `PAlert tone="error"` (`role="alert"`) | Ağ hatası metni: "Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin." |
| Başarı | `toast()` (sonner, poster temalı, top-center) | Kalıcı sonuç varsa toast + panel birlikte |
| Onay (yıkıcı) | `PModal` + danger butonu | ESC + backdrop ile kapanır, body scroll kilitlenir |
| İlerleme | `p-progress` (ink kenarlı, turuncu dolgu) | Hedef/ilerleme görselleştirmesi |

**Eksik:** `error.tsx` / `not-found.tsx` / `loading.tsx` **hiç yok** (0 dosya). Yani beklenmeyen hata ve 404 için tasarlanmış bir ekran yok — Next.js'in kendi çıplak ekranı görünür. Bu lansman denetiminde **G3 açık madde** olarak duruyor ve tasarım işi bekliyor (§14-B).

---

## 10. Responsive & mobil

**Kullanılan kırılım noktaları** (tek bir ölçek değil, tarihsel — tasarımda bunlara sadık kal):

| px | Ne olur |
|---|---|
| ≤560 | Landing "coming soon" kartı sadeleşir, footer tek kolon |
| ≤640 | **Ofset gölgeler küçülür** (`sm/md/lg/xl` → 1/2/3/5px) |
| ≤700 | `p-appbar` nav linkleri gizlenir, marka + aksiyon kalır |
| ≤768 | Studio sidebar → mobil üst menü |
| ≤860 | `AppSidebar` → overlay + mobil bar (`p-shell__mobilebar`) |
| ≤900 | **`.poster-tool-grid` tek kolona iner** (araç ekranları) |
| ≤960 | Atölye landing grid'leri 4→2, 3→1 |
| ≤980 | Hub landing kartları dikey akış |
| ≥981 | Landing kartlarında mockup + detaylar varsayılan görünür |
| ≥1024 | AuthShell split-screen açılır |

**Değişmez mobil kuralları (kodda zorlanıyor):**
- Tüm `input/select/textarea` → `font-size: max(16px, 1rem)` (iOS otomatik zoom engeli).
- `touch-action: manipulation` + özel tap-highlight (300ms gecikme ve mavi flaş yok).
- `100dvh` (iOS adres çubuğu/klavye).
- Modal açıkken `overscroll-behavior: contain`, body scroll kilidi.
- Sidebar overlay `overscroll-behavior: contain` + backdrop.
- Açık borç: `safe-area-inset` desteği (çentikli cihazlarda alt CTA) — P2.

---

## 11. Erişilebilirlik

**Var:** global `:focus-visible` (2px ink outline + offset) · `prefers-reduced-motion: reduce` tüm animasyonları kısar · `aria-current="page"` nav'da · `role="alert"`/`status` alert ve spinner'da · `aria-pressed` chip'lerde · `aria-invalid` form alanlarında · `role="dialog" aria-modal` modallarda · ESC ile kapatma · `id="main-content"` (skip-link için hazır hedef) · `aria-hidden` dekoratiflerde.

**Açık borçlar:**
- **Skip-link render edilmiyor:** `id="main-content"` hedefi ve `.skip-link` stili (`studio.css:262`) var ama hiçbir bileşen bu linki basmıyor.
- Uzun AI üretimlerinde `aria-live` duyurusu yok — ekran okuyucu sonucun geldiğini bilmiyor.
- Dark temada bazı yumuşak tint + metin çiftlerinin kontrastı sistematik doğrulanmadı.
- Sarı (`#ffce52`) üstünde beyaz metin **kullanılmamalı** — badge'de ink'e zorlanıyor, yeni tasarımlarda da aynısı geçerli.
- Emoji ikon kullanımı (bazı `PSection` başlıklarında 🗓️ gibi) — `lucide-react`'a çevrilmeli (marka kararı: ikonlar lucide).

---

## 12. Performans & algı

- `(app)`/`(main)` layout'ları `force-dynamic` → her gezinti sunucudan; **iskelet planla**, boş beyaz bekleme değil.
- Studio'da `template.tsx` her rota değişiminde 150ms opacity fade (reduced-motion'a saygılı).
- Landing tamamen CSS ile responsive; JS yalnız hover/focus guard'ı için → **CLS ve hydration sorunu çıkarmama** kısıtı tasarımı bağlar (mobilde akordeon yerine "hep açık" tercih edildi).
- Tema FOUC'u root layout'taki inline script çözer; tema toggle mount-guard'lı.
- Fontlar dış kaynaktan (`api.fontshare.com` + Google Fonts) — `display=swap`.
- Görsel üretimi olan araçlarda global kelime-cache + Supabase Storage (ilk yüklemede gecikme olabilir → iskelet).

---

## 13. Dil, ton ve terminoloji

**Dil:** Türkçe, sıcak ama profesyonel. Damgalayıcı dil yasak (özellikle veli mektubu, sosyal öykü gibi çıktılarda).

⚠️ **Hitap bugün tutarsız:** pazarlama ve abonelik yüzeyi **senli** ("İhtiyacına uygun planı seç", "Yıllık alımlarda %15 indirim avantajını kaçırma"), uygulama içi form ve hata metinleri **sizli** ("Öğrenci seçin.", "Bağlantınızı kontrol edip tekrar deneyin."). Yeni tasarımlarda bu ayrımı **bilinçli kural** olarak koru veya birleştir; karar verilmeden karışık kullanma (§14-F).

**Terim sözlüğü (tutarlılık zorunlu):**

| Kullan | Kullanma | Not |
|---|---|---|
| **üretim hakkı** | kredi, token, jeton | 2026-08'de değişti (iyzico uyumu). Kod da `credits` alanını taşısa da **arayüzde "hak"** |
| **taslak** | döküman, çıktı | AI ürettiği metin |
| **öğrenci** | vaka, danışan | Atölye'de rota `/vakalarim` ama **etiket "Öğrencilerim"** |
| **Studio** | Stüdyo | Marka kararı: İngilizce yazım |
| **Atölye** | Workshop, Atolye | Türkçe, şapkalı |
| **Araçlar** | Modüller | "Modül" = Studio/Atölye seviyesidir |
| **Kütüphane** | Arşiv | Kaydedilmiş üretimler |
| **Panel** | Dashboard (TR arayüzde) | Atölye'de "Panel", Studio'da tarihsel "Dashboard" — **birleştirilmeli** (§14-F) |

**Mikrometin kalıpları:** boş durum = "Henüz X yok" + "Şuradan başlayın →"; hata = ne oldu + ne yapmalı; onay = geri alınabilirlik durumu ("Dönem sonuna kadar erişiminiz sürer").

---

## 14. Bilinen UI/UX borcu — tasarım fırsat listesi

Öncelik sırasıyla. Claude Design'da yeni iş açarken buradan seç.

**A. İki paralel tasarım sistemi (P1, en büyük tutarsızlık kaynağı)**
`@ludenlab/ui` (`.p-*` sınıf tabanlı, token'lı) ve `@studio/components/poster` (inline-style tabanlı, kendi token kopyası `studio.css`'te) yan yana yaşıyor. Aynı buton iki farklı API'ye sahip (`PButton` vs `PBtn`), Studio input'ları focus'ta inline `boxShadow` yazıyor. **Fırsat:** tek bir bileşen sözlüğü + Studio ekranlarının kademeli göçü için eşleme tablosu.

**B. Hata & 404 ekranları yok (P0 — lansman kapısı G3)**
`error.tsx`, `global-error.tsx`, `not-found.tsx` hiç yok. Poster dilinde 404 / 500 / bakım ekranları tasarlanmalı (blob + squiggle + tek CTA "Panele dön").

**C. Uzun üretim beklemesi (P1)**
60–70 saniyelik bekleme tek spinner'la taşınıyor. **Fırsat:** aşamalı ilerleme anlatısı ("Profil okunuyor → Hedefler yazılıyor → Biçimleniyor"), tahmini süre, sekme kapatma güvencesi, arka planda tamamlanma bildirimi.

**D. Kota tükenmesi deneyimi (P1)**
Hak bitince kullanıcı bunu ancak üretmeye çalışınca ve jenerik hata olarak görüyor. **Fırsat:** araç sayfasında kalıcı hak sayacı, 1 hak kalınca uyarı, 0'da kilitli CTA + yükseltme kartı.

**E. "Tek hesap, iki modül" görünmüyor (P2)**
Vaat landing'de güçlü ama ürün içinde yalnız küçük bir sidebar butonu. **Fırsat:** çapraz-modül keşif kartı, ortak "Hesabım" girişinden modül anahtarı.

**F. Terim, etiket ve hitap tutarsızlıkları (P2)**
"Panel" vs "Dashboard", `/vakalarim` vs "Öğrencilerim", Studio araç adları İngilizce rota + Türkçe etiket; ayrıca **senli pazarlama / sizli uygulama** ayrımı karar verilmemiş durumda. Sözlük ve hitap kuralı (§13) netleştirilip uygulanmalı.

**G. Inline style yoğunluğu (P2)**
Layout ve tool bileşenlerinin büyük kısmı `style={{…}}` ile yazılmış; tema değişimi token'la çalışıyor ama **tasarım varyantı üretmek zor**. Yeni ekranlarda `.p-*` sınıfları tercih edilmeli.

**H. Erişilebilirlik tamamlama (P2)** — skip-link, `aria-live`, dark kontrast denetimi, emoji→lucide.

**I. `safe-area-inset` (P2)** — çentikli cihazlarda alt aksiyon barları.

---

## 15. Claude Design'a iş verirken

**Brief kalıbı:**
```
Ekran: <ad>            Arketip: §7-<harf>
Yüzey: hub | studio | atolye        Tema: light-only | light+dark
Kabuk: AppSidebar | Studio Sidebar | AuthShell | Legal | Landing
Kullanıcı hedefi: <tek cümle>
Durumlar: boş / yükleniyor / hata / dolu   (dördü de istenir)
Kırılımlar: 1440 · 1024 · 768 · 375
Kısıtlar: poster token'ları (§6.1), gradient yok, blur gölge yok,
          tek turuncu CTA, TR metin, terim sözlüğü (§13)
Çıktı: tek dosya HTML, :root'ta token bloğu, lucide ikon SVG inline
```

**Kabul kriterleri (DoD):**
- [ ] Tüm renkler `var(--poster-*)`; hiç ham hex yok (token tanımı hariç)
- [ ] Gölgeler `0 Ypx 0 var(--poster-ink)`; blur yok
- [ ] Kenarlıklar 2px ink; yarıçaplar 10/14/18/22/999 ölçeğinden
- [ ] Başlıklar Bricolage Grotesque, gövde Satoshi
- [ ] Sayfada **tek** turuncu birincil CTA
- [ ] 375px'te yatay scroll yok, input ≥16px, dokunma hedefi ≥44px
- [ ] Dört durum da çizilmiş (uygulama ekranıysa)
- [ ] Light + dark (uygulama ekranıysa) · yalnız light (pazarlama/auth ise)
- [ ] Odak halkası görünür; `prefers-reduced-motion` bozmuyor
- [ ] Metinler §13 sözlüğüne uygun ("üretim hakkı", "taslak", "öğrenci")

---

## 16. Kaynak (source of truth)

| Konu | Dosya |
|---|---|
| Token + `.p-*` sistemi (**kanonik**) | `packages/ui/src/styles/poster.css` |
| Ortak bileşenler | `packages/ui/src/*.tsx` (`index.ts` dışa aktarım listesi) |
| Studio ikinci primitive seti + reçeteler | `apps/hub/src/modules/studio/components/poster/README.md` |
| Landing CSS (`.yb-*`, `.cs-*`) | `apps/hub/src/app/globals.css` |
| Studio/Atölye modül CSS | `apps/hub/src/modules/{studio,atolye}/styles/*.css` |
| Kabuklar | `packages/ui/src/{shell,sidebar}.tsx`, `apps/hub/src/components/auth/AuthShell.tsx` |
| Araç ekranı iskeleti | `apps/hub/src/modules/studio/components/tools/ToolShell.tsx` |
| Rota kapıları | `apps/hub/src/middleware.ts` |
| Uzun üretim protokolü | `apps/hub/src/lib/{streamingJson,fetchGeneration}.ts` |
| Plan / hak ekonomisi | `apps/hub/src/modules/{studio,atolye}/lib/plans.ts` |
| Marka & görsel dil | `docs/brand/ludenlab-gorsel-tasarim-claude-project.md` |
| Açık kalite maddeleri | `LANSMAN_DENETIMI_2026-07-02.md` |

**Değiştiyse burayı güncelle:** yeni rota grubu, yeni kabuk, token adı değişikliği, terim değişikliği, yeni arketip.
