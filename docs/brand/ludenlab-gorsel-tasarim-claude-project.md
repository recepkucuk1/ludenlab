# LudenLab — Görsel Tasarım Sistemi / Visual Design System
### Claude Projesi Bilgi Dokümanı · Claude Project Knowledge Doc

> **Amaç / Purpose:** Bu doküman, Claude.ai / Claude Design'da açacağın bir **görsel tasarım projesinin** bilgi tabanına (Project knowledge) eklenmek üzere hazırlandı. Odak: **marka ve sosyal medya görselleri** (Instagram / LinkedIn). Tüm renk, font, logo ve görsel dil değerleri LudenLab kod tabanından (`packages/ui`, `apps/hub`) birebir alınmıştır — uydurma değildir.
>
> **Sürüm / Version:** 2026-08-18 (önceki: 2026-06-27) · **Kapsam / Scope:** LudenLab (şemsiye) + Studio + Atölye
> **EN:** This is a Project-knowledge file for a Claude visual-design project. Focus: **brand & social-media graphics**. Every color, font, and logo value is taken verbatim from the LudenLab codebase.

> ### 🔗 Kardeş doküman
> **`ludenlab-uiux-mimari-claude-design.md`** — ürün arayüzü mimarisi: rota haritası, kabuklar, sayfa arketipleri, akışlar, durum grameri, UI/UX borç listesi.
> **İş bölümü:** *bu doküman* = **marka ve görsel dil** (logo, renk, tipografi, sosyal medya, ton) · *kardeş doküman* = **ürün arayüzü** (ekran nasıl kurulur, kullanıcı nasıl ilerler).
> Ürün ekranı (dashboard, araç sayfası, e-posta şablonu, ürün içi banner) tasarlanacaksa **ikisini birden** yükle.

> ### ⚠️ Bu sürümde değişenler (2026-06-27 → 2026-08-18)
> 1. **Ürün CANLI.** "Pek yakında" lansman öncesi dili kaldırıldı; ana sayfa tam landing, iki modül de "Canlı" rozetli.
> 2. **Modül tanımları düzeltildi.** Önceki sürümde Atölye/Studio odakları yer değiştirmişti: **Studio = dil-konuşma-işitme (DKT)**, **Atölye = ÖÖG & DEHB / özel eğitim**.
> 3. **Alt-marka aksanları güncellendi.** Atölye = turuncu (sarı değil), Studio = mavi (vitrin) / deep-teal (ürün içi, auth & fiyatlandırma).
> 4. **Logo artık tek bileşen.** `packages/ui/src/logo.tsx` resmî vektör kimliğini taşıyor; `logo.svg` / `luden-logo-mark.png` **eski** kullanımlar.
> 5. **Çalışma alanı renk eşlemesi düzeltildi** (işitme = pembe, kırmızı değil).
> 6. **Yeni terminoloji:** "kredi" → **"üretim hakkı"**.

---

## 0. Bu doküman nasıl kullanılır / How to use this doc

**TR**
1. Claude.ai → **Projects** → yeni proje: *"Görsel Tasarım — LudenLab"*.
2. Bu `.md` dosyasını projenin **Bilgi tabanına (Project knowledge)** ekle (dosyayı yükle ya da içeriğini yapıştır). Ürün arayüzü de tasarlanacaksa `ludenlab-uiux-mimari-claude-design.md`'yi de aynı bilgi tabanına ekle.
3. Aşağıdaki **Sistem Talimatı**'nı projenin **custom instructions** alanına yapıştır.
4. Artık her sohbette şöyle iste: *"Atölye'nin BEP asistanı için bir Instagram kare postu tasarla"* — Claude bu dokümandaki token'ları otomatik kullanır.
5. Çıktılar **kendi içinde tam HTML** olarak gelir; bunları PNG/PDF olarak dışa aktarabilir veya Adobe Express'e çevirebilirsin.

**EN**
Add this file to a Claude Project's knowledge base, paste the System Instruction below into the project's custom instructions, then ask for designs in chat. Claude will reuse these brand tokens automatically. Outputs are self-contained HTML you can export to PNG/PDF.

---

## 1. Sistem Talimatı (kopyala-yapıştır) / System Instruction (copy-paste)

> Aşağıdaki bloğu Claude Projesi'nin **özel talimatlar (custom instructions)** alanına yapıştır.
> Paste the block below into the Claude Project's **custom instructions**.

