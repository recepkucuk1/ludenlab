# Instagram Lansman Reels Serisi — Tasarım

**Tarih:** 2026-09-16
**Durum:** Tasarım onaylandı, metinler kullanıcı ses denemesinde
**Yer:** `promo/` (bağımsız Remotion projesi, pnpm workspace dışı)
**Önceki iş:** `2026-07-04-studio-tanitim-video-design.md` (StudioTanitim916 — dokunulmaz)

## Amaç

Lansmanın önümüzdeki 2 hafta içinde olması nedeniyle Instagram için 5 reels'lik yeni bir seri. Ana kitle özel eğitimde çalışan uzmanlar; okul öğretmenleri ikincil kitle (Reels 5).

## Seri ve yayın sırası

| # | Reels | Ürün | Kitle |
|---|---|---|---|
| 1 | LudenLab yayında | Marka (iki modül) | Herkes |
| 2 | Öğrenme kartları | Studio — Öğrenme Kartı | Dil ve konuşma alanında çalışan uzmanlar |
| 3 | Hedef ses, görseliyle | Studio — Artikülasyon Alıştırması | Dil ve konuşma alanında çalışan uzmanlar |
| 4 | Her çocuğa kendi hikayesi | Studio — Sosyal Hikaye | DKT + özel eğitimciler |
| 5 | MEB hedefinden taslağa | Atölye — Seans Planı Üreteci | Özel eğitim + okul öğretmenleri |

Format: 1080×1920, 30 fps, reels başına 18–25 sn (süre seslendirmeden gelir).

## Ton

**Esenlik vurgusu.** Suçluluk ya da "daha çok üret" mesajı yok; uzmanın dinlenme zamanını korumak, yükü tek başına taşımamak, zamanı evraka değil çocuğa ayırmak. Hitap samimi "sen".

## İçerik kuralları (kodla doğrulandı, 2026-09-16)

- **Hız iddiası yok.** Sitede yalnız Atölye'de "dakikalar içinde" var; "saniyeler", "1 dakikada" gibi ifadeler YASAK (üretim 60 sn'yi aşabiliyor).
- **Atölye görsel üretmez**, metin taslağı üretir. Her zaman "taslak / son söz senin" çerçevesi; tanı çağrışımı yok.
- **MEB iddiası tam adıyla:** MEB ÖRGM "Öğrenme Güçlüğü Olan Bireyler İçin Destek Eğitim Programı" (172 hedef, resmî kodlar). Genel "MEB uyumlu" denmez.
- **Görsel üreten Studio araçları:** Sosyal Hikaye, Artikülasyon, Kelime Eşleştirme, Sesletim, İletişim Panosu. Öğrenme Kartı için görsel iddiası yapılmaz.
- **Ücretsiz plan tanıtılmaz** (kullanıcı kararı 2026-09-16): kapanışta "ücretsiz / ayda 2 hak / kart gerekmez" yok; yalnız ludenlab.com — "girsin, baksın".
- **Öğrenme Kartı kelime kartı değildir:** tek, yapılandırılmış seans kartı (amaç, materyaller, adımlar, etkinlikler, uzman notları, ilerleme, ev ödevi). Temmuz videosundaki kelime-kartı sahnesi örnek alınmaz.
- **Studio kitlesi yazımı:** "Dil ve konuşma alanında çalışan uzmanlar".
- **Ekranda görünen tüm öğrenci adları kurgudur.** Gerçek çıktı ekran görüntülerinde ad/rumuz görünüyorsa kırpılır veya kurgu adla yeniden çizilir.

## Görsel yaklaşım (C — karma)

Akış animasyonlu arayüz maketleriyle anlatılır (mevcut videonun "Poster" dili, `brand.ts` renkleri, Bricolage + Satoshi). "İşte çıktı" anlarında gerçek varlık kullanılır:

- **Reels 3:** Artikülasyon kelime görselleri, Supabase Storage `tool-images` bucket'ından (`GeneratedImage` tablosu) **salt okunur** indirilir → `promo/public/real/`. Seçilen: robot, roket, radyo, rakam, rampa, rüzgâr — "reçel" (İngilizce yazı) ve "rende" ("Kyl" artefaktı) görselleri kusurlu olduğu için alınmadı (ürün önbelleğinde de düzeltilmeli).
- **Reels 2, 4, 5:** gerçek PDF sayfası — ürünün kendi PDF bileşeni `promo/` içinde kurgu içerikle render edilir (`npm run asset:r2`), prod'a dokunulmaz → `promo/public/real/`.
- Yeni üretim yapılmaz, prod DB'ye yazılmaz (dev sunucusu prod DB'ye bakar).

İlk 2 sn'de logo yok (hook büyük tipografi). Açılış: ayrı intro YOK — ortak `IntroBurst` (~1,5 sn) kapanışın motion dilini hook'un üstüne bindirir (teal zemin ortadan açılır, şekiller saçılır; hook gecikmez — kullanıcı kararı 2026-09-16). Son ~3,5 sn ortak, hareketli kapanış kartı.

## Ses

- **Seslendirme:** metinleri Claude yazar, kullanıcı text-to-speech aracıyla üretir. Tercihen sahne başına ayrı dosya: `promo/public/vo/r{n}-s{m}.mp3`. Tek dosya gelirse sahne başlangıç saniyeleri `script.ts`'e elle girilir.
- **Altyazı her zaman yanık:** seslendirme metni kelime kelime, marka tipografisiyle sahnenin parçası olarak ekranda (reels çoğunlukla sessiz izlenir).
- **Müzik gömülmez**, Instagram kütüphanesinden eklenir.
- **Çıktı:** her reels için `rN-<ad>-vo.mp4` (seslendirmeli) + `rN-<ad>.mp4` (sessiz yedek).

## Teknik yapı

```
promo/src/
  reels/
    r1-lansman/ r2-kartlar/ r3-artikulasyon/ r4-sosyal-hikaye/ r5-meb-atolye/
      script.ts        sahneler: id, vo (seslendirme), screen (ekran yazısı), defaultSec
      Reel.tsx         sahne görselleri
  reels-lib/
    ReelFrame.tsx      sahne dizisi + <Audio> + altyazı + kapanış iskeleti
    Caption.tsx        kelime kelime tipografik altyazı
    EndCard.tsx        ortak kapanış (wordmark + ludenlab.com)
    SafeArea.tsx       önizlemede aç/kapa Instagram güvenli alan kılavuzu
    voiceover.ts       ses yolu çözümü + süre (calculateMetadata)
public/vo/  public/real/
```

- **Tek kaynak:** `script.ts` hem altyazıyı hem kullanıcıya verilen seslendirme metnini besler (`npm run scripts` metin çıktısı).
- **Süre:** `calculateMetadata` ses dosyası sürelerini okur; dosya yoksa `defaultSec` + küçük nefes payı. Ses yeniden üretilince zamanlama kendiliğinden güncellenir.
- **Güvenli alan:** üst ~200 px, alt ~320 px'e kritik yazı konmaz.
- **Komutlar:** `npm run reel -- r2`, `npm run reels`; çıktı `out/reels/` (gitignore).
- **Mevcut `StudioTanitim916` ve sahneleri değişmez**; `lib/` yardımcıları (PosterCard, TypeWriter, Cursor, ToolHeader) yeniden kullanılır.
- **Doğrulama:** sahne başına `remotion still` kare kontrolü, render sonrası süre/ses kontrolü. Birim test yok (tanıtım projesi).

## Seslendirme metinleri (taslak v1)

TTS için: "LudenLab" → "Luden Lab", "ludenlab.com" → "ludenlab nokta com" yazılır. Ekran yazısı ayrı sütundur.

### Reels 1 — LudenLab yayında

