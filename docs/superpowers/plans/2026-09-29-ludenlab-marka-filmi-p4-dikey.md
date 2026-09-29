# LudenLab Marka Filmi · Plan 4: 9:16 kesim (30 sn)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instagram için 1080 × 1920, 900 karelik (30 sn) kesimi kurmak: `MarkaFilmi916` ve `MarkaFilmi916Vo`. Görüntü, 16:9 filmin durumudur: zaman eşlemesinden geçer (`kare169`), süzülür (tek açılım: alan/kart etiketleri, MEB basamakları, araçlar satırları gizli; Studio destesi çevrilmez) ve yeniden yerleşir (sahne bölgesi üstte, metin sütunu altta; künye yalnız logo; kapanış kartı ortada, halkalar 9:16 logosuna oturur). Ses: `sfx-916.wav`, `muzik-916.wav` (bölüm sınırında akor hep değişir), 9:16 seslendirme ipuçları ve aynı ducking. `npm run marka:render -- 916` iki sürümü −16 LUFS'a getirip yazar; `-- kapak` 9:16 kapağı da basar.

**Architecture:** Yeni saf iki modül: `yerlesim916.ts` (iki tekdüze dönüşüm — sahne ve metin sütunu —, künye, kapanış kartı, halkaların hedef logosunun 16:9 sahne çerçevesindeki karşılığı) ve `durum916.ts` (`durum916(f) = suz916(filmDurumu(kare169(f), KAPANIS_916_SAHNEDE), f)`). 16:9'a dokunan değişiklikler değer koruyucudur: `cocukKapanisKatmani` ve `filmDurumu` isteğe bağlı bir hedef logo alır (varsayılanı 16:9 kartı), zemin işlevleri dışa açılır, `FilmSahnesi` üç parçaya bölünür (`SahneKatmani`, `MetinSutunu`, `KapanisKarti`) ve 16:9 aynı DOM'u üretir; 9:16 sahnesi (`FilmSahnesi916`) aynı parçaları iki 1920 × 1080'lik bölgede (CSS `translate + scale`) çizer. Bölgenin içindeki tam tuval SVG'ler ve sağa hizalı çipler boyutu küçük bir bağlamdan (`tuval.ts`) okur.

**Tech Stack:** Remotion 4.0.484 (`interpolate`, `Easing`, `Html5Audio`, `Sequence`), React 19 (`createContext`), TypeScript (`node --test`, Node 24 tip ayıklama), sistem ffmpeg, Python 3 + PIL (kare karşılaştırması ve föyler).

**Spec:** `docs/superpowers/specs/2026-09-28-ludenlab-marka-filmi-design.md` ("9:16 kesim", "Görsel dil", "Ses", "İçerik kuralları", "Doğrulama", "Onay kapıları" 4)
**Önceki:** Plan 3C tamam (`src/marka/cocukKapanis.ts`, `yorunge.ts`, 16:9 tam film) + 9:16 zaman eşlemesi, efekt izi ve ipuçları (8089113) + 9:16 seslendirme kayıtları (de19d1a). **Başlangıç: 243 test** (Plan 3C sonu).
**Prototip:** Bu plandaki kod, HEAD (41c829f) + Plan 3C'nin plan kodunun mekanik uygulamasından oluşan temiz bir kopyada yazıldı; sonra plan metni aynı tabanın ikinci bir kopyasına görev görev mekanik olarak uygulandı: her görevin sonunda beklenen test sayısı (244 → 246 → 248 → 251 → 259 → 261 → 261 → 261), `tsc` temiz, sonuç prototiple dosya dosya aynı. Plan yazılırken dalın 3C kodu (8aae188, 3C Task 8) prototipin tabanıyla dosya dosya aynıydı: "Bul" blokları dala birebir uyar. 16:9'dan 13 kare (stil karesi + 100 … 1760) piksel piksel aynı, 16:9 seslendirmeli karışımın `wav`'ı ve `muzik-169.wav` bit bit aynı. `npm run marka:render -- 916`: iki sürüm 55 + 58 sn basım (toplam 119 sn), −16,2 / −16,3 LUFS, gerçek tepe −1,8 / −1,4 dBFS; eleştiri föylerinde donuk an yok. Aşağıdaki sayılar o denemelerde ölçüldü.

## Tasarım kararları (bu plan)

- **Durum (denetleyicinin formülüne iki ek):** `durum916(f) = suz916(filmDurumu(kare169(f), KAPANIS_916_SAHNEDE), f)`. (1) `filmDurumu`'na hedef logo verilir: halkalar ve blok, kapanış kartının 9:16'daki logosuna oturur (Plan 3C devri: "yalnız hedef elipsler yeni logo yerinden hesaplanır"); halkaların kendisi, kalınlığın hedefi ve bloğun kesişim hedefi bu logodan gelir, kart `KAPANIS_YERI`'nde kalır ve süzgeç onu 9:16 yerine taşır. (2) Süzgeç 9:16 karesini alır (16:9 karesi ondan türer): zemin ve Studio kilidinin çıkışı 9:16 zamanını ister.
- **Gizlenen öğeler (spec "Tek açılım"):** etiket kimlikleri `studio-0..2` (dil/konuşma/işitme), `studio-kart-*`, `basamak-*` (modül/bölüm/hedef), `atolye-kart-*`; metinler `studio-araclar`, `atolye-araclar`. Hepsi 16:9'un eşlenmiş karelerinde bir yerde görünür (test süzgecin boşa çalışmadığını denetler). Sesleri zaten düşüyor (`GIZLI_SES_169` ve sıçramalar).
- **Studio destesi:** 16:9 karesi ≥ `kare(48)` iken Studio kartları varsa, `modulKatmani(kare(48))`'in çevrilmemiş destesi (Artikülasyon önde) o anki çıkışla çizilir. **Ölçüm:** süzgeçsiz B sıçramasında (16:9 809 → 936) ön kart Artikülasyon'dan Öğrenme Kartı'na atlıyordu (936'da 16:9 destesinde yalnız `real/r2-kart.png` kalmış).
- **Studio kilidi (ölçümle bulundu):** 16:9'da `kilit-studio`, Atölye kilidinin üstüne binmesin diye `K53 − ERKEN` (930) karesinde çıkmaya başlar; bu an B'nin atladığı aralıktadır. Süzgeçsiz sıçramada çıkış 0 → 0,5 atlıyordu (görünürlük 1 → 0,5). 9:16'da çıkış sıçramadan `ERKEN` (6) kare önce başlar (498 → 504: 0 → 0,5), sıçramada 16:9'un değerine varır.
- **Zemin:** ızgara kayması ve ışık 9:16 karesiyle akar (`zeminKaymasi(f)`, `zeminIsigi(f)`): 16:9 karesiyle ızgara A'da 29 px sıçrıyor, 2× parçalarda iki kat hızlı kayıyordu.
- **Sıçramalar (ölçüm, prototip render'ı):** süzgeçten sonra her sıçramada kamera ve tabla aynı, öğe görünürlükleri en çok 1/12 (bir çıkış karesi) oynar, görünen kâğıtlar yerinde; değişen yalnız yavaş itme. Fark görüntüsünde (×4) yalnız nesne kenarları var (odak etrafında tekdüze ölçek); metin sütunu fark vermez.

  | Sıçrama | 9:16 kare | 16:9 kare | itme | ortalama piksel farkı (sıçrama / komşu kare) |
  |---|---|---|---|---|
  | A (Studio açılışı) | 413 → 414 | 646 → 720 | 1,0239 → 1,0280 | 1,90 / 0,39 |
  | B (Atölye dönüşü) | 503 → 504 | 809 → 936 | 1,0329 → 1,0400 | 4,69 / 0,65 (kilit çıkışı 5/12 → 6/12 dahil) |
  | C (Atölye kartı) | 557 → 558 | 989 → 1080 | 1,0031 → 1,0111 | 2,32 / 0,59 |
  | D (Çocuk dönüşü) | 647 → 648 | 1222 → 1296 | 1,0235 → 1,0300 | 2,68 / 0,47 |
  | E (halkalar) | 755 → 756 | 1456 → 1512 | 0,9842 → 0,9725 | 3,53 / 0,68 |

- **Sahne bölgesi (sapma: 760 → 700):** 16:9 `x ≥ 700` (tabla, kâğıtlar, blok, yörüngeler, kartlar, damga, etiketler; kamera itmesi ve sarsıntı dahil) tek dönüşümle üste: `X = (x − 700)·k`, `Y = y·k + 180`, `k = 1080/1220 = 0,8852`. **Ölçüm:** Yük'te sol yığının (S3) çipleri sağa hizalı ve itmeyle sola büyür: "çalışma kâğıdı" 16:9 renderında x = 786'da (tahminle 772); 760 kesiminde (k 0,931) 9:16'da x ≈ 25 (tahminle 11) — 60 px yan payı tutmuyordu; 700'de tahminle 63,7. Sağda en uzun çip (Yük S2) 990'da. Dikeyde 16:9 içeriği y 124 (kartların tepesi) … 1035 (Atölye tablasının altı) → 9:16 290 … 1096; kapanış bloğu (odak 1340, 510) → (566,6; 631,5). Bölge kırpılmaz: yukarıdan düşen blok ve kâğıtlar karenin tepesinden girer, tablanın sağ ucu 16:9'daki gibi kadraj dışında kalır.
- **Metin sütunu:** 16:9 `x < 760` (bölüm yazıları, kilitler, Dönüş çipleri) ikinci tekdüze dönüşümle alta: `X = −50,4 + 0,92·x`, `Y = 846,4 + 0,92·y`. **Ölçüm:** sütunun en üst yazısı Atölye kilidi (y 330 → 1150), en altı "02 Atölye" çipinin alt kenarı (y 817 → 1598); araçlar satırları gizli olduğundan en uzun bölüm Atölye (kilit + 3 satır cümle + "Son söz", 16:9 330–772). 0,92 bandı (1150–1600) dolduran en büyük ölçek; genişlik bol (en uzun satır "HER MATERYAL", 9:16'da x 721'e dek). 104 px başlık 95,7 px'e, 42 px gövde 38,6 px'e iner.
- **Künye:** yalnız renkli logo, 72 px yükseklik, sol üst (54,3; 210) — yazısı x 60'tan başlar (SVG'nin sol iç boşluğu 20,5/260). `LUDENLAB.COM` yok (adres kapanış düğmesinde). Çıkışı `koken="left top"`.
- **Kapanış kartı:** logo kilidi 16:9'daki boyutuyla (760 px) `(160, 592)`'de, iki satır slogan ("Özel eğitimde yapay zekâ destekli" / "öğrenme yönetimi.", 44 px, üstü 955), çağrı satırı (üstü 1109) ortada; kart `(540, 900)` etrafında iter. İçerik 616 (işaretin tepesi) → 1188 (düğme gölgesinin altı, itme dahil). Halkaların hedef logosu `KAPANIS_916_SAHNEDE = sahneye169(160, 592)`, genişlik `760 / k` = (880,74; 465,41; 858,52). **Ölçüm:** v95'te (9:16 kare 864) iki halkanın her noktası 9:16 ekranında hedef elipslerin üstünde (±1e−6), blok kesişimde.
- **Güvenli alan (ölçüm, 900 kare, 2489 yazı kutusu):** sahne yazıları (çipler, TASLAK damgası) x 63,7–990,3, y 289,4–1023,8; metin sütunu x 60–720,6, y 1150–1598; künye ve kapanış kartı x 60–943,2, y 210–1187,8. Genişlik tahmini mevcut sınır testleriyle aynı yol: çip `harf × 14 + 49 (+26 noktalı)` (stil karesinde ölçülenin ~%5 üstü); yazı `harf × boyut × 0,68` (Bricolage 800; 16:9 renderında en geniş satır 0,64 em) ya da `× 0,55` (Satoshi; en geniş 0,51 em). Çıkış hareketi (bulanıklaşıp küçülme) sayılmaz.
- **Ses:** efekt `sfx-916.wav` (mevcut `sesler916`), müzik `muzik-916.wav`, seslendirme `VO_IPUCLARI_916` → `VO_PARCALARI_916` (`from = kare(vurus916)`): kanca-1 18, yuk-1 126, donus-1 270, studio-916 378, atolye-916 522, cocuk-1 666, kapanis-916 792. Ducking aynı işlev (`muzikSeviyesi(f, vo, VO_PARCALARI_916)`); `EFEKT_SES`/`EFEKT_SES_VO`, `MUZIK_TABAN`/`MUZIK_TABAN_VOSUZ` aynı. **Ölçüm:** seslendirmesiz −22,4 → −16,2 LUFS (gerçek tepe −1,8, 5 kodlama), seslendirmeli −19,4 → −16,3 LUFS (−1,4, 1 kodlama).
- **Müzik (bölüm sınırı kuralı):** bölümün ilk akoru öncekinin son akoruysa akor listesi bir akor kaydırılır. 9:16'da Studio (v21–28: C, G) G'de biter; Atölye G yerine Am'den (v29–36: Am, F); Atölye F'de biter, Çocuk F yerine C'den (v37–42: C, Am); Kapanış G, v47 C. 16:9'da hiçbir sınırda eşleşme yok: bölütler aynı (test), `muzik-169.wav` bit bit aynı (md5).
- **Kapak (9:16):** `KAPAK_916_KARE = kare(42)` (9:16 v42 = 16:9 v80): F10 düzeni, üç hedef etiketi varmış, "VAKTİN / ÇOCUĞA / KALSIN." açık, künye. `npm run marka:render -- kapak` iki kapağı basar.
- **İçerik:** yeni ekran yazısı yok (slogan satırlara bölünür, metin aynı; test). İçerik kuralları testleri (`marka-metin`) değişmeden geçer.

## 9:16 zaman çizelgesi (kare = (v − 1) × 18; `ESLEME_916`)

| 9:16 vuruş (kare) | 16:9 vuruş | Hız | Görünen |
|---|---|---|---|
| 1–5 (0–71) | 1–5 | 1× | blok düşer, iner; "HER ÇOCUK / AYRI." |
| 5–7 (72–107) | 5–9 | 2× | "Özel eğitimde", üç hedef etiketi |
| 7–15 (108–251) | 9–25 | 2× | Yük: desteler, "HER MATERYAL / AYRI.", alt cümle |
| 15–19 (252–323) | 25–29 | 1× | Dönüş: tabla −90°, "Bu yükü …" |
| 19–21 (324–359) | 29–33 | 2× | künye, "01 Studio", "02 Atölye" |
| 21–23 (360–395) | 33–35 | 1× | tabla −180°, "01 STUDIO", kitle |
| 23–24 (396–413) | 35–37 | 2× | kitle |
| **A** 24–29 (414–503) | 41–46 | 1× | Artikülasyon kartı açılır, "Hedef sesi seç; …"; kilit 498'den çıkar |
| **B** 29–32 (504–557) | 53–56 | 1× | çevrilmemiş deste çıkar; tabla −270°, "02 ATÖLYE", kitle, MEB |
| **C** 32–34 (558–593) | 61–63 | 1× | seans planı taslağı açılır, "Hedefini seç; …" |
| 34–37 (594–647) | 63–69 | 2× | TASLAK (v35), "Son söz …" (v35,5) |
| **D** 37–40 (648–701) | 73–76 | 1× | tabla −360°, ince yığınlar, "VAKTİN / ÇOCUĞA / KALSIN." |
| 40–43 (702–755) | 76–82 | 2× | hedef etiketleri v40,5 / 41 / 41,5; kapak v42 (738) |
| **E** 43–47 (756–827) | 85–93 | 2× | yörünge A, çekilme, "HER ŞEY / …", yörünge B, künye gider |
| 47–51 (828–899) | 93–97 | 1× | dönüşüm, logo (852–868), slogan (864), düğme basılır (882) |