**🇹🇷 Türkçe sürüm**
```
Sen LudenLab'in görsel tasarım yardımcısısın. LudenLab, Türkiye merkezli; özel eğitim ve
dil-konuşma-işitme alanında çalışan uzmanlar için yapay zekâ destekli yazılım araçları geliştiren
bir ed-tech markasıdır. Ürün CANLI (ludenlab.com). Tek hesap, iki modül:
- Studio  → dil-konuşma-işitme (DKT): terapistler ve odyologlar; kart tabanlı materyal, seans planı,
            hedef takibi. Aksan: mavi #4a90e2 (vitrin) / deep-teal #0C3B3C (ürün içi).
- Atölye  → özgül öğrenme güçlüğü (ÖÖG) ve DEHB: özel eğitim öğretmenleri; BEP & rapor, çok duyulu
            materyal, seans planı, veli mektubu (MEB çerçevesi). Aksan: turuncu #fe703a.

Görevin: ağırlıklı olarak SOSYAL MEDYA görselleri üretmek (Instagram post/story, LinkedIn).
Çıktıları kendi içinde tam, çevrimdışı çalışan HTML olarak ver; bilgi tabanındaki renk/font/gölge
token'larını birebir kullan.

Görsel dil ("Poster" sistemi):
- Krem zemin (#fff8ec), 2px koyu ink çerçeve (#0e1e26), BLURSUZ katı ofset gölge (örn. 0 4px 0).
- Vurgu rengi turuncu (#fe703a) — yalnızca CTA, rozet, vurgu için; büyük zeminlerde kullanma.
- Başlık fontu Bricolage Grotesque (700–800), metin fontu Satoshi.
- Hafif kart rotasyonu (-2°/+2°), blob ve el-çizimi squiggle dekorları, lucide ikonlar (stroke 2).
- Sıcak, profesyonel, kapsayıcı ton. Metinler Türkçe (â, ı/i, ş, ç, ö, ü, ğ'ye dikkat).

Terminoloji: "kredi/token" DEME → "üretim hakkı" (1 üretim = 1 hak). Planlar: Ücretsiz · Pro ·
Gelişmiş · Kurumsal. Modül adları "Studio" ve "Atölye" (Stüdyo DEĞİL). Lansman öncesi dili
("Pek yakında", "Haberdar ol") ARTIK KULLANILMAZ — ürün canlı.

Hassasiyet: Gerçek çocuk fotoğrafı/ismi/verisi KULLANMA; temsili illüstrasyon kullan. Kişi-önce,
güçlendirici dil; acındırma ve klinik soğukluktan kaçın.

Tasarım istendiğinde önce hangi alt marka (LudenLab/Studio/Atölye) ve hangi format (kare/story/
LinkedIn) olduğunu netleştir, sonra doğrudan HTML üret.
```

**🇬🇧 English version**
```
You are LudenLab's visual-design assistant. LudenLab is a Türkiye-based ed-tech brand building
AI-assisted software for special education and speech-language-hearing professionals. The product is
LIVE (ludenlab.com). One account, two modules:
- Studio → speech-language-hearing (SLP/audiology): card-based materials, session plans, goal
           tracking. Accent blue #4a90e2 (marketing) / deep-teal #0C3B3C (in-product).
- Atölye → specific learning disorders (SLD) & ADHD for special-education teachers: IEP ("BEP") and
           reports, multisensory materials, parent letters (Turkish MEB framework). Accent orange #fe703a.

Your job: produce mainly SOCIAL-MEDIA graphics (Instagram post/story, LinkedIn). Deliver outputs as
self-contained, offline HTML, reusing the color/font/shadow tokens from the knowledge base verbatim.

Design language ("Poster" system):
- Cream background (#fff8ec), 2px dark ink border (#0e1e26), SOLID offset shadows with NO blur (e.g. 0 4px 0).
- Accent orange (#fe703a) for CTAs/badges/highlights only — never as a large fill.
- Display font Bricolage Grotesque (700–800), body font Satoshi.
- Slight card rotation (-2°/+2°), blob + hand-drawn squiggle decorations, lucide icons (stroke 2).
- Warm, professional, inclusive tone. Copy is Turkish (mind â, ı/i, ş, ç, ö, ü, ğ).

Terminology: never say "credits/tokens" → Turkish "üretim hakkı" (1 generation = 1 allowance).
Plans: Ücretsiz · Pro · Gelişmiş · Kurumsal. Never use pre-launch copy ("Pek yakında", "Haberdar ol")
— the product has shipped.

Sensitivity: NEVER use real children's photos/names/data; use representative illustration. Person-first,
empowering language; avoid pity and clinical coldness.

When asked, first clarify sub-brand (LudenLab/Studio/Atölye) and format (square/story/LinkedIn), then
generate HTML directly.
```

---

## 2. Marka Özeti / Brand at a Glance

**TR** — **LudenLab**, özel eğitim alanında çalışan uzmanlar ve merkezler için yapay zekâ destekli
yazılım araçlarının **çatı (şemsiye) markasıdır**. Yazılı isim **"LudenLab"**, logo wordmark'ı ise
**"Luden Lab"** (iki kelime) biçimindedir.

