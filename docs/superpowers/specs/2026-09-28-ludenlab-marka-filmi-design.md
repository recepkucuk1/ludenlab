# LudenLab Marka Filmi "Masanın Öbür Tarafı" — Tasarım

**Tarih:** 2026-09-28
**Durum:** Konsept ve storyboard onaylandı; spec kullanıcı incelemesinde
**Yer:** `promo/` (bağımsız Remotion projesi), dal `claude/ludenlab-marka-filmi` (`claude/instagram-4-5-mockups-bbfa0c` üstünden)
**Storyboard:** https://claude.ai/artifact/2PAQNbmWziKEiodmXdRNDw (12 kare, zaman çizelgesi, metin)
**Dayanak:** `LudenMain/video/docs/stil-rehberi.md` (Kâğıt yönü), Luden Reels Kâğıt ve açılış storyboard'ları, `docs/brand/ludenlab-gorsel-tasarim-claude-project.md`, `2026-09-16-instagram-lansman-reels-design.md`

## Amaç

LudenLab için genel bir marka filmi. Luden kliniği için yapılan Kâğıt videolarının diliyle, ama LudenLab kimliğinde. Kullanım: ludenlab.com, YouTube, LinkedIn, kurum sunumları (16:9) ve Instagram (9:16 kesim).

Kitle: dil ve konuşma alanında çalışan uzmanlar (Studio) ve öğrenme güçlüğü alanında çalışan uzmanlar (Atölye). Hitap "sen", ton esenlik.

## Kararlar (kullanıcı, 2026-09-28)

| Konu | Karar |
|---|---|
| Yol | **A · Masanın Öbür Tarafı** (B "Döner Tabla Turu" ve C "Yörünge" elendi) |
| Format | **16:9 60 sn ana kurgu + 9:16 30 sn kesim** |
| Seslendirme | **İki sürüm:** seslendirmeli ve seslendirmesiz |
| Müzik | Claude seçer: telifsiz sentez, 100 BPM (Luden `muzik.mjs` düzeni). Kullanıcı beğenmezse kendi parçasını önerir |
| Efekt | Var (vuruş listesinden üretilir) |
| Başlık fontu | **Bricolage Grotesque 800**, büyük harf; açıklama Satoshi |
| Kapanış cümlesi | "Her şey çocuğun etrafında." (öneri; spec incelemesinde değiştirilebilir) |

## Konsept

Luden'in Kâğıt videoları masanın aile tarafını gösterdi. Bu film aynı masaya uzmanın tarafından bakar.

- **Turuncu blok = çocuk.** Yan yüzünde küçük bir yüz (iki göz, gülüş). Film boyunca tek kahraman obje; ya görünür ya evrakın altındadır.
- **Kâğıtlar = evrak.** Her çocuğun her hedefi için bir materyal, plan, rapor. Yığın büyüdükçe blok görünmez olur.
- **Döner tabla = süreklilik.** Sahneler kesmeyle değil tabla dönüşüyle değişir; film boyunca 4 × 90° = bir tam tur.
- **Yörünge = logo.** Kapanışta tabla turunun izi bloğun etrafında turuncu bir halka olarak çizilir, ikinci dikey halka yükselir; iki halka LudenLab işaretine (iki kesişen yörünge) dönüşür. "Her şey çocuğun etrafında."

## Zaman ızgarası

100 BPM, 4/4. 1 vuruş = 0,6 sn = 18 kare (30 fps). 16:9 kurgu 100 vuruş = 60 sn = 1800 kare. Vuruş n'nin başlangıcı `(n − 1) × 18` kare.

## Bölümler (16:9, 60 sn)

| # | Bölüm | Vuruş | Zaman | Kare(ler) |
|---|---|---|---|---|
| 0 | Kanca | 1–8 | 0:00–0:04,8 | F1, F2 |
| 1 | Yük | 9–24 | 0:04,8–0:14,4 | F3, F4 |
| 2 | Dönüş | 25–32 | 0:14,4–0:19,2 | F5 |
| 3 | Studio | 33–52 | 0:19,2–0:31,2 | F6, F7 |
| 4 | Atölye | 53–72 | 0:31,2–0:43,2 | F8, F9 |
| 5 | Çocuk | 73–88 | 0:43,2–0:52,8 | F10 |
| 6 | Kapanış | 89–100 | 0:52,8–1:00 | F11, F12 |

