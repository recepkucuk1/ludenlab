# LudenLab Marka Filmi · Plan 3C: Çocuk (v73–88) ve Kapanış (v89–100)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Filmin 0:43,2–1:00 aralığını kurmak: tabla son çeyreği döner (−360°), kamera genel plana döner, iki modül yığını üst kâğıtlarını bırakıp ince dosyalar olarak bloğun iki yanına kayar; "VAKTİN ÇOCUĞA KALSIN." ve açılışın üç hedef etiketi (modül renkleriyle) gelir (storyboard F10). Sonra bloğun etrafında turuncu bir yörünge çizilir, ikinci yörünge dikilir, tabla bulanıklaşıp çekilir; "HER ŞEY ÇOCUĞUN ETRAFINDA."; iki halka resmî LudenLab işaretine oturur, blok kesişime akar, logo kilidi, slogan, Studio/Atölye hapları ve basılan `ludenlab.com` düğmesi gelir.

**Architecture:** Plan 3B'nin `moduller.ts`'i gibi yeni saf bir katman (`cocukKapanis.ts`) v73–100'ün eklediği her şeyi üretir: ince yığınlar (`cocukYiginlari`), etiketler, başlıklar, yörünge koşuları, bloğun 2B izi, arka planın çekilmesi, künyenin çıkışı ve kapanış kartı (`cocukKapanisKatmani`). Yörüngelerin saf geometrisi (3B çember, izdüşüm elipsi, ön/arka koşuları, elipsten elipse 2B dönüşüm) ayrı dosyadadır (`yorunge.ts`). `filmDurumu.ts` kamera/tabla/itme izlerini uzatır ve katmanı birleştirir; `FilmSahnesi.tsx` kapanışta tabla ile yığınları ayrı, bulanıklaşan bir SVG katmanına ayırır, blok ve yörüngeler üstteki katmanda kalır.

**Tech Stack:** Remotion 4.0.484 (`interpolate`, `Easing`, `Img`, `staticFile`), React 19, TypeScript (`node --test`, Node 24 tip ayıklama), sistem ffmpeg, Python 3 + PIL (yalnız kare karşılaştırması).

**Spec:** `docs/superpowers/specs/2026-09-28-ludenlab-marka-filmi-design.md` ("Konsept", "5 · Çocuk", "6 · Kapanış", "Görsel dil", "Ses", "İçerik kuralları")
**Önceki:** Plan 3B (f6c15f0) + cila (b844832: üst kâğıt ↔ kart çapraz geçişi, `Kagit.opaklik`, `CIP`) + müzik/seslendirme/render (f59556a, 8eb57eb, a695566: `MarkaFilmi169 { vo }`, `npm run marka:render`). 9:16 zaman eşlemesi (8089113). **Başlangıç: 211 test (8089113).**
**Prototip:** Bu plandaki kod blokları 8089113'ün temiz bir kopyasına görev görev, mekanik olarak uygulandı: her görevin sonunda beklenen test sayısı (218 → 225 → 225 → 229 → 237 → 243; 9:16 eşleme testleri dahil) ve `tsc` temiz. v73–100 ve tam film (`npm run marka:render -- 169`: iki sürüm 121 + 133 sn, −16,3 / −16,1 LUFS, gerçek tepe −1,4 / −1,1 dBFS) basıldı; eleştiri föylerinde donuk an yok; v1–72'den seçilen kareler (500, 1000, 1290) ve stil karesi piksel piksel aynı. Aşağıdaki sayılar o denemelerde ölçüldü; uygulayıcı render'a bakıp ince ayar yapabilir.

## Tasarım kararları (bu plan)