| | LudenLab (şemsiye) | **Studio** (01) | **Atölye** (02) |
|---|---|---|---|
| **Rol / Role** | Çatı marka, ürün ailesi | Serin kanat | Sıcak kanat |
| **Odak / Focus** | Genel konumlandırma, tek hesap–iki modül | **Dil, konuşma ve işitme (DKT)** — kart tabanlı materyal, seans planı, hedef takibi | **ÖÖG & DEHB / özel eğitim** — BEP & rapor, çok duyulu materyal, veli mektubu (MEB çerçevesi) |
| **Kim / Who** | Tümü | Dil-konuşma terapistleri · odyologlar | Özel eğitim öğretmenleri · ÖÖG/DEHB uzmanları |
| **Aksan / Accent** | Turuncu `#fe703a` + teal `#023435` | Mavi `#4a90e2` (vitrin/landing) · deep-teal `#0C3B3C` (ürün içi: auth, fiyatlandırma) | Turuncu `#fe703a` (sarı `#ffce52` yalnız dekoratif blob) |
| **His / Feel** | Nötr, güven veren | Modern, üretken, serin | Atölye sıcaklığı, oyunsu |
| **URL** | `ludenlab.com` | `ludenlab.com/studio` | `ludenlab.com/atolye` |
| **Durum / Status** | Canlı | **Canlı** | **Canlı** |

> ⚠️ 2026-06 sürümünde bu iki modülün odakları yanlışlıkla yer değiştirmişti. Doğrusu yukarıdaki tablodur: **DKT = Studio**, **ÖÖG/DEHB = Atölye**.