| Sahne | Seslendirme | Ekran |
|---|---|---|
| s1 | Özel eğitimde her çocuk için ayrı bir materyal hazırlıyorsun. | Her çocuk ayrı. Her materyal ayrı. |
| s2 | Bu yükü artık tek başına taşımak zorunda değilsin. | Yalnız değilsin. |
| s3 | Yapay zekâ destekli Luden Lab yayında. Dil ve konuşma alanında çalışan uzmanlar için Studio, | LudenLab yayında · Studio |
| s4 | özel eğitim öğretmenleri için Atölye. | Atölye |
| s5 | Hepsi tek adreste: ludenlab nokta com. | Kapanış kartı |

### Reels 2 — Öğrenme kartları

| Sahne | Seslendirme | Ekran |
|---|---|---|
| s1 | Pazar akşamı, yarınki seanslar için yine materyal hazırlıyorsun. | Pazar akşamı. Yine materyaller. |
| s2 | Studio'da çalışma odağını yaz; amacı, materyalleri ve adımlarıyla bir öğrenme kartı hazırlansın. | Kategori/yaş/zorluk + odak yazılıyor → kart bölüm bölüm doluyor |
| s3 | Gözden geçir, PDF olarak indir. | Gerçek PDF sayfası (ürün şablonu, kurgu içerik) |
| s4 | Materyal hazır, akşamın senin. | Esenliğin de işinin parçası. |
| s5 | Studio'yu keşfet: ludenlab nokta com. | Kapanış kartı |

### Reels 3 — Hedef ses, görseliyle

| Sahne | Seslendirme | Ekran |
|---|---|---|
| s1 | R sesi için onlarca kelime, her birine bir görsel… Saatlerce arama. | /r/ sesi için kelime + görsel avı? |
| s2 | Studio'da hedef sesi seç. | Ses çipleri → /r/ · Başta |
| s3 | Kelimeler, görselleriyle birlikte gelsin. | Gerçek önbellek görselleriyle 6 kelime kartı (hedef harf turuncu) |
| s4 | Çalışma kâğıdın yazdırmaya hazır. | Gerçek çalışma kâğıdı + HAZIR damgası |
| s5 | Görsel avı bitti, vaktin çocuğa kalsın. | Görsel avı bitti, vaktin çocuğa kalsın. |
| s6 | ludenlab nokta com. | Kapanış kartı (STUDIO) |

### Reels 4 — Her çocuğa kendi hikayesi

| Sahne | Seslendirme | Ekran |
|---|---|---|
| s1 | Sıra beklemek, bazı çocuklar için çok zor. | Sıra beklemek çok zor. |
| s2 | Studio'da durumu yaz; Carol Gray formatında bir sosyal hikaye hazırlansın. | Sıra bekleme · Market seçiliyor → hikaye başlığı |
| s3 | Her cümlenin kendi görseli var. | 4 cümle kartı: tür rozeti + gerçek sahne görseli |
| s4 | Öğrencine özel, yazdırmaya hazır. | Gerçek PDF (ürün şablonu, kurgu içerik) + Yazdır |
| s5 | Her çocuğa kendi hikayesi. | Her çocuğa kendi hikayesi. |
| s6 | ludenlab nokta com. | Kapanış kartı (STUDIO) |

### Reels 5 — MEB hedefinden taslağa

| Sahne | Seslendirme | Ekran |
|---|---|---|
| s1 | Hedef belli; ona uygun seans planını hazırlamak ise saatler alıyor. | Hedef belli. Plan nerede? |
| s2 | Atölye'de MEB'in öğrenme güçlüğü destek eğitim programından hedefini seç. | Modül → Bölüm → Hedef |
| s3 | Seans planı taslağın dakikalar içinde hazır; son söz her zaman senin. | Gerçek PDF taslak (ürün fonksiyonu, kurgu içerik) + akış şeridi + TASLAK damgası |
| s4 | Evrakla değil, çocukla geçen bir gün. | 172 MEB hedefi · 1077 hedef davranış sayacı · resmî kodlarıyla |
| s5 | Atölye'yi keşfet: ludenlab nokta com. | Kapanış kartı |

## Kapsam dışı

- 16:9 / kare versiyonlar, müzik, Instagram'a yükleme ve paylaşım takvimi.
- Mevcut `StudioTanitim916` videosunda değişiklik.
