# LudenLab — Hub Landing Page · Tasarım Brief'i

> **Bu belge ne için?** ludenlab.com ana sayfasını (hub / vitrin) yeniden tasarlamak için
> hazırlandı. Claude'a (veya başka bir tasarım aracına) verilip tek bir **responsive landing
> page** üretilmesi hedeflenir. Çıktı, sonra Next.js + LudenLab "poster" tasarım sistemiyle
> hayata geçirilecek. **Türkçe** bir sitedir.

---

## 1) Marka: LudenLab nedir?

**LudenLab**, özel eğitim alanına özel **yazılım araçları geliştiren çatı markadır**. Tek tüzel
kişilik, tek hesap altında **üç ürün** sunar. Amaç: dil ve konuşma terapistlerinin, özel eğitim
öğretmenlerinin ve özel eğitim merkezlerinin işini yapay zekâ destekli araçlarla kolaylaştırmak.

- **Marka ruhu:** "Luden" → oyun/öğrenme (Homo Ludens) çağrışımı + "Lab" → atölye/laboratuvar.
  Yani *oyunla öğrenmenin ciddi araçları*. Sıcak, güven veren, alanın içinden; steril/kurumsal değil.
- **Konum:** ludenlab.com = **hub** (vitrin + 3 servise kapı). Her ürün kendi subdomain'inde çalışır.
- **Ton:** profesyonel + sıcak + güven veren. Klinik/eğitim hassasiyeti olan, saygılı dil.
  Abartılı pazarlama yok; "uzmanın işini kolaylaştıran araç" duruşu.

---

## 2) Ekosistem: üç ürün, üç sütun

LudenLab, bir özel eğitim pratiğinin **üç aşamasını** kapsar:

| Sütun | Ürün | Ne yapar | Kime | Adres | Durum | Renk* |
|---|---|---|---|---|---|---|
| **Terapi / Klinik** | **LudenLab Stüdyo** | Dil, konuşma, işitme alanında **AI destekli terapi materyali & plan** üretir (artikülasyon, dil, akıcılık, ses, işitme). Kart tabanlı araç kütüphanesi. | Dil ve konuşma terapistleri, odyologlar | studio.ludenlab.com | Canlı | Mavi `#4a90e2` |
| **Eğitim / Pedagoji** | **LudenLab Atölye** | **BEP & Rapor Asistanı** (BEP hedefi, ilerleme raporu, aile özeti — MEB çerçevesi) + **Seans Planı Üreteci** (çok duyulu). Vaka, kütüphane, takvim. | Özel eğitim öğretmenleri, ÖÖB/DEHB uzmanları | atolye.ludenlab.com | Yeni · Beta | Turuncu `#fe703a` |
| **İşletme / Operasyon** | **BRY Takip** | Özel eğitim merkezleri için **yoklama + ders saati takibi** (anlık giriş-çıkış / BKDS). Masaüstü (Mac/Win) + web. | Merkez sahipleri, yöneticiler | brytakip.ludenlab.com | Canlı | Yeşil `#2cc069` |

*Her ürün kartı kendi vurgu rengini taşısın (ayrışsın), ama palet poster sisteminde kalsın.

**Özet hikâye:** Terapiden eğitime, planlamadan takibe — özel eğitimin her aşaması için tek çatı.

---

## 3) Hub'ın (bu sayfanın) işlevi

1. **Anlat:** LudenLab'in ne olduğunu, üç ürünün birlikte neyi çözdüğünü 5 saniyede geçir.
2. **Yönlendir:** Ziyaretçiyi doğru ürüne götür (3 net giriş kapısı).
3. **Güven ver:** alanın içinden, yapay zekâ destekli, KVKK/veri güvenliği, MEB çerçevesi.
4. **Tek hesap vaadi:** ileride tek LudenLab hesabıyla tüm ürünlere erişim (SSO) — bugünden konumlandır.

> Not: Bu sayfa **statik/pazarlama** odaklı. Form/giriş yok; her kart kullanıcıyı ilgili ürünün
> kendi sitesine (login/üye ol) gönderir.

---

## 4) Hedef kitle

- **Dil ve konuşma terapistleri / odyologlar** → Stüdyo
- **Özel eğitim öğretmenleri, ÖÖB (disleksi/diskalkuli) & DEHB ile çalışan uzmanlar** → Atölye
- **Özel eğitim & rehabilitasyon merkezi sahipleri/yöneticileri** → BRY Takip

Ortak özellik: zamanı kısıtlı, evrak/planlama yükü ağır, alanına tutkulu profesyoneller.
Dil onları "yormayan", işini hızlandıran bir yardımcı gibi konuşmalı.

---

## 5) Sayfa yapısı (bölüm bölüm)

1. **Üst bar (ince):** LudenLab logo/wordmark (sol) · sağda küçük "Stüdyo · Atölye · BRY" linkleri + tema (gündüz/gece) toggle.
2. **Hero:**
   - Eyebrow: `ÖZEL EĞİTİM YAZILIMLARI`
   - H1 (büyük, iddialı): **"Özel eğitimin her aşaması için tek çatı"**
   - Alt başlık: *"Terapiden eğitime, planlamadan takibe — dil ve konuşma terapistleri, özel eğitim öğretmenleri ve merkezler için yapay zekâ destekli araçlar. Tek hesap, üç güçlü ürün."*
   - Birincil CTA: **"Servisleri keşfet ↓"** (aşağı kaydırır) · İkincil: "LudenLab nedir?"
   - Görsel: poster tarzı geometrik/oyuncu bir kompozisyon (3 ürünü temsil eden renkli kartlar/şekiller). Stok fotoğraf YOK.