- **Ana slogan / Tagline:** *"Özel eğitimde yapay zekâ destekli öğrenme yönetimi."*
- **Alt başlık:** *"Terapiden eğitime, planlamadan takibe — tek hesap, iki güçlü modül."*
- **Misyon cümlesi:** *"LudenLab; dil-konuşma-işitme, özgül öğrenme güçlüğü ve özel eğitim merkezleri için geliştirilen yazılım araçlarının çatısı."*
- **Güven çipleri (landing'de birebir):** *"MEB Program Modülü Uyumlu"* · *"Yapay Zeka Desteği"* · *"Bireye Özel Süreç Yönetimi"*
- **Modül tek-cümleleri:**
  - Studio → *"Dil, konuşma ve işitme için AI destekli terapi araçları."*
  - Atölye → *"ÖÖB ve DEHB için BEP, rapor ve seans planı araçları."*
- **İmza / Signature:** *"© 2026 LudenLab · Made in Türkiye"*
- **İletişim:** `info@ludenlab.com` (genel) · `destek@ludenlab.com` (destek/yasal)
- **Yasal unvan (yalnız resmî/yasal görsellerde):** Luden Eğitim Danışmanlık Org. Tic. Ltd. Şti. · Çiğli / İzmir

> ❌ **Artık kullanılmayan lansman dili:** *"Pek yakında"*, *"Neredeyse hazır"*, *"Lansmana hazırlanıyoruz"*, *"Haberdar ol"*. Ürün canlı; CTA'lar **"Ücretsiz başla"**, **"Planları gör"**, **"Studio'yu keşfet"**, **"Atölye'yi keşfet"** yönünde olmalı. (Lansman öncesi ekran `_landing/ComingSoon.tsx` olarak **park** halinde duruyor; tasarım referansı değil.)

### 2.1 Terminoloji (zorunlu) / Terminology
| Kullan | Kullanma |
|---|---|
| **üretim hakkı** (1 üretim = 1 hak) | kredi, token, jeton |
| **taslak** (AI çıktısı) | döküman, output |
| **öğrenci** | vaka, danışan |
| **Studio** | Stüdyo |
| **Atölye** | Atolye, Workshop |
| **modül** (Studio/Atölye) | uygulama, app |
| **araç** (modül içindeki üreteçler) | modül |

**Planlar:** Ücretsiz (2 üretim hakkı/ay) · Pro (100/ay, 449 ₺/ay) · Gelişmiş (500/ay, 1.999 ₺/ay) · Kurumsal (özel). Yıllık alımda **%15 indirim**. Fiyat yazan görsel üretmeden önce güncel değerleri `plans.ts`'ten doğrula.

---

## 3. Logo & Wordmark

**Yapı / Construction**
- **Tam kilit (lockup):** `Luden` (teal `#023435`) + yörünge/atom işareti (turuncu `#fe703a`) + `Lab` (turuncu `#fe703a`).
- **Yalnız işaret (mark):** Yörünge/atom sembolü tek başına (turuncu).
- **Alt-marka kilidi:** Logo + `Atölye` veya `Studio` (resmî outline yazı olarak eklenir).
- **Tek kaynak:** `packages/ui/src/logo.tsx` — resmî Illustrator vektör kimliği (viewBox `0 0 611 260`) bileşenin içinde path olarak gömülü. Alt-marka yazıları ("Atölye" / "Studio") resmî kilitten outline'lanmıştır (All Round Gothic Demi → path) → font bağımsız.
- ⚠️ `apps/hub/public/logo.svg` ve `luden-logo-mark.png` **eski** dağınık kullanımlardır; `<Logo>` bileşeni onların yerini aldı. Statik görsel gerekiyorsa bileşenden dışa aktar, bu dosyaları kanonik sayma.

**Bileşen API'si (ürün içi) / Component API**
```tsx
<Logo variant="lockup" | "mark"        // tam kilit | yalnız yörünge işareti
      tone="auto" | "onDark" | "mono"
      height={30}                       // px; genişlik otomatik
      product="Atölye" | "Studio" />    // alt-marka kilidi (resmî outline)
```
Renk bağlanışı: yörünge + `Lab` → `--poster-accent`; `Luden` + ürün adı → `--logo-wordmark` (light `#023435` · dark `#f5e8c7`, otomatik).

**Renk tonları / Tones**
| Ton | Davranış |
|---|---|
| `auto` (varsayılan) | Açık zeminde **teal** `#023435`, koyu zeminde **krem** `#f5e8c7` |
| `onDark` | Her zaman **krem** `#f5e8c7` — koyu/fotoğraf zeminler için |
| `mono` | Tek renk (`currentColor`) — tek renkli baskı/filigran |

**Sosyal görselde logo kullanımı / Logo in social graphics**
- **Tercihen** `<Logo>` bileşeninden dışa aktarılmış resmî SVG/PNG'yi yerleştir.
- Yeniden oluşturman gerekiyorsa **tipografik fallback:** Bricolage Grotesque ExtraBold ile `Luden` teal `#023435` + `Lab` turuncu `#fe703a`. (Yalnızca yedek; resmî vektör önceliklidir.)
- Koyu/fotoğraf zeminde `tone="onDark"` karşılığı: wordmark krem `#f5e8c7`, yörünge + `Lab` turuncu kalır.
- **Temiz alan:** Logonun yüksekliği kadar boşluk bırak. **Min. yükseklik:** ~24px (dijital).

**Yapma / Don't:** Oranı bozma · renkleri değiştirme (mono hariç) · gölge/efekt/gradient ekleme · döndürme · kalabalık/düşük kontrastlı zemine koyma · wordmark'ı yeniden harflendirme.

---

## 4. Renk Paleti / Color Palette

### 4.1 Çekirdek renkler / Core (Light)
| Rol / Role | Hex | Kullanım / Use |
|---|---|---|
| Accent (turuncu) | `#fe703a` | CTA, rozet, vurgu, "Lab" wordmark — **az kullan** |
| Teal (marka) | `#023435` | "Luden" wordmark, koyu vurgu, derin başlık |
| Background (krem) | `#fff8ec` | Birincil zemin |
| Surface-2 | `#fde8c7` | İkincil zemin, hover |
| Panel / Card | `#ffffff` | Kart yüzeyi |
| Ink (metin/çerçeve) | `#0e1e26` | Metin, 2px çerçeve, katı gölge |

**Ink hiyerarşisi:** `#0e1e26` (ana) · `rgba(14,30,38,.7)` (ikincil) · `rgba(14,30,38,.6)` (üçüncül) · `rgba(14,30,38,.12)` (ince çizgi/ayraç).

### 4.2 Koyu mod / Dark
| Rol | Hex |
|---|---|
| Background | `#15100a` |
| Surface / Panel | `#1e1811` |
| Ink (metin) | `#f5e8c7` |
| Accent | `#fe703a` (değişmez) |

### 4.3 Semantik & vurgu / Semantic & accents
| Anlam / Meaning | Light | Dark |
|---|---|---|
| Başarı (Success) | `#2cc069` | `#2cc069` |
| Uyarı (Warning) | `#ffce52` | `#ffce52` |
| Hata (Danger) | `#c53030` | `#ff7a7a` |
| Bilgi (Info) | `#4a90e2` | `#4a90e2` |
| Pembe (kategorik) | `#ff6b9d` | `#ff6b9d` |
| Deep teal | `#0C3B3C` | `#2E8C84` |
| Clay (kiremit) | `#B0432A` | `#DF6A45` |
| Plum (erik) | `#6E2440` | `#B45876` |
| Ochre (toprak sarısı) | `#B07512` | `#E0A93A` |

**Çalışma alanı renkleri / Work-area mapping** (kodda `--workarea-*`; grafiklerde kategori rengi olarak kullan):
| Alan | Renk |
|---|---|
| Konuşma (speech) | Yeşil `#2cc069` |
| Dil (language) | Sarı `#ffce52` |
| İşitme (hearing) | **Pembe `#ff6b9d`** |
> ⚠️ Önceki sürümde "işitme" yanlışlıkla kırmızı `#c53030` ile eşleştirilmişti. Kırmızı **yalnızca hata/tehlike** rengidir, kategori değil.

**Yumuşak tonlar / Soft tints** (geniş zemin, etiket arkası): accent `#FDE6DA` · green `#DCF1E4` · yellow `#FBEFCE` · pink `#FCE0E9` · blue `#DEEAF6` · danger `#F6DCD9` · deep-teal `#D7E5E2`.
> Koyu modda bu tint'ler de değişir (accent `#3A2415`, green `#16301F`, yellow `#322713`, pink `#34202A`, blue `#1B2738`, danger `#341B18`, deep-teal `#133230`). Kategorik ana renkler ise iki modda **aynı kalır** — rozet/çip tanınırlığı bozulmasın diye.

**Kullanım kuralı / Rule:** Krem zemin + ink metin/çerçeve ana iskelet; turuncu yalnızca vurgu (≈%5–10 alan). Geniş turuncu/parlak zeminlerden kaçın.

**Kontrast uyarısı:** Sarı `#ffce52` ve yeşil-dışı açık tonların üstünde **beyaz metin kullanma** — ink `#0e1e26` kullan. Turuncu `#fe703a` üstünde beyaz metin uygundur (ürün de böyle yapar: `--accent-on: #fff`).

---

## 5. Tipografi / Typography

**Aileler / Families**
- **Başlık (Display):** **Bricolage Grotesque** — ağırlık 400–800. Başlıklar, sloganlar, büyük rakamlar.
- **Metin (Body/UI):** **Satoshi** — ağırlık 400, 500, 700, 900. Gövde, etiket, arayüz.
- **Mono:** `ui-monospace, "SF Mono", Menlo` — meta/kod etiketleri.

**Font yükleme (HTML) / Font loading**
```html
<!-- Ürünle birebir aynı yükleme sırası (apps/hub/src/app/layout.tsx) -->
<link rel="preconnect" href="https://api.fontshare.com" crossorigin>
<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap">
```
> Satoshi yüklenemezse fallback: `system-ui, "Segoe UI", sans-serif`.

**Ölçek / Scale** (sosyal için orantılı büyüt)
| Token | Boyut | line-height | letter-spacing |
|---|---|---|---|
| display-xl | 58px | 1.04 | −0.02em |
| display-lg | 38px | 1.06 | −0.015em |
| display-md | 22px | 1.12 | — |
| body-lg | 17px | 1.55 | — |
| body-md | 14px | 1.55 | — |
| body-sm | 12.5px | 1.5 | — |
| caption | 11px | 1.4 | — |
| **eyebrow** | 11px | — | **0.22em, BÜYÜK HARF** |

**Kurallar:** Başlıkta Bricolage 700–800 + sıkı letter-spacing (−0.02em). "Eyebrow" üst-etiketler büyük harf + geniş aralık. Bir görselde en fazla 2 font ailesi.

---

## 6. Görsel Dil — "Poster" Sistemi / Design Language

LudenLab'in imza estetiği: **krem kâğıt + 2px ink çerçeve + blursuz katı gölge + oyunsu dekor.**

- **Çerçeve / Border:** `2px solid #0e1e26` — neredeyse her kart/buton/rozette.
- **Gölge / Shadow (BLURSUZ, ofset):** `0 2px 0` (sm) · `0 4px 0` (md) · `0 6px 0` (lg) · `0 9px 0` (xl), rengi ink. Aksanlı CTA için `0 4px 0 #fe703a`. **Asla blur kullanma.**
- **Köşe / Radius:** sm `10px` · md `14px` · lg `18px` · xl `22px` · pill `999px` (çip/rozet).
- **Spacing (4px grid):** 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56 · 72.
- **Rotasyon / Rotation:** kartlara hafif `-2°…+2°` eğim — "yapıştırılmış poster" hissi.
- **Dekor / Decor:** yumuşak **blob**'lar (opacity ~0.4–0.55) + el-çizimi **squiggle** alt çizgiler (`stroke 2.5`, ink, opacity ~0.16), `pointer-events:none`, içeriğin arkasında.
- **Hareket / Motion** (animasyon gerekiyorsa): easing `cubic-bezier(0.16, 1, 0.3, 1)`; press 80ms, hover 150ms, panel 280ms.

### 6.1 Kopyala-yapıştır CSS token bloğu / CSS token block
```css
:root{
  /* Renk / Color */
  --accent:#fe703a; --teal:#023435;
  --bg:#fff8ec; --bg-2:#fde8c7; --panel:#fff; --ink:#0e1e26;
  --ink-70:rgba(14,30,38,.7); --ink-60:rgba(14,30,38,.6); --ink-12:rgba(14,30,38,.12);
  /* Semantik / Semantic */
  --green:#2cc069; --yellow:#ffce52; --red:#c53030; --blue:#4a90e2; --pink:#ff6b9d;
  /* Çalışma alanı / Work areas: konuşma·dil·işitme */
  --wa-speech:var(--green); --wa-language:var(--yellow); --wa-hearing:var(--pink);
  --clay:#B0432A; --plum:#6E2440; --ochre:#B07512; --deep-teal:#0C3B3C;
  /* Yumuşak / Soft */
  --accent-soft:#FDE6DA; --green-soft:#DCF1E4; --yellow-soft:#FBEFCE;
  --pink-soft:#FCE0E9; --blue-soft:#DEEAF6;
  /* Marka / Brand */
  --logo-wordmark:#023435;  /* "Luden" + alt-marka adı; .dark → #f5e8c7 */
  --accent-on:#fff;         /* turuncu üstü metin */
  /* Tipografi / Type */
  --font-display:"Bricolage Grotesque",system-ui,sans-serif;
  --font-body:"Satoshi",system-ui,sans-serif;
  /* Köşe / Radius */
  --r-sm:10px; --r-md:14px; --r-lg:18px; --r-xl:22px; --r-pill:999px;
  /* Gölge — blursuz / Shadow — no blur */
  --shadow-sm:0 2px 0 var(--ink); --shadow-md:0 4px 0 var(--ink);
  --shadow-lg:0 6px 0 var(--ink); --shadow-xl:0 9px 0 var(--ink);
  --shadow-accent:0 4px 0 var(--accent);
  /* Çerçeve & hareket / Border & motion */
  --border:2px solid var(--ink); --ease:cubic-bezier(.16,1,.3,1);
}
.dark{ --bg:#15100a; --bg-2:#1e1811; --panel:#1e1811; --ink:#f5e8c7; --accent:#fe703a;
  --red:#ff7a7a; --deep-teal:#2E8C84; --clay:#DF6A45; --plum:#B45876; --ochre:#E0A93A;
  --logo-wordmark:#f5e8c7; --accent-on:#1C1209; }
```

> **Ürün ekranı mı tasarlıyorsun?** Bu bölüm görsel dili verir; ekran anatomisi (kabuk, sayfa arketipi, durum grameri, kırılım noktaları) kardeş dokümanda: `ludenlab-uiux-mimari-claude-design.md` §6–§10.

---

## 7. İkonografi & İllüstrasyon / Icons & Illustration

- **İkon kütüphanesi / Icons:** `lucide-react` (stroke-width **2**). İkincil: `@tabler/icons-react`.
- **Boyutlar / Sizes:** buton 18px · nav 19px · rozet/çip 16px · uyarı/istatistik 20px.
- **Sık ikonlar (üründe fiilen kullanılanlar):** `Sparkles`, `Wand2`, `ClipboardList`, `Gamepad2`, `PenLine` (BEP), `Puzzle` (materyal), `CalendarDays` (seans/takvim), `BookOpen` (okuma), `Hash` (matematik), `Target` (davranış/hedef), `MessageCircle` (sosyal öykü), `Mail` (veli mektubu), `Home` (ev ödevi), `TrendingUp` (ilerleme), `GraduationCap` (öğrenci), `Wrench` (araçlar), `Layers` (kütüphane), `CreditCard` (abonelik), `ArrowRight`, `Check`.
- **Emoji kullanma** — ikon dili lucide'dir (üründe kalan birkaç emoji tasarım borcudur, referans alma).
- **İllüstrasyon stili:** düz, sıcak, temsili; blob + squiggle dekor. Foto-gerçekçi veya stok-kurumsal görsellerden kaçın.

---

## 8. Marka Sesi & Ton / Brand Voice & Tone

**TR**
- **Karakter:** Sıcak + profesyonel + kapsayıcı. Umut verir ama abartmaz; uzman ama erişilebilir.
- **Dil:** Türkçe. Türkçe karakterlere dikkat (â, ı/i, ş, ç, ö, ü, ğ). Kısa, net, eylem odaklı cümleler.
- **Kişi-önce dil:** "özel gereksinimli çocuk", "ÖÖG'li öğrenci" gibi güçlendirici ifadeler.

**Hassasiyet / Sensitivity (önemli)**
- ❌ Gerçek çocuk **fotoğrafı, ismi veya verisi** kullanma → ✅ temsili illüstrasyon / anonim.
- ❌ Acındırıcı, çaresizlik vurgulayan anlatım · klinik/tıbbi soğukluk · damgalayıcı dil.
- ✅ Güçlendiren, kapsayıcı, çözüm ve gelişim odaklı anlatım.
- KVKK ve çocuk verisi konusunda görsellerde dahi temkinli ol.

**Slogan / mesaj bankası (ürün canlı sürümü)**
> "Özel eğitimde yapay zekâ destekli öğrenme yönetimi." · "Terapiden eğitime, planlamadan takibe — tek hesap, iki güçlü modül." · "MEB Program Modülü Uyumlu" · "Bireye Özel Süreç Yönetimi" · "Dakikalar içinde BEP hedefi." · "Seans planın hazır." · "Ücretsiz başla" · "Planları gör" · "Made in Türkiye"

> Modül vaatleri: **Studio** → "Kart tabanlı araç kütüphanesi · AI destekli materyal & seans planı · Görsel hedef takibi". **Atölye** → "BEP & Rapor Asistanı (MEB çerçevesi) · Seans Planı Üreteci (çok duyulu) · Öğrenci, kütüphane ve takvim".

---

## 9. Sosyal Medya Playbook / Social Media Playbook

### 9.1 Formatlar / Formats
| Format | Boyut (px) | Oran |
|---|---|---|
| Instagram feed (kare) | 1080 × 1080 | 1:1 |
| Instagram feed (dikey, **önerilen**) | 1080 × 1350 | 4:5 |
| Instagram / Reels **story** | 1080 × 1920 | 9:16 |
| LinkedIn tek görsel | 1200 × 627 | 1.91:1 |
| LinkedIn kare | 1080 × 1080 | 1:1 |
| X / Twitter | 1600 × 900 | 16:9 |

> **Story güvenli alan:** Üstte ~250px, altta ~310px arayüz bölgesi olduğunu varsay; kilit içerik ve logoyu merkez-üst üçte ikilik alanda tut.

### 9.2 Şablon kalıpları / Template patterns
1. **Duyuru / manşet:** Büyük Bricolage başlık + "eyebrow" üst etiket + turuncu rozet CTA ("Ücretsiz başla") + logo köşede + blob/squiggle dekor.
2. **İpucu / Quote:** Krem kart (2px çerçeve, hafif rotasyon, katı gölge) içinde kısa söz + küçük lucide ikon + alt köşede marka.
3. **Özellik tanıtımı:** İkon + tek cümlelik fayda + ürün adı (Atölye/Studio) rozeti.
4. **Story / araç tanıtımı:** 9:16 krem zemin, dikey hiyerarşi, ortada 3 maddelik lucide ikon listesi, alt orta CTA çipi ("ludenlab.com/studio" veya "Ücretsiz başla"), üstte küçük logo.
5. **Fiyat / plan:** Üç dikey kart (Ücretsiz · Pro · Gelişmiş), ortadaki hafif büyük + turuncu "Popüler" rozeti; **"aylık üretim hakkı"** dili; yıllıkta %15 indirim rozeti.
6. **Sosyal kanıt / kurum:** Krem kart üstünde kısa alıntı + rol etiketi ("Özel eğitim öğretmeni"). Gerçek kişi adı/foto kullanma; temsili yaz.

### 9.3 Alt-marka varyasyonu / Sub-brand variation
- **LudenLab (şemsiye):** Teal `#023435` + turuncu `#fe703a` + krem; nötr, çatı mesajı.
- **Studio:** **Mavi `#4a90e2`** (vitrin/sosyal) veya **deep-teal `#0C3B3C`** (ürün içi kimlik: auth paneli, fiyatlandırma kartı); serin, üretken. *(Eski `#107996`, `#F4B2A6`, `#692137` yalnızca Studio'nun tarihsel Tailwind değişkenlerinde kaldı — yeni görsellerde kullanma.)*
- **Atölye:** **Turuncu `#fe703a`** ana aksan; sarı `#ffce52` yalnızca dekoratif blob / marker vurgusu olarak; sıcak, oyunsu.
- Üçü de aynı çekirdek "Poster" sistemini, logoyu ve tipografiyi paylaşır — yalnızca aksan rengi ve his değişir.
- **Numaralandırma:** vitrinde modüller `01 Studio` · `02 Atölye` sırasıyla anılır (mono font, ink %40).

---

## 10. Yap / Yapma · Do / Don't

**✅ Yap / Do**
- Krem zemin + 2px ink çerçeve + **blursuz** katı ofset gölge.
- Turuncuyu yalnızca vurgu/CTA için (küçük alan).
- Bricolage başlık + Satoshi metin; en fazla 2 font.
- Hafif rotasyon, blob, squiggle; lucide ikon (stroke 2).
- Bol krem/beyaz boşluk; net hiyerarşi.
- Türkçe, sıcak, kapsayıcı kopya.

**❌ Yapma / Don't**
- Blur'lu gölge · gradient bombardımanı · drop-shadow yumuşaklığı.
- Turuncuyu geniş zemin olarak · stok-kurumsal mavi · neon/koyu tema dışı renkler.
- Marka dışı fontlar · 3+ font · ince/zayıf başlık.
- Gerçek çocuk fotoğrafı/ismi/verisi · acındırıcı veya klinik ton.
- Logo oranını/renklerini bozma · efekt ekleme · sıkışık, düşük-kontrast layout.

---

## 11. Hazır Prompt'lar / Starter Prompts

> Projede sohbete bunlardan birini yapıştır; Claude bu dokümandaki token'ları kullanarak HTML üretir.

**🇹🇷 Türkçe**
```
1) "LudenLab için 1080x1080 Instagram postu: 'Özel eğitimde yapay zekâ destekli öğrenme yönetimi'
   başlığı, alt metin 'Tek hesap, iki modül: Studio ve Atölye', turuncu 'Ücretsiz başla' CTA çipi,
   üç güven çipi (MEB Program Modülü Uyumlu / Yapay Zeka Desteği / Bireye Özel Süreç Yönetimi).
   Poster sistemi: krem zemin, 2px ink çerçeve, blursuz katı gölge, blob+squiggle dekor. HTML ver."

2) "Atölye için 1080x1350 dikey 'araç tanıtımı' postu: BEP & Rapor Asistanı — 'Dakikalar içinde
   ölçülebilir BEP hedefi'. Krem kart, hafif rotasyon, turuncu aksan, sarı blob dekoru,
   lucide PenLine ikonu, sol altta logo. HTML."

3) "Studio için 1080x1920 story: 3 aracı lucide ikonlarla listele (Öğrenme Kartı, Sosyal Hikaye,
   Haftalık Çalışma Planı), mavi aksan, altta 'ludenlab.com/studio' çipi. Story güvenli alanına uy. HTML."

4) "LinkedIn 1200x627: 'Terapiden eğitime, planlamadan takibe — tek hesap, iki güçlü modül.'
   Solda LudenLab kilit logosu, sağda 01 Studio (mavi) ve 02 Atölye (turuncu) mini kartları. HTML."

5) "1080x1080 fiyatlandırma postu: Ücretsiz / Pro / Gelişmiş planları, 'aylık üretim hakkı'
   vurgusuyla, yıllıkta %15 indirim rozeti. 'kredi' kelimesini KULLANMA. HTML."

6) "1080x1350 kullanıcı ipucu postu (eğitici): 'Sosyal öykü yazarken 3 kural' — numaralı liste,
   krem kart, ink çerçeve, turuncu numara rozetleri. Damgalayıcı dil yok. HTML."
```

**🇬🇧 English**
```
1) "1080x1080 Instagram post for LudenLab: headline 'Özel eğitimde yapay zekâ destekli öğrenme
   yönetimi', subtitle 'Tek hesap, iki modül: Studio ve Atölye', orange 'Ücretsiz başla' CTA chip.
   Poster system: cream bg, 2px ink border, solid no-blur shadow, blob+squiggle decor. Output HTML."

2) "Atölye 1080x1350 vertical tool-spotlight post for the IEP ('BEP') assistant, orange accent,
   yellow blob decor, lucide PenLine icon, logo bottom-left. Turkish copy. HTML."

3) "Studio 1080x1920 story listing 3 tools with lucide icons, blue accent, 'ludenlab.com/studio'
   chip at the bottom, respecting story safe areas. Turkish copy. HTML."
```

---

## 12. Kaynak (Source of Truth) / Pointers

Bu doküman, kodu **özetler**; çelişki olursa **kod kanonik kaynaktır**.
This doc summarizes the code; if they conflict, **code is canonical.**

| İçerik | Dosya / File |
|---|---|
| Tasarım token'ları (renk, tip, gölge, spacing) | `packages/ui/src/styles/poster.css` |
| Hub global stiller / landing | `apps/hub/src/app/globals.css` |
| Logo bileşeni (tek kaynak) | `packages/ui/src/logo.tsx` |
| Logo asset | `apps/hub/public/luden-logo-mark.png`, `apps/hub/public/logo.svg` |
| Atölye stil override | `apps/hub/src/modules/atolye/styles/atolye.css` |
| Studio stil override (+ palet) | `apps/hub/src/modules/studio/styles/studio.css` |
| Canlı landing kopyası + modül verisi | `apps/hub/src/app/_landing/FullLanding.tsx`, `_landing/shared.tsx` |
| Lansman öncesi ekran (**park halinde**) | `apps/hub/src/app/_landing/ComingSoon.tsx` |
| Font yükleme | `apps/hub/src/app/layout.tsx` |
| Plan adları, fiyat, üretim hakkı | `apps/hub/src/modules/{studio,atolye}/lib/plans.ts` |
| Şirket / yasal kimlik | `apps/hub/src/app/(legal)/_legal-ui.tsx` |
| **Ürün arayüzü mimarisi** | `docs/brand/ludenlab-uiux-mimari-claude-design.md` |

---
*LudenLab Görsel Tasarım Sistemi · v2026-08-18 · Made in Türkiye*