- **Tabla ve kamera (v73):** tabla −270° → −360°, kamera (s 130, ox 1626, oy 640) → `GENEL_KAMERA` (100, 1340, 560); ikisi de 36 kare `Easing.inOut(Easing.sin)` (önceki dönüşler gibi). Odak dışı soluklaştırma (blok ve Studio yığını %30) aynı 36 karede kalkar. Tabla dönüşünde ses: `donus` (2 vuruş), öbür üç dönüş gibi.
- **İnce yığınlar:** her yığının alttaki 3 kâğıdı kalır (`modulYigini(m, 3)`: aynı tohum, önek-kararlı, üst kâğıtta sekme ve yazı). Üsttekiler tepeden başlayarak 3 kare arayla kalkar: 14 karede 0,6 birim yükselip söner (`Easing.out(cubic)` yükselme, `Easing.in(quad)` sönme). Başlangıç kâğıtları `filmDurumu(K73 − 1)`'in çizdiği listedir; böylece v72 → v73 tek karede aynıdır (test). **Atölye'nin kartına dönüşmüş üst kâğıdı geri gelmez** (b844832'deki "kart giderken kâğıt geri belirir" Atölye için Çocuk'un incelmesine bırakılır; o testin Atölye dönüş denetimi Studio'ya sınırlanır, Task 6).
- **Kayma:** yığınlar tabla koordinatında `MODUL_YERI` → F10 yerleri `COCUK_YIGIN_YERI` = Studio (−1,6; 1,5), Atölye (1,5; −1,6) (StilKaresi'ndekiyle aynı; −360° ≡ 0°). x bileşeni `Easing.out(cubic)` (önce bloktan uzağa açılır), y bileşeni `inOut(sin)`. **Ölçüm:** düz yolda bir kâğıt köşesi bloğun köşesine 0,089 birime iniyordu; bu eğriyle en küçük ayırıcı-eksen boşluğu 0,170 (test ≥ 0,15).
- **Başlıklar:** "VAKTİN / ÇOCUĞA / KALSIN." satırları v74, v75, v76'da **açılmaya başlar** (10 kare maske), v88'de çıkar. Denetleyicinin önerisi "maske vuruşta biter"di; **ölçüm:** ilk satır o zaman K73 + 8'de başlıyor ve aynı sütunda K73 + 12'ye dek çıkan "02 ATÖLYE" kilidinin üstüne biniyordu (prototip karesi 1305: "VA" + bulanık "ATÖLYE"). Vuruşta başlamak aradaki 6 karelik boşluğu verir ve seslendirme ipucunun anlamıyla aynıdır (`cocuk-1` v74'te başlar). "HER ŞEY / ÇOCUĞUN / ETRAFINDA." v89–91'de başlar, v93'te çıkar (Çocuk başlığı K88 + 12'de gitmiş olur).
- **Hedef etiketleri (v77–79):** `HEDEF_YERLESIMI` ve açılışın zamanlaması (çip 18 karede netleşir, çizgi son 10 karede vuruşa varır); nokta rengi `RENK[HEDEFLER[i].modul]`; v85'te 12 karede çıkar. Ses: `tik`, `perde: 0.8` (yumuşak, pes).
- **İtme:** v73'te 1,03 → K73 + 36'da 1,01 (inOut cubic) → K85 + 12'de 0,97 (doğrusal) → K93'te 1,0 → son karede 1,02. Çocuk'ta kadraj **geri çekilir** (spec "Kamera geri çekilir"). **Ölçüm:** stil karesinde "sıra beklemek" çipinin sağ kenarı x = 1792; blok odağı etrafında 1,0177'yi aşan her itme onu 1800 px payının dışına taşır. Doğrusal parçalarda hız hiç sıfırlanmaz (≥ 0,00014/kare): v80–84'te sahnede yalnız itme ve zemin hareket ederken eleştiri föyünde donuk an çıkmadı. v82 karesinin itmesi 0,984: F10 ile karıştırıldığında yalnız kenarlarda ~1,6'lık çift çizgi görülür.
- **Yörünge A (yatay):** bloğun ortasından (0, 0, 0,5) geçen, **r = 1,2** çember; izdüşümü 147 × 85 px (a × b, s 100). Sol uçtan (θ = 3π/4, ön/arka sınırı) tabla dönüşü yönünde (θ azalarak) çizilir: önce önden geçer; v85 → v90, `inOut(sin)` (tabla dönüşünün eğrisi; vuruşta yumuşak biter). Denetleyicinin aralığı 1,25–1,4'tü; **ölçüm:** r = 1,3'te arka yay bloğun üst köşesine ancak ±15 px girer ("arkadan geçiyor" okunmaz), r = 1,4'te halka Studio yığınına 4 px kalır; r = 1,2'de arka yay ±33 px gizlenir, iki yığına ≥ 22 px boşluk kalır.
- **Yörünge B (dikey):** A'nın tabla düzlemindeki menteşe ekseni etrafında kalkmış hâli; eksen x'ten **58,71°**, son eğim **80,48°** (`dikeyEgim`). Bu ikisi, izdüşümün tam dikey olması ve kısa/uzun oranının işaretin dikey yörüngesinin oranına (0,2863) eşit olması koşulundan çözülür (türetme `yorunge.ts`'te). v90'da A ile çakışık doğar, v92'ye dek `inOut(cubic)` ile kalkar; tabla bu sırada gitmiş olur (B'nin alt yayı z < 0'a K90 + 15'ten sonra iner, tabla opaklığı o anda 0,02).
- **Kılıf (sapma):** halkalar turuncu dolgu (8 px) + iki yanda `CIZGI.ince` ink kılıftır. **Ölçüm:** B'nin izdüşümü ±42 px, blok ±87 px genişlikte: B'nin ön yayı bloğun ön yüzlerinin önünden geçer; turuncu (#fe703a) halka bloğun +y yüzünün (#fe703a) önünde görünmezdi. Kılıf dönüşüm sırasında (v93 + 18 kare) söner; işarete sade turuncu olarak oturur.
- **Ön/arka koşuları (sapma):** her halka 128 parçadır, ama parçalar ayrı `DerinlikSirali` öğeleri değil, bloğa göre **ön** ve **arka** iki koşuda birleşir (her koşu tek yol; sıralama anahtarı ±1, blok 0). Ayrı parçalar kılıflı çizimde her ekte ink çizgisi bırakırdı. Sınıflama kesindir: sınıf, orta noktanın görüş ekseni (1,1,1) boyunca merkezden uzaklığının işaretidir; r ≥ 1,2'de blok siluetine düşen her halka noktası küpün tümüyle önünde ya da arkasındadır (küp 0,866'lık kürenin içinde; ayrıntı `onde` belgesinde). Ön/arka sınırı hep elipsin uzun ekseninin ucundadır; orada parça 2 px'e iner, bu yüzden ön koşunun dolgusu komşu koşuya **uzunlukça** (dolgu + 2 × kılıf = 12,4 px) taşar ve ekteki kılıf ucunu örter (prototipte parça sayısıyla taşma ekte ince bir çizgi bırakıyordu).
- **Logo kilidi:** resmî `public/brand/ludenlab-logo.svg` (viewBox 611 × 260), sol üst (580, 250), genişlik 760 (k = 1,2439 px/birim; yükseklik 323). İşaret logo biriminde x 411,2–591,5, y 19,6–204,0 → ekranda x 1091,5–1315,8, y 274,4–503,8 (224 × 229 px). İşaretin iki yörüngesi, SVG yolunun bant ortasına uydurulan elipsler (logo birimi): **geniş** merkez (498,3; 139,8), 87,17 × 25,07, −13,44°; **dikey** merkez (463,76; 108,77), 87,03 × 24,92, 89,33°. İkisi aynı elips, ~103° dönük. Ortak iç bölgenin ağırlık merkezi (**kesişim**) (465,7; 145,8); ortalama bant kalınlığı 8,6 birim (10,7 px). Test, bu elipslerin resmî yoldaki çokgenin içinde kaldığını denetler.
- **Dönüşüm (v93 → v95, 36 kare, `inOut(cubic)`):** işaretin yörüngeleri **eşmerkezli değildir** (merkezler 43/39 px ayrık): tek bir grup dönüşümü ikisini birden oturtamaz. Her halka kendi elipsinden hedef elipse 2B dönüşümle gider (merkez, yarı eksenler ve açı doğrusal; hedef itme hesaba katılarak kamera kapsayıcısına çevrilir); v95'te halka noktaları hedef elipslerin tam üstündedir (test ±1e−6). Dolgu 8 px → 10,7 px. Blok aynı `u` ile kesişime taşınır ve `K93 → K95 − 6` arasında ölçeği 0'a iner. Halkalar `K94 + 10 → K95 + 2` arasında söner; logo kilidi `K94 + 6 → K95 + 4` arasında bulanıktan netleşir (seslendirme "Luden Lab" v94'te başlar). Ses: yeni `can` (C6 üstünde yumuşak çan, 2,4 sn) v93'te; müziğin son akoru da v93'te (muzikPlani `SON_AKOR`).
- **Arka plan (v89–91):** tabla, yuva ve yığınlar ayrı SVG katmanında 36 karede bulanıklaşır (0 → 20 px), söner ve odak etrafında 0,9'a küçülür (rehberin çıkışı). Blok ve yörüngeler üst katmanda kalır. Ayrılık yalnız `durum.arka` varken (f ≥ K89); ayrılma karesinde (bulanıklık 0) hiçbir yığın bloğun ya da yörüngenin ekran kutusuna girmez (test K85–K93): sıra değişikliği görünmez.
- **Künye:** v92 → v93 arasında bulanıklaşarak gider (büyük logo kilidi gelmeden küçük logo iki kez görünmesin).
- **Kapanış kartı:** slogan `METIN.kapanis.ekran[0]` Satoshi 600, 44 px, ink %85, ortalı, üstü 613 (v95'te maske). Çağrı satırı üstü 710, ortalı: `Studio` (mavi nokta) ve `Atölye` (sarı nokta) hapları (`Cip` ile aynı görünüm) + `ludenlab.com` düğmesi (turuncu yüz, 3 px ink kenar, 8 px blursuz ofset gölge, Satoshi 700 32 px ink yazı, yükseklik 68, köşe 16). Haplar ve düğme soldan sağa 2 kare arayla 15 karede netleşir; düğme v96 − 2'de tam görünür, v96'da 3 karede basılır (yüz gölgeye iner), 6 karede yarıya yaylanarak (`Easing.out(Easing.back(1.7))`) geri çıkar. Ses: `tik` v96. Kart (logo, slogan, satır) v95'ten son kareye dek ekran ortası etrafında 1 → 1,03 iter (≥ 0,00028/kare): v97–100'de donuk an yok. İçerik 274 → 786 px arasında, dikeyde ortada.
- **İçerik:** yeni ekran yazısı yok; hepsi `METIN.cocuk`/`METIN.kapanis`, `HEDEFLER` (mevcut metin testi tarar).

## Zaman çizelgesi (kare = (v − 1) × 18)

| Kare | Vuruş | Olay |
|---|---|---|
| 1296–1332 | v73–74 | tabla −360°, kamera genel plana, soluklaştırma kalkar; kâğıtlar 1296–1322 kalkar; Atölye yazıları/kartı/damgası 1296–1308 çıkar (3B) |
| 1314 / 1332 / 1350 | v74 / 75 / 76 | "VAKTİN" / "ÇOCUĞA" / "KALSIN." açılır (10 kare) |
| 1368 / 1386 / 1404 | v77 / 78 / 79 | hedef etiketleri varır (pes tık) |
| 1512 | v85 | etiketler çıkar; yörünge A çizilmeye başlar; whoosh (4 vuruş) |
| 1566 | v88 | Çocuk başlığı çıkar |
| 1584–1620 | v89–91 | arka plan çekilir; Kapanış başlığı 1584/1602/1620 |
| 1602 | v90 | A kapanır; B kalkmaya başlar (→ 1638) |
| 1638–1656 | v92 | künye gider |
| 1656–1692 | v93–94 | dönüşüm; blok kesişime akar (→ 1686); başlık çıkar; çan |
| 1680–1696 | v94 | logo kilidi netleşir; halkalar 1684–1694 söner |
| 1692 | v95 | slogan; haplar ve düğme 1689–1708 |
| 1710 | v96 | düğme basılır; tık |
| 1692–1799 | v95–100 | kapanış kartı 1 → 1,03 iter |

## Kurallar (tüm görevler)

- Çalışma dizini: `/Users/recepkucuk/ludenlab/.claude/worktrees/ludenlab-marka-filmi/promo` (dal `claude/ludenlab-marka-filmi`). Ana checkout'a dokunma. Push yok.
- **Dal paylaşımlı:** başka ajanlar aynı dala commit atıyor. Her görevin başında `git log --oneline -3 && git status --short`; commit'e yalnız o görevin dosyalarını ekle (`git add <yollar>`, asla `-A`). Bir "Bul" bloğu dosyada birebir yoksa (dosya bu plandan sonra değişmiş) DUR: değişikliği oku, aynı anlamı yeni metne uygula, raporla.
- **9:16 zaman eşlemesi** başka bir ajanın işidir (`src/marka/zamanEslemesi.ts`, `scripts/marka-sfx.ts`, `src/marka/seslendirme.ts`): bu plan o dosyalara dokunmaz. `olaylar.ts`'e yalnız `COCUK`/`KAPANIS` ve `SESLER_169` girdileri, `scripts/lib/sfx.ts`'e yalnız `can` sesi eklenir; `tests/marka-seslendirme.test.ts`'e yalnız sona bir test eklenir. `SESLER_169`'dan 9:16 olay listesi türetiliyorsa yeni olaylar oraya da yansır; onun testleri kırılırsa DUR ve raporla.
- `src/marka/` içi göreli içe aktarmalar uzantılı; yalnız silinebilir TS sözdizimi (enum, namespace, parametre özelliği yok). macOS büyük/küçük harf duyarsız: yeni dosya adları (`yorunge.ts`, `cocukKapanis.ts`) başka bir dosyayla yalnız harf büyüklüğünde ayrışmasın (`Yorunge` bileşeni `sahne3b.tsx` içindedir, ayrı dosya değildir).
- Node testleri `remotion`'dan `interpolate`/`Easing` içe aktarabilir; `.tsx` node testine girmez.
- Ücretli betik çalıştırma (`npm run tts`, `npm run marka:tts` YASAK). `marka:sfx`, `marka:muzik`, `marka:render` ücretsiz ve yereldir. Anahtar/env değeri yazdırma.
- Render'da hep `--timeout=120000` (font yükleyicisi takılmasın). Kayan nokta karşılaştırmaları yaklaşık.
- Commit: Türkçe; son satır ajanın kendi sistem hatırlatmasındaki `Co-Authored-By` satırı. Push yok.
- Test sayıları (8089113 üstünde): 211 → T1 218 → T2 225 → T3 225 → T4 229 → T5 237 → T6–T8 243 (dal bu arada büyüdüyse sayılar artar; kapı her zaman `ℹ fail 0`).

## Dosya haritası

| Dosya | Durum | Sorumluluk |
|---|---|---|
| `src/marka/olaylar.ts` | değişir | `COCUK`, `KAPANIS`; `can` sesi; v73–96 ses olayları |
| `scripts/lib/sfx.ts` | değişir | `can` sesi (çan) |
| `src/marka/AcilisFoyu.tsx` | değişir | yalnız `SES_ADI` (tip tamlığı) |
| `src/marka/yorunge.ts` | yeni | yörünge geometrisi, işaret ölçüleri (saf) |
| `src/marka/yerlesim.ts` | değişir | `COCUK_YIGIN_YERI`, `KAPANIS_YERI` |
| `src/marka/tema.ts` | değişir | `LOGO_VIEWBOX`, `DUGME` |
| `src/marka/durumTipleri.ts` | değişir | `YorungeCizimi`, `BlokIzi`, `ArkaCekilme`, `KapanisDurumu` |
| `src/marka/StilKaresi.tsx` | değişir | yığın yerlerini `COCUK_YIGIN_YERI`'nden okur (piksel aynı) |
| `src/marka/cocukKapanis.ts` | yeni | Çocuk + Kapanış katmanı (saf) |
| `src/marka/filmDurumu.ts` | değişir | kamera/tabla/itme izleri, katman birleştirme, ince yığınlar |
| `src/marka/sahne3b.tsx` | değişir | `SahneOgesi.d`, `Yorunge` |
| `src/marka/yazi.tsx` | değişir | `MetinBlogu.ortala`, `Hap` (Cip'ten ayrılır), `LogoKilidi`, `Dugme`, `CagriSatiri` |
| `src/marka/FilmSahnesi.tsx` | değişir | iki katmanlı kapanış, yörüngeler, blok izi, kapanış kartı, künye çıkışı |
| `tests/marka-olaylar.test.ts`, `tests/sfx.test.ts`, `tests/marka-seslendirme.test.ts` | değişir | olay/ses/VO eşleşmesi |
| `tests/marka-yorunge.test.ts` | yeni | geometri + resmî işarete karşı ölçüm |
| `tests/marka-cocuk-kapanis.test.ts` | yeni | katman testleri |
| `tests/marka-film.test.ts` | değişir | birleşim, süreklilik, F10 denkliği, çip sınırları, katman ayrılığı |

---

### Task 1: Çocuk ve Kapanış olayları, çan sesi

**Files:** Modify `promo/src/marka/olaylar.ts`, `promo/scripts/lib/sfx.ts`, `promo/src/marka/AcilisFoyu.tsx`, `promo/tests/marka-olaylar.test.ts`, `promo/tests/sfx.test.ts`, `promo/tests/marka-seslendirme.test.ts`

Bu görev tek commit'tir (yeni ses türünü sfx'e öğretmeden `never` denetimi tip hatası verir).

- [ ] **Step 0: Referans kareler (sonraki görevlerin piksel denetimi için, kodu değiştirmeden önce)**
```bash
npm run marka:stil && cp out/marka/stil-karesi.png out/marka/ref-3c-stil.png
for f in 500 1000 1290; do npx remotion still src/index.ts MarkaFilmi169 out/marka/ref-3c-$f.png --frame=$f --timeout=120000; done
ls out/marka/ref-3c-*.png
```
Expected: dört PNG (`ref-3c-stil.png`, `ref-3c-500.png`, `ref-3c-1000.png`, `ref-3c-1290.png`).

- [ ] **Step 1: Testleri ekle**

`tests/marka-olaylar.test.ts` — içe aktarmayı değiştir:
```ts
import { ATOLYE, COCUK, DONUS, KANCA, KAPANIS, SESLER_169, STUDIO, YUK } from "../src/marka/olaylar.ts";
```
dosya sonuna:
```ts
test("çocuk: v73'te tabla sesi, etiketlerde yumuşak (pes) tık, v85'te v89'a dek yükselen whoosh", () => {
  const b = (s: { vurus: number }) => s.vurus >= 73 && s.vurus <= 88;
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "donus" && b(s)).map((s) => [s.vurus, s.vurusSure]), [[COCUK.tabla, 2]]);
  const tik = SESLER_169.filter((s) => s.tur === "tik" && b(s));
  assert.deepEqual(tik.map((s) => s.vurus), [...COCUK.etiketler]);
  assert.ok(tik.every((s) => (s.perde ?? 1) < 1), "Çocuk tıkları temel perdeden pes");
  const w = SESLER_169.filter((s) => s.tur === "whoosh" && b(s));
  assert.deepEqual(w.map((s) => s.vurus), [COCUK.yorunge]);
  assert.equal(w[0].vurus + (w[0].vurusSure ?? 0), KAPANIS.cekilme);
});

test("kapanış: dönüşümde çan, düğmede tık; başka ses yok", () => {
  const b = (s: { vurus: number }) => s.vurus >= 89;
  assert.deepEqual(SESLER_169.filter(b).map((s) => [s.vurus, s.tur]), [[KAPANIS.donusum, "can"], [KAPANIS.dugme, "tik"]]);
});

test("çocuk ve kapanış vuruşları kendi bölümlerinde", () => {
  const b = (id: string) => BOLUMLER_169.find((x) => x.id === id)!;
  for (const v of [COCUK.tabla, ...COCUK.baslik, ...COCUK.etiketler, COCUK.yorunge, COCUK.baslikCikis]) assert.ok(v >= b("cocuk").ilk && v <= b("cocuk").son, `çocuk ${v}`);
  const k = [KAPANIS.cekilme, ...KAPANIS.baslik, KAPANIS.dikey, KAPANIS.kunye, KAPANIS.donusum, KAPANIS.logo, KAPANIS.slogan, KAPANIS.dugme];
  for (const v of k) assert.ok(v >= b("kapanis").ilk && v <= b("kapanis").son, `kapanış ${v}`);
  assert.equal(COCUK.baslik.length, METIN.cocuk.baslik.length);
  assert.equal(KAPANIS.baslik.length, METIN.kapanis.baslik.length);
  assert.equal(COCUK.etiketler.length, HEDEFLER.length);
});
```
`tests/sfx.test.ts` sonuna:
```ts
// Belirli pencerede sıfır geçişi sayısı (perde karşılaştırması).
const gecisSayisi = (t0: number, a = 0.004, b = 0.024) => {
  const i0 = Math.round((t0 + a) * ORNEKLEME), i1 = Math.round((t0 + b) * ORNEKLEME);
  let n = 0;
  for (let i = i0 + 1; i < i1; i++) if (Math.sign(iz[i]) !== Math.sign(iz[i - 1])) n++;
  return n;
};

test("Çocuk etiket tıkları Kanca tıkından pes (yumuşak tık)", () => {
  const kanca = gecisSayisi(saniye(5));
  for (const s of SESLER_169.filter((s) => s.tur === "tik" && (s.perde ?? 1) < 1)) {
    assert.ok(gecisSayisi(saniye(s.vurus)) < kanca, `v${s.vurus}: ${gecisSayisi(saniye(s.vurus))} ≥ ${kanca}`);
  }
});

test("kapanış whoosh'u yükselir ve v89'da susar", () => {
  const s = SESLER_169.filter((s) => s.tur === "whoosh").at(-1)!;
  const t0 = saniye(s.vurus), t1 = saniye(s.vurus + (s.vurusSure ?? 1));
  assert.ok(rms(t1 - 0.2, t1 - 0.03) > 3 * rms(t0, t0 + 0.3), "yükselmiyor");
  assert.ok(rms(t1 + 0.05, t1 + 0.3) < 0.1 * rms(t1 - 0.2, t1 - 0.03), "doruktan sonra susmuyor");
});

test("çan vuruşunda başlar, öncesi sessiz, bir saniye sonra hâlâ çınlar", () => {
  const t0 = saniye(SESLER_169.find((s) => s.tur === "can")!.vurus);
  const bas = rms(t0 + 0.01, t0 + 0.1);
  assert.ok(bas > 10 * rms(t0 - 0.3, t0 - 0.02), "öncesi sessiz değil");
  const sonra = rms(t0 + 1.0, t0 + 1.1);
  assert.ok(sonra > 0.15 * bas && sonra < bas, `${sonra} / ${bas}`);
});
```
`tests/marka-seslendirme.test.ts` — içe aktarmayı değiştir:
```ts
import { ATOLYE, COCUK, DONUS, KAPANIS, STUDIO, YUK } from "../src/marka/olaylar.ts";
```
dosya sonuna:
```ts
test("Çocuk ve Kapanış cümleleri ekrandaki karşılıklarıyla aynı vuruşta", () => {
  const vurus = (id: string) => VO_IPUCLARI.find((i) => i.id === id)!.vurus169;
  assert.equal(vurus("cocuk-1"), COCUK.baslik[0]);
  assert.equal(vurus("kapanis-1"), KAPANIS.baslik[0]);
  assert.equal(vurus("kapanis-2"), KAPANIS.logo);
});
```
Run: `node --test tests/marka-olaylar.test.ts` → FAIL (`COCUK` dışa aktarılmıyor / undefined).

- [ ] **Step 2: `olaylar.ts`**

Bul:
```ts
export type SesTuru = "whoosh" | "tok" | "tik" | "kagit" | "donus" | "sayfa";
```
Değiştir:
```ts
export type SesTuru = "whoosh" | "tok" | "tik" | "kagit" | "donus" | "sayfa" | "can";
```
`const olaylar: SesOlayi[] = [` satırının hemen üstüne ekle:
```ts
/** Çocuk (v73–88, spec "5 · Çocuk"). */
export const COCUK = {
  /** Tabla son çeyreği döner (−360°), kamera genel plana; modül yığınları incelip kenara kayar. */
  tabla: 73,
  /** "VAKTİN / ÇOCUĞA / KALSIN." satırları bu vuruşlarda açılmaya başlar. */
  baslik: [74, 75, 76],
  /** Açılışın üç hedef etiketi modül renkleriyle raptiyeye varır (yumuşak tık). */
  etiketler: [77, 78, 79],
  /** Etiketler çıkar, yatay yörünge çizilmeye başlar (Çocuk'un son ölçüsü); yükselen whoosh. */
  yorunge: 85,
  /** Başlık çıkar. */
  baslikCikis: 88,
} as const;

/** Kapanış (v89–100, spec "6 · Kapanış"). */
export const KAPANIS = {
  /** Tabla ve yığınlar bulanıklaşarak çekilir (2 vuruş); whoosh doruğa varır. */
  cekilme: 89,
  /** "HER ŞEY / ÇOCUĞUN / ETRAFINDA." satırları bu vuruşlarda açılmaya başlar. */
  baslik: [89, 90, 91],
  /** Yatay yörünge tamamlanır; dikey yörünge yükselir (2 vuruş). */
  dikey: 90,
  /** Künye gider (logo iki kez görünmesin). */
  kunye: 92,
  /** Halkalar işarete dönüşür (2 vuruş), blok kesişime akar; çan. Başlık çıkar. */
  donusum: 93,
  /** Logo kilidi oturur (seslendirme "Luden Lab"). */
  logo: 94,
  /** Slogan, çipler ve ludenlab.com düğmesi. */
  slogan: 95,
  /** Düğme basılır; tık. */
  dugme: 96,
} as const;

```
`olaylar` dizisinin son satırından (`...ATOLYE.kartEtiketleri.map((vurus): SesOlayi => ({ vurus, tur: "tik" })),`) sonra, kapanan `];`'den önce ekle:
```ts
  { vurus: COCUK.tabla, tur: "donus", vurusSure: 2 },
  ...COCUK.etiketler.map((vurus): SesOlayi => ({ vurus, tur: "tik", perde: 0.8 })),
  { vurus: COCUK.yorunge, tur: "whoosh", vurusSure: KAPANIS.cekilme - COCUK.yorunge },
  { vurus: KAPANIS.donusum, tur: "can" },
  { vurus: KAPANIS.dugme, tur: "tik" },
```

- [ ] **Step 3: `scripts/lib/sfx.ts`**

`export const ORNEKLEME = 44100;` satırından sonra ekle:
```ts
/** Çanın kısmi sesleri: [temel frekansa oran, genlik, sönüm (1/sn)]. */
const CAN_KISMI: readonly [number, number, number][] = [
  [1, 0.34, 1.3],
  [2.01, 0.14, 2.6],
  [2.76, 0.07, 3.8],
  [4.07, 0.035, 6],
];
```
`for (const s of olaylar) {` satırının hemen üstüne ekle:
```ts
  // Çan (logo oturur): C6 üstünde yumuşak, uyumsuz kısmi sesli çınlama; son akorla (C) uyumlu, 2,4 sn söner.
  const can = () =>
    uret(2.4, (t) => {
      const atak = Math.min(1, t / 0.005);
      let s = 0;
      for (const [oran, genlik, sonum] of CAN_KISMI) s += genlik * Math.sin(2 * Math.PI * 1046.5 * oran * t) * Math.exp(-t * sonum);
      return atak * s;
    });

```
`switch`'te `case "sayfa": … break;`'ten sonra, `default`'tan önce ekle:
```ts
      case "can":
        ekle(t0, can());
        break;
```

- [ ] **Step 4: `AcilisFoyu.tsx`** — `SES_ADI` satırını değiştir:
```ts
const SES_ADI: Record<SesTuru, string> = { whoosh: "whoosh", tok: "tok", tik: "tık", kagit: "kâğıt", donus: "dönüş", sayfa: "sayfa", can: "çan" };
```

- [ ] **Step 5: Doğrula**

Run: `npm test && npm run typecheck`
Expected: `ℹ pass 218`, `ℹ fail 0`, tsc çıktısız. "tok inişte güçlü bir darbe" kırılırsa DUR (çanın tepesi ≤ 0,59, tok'unki ~1,34 olmalı), değerleri raporla.
Run: `npm run marka:sfx`
Expected: `… sfx-169.wav yazıldı (48 olay, 100 BPM, 59.0 sn)` ve `… sfx-916.wav yazıldı (36 olay, …)` (9:16 izi `sesler916(SESLER_169)`'dan türer; yeni olaylar oraya kendiliğinden geçer).

- [ ] **Step 6: Commit**
```bash
git add src/marka/olaylar.ts scripts/lib/sfx.ts src/marka/AcilisFoyu.tsx tests/marka-olaylar.test.ts tests/sfx.test.ts tests/marka-seslendirme.test.ts
git commit -m "feat(promo/marka): Çocuk ve Kapanış olayları, çan sesi, pes tık

Co-Authored-By: <sistem hatırlatmandaki satır>"
```

---

### Task 2: Yörünge geometrisi (`yorunge.ts`)

**Files:** Create `promo/src/marka/yorunge.ts`; Test `promo/tests/marka-yorunge.test.ts`

- [ ] **Step 1: Başarısız testi yaz** — `tests/marka-yorunge.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { izd, type V2 } from "../src/marka/izometri.ts";
import { GENEL_KAMERA } from "../src/marka/yerlesim.ts";
import {
  ISARET,
  YORUNGE,
  dikeyEgim,
  elipsDonusumu,
  elipsYaricapi,
  halkaA,
  halkaAElipsi,
  halkaANoktalari,
  halkaBElipsi,
  halkaBNoktalari,
  kosular,
  onde,
} from "../src/marka/yorunge.ts";

const K = { ...GENEL_KAMERA, don: -2 * Math.PI };
const yakin = (a: number, b: number, pay = 1e-6) => Math.abs(a - b) <= pay;

test("A'nın izdüşümü yatay elips: yarı eksenler 1,2247·r·s ve 0,7071·r·s", () => {
  const e = halkaAElipsi(K);
  const [cx, cy] = izd(YORUNGE.merkez, K);
  assert.ok(yakin(e.cx, cx) && yakin(e.cy, cy));
  assert.ok(yakin(e.a, Math.sqrt(1.5) * YORUNGE.r * K.s, 1e-6), `${e.a}`);
  assert.ok(yakin(e.b, Math.SQRT1_2 * YORUNGE.r * K.s, 1e-6), `${e.b}`);
  assert.ok(yakin(Math.sin(e.aci), 0, 1e-9), `${e.aci}`);
});

test("B son eğimde dikey ve işaretin dikey yörüngesiyle aynı kısa/uzun oranında (≈ 80,5°, eksen ≈ 58,7°)", () => {
  assert.ok(yakin((YORUNGE.egim * 180) / Math.PI, 80.48, 0.02), `${(YORUNGE.egim * 180) / Math.PI}`);
  assert.ok(yakin((YORUNGE.eksen * 180) / Math.PI, 58.71, 0.02), `${(YORUNGE.eksen * 180) / Math.PI}`);
  const e = halkaBElipsi(YORUNGE.egim, K);
  assert.ok(yakin(Math.abs(Math.cos(e.aci)), 0, 1e-9), `açı ${(e.aci * 180) / Math.PI}`);
  assert.ok(yakin(e.b / e.a, ISARET.dikey.b / ISARET.dikey.a, 1e-9), `${e.b / e.a}`);
  // Uzun eksen A'nınkine eşit: bir çemberin izdüşümünde uzun eksen hep çaptır.
  assert.ok(yakin(e.a, halkaAElipsi(K).a, 1e-9));
  // Başka bir oran için de: türetme genel.
  const d = dikeyEgim(0.5);
  const n = [Math.sin(d.eksen) * Math.sin(d.egim), -Math.cos(d.eksen) * Math.sin(d.egim), Math.cos(d.egim)];
  assert.ok(yakin(-n[0] - n[1] + 2 * n[2], 0, 1e-12));
  assert.ok(yakin((n[0] + n[1] + n[2]) / Math.sqrt(3), 0.5, 1e-12));
});

test("B'nin noktaları kendi izdüşüm elipsinin üstünde; eğim 0'da A ile çakışır", () => {
  for (const egim of [0, 0.4, YORUNGE.egim]) {
    const e = halkaBElipsi(egim, K);
    for (const p of halkaBNoktalari(egim)) assert.ok(yakin(elipsYaricapi(e, izd(p, K)), 1, 1e-9));
  }
  const a = halkaAElipsi(K);
  for (const p of halkaBNoktalari(0)) assert.ok(yakin(elipsYaricapi(a, izd(p, K)), 1, 1e-9));
});

test("A, sol uçtan (ön/arka sınırı) tabla dönüşü yönünde çizilir: önce önden geçer", () => {
  assert.deepEqual(halkaANoktalari(0), []);
  const ps = halkaANoktalari(0.25);
  assert.equal(ps.length, YORUNGE.parca / 4 + 1);
  const [x0] = izd(ps[0], K);
  assert.ok(x0 < izd(YORUNGE.merkez, K)[0] - 140, "sol uçtan başlamıyor");
  assert.ok(onde(ps[1]) && onde(ps[ps.length - 2]), "ilk çeyrek bloğun önünde değil");
  const tam = halkaANoktalari(1);
  assert.equal(tam.length, YORUNGE.parca + 1);
  assert.ok(tam[0].every((v, i) => yakin(v, tam[tam.length - 1][i], 1e-9)), "tam halka kapanmıyor");
  // Kısmi oran: son nokta tam açıda.
  const k = halkaANoktalari(0.3);
  const son = halkaA(YORUNGE.basAci - 2 * Math.PI * 0.3);
  assert.ok(k[k.length - 1].every((v, i) => yakin(v, son[i], 1e-12)));
});

test("koşular: tam halka bir ön bir arka koşu; sınırlar elipsin uzun ekseninin uçlarında", () => {
  for (const ps of [halkaANoktalari(1), halkaBNoktalari(YORUNGE.egim)]) {
    const k = kosular(ps);
    assert.equal(k.length, 2);
    assert.notEqual(k[0].on, k[1].on);
    assert.equal(k[0].noktalar.length + k[1].noktalar.length, YORUNGE.parca + 2);
  }
  const e = halkaAElipsi(K);
  const sinir = kosular(halkaANoktalari(1)).map((k) => izd(k.noktalar[0], K));
  for (const [x] of sinir) assert.ok(yakin(Math.abs(x - e.cx), e.a, 1), `${x}`);
});

test("elips dönüşümü: u = 0 birim, u = 1'de kaynak elipsin noktaları hedef elipsin üstünde", () => {
  const kaynak = halkaAElipsi(K);
  const hedef = { cx: 1200, cy: 380, a: 108, b: 31, aci: (-13.44 * Math.PI) / 180 };
  const ps: V2[] = halkaANoktalari(1).map((p) => izd(p, K));
  const bir = elipsDonusumu(kaynak, hedef, 0);
  for (const p of ps) assert.ok(bir(p).every((v, i) => yakin(v, p[i], 1e-9)));
  const son = elipsDonusumu(kaynak, hedef, 1);
  for (const p of ps) assert.ok(yakin(elipsYaricapi(hedef, son(p)), 1, 1e-9));
  // Dikey kaynak (±90°) hedefe yarım turdan az dönerek varır.
  const b = halkaBElipsi(YORUNGE.egim, K);
  const orta = elipsDonusumu(b, { ...hedef, aci: (89.33 * Math.PI) / 180 }, 0.5);
  const p = izd(halkaBNoktalari(YORUNGE.egim)[0], K);
  assert.ok(Number.isFinite(orta(p)[0]));
});

// --- İşaret ölçümünün doğrulaması: resmî SVG'deki turuncu işaret yolu (M, c, l, h, v, s, Z) → çokgenler (çift-tek dolgu).
const isaretCokgenleri = (): V2[][] => {
  const svg = readFileSync(new URL("../public/brand/ludenlab-logo.svg", import.meta.url), "utf8");
  const d = /<g fill="#fe703a"><path d="([^"]+)"/.exec(svg)![1];
  const tok = d.match(/[MmLlHhVvCcSsZz]|-?\d*\.?\d+(?:e-?\d+)?/g)!;
  const cokgenler: V2[][] = [];
  let cur: V2[] = [];
  let [x, y, sx, sy] = [0, 0, 0, 0];
  let cmd = "";
  let son: V2 | null = null;
  let i = 0;
  const n = () => Number(tok[i++]);
  const bez = (p0: V2, p1: V2, p2: V2, p3: V2) => {
    for (let k = 1; k <= 16; k++) {
      const t = k / 16, m = 1 - t;
      cur.push([m ** 3 * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t ** 3 * p3[0], m ** 3 * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t ** 3 * p3[1]]);
    }
  };
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i])) cmd = tok[i++];
    const g = cmd === cmd.toLowerCase();
    switch (cmd.toUpperCase()) {
      case "M": {
        if (cur.length) cokgenler.push(cur);
        [x, y] = [n() + (g ? x : 0), n() + (g ? y : 0)];
        [sx, sy] = [x, y];
        cur = [[x, y]];
        cmd = g ? "l" : "L";
        son = null;
        break;
      }
      case "L":
        [x, y] = [n() + (g ? x : 0), n() + (g ? y : 0)];
        cur.push([x, y]);
        son = null;
        break;
      case "H":
        x = n() + (g ? x : 0);
        cur.push([x, y]);
        son = null;
        break;
      case "V":
        y = n() + (g ? y : 0);
        cur.push([x, y]);
        son = null;
        break;
      case "C": {
        const v = [n(), n(), n(), n(), n(), n()].map((a, j) => a + (g ? (j % 2 ? y : x) : 0));
        bez([x, y], [v[0], v[1]], [v[2], v[3]], [v[4], v[5]]);
        son = [v[2], v[3]];
        [x, y] = [v[4], v[5]];
        break;
      }
      case "S": {
        const v = [n(), n(), n(), n()].map((a, j) => a + (g ? (j % 2 ? y : x) : 0));
        const c1: V2 = son ? [2 * x - son[0], 2 * y - son[1]] : [x, y];
        bez([x, y], c1, [v[0], v[1]], [v[2], v[3]]);
        son = [v[0], v[1]];
        [x, y] = [v[2], v[3]];
        break;
      }
      case "Z":
        [x, y] = [sx, sy];
        if (cur.length) cokgenler.push(cur);
        cur = [];
        son = null;
        cmd = "";
        break;
      default:
        throw new Error(`yol komutu: ${cmd}`);
    }
  }
  if (cur.length) cokgenler.push(cur);
  return cokgenler;
};
const icinde = (cs: V2[][], [px, py]: V2) => {
  let ic = false;
  for (const c of cs)
    for (let a = 0, b = c.length - 1; a < c.length; b = a++) {
      if (c[a][1] > py !== c[b][1] > py && px < ((c[b][0] - c[a][0]) * (py - c[a][1])) / (c[b][1] - c[a][1]) + c[a][0]) ic = !ic;
    }
  return ic;
};

test("ISARET elipsleri resmî işaretin yörüngelerinin orta çizgisinde; kesişim noktası iki yörüngenin arasındaki boşlukta", () => {
  const cs = isaretCokgenleri();
  const svg = readFileSync(new URL("../public/brand/ludenlab-logo.svg", import.meta.url), "utf8");
  assert.ok(svg.includes('viewBox="0 0 611 260"'), "logo viewBox değişmiş: LOGO_VIEWBOX'ı güncelle");
  for (const e of [ISARET.genis, ISARET.dikey]) {
    let ic = 0;
    for (let t = 0; t < 360; t++) {
      const a = (t * Math.PI) / 180;
      const [u, v] = [e.a * Math.cos(a), e.b * Math.sin(a)];
      if (icinde(cs, [e.cx + u * Math.cos(e.aci) - v * Math.sin(e.aci), e.cy + u * Math.sin(e.aci) + v * Math.cos(e.aci)])) ic++;
    }
    assert.ok(ic >= 355, `elipsin ${ic}/360 noktası işaretin içinde`);
  }
  assert.ok(!icinde(cs, ISARET.kesisim), "kesişim noktası işaretin çizgisine düşüyor");
  assert.ok(elipsYaricapi(ISARET.genis, ISARET.kesisim) < 1 && elipsYaricapi(ISARET.dikey, ISARET.kesisim) < 1, "kesişim iki yörüngenin içinde değil");
});
```
Run: `node --test tests/marka-yorunge.test.ts` → FAIL (`yorunge.ts` yok).

- [ ] **Step 2: Uygula** — `src/marka/yorunge.ts`:
```ts
import { izd, type Kamera, type V2, type V3 } from "./izometri.ts";

// Kapanış yörüngeleri (spec "6 · Kapanış"): bloğun ortasından geçen, yarıçapı r olan iki çember.
// A yatay (tabla turunun izi). B, A'nın tabla düzlemindeki bir menteşe ekseni etrafında kalkmış hâli; son eğimde
// izdüşümü dikey bir elips olur ve LudenLab işaretinin dikey yörüngesiyle aynı kısa/uzun oranını taşır.
// Saf geometri: 3B nokta → izdüşüm → ön/arka koşuları → 2B elips dönüşümü (işarete oturma). Zamanlama cocukKapanis.ts'te.

/** 2B elips: merkez, yarı eksenler (a ≥ b), a ekseninin açısı (radyan, ekran: y aşağı). */
export type Elips = { cx: number; cy: number; a: number; b: number; aci: number };

/**
 * LudenLab işaretinin iki yörüngesi (logo viewBox birimi, 611 × 260). `public/brand/ludenlab-logo.svg`'deki turuncu
 * işaret yolunun iki yörüngesinin orta çizgisine uydurulan elipsler (ışınlarla bant ortası + en küçük kareler;
 * Plan 3C ölçümü; tests/marka-yorunge.test.ts resmî yola karşı denetler). İkisi aynı elips (87 × 25), ~103° dönük.
 * kesisim: iki yörüngenin ortak iç bölgesinin ağırlık merkezi (blok buraya akar). kalinlik: işaretin alanı / iki
 * elipsin çevresi (ortalama bant kalınlığı).
 */
export const ISARET = {
  genis: { cx: 498.3, cy: 139.8, a: 87.17, b: 25.07, aci: (-13.44 * Math.PI) / 180 } as Elips,
  dikey: { cx: 463.76, cy: 108.77, a: 87.03, b: 24.92, aci: (89.33 * Math.PI) / 180 } as Elips,
  kesisim: [465.7, 145.8] as V2,
  kalinlik: 8.6,
};

/**
 * Dikey yörüngenin menteşe ekseni (tabla düzleminde, x ekseninden açı) ve son eğimi: çember bu eksen etrafında
 * `egim` kadar kalkınca izdüşümünün uzun ekseni ekranda tam dikey, kısa/uzun oranı `oran` olur.
 * Türetme: normal n = (sin ψ sin φ, −cos ψ sin φ, cos φ); dikeylik n·(−1,−1,2) = 0, oran |n·(1,1,1)|/√3.
 */
export const dikeyEgim = (oran: number) => {
  const D = (2 * oran) / Math.sqrt(3 - oran * oran);
  return { eksen: Math.PI / 4 + Math.asin(D / Math.SQRT2), egim: Math.atan(2 / D) };
};

const DIKEY = dikeyEgim(ISARET.dikey.b / ISARET.dikey.a);

export const YORUNGE = {
  /** Bloğun ortası: iki çemberin ortak merkezi. */
  merkez: [0, 0, 0.5] as V3,
  /** Yarıçap (dünya): 1,2'de yatay halkanın arka yayı bloğun arkasına ~33 px girer, yığınlara ≥ 22 px uzak kalır. */
  r: 1.2,
  /** Tam çemberin doğru parçası sayısı. */
  parca: 128,
  /** Turuncu dolgunun genişliği (px, 1920'de); ink kılıf iki yanda CIZGI.ince kadar taşar. */
  kalinlik: 8,
  /** A'nın çizime başladığı açı: ekranda sol uç (burada ön/arka sınırı). A, tabla dönüşü yönünde (θ azalarak) çizilir. */
  basAci: (3 * Math.PI) / 4,
  eksen: DIKEY.eksen,
  egim: DIKEY.egim,
};

const [MX, MY, MZ] = YORUNGE.merkez;

/** A (yatay) çemberinin θ açısındaki dünya noktası. */
export const halkaA = (t: number): V3 => [MX + YORUNGE.r * Math.cos(t), MY + YORUNGE.r * Math.sin(t), MZ];

/** B çemberi: menteşe ekseni a ile e2 = z × a tabanında; e2 yönü `egim` kadar yukarı kalkar (egim 0'da A ile çakışır). */
export const halkaB = (t: number, egim: number): V3 => {
  const [ca, sa] = [Math.cos(YORUNGE.eksen), Math.sin(YORUNGE.eksen)];
  const c = YORUNGE.r * Math.cos(t);
  const s = YORUNGE.r * Math.sin(t);
  return [MX + c * ca - s * sa * Math.cos(egim), MY + c * sa + s * ca * Math.cos(egim), MZ + s * Math.sin(egim)];
};

/** A'nın çizilmiş kısmı: basAci'dan θ azalarak, tam turun `oran`ı kadar (0 → boş, 1 → kapalı çember). */
export const halkaANoktalari = (oran: number): V3[] => {
  const o = Math.min(1, Math.max(0, oran));
  if (o <= 0) return [];
  const tam = Math.floor(o * YORUNGE.parca);
  const ps: V3[] = [];
  for (let i = 0; i <= tam; i++) ps.push(halkaA(YORUNGE.basAci - (2 * Math.PI * i) / YORUNGE.parca));
  if (o * YORUNGE.parca > tam) ps.push(halkaA(YORUNGE.basAci - 2 * Math.PI * o));
  return ps;
};

/** B'nin kapalı çemberi (parca + 1 nokta, son = ilk). */
export const halkaBNoktalari = (egim: number): V3[] =>
  Array.from({ length: YORUNGE.parca + 1 }, (_, i) => halkaB((2 * Math.PI * i) / YORUNGE.parca, egim));

/** Görüş yönünde (1,1,1) merkezden uzaklık: > 0 ise nokta bloğun önünde. r ≥ 1,2'de blok siluetiyle örtüşen her
 *  nokta bloğun tümüyle önünde ya da arkasındadır (küp, merkezden 0,866'lık kürenin içinde). */
export const onde = (p: V3) => p[0] - MX + (p[1] - MY) + (p[2] - MZ) > 0;

export type Kosu = { on: boolean; noktalar: V3[] };

/** Çember noktalarını ön/arka koşulara böler (parça orta noktasına göre). Kapalı çemberde ilk ve son koşu aynı
 *  taraftaysa birleşir. Komşu koşular sınır noktasını paylaşır. */
export const kosular = (noktalar: V3[]): Kosu[] => {
  const k: Kosu[] = [];
  for (let i = 0; i + 1 < noktalar.length; i++) {
    const [p, q] = [noktalar[i], noktalar[i + 1]];
    const on = onde([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2]);
    const son = k[k.length - 1];
    if (son && son.on === on) son.noktalar.push(q);
    else k.push({ on, noktalar: [p, q] });
  }
  const kapali = noktalar.length > 2 && noktalar[0].every((v, i) => Math.abs(v - noktalar[noktalar.length - 1][i]) < 1e-9);
  if (kapali && k.length > 1 && k[0].on === k[k.length - 1].on) {
    const son = k.pop()!;
    k[0] = { on: son.on, noktalar: [...son.noktalar, ...k[0].noktalar.slice(1)] };
  }
  return k;
};

/** 3B çemberin (merkez + cos t·u + sin t·v) ekrandaki elipsi. */
export const izdusumElipsi = (merkez: V3, u: V3, v: V3, k: Kamera): Elips => {
  const o = izd([0, 0, 0], k);
  const [pu, pv] = [u, v].map((w) => {
    const q = izd(w, k);
    return [q[0] - o[0], q[1] - o[1]];
  });
  const [cx, cy] = izd(merkez, k);
  // M = [pu pv]; M·Mᵀ'nin özdeğerleri yarı eksenlerin kareleri, ilk özvektör uzun eksen.
  const p = pu[0] * pu[0] + pv[0] * pv[0];
  const r = pu[1] * pu[1] + pv[1] * pv[1];
  const q = pu[0] * pu[1] + pv[0] * pv[1];
  const orta = (p + r) / 2;
  const fark = Math.sqrt(((p - r) / 2) ** 2 + q * q);
  return { cx, cy, a: Math.sqrt(orta + fark), b: Math.sqrt(Math.max(0, orta - fark)), aci: 0.5 * Math.atan2(2 * q, p - r) };
};

/** A'nın ve `egim`deki B'nin izdüşüm elipsleri. */
export const halkaAElipsi = (k: Kamera) => izdusumElipsi(YORUNGE.merkez, [YORUNGE.r, 0, 0], [0, YORUNGE.r, 0], k);
export const halkaBElipsi = (egim: number, k: Kamera) => {
  const [ca, sa] = [Math.cos(YORUNGE.eksen), Math.sin(YORUNGE.eksen)];
  const r = YORUNGE.r;
  return izdusumElipsi(YORUNGE.merkez, [r * ca, r * sa, 0], [-r * sa * Math.cos(egim), r * ca * Math.cos(egim), r * Math.sin(egim)], k);
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Kaynak elipsi u oranında hedef elipse götüren 2B dönüşüm: merkez, yarı eksenler ve açı doğrusal ilerler; u = 0'da
 * birim dönüşüm, u = 1'de kaynak elipsin her noktası hedef elipsin üstündedir. Açı hedefe en yakın eşdeğerden
 * (π katları) başlar: elips yarım turdan fazla dönmez.
 */
export const elipsDonusumu = (kaynak: Elips, hedef: Elips, u: number) => {
  const a0 = kaynak.aci + Math.PI * Math.round((hedef.aci - kaynak.aci) / Math.PI);
  const aci = lerp(a0, hedef.aci, u);
  const [c0, s0, c1, s1] = [Math.cos(a0), Math.sin(a0), Math.cos(aci), Math.sin(aci)];
  const sa = lerp(kaynak.a, hedef.a, u) / kaynak.a;
  const sb = lerp(kaynak.b, hedef.b, u) / kaynak.b;
  const [cx, cy] = [lerp(kaynak.cx, hedef.cx, u), lerp(kaynak.cy, hedef.cy, u)];
  return (p: V2): V2 => {
    const [x, y] = [p[0] - kaynak.cx, p[1] - kaynak.cy];
    const ex = (x * c0 + y * s0) * sa;
    const ey = (-x * s0 + y * c0) * sb;
    return [cx + ex * c1 - ey * s1, cy + ex * s1 + ey * c1];
  };
};

/** Elipsin (merkez etrafında) normalleştirilmiş yarıçapı: 1 → nokta elipsin üstünde. */
export const elipsYaricapi = (e: Elips, p: V2) => {
  const [x, y] = [p[0] - e.cx, p[1] - e.cy];
  const [c, s] = [Math.cos(e.aci), Math.sin(e.aci)];
  return Math.hypot((x * c + y * s) / e.a, (-x * s + y * c) / e.b);
};
```
- [ ] **Step 3:** `node --test tests/marka-yorunge.test.ts` → `ℹ pass 7`. `npm test && npm run typecheck` → `ℹ pass 225`, `ℹ fail 0`. Bir test plan koduna karşı kırılırsa değerleri yazdır ve raporla (testi sessizce gevşetme).
- [ ] **Step 4: Commit** — `git add src/marka/yorunge.ts tests/marka-yorunge.test.ts` → `feat(promo/marka): yörünge geometrisi ve LudenLab işaretinin ölçüleri`

---

### Task 3: Sabitler, durum tipleri; stil karesi aynı yerleri okur

**Files:** Modify `promo/src/marka/yerlesim.ts`, `promo/src/marka/tema.ts`, `promo/src/marka/durumTipleri.ts`, `promo/src/marka/StilKaresi.tsx`

Davranış değişmez; testler ve stil karesi aynı kalır.

- [ ] **Step 1: `yerlesim.ts`** — ilk satırı değiştir:
```ts
import type { Kamera, V2, V3 } from "./izometri.ts";
```
dosya sonuna ekle:
```ts

/** Çocuk (storyboard F10): iki modül yığını ince dosya olarak bloğun iki yanında (tabla −360° ≡ 0°). StilKaresi de okur. */
export const COCUK_YIGIN_YERI: { studio: V2; atolye: V2 } = { studio: [-1.6, 1.5], atolye: [1.5, -1.6] };

/** Kapanış kartı (1920 × 1080): logo kilidinin sol üstü ve genişliği, slogan satırının ve çağrı satırının üstü.
 *  İçerik (işaretin tepesi ≈ 274 → düğme gölgesinin altı ≈ 786) dikeyde ekranın ortasında. */
export const KAPANIS_YERI = { logo: { x: 580, y: 250, w: 760 }, slogan: 613, cagri: 710 } as const;
```
- [ ] **Step 2: `tema.ts`** — dosya sonuna ekle:
```ts

/** Resmî logo kilidinin (public/brand/ludenlab-logo.svg) viewBox boyutu. */
export const LOGO_VIEWBOX = { w: 611, h: 260 } as const;

/** Kapanış düğmesi (Poster): yükseklik, yan boşluk, yazı boyu, köşe yarıçapı, blursuz ofset gölge (px). */
export const DUGME = { yukseklik: 68, yan: 34, boyut: 32, kose: 16, golge: 8 } as const;
```
- [ ] **Step 3: `durumTipleri.ts`** — dosya sonuna ekle:
```ts

/** Kapanış yörüngesinin bir koşusu (kamera kapsayıcısında 2B). on: bloğun önünde çizilir. cizgi: ink kılıfın yolu;
 *  dolgu: turuncu yol (ön koşuda komşu arka koşulara taşar: ek yerinde kılıfın yuvarlak ucu görünmez).
 *  kalinlik: dolgu genişliği (px); kilif: kılıfın opaklığı (0–1); opaklik: bütün koşunun opaklığı. */
export type YorungeCizimi = { id: string; on: boolean; cizgi: V2[]; dolgu: V2[]; kalinlik: number; kilif: number; opaklik: number };

/** Bloğun kapanıştaki 2B yolu: blok merkezinin ekran noktası (kaynak) merkez'e taşınır ve olcek'le küçülür. */
export type BlokIzi = { kaynak: V2; merkez: V2; olcek: number };

/** Kapanış: tabla ve yığınların çekilmesi (ayrı katmanda bulanıklık px, opaklık, odak etrafında ölçek). */
export type ArkaCekilme = { bulaniklik: number; opaklik: number; olcek: number };

/** Kapanış kartı: resmî logo kilidi, slogan, Studio/Atölye hapları ve ludenlab.com düğmesi. itme: ekran ortası
 *  etrafında son yavaş itme. gorunum: bulanıktan netleşme; acilis: maske; basma: düğme yüzünün gölgeye inişi. */
export type KapanisDurumu = {
  itme: number;
  logo: { x: number; y: number; w: number; gorunum: number };
  slogan: { metin: string; top: number; acilis: number };
  cagri: {
    top: number;
    cipler: { metin: string; nokta: string; gorunum: number }[];
    dugme: { metin: string; gorunum: number; basma: number };
  };
};
```
- [ ] **Step 4: `StilKaresi.tsx`** — içe aktarmayı değiştir:
```ts
import { COCUK_YIGIN_YERI, GENEL_KAMERA, HEDEF_YERLESIMI } from "./yerlesim.ts";
```
iki yığın satırını değiştir:
```ts
const STUDIO = yigin({ cx: COCUK_YIGIN_YERI.studio[0], cy: COCUK_YIGIN_YERI.studio[1], adet: 3, tohum: 21, sapma: 0.02, sekme: RENK.studio });
const ATOLYE = yigin({ cx: COCUK_YIGIN_YERI.atolye[0], cy: COCUK_YIGIN_YERI.atolye[1], adet: 3, tohum: 23, sapma: 0.02, sekme: RENK.atolye });
```
- [ ] **Step 5: Doğrula**
```bash
npm test && npm run typecheck
npm run marka:stil
python3 -c "from PIL import Image, ImageChops; a=Image.open('out/marka/stil-karesi.png').convert('RGB'); b=Image.open('out/marka/ref-3c-stil.png').convert('RGB'); print(ImageChops.difference(a,b).getbbox())"
```
Expected: `ℹ pass 225`, `ℹ fail 0`; son satır `None` (piksel aynı). `None` değilse DUR.
- [ ] **Step 6: Commit** — `git add src/marka/yerlesim.ts src/marka/tema.ts src/marka/durumTipleri.ts src/marka/StilKaresi.tsx` → `refactor(promo/marka): Çocuk ve Kapanış yerleşimi, logo ve düğme ölçüleri, kapanış durum tipleri`

---

### Task 4: Çocuk'un ince yığınları (`cocukKapanis.ts`, 1. kısım)

**Files:** Create `promo/src/marka/cocukKapanis.ts`; Test `promo/tests/marka-cocuk-kapanis.test.ts`

- [ ] **Step 1: Başarısız testi yaz** — `tests/marka-cocuk-kapanis.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { DONUS_KARE, INCE_ADET, cocukYiginlari } from "../src/marka/cocukKapanis.ts";
import { MODUL_ADET, MODUL_TOHUM, modulYigini } from "../src/marka/kagitAkisi.ts";
import { yigin, type Kagit } from "../src/marka/nesneler.ts";
import { COCUK } from "../src/marka/olaylar.ts";
import { RENK } from "../src/marka/tema.ts";
import { COCUK_YIGIN_YERI } from "../src/marka/yerlesim.ts";
import { kare } from "../src/marka/zaman.ts";

const K73 = kare(COCUK.tabla);

// Başlangıç: Studio 8 kâğıt; Atölye 7 (üst kâğıdı kartına dönüşmüş, Plan 3B) — filmDurumu(K73 − 1)'in yığınları gibi.
const BAS: Record<"studio" | "atolye", Kagit[]> = { studio: modulYigini("studio", MODUL_ADET).kagitlar, atolye: modulYigini("atolye", MODUL_ADET - 1).kagitlar };
const TAM = { studio: 1, atolye: 1 };
const yigini = (f: number, m: "studio" | "atolye") => cocukYiginlari(f, BAS, TAM).find((g) => g.id === `modul-${m}`)!;
const kalkanlar = (f: number, m: "studio" | "atolye") => cocukYiginlari(f, BAS, TAM).filter((g) => g.id.startsWith(`kalkan-${m}`));
const ayni = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test("v73'te yığınlar olduğu gibi: aynı kâğıtlar aynı yerde (sıçrama yok)", () => {
  for (const m of ["studio", "atolye"] as const) {
    const hepsi = cocukYiginlari(K73, BAS, TAM)
      .filter((g) => g.id === `modul-${m}` || g.id.startsWith(`kalkan-${m}`))
      .flatMap((g) => g.kagitlar);
    assert.equal(hepsi.length, BAS[m].length, m);
    hepsi.forEach((k, i) => {
      assert.ok(ayni(k.z0, BAS[m][i].z0), `${m} ${i} z`);
      k.taban.forEach((p, j) => assert.ok(ayni(p[0], BAS[m][i].taban[j][0]) && ayni(p[1], BAS[m][i].taban[j][1]), `${m} ${i} taban`));
    });
  }
});

test("üst kâğıtlar tepeden başlayarak kalkar ve söner; dönüş bitmeden yığın 3 kâğıt kalır", () => {
  // İlk kalkan en üstteki: K73 + 4'te o yükselmiş, altındakiler yerinde.
  const k = kalkanlar(K73 + 4, "studio");
  const enUst = k.find((g) => g.id === `kalkan-studio-${MODUL_ADET - INCE_ADET - 1}`)!;
  assert.ok(enUst.kagitlar[0].z0 > BAS.studio[MODUL_ADET - 1].z0 + 0.1, "en üst kalkmadı");
  assert.ok(ayni(k.find((g) => g.id === "kalkan-studio-0")!.kagitlar[0].z0, BAS.studio[INCE_ADET].z0), "alttaki erken kalktı");
  for (const m of ["studio", "atolye"] as const) {
    assert.equal(kalkanlar(K73 + DONUS_KARE - 8, m).length, 0, `${m} kalkanlar gitmedi`);
    assert.equal(yigini(K73 + DONUS_KARE - 8, m).kagitlar.length, INCE_ADET);
  }
  // Kalkan kâğıdın opaklığı hiç artmaz.
  let once = 1;
  for (let f = K73; f < K73 + 20; f++) {
    const g = kalkanlar(f, "studio").find((g) => g.id === "kalkan-studio-4");
    const o = g ? g.kagitlar[0].opaklik! : 0;
    assert.ok(o <= once + 1e-12, `f=${f}`);
    once = o;
  }
});

test("dönüş sonunda ince yığınlar storyboard F10'daki yerde, stil karesiyle aynı kâğıtlar", () => {
  const f = K73 + DONUS_KARE;
  const sekme = { studio: RENK.studio, atolye: RENK.atolye };
  for (const m of ["studio", "atolye"] as const) {
    const g = yigini(f, m);
    assert.ok(ayni(g.p[0], COCUK_YIGIN_YERI[m][0]) && ayni(g.p[1], COCUK_YIGIN_YERI[m][1]) && g.p[2] === 0, `${g.p}`);
    const ref = yigin({ cx: COCUK_YIGIN_YERI[m][0], cy: COCUK_YIGIN_YERI[m][1], adet: INCE_ADET, tohum: MODUL_TOHUM[m], sapma: 0.02, sekme: sekme[m] }).kagitlar;
    assert.equal(g.kagitlar.length, ref.length);
    g.kagitlar.forEach((k, i) => {
      assert.ok(ayni(k.z0, ref[i].z0));
      assert.equal(k.sekme, ref[i].sekme);
      assert.equal(k.ust, ref[i].ust);
      k.taban.forEach((p, j) => assert.ok(ayni(p[0], ref[i].taban[j][0]) && ayni(p[1], ref[i].taban[j][1]), `${m} ${i}`));
    });
  }
});

// Ayırıcı eksen boşluğu (dünya birimi, blok 1 × 1): yığın önce dışa açıldığından köşesi bloğun köşesine ≥ 0,15 uzak kalır.
test("kayan yığınlar bloğa değmez (ayırıcı eksende ≥ 0,15 boşluk)", () => {
  for (let f = K73; f <= K73 + DONUS_KARE; f++) {
    for (const g of cocukYiginlari(f, BAS, TAM)) {
      for (const k of g.kagitlar) {
        const xs = k.taban.map((p) => p[0]);
        const ys = k.taban.map((p) => p[1]);
        const bosluk = Math.max(Math.min(...xs) - 0.5, -0.5 - Math.max(...xs), Math.min(...ys) - 0.5, -0.5 - Math.max(...ys));
        assert.ok(bosluk >= 0.15, `f=${f} ${g.id} boşluk ${bosluk.toFixed(3)}`);
      }
    }
  }
});
```
Run: `node --test tests/marka-cocuk-kapanis.test.ts` → FAIL (`cocukKapanis.ts` yok).

- [ ] **Step 2: Uygula** — `src/marka/cocukKapanis.ts` (Task 5 bu dosyanın içe aktarma bloğunu genişletip sonuna ekleme yapar):
```ts
import { Easing, interpolate } from "remotion";
import type { V2 } from "./izometri.ts";
import { MODUL_YERI, modulYigini, type KagitGrubu, type ModulId } from "./kagitAkisi.ts";
import type { Kagit } from "./nesneler.ts";
import { COCUK } from "./olaylar.ts";
import { COCUK_YIGIN_YERI } from "./yerlesim.ts";
import { kare } from "./zaman.ts";

// Çocuk (v73–88) ve Kapanış (v89–100) katmanı: incelen modül yığınları, hedef etiketleri, başlıklar, yörüngeler,
// bloğun kesişime akışı, arka planın çekilmesi, künyenin gidişi ve kapanış kartı. Saf: kare (+ kamera) → katman.
// Kamera, tabla ve itme izleri filmDurumu.ts'tedir; burası onları girdi olarak alır.

const ara = (f: number, a: number, b: number, easing: (t: number) => number = (t) => t) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });

const K73 = kare(COCUK.tabla);

/** Tabla son çeyreği bu kadar karede döner (önceki dönüşlerle aynı); yığınlar aynı sürede kayar, soluklaştırma kalkar. */
export const DONUS_KARE = 36;
/** Çocuk'ta modül yığını ince bir dosyaya döner: alttaki bu kadar kâğıt kalır (storyboard F10). */
export const INCE_ADET = 3;
/** Kalkan kâğıtlar tepeden başlayarak bu aralıkla (kare) kalkar, KALKIS_KARE'de KALKIS_Z birim yükselip söner. */
const KALKIS_ARA = 3;
const KALKIS_KARE = 14;
const KALKIS_Z = 0.6;

const kaydir = (k: Kagit, dx: number, dy: number, dz = 0): Kagit => ({ ...k, taban: k.taban.map(([x, y]) => [x + dx, y + dy] as V2), z0: k.z0 + dz });

/**
 * Çocuk'un modül yığınları (f ≥ v73). baslangic: v73'ten bir kare önce çizilen kâğıtlar (alttan üste, kâğıt başına
 * opaklık dahil). Alttaki INCE_ADET kâğıt, üstü sekmeli ve yazılı ince yığın olarak kalır; üsttekiler tepeden
 * başlayarak kalkıp söner. Yığın, kalkanlarla birlikte, tabla dönerken MODUL_YERI'nden COCUK_YIGIN_YERI'ne kayar.
 * opaklik: grup opaklığı (odak dışı soluklaştırmanın kalkışı).
 */
export const cocukYiginlari = (f: number, baslangic: Record<ModulId, Kagit[]>, opaklik: Record<ModulId, number>): KagitGrubu[] => {
  // Yığın önce dışa (x, bloktan uzağa) açılır, sonra yanından geçer (y): köşesi bloğun köşesine yaklaşmaz.
  const kaymaX = ara(f, K73, K73 + DONUS_KARE, Easing.out(Easing.cubic));
  const kaymaY = ara(f, K73, K73 + DONUS_KARE, Easing.inOut(Easing.sin));
  const gruplar: KagitGrubu[] = [];
  for (const m of ["studio", "atolye"] as const) {
    const [x0, y0] = MODUL_YERI[m];
    const dx = (COCUK_YIGIN_YERI[m][0] - x0) * kaymaX;
    const dy = (COCUK_YIGIN_YERI[m][1] - y0) * kaymaY;
    gruplar.push({ id: `modul-${m}`, p: [x0 + dx, y0 + dy, 0], kagitlar: modulYigini(m, INCE_ADET).kagitlar.map((k) => kaydir(k, dx, dy)), opaklik: opaklik[m] });
    const kalkanlar = baslangic[m].slice(INCE_ADET);
    kalkanlar.forEach((k, j) => {
      const bas = K73 + KALKIS_ARA * (kalkanlar.length - 1 - j);
      const u = ara(f, bas, bas + KALKIS_KARE);
      const gorunum = (k.opaklik ?? 1) * (1 - Easing.in(Easing.quad)(u));
      if (u >= 1 || gorunum <= 0) return;
      const dz = KALKIS_Z * Easing.out(Easing.cubic)(u);
      gruplar.push({ id: `kalkan-${m}-${j}`, p: [x0 + dx, y0 + dy, k.z0 + dz], kagitlar: [{ ...kaydir(k, dx, dy, dz), opaklik: gorunum }], opaklik: opaklik[m] });
    });
  }
  return gruplar;
};
```
- [ ] **Step 3:** `node --test tests/marka-cocuk-kapanis.test.ts` → `ℹ pass 4`. `npm test && npm run typecheck` → `ℹ pass 229`, `ℹ fail 0`.
- [ ] **Step 4: Commit** — `git add src/marka/cocukKapanis.ts tests/marka-cocuk-kapanis.test.ts` → `feat(promo/marka): Çocuk'ta modül yığınları incelip F10 yerlerine kayar`

---

### Task 5: Çocuk ve Kapanış katmanı (`cocukKapanis.ts`, 2. kısım)

**Files:** Modify `promo/src/marka/cocukKapanis.ts`, `promo/tests/marka-cocuk-kapanis.test.ts`

- [ ] **Step 1: Testleri ekle** — `tests/marka-cocuk-kapanis.test.ts`'in içe aktarma bloğunu (`import { test } …` satırından `import { kare } from "../src/marka/zaman.ts";` satırına dek, 9 satır) şununla değiştir:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { DONUS_KARE, INCE_ADET, cocukKapanisKatmani, cocukYiginlari, type Sahne } from "../src/marka/cocukKapanis.ts";
import { izd, type V2 } from "../src/marka/izometri.ts";
import { MODUL_ADET, MODUL_TOHUM, modulYigini } from "../src/marka/kagitAkisi.ts";
import { HEDEFLER, METIN } from "../src/marka/metin.ts";
import { yigin, type Kagit } from "../src/marka/nesneler.ts";
import { COCUK, KAPANIS } from "../src/marka/olaylar.ts";
import { LOGO_VIEWBOX, RENK } from "../src/marka/tema.ts";
import { COCUK_YIGIN_YERI, GENEL_KAMERA, HEDEF_YERLESIMI, KAPANIS_YERI } from "../src/marka/yerlesim.ts";
import { ISARET, elipsYaricapi } from "../src/marka/yorunge.ts";
import { kare } from "../src/marka/zaman.ts";
```
dosya sonuna:
```ts

const K85 = kare(COCUK.yorunge);
const K89 = kare(KAPANIS.cekilme);
const K90 = kare(KAPANIS.dikey);
const K93 = kare(KAPANIS.donusum);
const K95 = kare(KAPANIS.slogan);
const K96 = kare(KAPANIS.dugme);
const ODAK = izd([0, 0, 0.5], GENEL_KAMERA);
const sahne = (itme = 1): Sahne => ({ kamera: { ...GENEL_KAMERA, don: -2 * Math.PI }, itme, odak: ODAK });
const katman = (f: number, itme = 1) => cocukKapanisKatmani(f, sahne(itme));

test("hedef etiketleri v77–79'da modül rengiyle raptiyeye varır, v85'te çıkar", () => {
  COCUK.etiketler.forEach((v, i) => {
    const e = (f: number) => katman(f).etiketler.find((x) => x.id === `cocuk-hedef-${i}`);
    assert.ok(e(kare(v) - 1)!.ilerleme < 1);
    const var_ = e(kare(v))!;
    assert.equal(var_.ilerleme, 1);
    assert.equal(var_.metin, HEDEFLER[i].metin);
    assert.equal(var_.nokta, RENK[HEDEFLER[i].modul]);
    assert.deepEqual([var_.capa, var_.x, var_.y, var_.hiza], [HEDEF_YERLESIMI[i].capa, HEDEF_YERLESIMI[i].x, HEDEF_YERLESIMI[i].y, HEDEF_YERLESIMI[i].hiza]);
    assert.equal(e(K85 + 12), undefined);
  });
});

test("başlıklar: Çocuk satırları v74–76'da açılır ve v88'de çıkar; Kapanış v89–91'de açılır, v93'te çıkar; üst üste binmez", () => {
  const m = (f: number, id: string) => katman(f).metinler.find((x) => x.id === id);
  assert.equal(m(kare(74) - 1, "cocuk-baslik"), undefined);
  assert.deepEqual(m(kare(76) + 10, "cocuk-baslik")!.acilis, [1, 1, 1]);
  assert.deepEqual(m(kare(76) + 10, "cocuk-baslik")!.satirlar, METIN.cocuk.baslik);
  assert.equal(m(kare(COCUK.baslikCikis) + 12, "cocuk-baslik"), undefined);
  assert.deepEqual(m(kare(91) + 10, "kapanis-baslik")!.acilis, [1, 1, 1]);
  assert.equal(m(K93 + 12, "kapanis-baslik"), undefined);
  for (let f = K73; f < K95; f++) assert.ok(katman(f).metinler.length <= 1, `f=${f}`);
});

test("yatay yörünge v85–90 arasında çizilir, dikey yörünge v90–92'de kalkar; ön koşu bloğun önünde", () => {
  assert.equal(katman(K85 - 1).yorungeler.length, 0);
  const n = (f: number) => katman(f).yorungeler.filter((y) => y.id.startsWith("yorunge-a")).reduce((s, y) => s + y.cizgi.length, 0);
  let once = 0;
  for (let f = K85 + 1; f <= K90; f += 3) {
    assert.ok(n(f) >= once, `f=${f}`);
    once = n(f);
  }
  const k90 = katman(K90);
  assert.deepEqual(k90.yorungeler.filter((y) => y.id.startsWith("yorunge-a")).map((y) => y.on), [true, false]);
  assert.ok(k90.yorungeler.some((y) => y.id.startsWith("yorunge-b")));
  const b = katman(kare(92)).yorungeler.filter((y) => y.id.startsWith("yorunge-b"));
  const xs = b.flatMap((y) => y.cizgi.map((p) => p[0]));
  const ys = b.flatMap((y) => y.cizgi.map((p) => p[1]));
  assert.ok(Math.max(...xs) - Math.min(...xs) < 0.35 * (Math.max(...ys) - Math.min(...ys)), "dikey yörünge dar ve uzun değil");
});

test("dönüşüm sonunda (v95) halkalar logo işaretinin yörüngelerinde (ekranda, itme dahil)", () => {
  const itme = 1.013;
  const s = sahne(itme);
  const k = KAPANIS_YERI.logo.w / LOGO_VIEWBOX.w;
  const ekran = ([x, y]: V2): V2 => [s.odak[0] + (x - s.odak[0]) * itme, s.odak[1] + (y - s.odak[1]) * itme];
  const hedef = (e: typeof ISARET.genis) => ({ cx: KAPANIS_YERI.logo.x + e.cx * k, cy: KAPANIS_YERI.logo.y + e.cy * k, a: e.a * k, b: e.b * k, aci: e.aci });
  const y = cocukKapanisKatmani(K95, s).yorungeler;
  for (const [id, e] of [["yorunge-a", ISARET.genis], ["yorunge-b", ISARET.dikey]] as const) {
    const ps = y.filter((c) => c.id.startsWith(id)).flatMap((c) => c.cizgi);
    assert.ok(ps.length > 100, id);
    for (const p of ps) assert.ok(Math.abs(elipsYaricapi(hedef(e), ekran(p)) - 1) < 1e-6, `${id}`);
  }
});

test("blok v93'te kesişime akarak küçülür, v95'ten önce kaybolur; halkalar v95 + 2'de tümüyle söner", () => {
  assert.equal(katman(K93 - 1).blokIzi, null);
  const b = katman(K93).blokIzi!;
  assert.equal(b.olcek, 1);
  assert.deepEqual(b.merkez, b.kaynak);
  const son = katman(K95 - 6).blokIzi!;
  assert.equal(son.olcek, 0);
  const k = KAPANIS_YERI.logo.w / LOGO_VIEWBOX.w;
  const hedef = [KAPANIS_YERI.logo.x + ISARET.kesisim[0] * k, KAPANIS_YERI.logo.y + ISARET.kesisim[1] * k];
  const k95 = katman(K95).blokIzi!;
  assert.ok(Math.hypot(k95.merkez[0] - hedef[0], k95.merkez[1] - hedef[1]) < 1e-6);
  assert.equal(katman(K95 + 2).yorungeler.length, 0);
});

test("arka plan v89–91 bulanıklaşıp söner; künye v92–93'te gider", () => {
  assert.equal(katman(K89 - 1).arka, null);
  assert.deepEqual(katman(K89).arka, { bulaniklik: 0, opaklik: 1, olcek: 1 });
  const a = katman(kare(91)).arka!;
  assert.ok(ayni(a.bulaniklik, 20) && ayni(a.opaklik, 0) && ayni(a.olcek, 0.9));
  assert.equal(katman(kare(92)).kunyeCikis, 0);
  assert.equal(katman(K93).kunyeCikis, 1);
});

test("kapanış kartı: logo v94'te netleşir, slogan v95'te açılır, düğme v96'da basılıp yarıya geri çıkar", () => {
  assert.equal(katman(kare(94) + 5).kapanis, null);
  const k = katman(K95 + 4).kapanis!;
  assert.equal(k.logo.gorunum, 1);
  assert.deepEqual([k.logo.x, k.logo.y, k.logo.w], [KAPANIS_YERI.logo.x, KAPANIS_YERI.logo.y, KAPANIS_YERI.logo.w]);
  assert.equal(k.slogan.metin, METIN.kapanis.ekran[0]);
  assert.deepEqual(k.cagri.cipler.map((c) => [c.metin, c.nokta]), [[METIN.kapanis.ekran[1], RENK.studio], [METIN.kapanis.ekran[2], RENK.atolye]]);
  assert.equal(k.cagri.dugme.metin, METIN.kapanis.ekran[3]);
  const d = (f: number) => katman(f).kapanis!.cagri.dugme;
  assert.equal(d(K96 - 2).gorunum, 1, "düğme basılmadan önce tam görünür değil");
  assert.ok(ayni(d(K96 - 1).basma, 0));
  assert.ok(ayni(d(K96 + 3).basma, 1));
  assert.ok(ayni(d(K96 + 9).basma, 0.5));
  assert.ok(ayni(d(kare(100)).basma, 0.5));
});

test("son itme kapanış kartını v95'ten filmin son karesine dek yavaşça büyütür (donuk an yok)", () => {
  assert.equal(katman(K95).kapanis!.itme, 1);
  for (let f = K95; f < 1799; f++) assert.ok(katman(f + 1).kapanis!.itme - katman(f).kapanis!.itme > 2e-4, `f=${f}`);
});
```
Run: `node --test tests/marka-cocuk-kapanis.test.ts` → FAIL (`cocukKapanisKatmani` dışa aktarılmıyor).

- [ ] **Step 2: İçe aktarma bloğunu ve baştaki sabitleri genişlet** — `src/marka/cocukKapanis.ts`'te dosyanın başından `const K73 = kare(COCUK.tabla);` satırı dahil her şeyi şununla değiştir:
```ts
import { Easing, interpolate } from "remotion";
import type { ArkaCekilme, BlokIzi, EtiketDurumu, KapanisDurumu, MetinDurumu, YorungeCizimi } from "./durumTipleri.ts";
import { izd, type Kamera, type V2, type V3 } from "./izometri.ts";
import { MODUL_YERI, modulYigini, type KagitGrubu, type ModulId } from "./kagitAkisi.ts";
import { HEDEFLER, METIN } from "./metin.ts";
import type { Kagit } from "./nesneler.ts";
import { COCUK, KAPANIS } from "./olaylar.ts";
import { CIZGI, LOGO_VIEWBOX, RENK } from "./tema.ts";
import { COCUK_YIGIN_YERI, HEDEF_YERLESIMI, KAPANIS_YERI } from "./yerlesim.ts";
import { ISARET, YORUNGE, elipsDonusumu, halkaAElipsi, halkaANoktalari, halkaBElipsi, halkaBNoktalari, kosular, type Elips } from "./yorunge.ts";
import { BOLUMLER_169, kare, toplamKare } from "./zaman.ts";

// Çocuk (v73–88) ve Kapanış (v89–100) katmanı: incelen modül yığınları, hedef etiketleri, başlıklar, yörüngeler,
// bloğun kesişime akışı, arka planın çekilmesi, künyenin gidişi ve kapanış kartı. Saf: kare (+ kamera) → katman.
// Kamera, tabla ve itme izleri filmDurumu.ts'tedir; burası onları girdi olarak alır.

const ara = (f: number, a: number, b: number, easing: (t: number) => number = (t) => t) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const K73 = kare(COCUK.tabla);
const K85 = kare(COCUK.yorunge);
const K88 = kare(COCUK.baslikCikis);
const K89 = kare(KAPANIS.cekilme);
const K90 = kare(KAPANIS.dikey);
const K92 = kare(KAPANIS.kunye);
const K93 = kare(KAPANIS.donusum);
const K94 = kare(KAPANIS.logo);
const K95 = kare(KAPANIS.slogan);
const K96 = kare(KAPANIS.dugme);
const SON_KARE = toplamKare(BOLUMLER_169) - 1;
```
- [ ] **Step 3: Katmanı ekle** — dosyanın sonuna:
```ts

/** Açılışın hedef etiketi gibi: çip 18 karede netleşir, çizgi son 10 karede hızlanarak vuruşunda raptiyeye varır. */
const vurusEtiketi = (f: number, v: number, cikisKare: number, e: Omit<EtiketDurumu, "gorunum" | "ilerleme" | "cikis">): EtiketDurumu | null => {
  const k = kare(v);
  if (f < k - 24) return null;
  const cikis = ara(f, cikisKare, cikisKare + 12);
  if (cikis >= 1) return null;
  return { ...e, gorunum: ara(f, k - 24, k - 6, Easing.out(Easing.quad)), ilerleme: ara(f, k - 10, k, Easing.in(Easing.quad)), cikis };
};

const BASLIK = { top: 360, font: "baslik" as const, boyut: 104, agirlik: 800, renk: RENK.teal, opaklik: 1 };

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
  return { cx, cy, a: e.a * k, b: e.b * k, aci: e.aci };
};

export type Sahne = { kamera: Kamera; itme: number; odak: V2 };
/** Ekran noktası → kamera kapsayıcısı (itme odak etrafında ölçekler; kapsayıcıda çizilen şey ekranda buraya düşer). */
const kapsayiciya = (s: Sahne, [x, y]: V2): V2 => [s.odak[0] + (x - s.odak[0]) / s.itme, s.odak[1] + (y - s.odak[1]) / s.itme];
const kapsayiciElipsi = (s: Sahne, e: Elips): Elips => {
  const [cx, cy] = kapsayiciya(s, [e.cx, e.cy]);
  return { cx, cy, a: e.a / s.itme, b: e.b / s.itme, aci: e.aci };
};

/** Noktalar boyunca (ilk nokta hariç) en az `uzunluk` px ilerleyen ilk noktalar: ön koşunun dolgusu komşu koşuya bu
 *  kadar taşar ve ek yerindeki kılıf ucunu (yarıçap dolgu/2 + CIZGI.ince) örter. Parçalar elipsin uzun ekseninin
 *  ucunda (ön/arka sınırı hep oradadır) 2 px'e kadar kısalır; bu yüzden taşma parça sayısıyla değil uzunlukla ölçülür. */
const tasan = (ps: V2[], uzunluk: number): V2[] => {
  const out: V2[] = [];
  let yol = 0;
  for (let i = 1; i < ps.length && yol < uzunluk; i++) {
    yol += Math.hypot(ps[i][0] - ps[i - 1][0], ps[i][1] - ps[i - 1][1]);
    out.push(ps[i]);
  }
  return out;
};

/** Halka dönüşümü (0 → 1): iki halka logo işaretinin yörüngelerine oturur. */
const donusum = (f: number) => ara(f, K93, K95, Easing.inOut(Easing.cubic));

const yorungeler = (f: number, s: Sahne): YorungeCizimi[] => {
  if (f < K85) return [];
  const opaklik = 1 - ara(f, K94 + 10, K95 + 2);
  if (opaklik <= 0) return [];
  const u = donusum(f);
  const egim = YORUNGE.egim * ara(f, K90, K92, Easing.inOut(Easing.cubic));
  const kalinlik = lerp(YORUNGE.kalinlik, (ISARET.kalinlik * KAPANIS_YERI.logo.w) / LOGO_VIEWBOX.w / s.itme, u);
  const kilif = 1 - ara(f, K93, K93 + 18);
  const halkalar: { id: string; noktalar: V3[]; kaynak: Elips; hedef: Elips }[] = [
    { id: "a", noktalar: halkaANoktalari(ara(f, K85, K90, Easing.inOut(Easing.sin))), kaynak: halkaAElipsi(s.kamera), hedef: logoElipsi(ISARET.genis) },
  ];
  if (f >= K90) halkalar.push({ id: "b", noktalar: halkaBNoktalari(egim), kaynak: halkaBElipsi(egim, s.kamera), hedef: logoElipsi(ISARET.dikey) });
  const cizimler: YorungeCizimi[] = [];
  for (const h of halkalar) {
    if (h.noktalar.length < 2) continue;
    const tasi = u > 0 ? elipsDonusumu(h.kaynak, kapsayiciElipsi(s, h.hedef), u) : (p: V2) => p;
    const kapali = h.noktalar.length === YORUNGE.parca + 1;
    const ks = kosular(h.noktalar).map((k) => ({ on: k.on, ps: k.noktalar.map((p) => tasi(izd(p, s.kamera))) }));
    const tasma = kalinlik + 2 * CIZGI.ince;
    ks.forEach((k, i) => {
      // Ön koşunun dolgusu komşu (arka) koşulara taşar: kılıfın ek yerindeki yuvarlak ucu turuncuyla örtülür.
      const onceki = i > 0 ? ks[i - 1] : kapali && ks.length > 1 ? ks[ks.length - 1] : null;
      const sonraki = i < ks.length - 1 ? ks[i + 1] : kapali && ks.length > 1 ? ks[0] : null;
      const dolgu = k.on ? [...(onceki ? tasan([...onceki.ps].reverse(), tasma).reverse() : []), ...k.ps, ...(sonraki ? tasan(sonraki.ps, tasma) : [])] : k.ps;
      cizimler.push({ id: `yorunge-${h.id}-${i}`, on: k.on, cizgi: k.ps, dolgu, kalinlik, kilif, opaklik });
    });
  }
  return cizimler;
};

export type CocukKapanisKatmani = {
  etiketler: EtiketDurumu[];
  metinler: MetinDurumu[];
  /** 0 → 1: Atölye odağının soluklaştırması, tabla son çeyreği dönerken kalkar. */
  canlanma: number;
  yorungeler: YorungeCizimi[];
  blokIzi: BlokIzi | null;
  arka: ArkaCekilme | null;
  /** Künyenin çıkışı (0 → 1): logo kilidi gelmeden küçük logo gider. */
  kunyeCikis: number;
  kapanis: KapanisDurumu | null;
};

export const cocukKapanisKatmani = (f: number, s: Sahne): CocukKapanisKatmani => {
  const etiketler: EtiketDurumu[] = [];
  HEDEFLER.forEach((h, i) => {
    const y = HEDEF_YERLESIMI[i];
    const e = vurusEtiketi(f, COCUK.etiketler[i], K85, { id: `cocuk-hedef-${i}`, capa: y.capa, x: y.x, y: y.y, hiza: y.hiza, metin: h.metin, nokta: RENK[h.modul] });
    if (e) etiketler.push(e);
  });

  const metinler: MetinDurumu[] = [];
  const cB = ara(f, K88, K88 + 12);
  if (f >= kare(COCUK.baslik[0]) && cB < 1) {
    // Satırlar vuruşlarında açılmaya başlar (seslendirme "Vaktin…" v74'te); ilk satır Atölye yazıları (K73 + 12'de
    // gitmiş) aynı sütundan çekildikten 6 kare sonra gelir, üstlerine binmez.
    metinler.push({ id: "cocuk-baslik", satirlar: [...METIN.cocuk.baslik], ...BASLIK, acilis: COCUK.baslik.map((v) => ara(f, kare(v), kare(v) + 10, Easing.out(Easing.cubic))), cikis: cB });
  }
  const cK = ara(f, K93, K93 + 12);
  if (f >= K89 && cK < 1) {
    // Çocuk başlığı K88 + 12'de gitmiş olur; Kapanış satırları vuruşlarında başlar (aynı yerde üst üste binmez).
    metinler.push({ id: "kapanis-baslik", satirlar: [...METIN.kapanis.baslik], ...BASLIK, acilis: KAPANIS.baslik.map((v) => ara(f, kare(v), kare(v) + 10, Easing.out(Easing.cubic))), cikis: cK });
  }

  const u = donusum(f);
  let blokIzi: BlokIzi | null = null;
  if (f >= K93) {
    const kaynak = izd(YORUNGE.merkez, s.kamera);
    const hedef = kapsayiciya(s, logoNoktasi(ISARET.kesisim));
    blokIzi = { kaynak, merkez: [lerp(kaynak[0], hedef[0], u), lerp(kaynak[1], hedef[1], u)], olcek: 1 - ara(f, K93, K95 - 6, Easing.inOut(Easing.cubic)) };
  }

  const c = ara(f, K89, K89 + 36, Easing.inOut(Easing.sin));
  const arka: ArkaCekilme | null = f >= K89 ? { bulaniklik: 20 * c, opaklik: 1 - c, olcek: 1 - 0.1 * c } : null;

  const kapanis: KapanisDurumu | null =
    f >= K94 + 6
      ? {
          itme: 1 + 0.03 * ara(f, K95, SON_KARE),
          logo: { ...KAPANIS_YERI.logo, gorunum: ara(f, K94 + 6, K95 + 4, Easing.out(Easing.quad)) },
          slogan: { metin: METIN.kapanis.ekran[0], top: KAPANIS_YERI.slogan, acilis: ara(f, K95, K95 + 14, Easing.out(Easing.cubic)) },
          cagri: {
            top: KAPANIS_YERI.cagri,
            // Haplar ve düğme soldan sağa 2 kare arayla, 15 karede netleşir; düğme basılmadan 2 kare önce tam görünür.
            cipler: [
              { metin: METIN.kapanis.ekran[1], nokta: RENK.studio, gorunum: ara(f, K95 - 3, K95 + 12, Easing.out(Easing.quad)) },
              { metin: METIN.kapanis.ekran[2], nokta: RENK.atolye, gorunum: ara(f, K95 - 1, K95 + 14, Easing.out(Easing.quad)) },
            ],
            dugme: {
              metin: METIN.kapanis.ekran[3],
              gorunum: ara(f, K95 + 1, K95 + 16, Easing.out(Easing.quad)),
              // 3 karede basılır, 6 karede yarıya yaylanarak geri çıkar (düğme basılı kalır).
              basma: ara(f, K96, K96 + 3, Easing.out(Easing.quad)) - 0.5 * ara(f, K96 + 3, K96 + 9, Easing.out(Easing.back(1.7))),
            },
          },
        }
      : null;

  return {
    etiketler,
    metinler,
    canlanma: ara(f, K73, K73 + DONUS_KARE, Easing.inOut(Easing.sin)),
    yorungeler: yorungeler(f, s),
    blokIzi,
    arka,
    kunyeCikis: ara(f, K92, K93),
    kapanis,
  };
};
```
- [ ] **Step 4:** `node --test tests/marka-cocuk-kapanis.test.ts` → `ℹ pass 12`. `npm test && npm run typecheck` → `ℹ pass 237`, `ℹ fail 0`.
- [ ] **Step 5: Commit** — `git add src/marka/cocukKapanis.ts tests/marka-cocuk-kapanis.test.ts` → `feat(promo/marka): Çocuk ve Kapanış katmanı (etiketler, başlıklar, yörüngeler, logo kartı)`

---

### Task 6: Film durumu v73–100 (`filmDurumu.ts`)

**Files:** Modify `promo/src/marka/filmDurumu.ts`, `promo/tests/marka-film.test.ts`

- [ ] **Step 1: Testleri güncelle ve ekle** — `tests/marka-film.test.ts`:

(a) İçe aktarmalar: `import { MODUL_YERI } from "../src/marka/kagitAkisi.ts";` ve olaylar satırını şunlarla değiştir:
```ts
import { MODUL_TOHUM, MODUL_YERI } from "../src/marka/kagitAkisi.ts";
import { HEDEFLER, METIN } from "../src/marka/metin.ts";
import { yigin as yiginUret } from "../src/marka/nesneler.ts";
import { ATOLYE, COCUK, DONUS, KANCA, KAPANIS, STUDIO, YUK } from "../src/marka/olaylar.ts";
import { RENK, TUVAL_169 } from "../src/marka/tema.ts";
import { COCUK_YIGIN_YERI, GENEL_KAMERA, HEDEF_YERLESIMI } from "../src/marka/yerlesim.ts";
```
(b) `test("üst kâğıt ile kart çapraz geçer: …` testinin tamamını şununla değiştir (Atölye'nin kartı v73'te giderken üst kâğıdı geri gelmez; yığın Çocuk'ta incelir). Test bu plandan sonra değişmişse: yalnız "Dönüş" denetimlerini `if (mid === "studio")` içine al ve Atölye'nin süreklilik döngüsünü `K73 − 1`'de bitir.
```ts
test("üst kâğıt ile kart çapraz geçer: toplam görünürlük hiç düşmez, kâğıt sayısı 7'nin altına inmez", () => {
  const olaylar = { studio: [kare(STUDIO.kart), K53], atolye: [kare(ATOLYE.kart), K73] } as const;
  for (const mid of ["studio", "atolye"] as const) {
    const [acilis, donus] = olaylar[mid];
    // Açılış: kart 6 karede belirir, kâğıt aynı sürede söner.
    for (let f = acilis - 2; f <= acilis + 8; f++) {
      assert.ok(yigin(f, mid).length >= 7, `${mid} f=${f}`);
      if (f < acilis) continue;
      assert.ok(ustOpaklik(f, mid) + kartGorunurlugu(f, mid) >= 1 - 1e-9, `${mid} açılış f=${f}: ${ustOpaklik(f, mid)} + ${kartGorunurlugu(f, mid)}`);
    }
    assert.equal(ustOpaklik(acilis, mid), 1, `${mid} açılışın ilk karesi kâğıt tam`);
    assert.equal(ustOpaklik(acilis + 6, mid), 0, `${mid} kâğıt 6 karede gider`);
    assert.equal(ustOpaklik(donus - 1, mid), 0);
    // Studio'nun kartı v53'te giderken üst kâğıt geri belirir; sonunda yığın tek parça, kâğıt tam opak. Atölye'nin kartı
    // v73'te gider ama üst kâğıt geri gelmez: Çocuk'ta yığın incelir, üst kâğıtlar kalkar (cocukKapanis.ts, Plan 3C).
    if (mid === "studio") {
      for (let f = donus; f <= donus + 14; f++) assert.ok(ustOpaklik(f, mid) + kartGorunurlugu(f, mid) >= 1 - 1e-9, `${mid} dönüş f=${f}`);
      assert.equal(yigin(donus + 12, mid).length, 8);
      assert.equal(ustOpaklik(donus + 12, mid), 1);
      assert.ok(yigin(donus + 12, mid).every((k) => k.opaklik === undefined), `${mid} birleşmiş yığında kâğıt başına opaklık yok`);
    }
    // Kare kare süreklilik: kâğıt opaklığı en çok 1/6 oynar (pop yok).
    const son = mid === "studio" ? donus + 14 : donus - 1;
    for (let f = acilis - 1; f < son; f++) assert.ok(Math.abs(ustOpaklik(f + 1, mid) - ustOpaklik(f, mid)) <= 1 / 6 + 1e-9, `${mid} f=${f}`);
  }
});
```
(c) Dosya sonuna:
```ts

const SON_KARE = 1799;

test("Çocuk: tabla v73'te −360°'ye döner, kamera genel plana; soluklaştırma aynı sürede kalkar", () => {
  const d = filmDurumu(K73 + 36);
  assert.ok(Math.abs(d.kamera.don + 2 * Math.PI) < 1e-9);
  assert.deepEqual([d.kamera.s, d.kamera.ox, d.kamera.oy], [GENEL_KAMERA.s, GENEL_KAMERA.ox, GENEL_KAMERA.oy]);
  assert.ok(Math.abs(d.blok.opaklik - 1) < 1e-9);
  for (const g of d.kagitlar) assert.ok(Math.abs((g.opaklik ?? 1) - 1) < 1e-9, g.id);
  assert.equal(filmDurumu(K73).blok.opaklik, filmDurumu(K73 - 1).blok.opaklik);
});

test("v72 → v73 geçişinde modül yığınları sıçramaz: aynı görünen kâğıtlar, aynı yer, aynı opaklık", () => {
  const gorunen = (f: number, m: string) =>
    filmDurumu(f)
      .kagitlar.filter((g) => g.id === `modul-${m}` || g.id.startsWith(`kalkan-${m}`))
      .flatMap((g) => g.kagitlar.map((k) => ({ k, o: (g.opaklik ?? 1) * (k.opaklik ?? 1) })))
      .filter((x) => x.o > 0);
  for (const m of ["studio", "atolye"]) {
    const [a, b] = [gorunen(K73 - 1, m), gorunen(K73, m)];
    assert.equal(b.length, a.length, m);
    a.forEach((x, i) => {
      assert.ok(Math.abs(x.k.z0 - b[i].k.z0) < 1e-9 && Math.abs(x.o - b[i].o) < 1e-9, `${m} ${i}`);
      x.k.taban.forEach((p, j) => assert.ok(Math.hypot(p[0] - b[i].k.taban[j][0], p[1] - b[i].k.taban[j][1]) < 1e-9, `${m} ${i}`));
    });
  }
});

test("v82 = storyboard F10 (stil karesi): genel kamera, ince yığınlar, blok, hedef etiketleri, başlık, künye", () => {
  const f = kare(82);
  const d = filmDurumu(f);
  for (const p of [[0, 0, 0], [1.2, -0.7, 0.5], [-1.6, 1.5, 0.3]] as [number, number, number][]) {
    const [a, b] = [izd(p, d.kamera), izd(p, GENEL_KAMERA)];
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6, `${p}`);
  }
  assert.deepEqual(d.kagitlar.map((g) => g.id).sort(), ["modul-atolye", "modul-studio"]);
  const sekme = { studio: RENK.studio, atolye: RENK.atolye };
  for (const m of ["studio", "atolye"] as const) {
    const g = d.kagitlar.find((x) => x.id === `modul-${m}`)!;
    const ref = yiginUret({ cx: COCUK_YIGIN_YERI[m][0], cy: COCUK_YIGIN_YERI[m][1], adet: 3, tohum: MODUL_TOHUM[m], sapma: 0.02, sekme: sekme[m] }).kagitlar;
    assert.equal(g.kagitlar.length, 3);
    g.kagitlar.forEach((k, i) => k.taban.forEach((p, j) => assert.ok(Math.hypot(p[0] - ref[i].taban[j][0], p[1] - ref[i].taban[j][1]) < 1e-9, m)));
    assert.equal(g.kagitlar[2].sekme, sekme[m]);
  }
  assert.deepEqual([d.blok.opaklik, d.blok.z, d.blok.yuz, d.blok.iz], [1, 0, 1, null]);
  assert.deepEqual(d.etiketler.map((e) => e.id), ["cocuk-hedef-0", "cocuk-hedef-1", "cocuk-hedef-2"]);
  d.etiketler.forEach((e, i) => {
    const y = HEDEF_YERLESIMI[i];
    assert.deepEqual([e.capa, e.x, e.y, e.hiza, e.metin, e.nokta, e.gorunum, e.ilerleme, e.cikis], [y.capa, y.x, y.y, y.hiza, HEDEFLER[i].metin, RENK[HEDEFLER[i].modul], 1, 1, 0]);
  });
  assert.deepEqual(d.metinler.map((m) => [m.id, m.satirlar, m.top, m.boyut, m.acilis]), [["cocuk-baslik", METIN.cocuk.baslik, 360, 104, [1, 1, 1]]]);
  assert.deepEqual([d.kunye, d.kunyeCikis, d.kartlar.length, d.kilitler.length, d.damga, d.yorungeler.length, d.arka, d.kapanis], [1, 0, 0, 0, null, 0, null, null]);
  assert.ok(d.itme > 0.97 && d.itme < 1.01, `${d.itme}`);
});

// Stil karesinde ölçülen çip genişlikleri (px; out/marka/stil-karesi.png, satır taraması) + 4 px pay.
const HEDEF_CIP_GENISLIGI: Record<string, number> = { "/r/ sesi": 166, "okuma akıcılığı": 272, "sıra beklemek": 256 };

test("Çocuk'un hedef çipleri kamera itmesiyle 120–1800 px sütununda kalır", () => {
  for (let f = K73; f < kare(COCUK.yorunge) + 12; f++) {
    const d = filmDurumu(f);
    const ekran = (x: number) => d.odak[0] + (x - d.odak[0]) * d.itme;
    for (const e of d.etiketler.filter((e) => e.id.startsWith("cocuk-hedef") && e.gorunum > 0)) {
      const w = HEDEF_CIP_GENISLIGI[e.metin];
      const [a, b] = e.hiza === "sol" ? [e.x, e.x + w] : [e.x - w, e.x];
      assert.ok(ekran(b) <= TUVAL_169.w - TUVAL_169.sol && ekran(a) >= TUVAL_169.sol, `f=${f} ${e.metin}: ${ekran(a).toFixed(0)}–${ekran(b).toFixed(0)}`);
    }
  }
});

test("hareket v72–100 boyunca sürekli ve hiç durmaz (son kareye dek)", () => {
  const kartItmesi = (d: ReturnType<typeof filmDurumu>) => d.kapanis?.itme ?? 1;
  for (let f = K73 - 1; f < SON_KARE; f++) {
    const a = filmDurumu(f);
    const b = filmDurumu(f + 1);
    assert.ok(Math.abs(b.itme - a.itme) < 0.025, `itme f=${f}`);
    assert.ok(Math.abs(b.kamera.don - a.kamera.don) < 0.1, `don f=${f}`);
    assert.ok(Math.abs(b.kamera.s - a.kamera.s) < 1.5, `s f=${f}`);
    assert.ok(Math.abs(b.kamera.ox - a.kamera.ox) < 20 && Math.abs(b.kamera.oy - a.kamera.oy) < 20, `o f=${f}`);
    const hareket = Math.abs(b.itme - a.itme) > 5e-5 || Math.abs(b.kamera.don - a.kamera.don) > 1e-4 || Math.abs(kartItmesi(b) - kartItmesi(a)) > 5e-5;
    assert.ok(hareket, `donuk f=${f}`);
  }
});

test("kapanışta yığınlar bloğun, yörüngeler yığınların ekran kutusuna girmez (iki katman ayrılırken sıra değişmez)", () => {
  const kutu = (ps: [number, number][]) => ({ x0: Math.min(...ps.map((p) => p[0])), x1: Math.max(...ps.map((p) => p[0])), y0: Math.min(...ps.map((p) => p[1])), y1: Math.max(...ps.map((p) => p[1])) });
  const kesisir = (a: ReturnType<typeof kutu>, b: ReturnType<typeof kutu>) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  for (let f = kare(COCUK.yorunge); f <= kare(KAPANIS.donusum); f += 2) {
    const d = filmDurumu(f);
    const k = d.kamera;
    const blok = kutu([-0.5, 0.5].flatMap((x) => [-0.5, 0.5].flatMap((y) => [0, 1].map((z) => izd([x, y, z], k)))));
    const yorunge = kutu(d.yorungeler.flatMap((y) => y.cizgi));
    for (const g of d.kagitlar) {
      const y = kutu(g.kagitlar.flatMap((kg) => kg.taban.flatMap(([x, yy]) => [izd([x, yy, kg.z0], k), izd([x, yy, kg.z0 + kg.h], k)])));
      assert.ok(!kesisir(y, blok), `f=${f} ${g.id} bloğa biniyor`);
      if (d.yorungeler.length) assert.ok(!kesisir(y, yorunge), `f=${f} ${g.id} yörüngeye biniyor`);
    }
  }
});
```
Run: `node --test tests/marka-film.test.ts` → FAIL (üst kâğıt testi dışında: `d.kunyeCikis`/`d.yorungeler` yok, tabla −270°'de kalıyor).

- [ ] **Step 2: `filmDurumu.ts`'i uygula** — sırayla (her "Bul" metni dosyada birebir bir kez geçer):

1. Bul:
```ts
import type { CipDurumu, DamgaDurumu, EtiketDurumu, KartDurumu, KilitDurumu, MetinDurumu } from "./durumTipleri.ts";
```
Değiştir:
```ts
import type { ArkaCekilme, BlokIzi, CipDurumu, DamgaDurumu, EtiketDurumu, KapanisDurumu, KartDurumu, KilitDurumu, MetinDurumu, YorungeCizimi } from "./durumTipleri.ts";
import { cocukKapanisKatmani, cocukYiginlari } from "./cocukKapanis.ts";
```
2. Bul: `import { ATOLYE, DONUS, STUDIO, YUK } from "./olaylar.ts";` → Değiştir:
```ts
import type { Kagit } from "./nesneler.ts";
import { ATOLYE, COCUK, DONUS, KAPANIS, STUDIO, YUK } from "./olaylar.ts";
```
3. Bul: `import { BOLUMLER_169, kare } from "./zaman.ts";` → Değiştir: `import { BOLUMLER_169, kare, toplamKare } from "./zaman.ts";`
4. Bul: `export type { CipDurumu, DamgaDurumu, EtiketDurumu, KartDurumu, KilitDurumu, MetinDurumu } from "./durumTipleri.ts";` → Değiştir:
```ts
export type { ArkaCekilme, BlokIzi, CipDurumu, DamgaDurumu, EtiketDurumu, KapanisDurumu, KartDurumu, KilitDurumu, MetinDurumu, YorungeCizimi } from "./durumTipleri.ts";
```
5. Bul: `// sonraki bölümler aynı dünyada devam eder (tabla, blok, kâğıtlar, kamera). Plan 3A: v1–32; Plan 3B: v33–72.` → Değiştir:
```ts
// sonraki bölümler aynı dünyada devam eder (tabla, blok, kâğıtlar, kamera). Plan 3A: v1–32; Plan 3B: v33–72;
// Plan 3C: v73–100 (cocukKapanis.ts).
```
6. `FilmDurumu` tipinde Bul:
```ts
  /** opaklik: odak dışı soluklaştırma (Studio ve Atölye bölümlerinde blok %30'a iner). */
  blok: { z: number; aci: V3; yuz: number; opaklik: number };
```
Değiştir:
```ts
  /** opaklik: odak dışı soluklaştırma (Studio ve Atölye bölümlerinde blok %30'a iner). iz: kapanışta 2B yolu. */
  blok: { z: number; aci: V3; yuz: number; opaklik: number; iz: BlokIzi | null };
```
7. Bul:
```ts
  damga: DamgaDurumu | null;
  kunye: number;
};
```
Değiştir:
```ts
  damga: DamgaDurumu | null;
  kunye: number;
  /** Künyenin çıkışı (0 → 1, kapanış). */
  kunyeCikis: number;
  /** Kapanış yörüngeleri (blokla derinlik sıralı). */
  yorungeler: YorungeCizimi[];
  /** Kapanış: tabla ve yığınlar ayrı katmanda çekilir; null iken tek katman. */
  arka: ArkaCekilme | null;
  kapanis: KapanisDurumu | null;
};
```
8. Bul: `const cikisAri = (f: number, v: number) => ara(f, v, v + 12);` → Değiştir:
```ts
const cikisAri = (f: number, v: number) => ara(f, v, v + 12);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
```
9. Bul: `const ODAK = izd([0, 0, 0.5], GENEL_KAMERA);` → Değiştir:
```ts
const K85 = kare(COCUK.yorunge);
const K93 = kare(KAPANIS.donusum);
const SON_KARE = toplamKare(BOLUMLER_169) - 1;
const ODAK = izd([0, 0, 0.5], GENEL_KAMERA);
```
10. `tablaAcisi`'nde Bul:
```ts
  { f: K53 + 36, d: (-3 * Math.PI) / 2, e: Easing.inOut(Easing.sin) },
]);
```
Değiştir:
```ts
  { f: K53 + 36, d: (-3 * Math.PI) / 2, e: Easing.inOut(Easing.sin) },
  { f: K73, d: (-3 * Math.PI) / 2 },
  { f: K73 + 36, d: -2 * Math.PI, e: Easing.inOut(Easing.sin) },
]);
```
11. Bul (kamera izleri, dört satır):
```ts
// Kamera: genel plan → Studio yığını (s 120) → Atölye yığını (s 130, storyboard F8).
const kameraS = izlek([{ f: K33, d: 100 }, { f: K33 + 36, d: 120, e: e36 }, { f: K53, d: 120 }, { f: K53 + 36, d: 130, e: e36 }]);
const kameraOx = izlek([{ f: K33, d: 1340 }, { f: K33 + 36, d: 1335, e: e36 }, { f: K53, d: 1335 }, { f: K53 + 36, d: 1626, e: e36 }]);
const kameraOy = izlek([{ f: K33, d: 560 }, { f: K33 + 36, d: 650, e: e36 }, { f: K53, d: 650 }, { f: K53 + 36, d: 640, e: e36 }]);
```
Değiştir:
```ts
// Kamera: genel plan → Studio yığını (s 120) → Atölye yığını (s 130, storyboard F8) → Çocuk'ta yeniden genel plan (F10).
const G = GENEL_KAMERA;
const kameraS = izlek([{ f: K33, d: G.s }, { f: K33 + 36, d: 120, e: e36 }, { f: K53, d: 120 }, { f: K53 + 36, d: 130, e: e36 }, { f: K73, d: 130 }, { f: K73 + 36, d: G.s, e: e36 }]);
const kameraOx = izlek([{ f: K33, d: G.ox }, { f: K33 + 36, d: 1335, e: e36 }, { f: K53, d: 1335 }, { f: K53 + 36, d: 1626, e: e36 }, { f: K73, d: 1626 }, { f: K73 + 36, d: G.ox, e: e36 }]);
const kameraOy = izlek([{ f: K33, d: G.oy }, { f: K33 + 36, d: 650, e: e36 }, { f: K53, d: 650 }, { f: K53 + 36, d: 640, e: e36 }, { f: K73, d: 640 }, { f: K73 + 36, d: G.oy, e: e36 }]);
```
12. `yukDonusItmesi`'nde Bul:
```ts
  { f: K73, d: 1.03 },
]);
```
Değiştir:
```ts
  { f: K73, d: 1.03 },
  // Çocuk: kamera genel plana dönerken itme 1,01'e iner, sonra kadraj yavaşça geri çekilir (0,97; blok yalnız kalır,
  // etiket çipleri sağ kenar payında kalır); Kapanış'ta halkalar kapanırken yeniden iter. Doğrusal parçalar: hız hiç
  // sıfırlanmaz (≥ 0,00014/kare), donuk an olmaz.
  { f: K73 + 36, d: 1.01, e: Easing.inOut(Easing.cubic) },
  { f: K85 + 12, d: 0.97 },
  { f: K93, d: 1.0 },
  { f: SON_KARE, d: 1.02 },
]);

/** Çocuk'un modül yığınlarının başlangıcı: v73'ten bir kare önce çizilen kâğıtlar (bir kez hesaplanır). */
let cocukBaslangici: Record<ModulId, Kagit[]> | null = null;
const baslangic = (): Record<ModulId, Kagit[]> => {
  if (!cocukBaslangici) {
    const once = filmDurumu(K73 - 1).kagitlar;
    const al = (m: ModulId) => once.find((g) => g.id === `modul-${m}`)!.kagitlar;
    cocukBaslangici = { studio: al("studio"), atolye: al("atolye") };
  }
  return cocukBaslangici;
};
```
13. `filmDurumu` gövdesinde Bul:
```ts
  const m = f >= K33 ? modulKatmani(f) : null;
  const soluk = m?.soluk ?? { blok: 1, studio: 1, atolye: 1 };
```
Değiştir:
```ts
  const kamera: Kamera = { s: kameraS(f), ox: kameraOx(f), oy: kameraOy(f), don: tablaAcisi(f) };
  const itme = f < K9 ? a.kamera : yukDonusItmesi(f);
  const m = f >= K33 ? modulKatmani(f) : null;
  const ck = f >= K73 ? cocukKapanisKatmani(f, { kamera, itme, odak: ODAK }) : null;
  // Çocuk'ta odak dışı soluklaştırma, tabla son çeyreği dönerken kalkar.
  const soluk0 = m?.soluk ?? { blok: 1, studio: 1, atolye: 1 };
  const canlan = ck?.canlanma ?? 0;
  const soluk = { blok: lerp(soluk0.blok, 1, canlan), studio: lerp(soluk0.studio, 1, canlan), atolye: lerp(soluk0.atolye, 1, canlan) };
```
14. Bul: `  const kagitlar = kagitSahnesi(f).map((g) => {` → Değiştir: `  const modulKagitlari = kagitSahnesi(f).map((g) => {`
15. Bul:
```ts
    return g;
  });
  if (m) {
    etiketler.push(...m.etiketler);
    metinler.push(...m.metinler);
  }
```
Değiştir:
```ts
    return g;
  });
  // Çocuk'tan sonra modül yığınları incelip kenara kayar (yalnız modül yığınları kalmıştır).
  const kagitlar = f >= K73 ? cocukYiginlari(f, baslangic(), { studio: soluk.studio, atolye: soluk.atolye }) : modulKagitlari;
  if (m) {
    etiketler.push(...m.etiketler);
    metinler.push(...m.metinler);
  }
  if (ck) {
    etiketler.push(...ck.etiketler);
    metinler.push(...ck.metinler);
  }
```
16. `return` nesnesinde Bul:
```ts
    kamera: { s: kameraS(f), ox: kameraOx(f), oy: kameraOy(f), don: tablaAcisi(f) },
    itme: f < K9 ? a.kamera : yukDonusItmesi(f),
```
Değiştir:
```ts
    kamera,
    itme,
```
17. Bul: `    blok: { z: a.blokZ, aci: a.blokAci, yuz: a.yuz, opaklik: soluk.blok },` → Değiştir:
```ts
    blok: { z: a.blokZ, aci: a.blokAci, yuz: a.yuz, opaklik: soluk.blok, iz: ck?.blokIzi ?? null },
```
18. Bul:
```ts
    kunye: ara(f, kunyeKare - 10, kunyeKare),
  };
```
Değiştir:
```ts
    kunye: ara(f, kunyeKare - 10, kunyeKare),
    kunyeCikis: ck?.kunyeCikis ?? 0,
    yorungeler: ck?.yorungeler ?? [],
    arka: ck?.arka ?? null,
    kapanis: ck?.kapanis ?? null,
  };
```
- [ ] **Step 3:** `node --test tests/marka-film.test.ts` → `ℹ fail 0` (6 yeni test dahil). `npm test && npm run typecheck` → `ℹ pass 243`, `ℹ fail 0`. "v72 → v73 geçişi" kırılırsa `filmDurumu(K73 − 1)`'in Atölye yığınını yazdır (b844832'den sonra üst kâğıt çapraz geçişi değiştiyse görünen kâğıt listesi farklı olabilir), raporla.
- [ ] **Step 4: Commit** — `git add src/marka/filmDurumu.ts tests/marka-film.test.ts` → `feat(promo/marka): film durumu Çocuk ve Kapanış (tabla −360°, geri çekilme, katman)`

---

### Task 7: Yörünge, logo kilidi, düğme bileşenleri (`sahne3b.tsx`, `yazi.tsx`)

**Files:** Modify `promo/src/marka/sahne3b.tsx`, `promo/src/marka/yazi.tsx`

- [ ] **Step 1: `sahne3b.tsx`** — Bul:
```tsx
export type SahneOgesi = { p: V3; opaklik?: number; ciz: React.ReactNode };
```
Değiştir:
```tsx
/** d: verilirse sıralama anahtarı (derinlik(p) yerine); kapanış yörüngelerinin ön/arka koşuları bloğa (0) göre ±1 alır. */
export type SahneOgesi = { p: V3; d?: number; opaklik?: number; ciz: React.ReactNode };
```
Bul: `      .map((o, i) => ({ o, i, d: derinlik(o.p, k) }))` → Değiştir: `      .map((o, i) => ({ o, i, d: o.d ?? derinlik(o.p, k) }))`
Dosya sonuna ekle:
```tsx

const cizgi = (ps: V2[]) => ps.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join("");

/** Kapanış yörüngesinin bir koşusu: ink kılıf (dolgu + iki yanda CIZGI.ince) üstünde turuncu dolgu, yuvarlak uçlu.
 *  Kılıf turuncu halkanın turuncu bloğun önünden geçtiği yerde görünmesini sağlar; logoya dönüşürken söner. */
export const Yorunge: React.FC<{ cizgi: V2[]; dolgu: V2[]; kalinlik: number; kilif: number; opaklik: number }> = ({ cizgi: c, dolgu, kalinlik, kilif, opaklik }) =>
  opaklik <= 0 ? null : (
    <g opacity={opaklik}>
      {kilif > 0 ? (
        <path d={cizgi(c)} fill="none" stroke={RENK.ink} strokeOpacity={kilif} strokeWidth={kalinlik + 2 * CIZGI.ince} strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
      <path d={cizgi(dolgu)} fill="none" stroke={RENK.turuncu} strokeWidth={kalinlik} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
```
- [ ] **Step 2: `yazi.tsx` — içe aktarma ve `MetinBlogu.ortala`**

Bul: `import { CIP, DAMGA_BOYUT, FONT, RENK, TUVAL_169 } from "./tema.ts";` → Değiştir:
```tsx
import { CIP, DAMGA_BOYUT, DUGME, FONT, LOGO_VIEWBOX, RENK, TUVAL_169 } from "./tema.ts";
```
`MetinBlogu`'da Bul:
```tsx
  genislik?: number;
  sol?: number;
}> = ({ satirlar, top, font, boyut, agirlik, renk, opaklik = 1, acilis, genislik, sol = TUVAL_169.sol }) => (
  <div
    style={{
      position: "absolute",
      left: sol,
      maxWidth: genislik,
      top,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
```
Değiştir:
```tsx
  genislik?: number;
  sol?: number;
  /** Satırları tuvalin ortasına hizalar (kapanış sloganı); sol ve genislik yok sayılır. */
  ortala?: boolean;
}> = ({ satirlar, top, font, boyut, agirlik, renk, opaklik = 1, acilis, genislik, sol = TUVAL_169.sol, ortala = false }) => (
  <div
    style={{
      position: "absolute",
      ...(ortala ? { left: 0, right: 0 } : { left: sol, maxWidth: genislik }),
      top,
      display: "flex",
      flexDirection: "column",
      alignItems: ortala ? "center" : "flex-start",
```
- [ ] **Step 3: `yazi.tsx` — `Hap`'ı `Cip`'ten ayır.** `/** Hap çip. hiza "sol": …` belge yorumuyla başlayıp `Cip` bileşeninin kapanışına (`};`) dek olan bloğu şununla değiştir (görünüm birebir aynı; hap artık akış içinde de kullanılabilir):
```tsx
/** Hap: çipin kendisi, akış içinde (kapanış satırı). nokta: modül rengi; gorunum 0–1 bulanıktan netleşme
 *  (spec: 16 px → 0 + opaklık). gorunum 0'da da yer kaplar: satırdaki komşular kaymaz. */
export const Hap: React.FC<{ metin: string; nokta?: string; gorunum?: number }> = ({ metin, nokta, gorunum = 1 }) => (
  <div
    style={{
      height: 54,
      padding: `0 ${CIP.yan}px`,
      display: "flex",
      alignItems: "center",
      gap: 10,
      borderRadius: 999,
      background: RENK.kagitBeyaz,
      border: `${CIP.kenar}px solid ${RENK.ink}`,
      boxSizing: "border-box",
      fontFamily: FONT.govde,
      fontWeight: 700,
      fontSize: CIP.boyut,
      color: RENK.ink,
      whiteSpace: "nowrap",
      opacity: gorunum,
      filter: gorunum < 1 ? `blur(${(1 - gorunum) * 16}px)` : undefined,
    }}
  >
    {nokta ? <span style={{ width: 16, height: 16, borderRadius: 8, background: nokta, border: `2px solid ${RENK.ink}`, boxSizing: "border-box" }} /> : null}
    {metin}
  </div>
);

/** Hap çip (mutlak konumlu). hiza "sol": sol kenarı x'te; "sag": sağ kenarı x'te. Dikeyde y'ye ortalı. */
export const Cip: React.FC<{ x: number; y: number; metin: string; hiza?: Hiza; nokta?: string; gorunum?: number }> = ({ x, y, metin, hiza = "sol", nokta, gorunum = 1 }) => {
  const { width } = useVideoConfig();
  if (gorunum <= 0) return null;
  return (
    <div style={{ position: "absolute", top: y, ...(hiza === "sol" ? { left: x } : { right: width - x }), transform: "translateY(-50%)" }}>
      <Hap metin={metin} nokta={nokta} gorunum={gorunum} />
    </div>
  );
};
```
(Cila ajanı `Cip`'in stil sayılarını değiştirdiyse aynı sayıları `Hap`'a taşı.)
- [ ] **Step 4: `yazi.tsx` — kapanış bileşenleri.** Dosya sonuna ekle:
```tsx

/** Resmî logo kilidi (ludenlab-logo.svg): sol üst (x, y), genişlik w; gorunum 0–1 bulanıktan netleşme (16 px → 0). */
export const LogoKilidi: React.FC<{ x: number; y: number; w: number; gorunum: number }> = ({ x, y, w, gorunum }) =>
  gorunum <= 0 ? null : (
    <Img
      src={staticFile("brand/ludenlab-logo.svg")}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: (w * LOGO_VIEWBOX.h) / LOGO_VIEWBOX.w,
        opacity: gorunum,
        filter: gorunum < 1 ? `blur(${(1 - gorunum) * 16}px)` : undefined,
      }}
    />
  );

/** ludenlab.com düğmesi (Poster): turuncu yüz, ink kenar, blursuz ofset gölge (DUGME). basma 0–1: yüz gölgenin
 *  üstüne iner (gölge yüzün altında kaybolur). gorunum 0–1 bulanıktan netleşme; 0'da da yer kaplar. */
export const Dugme: React.FC<{ metin: string; gorunum: number; basma: number }> = ({ metin, gorunum, basma }) => (
  <div style={{ position: "relative", marginRight: DUGME.golge, marginBottom: DUGME.golge, opacity: gorunum, filter: gorunum < 1 ? `blur(${(1 - gorunum) * 16}px)` : undefined }}>
    <div style={{ position: "absolute", left: DUGME.golge, top: DUGME.golge, width: "100%", height: "100%", borderRadius: DUGME.kose, background: RENK.ink }} />
    <div
      style={{
        position: "relative",
        transform: `translate(${DUGME.golge * basma}px, ${DUGME.golge * basma}px)`,
        height: DUGME.yukseklik,
        padding: `0 ${DUGME.yan}px`,
        display: "flex",
        alignItems: "center",
        borderRadius: DUGME.kose,
        background: RENK.turuncu,
        border: `3px solid ${RENK.ink}`,
        boxSizing: "border-box",
        fontFamily: FONT.govde,
        fontWeight: 700,
        fontSize: DUGME.boyut,
        color: RENK.ink,
        whiteSpace: "nowrap",
      }}
    >
      {metin}
    </div>
  </div>
);

/** Kapanış çağrı satırı: tuval ortasında Studio ve Atölye hapları + ludenlab.com düğmesi; top satırın üst kenarı. */
export const CagriSatiri: React.FC<{
  top: number;
  cipler: { metin: string; nokta: string; gorunum: number }[];
  dugme: { metin: string; gorunum: number; basma: number };
}> = ({ top, cipler, dugme }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", justifyContent: "center", alignItems: "center", gap: 22 }}>
    {cipler.map((c) => (
      <Hap key={c.metin} metin={c.metin} nokta={c.nokta} gorunum={c.gorunum} />
    ))}
    <Dugme metin={dugme.metin} gorunum={dugme.gorunum} basma={dugme.basma} />
  </div>
);
```
- [ ] **Step 5: Doğrula (Cip ayrımı görüntüyü değiştirmedi)**
```bash
npm run typecheck && npm test
npm run marka:stil
python3 -c "from PIL import Image, ImageChops; a=Image.open('out/marka/stil-karesi.png').convert('RGB'); b=Image.open('out/marka/ref-3c-stil.png').convert('RGB'); print(ImageChops.difference(a,b).getbbox())"
npx remotion still src/index.ts MarkaFilmi169 out/marka/k3c-500.png --frame=500 --timeout=120000
python3 -c "from PIL import Image, ImageChops; a=Image.open('out/marka/k3c-500.png').convert('RGB'); b=Image.open('out/marka/ref-3c-500.png').convert('RGB'); print(ImageChops.difference(a,b).getbbox())"
```
Expected: tsc temiz, `ℹ pass 243`, iki `None` (kare 500'de Dönüş çipleri `Cip` ile çizilir). `None` değilse DUR, fark kutusunu raporla.
- [ ] **Step 6: Commit** — `git add src/marka/sahne3b.tsx src/marka/yazi.tsx` → `feat(promo/marka): yörünge, logo kilidi, hap ve ludenlab.com düğmesi`

---

### Task 8: Sahne çizimi ve v73–100 render'ı

**Files:** Modify `promo/src/marka/FilmSahnesi.tsx`

- [ ] **Step 1: `FilmSahnesi.tsx`** — önce `git diff 64a7e4b -- src/marka/FilmSahnesi.tsx` boş olmalı (Plan 3B'den beri değişmedi). Boş değilse o değişiklikleri aşağıdaki sürüme taşı. Dosyanın tamamını şununla değiştir:
```tsx
import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { DUSUS_YUKSEKLIGI } from "./acilisDurumu.ts";
import type { FilmDurumu, KapanisDurumu } from "./filmDurumu.ts";
import { izd, type V3 } from "./izometri.ts";
import { BLOK_MERKEZ, Blok, DerinlikSirali, HavaGolgesi, KagitListesi, NoktaliCizgi, Tabla, Tanimlar, Yorunge, Yuva, type SahneOgesi } from "./sahne3b.tsx";
import { ETIKETLER } from "./metin.ts";
import { RENK } from "./tema.ts";
import { CagriSatiri, Cikis, CiktiKarti, Cip, Damga, Etiket, Kilit, Kunye, LogoKilidi, MetinBlogu, Zemin } from "./yazi.tsx";

/** Kapanış kartı: logo kilidi, slogan ve çağrı satırı birlikte ekran ortası etrafında yavaşça iter. */
const KapanisKarti: React.FC<{ d: KapanisDurumu }> = ({ d }) => (
  <div style={{ position: "absolute", inset: 0, transform: `scale(${d.itme})`, transformOrigin: "960px 540px" }}>
    <LogoKilidi x={d.logo.x} y={d.logo.y} w={d.logo.w} gorunum={d.logo.gorunum} />
    {d.slogan.acilis > 0 ? (
      <MetinBlogu satirlar={[d.slogan.metin]} top={d.slogan.top} font="govde" boyut={44} agirlik={600} renk={RENK.ink} opaklik={0.85} acilis={[d.slogan.acilis]} ortala />
    ) : null}
    <CagriSatiri top={d.cagri.top} cipler={d.cagri.cipler} dugme={d.cagri.dugme} />
  </div>
);

// Filmin tek sahnesi: durum → kare. Zemin sabit; tabla, kâğıtlar, blok ve etiketler kameranın itmesiyle birlikte
// odak (blok) etrafında ölçeklenir; metin sütunu, çipler ve künye kameradan bağımsız. Kapanışta (durum.arka) tabla
// ve yığınlar ayrı bir SVG katmanında bulanıklaşarak çekilir; blok ve yörüngeler üstteki katmanda kalır.
export const FilmSahnesi: React.FC<{ durum: FilmDurumu }> = ({ durum }) => {
  const { width, height } = useVideoConfig();
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
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Zemin isik={durum.isik} kayma={durum.kayma} />
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
      {durum.kapanis ? <KapanisKarti d={durum.kapanis} /> : null}
      {durum.kunye > 0 ? (
        <Cikis c={durum.kunyeCikis} koken="center top">
          <Kunye opaklik={durum.kunye} />
        </Cikis>
      ) : null}
    </AbsoluteFill>
  );
};
```
- [ ] **Step 2:** `npm run typecheck && npm test` → temiz, `ℹ pass 243`, `ℹ fail 0`.
- [ ] **Step 3: Önceki bölümler değişmedi (piksel)**
```bash
for f in 500 1000 1290; do npx remotion still src/index.ts MarkaFilmi169 out/marka/k3c-$f.png --frame=$f --timeout=120000; done
python3 -c "
from PIL import Image, ImageChops
for f in (500, 1000, 1290):
    a = Image.open(f'out/marka/k3c-{f}.png').convert('RGB'); b = Image.open(f'out/marka/ref-3c-{f}.png').convert('RGB')
    print(f, ImageChops.difference(a, b).getbbox())"
```
Expected: `500 None`, `1000 None`, `1290 None`. Değilse DUR.
- [ ] **Step 4: v73–100 render'ı ve kareler**
```bash
npm run marka:muzik && npm run marka:film -- --frames=1290-1799 --timeout=120000 && mv out/marka/film-169.mp4 out/marka/film-169-v73-100.mp4
for n in 0 15 24 30 42 78 114 168 222 260 290 312 330 348 366 378 390 396 402 406 420 423 438 509; do ffmpeg -v error -y -i out/marka/film-169-v73-100.mp4 -vf "select=eq(n\,$n)" -vframes 1 out/marka/film3c-k$n.png; done
ffmpeg -v error -y -i out/marka/film-169-v73-100.mp4 -vf "select=not(mod(n\,6)),scale=384:-1,tile=8x11" -frames:v 1 out/marka/film-v73-100-kontak.png
python3 -c "
from PIL import Image
a = Image.open('out/marka/film3c-k168.png').convert('RGB'); b = Image.open('out/marka/ref-3c-stil.png').convert('RGB')
Image.blend(a, b, 0.5).save('out/marka/film3c-f10-karisim.png')
c = Image.open('out/marka/film3c-k348.png')
w = Image.new('RGB', (1280, 320), 'white')
for i, (x, y) in enumerate([(1310, 345), (1310, 600), (1170, 470), (1430, 470)]):
    w.paste(c.crop((x, y, x + 80, y + 80)).resize((320, 320), Image.NEAREST), (320 * i, 0))
w.save('out/marka/film3c-ekler.png')"
npm run elestiri -- out/marka/film-169-v73-100.mp4
```
(Klipteki n, filmde 1290 + n'dir. Render ~40 sn.) Karelere Read ile bak ve doğrula:
1. **Atölye çıkışı (k0, k15):** Atölye kartı, damgası, kilidi ve yazıları K73 + 12'de (n18) gitmiş; o sütunda Çocuk başlığı henüz yok (k15'te "VA" + bulanık "ATÖLYE" OLMAMALI).
2. **Dönüş ve incelme (k15–k42):** tabla dönüyor, kamera geri çekiliyor; iki yığının üst kâğıtları tepeden başlayarak kalkıp sönüyor (Atölye'nin üst kâğıdı geri gelmiyor); yığınlar bloğun yanından geçerken bloğa değmiyor; blok ve Studio yığını soluklukta kalmıyor (k42'de tam renk).
3. **Başlık (k24–k78):** "VAKTİN" k24'te (v74) açılmaya başlıyor, "ÇOCUĞA", "KALSIN." ardından; satırlar sütunda, künyeye değmiyor.
4. **Etiketler (k78–k114):** `/r/ sesi` (mavi), `okuma akıcılığı` (sarı), `sıra beklemek` (mavi) sırayla varıyor, raptiyeler bloğun üst yüzünde ve tablada; çipler 1800 px'i aşmıyor.
5. **F10 (k168, `film3c-f10-karisim.png`):** stil karesiyle aynı sahne; fark yalnız kenarlarda ~%1,6'lık ölçek (çift çizgi), blok ve yığınlar üst üste.
6. **Yörünge A (k222–k312):** etiketler v85'te bulanıklaşıp gidiyor; turuncu, ink kılıflı halka sol uçtan başlayıp önden sağa, sonra bloğun arkasından (üst köşede gizlenerek) sol uca dönüyor; yığınlara değmiyor; k312'de (v90) kapalı.
7. **Çekilme (k294–k330):** "HER ŞEY / ÇOCUĞUN / ETRAFINDA." v89–91; tabla ve yığınlar bulanıklaşıp küçülerek sönüyor; bloğun nokta dokusu keskin (ayrı katman); B kalkmaya başlıyor.
8. **İki yörünge (k348, `film3c-ekler.png`):** B dikey, sol yayı bloğun önünden geçiyor, sağ yayı arkasında; A'nın ön yayı bloğun altından geçiyor; ek yerlerinde (B'nin tepesi/dibi, A'nın iki ucu) tüpü kesen ince ink çizgi YOK.
9. **Künye (k348–k366):** künye v92–93'te bulanıklaşıp gidiyor; başlık v93'te çıkıyor.
10. **Dönüşüm (k366–k406):** halkalar düzleşip dönerek sola-yukarı taşınıyor ve küçülüyor; blok kesişime akıp kayboluyor (k396'da görünmez); k396'da bulanık logo kilidi ile halkalar aynı yörüngelerde (kayık hayalet yok); k402'de logo neredeyse net (≤ 4 px bulanık), halkalar son kez sönüyor; k406'da halkalar tümüyle gitmiş, logo net.
11. **Kart (k402–k438):** slogan ortada maskeyle; `Studio`, `Atölye` hapları ve turuncu `ludenlab.com` düğmesi ortada, 120 px kenar payının içinde; k420'de (v96) düğme tam görünür ve henüz basılmamış (8 px gölge), k423'te tam basılı (gölge yok), k438'de yarı basılı (4 px gölge).
12. **Son (k438–k509):** kart çok yavaş büyüyor; hiçbir öğe kadraj dışına taşmıyor.

Eleştiri: `donuk anlar (≥0,5 sn): yok`. Ani ses anları arasında ~2,6 / 3,2 / 3,8 sn (v77–79 tıkları), ~12,2 sn (çan) ve ~14,0 sn (düğme tıkı) bulunur (müzik başka anlar da ekler). Bir madde tutmazsa ilgili değeri (`cocukKapanis.ts` zamanları, `yerlesim.ts` yerleri, `filmDurumu.ts` itme) düzelt, testleri ve render'ı yeniden koş, raporla.
- [ ] **Step 5: Commit** — `git add src/marka/FilmSahnesi.tsx` → `feat(promo/marka): Çocuk ve Kapanış sahnesi (v73–100)`

---

### Task 9: Tam 16:9 film (resim kilidi)

**Files:** yok (yalnız render ve denetim)

- [ ] **Step 1: İki sürümü bas** (sfx + müzik üretir; seslendirme mp3'leri hazırdır, TTS çalışmaz):
```bash
npm run marka:render -- 169
```
Expected (her sürüm için bir satır): `ludenlab-marka-169: basım … sn … → -16.x LUFS (gerçek tepe ≤ -1.0 dBFS) …` ve `ludenlab-marka-169-vo: …`; toplam ~5 dk.
- [ ] **Step 2: Föyler ve eleştiri**
```bash
ffmpeg -v error -y -i out/marka/ludenlab-marka-169.mp4 -vf "select=not(mod(n\,30)),scale=320:-1,tile=6x10" -frames:v 1 out/marka/film-169-kontak.png
npm run elestiri -- out/marka/ludenlab-marka-169.mp4
npm run elestiri -- out/marka/ludenlab-marka-169-vo.mp4
npm run marka:render -- kapak
```
Kontak föyüne (60 kare, saniyede bir) ve eleştiri föylerine Read ile bak:
1. v1–72 önceki render'larla aynı akıyor; v72 → v73 geçişinde (0:43) sıçrama yok.
2. Çocuk (0:43–0:53) F10'a oturuyor; Kapanış (0:53–1:00) yörüngeler → logo → kart.
3. Her iki raporda `donuk anlar (≥0,5 sn): yok`; ses −16 LUFS ± 0,5, gerçek tepe ≤ −1,0 dBFS.
4. Telefon föyünde (360 px) kapanış kartındaki slogan ve düğme yazısı okunur.
5. VO'lu sürümde "Luden Lab." (v94) logo kilidi belirirken duyuluyor (kulakla ya da `ani ses anları` ile ~55,8 sn).
6. Kapak (`out/marka/ludenlab-marka-kapak.png`, kare(84) = 1494): F10 düzeni, üç etiket, başlık; kadraj dışına taşan yok.
Bir madde tutmazsa DUR ve raporla (ses seviyesi/ducking Plan 3D'nin, görüntü bu planın işidir).
- [ ] **Step 3: Kayıt** — kod değişmediyse commit yok. Raporla: iki eleştiri raporunun satırları, render süreleri, kontak föyünün yolu.

## Plan 3D'ye / Plan 4'e devredilenler

- **9:16 kesim** (Çocuk v37–42, Kapanış v43–50): `KAPANIS_YERI` ve kamera 16:9'a göre; dikeyde logo kilidi, slogan ve çağrı satırı yeniden yerleşir (Instagram güvenli alanı: üst 200, alt 320 px). Yörünge geometrisi (`yorunge.ts`) ve dönüşüm aynen kullanılır; yalnız hedef elipsler yeni logo yerinden hesaplanır.
- **Kapak karesi:** `kapak.ts` `KAPAK_KARE = kare(84)`; artık F10 düzenini gösterir (itme 0,975). İstenirse v82 (itme 0,984, F10'a en yakın) ya da kapanış kartı (≥ 1720) seçilebilir.
- **Ses:** çan (v93) müziğin son akoruyla aynı vuruşta; ikisinin dengesi ve "Luden Lab" seslendirmesiyle çakışması Plan 3D miksinde dinlenir. Etiket tıkları (perde 0,8) ve düğme tıkı efekt izindedir.
- **Açık risk:** `MetinBlogu` maskesi ve `Hap`/`Dugme` bulanıklığı Chrome'a bağlı; başka bir render motorunda ek yeri ve piksel denetimleri yeniden koşulmalı.