## Kurallar (tüm görevler)

- Çalışma dizini: `/Users/recepkucuk/ludenlab/.claude/worktrees/ludenlab-marka-filmi/promo` (dal `claude/ludenlab-marka-filmi`). Ana checkout'a dokunma. Push yok.
- **Önkoşul:** Plan 3C bitmiş olmalı (Task 9 dahil). `git log --oneline -12` 3C commit'lerini ("yörünge geometrisi", "Çocuk ve Kapanış katmanı", "Çocuk ve Kapanış sahnesi (v73–100)") göstermeli; `npm test` → `ℹ fail 0`.
- **Dal paylaşımlı:** her görevin başında `git log --oneline -3 && git status --short`; commit'e yalnız o görevin dosyaları (`git add <yollar>`, asla `-A`). Bir "Bul" bloğu dosyada birebir bir kez yoksa (dosya bu plandan sonra değişmiş) DUR: değişikliği oku, aynı anlamı yeni metne uygula, raporla.
- `src/marka/` içi göreli içe aktarmalar uzantılı; yalnız silinebilir TS sözdizimi. macOS büyük/küçük harf duyarsız: yeni dosya adları (`yerlesim916.ts`, `durum916.ts`, `tuval.ts`; testler `marka-yerlesim916`, `marka-durum916`, `marka-guvenli-alan`) mevcutlardan harf büyüklüğü dışında da ayrışır.
- Node testleri `remotion`'dan `interpolate`/`Easing` içe aktarabilir; `.tsx` node testine girmez.
- Ücretli betik çalıştırma (`npm run tts`, `npm run marka:tts` YASAK). `marka:sfx`, `marka:muzik`, `marka:film916`, `marka:render` ücretsiz ve yereldir. Anahtar/env değeri yazdırma.
- Render'da hep `--timeout=120000`. Kayan nokta karşılaştırmaları yaklaşık.
- Commit: Türkçe; son satır ajanın kendi sistem hatırlatmasındaki `Co-Authored-By` satırı. Push yok.
- Test sayıları (Plan 3C sonu 243): T1 244 → T2 246 → T3 248 → T4 251 → T5 259 → T6 261 → T7, T8 261 (dal bu arada büyüdüyse sayılar artar; kapı her zaman `ℹ fail 0`).

## Dosya haritası

| Dosya | Durum | Sorumluluk |
|---|---|---|
| `src/marka/muzikPlani.ts` | değişir | bölüm sınırında akor kuralı |
| `src/marka/sesDuzeni.ts` | değişir | `voParcalari916`, `VO_PARCALARI_916` |
| `src/marka/yerlesim.ts` | değişir | `LogoYeri` tipi |
| `src/marka/cocukKapanis.ts` | değişir | hedef logo parametresi |
| `src/marka/filmDurumu.ts` | değişir | `hedefLogo`, `zeminKaymasi`, `zeminIsigi` |
| `src/marka/yerlesim916.ts` | yeni | 9:16 yerleşimi ve dönüşümleri (saf) |
| `src/marka/moduller.ts` | değişir | `ERKEN` dışa açılır |
| `src/marka/durum916.ts` | yeni | 9:16 durumu: eşleme + süzgeç (saf) |
| `src/marka/kapak.ts` | değişir | `KAPAK_916_KARE` |
| `src/marka/tuval.ts` | yeni | çizim tuvali bağlamı |
| `src/marka/yazi.tsx` | değişir | `Cip`/`Etiket` tuvali okur; `KunyeLogo` |
| `src/marka/FilmSahnesi.tsx` | değişir | parçalar + `FilmSahnesi916` |
| `src/marka/MarkaFilmi.tsx` | değişir | `FilmSesi`, `MarkaFilmi916` |
| `src/Root.tsx` | değişir | `MarkaFilmi916`, `MarkaFilmi916Vo` |
| `package.json` | değişir | `marka:film916` |
| `scripts/marka-render.ts` | değişir | 916 sürümleri, iki kapak |
| `tests/marka-muzik.test.ts`, `tests/marka-ses-duzeni.test.ts`, `tests/marka-cocuk-kapanis.test.ts`, `tests/marka-film.test.ts` | değişir | kural, 9:16 ses, hedef logo, zemin |
| `tests/marka-yerlesim916.test.ts`, `tests/marka-durum916.test.ts`, `tests/marka-guvenli-alan.test.ts` | yeni | yerleşim, süzgeç ve sıçramalar, güvenli alan ve kapak |

---

### Task 1: Müzik — bölüm sınırında akor hep değişir

**Files:** Modify `promo/src/marka/muzikPlani.ts`, `promo/tests/marka-muzik.test.ts`