3. **Üç ürün (ana bölüm):** 3 büyük kart (yan yana desktop / alt alta mobil). Her kart:
   - Üstte ikon/emoji + durum rozeti (Canlı / Yeni·Beta)
   - Ürün adı (büyük) + tek cümle değer önerisi
   - 2–3 madde özellik (kısa)
   - "Kimler için" satırı
   - Kartın kendi vurgu rengi (Stüdyo mavi · Atölye turuncu · BRY yeşil) — kalın border + sert gölge
   - CTA: **"Aç →"** (ilgili subdomain'e)
4. **"Neden LudenLab / tek çatı?"** — 3–4 değer kutusu:
   - **Tek hesap** — bir hesapla tüm araçlar (yakında SSO)
   - **Alanın içinden** — özel eğitim pratiğini bilen ekip tarafından
   - **Yapay zekâ destekli** — saatlerce süren evrak/planı dakikalara indir
   - **Güvenli & uyumlu** — KVKK, veri izolasyonu, MEB çerçevesi; çıktılar "taslak — uzman onayı" notuyla
5. **Kimler için? (eşleştirme):** 3 segment → hangi ürün (kısa, görsel).
6. **Kapanış CTA bandı:** "Hangi araç sana uygun? Hemen keşfet." + 3 ürün linki.
7. **Footer:** wordmark + kısa açıklama · ürün linkleri · yasal (KVKK / Gizlilik / Kullanım) · iletişim (info@ludenlab.com) · `© 2026 LudenLab · Tüm hakları saklıdır`.

---

## 6) Görsel dil — "Poster" tasarım sistemi (KRİTİK)

Çıktı, mevcut LudenLab tasarım sistemine **uymalı**. Stil = sıcak, **neo-brutalist / poster**:

**Renkler (açık tema):**
- Zemin: `#fff8ec` (sıcak krem) · ikincil zemin: `#fde8c7` (şeftali)
- Panel/kart: `#ffffff`
- Metin (ink): `#0e1e26` (koyu petrol-siyahı) · ikincil: `rgba(14,30,38,.7)`
- **Vurgu (birincil): `#fe703a` (turuncu)**
- Yeşil `#2cc069` · Sarı `#ffce52` · Pembe `#ff6b9d` · Mavi `#4a90e2`

**Koyu tema (destekle):** zemin `#15100a`, metin `#f5e8c7` (krem), gölgeler inceltilir.

**İmza öğeler (bunlar şart):**
- **Kalın border:** `2px solid #0e1e26` — kart, buton, rozet.
- **Sert offset gölge (blur YOK):** `0 4px 0 #0e1e26` (büyük öğe `0 6px 0`). Yumuşak/bulanık gölge kullanma.
- **Köşe yarıçapı:** 10–18px; rozetler pill (999px).
- **Tipografi:** kalın, iddialı **display** başlıklar (büyük H1). Gövde okunur, sade.
- **Butonlar:** dolu turuncu (birincil) / dış-çizgili (ikincil); border + sert gölge; hover'da gölge azalıp 2px aşağı "basılma" hissi.
- **Renk-kodlu ürün kartları:** her kart kendi vurgu rengiyle (mavi/turuncu/yeşil).
- **Hava & oyunculuk:** bol boşluk, geometrik/oyuncu küçük şekiller; ama dağınık değil, net hiyerarşi.

**Referans his:** modern "indie SaaS poster" — sıcak, elle çizilmiş gibi kalın hatlar, canlı ama profesyonel. (shadcn/jenerik gradient/glassmorphism/cam efekti DEĞİL.)

---

## 7) Yapılacaklar / Kaçınılacaklar

**Yap:**
- Mobil öncelikli, tam responsive · erişilebilir (kontrast, görünür focus, semantik HTML) · koyu tema.
- Net hiyerarşi: hero → 3 ürün → değer → CTA.
- Kısa, güçlü Türkçe kopya; uzmanın dilinden.

**Kaçın:**
- Jenerik kurumsal stok fotoğraflar; gradient/cam efekti; ince saç-teli border'lar; yumuşak bulanık gölge.
- Tıbbi/abartılı iddialar ("tedavi eder" vb.) — araçlar **uzmana yardımcıdır**, yerine geçmez.
- Aşırı metin; her bölüm tek nefeste okunur olmalı.

---

## 8) Teknik notlar (tasarımcı için)
- Çıktı **tek sayfa responsive landing** (HTML/React artifact ideal).
- Sonra Next.js (App Router) + `@ludenlab/ui` poster bileşenleriyle (PButton, PCard, PBadge…) port edilecek; bu yüzden poster token/stiline sadık kal.
- Hostinger'da **statik** servis edilecek; ağır animasyon/3B şart değil, hafif ve hızlı olsun.
- Diller: TR (tek dil). Para/ödeme yok (ürün içi).

---

### Hızlı kopya bankası (kullanılabilir Türkçe metinler)
- Eyebrow: `ÖZEL EĞİTİM YAZILIMLARI`
- H1: `Özel eğitimin her aşaması için tek çatı`
- Alt: `Terapiden eğitime, planlamadan takibe — dil ve konuşma terapistleri, özel eğitim öğretmenleri ve merkezler için yapay zekâ destekli araçlar. Tek hesap, üç güçlü ürün.`
- Stüdyo kartı: `LudenLab Stüdyo` — `Dil, konuşma ve işitme için AI destekli terapi araçları.`
- Atölye kartı: `LudenLab Atölye` — `ÖÖB ve DEHB için BEP, rapor ve seans planı araçları.`
- BRY kartı: `BRY Takip` — `Özel eğitim merkezleri için yoklama ve ders saati takibi.`
- Değer başlığı: `Neden tek çatı altında?`
- Kapanış CTA: `Hangi araç sana uygun? Hemen keşfet.`