### 0 · Kanca (v1–8)
- **v1:** Boş tabla, ortada kesikli yuva. Turuncu blok dönerek düşer, noktalı çizgi iniş yolunu gösterir. "HER ÇOCUK" soldan sağa maskeyle açılır. Logo yok. Ses: whoosh.
- **v3:** Blok yuvaya tok oturur, zıplamaz. "AYRI." gelir. Ses: tok.
- **v5–7:** Üstte "Özel eğitimde" açılır; her vuruşta bir etiket çizilir: `/r/ sesi`, `okuma akıcılığı`, `sıra beklemek`. Ses: tık × 3.
- Kamera çok yavaş iter (5 sn'de %2–4).

### 1 · Yük (v9–24)
- Başlık maskeyle "HER MATERYAL AYRI." olur.
- v9–22: her vuruşta bir kâğıt düşer, dört yığından birine oturur; etiketi bir vuruş görünüp söner (seans planı, BEP, çalışma kâğıdı, veli mektubu, hedef takibi, ev ödevi, rapor…). Ses: her inişte kâğıt; ritim sıklaşır.
- v19: "Evrak büyüdükçe masada çocuğa yer kalmıyor." açılır.
- v22: ön yığın bloğun önüne yükselir, turuncudan yalnız bir şerit kalır. Kamera itmeyi sürdürür.
- v24: müzik yalnız pad'e iner (nefes; görüntü akmaya devam eder, donuk an yok).

### 2 · Dönüş (v25–32) — bölümün enerji patlaması
- v25: tabla +90° döner, kamera %14 geri çekilir. Kâğıtlar havalanıp iki düzgün yığına ayrılır: Studio (mavi sekme) ve Atölye (sarı sekme). Blok yeniden görünür. Ses: whoosh + dönüş, kâğıtlar oturdukça tık dizisi.
- "Bu yükü tek başına taşımak zorunda değilsin." Altında çipler: `01 Studio`, `02 Atölye`.
- v29: künye gelir: LudenLab logosu sol üstte, `LUDENLAB.COM` sağ üstte. Künye bundan sonra sabit. Ses: tık.

### 3 · Studio (v33–52)
- v33: tabla +90°, kamera Studio yığınına iter; diğer öğeler %30 opaklık. Bölüm kilidi `01` + "STUDIO"; "Dil ve konuşma alanında çalışan uzmanlar için." Ses: dönüş.
- v37–39: `dil`, `konuşma`, `işitme` etiketleri. Ses: tık × 3.
- v41: üst kâğıt kalkar, kameraya dönerek (rotateY 35° → 0) **gerçek Artikülasyon çalışma kâğıdına** açılır (Poster çerçeveli, −2° eğik kart). Etiketler: `hedef ses: /r/`, `görseliyle kelimeler`. Metin: "Hedef sesi seç; kelimeler görselleriyle gelsin."
- v48, v50: arkadaki deste çevrilir: Sosyal Hikaye, Öğrenme Kartı. Altta: "Öğrenme Kartı · Sosyal Hikaye · Artikülasyon ve 7 araç daha". Ses: sayfa çevirme × 2.

### 4 · Atölye (v53–72)
- v53: tabla +90°, kamera Atölye yığınına. Kilit `02` + "ATÖLYE"; "Öğrenme güçlüğü alanında çalışan uzmanlar için." Küçük: "MEB Öğrenme Güçlüğü Olan Bireyler İçin Destek Eğitim Programı · 172 hedef". Ses: dönüş.
- v57–59: `modül` → `bölüm` → `hedef 3.1.2` etiketleri basamak basamak iner. Ses: tık × 3, perde yükselir.
- v61: üst kâğıt **gerçek seans planı taslağına** açılır. Etiketler: `MEB hedefi 3.1.2`, `etkinlik akışı`. Metin: "Hedefini seç; seans planı taslağın hazırlansın." + "Son söz her zaman senin."
- v65: TASLAK damgası iner. Ses: tok. Altta: "Seans Planı · BEP & Rapor · Veli Mektubu ve 8 araç daha".
- Atölye bölümünde görsel üretimi çağrıştıran hiçbir öğe yok.

### 5 · Çocuk (v73–88)
- v73: tabla son çeyreği döner, ilk açıya varır. Kamera geri çekilir. İki modül kenarda ince birer dosya (3'er kâğıt); blok ortada tek başına.
- "VAKTİN ÇOCUĞA KALSIN."
- v77–79: açılıştaki üç etiket geri gelir; her çipte onu karşılayan modülün rengi (mavi `/r/ sesi`, sarı `okuma akıcılığı`, mavi `sıra beklemek`). Ses: yumuşak tık × 3.
- Müzik sakinleşir, marimba teklere iner.

### 6 · Kapanış (v89–100)
- v85–88 (Çocuk'un son ölçüsü) yatay yörünge çizilmeye başlar; v89–90'da tamamlanır, ardından dikey ikinci halka yükselir. Halkaların arka yarısı bloğun arkasından geçer. Tabla ve yığınlar bulanıklaşarak (0 → 20 px) çekilir. "HER ŞEY ÇOCUĞUN ETRAFINDA." Ses: yükselen whoosh.
- v93: kamera halkaları logo işaretinin açısına çevirir; blok küçülüp kesişime akar; halkalar resmî işarete (`public/brand/ludenlab-mark.svg`) çapraz geçişle oturur; "Luden Lab" yazısı gelir (resmî `ludenlab-logo.svg`). Ses: son akor.
- v95–96: "Özel eğitimde yapay zekâ destekli öğrenme yönetimi.", çipler `Studio`, `Atölye`, turuncu `ludenlab.com` düğmesi (Poster: ink çerçeve, blursuz ofset gölge); v96 düğme basılır. Ses: tık.
- v97–100: zemin ışığı kaymaya devam eder; kare donmaz.

## 9:16 kesim (30 sn, 50 vuruş)

Aynı sahne bileşeni ve aynı olay listesi yapısı; ayrı, kısaltılmış bir olay listesiyle. Yerleşim Luden Kâğıt reels'i gibi: tabla üstte, metin altta. Instagram güvenli alanı: üst 200 px, alt 320 px'e kritik yazı konmaz.

| Bölüm | Vuruş | Süre | İçerik |
|---|---|---|---|
| Kanca | 1–6 | 3,6 sn | Blok iner; HER ÇOCUK AYRI. |
| Yük | 7–14 | 4,8 sn | Kâğıtlar hızlanır, blok örtülür |
| Dönüş | 15–20 | 3,6 sn | Tabla döner, iki yığın, künye |
| Studio | 21–28 | 4,8 sn | Tek açılım: Artikülasyon kâğıdı |
| Atölye | 29–36 | 4,8 sn | Tek açılım: seans planı taslağı + TASLAK |
| Çocuk + kapanış | 37–50 | 8,4 sn | Vaktin çocuğa kalsın → yörünge → logo, ludenlab.com |

## Görsel dil

Hareket dili ve kurallar Luden stil rehberinden (Kâğıt) aynen; renk, çizgi, font ve gölge LudenLab kimliğinden.

- **Zemin:** krem `#fff8ec` + %5,5 opak 60 px ızgara + hafif gren; zemin ışığı 20–30 sn'lik döngüyle kayar.
- **Çizgi:** ink `#0e1e26`, 3,2 px (1920 genişlikte); kâğıt kenarları 2,2 px.
- **Başlık:** Bricolage Grotesque 800, büyük harf, satır aralığı 0,95, renk teal `#023435`. Açıklama Satoshi 500–700.
- **Tek vurgu:** turuncu `#fe703a` yalnız blokta, yörüngede ve kapanış düğmesinde.
- **Modül tonları:** Studio mavisi `#4a90e2`, Atölye sarısı `#ffce52`; yalnız yığın sekmesi ve çip noktası.
- **Gölge:** izometrik yan yüz + blursuz ofset gölge (Poster kuralı). Bulanıklık yalnız giriş/çıkış hareketinde.
- **Gerçek çıktılar:** Poster çerçeveli (ink kenar, 10 px ofset gölge) eğik kart; `public/real/r3-kagit.png`, `r4-hikaye.png`, `r2-kart.png`, `r5-taslak.png` (içerik kurgu).
- **Tekrarlayan cihazlar:** noktalı etiket çizgisi (vuruşta varır, varışta tık), bölüm kilidi (krem kare + ofset gölge + numara), künye.
- **Giriş/çıkış:** bulanıktan netleşme (16 → 0 px, 0,5–0,7 sn); çıkış bulanıklaşıp derinliğe kaçma (0 → 20 px, ölçek 1 → 0,9, 0,4 sn). Metin yumuşak kenarlı maskeyle soldan sağa açılır. "Her şey aşağıdan kayarak belirir" kalıbı yasak.

## Ses

- **Müzik:** sentez (bağımlılıksız Node), 100 BPM, marimba arpej + pad + yumuşak bas; Luden `muzik.mjs` temel alınır, LudenLab için akor yürüyüşü ve dinamik bu filme göre: Yük'te yoğunluk artar, v24'te pad'e iner, Dönüş'te geri açılır, Çocuk'ta seyrelir, v93'te son akor. Telif sorunu yok.
- **Efekt:** olay listesinden üretilir (whoosh, tok, tık, kâğıt, sayfa çevirme, damga, tabla dönüşü, çan). Görüntü ve ses aynı listeyi okur; her ses görüntüdeki olayla aynı karede.
- **Seviye:** −16 LUFS, gerçek tepe ≤ −1 dBFS.
- **Seslendirme (VO'lu sürüm):** tek anlatıcı, ElevenLabs v3 (fal, `language_code: tr`). Anlatıcı stil karesi adımında seçilir: ilk iki satır Chris ve Matilda ile denenir. Her bölümün satırı ayrı mp3; bölüm başlangıcından 1 vuruş sonra başlar. VO çalarken müzik 6 dB kısılır (ducking). Bir satır bölümüne sığmazsa metin kısaltılır, kurgu uzatılmaz.

### Seslendirme metni (71 kelime)

TTS yazımı: "LudenLab" → "Luden Lab", "ludenlab.com" → "ludenlab nokta com".

| Bölüm | Metin |
|---|---|
| Kanca | Özel eğitimde her çocuk ayrı. |
| Yük | Her çocuğa ayrı materyal, ayrı plan, ayrı rapor. Evrak büyüdükçe masada çocuğa yer kalmıyor. |
| Dönüş | Bu yükü tek başına taşımak zorunda değilsin. |
| Studio | Studio, dil ve konuşma alanında çalışan uzmanlar için. Hedef sesi seç, kelimeler görselleriyle gelsin. |
| Atölye | Atölye, öğrenme güçlüğü alanında çalışan uzmanlar için. Hedefini seç, seans planı taslağın hazırlansın. Son söz her zaman senin. |
| Çocuk | Vaktin çocuğa kalsın. |
| Kapanış | Luden Lab. Her şey çocuğun etrafında. ludenlab nokta com. |

9:16 kesimin VO'su aynı satırların kısaltılmışı: Kanca, Dönüş, Studio (yalnız ikinci cümle), Atölye (ikinci ve üçüncü cümle), Çocuk, Kapanış.

## İçerik kuralları

- Hız iddiası yok ("saniyeler", "1 dakikada", "dakikalar içinde" geçmez).
- Atölye görsel üretmez; Atölye bölümünde yalnız metin taslağı ve PDF.
- MEB iddiası tam adıyla: "Öğrenme Güçlüğü Olan Bireyler İçin Destek Eğitim Programı"; genel "MEB uyumlu" yok. Sayı: 172 hedef.
- Görsel iddiası yalnız görsel üreten Studio araçlarında; Öğrenme Kartı kelime kartı olarak çizilmez.
- Kitle yazımı: "Dil ve konuşma alanında çalışan uzmanlar", "Öğrenme güçlüğü alanında çalışan uzmanlar". "Özel eğitim öğretmenleri" denmez.
- Fiyat, ücretsiz plan, üretim hakkı sayısı yok; kapanış yalnız ludenlab.com.
- Çocuk soyut (turuncu blok); gerçek çocuk fotoğrafı ya da adı yok; kartlardaki adlar kurgu.
- Kusurlu önbellek görselleri (reçel, rende) kullanılmaz.
- Araç sayıları (2026-09-28, koddan): Studio 10 (`apps/hub/src/app/studio/(main)/tools/page.tsx`), Atölye 11 (`apps/hub/src/app/atolye/(app)/araclar/page.tsx`). Render öncesi yeniden kontrol edilir.

## Teknik yapı

```
promo/src/marka/
  zaman.ts          BPM, vuruş→kare; iki olay listesi (169: 100 vuruş, 916: 50 vuruş) — tek kaynak
  izometri.ts       izometrik motor (LudenMain/video/src/kagit.tsx'ten taşınır; dönüş, yüz görünürlüğü, prizma, küp)
  parcalar.tsx      Tabla, KagitYigini, Blok (yüzlü), Etiket (noktalı çizgi + çip), Kilit, CiktiKarti, Yorunge, Kunye, Damga
  kamera.ts         olay listesinden kamera (ölçek, merkez, tabla açısı) eğrisi
  MarkaFilmi.tsx    sahne; `oran: "169" | "916"` ve `vo: boolean` prop'ları
  metin.ts          ekran yazıları ve VO satırları (bölüm başına)
promo/scripts/
  marka-muzik.ts    sentez müzik → public/marka/muzik-169.wav, muzik-916.wav
  marka-sfx.ts      olay listesinden efekt izi → public/marka/sfx-169.wav, sfx-916.wav
  marka-tts.ts      VO satırları → public/marka/vo/<bolum>.mp3 (mevcut tts.ts'nin fal çağrısı paylaşılır)
  marka-render.ts   4 çıktı + ses seviyesi normalizasyonu
  elestiri.ts       Luden elestiri.mjs'in karşılığı: kontak föyü, 360 px telefon föyü, donukluk, LUFS
promo/tests/marka-*.test.ts
```

- **Root kayıtları:** `MarkaFilmi169` (1920×1080, 1800 kare), `MarkaFilmi916` (1080×1920, 900 kare), `MarkaStilKaresi` (Still, F10), `MarkaStoryboard` (Still, anahtar kareler föyü).
- **Çıktılar** (`out/marka/`, gitignore): `ludenlab-marka-169.mp4`, `ludenlab-marka-169-vo.mp4`, `ludenlab-marka-916.mp4`, `ludenlab-marka-916-vo.mp4`, `ludenlab-marka-kapak.png`.
- Fontlar mevcut `src/fonts.ts` ile (Bricolage Google Fonts, Satoshi Fontshare). Logolar `public/brand/`.
- Mevcut `StudioTanitim916`, reels ve 4:5 gönderilere dokunulmaz.
- Remotion'ın paketli ffmpeg'inde lavfi/hstack yok (reels deneyimi); föyler PIL ya da Remotion still ile.

## Doğrulama

- **Birim test (`node --test`):** olay listeleri ızgarada (her olay tam vuruşta, bölümler çakışmaz ve boşluksuz, toplam 1800/900 kare); her VO satırı bölümüne sığar (mp3 varsa gerçek süreyle); içerik kuralları için metin taraması (yasak ifadeler: "saniye", "dakika", "ücretsiz", "özel eğitim öğretmen", "MEB uyumlu").
- **Kare kontrolü:** her anahtar kare için `remotion still`; storyboard föyü ile yan yana.
- **Eleştiri föyü** (her render sonrası): donuk an yok (≥0,5 sn), −16 LUFS, telefon föyünde metin okunur, stil rehberinin kontrol listesi.

## Onay kapıları

1. **Stil karesi:** F10, 16:9, gerçek motorla + iki anlatıcı denemesi. Kullanıcı onayı.
2. **Açılış:** v1–8 animasyonu + açılış föyü. Kullanıcı onayı.
3. **Tam kurgu 16:9:** seslendirmesiz ve seslendirmeli. Kullanıcı onayı (müzik burada değerlendirilir).
4. **9:16 kesim** + kapak. Kullanıcı onayı.

## Kapsam dışı

- Kare (1:1) ve 4:5 sürümler, altyazı dosyası (SRT), İngilizce sürüm.
- Yayın, paylaşım takvimi, siteye yerleştirme.
- `claude/instagram-4-5-mockups-bbfa0c` (ve bu dal) main'e alınması: ayrı karar.