- [ ] **Step 0: Referanslar (16:9'un değişmediğini sonraki görevler denetler; kodu değiştirmeden önce)**
```bash
mkdir -p out/marka
npm run marka:sfx && npm run marka:muzik && md5 -q public/marka/muzik-169.wav > out/marka/ref-p4-muzik169.md5
npm run marka:stil && cp out/marka/stil-karesi.png out/marka/ref-p4-stil.png
for f in 100 300 500 700 1000 1200 1290 1450 1600 1650 1700 1760; do npx remotion still src/index.ts MarkaFilmi169 out/marka/ref-p4-$f.png --frame=$f --timeout=120000; done
npx remotion render src/index.ts MarkaFilmi169Vo out/marka/ref-p4-ses169vo.wav --codec=wav --timeout=120000
ls out/marka/ref-p4-* | wc -l
```
Expected: `15` (md5, stil, 12 kare, wav). ~3 dk.

- [ ] **Step 1: Testleri değiştir** — `tests/marka-muzik.test.ts`. Bul:
```ts
  assert.deepEqual({ ...vurustakiAkor(BOLUMLER_916, 41) }, { bolum: "cocuk", indeks: 1, akor: "C", ilk: 41, son: 42, kapanisAkoru: false });
```
Değiştir:
```ts
  assert.deepEqual({ ...vurustakiAkor(BOLUMLER_916, 41) }, { bolum: "cocuk", indeks: 1, akor: "Am", ilk: 41, son: 42, kapanisAkoru: false });
```
Bul:
```ts
test("16:9'da hiçbir akor iki bölütte üst üste tutulmaz (Atölye G'den başlar: v53 tabla dönüşünde akor değişir)", () => {
  const b = akorSegmentleri(BOLUMLER_169, 93);
  b.forEach((s, i) => {
    if (i > 0) assert.notEqual(s.akor, b[i - 1].akor, `v${b[i - 1].ilk}–${b[i - 1].son} ${b[i - 1].akor} → v${s.ilk} ${s.akor}`);
  });
  assert.equal(vurustakiAkor(BOLUMLER_169, 52, 93)?.akor, "C");
  assert.equal(vurustakiAkor(BOLUMLER_169, 53, 93)?.akor, "G");
});
```
Değiştir:
```ts
test("iki biçimde de hiçbir akor iki bölütte üst üste tutulmaz (bölüm sınırında akor değişir)", () => {
  for (const [ad, bolumler, son] of [["16:9", BOLUMLER_169, 93], ["9:16", BOLUMLER_916, undefined]] as [string, Bolum[], number | undefined][]) {
    const b = akorSegmentleri(bolumler, son);
    b.forEach((s, i) => {
      if (i > 0) assert.notEqual(s.akor, b[i - 1].akor, `${ad}: v${b[i - 1].ilk}–${b[i - 1].son} ${b[i - 1].akor} → v${s.ilk} ${s.akor}`);
    });
  }
  // 16:9: Studio C'de biter, Atölye G'den başlar (kayma yok).
  assert.equal(vurustakiAkor(BOLUMLER_169, 52, 93)?.akor, "C");
  assert.equal(vurustakiAkor(BOLUMLER_169, 53, 93)?.akor, "G");
  // 9:16: Studio G'de biter → Atölye Am'den; Atölye F'de biter → Çocuk C'den.
  assert.deepEqual([28, 29, 33, 36, 37, 41].map((v) => vurustakiAkor(BOLUMLER_916, v)?.akor), ["G", "Am", "F", "F", "C", "Am"]);
});

test("16:9 akor bölütleri kuraldan etkilenmez (her bölütün başı ve akoru)", () => {
  assert.deepEqual(
    akorSegmentleri(BOLUMLER_169, 93).map((s) => [s.ilk, s.akor]),
    [[1, "Am"], [5, "F"], [9, "Am"], [13, "F"], [17, "C"], [21, "G"], [25, "C"], [29, "G"], [33, "C"], [37, "G"], [41, "Am"], [45, "F"], [49, "C"], [53, "G"], [57, "Am"], [61, "F"], [65, "C"], [69, "G"], [73, "F"], [77, "C"], [81, "Am"], [85, "F"], [89, "G"], [93, "C"]],
  );
});
```
Run: `node --test tests/marka-muzik.test.ts` → `ℹ fail 2` (`akor: 'C'` beklenen `'Am'`; `9:16: v25–28 G → v29 G`).

- [ ] **Step 2: Uygula** — `src/marka/muzikPlani.ts`. Bul:
```ts
// ölçüye oturmayan 9:16 bölüm başlarına da hizmet eder. Sentez scripts/lib/muzik.ts'te.
```
Değiştir:
```ts
// ölçüye oturmayan 9:16 bölüm başlarına da hizmet eder. Bölüm, öncekinin son akoruyla başlamaz (akorSegmentleri).
// Sentez scripts/lib/muzik.ts'te.
```
Bul:
```ts
    let indeks = 0;
    for (let v = b.ilk; v < sonIlk; v += 4, indeks++) {
      const akor = duzen.akorlar[indeks % duzen.akorlar.length];
```
Değiştir:
```ts
    // Bölüm sınırında akor hep değişir: bölümün ilk akoru öncekinin son akoruysa liste bir akor kaydırılır
    // (9:16'da Studio v25–28 G'de biter, Atölye Am'den başlar; Çocuk da F yerine C'den). 16:9'da eşleşme yok.
    const kayma = cikti.length > 0 && cikti[cikti.length - 1].akor === duzen.akorlar[0] ? 1 : 0;
    let indeks = 0;
    for (let v = b.ilk; v < sonIlk; v += 4, indeks++) {
      const akor = duzen.akorlar[(indeks + kayma) % duzen.akorlar.length];
```

- [ ] **Step 3: Doğrula**
```bash
node --test tests/marka-muzik.test.ts
npm test && npm run typecheck
npm run marka:muzik && md5 -q public/marka/muzik-169.wav | diff - out/marka/ref-p4-muzik169.md5 && echo "16:9 müziği aynı"
```
Expected: `ℹ pass 19`; `ℹ pass 244`, `ℹ fail 0`; `marka:muzik` çıktısında 9:16 bölüm RMS'leri (prototip: `kanca -28.9 · yuk -21.6 · donus -18.9 · studio -20.8 · atolye -20.8 · cocuk -25.5 · kapanis -23.2`); son satır `16:9 müziği aynı`.

- [ ] **Step 4: Commit** — `git add src/marka/muzikPlani.ts tests/marka-muzik.test.ts` → `fix(promo/marka): müzik — bölüm sınırında akor hep değişir (9:16 Atölye ve Çocuk)`

---

### Task 2: 9:16 seslendirme parçaları ve ducking

**Files:** Modify `promo/src/marka/sesDuzeni.ts`, `promo/tests/marka-ses-duzeni.test.ts`

- [ ] **Step 1: Testleri ekle** — `tests/marka-ses-duzeni.test.ts`. Bul:
```ts
import { VO_IPUCLARI, voSuresi } from "../src/marka/seslendirme.ts";
import { FPS, kare, toplamKare, BOLUMLER_169 } from "../src/marka/zaman.ts";
```
Değiştir:
```ts
import { VO_IPUCLARI, VO_IPUCLARI_916, voSuresi } from "../src/marka/seslendirme.ts";
import { FPS, kare, toplamKare, BOLUMLER_169, BOLUMLER_916 } from "../src/marka/zaman.ts";
```
Bul:
```ts
  VO_PARCALARI,
  muzikSeviyesi,
  voParcalari,
```
Değiştir:
```ts
  VO_PARCALARI,
  VO_PARCALARI_916,
  muzikSeviyesi,
  voParcalari,
  voParcalari916,
```
Dosya sonuna ekle:
```ts
// ————— 9:16 kesim —————

test("9:16 VO parçaları: her 9:16 ipucu bir parça; başlangıç = 9:16 vuruş karesi, 900 kare içinde, birbirine geçmez", () => {
  const p = voParcalari916();
  assert.equal(p.length, VO_IPUCLARI_916.length);
  VO_IPUCLARI_916.forEach((ip, i) => {
    assert.equal(p[i].id, ip.id);
    assert.equal(p[i].from, kare(ip.vurus916));
    assert.equal(p[i].sure, Math.ceil(voSuresi(ip) * FPS));
  });
  assert.deepEqual(
    p.map((x) => [x.id, x.from, x.sure]),
    [["kanca-1", 18, 64], ["yuk-1", 126, 112], ["donus-1", 270, 59], ["studio-916", 378, 102], ["atolye-916", 522, 109], ["cocuk-1", 666, 33], ["kapanis-916", 792, 73]],
  );
  assert.deepEqual(VO_PARCALARI_916, p);
  const toplam = toplamKare(BOLUMLER_916);
  p.forEach((x, i) => {
    assert.ok(x.from + x.sure <= toplam, x.id);
    if (p[i + 1]) assert.ok(x.from + x.sure <= p[i + 1].from, `${x.id} → ${p[i + 1].id}`);
  });
});

test("9:16 ducking: 9:16 cümlelerinin altında tam kısık, aralarında tabanda; vo kapalıyken sabit", () => {
  for (const p of VO_PARCALARI_916) yaklasik(muzikSeviyesi(p.from + Math.floor(p.sure / 2), true, VO_PARCALARI_916), TAM_DUCK, p.id);
  // studio-916 (378–480) ile atolye-916 (522'de, iniş 518'den) arası serbest; kapanis-916 çıkışından (875) sona dek taban.
  assert.equal(muzikSeviyesi(500, true, VO_PARCALARI_916), MUZIK_TABAN);
  for (let f = 875; f < toplamKare(BOLUMLER_916); f++) assert.equal(muzikSeviyesi(f, true, VO_PARCALARI_916), MUZIK_TABAN, `kare ${f}`);
  // 16:9 parçaları karışmaz: kare 500'de 16:9'da donus-1 (450–509) sürer, 9:16'da cümle yok.
  assert.ok(muzikSeviyesi(500, true) < MUZIK_TABAN);
  for (let f = 0; f < toplamKare(BOLUMLER_916); f++) assert.equal(muzikSeviyesi(f, false, VO_PARCALARI_916), MUZIK_TABAN_VOSUZ);
});
```
Run: `node --test tests/marka-ses-duzeni.test.ts` → FAIL (`SyntaxError: The requested module '../src/marka/sesDuzeni.ts' does not provide an export named 'VO_PARCALARI_916'`).

- [ ] **Step 2: Uygula** — `src/marka/sesDuzeni.ts`. Bul:
```ts
import { VO_IPUCLARI, voSuresi } from "./seslendirme.ts";
```
Değiştir:
```ts
import { VO_IPUCLARI, VO_IPUCLARI_916, voSuresi } from "./seslendirme.ts";
```
Bul:
```ts
export const voParcalari = (): VoParcasi[] =>
  VO_IPUCLARI.map((ip) => ({ id: ip.id, from: kare(ip.vurus169), sure: Math.ceil(voSuresi(ip) * FPS) }));

export const VO_PARCALARI: readonly VoParcasi[] = voParcalari();
```
Değiştir:
```ts
const parca = (ip: { id: string; metin: string }, vurus: number): VoParcasi => ({ id: ip.id, from: kare(vurus), sure: Math.ceil(voSuresi(ip) * FPS) });

export const voParcalari = (): VoParcasi[] => VO_IPUCLARI.map((ip) => parca(ip, ip.vurus169));
/** 9:16 kesimin parçaları: aynı kayıtlar (ve 9:16'ya özgüler) 9:16 vuruşunda. */
export const voParcalari916 = (): VoParcasi[] => VO_IPUCLARI_916.map((ip) => parca(ip, ip.vurus916));

export const VO_PARCALARI: readonly VoParcasi[] = voParcalari();
export const VO_PARCALARI_916: readonly VoParcasi[] = voParcalari916();
```
Bul:
```ts
 * üst üste binen pencereler tabanın altına inmez. Seslendirme kapalıysa müzik `MUZIK_TABAN_VOSUZ`'da sabit kalır.
 */
```
Değiştir:
```ts
 * üst üste binen pencereler tabanın altına inmez. Seslendirme kapalıysa müzik `MUZIK_TABAN_VOSUZ`'da sabit kalır.
 * parcalar: biçimin cümleleri (16:9 `VO_PARCALARI`, 9:16 `VO_PARCALARI_916`).
 */
```

- [ ] **Step 3:** `node --test tests/marka-ses-duzeni.test.ts` → `ℹ pass 13`. `npm test && npm run typecheck` → `ℹ pass 246`, `ℹ fail 0`. Süreler (`sure`) `voSureleri.ts`'teki ölçülmüş mp3 sürelerinden gelir; biri farklıysa (kayıt yenilenmiş) beklenen dizideki sayıyı güncelle ve raporla.
- [ ] **Step 4: Commit** — `git add src/marka/sesDuzeni.ts tests/marka-ses-duzeni.test.ts` → `feat(promo/marka): 9:16 seslendirme parçaları ve ducking`

---

### Task 3: Kapanışın hedef logosu, zemin işlevleri (16:9 değişmez)

**Files:** Modify `promo/src/marka/yerlesim.ts`, `promo/src/marka/cocukKapanis.ts`, `promo/src/marka/filmDurumu.ts`, `promo/tests/marka-cocuk-kapanis.test.ts`, `promo/tests/marka-film.test.ts`

- [ ] **Step 1: Testleri ekle** — `tests/marka-cocuk-kapanis.test.ts` sonuna (dosyadaki `sahne`, `K85`, `K93`, `K95` yardımcılarını kullanır):
```ts
test("hedef logo: varsayılanı kapanış kartının logosu; başka bir yer verilirse halkalar ve blok o logonun işaretine oturur, kart yerinde kalır", () => {
  for (const f of [K85 + 20, K93 + 10, K95]) assert.deepEqual(cocukKapanisKatmani(f, sahne(1.01), KAPANIS_YERI.logo), cocukKapanisKatmani(f, sahne(1.01)), `f=${f}`);
  const logo = { x: 880, y: 465, w: 858 };
  const itme = 1.013;
  const s = sahne(itme);
  const k = logo.w / LOGO_VIEWBOX.w;
  const ekran = ([x, y]: V2): V2 => [s.odak[0] + (x - s.odak[0]) * itme, s.odak[1] + (y - s.odak[1]) * itme];
  const hedef = (e: typeof ISARET.genis) => ({ cx: logo.x + e.cx * k, cy: logo.y + e.cy * k, a: e.a * k, b: e.b * k, aci: e.aci });
  const c = cocukKapanisKatmani(K95, s, logo);
  for (const [id, e] of [["yorunge-a", ISARET.genis], ["yorunge-b", ISARET.dikey]] as const) {
    const ps = c.yorungeler.filter((y) => y.id.startsWith(id)).flatMap((y) => y.cizgi);
    assert.ok(ps.length > 100, id);
    for (const p of ps) assert.ok(Math.abs(elipsYaricapi(hedef(e), ekran(p)) - 1) < 1e-6, id);
  }
  for (const y of c.yorungeler) assert.ok(Math.abs(y.kalinlik * itme - (ISARET.kalinlik * logo.w) / LOGO_VIEWBOX.w) < 1e-9, y.id);
  const u = c.blokIzi!;
  const kes = [logo.x + ISARET.kesisim[0] * k, logo.y + ISARET.kesisim[1] * k];
  assert.ok(Math.hypot(ekran(u.merkez)[0] - kes[0], ekran(u.merkez)[1] - kes[1]) < 1e-6, "blok kesişimde");
  assert.deepEqual([c.kapanis!.logo.x, c.kapanis!.logo.y, c.kapanis!.logo.w], [KAPANIS_YERI.logo.x, KAPANIS_YERI.logo.y, KAPANIS_YERI.logo.w]);
});
```
`tests/marka-film.test.ts` — Bul:
```ts
import { filmDurumu } from "../src/marka/filmDurumu.ts";
```
Değiştir:
```ts
import { filmDurumu, zeminIsigi, zeminKaymasi } from "../src/marka/filmDurumu.ts";
```
dosya sonuna:
```ts
test("hedef logo yalnız yörüngeleri ve bloğun izini değiştirir; zemin zeminKaymasi(f) ve zeminIsigi(f)", () => {
  const logo = { x: 880, y: 465, w: 858 };
  const disi = (d: ReturnType<typeof filmDurumu>) => ({ ...d, yorungeler: [], blok: { ...d.blok, iz: null } });
  for (const f of [0, 500, 1300, 1520, 1640, 1670, 1700]) assert.deepEqual(disi(filmDurumu(f, logo)), disi(filmDurumu(f)), `f=${f}`);
  assert.notDeepEqual(filmDurumu(1670, logo).yorungeler, filmDurumu(1670).yorungeler);
  assert.notDeepEqual(filmDurumu(1670, logo).blok.iz, filmDurumu(1670).blok.iz);
  for (let f = 0; f < SON_KARE; f++) {
    const d = filmDurumu(f);
    assert.deepEqual([zeminKaymasi(f), zeminIsigi(f)], [d.kayma, d.isik], `f=${f}`);
  }
});
```
Run: `node --test tests/marka-film.test.ts` → FAIL (`does not provide an export named 'zeminIsigi'`); `node --test tests/marka-cocuk-kapanis.test.ts` → `ℹ fail 1` (halka noktaları 16:9 logosunda kalır: `yorunge-a`).

- [ ] **Step 2: `yerlesim.ts`** — Bul:
```ts
/** Kapanış kartı (1920 × 1080): logo kilidinin sol üstü ve genişliği, slogan satırının ve çağrı satırının üstü.
```
Değiştir:
```ts
/** Logo kilidinin yeri: sol üst köşe ve genişlik (px). */
export type LogoYeri = { x: number; y: number; w: number };

/** Kapanış kartı (1920 × 1080): logo kilidinin sol üstü ve genişliği, slogan satırının ve çağrı satırının üstü.
```

- [ ] **Step 3: `cocukKapanis.ts`** — sırayla (her "Bul" dosyada birebir bir kez geçer). Bul:
```ts
import { COCUK_YIGIN_YERI, HEDEF_YERLESIMI, KAPANIS_YERI } from "./yerlesim.ts";
```
Değiştir:
```ts
import { COCUK_YIGIN_YERI, HEDEF_YERLESIMI, KAPANIS_YERI, type LogoYeri } from "./yerlesim.ts";
```
Bul:
```ts
/** Logo viewBox noktası → ekran. */
const logoNoktasi = ([x, y]: V2): V2 => {
  const { x: lx, y: ly, w } = KAPANIS_YERI.logo;
  const k = w / LOGO_VIEWBOX.w;
  return [lx + x * k, ly + y * k];
};
/** Logo viewBox'taki elips → ekran elipsi. */
const logoElipsi = (e: Elips): Elips => {
  const k = KAPANIS_YERI.logo.w / LOGO_VIEWBOX.w;
  const [cx, cy] = logoNoktasi([e.cx, e.cy]);
```
Değiştir:
```ts
/** Logo viewBox noktası → ekran (logo: kilidin ekrandaki yeri). */
const logoNoktasi = (logo: LogoYeri, [x, y]: V2): V2 => {
  const k = logo.w / LOGO_VIEWBOX.w;
  return [logo.x + x * k, logo.y + y * k];
};
/** Logo viewBox'taki elips → ekran elipsi. */
const logoElipsi = (logo: LogoYeri, e: Elips): Elips => {
  const k = logo.w / LOGO_VIEWBOX.w;
  const [cx, cy] = logoNoktasi(logo, [e.cx, e.cy]);
```
Bul:
```ts
const yorungeler = (f: number, s: Sahne): YorungeCizimi[] => {
```
Değiştir:
```ts
const yorungeler = (f: number, s: Sahne, logo: LogoYeri): YorungeCizimi[] => {
```
Bul:
```ts
  const kalinlik = lerp(YORUNGE.kalinlik, (ISARET.kalinlik * KAPANIS_YERI.logo.w) / LOGO_VIEWBOX.w / s.itme, u);
```
Değiştir:
```ts
  const kalinlik = lerp(YORUNGE.kalinlik, (ISARET.kalinlik * logo.w) / LOGO_VIEWBOX.w / s.itme, u);
```
Bul:
```ts
kaynak: halkaAElipsi(s.kamera), hedef: logoElipsi(ISARET.genis) },
```
Değiştir:
```ts
kaynak: halkaAElipsi(s.kamera), hedef: logoElipsi(logo, ISARET.genis) },
```
Bul:
```ts
kaynak: halkaBElipsi(egim, s.kamera), hedef: logoElipsi(ISARET.dikey) });
```
Değiştir:
```ts
kaynak: halkaBElipsi(egim, s.kamera), hedef: logoElipsi(logo, ISARET.dikey) });
```
Bul:
```ts
export const cocukKapanisKatmani = (f: number, s: Sahne): CocukKapanisKatmani => {
```
Değiştir:
```ts
/**
 * logo: halkaların ve bloğun oturduğu logo kilidinin ekrandaki yeri (16:9 çerçevesinde, kamera kapsayıcısının dışı).
 * Varsayılanı kapanış kartının logosu; 9:16 kesim kendi logosunun 16:9 sahne çerçevesindeki karşılığını verir
 * (yerlesim916.ts). Yalnız hedef elipsler, halka kalınlığı ve bloğun hedefi değişir; kart (kapanis) KAPANIS_YERI'nde kalır.
 */
export const cocukKapanisKatmani = (f: number, s: Sahne, logo: LogoYeri = KAPANIS_YERI.logo): CocukKapanisKatmani => {
```
Bul:
```ts
    const hedef = kapsayiciya(s, logoNoktasi(ISARET.kesisim));
```
Değiştir:
```ts
    const hedef = kapsayiciya(s, logoNoktasi(logo, ISARET.kesisim));
```
Bul:
```ts
    yorungeler: yorungeler(f, s),
```
Değiştir:
```ts
    yorungeler: yorungeler(f, s, logo),
```

- [ ] **Step 4: `filmDurumu.ts`** — Bul:
```ts
import { GENEL_KAMERA, HEDEF_YERLESIMI, YUK_CIP_YERI } from "./yerlesim.ts";
```
Değiştir:
```ts
import { GENEL_KAMERA, HEDEF_YERLESIMI, KAPANIS_YERI, YUK_CIP_YERI, type LogoYeri } from "./yerlesim.ts";
```
Bul:
```ts
export const filmDurumu = (f: number): FilmDurumu => {
```
Değiştir:
```ts
/** Zemin ızgarasının kayması (px): hiç durmaz. 9:16 kesim kendi karesiyle okur. */
export const zeminKaymasi = (f: number) => f * 0.4;
/** Zemin ışığının yatay konumu (0–1): Kanca'da açılışınki, sonra 750 karelik (25 sn) yavaş salınım. 9:16 kesim kendi karesiyle okur. */
export const zeminIsigi = (f: number) => (f < K9 ? acilisDurumu(f).isik : acilisDurumu(K9).isik + 0.1 * Math.sin((2 * Math.PI * (f - K9)) / 750));

/** hedefLogo: kapanış halkalarının oturduğu logo (cocukKapanisKatmani); varsayılanı 16:9 kapanış kartının logosu. */
export const filmDurumu = (f: number, hedefLogo: LogoYeri = KAPANIS_YERI.logo): FilmDurumu => {
```
Bul:
```ts
  const ck = f >= K73 ? cocukKapanisKatmani(f, { kamera, itme, odak: ODAK }) : null;
```
Değiştir:
```ts
  const ck = f >= K73 ? cocukKapanisKatmani(f, { kamera, itme, odak: ODAK }, hedefLogo) : null;
```
Bul:
```ts
    kayma: f * 0.4,
    isik: f < K9 ? a.isik : acilisDurumu(K9).isik + 0.1 * Math.sin((2 * Math.PI * (f - K9)) / 750),
```
Değiştir:
```ts
    kayma: zeminKaymasi(f),
    isik: zeminIsigi(f),
```
(`f < K9` için `a = acilisDurumu(f)`: ışık değeri birebir aynı.)

- [ ] **Step 5:** `node --test tests/marka-cocuk-kapanis.test.ts tests/marka-film.test.ts` → `ℹ fail 0`. `npm test && npm run typecheck` → `ℹ pass 248`, `ℹ fail 0`.
- [ ] **Step 6: Commit** — `git add src/marka/yerlesim.ts src/marka/cocukKapanis.ts src/marka/filmDurumu.ts tests/marka-cocuk-kapanis.test.ts tests/marka-film.test.ts` → `refactor(promo/marka): kapanış halkalarının hedef logosu parametre, zemin işlevleri dışa açık (16:9 aynı)`

---

### Task 4: 9:16 yerleşimi (`yerlesim916.ts`)

**Files:** Create `promo/src/marka/yerlesim916.ts`, `promo/tests/marka-yerlesim916.test.ts`

- [ ] **Step 1: Başarısız testi yaz** — `tests/marka-yerlesim916.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { V2 } from "../src/marka/izometri.ts";
import { METIN } from "../src/marka/metin.ts";
import { TUVAL_169 } from "../src/marka/tema.ts";
import {
  GUVENLI_916,
  KAPANIS_916,
  KAPANIS_916_SAHNEDE,
  METIN_DONUSUMU,
  SAHNE_916,
  SAHNE_DONUSUMU,
  metinden916,
  sahneden916,
  sahneye169,
  sloganSatirlari,
} from "../src/marka/yerlesim916.ts";

const yakin = (a: number, b: number, e = 1e-9) => Math.abs(a - b) < e;

/** "translate(a px, b px) scale(k)" dönüşümünü noktaya uygular (transformOrigin 0 0). */
const cssUygula = (donusum: string, [x, y]: V2): V2 => {
  const m = /^translate\((-?[\d.e-]+)px, (-?[\d.e-]+)px\) scale\(([\d.e-]+)\)$/.exec(donusum);
  assert.ok(m, donusum);
  const [tx, ty, k] = m!.slice(1).map(Number);
  return [tx + k * x, ty + k * y];
};

test("sahne ve metin dönüşümleri: bilinen noktalar, CSS ile aynı, ters dönüşüm", () => {
  const p = (a: V2, b: V2) => assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9, `${a} ≠ ${b}`);
  p(sahneden916([SAHNE_916.x0, 0]), [0, SAHNE_916.oy]);
  p(sahneden916([TUVAL_169.w, 0]), [1080, SAHNE_916.oy]);
  p(sahneden916([1340, 510]), [566.5573770491803, 631.4754098360656]); // blok (odak)
  p(metinden916([TUVAL_169.sol, 330]), [GUVENLI_916.sol, 1150]);
  for (const q of [[0, 0], [1340, 510], [1920, 1080], [812.5, -40]] as V2[]) {
    p(cssUygula(SAHNE_DONUSUMU, q), sahneden916(q));
    p(cssUygula(METIN_DONUSUMU, q), metinden916(q));
    p(sahneye169(sahneden916(q)), q);
  }
  // Kapanış: halkaların hedef logosu, 9:16 logosunun sahne çerçevesindeki karşılığı.
  const L = KAPANIS_916_SAHNEDE;
  p(sahneden916([L.x, L.y]), [KAPANIS_916.logo.x, KAPANIS_916.logo.y]);
  assert.ok(yakin(L.w * SAHNE_916.k, KAPANIS_916.logo.w));
});

test("metin sütunu: en alt yazı ('02 Atölye' çipinin altı, 16:9 y 817) güvenli bandın altına 5 px içinde", () => {
  const alt = metinden916([0, 790 + 54 / 2])[1];
  assert.ok(alt <= GUVENLI_916.alt && alt > GUVENLI_916.alt - 5, `${alt}`);
});

test("slogan dikeyde iki satır, metin değişmez", () => {
  assert.deepEqual(KAPANIS_916.slogan.satirlar, ["Özel eğitimde yapay zekâ destekli", "öğrenme yönetimi."]);
  assert.equal(KAPANIS_916.slogan.satirlar.join(" "), METIN.kapanis.ekran[0]);
  assert.deepEqual(sloganSatirlari("a b c"), ["a", "b c"]);
});
```
Run: `node --test tests/marka-yerlesim916.test.ts` → FAIL (`Cannot find module '…/src/marka/yerlesim916.ts'`).

- [ ] **Step 2: Uygula** — `src/marka/yerlesim916.ts`:
```ts
import type { V2 } from "./izometri.ts";
import { METIN } from "./metin.ts";
import { LOGO_VIEWBOX, TUVAL_169 } from "./tema.ts";
import type { LogoYeri } from "./yerlesim.ts";

// 9:16 kesimin (1080 × 1920) yerleşimi (spec "9:16 kesim": tabla üstte, metin altta). Film 16:9 durumunu çizer:
// 16:9 karesinin iki bölgesi iki ayrı tekdüze dönüşümle taşınır; künye ve kapanış kartı 9:16'da yeniden kurulur.
// Instagram güvenli alanı: kritik yazı y 200–1600 arasında, yanlardan en az 60 px içeride.

export const GUVENLI_916 = { sol: 60, sag: 1020, ust: 200, alt: 1600 } as const;

/**
 * Sahne bölgesi: 16:9 karesinin x ≥ x0 kısmı (tabla, kâğıtlar, blok, yörüngeler, kartlar, damga, etiketler; kamera
 * itmesi dahil) → X = (x − x0)·k, Y = y·k + oy. x0 = 700: Yük'te sol yığının (S3) en uzun çipi ("çalışma kâğıdı",
 * tahmini 245 px) itmeyle 16:9'da x ≈ 772'ye dek uzanır; 760'ta kesilse 9:16'da kenarın dışına, 700'de 64 px içeri
 * düşer. k = 1080 / 1220. oy = 180: kartların tepesi (16:9 y ≈ 124) 290'a, en büyük tablanın altı (Atölye, y ≈ 1035)
 * 1096'ya iner; metin bandı 1150'de başlar.
 */
export const SAHNE_916 = { x0: 700, k: 1080 / 1220, oy: 180 } as const;

/**
 * Metin sütunu: 16:9 x < 760 (bölüm yazıları, kilitler, Dönüş çipleri) → X = tx + x·k, Y = ty + y·k. Sol kenar (120)
 * 60'a, en üst yazı (Atölye kilidi, y 330) 1150'ye oturur; en alt yazı ("02 Atölye" çipinin altı, y 817) k = 0,92 ile
 * 1598'e iner. Genişlik bol (en uzun satır ~600 px); yüksekliği güvenli bant belirler.
 */
const METIN_K = 0.92;
export const METIN_916 = { k: METIN_K, tx: GUVENLI_916.sol - TUVAL_169.sol * METIN_K, ty: 1150 - 330 * METIN_K } as const;

/** 16:9 sahne noktası → 9:16. */
export const sahneden916 = ([x, y]: V2): V2 => [(x - SAHNE_916.x0) * SAHNE_916.k, y * SAHNE_916.k + SAHNE_916.oy];
/** 9:16 noktası → 16:9 sahne çerçevesi (sahneden916'nın tersi). */
export const sahneye169 = ([x, y]: V2): V2 => [SAHNE_916.x0 + x / SAHNE_916.k, (y - SAHNE_916.oy) / SAHNE_916.k];
/** 16:9 metin sütunu noktası → 9:16. */
export const metinden916 = ([x, y]: V2): V2 => [METIN_916.tx + x * METIN_916.k, METIN_916.ty + y * METIN_916.k];

/** CSS: 16:9 tuvalinde (1920 × 1080, transformOrigin 0 0) çizilen bölgeyi 9:16'daki yerine taşır. */
export const SAHNE_DONUSUMU = `translate(${-SAHNE_916.x0 * SAHNE_916.k}px, ${SAHNE_916.oy}px) scale(${SAHNE_916.k})`;
export const METIN_DONUSUMU = `translate(${METIN_916.tx}px, ${METIN_916.ty}px) scale(${METIN_916.k})`;

/** Künye: yalnız renkli logo, sol üstte, güvenli alanın içinde (adres kapanış düğmesinde). x: logonun sol iç boşluğu
 *  (20,5/260 × yükseklik) payı düşülür, yazı 60 px'e hizalanır. */
const KUNYE_H = 72;
export const KUNYE_916 = { x: GUVENLI_916.sol - (KUNYE_H * 20.5) / LOGO_VIEWBOX.h, y: 210, yukseklik: KUNYE_H } as const;

/** Slogan dikeyde iki satır: son iki kelime ikinci satırda ("… destekli" / "öğrenme yönetimi."). */
export const sloganSatirlari = (s: string): string[] => {
  const k = s.split(" ");
  return [k.slice(0, -2).join(" "), k.slice(-2).join(" ")];
};

/**
 * Kapanış kartı: logo kilidi 16:9'daki boyutuyla (760 px) ortada; altında 40 px arayla iki satır slogan (44 px) ve
 * çağrı satırı. İçerik (işaretin tepesi 616 → düğme gölgesinin altı 1185) güvenli bandın ortasında (≈ 900); kart bu
 * nokta etrafında iter.
 */
const LOGO_916: LogoYeri = { x: 160, y: 592, w: 760 };
export const KAPANIS_916 = {
  logo: LOGO_916,
  slogan: { top: 955, satirlar: sloganSatirlari(METIN.kapanis.ekran[0]) },
  cagri: 1109,
  merkez: [540, 900] as V2,
} as const;

/** Halkaların hedefi: 9:16 logosunun 16:9 sahne çerçevesindeki karşılığı (filmDurumu'nun hedefLogo'su). */
export const KAPANIS_916_SAHNEDE: LogoYeri = (() => {
  const [x, y] = sahneye169([LOGO_916.x, LOGO_916.y]);
  return { x, y, w: LOGO_916.w / SAHNE_916.k };
})();
```

- [ ] **Step 3:** `node --test tests/marka-yerlesim916.test.ts` → `ℹ pass 3`. `npm test && npm run typecheck` → `ℹ pass 251`, `ℹ fail 0`.
- [ ] **Step 4: Commit** — `git add src/marka/yerlesim916.ts tests/marka-yerlesim916.test.ts` → `feat(promo/marka): 9:16 yerleşimi (sahne ve metin dönüşümleri, künye, kapanış kartı)`

---

### Task 5: 9:16 durumu (`durum916.ts`): eşleme, süzgeç, dikişsiz sıçramalar

**Files:** Modify `promo/src/marka/moduller.ts`; Create `promo/src/marka/durum916.ts`, `promo/tests/marka-durum916.test.ts`

- [ ] **Step 1: Başarısız testi yaz** — `tests/marka-durum916.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { GIZLI_METINLER, durum916, gizliEtiket } from "../src/marka/durum916.ts";
import { filmDurumu, zeminIsigi, type FilmDurumu } from "../src/marka/filmDurumu.ts";
import type { V2 } from "../src/marka/izometri.ts";
import { ATOLYE, KAPANIS, STUDIO } from "../src/marka/olaylar.ts";
import { LOGO_VIEWBOX } from "../src/marka/tema.ts";
import { KAPANIS_916, sahneden916 } from "../src/marka/yerlesim916.ts";
import { ISARET, elipsYaricapi } from "../src/marka/yorunge.ts";
import { BOLUMLER_916, kare, toplamKare } from "../src/marka/zaman.ts";
import { kare169, vurus916 } from "../src/marka/zamanEslemesi.ts";

const KARE = toplamKare(BOLUMLER_916);
const yakin = (a: number, b: number, e = 1e-9) => Math.abs(a - b) < e;
/** 9:16 karesinin durumu, bir kez hesaplanır (testler 900 kareyi birkaç kez tarar). */
const onbellek = new Map<number, FilmDurumu>();
const d916 = (f: number) => {
  let d = onbellek.get(f);
  if (!d) onbellek.set(f, (d = durum916(f)));
  return d;
};
/** 16:9 karesinin sıçradığı 9:16 kareleri (bir önceki kareden 2'den fazla ileri). */
const SICRAMALAR = Array.from({ length: KARE - 1 }, (_, i) => i + 1).filter((f) => kare169(f) - kare169(f - 1) > 2);

// ————— Zaman eşlemesinin tüketimi —————

test("9:16 durumu, 16:9 filmin eşlenmiş karesinin durumu: kamera, itme, blok, kâğıtlar, yuva, künye, çipler aynen", () => {
  for (let f = 0; f < KARE; f++) {
    const d = d916(f);
    const a = filmDurumu(kare169(f));
    assert.deepEqual(d.kamera, a.kamera, `f=${f}`);
    assert.equal(d.itme, a.itme, `f=${f}`);
    assert.equal(d.sarsinti, a.sarsinti, `f=${f}`);
    assert.deepEqual([d.blok.z, d.blok.aci, d.blok.yuz, d.blok.opaklik], [a.blok.z, a.blok.aci, a.blok.yuz, a.blok.opaklik], `f=${f}`);
    assert.deepEqual(d.kagitlar, a.kagitlar, `f=${f}`);
    assert.deepEqual([d.yuva, d.kunye, d.kunyeCikis, d.arka], [a.yuva, a.kunye, a.kunyeCikis, a.arka], `f=${f}`);
    assert.deepEqual(d.cipler, a.cipler, `f=${f}`);
  }
});

test("sıçramalar: A, B, C, D, E (9:16 v24, v29, v32, v37, v43)", () => {
  assert.deepEqual(SICRAMALAR, [24, 29, 32, 37, 43].map((v) => kare(v)));
});

// ————— Süzgeç —————

test("gizlenen öğeler 9:16'nın hiçbir karesinde yok; 16:9 karşılığında var (süzgeç boşa çalışmıyor)", () => {
  const goruldu = new Set<string>();
  for (let f = 0; f < KARE; f++) {
    const d = d916(f);
    for (const e of d.etiketler) assert.ok(!gizliEtiket(e.id), `f=${f} ${e.id}`);
    for (const m of d.metinler) assert.ok(!GIZLI_METINLER.includes(m.id), `f=${f} ${m.id}`);
    const a = filmDurumu(kare169(f));
    for (const e of a.etiketler) if (gizliEtiket(e.id)) goruldu.add(e.id.replace(/-\d+$/, ""));
    for (const m of a.metinler) if (GIZLI_METINLER.includes(m.id)) goruldu.add(m.id);
  }
  assert.deepEqual([...goruldu].sort(), ["atolye-araclar", "atolye-kart", "basamak", "studio", "studio-araclar", "studio-kart"]);
});

test("Studio destesi 9:16'da çevrilmez: B'den sonra çıkan deste Artikülasyon önde, sıçramada kartlar kıpırdamaz", () => {
  const B = kare(vurus916(ATOLYE.tabla)!);
  const kartlar = (f: number) => d916(f).kartlar.filter((k) => k.id.startsWith("studio-"));
  const once = kartlar(B - 1);
  assert.equal(once.length, 3);
  for (let f = B; f < B + 12; f++) {
    const k = kartlar(f);
    assert.deepEqual(k.map((x) => [x.id, x.resim, x.cx, x.cy, x.olcek, x.rotY, x.egim, x.sira]), once.map((x) => [x.id, x.resim, x.cx, x.cy, x.olcek, x.rotY, x.egim, x.sira]), `f=${f}`);
    k.forEach((x) => assert.ok(yakin(x.cikis, (kare169(f) - kare(ATOLYE.tabla)) / 12), `f=${f} ${x.id} ${x.cikis}`));
  }
  assert.equal(once[0].resim, "real/r3-kagit.png");
  assert.equal(kartlar(B + 12).length, 0);
  // 16:9'da aynı an çevrilmiş deste: süzgeç olmasa ön kart Öğrenme Kartı olurdu.
  assert.deepEqual(filmDurumu(kare169(B)).kartlar.filter((k) => k.id.startsWith("studio-")).map((k) => k.resim), ["real/r2-kart.png"]);
  assert.ok(kare169(B - 1) < kare(STUDIO.cevir[0]));
});

test("Studio kilidi B sıçramasından 6 kare önce çıkmaya başlar, sıçramada 16:9'un değerine varır", () => {
  const B = kare(vurus916(ATOLYE.tabla)!);
  const cikis = (f: number) => d916(f).kilitler.find((k) => k.id === "kilit-studio")!.cikis;
  assert.equal(cikis(B - 7), 0);
  for (let f = B - 6; f <= B; f++) assert.ok(yakin(cikis(f), (f - (B - 6)) / 12), `f=${f}`);
  assert.equal(cikis(B), filmDurumu(kare169(B)).kilitler.find((k) => k.id === "kilit-studio")!.cikis);
});

/** Görünen kâğıtlar (grup ve kâğıt opaklığı çarpımı > 0): konum, yükseklik, opaklık. */
const gorunenKagitlar = (d: FilmDurumu) =>
  d.kagitlar.flatMap((g) => g.kagitlar.map((k) => ({ k, o: (g.opaklik ?? 1) * (k.opaklik ?? 1) }))).filter((x) => x.o > 0);
/** Öğe görünürlükleri (0–1). */
const gorunurluk = (d: FilmDurumu) => {
  const m = new Map<string, number>();
  for (const e of d.etiketler) m.set(`etiket ${e.id}`, e.gorunum * (1 - e.cikis));
  for (const e of d.metinler) m.set(`metin ${e.id}`, Math.max(...e.acilis) * (1 - e.cikis));
  for (const e of d.kilitler) m.set(`kilit ${e.id}`, e.gorunum * (1 - e.cikis));
  for (const e of d.cipler) m.set(`cip ${e.id}`, e.gorunum * (1 - e.cikis));
  for (const e of d.kartlar) m.set(`kart ${e.id} ${e.resim}`, e.opaklik * (1 - e.cikis));
  if (d.damga) m.set("damga", d.damga.opaklik * (1 - d.damga.cikis));
  m.set("kunye", d.kunye * (1 - d.kunyeCikis));
  m.set("blok", d.blok.opaklik);
  return m;
};

test("sıçramalar dikişsiz: kamera ve tabla aynı, öğe görünürlüğü en çok bir çıkış karesi (1/12) oynar, kâğıtlar yerinde; yalnız itme ≤ 0,012 değişir", () => {
  for (const f of SICRAMALAR) {
    const [a, b] = [d916(f - 1), d916(f)];
    assert.deepEqual([b.kamera.don, b.kamera.s, b.kamera.ox, b.kamera.oy], [a.kamera.don, a.kamera.s, a.kamera.ox, a.kamera.oy], `f=${f} kamera`);
    assert.ok(Math.abs(b.itme - a.itme) <= 0.012, `f=${f} itme ${a.itme} → ${b.itme}`);
    const [ga, gb] = [gorunurluk(a), gorunurluk(b)];
    for (const id of new Set([...ga.keys(), ...gb.keys()])) {
      const fark = Math.abs((ga.get(id) ?? 0) - (gb.get(id) ?? 0));
      assert.ok(fark <= 1 / 12 + 1e-9, `f=${f} ${id}: ${ga.get(id) ?? 0} → ${gb.get(id) ?? 0}`);
    }
    const [ka, kb] = [gorunenKagitlar(a), gorunenKagitlar(b)];
    assert.equal(kb.length, ka.length, `f=${f} kâğıt sayısı`);
    ka.forEach((x, i) => {
      assert.ok(yakin(x.k.z0, kb[i].k.z0) && yakin(x.o, kb[i].o), `f=${f} kâğıt ${i}`);
      x.k.taban.forEach((p, j) => assert.ok(Math.hypot(p[0] - kb[i].k.taban[j][0], p[1] - kb[i].k.taban[j][1]) < 1e-9, `f=${f} kâğıt ${i}`));
    });
  }
});

test("zemin 9:16 karesiyle akar: ızgara karede 0,4 px kayar, ışık zeminIsigi(f) (sıçramada sıçramaz)", () => {
  for (let f = 0; f < KARE; f++) {
    assert.ok(yakin(d916(f).kayma, 0.4 * f), `f=${f}`);
    assert.equal(d916(f).isik, zeminIsigi(f), `f=${f}`);
    if (f > 0) assert.ok(Math.abs(d916(f).isik - d916(f - 1).isik) < 0.001, `f=${f}`);
  }
});

// ————— Kapanış —————

test("kapanış halkaları 9:16 ekranında logo işaretinin yörüngelerine, blok kesişime oturur", () => {
  const f = kare(vurus916(KAPANIS.slogan)!);
  const d = d916(f);
  const k = KAPANIS_916.logo.w / LOGO_VIEWBOX.w;
  const ekran = ([x, y]: V2): V2 => sahneden916([d.odak[0] + (x - d.odak[0]) * d.itme, d.odak[1] + (y - d.odak[1]) * d.itme]);
  const hedef = (e: typeof ISARET.genis) => ({ cx: KAPANIS_916.logo.x + e.cx * k, cy: KAPANIS_916.logo.y + e.cy * k, a: e.a * k, b: e.b * k, aci: e.aci });
  for (const [id, e] of [["yorunge-a", ISARET.genis], ["yorunge-b", ISARET.dikey]] as const) {
    const ps = d.yorungeler.filter((y) => y.id.startsWith(id)).flatMap((y) => y.cizgi);
    assert.ok(ps.length > 100, id);
    for (const q of ps) assert.ok(Math.abs(elipsYaricapi(hedef(e), ekran(q)) - 1) < 1e-6, id);
  }
  const b = ekran(d.blok.iz!.merkez);
  assert.ok(Math.hypot(b[0] - (KAPANIS_916.logo.x + ISARET.kesisim[0] * k), b[1] - (KAPANIS_916.logo.y + ISARET.kesisim[1] * k)) < 1e-6);
  // Kart 9:16 yerinde; animasyon değerleri 16:9'unkiyle aynı.
  const a = filmDurumu(kare169(f)).kapanis!;
  assert.deepEqual(d.kapanis!.logo, { ...KAPANIS_916.logo, gorunum: a.logo.gorunum });
  assert.deepEqual([d.kapanis!.slogan.top, d.kapanis!.cagri.top], [KAPANIS_916.slogan.top, KAPANIS_916.cagri]);
  assert.deepEqual([d.kapanis!.itme, d.kapanis!.slogan.acilis, d.kapanis!.cagri.dugme], [a.itme, a.slogan.acilis, a.cagri.dugme]);
});
```
Run: `node --test tests/marka-durum916.test.ts` → FAIL (`Cannot find module '…/src/marka/durum916.ts'`).

- [ ] **Step 2: `moduller.ts`** — Bul:
```ts
const ERKEN = 6;
```
Değiştir:
```ts
export const ERKEN = 6;
```

- [ ] **Step 3: Uygula** — `src/marka/durum916.ts`:
```ts
import type { FilmDurumu, KartDurumu } from "./filmDurumu.ts";
import { filmDurumu, zeminIsigi, zeminKaymasi } from "./filmDurumu.ts";
import { ERKEN, modulKatmani } from "./moduller.ts";
import { ATOLYE, STUDIO } from "./olaylar.ts";
import { KAPANIS_916, KAPANIS_916_SAHNEDE } from "./yerlesim916.ts";
import { kare } from "./zaman.ts";
import { kare169, vurus916 } from "./zamanEslemesi.ts";

// 9:16 kesimin durumu: 16:9 filmin durumu zaman eşlemesinden (kare169) geçer, sonra süzülür. Saf: 9:16 karesi →
// durum. Hangi bölgenin nereye çizildiği yerlesim916.ts'te, çizim FilmSahnesi916'da (FilmSahnesi.tsx).

/** Gizlenen etiketler (spec "Tek açılım"): Studio alan etiketleri (dil, konuşma, işitme) ve kart etiketleri, MEB
 *  basamak çipleri (modül, bölüm, hedef), Atölye kart etiketleri. Sıçramaları dikişsiz kılan da budur. */
export const gizliEtiket = (id: string) => /^(studio|studio-kart|basamak|atolye-kart)-\d+$/.test(id);
/** Gizlenen metinler: iki araçlar satırı. */
export const GIZLI_METINLER: readonly string[] = ["studio-araclar", "atolye-araclar"];

const K48 = kare(STUDIO.cevir[0]);
/** Studio destesi ilk çevirmeden hemen önce: Artikülasyon kartı önde. */
const CEVRILMEMIS_DESTE: readonly KartDurumu[] = modulKatmani(K48).kartlar.filter((k) => k.id.startsWith("studio-"));
/** B sıçramasının (16:9 v46 → v53) 9:16 karesi. */
const B_916 = kare(vurus916(ATOLYE.tabla)!);

/** 16:9 durumu (d = filmDurumu(kare169(f))) → 9:16 durumu. f: 9:16 karesi. */
export const suz916 = (d: FilmDurumu, f: number): FilmDurumu => {
  const g = kare169(f);
  // Studio destesi 9:16'da hiç çevrilmez (v48 ve v50 B sıçramasında kalır): kartlar B'den sonra çıkarken çevrilmemiş
  // deste o anki çıkışıyla çizilir; ön kart sıçramada değişmez.
  let kartlar = d.kartlar;
  const studio = kartlar.filter((k) => k.id.startsWith("studio-"));
  if (g >= K48 && studio.length > 0) {
    const cikis = studio[0].cikis;
    kartlar = [...CEVRILMEMIS_DESTE.map((k) => ({ ...k, cikis })), ...kartlar.filter((k) => !k.id.startsWith("studio-"))];
  }
  // Studio kilidi 16:9'da Atölye'den ERKEN kare önce (K53 − 6) çıkmaya başlar; o an B sıçramasının içindedir. 9:16'da
  // çıkış sıçramadan ERKEN kare önce başlar ve sıçramada 16:9'un değerine (0,5) varır.
  const kilitler = d.kilitler.map((k) => (k.id === "kilit-studio" && f >= B_916 - ERKEN && f < B_916 ? { ...k, cikis: (f - (B_916 - ERKEN)) / 12 } : k));
  // Kapanış kartı 9:16 yerleşiminde (animasyon değerleri aynen).
  const kapanis = d.kapanis && {
    ...d.kapanis,
    logo: { ...d.kapanis.logo, ...KAPANIS_916.logo },
    slogan: { ...d.kapanis.slogan, top: KAPANIS_916.slogan.top },
    cagri: { ...d.kapanis.cagri, top: KAPANIS_916.cagri },
  };
  return {
    ...d,
    // Zemin 9:16 karesiyle akar: sıçramada ızgara ve ışık sıçramaz, 2× parçada hızlanmaz.
    kayma: zeminKaymasi(f),
    isik: zeminIsigi(f),
    etiketler: d.etiketler.filter((e) => !gizliEtiket(e.id)),
    metinler: d.metinler.filter((m) => !GIZLI_METINLER.includes(m.id)),
    kartlar,
    kilitler,
    kapanis,
  };
};

/** 9:16 karesinin (0…899) durumu; kapanış halkaları 9:16 logosuna oturur. */
export const durum916 = (f: number): FilmDurumu => suz916(filmDurumu(kare169(f), KAPANIS_916_SAHNEDE), f);
```

- [ ] **Step 4:** `node --test tests/marka-durum916.test.ts` → `ℹ pass 8`. `npm test && npm run typecheck` → `ℹ pass 259`, `ℹ fail 0`.

  Testler süzgecin her parçasını tutar (prototipte denendi): deste kıskacı kaldırılırsa "Studio destesi …" ve "sıçramalar dikişsiz" kırılır; kilit düzeltmesi kaldırılırsa "Studio kilidi …" ve "sıçramalar dikişsiz" (B: 0,58 → 0,50 yerine 1 → 0,5); zemin 16:9 karesiyle kalırsa "zemin …"; gizli etiketler süzülmezse "gizlenen öğeler …"; hedef logo verilmezse "kapanış halkaları …". "sıçramalar dikişsiz" kırılırsa hata iletisindeki kimliği ve iki değeri raporla (yeni bir öğe sıçramada beliriyor ya da kayboluyor demektir).
- [ ] **Step 5: Commit** — `git add src/marka/moduller.ts src/marka/durum916.ts tests/marka-durum916.test.ts` → `feat(promo/marka): 9:16 durumu (zaman eşlemesi, tek açılım süzgeci, dikişsiz sıçramalar)`

---

### Task 6: Güvenli alan ve 9:16 kapağı

**Files:** Modify `promo/src/marka/kapak.ts`; Create `promo/tests/marka-guvenli-alan.test.ts`

- [ ] **Step 1: Başarısız testi yaz** — `tests/marka-guvenli-alan.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { durum916 } from "../src/marka/durum916.ts";
import type { FilmDurumu } from "../src/marka/filmDurumu.ts";
import type { V2 } from "../src/marka/izometri.ts";
import { KAPAK_916_KARE } from "../src/marka/kapak.ts";
import { CIP, DAMGA_BOYUT, DUGME, LOGO_VIEWBOX, TUVAL_169 } from "../src/marka/tema.ts";
import { GUVENLI_916, KAPANIS_916, KUNYE_916, metinden916, sahneden916 } from "../src/marka/yerlesim916.ts";
import { BOLUMLER_916, kare, toplamKare } from "../src/marka/zaman.ts";

// 9:16 kesimde Instagram güvenli alanı: kritik yazı x 60–1020, y 200–1600; metin sütunu 1150–1600 bandında.

const KARE = toplamKare(BOLUMLER_916);

type Kutu = { ad: string; x0: number; y0: number; x1: number; y1: number };
/** Çip genişliği tahmini (moduller testiyle aynı; stil karesinde ölçülen genişliklerin ~%5 üstü). */
const cipGenisligi = (metin: string, nokta?: string) => metin.length * CIP.boyut * 0.5 + 2 * CIP.yan + 2 * CIP.kenar + (nokta ? CIP.nokta : 0);
const CIP_YUKSEKLIK = 54;
/** Yazı genişliği tahmini: 16:9 renderında ölçülen en geniş satırların üstünde (Bricolage 800 büyük harf ≤ 0,64 em, Satoshi ≤ 0,51 em). */
const yaziGenisligi = (s: string, boyut: number, font: "baslik" | "govde") => s.length * boyut * (font === "baslik" ? 0.68 : 0.55);
const SATIR = { baslik: 0.95, govde: 1.3 };

/** 9:16 karesindeki kritik yazıların kutuları (çıkış hareketi sayılmaz: yalnız küçültür, bulanıklaştırır). */
const yaziKutulari = (d: FilmDurumu): { sahne: Kutu[]; sutun: Kutu[]; kart: Kutu[] } => {
  const sahneNoktasi = ([x, y]: V2): V2 => sahneden916([d.odak[0] + (x - d.odak[0]) * d.itme, d.odak[1] + (y - d.odak[1]) * d.itme + d.sarsinti]);
  const sahneKutusu = (ad: string, x0: number, y0: number, x1: number, y1: number): Kutu => {
    const [a, b] = [sahneNoktasi([x0, y0]), sahneNoktasi([x1, y1])];
    return { ad, x0: a[0], y0: a[1], x1: b[0], y1: b[1] };
  };
  const sutunKutusu = (ad: string, x0: number, y0: number, x1: number, y1: number): Kutu => {
    const [a, b] = [metinden916([x0, y0]), metinden916([x1, y1])];
    return { ad, x0: a[0], y0: a[1], x1: b[0], y1: b[1] };
  };
  const sahne: Kutu[] = [];
  for (const e of d.etiketler.filter((e) => e.gorunum > 0 && e.cikis < 1)) {
    const w = cipGenisligi(e.metin, e.nokta);
    const [x0, x1] = e.hiza === "sol" ? [e.x, e.x + w] : [e.x - w, e.x];
    sahne.push(sahneKutusu(`etiket ${e.id}`, x0, e.y - CIP_YUKSEKLIK / 2, x1, e.y + CIP_YUKSEKLIK / 2));
  }
  if (d.damga && d.damga.opaklik > 0 && d.damga.cikis < 1) {
    const r = (d.damga.aci * Math.PI) / 180;
    const [w, h] = [DAMGA_BOYUT.w * d.damga.olcek, DAMGA_BOYUT.h * d.damga.olcek];
    const [yw, yh] = [(w * Math.abs(Math.cos(r)) + h * Math.abs(Math.sin(r))) / 2, (w * Math.abs(Math.sin(r)) + h * Math.abs(Math.cos(r))) / 2];
    sahne.push(sahneKutusu("damga", d.damga.x - yw, d.damga.y - yh, d.damga.x + yw, d.damga.y + yh));
  }
  const sutun: Kutu[] = [];
  for (const m of d.metinler.filter((m) => Math.max(...m.acilis) > 0 && m.cikis < 1)) {
    let satir = 0;
    let gen = 0;
    for (const s of m.satirlar) {
      const w = yaziGenisligi(s, m.boyut, m.font);
      satir += m.genislik ? Math.ceil(w / m.genislik) : 1;
      gen = Math.max(gen, m.genislik ? Math.min(w, m.genislik) : w);
    }
    sutun.push(sutunKutusu(`metin ${m.id}`, TUVAL_169.sol, m.top, TUVAL_169.sol + gen, m.top + satir * m.boyut * SATIR[m.font]));
  }
  for (const k of d.kilitler.filter((k) => k.gorunum > 0 && k.cikis < 1)) sutun.push(sutunKutusu(`kilit ${k.id}`, TUVAL_169.sol, k.top, TUVAL_169.sol + 162 + yaziGenisligi(k.kelime, 112, "baslik"), k.top + 124 + 7));
  for (const c of d.cipler.filter((c) => c.gorunum > 0 && c.cikis < 1)) sutun.push(sutunKutusu(`cip ${c.id}`, c.x, c.y - CIP_YUKSEKLIK / 2, c.x + cipGenisligi(c.metin, c.nokta), c.y + CIP_YUKSEKLIK / 2));
  const kart: Kutu[] = [];
  // Künye: logo SVG'sinin sol iç boşluğu (20,5/260 × yükseklik) yazı değildir.
  if (d.kunye > 0 && d.kunyeCikis < 1) kart.push({ ad: "künye", x0: KUNYE_916.x + (KUNYE_916.yukseklik * 20.5) / LOGO_VIEWBOX.h, y0: KUNYE_916.y, x1: KUNYE_916.x + (KUNYE_916.yukseklik * LOGO_VIEWBOX.w) / LOGO_VIEWBOX.h, y1: KUNYE_916.y + KUNYE_916.yukseklik });
  const c = d.kapanis;
  if (c) {
    const [mx, my] = KAPANIS_916.merkez;
    const it = (ad: string, x0: number, y0: number, x1: number, y1: number): Kutu => ({ ad, x0: mx + (x0 - mx) * c.itme, y0: my + (y0 - my) * c.itme, x1: mx + (x1 - mx) * c.itme, y1: my + (y1 - my) * c.itme });
    const ortali = (ad: string, w: number, y0: number, y1: number) => it(ad, 540 - w / 2, y0, 540 + w / 2, y1);
    if (c.logo.gorunum > 0) kart.push(it("logo", c.logo.x, c.logo.y, c.logo.x + c.logo.w, c.logo.y + (c.logo.w * LOGO_VIEWBOX.h) / LOGO_VIEWBOX.w));
    if (c.slogan.acilis > 0) KAPANIS_916.slogan.satirlar.forEach((s, i) => kart.push(ortali(`slogan ${i}`, yaziGenisligi(s, 44, "govde"), c.slogan.top + i * 44 * SATIR.govde, c.slogan.top + (i + 1) * 44 * SATIR.govde)));
    const satir = c.cagri.cipler.reduce((t, h) => t + cipGenisligi(h.metin, h.nokta) + 22, 0) + yaziGenisligi(c.cagri.dugme.metin, DUGME.boyut, "govde") + 2 * DUGME.yan + DUGME.golge;
    kart.push(ortali("çağrı satırı", satir, c.cagri.top, c.cagri.top + DUGME.yukseklik + DUGME.golge));
  }
  return { sahne, sutun, kart };
};

const icinde = (k: Kutu, f: number, ust: number = GUVENLI_916.ust) =>
  assert.ok(
    k.x0 >= GUVENLI_916.sol && k.x1 <= GUVENLI_916.sag && k.y0 >= ust && k.y1 <= GUVENLI_916.alt,
    `f=${f} ${k.ad}: x ${k.x0.toFixed(0)}–${k.x1.toFixed(0)}, y ${k.y0.toFixed(0)}–${k.y1.toFixed(0)}`,
  );

test("kritik yazılar 900 karenin hepsinde güvenli alanda (x 60–1020, y 200–1600); metin sütunu 1150–1600 bandında", () => {
  let sayi = 0;
  for (let f = 0; f < KARE; f++) {
    const { sahne, sutun, kart } = yaziKutulari(durum916(f));
    for (const k of [...sahne, ...kart]) icinde(k, f);
    for (const k of sutun) icinde(k, f, 1150 - 1e-9);
    sayi += sahne.length + sutun.length + kart.length;
  }
  assert.ok(sayi > 2000, `${sayi}`); // 2489 kutu (denetim boşa çalışmıyor)
});

test("9:16 kapağı (v42): üç hedef etiketi varmış, Çocuk başlığı tam açık, kart ve yörünge yok", () => {
  assert.equal(KAPAK_916_KARE, kare(42));
  const d = durum916(KAPAK_916_KARE);
  assert.deepEqual(d.etiketler.map((e) => [e.id, e.gorunum, e.ilerleme, e.cikis]), [0, 1, 2].map((i) => [`cocuk-hedef-${i}`, 1, 1, 0]));
  assert.deepEqual(d.metinler.map((m) => [m.id, m.acilis, m.cikis]), [["cocuk-baslik", [1, 1, 1], 0]]);
  assert.deepEqual([d.kartlar.length, d.yorungeler.length, d.kapanis, d.kunye], [0, 0, null, 1]);
});
```
Run: `node --test tests/marka-guvenli-alan.test.ts` → FAIL (`does not provide an export named 'KAPAK_916_KARE'`).

- [ ] **Step 2: Uygula** — `src/marka/kapak.ts`. Bul:
```ts
export const KAPAK_KARE = kare(84);
```
Değiştir:
```ts
export const KAPAK_KARE = kare(84);
/** 9:16 kapağı (Instagram, 1080 × 1920): 9:16 v42 = 16:9 v80; üç hedef etiketi varmış, "VAKTİN ÇOCUĞA KALSIN." açık. */
export const KAPAK_916_KARE = kare(42);
```

- [ ] **Step 3:** `node --test tests/marka-guvenli-alan.test.ts` → `ℹ pass 2`. `npm test && npm run typecheck` → `ℹ pass 261`, `ℹ fail 0`. Güvenli alan testi kırılırsa ileti kutuyu ve kareyi verir (ör. `f=106 etiket deste-9: x 59–253 …`): sahne yazısıysa `SAHNE_916`'yı (x0, oy), sütunsa `METIN_916`'yı (`METIN_K`) ayarla, testleri yeniden koş, raporla. (Prototip: x0 = 760, k = 0,931 ile ilk hata `f=106 etiket deste-9: x 59–253`; `METIN_K = 0,95` ile `f=325 cip cip-atolye: … y 1561–1613`.)
- [ ] **Step 4: Commit** — `git add src/marka/kapak.ts tests/marka-guvenli-alan.test.ts` → `test(promo/marka): 9:16 güvenli alanı 900 karede; 9:16 kapak karesi`

---

### Task 7: 9:16 sahnesi, kompozisyonlar (tuval, parçalar, `MarkaFilmi916`)

**Files:** Create `promo/src/marka/tuval.ts`; Modify `promo/src/marka/yazi.tsx`, `promo/src/marka/FilmSahnesi.tsx`, `promo/src/marka/MarkaFilmi.tsx`, `promo/src/Root.tsx`, `promo/package.json`

- [ ] **Step 1: `tuval.ts`**:
```ts
import { createContext, useContext } from "react";
import { useVideoConfig } from "remotion";

/**
 * Sahnenin çizildiği tuvalin boyutu (px). 16:9 filmde kompozisyonun kendisidir (sağlayıcı yok). 9:16 kesimde sahne
 * bölgesi 1920 × 1080'lik bir 16:9 tuvalinde çizilip küçültülür: tam tuval SVG'ler ve sağa hizalı çipler bu boyutu okur.
 */
export const Tuval = createContext<{ width: number; height: number } | null>(null);

export const useTuval = () => {
  const v = useVideoConfig();
  return useContext(Tuval) ?? { width: v.width, height: v.height };
};
```

- [ ] **Step 2: `yazi.tsx`** — Bul:
```tsx
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
```
Değiştir:
```tsx
import { AbsoluteFill, Img, staticFile } from "remotion";
```
Bul:
```tsx
import { CIP, DAMGA_BOYUT, DUGME, FONT, LOGO_VIEWBOX, RENK, TUVAL_169 } from "./tema.ts";
```
Değiştir:
```tsx
import { CIP, DAMGA_BOYUT, DUGME, FONT, LOGO_VIEWBOX, RENK, TUVAL_169 } from "./tema.ts";
import { useTuval } from "./tuval.ts";
```
Bul (Cip içinde):
```tsx
  const { width } = useVideoConfig();
```
Değiştir:
```tsx
  const { width } = useTuval();
```
Bul (Etiket içinde):
```tsx
  const { width, height } = useVideoConfig();
```
Değiştir:
```tsx
  const { width, height } = useTuval();
```
Dosya sonuna ekle:
```tsx
/** 9:16 künyesi: yalnız renkli logo (sol üst x, y; yükseklik). */
export const KunyeLogo: React.FC<{ x: number; y: number; yukseklik: number; opaklik?: number }> = ({ x, y, yukseklik, opaklik = 1 }) => (
  <Img src={staticFile("brand/ludenlab-logo.svg")} style={{ position: "absolute", left: x, top: y, height: yukseklik, opacity: opaklik }} />
);
```

- [ ] **Step 3: `FilmSahnesi.tsx`** — önce dosyanın Plan 3C Task 8'in yazdığı hâlde olduğunu doğrula:
```bash
sed -n '/^### Task 8: Sahne çizimi/,/^- \[ \] \*\*Step 2:/p' ../docs/superpowers/plans/2026-09-29-ludenlab-marka-filmi-p3c-cocuk-kapanis.md | sed -n '/^```tsx$/,/^```$/p' | sed '1d;$d' | diff - src/marka/FilmSahnesi.tsx && echo "3C hâli"
```
Expected: `3C hâli`. Değilse (3C uygulanırken ince ayar yapılmış): aşağıdaki sürüm yalnız dosyayı parçalara böler; farkı (`diff` çıktısı) aynı yerlere, `SahneKatmani`/`MetinSutunu`/`KapanisKarti`'ya taşı ve raporla. Dosyanın tamamını şununla değiştir:
```tsx
import React from "react";
import { AbsoluteFill } from "remotion";
import { DUSUS_YUKSEKLIGI } from "./acilisDurumu.ts";
import type { FilmDurumu, KapanisDurumu } from "./filmDurumu.ts";
import { izd, type V2, type V3 } from "./izometri.ts";
import { BLOK_MERKEZ, Blok, DerinlikSirali, HavaGolgesi, KagitListesi, NoktaliCizgi, Tabla, Tanimlar, Yorunge, Yuva, type SahneOgesi } from "./sahne3b.tsx";
import { ETIKETLER } from "./metin.ts";
import { RENK, TUVAL_169 } from "./tema.ts";
import { Tuval, useTuval } from "./tuval.ts";
import { KAPANIS_916, KUNYE_916, METIN_DONUSUMU, SAHNE_DONUSUMU } from "./yerlesim916.ts";
import { CagriSatiri, Cikis, CiktiKarti, Cip, Damga, Etiket, Kilit, Kunye, KunyeLogo, LogoKilidi, MetinBlogu, Zemin } from "./yazi.tsx";

/** Kapanış kartı: logo kilidi, slogan ve çağrı satırı birlikte `merkez` etrafında yavaşça iter. slogan: satırlar. */
const KapanisKarti: React.FC<{ d: KapanisDurumu; merkez: V2; slogan: readonly string[] }> = ({ d, merkez, slogan }) => (
  <div style={{ position: "absolute", inset: 0, transform: `scale(${d.itme})`, transformOrigin: `${merkez[0]}px ${merkez[1]}px` }}>
    <LogoKilidi x={d.logo.x} y={d.logo.y} w={d.logo.w} gorunum={d.logo.gorunum} />
    {d.slogan.acilis > 0 ? (
      <MetinBlogu satirlar={[...slogan]} top={d.slogan.top} font="govde" boyut={44} agirlik={600} renk={RENK.ink} opaklik={0.85} acilis={slogan.map(() => d.slogan.acilis)} ortala />
    ) : null}
    <CagriSatiri top={d.cagri.top} cipler={d.cagri.cipler} dugme={d.cagri.dugme} />
  </div>
);

// Sahne: tabla, kâğıtlar, blok, yörüngeler, kartlar, damga ve etiketler kameranın itmesiyle birlikte odak (blok)
// etrafında ölçeklenir. Kapanışta (durum.arka) tabla ve yığınlar ayrı bir SVG katmanında bulanıklaşarak çekilir; blok
// ve yörüngeler üstteki katmanda kalır. Tuval: 16:9 filmde kompozisyon, 9:16'da 1920 × 1080'lik sahne bölgesi.
const SahneKatmani: React.FC<{ durum: FilmDurumu }> = ({ durum }) => {
  const { width, height } = useTuval();
  const k = durum.kamera;
  const havada = durum.blok.z > 0.02;
  const blokM: V3 = [BLOK_MERKEZ[0], BLOK_MERKEZ[1], BLOK_MERKEZ[2] + durum.blok.z];
  const iz = durum.blok.iz;
  const blokOgeleri: SahneOgesi[] =
    iz && iz.olcek <= 0
      ? []
      : [
          {
            p: [0, 0, 0],
            opaklik: durum.blok.opaklik,
            ciz: (
              <g transform={iz ? `translate(${iz.merkez[0]} ${iz.merkez[1]}) scale(${iz.olcek}) translate(${-iz.kaynak[0]} ${-iz.kaynak[1]})` : undefined}>
                <Blok k={k} m={blokM} aci={durum.blok.aci} yuz={durum.blok.yuz} />
              </g>
            ),
          },
        ];
  const kagitOgeleri: SahneOgesi[] = durum.kagitlar.map((g) => ({ p: g.p, opaklik: g.opaklik, ciz: <KagitListesi kagitlar={g.kagitlar} k={k} /> }));
  const yorungeOgeleri: SahneOgesi[] = durum.yorungeler.map((y) => ({
    p: [0, 0, 0],
    d: y.on ? 1 : -1,
    ciz: <Yorunge cizgi={y.cizgi} dolgu={y.dolgu} kalinlik={y.kalinlik} kilif={y.kilif} opaklik={y.opaklik} />,
  }));
  const tablaKatmani = (
    <>
      <Tabla k={k} />
      <Yuva k={k} opaklik={durum.yuva} />
      {havada ? (
        <>
          <HavaGolgesi k={k} yakinlik={1 - durum.blok.z / DUSUS_YUKSEKLIGI} />
          <NoktaliCizgi a={izd([0, 0, 0.001], k)} b={izd([0, 0, durum.blok.z], k)} opaklik={0.45} />
        </>
      ) : null}
    </>
  );
  const arka = durum.arka;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform: `translateY(${durum.sarsinti}px) scale(${durum.itme})`,
        transformOrigin: `${durum.odak[0]}px ${durum.odak[1]}px`,
      }}
    >
      {arka ? (
        <>
          {arka.opaklik > 0 ? (
            <svg
              width={width}
              height={height}
              style={{
                position: "absolute",
                inset: 0,
                opacity: arka.opaklik,
                filter: arka.bulaniklik > 0 ? `blur(${arka.bulaniklik}px)` : undefined,
                transform: `scale(${arka.olcek})`,
                transformOrigin: `${durum.odak[0]}px ${durum.odak[1]}px`,
              }}
            >
              <Tanimlar />
              {tablaKatmani}
              <DerinlikSirali k={k} ogeler={kagitOgeleri} />
            </svg>
          ) : null}
          <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
            <Tanimlar />
            <DerinlikSirali k={k} ogeler={[...blokOgeleri, ...yorungeOgeleri]} />
          </svg>
        </>
      ) : (
        <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
          <Tanimlar />
          {tablaKatmani}
          <DerinlikSirali k={k} ogeler={[...kagitOgeleri, ...blokOgeleri, ...yorungeOgeleri]} />
        </svg>
      )}
      {[...durum.kartlar]
        .sort((a, b) => b.sira - a.sira)
        .map((k) => (
          <Cikis key={k.id} c={k.cikis} koken="center">
            <CiktiKarti resim={k.resim} cx={k.cx} cy={k.cy} w={k.w} h={k.h} olcek={k.olcek} rotY={k.rotY} egim={k.egim} opaklik={k.opaklik} />
          </Cikis>
        ))}
      {durum.damga ? (
        <Cikis c={durum.damga.cikis} koken="center">
          <Damga x={durum.damga.x} y={durum.damga.y} olcek={durum.damga.olcek} aci={durum.damga.aci} opaklik={durum.damga.opaklik} metin={ETIKETLER.damga[0]} />
        </Cikis>
      ) : null}
      {durum.etiketler.map((e) => (
        <Cikis key={e.id} c={e.cikis} koken="center">
          <Etiket capa={e.capaEkran ?? izd(e.capa, k)} x={e.x} y={e.y} hiza={e.hiza} metin={e.metin} nokta={e.nokta} gorunum={e.gorunum} ilerleme={e.ilerleme} />
        </Cikis>
      ))}
    </div>
  );
};

/** Metin sütunu: bölüm yazıları, kilitler ve Dönüş çipleri (kameradan bağımsız, 16:9 sol sütun koordinatlarında). */
const MetinSutunu: React.FC<{ durum: FilmDurumu }> = ({ durum }) => (
  <>
    {durum.metinler.map((m) => (
      <Cikis key={m.id} c={m.cikis}>
        <MetinBlogu satirlar={m.satirlar} top={m.top} font={m.font} boyut={m.boyut} agirlik={m.agirlik} renk={m.renk} opaklik={m.opaklik} acilis={m.acilis} genislik={m.genislik} />
      </Cikis>
    ))}
    {durum.kilitler.map((k) => (
      <Cikis key={k.id} c={k.cikis}>
        <Kilit numara={k.numara} kelime={k.kelime} top={k.top} gorunum={k.gorunum} />
      </Cikis>
    ))}
    {durum.cipler.map((c) => (
      <Cikis key={c.id} c={c.cikis}>
        <Cip x={c.x} y={c.y} metin={c.metin} nokta={c.nokta} gorunum={c.gorunum} />
      </Cikis>
    ))}
  </>
);

// Filmin tek sahnesi (16:9): durum → kare. Zemin sabit; sahne kameranın itmesiyle ölçeklenir; metin sütunu, kapanış
// kartı ve künye kameradan bağımsız.
export const FilmSahnesi: React.FC<{ durum: FilmDurumu }> = ({ durum }) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <Zemin isik={durum.isik} kayma={durum.kayma} />
    <SahneKatmani durum={durum} />
    <MetinSutunu durum={durum} />
    {durum.kapanis ? <KapanisKarti d={durum.kapanis} merkez={[TUVAL_169.w / 2, TUVAL_169.h / 2]} slogan={[durum.kapanis.slogan.metin]} /> : null}
    {durum.kunye > 0 ? (
      <Cikis c={durum.kunyeCikis} koken="center top">
        <Kunye opaklik={durum.kunye} />
      </Cikis>
    ) : null}
  </AbsoluteFill>
);

/** 16:9 tuvali (1920 × 1080) boyunda, sol üstten dönüştürülen bölge (yerlesim916.ts); içindekiler bu tuvali okur. */
const Bolge: React.FC<{ donusum: string; children: React.ReactNode }> = ({ donusum, children }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: TUVAL_169.w, height: TUVAL_169.h, transform: donusum, transformOrigin: "0 0" }}>
    <Tuval.Provider value={{ width: TUVAL_169.w, height: TUVAL_169.h }}>{children}</Tuval.Provider>
  </div>
);

// 9:16 kesimin sahnesi (1080 × 1920): zemin tam kare; 16:9'un sahne bölgesi üstte, metin sütunu altta (iki tekdüze
// dönüşüm); künye yalnız logo; kapanış kartı ortada (durum916 kartı 9:16 yerlerine taşır).
export const FilmSahnesi916: React.FC<{ durum: FilmDurumu }> = ({ durum }) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <Zemin isik={durum.isik} kayma={durum.kayma} />
    <Bolge donusum={SAHNE_DONUSUMU}>
      <SahneKatmani durum={durum} />
    </Bolge>
    <Bolge donusum={METIN_DONUSUMU}>
      <MetinSutunu durum={durum} />
    </Bolge>
    {durum.kapanis ? <KapanisKarti d={durum.kapanis} merkez={KAPANIS_916.merkez} slogan={KAPANIS_916.slogan.satirlar} /> : null}
    {durum.kunye > 0 ? (
      <Cikis c={durum.kunyeCikis} koken="left top">
        <KunyeLogo x={KUNYE_916.x} y={KUNYE_916.y} yukseklik={KUNYE_916.yukseklik} opaklik={durum.kunye} />
      </Cikis>
    ) : null}
  </AbsoluteFill>
);
```
(16:9 `FilmSahnesi` aynı DOM'u üretir: parçalar React bileşeni, araya düğüm girmez; kapanış kartının dönüşüm kökü yine `960px 540px`, slogan tek satır.)

- [ ] **Step 4: `MarkaFilmi.tsx`** — tamamını şununla değiştir (16:9 ses ağacı aynı: aynı dosyalar, aynı `volume`, aynı `Sequence`'ler):
```tsx
import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { durum916 } from "./durum916.ts";
import { FilmSahnesi, FilmSahnesi916 } from "./FilmSahnesi.tsx";
import { filmDurumu } from "./filmDurumu.ts";
import { EFEKT_SES, EFEKT_SES_VO, VO_PARCALARI, VO_PARCALARI_916, VO_SES, muzikSeviyesi, type VoParcasi } from "./sesDuzeni.ts";

export type MarkaFilmiProps = { vo: boolean };

/**
 * Filmin sesi: efekt (public/marka/sfx-<oran>.wav, `npm run marka:sfx`), müzik (muzik-<oran>.wav, `npm run marka:muzik`)
 * ve `vo` açıkken seslendirme (public/marka/vo/<id>.mp3, parçanın karesinde başlar). Müzik seslendirmenin altında kısılır
 * (sesDuzeni.ts); `vo` kapalıyken hiç kısılmaz.
 */
const FilmSesi: React.FC<{ oran: "169" | "916"; vo: boolean; parcalar: readonly VoParcasi[] }> = ({ oran, vo, parcalar }) => (
  <>
    <Html5Audio src={staticFile(`marka/sfx-${oran}.wav`)} volume={vo ? EFEKT_SES_VO : EFEKT_SES} />
    {/* `volume` işlevine kare, en yakın Sequence'in başına göre gelir; müzik Sequence dışında olduğundan film karesidir. */}
    <Html5Audio src={staticFile(`marka/muzik-${oran}.wav`)} volume={(kare) => muzikSeviyesi(kare, vo, parcalar)} />
    {vo &&
      parcalar.map((p) => (
        <Sequence key={p.id} from={p.from} durationInFrames={p.sure + 15} name={`vo ${p.id}`}>
          <Html5Audio src={staticFile(`marka/vo/${p.id}.mp3`)} volume={VO_SES} />
        </Sequence>
      ))}
  </>
);

/** 16:9 marka filmi (60 sn). */
export const MarkaFilmi169: React.FC<MarkaFilmiProps> = ({ vo }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <FilmSahnesi durum={filmDurumu(f)} />
      <FilmSesi oran="169" vo={vo} parcalar={VO_PARCALARI} />
    </AbsoluteFill>
  );
};

/** 9:16 kesim (30 sn): 16:9 filmin durumu zaman eşlemesinden ve süzgeçten geçer (durum916.ts). */
export const MarkaFilmi916: React.FC<MarkaFilmiProps> = ({ vo }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <FilmSahnesi916 durum={durum916(f)} />
      <FilmSesi oran="916" vo={vo} parcalar={VO_PARCALARI_916} />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 5: `Root.tsx`** — Bul:
```tsx
import { MarkaFilmi169 } from "./marka/MarkaFilmi";
import { BOLUMLER_169, FPS, toplamKare } from "./marka/zaman";
```
Değiştir:
```tsx
import { MarkaFilmi169, MarkaFilmi916 } from "./marka/MarkaFilmi";
import { BOLUMLER_169, BOLUMLER_916, FPS, toplamKare } from "./marka/zaman";
```
Bul:
```tsx
    <Composition id="MarkaFilmi169Vo" component={MarkaFilmi169} defaultProps={{ vo: true }} durationInFrames={toplamKare(BOLUMLER_169)} fps={FPS} width={1920} height={1080} />
```
Değiştir:
```tsx
    <Composition id="MarkaFilmi169Vo" component={MarkaFilmi169} defaultProps={{ vo: true }} durationInFrames={toplamKare(BOLUMLER_169)} fps={FPS} width={1920} height={1080} />
    <Composition id="MarkaFilmi916" component={MarkaFilmi916} defaultProps={{ vo: false }} durationInFrames={toplamKare(BOLUMLER_916)} fps={FPS} width={1080} height={1920} />
    <Composition id="MarkaFilmi916Vo" component={MarkaFilmi916} defaultProps={{ vo: true }} durationInFrames={toplamKare(BOLUMLER_916)} fps={FPS} width={1080} height={1920} />
```

- [ ] **Step 6: `package.json`** — Bul:
```json
    "marka:film": "node scripts/marka-sfx.ts && remotion render src/index.ts MarkaFilmi169 out/marka/film-169.mp4",
```
Değiştir:
```json
    "marka:film": "node scripts/marka-sfx.ts && remotion render src/index.ts MarkaFilmi169 out/marka/film-169.mp4",
    "marka:film916": "node scripts/marka-sfx.ts && remotion render src/index.ts MarkaFilmi916 out/marka/film-916.mp4",
```

- [ ] **Step 7:** `npm run typecheck && npm test` → temiz, `ℹ pass 261`, `ℹ fail 0`.

- [ ] **Step 8: 16:9 değişmedi (piksel ve ses)**
```bash
npm run marka:stil && cp out/marka/stil-karesi.png out/marka/p4-stil.png
for f in 100 300 500 700 1000 1200 1290 1450 1600 1650 1700 1760; do npx remotion still src/index.ts MarkaFilmi169 out/marka/p4-$f.png --frame=$f --timeout=120000; done
python3 -c "
from PIL import Image, ImageChops
for f in ['stil', 100, 300, 500, 700, 1000, 1200, 1290, 1450, 1600, 1650, 1700, 1760]:
    a = Image.open(f'out/marka/p4-{f}.png').convert('RGB'); b = Image.open(f'out/marka/ref-p4-{f}.png').convert('RGB')
    print(f, ImageChops.difference(a, b).getbbox())"
npx remotion render src/index.ts MarkaFilmi169Vo out/marka/p4-ses169vo.wav --codec=wav --timeout=120000
md5 -q out/marka/p4-ses169vo.wav out/marka/ref-p4-ses169vo.wav
```
Expected: 13 satır, hepsi `… None`; iki md5 aynı. Değilse DUR ve raporla.

- [ ] **Step 9: 9:16 render'ı ve kareler**
```bash
npm run marka:film916 -- --timeout=120000
mkdir -p out/marka/p4
for n in 60 100 150 290 350 413 414 470 503 504 530 557 558 610 647 648 738 755 756 810 845 860 885 899; do ffmpeg -v error -y -i out/marka/film-916.mp4 -vf "select=eq(n\,$n)" -vframes 1 out/marka/p4/k$n.png; done
python3 - <<'EOF'
from PIL import Image, ImageChops, ImageDraw
# Föy: 270 × 480 kareler; kırmızı çizgiler güvenli alan (y 200, 1600; x 60, 1020).
ns = [60, 100, 150, 290, 350, 413, 414, 470, 503, 504, 530, 557, 558, 610, 647, 648, 738, 755, 756, 810, 845, 860, 885, 899]
W, H = 270, 480
t = Image.new('RGB', (W * 8, H * 3), 'white')
for i, n in enumerate(ns):
    im = Image.open(f'out/marka/p4/k{n}.png').convert('RGB').resize((W, H)); d = ImageDraw.Draw(im)
    for y in (200, 1600): d.line([(0, y * H / 1920), (W, y * H / 1920)], fill='red')
    for x in (60, 1020): d.line([(x * W / 1080, 0), (x * W / 1080, H)], fill='red')
    d.text((4, 4), str(n), fill='blue'); t.paste(im, ((i % 8) * W, (i // 8) * H))
t.save('out/marka/p4/foy.png')
# Sıçramalar: önceki kare | sıçrama karesi | fark ×4; ortalama fark (sıçrama / komşu kare).
ort = lambda im: sum(i * c for i, c in enumerate(im.convert('L').histogram())) / (im.size[0] * im.size[1])
satirlar = []
for j in (414, 504, 558, 648, 756):
    a, b = (Image.open(f'out/marka/p4/k{n}.png').convert('RGB') for n in (j - 1, j))
    fark = ImageChops.difference(a, b)
    print(j, round(ort(fark), 2))
    r = Image.new('RGB', (1080, 640), 'white')
    for i, im in enumerate((a, b, fark.point(lambda v: min(255, v * 4)))): r.paste(im.resize((360, 640)), (360 * i, 0))
    satirlar.append(r)
s = Image.new('RGB', (1080, 640 * 5), 'white')
for i, r in enumerate(satirlar): s.paste(r, (0, 640 * i))
s.save('out/marka/p4/sicramalar.png')
EOF
```
(Render ~60 sn.) Beklenen ortalama farklar ~1,9 / 4,7 / 2,3 / 2,7 / 3,5 (±1). `foy.png`, `sicramalar.png` ve gereken tek karelere (`k<n>.png`) Read ile bak ve doğrula:
1. **Kanca (60, 100):** tabla üstte (y ~450–935), blok yuvada; "HER ÇOCUK / AYRI." altta 1150 çizgisinin altında, sol kenar 60'ta; 100'de "Özel eğitimde" ve üç hedef etiketi (2× hızda).
2. **Yük (150):** yığınlar büyüyor; "çalışma kâğıdı" çipi solda, sol kenar 60 çizgisinin içinde; kâğıtlar karenin tepesinden düşüyor (künye yok).
3. **Dönüş (290, 350):** "Bu yükü tek başına / taşımak zorunda / değilsin." altta; 350'de sol üstte küçük renkli logo (y 210–282), "01 Studio", "02 Atölye" çipleri 1600'ün üstünde; sağ üstte `LUDENLAB.COM` YOK.
4. **A (413 | 414):** "01 STUDIO" ve kitle iki karede aynı; fark görüntüsünde yalnız tabla/yığın kenarları (itme %0,4). Studio alan etiketleri (dil, konuşma, işitme) hiç görünmüyor.
5. **Studio kartı (470):** Artikülasyon kartı ve deste üstte (kartın tepesi ~290, künyeye değmiyor); "Hedef sesi seç; …" altta; kart etiketleri ("hedef ses: /r/", "görseliyle kelimeler") ve araçlar satırı YOK.
6. **B (503 | 504):** ön kart iki karede de Artikülasyon (Öğrenme Kartı'na atlamıyor); "01 STUDIO" bulanıklaşarak gidiyor (sıçramada devam ediyor); fark yalnız kenarlar + kilit.
7. **Atölye (530):** tabla −270°, "02 ATÖLYE", kitle, MEB satırı (2 satır, 1600'ün üstünde); MEB basamak çipleri (modül, bölüm, hedef 3.1.2) YOK.
8. **C (557 | 558):** kitle ve MEB iki karede aynı; seans planı kartı henüz yok; fark yalnız kenarlar.
9. **TASLAK (610):** kart açılmış, damga iniyor (damga y ≥ 290); "Hedefini seç; …"; kart etiketleri ve araçlar satırı YOK.
10. **D (647 | 648):** kart, TASLAK, "Son söz her zaman senin." iki karede aynı; 648'de tabla dönmeye başlıyor; yığınlar yerinde.
11. **Çocuk / kapak (738):** F10 düzeni: ince yığınlar, blok, üç renkli hedef etiketi (sağdaki "sıra beklemek" 1020'nin içinde), "VAKTİN / ÇOCUĞA / KALSIN.".
12. **E (755 | 756):** etiketler ve başlık aynı; tabla %1,2 küçülüyor (itme 0,984 → 0,973: yalnız kenarlarda ~10 px).
13. **Kapanış (810, 845, 860):** 810'da iki halka ve "HER ŞEY / ÇOCUĞUN / ETRAFINDA."; 845'te halkalar dönüşerek logonun işaret yerine gidiyor, blok kesişimde küçülüyor; 860'ta bulanık logo kilidi ve sönen halkalar aynı yörüngelerde (kayık hayalet yok).
14. **Kart (885, 899):** logo ortada (x 160–920), iki satır slogan ortalı, `Studio`, `Atölye` hapları ve `ludenlab.com` düğmesi; 885'te düğme tam basılı (gölge yok), 899'da yarı geri çıkmış (4 px gölge); hiçbir yazı 200/1600 çizgilerinin dışında değil.
Bir madde tutmazsa ilgili değeri (`yerlesim916.ts` yerleri, `durum916.ts` süzgeci) düzelt, testleri ve render'ı yeniden koş, raporla.

- [ ] **Step 10: Commit** — `git add src/marka/tuval.ts src/marka/yazi.tsx src/marka/FilmSahnesi.tsx src/marka/MarkaFilmi.tsx src/Root.tsx package.json` → `feat(promo/marka): 9:16 sahnesi ve MarkaFilmi916 kompozisyonları`

---

### Task 8: Render betiği, iki sürüm, kapak ve eleştiri (onay kapısı 4 hazırlığı)

**Files:** Modify `promo/scripts/marka-render.ts`

- [ ] **Step 1: `marka-render.ts`** — Bul:
```ts
import { KAPAK_KARE } from "../src/marka/kapak.ts";
```
Değiştir:
```ts
import { KAPAK_916_KARE, KAPAK_KARE } from "../src/marka/kapak.ts";
```
Bul:
```ts
 * her sürüm out/marka/.ham/'a basılır, sesi −16 LUFS'a getirilip out/marka/'ya yazılır. `kapak`, kapak karesini PNG basar.
 * Yeni biçim (örn. 9:16 kesim): BICIMLER'de tek girdiyi `hazir: true` yapıp sürümlerini yazmak yeter.
 */
```
Değiştir:
```ts
 * her sürüm out/marka/.ham/'a basılır, sesi −16 LUFS'a getirilip out/marka/'ya yazılır. `kapak`, iki kapağı (16:9, 9:16) PNG basar.
 */
```
Bul:
```ts
type Bicim = { ad: string; hazir: boolean; hazirlik: string[]; surumler: Surum[] };
```
Değiştir:
```ts
type Bicim = { ad: string; hazirlik: string[]; surumler: Surum[] };
```
Bul:
```ts
    ad: "16:9",
    hazir: true,
```
Değiştir:
```ts
    ad: "16:9",
```
Bul:
```ts
  "916": { ad: "9:16", hazir: false, hazirlik: ["scripts/marka-sfx.ts", "scripts/marka-muzik.ts"], surumler: [] },
};
const KAPAK = { kompozisyon: "MarkaFilmi169", dosya: "ludenlab-marka-kapak.png" };
```
Değiştir:
```ts
  "916": {
    ad: "9:16",
    hazirlik: ["scripts/marka-sfx.ts", "scripts/marka-muzik.ts"],
    surumler: [
      { kompozisyon: "MarkaFilmi916", dosya: "ludenlab-marka-916" },
      { kompozisyon: "MarkaFilmi916Vo", dosya: "ludenlab-marka-916-vo" },
    ],
  },
};
const KAPAKLAR = [
  { kompozisyon: "MarkaFilmi169", dosya: "ludenlab-marka-kapak.png", kare: KAPAK_KARE },
  { kompozisyon: "MarkaFilmi916", dosya: "ludenlab-marka-916-kapak.png", kare: KAPAK_916_KARE },
];
```
Bul:
```ts
  const b = BICIMLER[anahtar];
  if (!b.hazir) {
    console.log(`${b.ad} henüz yok`);
    return;
  }
```
Değiştir:
```ts
  const b = BICIMLER[anahtar];
  console.log(`— ${b.ad} —`);
```
Bul:
```ts
function kapakBas() {
  const cikti = resolve(CIKTI, KAPAK.dosya);
  remotion(["still", "src/index.ts", KAPAK.kompozisyon, cikti, `--frame=${KAPAK_KARE}`, `--timeout=${ZAMAN_ASIMI_MS}`]);
  console.log(`kapak (kare ${KAPAK_KARE}) → ${cikti}`);
}
```
Değiştir:
```ts
function kapakBas() {
  for (const k of KAPAKLAR) {
    const cikti = resolve(CIKTI, k.dosya);
    remotion(["still", "src/index.ts", k.kompozisyon, cikti, `--frame=${k.kare}`, `--timeout=${ZAMAN_ASIMI_MS}`]);
    console.log(`kapak ${k.kompozisyon} (kare ${k.kare}) → ${cikti}`);
  }
}
```

- [ ] **Step 2:** `npm run typecheck && npm test` → `ℹ pass 261`, `ℹ fail 0`.

- [ ] **Step 3: İki sürümü ve kapakları bas** (sfx + müzik üretir; seslendirme mp3'leri hazırdır, TTS çalışmaz):
```bash
npm run marka:render -- 916
npm run marka:render -- kapak
```
Expected: `— 9:16 —`, sonra iki satır: `ludenlab-marka-916: basım ~55 sn … → -16.x LUFS (gerçek tepe ≤ -1.0 dBFS) …` ve `ludenlab-marka-916-vo: …` (prototip: −16,2 / −1,8 dBFS, 5 kodlama; −16,3 / −1,4 dBFS, 1 kodlama); toplam ~2 dk. Kapak: `kapak MarkaFilmi169 (kare 1494)` ve `kapak MarkaFilmi916 (kare 738)`.

- [ ] **Step 4: Eleştiri**
```bash
npm run elestiri -- out/marka/ludenlab-marka-916.mp4
npm run elestiri -- out/marka/ludenlab-marka-916-vo.mp4
```
Expected (her biri): `video: … (30.00 sn, 1080×1920)`, `donuk anlar (≥0,5 sn): yok`, `ses: -16.x LUFS, gerçek tepe ≤ -1.0 dBFS`. Seslendirmesiz sürümün ani ses anlarında ~27,6 sn (çan, 9:16 v47) ve ~29,4 sn (düğme tıkı, v50) bulunur. Föylere Read ile bak:
1. `out/elestiri/ludenlab-marka-916/telefon.png` (360 px): her bölümün başlığı ve cümlesi okunur; Dönüş çipleri, kapanış sloganı ve `ludenlab.com` okunur; sahne çipleri küçük ama seçilir.
2. `kontak.png` (2 kare/sn): akış Kanca → Yük → Dönüş → Studio → Atölye → Çocuk → Kapanış; sıçrama anlarında (13,8 / 16,8 / 18,6 / 21,6 / 25,2 sn) kesme hissi yok.
3. `out/marka/ludenlab-marka-916-kapak.png`: F10 düzeni, üç etiket, "VAKTİN / ÇOCUĞA / KALSIN.", künye; kadraj dışına taşan yok.
4. Seslendirmeli sürümde "Luden Lab." logo belirmeden hemen önce (~28 sn; logo 28,4–28,9 sn) duyuluyor (kulakla ya da ani ses anlarından).
Bir madde tutmazsa DUR ve raporla.

- [ ] **Step 5: Commit** — `git add scripts/marka-render.ts` → `feat(promo/marka): marka:render 9:16 sürümlerini ve 9:16 kapağını basar`

## Onay kapısı 4'e ve sonraya devredilenler (açık riskler)

- **Onay kapısı 4 (kullanıcı):** `out/marka/ludenlab-marka-916.mp4`, `ludenlab-marka-916-vo.mp4`, `ludenlab-marka-916-kapak.png`. Müzikte 9:16 Atölye (Am–F) ve Çocuk (C–Am) değişti; insan kulağıyla ilk kez burada dinlenir.
- **İtme basamağı:** sıçramalarda yalnız kamera itmesi atlar (en büyüğü E: %1,2, tablanın kenarlarında ~10 px, tek karede). Denetleyici kararı gereği bırakıldı. Gerekirse `suz916`'da basamak 18 karede eritilebilir: her sıçrama karesi `j` için `fark = itme(kare169(j)) − itme(kare169(j − 1))`, `itme' = itme − Σ fark·(1 − ara(f, j, j + 18))`; E'nin penceresi (756–774) dönüşüm başlamadan (828) biter, halka hedefi etkilenmez; "eşleme tüketimi" testi itmeyi pencerelerin dışında denetler.
- **Studio seslendirmesi ve ekran:** `studio-916` v22'de "Studio'da hedef sesi seç …" der; ekranda v24'e dek kitle satırı, v25'te "Hedef sesi seç; …" (de19d1a kararı). 1–3 vuruşluk kayma.
- **Küçük yazılar:** sahne bölgesi 0,885 ölçekte: çip yazısı 28 → 24,8 px (360 px telefon föyünde ~8 px). Okunuyor ama küçük; büyütmek istenirse yalnız 9:16'da çip ölçeği (tuval bağlamından) ayrı ele alınır.
- **Çıkışta sola kayma:** metin sütunu öğeleri çıkarken (16:9'daki gibi) sanal tuvalin sol ortasına doğru %10 küçülür; son karelerinde (opaklık < 0,1, bulanık) x ≈ 49'a iner. Kritik yazı değil.
- **Kapak seçimi:** 9:16 kapak v42 (kare 738) önerisi; istenirse kapanış kartı (kare ≥ 882) seçilir (`KAPAK_916_KARE`).
- **Efekt izi 31,4 sn:** `sfx-916.wav` çanın kuyruğuyla 30 sn'yi aşar; kompozisyon 900 karede keser.
- **Açık risk (3C'den):** maske, `Hap`/`Dugme` bulanıklığı ve iki bölgenin CSS dönüşümleri Chrome'a bağlı; başka bir render motorunda piksel denetimleri yeniden koşulmalı.
