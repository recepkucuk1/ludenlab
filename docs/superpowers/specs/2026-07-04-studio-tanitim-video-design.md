# LudenLab Studio Tanıtım Videosu — Tasarım Dokümanı

**Tarih:** 2026-07-04 · **Durum:** Onaylandı (kullanıcı, sohbet içinde)

## Amaç

LudenLab Studio için ~30 saniyelik, 9:16 (1080×1920) dikey, Instagram Reels / TikTok uyumlu
mock-up motion-graphic tanıtım videosu. Dashboard, üç öne çıkan araç (Öğrenme Kartları,
Sesletim, Sosyal Öykü) ve çıktılarını stilize mockup'larla gösterir. Gerçek ekran kaydı
kullanılmaz; tüm UI marka "Poster" dilinde yeniden çizilir.

16:9 (1920×1080) versiyonu ikinci adım — aynı sahne bileşenlerinden ayrı kompozisyonla üretilecek
(bu spec'in kapsamı dışında, mimari buna hazır olmalı).

## Üretim yöntemi

**Remotion** (React tabanlı programatik video). Video kod olarak yazılır, `npx remotion render`
ile MP4 (H.264, 30fps) üretilir, `npx remotion studio` ile canlı önizlenir.

## Konum ve yapı

Repo kökünde `promo/` — hub build'inden ve deploy zincirinden tamamen bağımsız,
kendi `package.json`'ı olan ayrı bir Remotion projesi (workspace'e dahil edilmez).

```
promo/
  package.json          # remotion, @remotion/cli, react
  remotion.config.ts
  public/               # logo.svg, luden-logo-mark.png (hub'dan kopya)
  src/
    index.ts            # registerRoot
    Root.tsx            # <Composition id="StudioTanitim916" 1080×1920 @30fps ~900 kare>
    brand.ts            # renk/font token'ları (docs/brand dokümanından birebir)
    lib/                # PosterCard, TypeWriter, Cursor, SquiggleUnderline, fonts.ts
    scenes/
      Hook.tsx           # 0–3 sn
      Dashboard.tsx      # 3–8 sn
      OgrenmeKartlari.tsx # 8–14 sn
      Sesletim.tsx       # 14–19 sn
      SosyalOyku.tsx     # 19–25 sn
      Cta.tsx            # 25–30 sn
```

## Sahne dökümü (30 sn, 900 kare @30fps)

| # | Sahne | Zaman | İçerik ve motion |
|---|-------|-------|------------------|
| 1 | Hook | 0–3 sn | Krem zemin; "Seans materyali hazırlamak saatler almasın." kelime kelime kinetik giriş (spring), turuncu el-çizimi squiggle altını çizer (stroke-dashoffset animasyonu). Küçük "LUDENLAB STUDIO" üst etiketi. |
| 2 | Dashboard | 3–8 sn | Stilize dashboard kartı alttan yaylanarak girer; stat çipleri (12 öğrenci / 5 seans) ve mini takvim stagger ile belirir; animasyonlu imleç noktası "Araçlar →" butonuna tıklar (scale-down tık efekti). |
| 3 | Öğrenme Kartları | 8–14 sn | Araç başlığı; input'a "araba" daktilo efektiyle yazılır (turuncu caret); 4 görselli flashcard -2°/+2° rotasyonla art arda düşer (spring + stagger). |
| 4 | Sesletim | 14–19 sn | Fonem çipleri (/r/ /s/ /k/); /r/ seçilir (mavi dolgu); görselli kelime kartları listelenir; sahne sonunda yeşil "PDF hazır" rozeti damga efektiyle (scale overshoot) vurulur. |
| 5 | Sosyal Öykü | 19–25 sn | "Okula gidiyorum" öykü sayfaları yelpaze gibi açılır (rotate + translate spring); orta sayfa öne gelir, sayfa içeriği (başlık + görsel alanı + metin çizgileri) belirir. |
| 6 | CTA | 25–30 sn | Koyu teal (#023435) zemine tam-ekran wipe geçiş; Luden(krem)+Lab(turuncu) logo yaylanır, "STUDIO" alt yazısı, "ludenlab.com" turuncu CTA butonu nabız atar. |

Sahne geçişleri: tam-ekran renk silme (wipe) veya kartın büyüyüp sonraki sahneyi açması;
sahne başına tek geçiş tekniği, toplamda en fazla iki farklı teknik.

## Görsel dil (marka "Poster" sistemi — docs/brand/ludenlab-gorsel-tasarim-claude-project.md)

- Krem zemin `#fff8ec`, ink `#0e1e26` 2px çerçeveler, **blursuz katı ofset gölgeler** (örn. `4px 4px 0`).
- Studio aksanı mavi `#4a90e2`; turuncu `#fe703a` yalnız CTA/rozet/vurgu; teal `#023435` kapanış zemini; krem logo tonu `#f5e8c7`.
- Başlık: Bricolage Grotesque 700–800 (Google Fonts); metin: Satoshi (Fontshare CDN). Font yükleme `delayRender` ile garanti edilir.
- Hafif kart rotasyonları, blob/squiggle dekorları; ikonlar lucide (stroke 2) — `lucide-react` paketi.
- Tüm springler Remotion `spring()` ile; damping ~12–14 (hafif overshoot), giriş animasyonları 15–25 kare.

## İçerik hassasiyeti

- Gerçek çocuk adı/fotoğrafı/verisi YOK. Mockup verileri kurgusal ve isimsiz (yalnız sayılar/genel etiketler).
- Kart görselleri gerçek AI çıktısı değil; stilize ikon/illüstrasyon temsilleri.
- Kişi-önce, güçlendirici dil; Türkçe karakterler (ş, ç, ö, ü, ğ, ı, â) doğru render edilmeli (font subset kontrolü).

## Ses

Video sessiz teslim edilir; metin ritmi müziksiz çalışır. Müzik yayın sırasında platform
kütüphanesinden eklenir (telif güvenliği).

## Teslimat ve doğrulama

- Çıktı: `promo/out/studio-tanitim-916.mp4` (1080×1920, H.264, 30fps, ~30 sn).
- Doğrulama: (1) `npx remotion render` hatasız biter; (2) kritik karelerden (her sahnenin ortası)
  `renderStill` ile PNG alınıp görsel kontrol yapılır — metin taşması, font fallback, Türkçe
  karakter bozulması denetlenir; (3) süre/çözünürlük ffprobe ile teyit edilir.
- Git: `promo/` kaynak olarak commit edilir; `out/` ve `node_modules/` gitignore.

## Kapsam dışı

- 16:9 kompozisyon (mimari hazır, ayrı iş).
- Müzik/ses tasarımı.
- Gerçek ekran görüntüsü entegrasyonu (istenirse sahnelere `<Img>` ile eklenebilir).
