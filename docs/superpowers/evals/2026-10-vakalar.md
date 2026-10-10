# Değerlendirme vakaları (2026-10)

Üretildi: 2026-10-10T07:53:18.565Z · kaynak dal ucu: `cf4819a`

**Onay için:** her aracın vakalarını okuyup onaylayın ya da düzeltin. Düzeltme `apps/hub/evals/tools/<modül>/<araç>/cases.json`'da yapılır, doküman yeniden üretilir (`cd apps/hub && node_modules/.bin/vitest run --config vitest.eval.config.ts evals/vakaListesi.eval.ts`). Taban koşusundan sonra değişen vaka YENİ kimlik alır (ör. `hw-02` → `hw-02b`), eski kimlik silinir; böylece `ref/<eski>` referansı çakışmaz.

Bu dosya üretilir, elle düzenlenmez. Yaşlar 2026-10-12 tarihine göre hesaplanır. Gövde sütunu, uygulamanın aracına gönderilen istek alanlarını yazar (`—` boş/yok demektir).

## Özet

| Araç | Kimlik | Modül | Vaka | Öğrencili vaka |
|---|---|---|---|---|
| Sosyal hikâye (Studio) | `studio/social-story` | Studio | 4 | 4 |
| Artikülasyon alıştırması (Studio) | `studio/articulation` | Studio | 16 | 12 |
| Ev ödevi materyali (Studio) | `studio/homework` | Studio | 4 | 4 |
| Oturum özeti (Studio) | `studio/session-summary` | Studio | 4 | 4 |
| Haftalık çalışma planı (Studio) | `studio/weekly-plan` | Studio | 4 | 4 |
| İletişim panosu (Studio, AAC) | `studio/comm-board` | Studio | 4 | 3 |
| Kelime eşleştirme oyunu (Studio) | `studio/matching-game` | Studio | 4 | 3 |
| Sesletim oyunu (Studio) | `studio/phonation` | Studio | 4 | 3 |
| Öğrenme kartı üreticisi (Studio) | `studio/cards` | Studio | 4 | 3 |
| AI öğrenci profili (Studio) | `studio/ai-profile` | Studio | 4 | 4 |
| BEP hedef taslağı (Atölye) | `atolye/bep` | Atölye | 4 | 4 |
| Seans planı (Atölye) | `atolye/seans-plani` | Atölye | 4 | 4 |
| Davranış destek planı (Atölye) | `atolye/davranis` | Atölye | 4 | 4 |
| Okuma akıcılık seti (Atölye) | `atolye/okuma` | Atölye | 4 | 4 |
| Matematik destek seti (Atölye) | `atolye/matematik` | Atölye | 4 | 4 |
| Çok duyulu materyal (Atölye) | `atolye/materyal` | Atölye | 4 | 4 |
| Uyarlama önerisi (Atölye) | `atolye/uyarlama` | Atölye | 4 | 4 |
| Sosyal öykü (Atölye) | `atolye/sosyal-oyku` | Atölye | 4 | 4 |
| Veli mektubu (Atölye) | `atolye/veli-mektubu` | Atölye | 4 | 4 |
| Ev ödevi programı (Atölye) | `atolye/ev-odevi` | Atölye | 4 | 4 |
| İlerleme çizelgesi (Atölye) | `atolye/ilerleme-cizelgesi` | Atölye | 4 | 4 |
| **Toplam** | | | **96** | **88** |

## Studio

### Sosyal hikâye (Studio) — `studio/social-story` (4 vaka)

| Vaka | Öğrenci | Etiketler | Neyi sınıyor | Gövde |
|---|---|---|---|---|
| ss-01 | Ela Şahin (stu-ela)<br>6 yaş · language<br>Otizm spektrum bozukluğu, hafif düzey; ifade edici dil gecikmesi. Rutin değişikliklerinde kaygı. | öğrencili, zengin bağlam, kısa | OSB + geçiş kaygısı: rutin/görsel ipucunun hikâyeye girmesi, ilgi alanının (tren/dinozor) kullanımı, yaşa uygun kısa cümle. | situation: Oyun saati bitince tabletten ayrılmak · environment: Ev · length: short |
| ss-02 | Ela Şahin (stu-ela)<br>6 yaş · language<br>Otizm spektrum bozukluğu, hafif düzey; ifade edici dil gecikmesi. Rutin değişikliklerinde kaygı. | öğrencili, zengin bağlam, orta | Perspektif cümlesi (öğretmen ne hisseder); son kartlarla (sıra bekleme) süreklilik; duyusal yüklenme notunun dikkate alınması; durum metnindeki gerçek adın rumuzlanması. | situation: Ela'nın sınıfta söz almak için el kaldırıp beklemesi · environment: Okul · length: medium |
| ss-03 | Kerem Ateş (stu-kerem)<br>9 yaş · speech<br>Artikülasyon bozukluğu: /r/ sesini /l/ ile değiştiriyor (araba → alaba). Kekemelik yok. | öğrencili, boş bağlam, orta | Konuşma alanlı, notsuz öğrencide özgüllük: yaşa uygun kelime; tanıya (artikülasyon) uygunsuz gönderme yapmaması. | situation: Markette istediği şeker alınmayınca sakin kalmak · environment: Market · length: medium |
| ss-04 | Kerem Ateş (stu-kerem)<br>9 yaş · speech<br>Artikülasyon bozukluğu: /r/ sesini /l/ ile değiştiriyor (araba → alaba). Kekemelik yok. | öğrencili, uzun, tıbbi ortam | Uzun biçim bütçesi (11–15 cümle); hastane ortamında 'hasta' dili kaçağı; yönlendirici cümlelerde 'yapabilirim' dili; Gray'in gerçeğe uygunluk ilkesi: 'hiç acımaz' gibi vaat yok ('biraz acıyabilir, kısa sürer'). | situation: Hastanede kan tahlili sırasında bekleyip kolunu uzatmak · environment: Hastane · length: long |

### Artikülasyon alıştırması (Studio) — `studio/articulation` (16 vaka)

| Vaka | Öğrenci | Etiketler | Neyi sınıyor | Gövde |
|---|---|---|---|---|
| art-01 | Kerem Ateş (art-kerem)<br>5 yaş · speech<br>Çocukluk çağı konuşma apraksisi şüphesi. /r/ sesini hiç üretemiyor, yerine /l/ ya da /y/ kullanıyor (araba → alaba). Taklitte de zorlanıyor. | izole ses, öğrencili | Apraksi şüphesinde /r/ için yerleşim ipuçlarının özgüllüğü; izole düzeyde uydurma örüntü üretmemesi. | targetSounds: /r/ · positions: initial · level: isolated · itemCount: 10 |
| art-02 | Duru Şahin (art-duru)<br>7 yaş · hearing<br>İki kulakta hafif-orta sensörinöral işitme kaybı, işitme cihazı kullanıyor. /s/ ile /ş/ seslerini ayırt etmekte ve üretmekte zorlanıyor. | izole ses, öğrencili, çok sesli | İşitme kaybında /s/–/ş/ ayrımı: işitsel yerine görsel/dokunsal ipuçlarına ağırlık vermesi; iki sesi karıştırmaması. | targetSounds: /s/, /ş/ · positions: initial · level: isolated · itemCount: 10 |
| art-03 | Emir Ali (art-emir)<br>4 yaş · speech<br>Fonolojik süreç: öne alma. /k/ yerine /t/ kullanıyor (kedi → tedi, kek → tet). | hece, öğrencili | Öne alma sürecinde /k/ heceleri: açık/kapalı hece etiketinin doğruluğu, sonda /k/ ile kapalı hece, 4 yaşa uygunluk. | targetSounds: /k/ · positions: initial, final · level: syllable · itemCount: 15 |
| art-04 | — | hece, öğrencisiz | Öğrenci bilgisi olmadan ortada /ş/: hecenin örnek kelimede gerçekten ortada geçmesi, 20 öğede tekrar etmemesi. | targetSounds: /ş/ · positions: medial · level: syllable · itemCount: 20 |
| art-05 | Ada Nur Çelik (art-ada)<br>8 yaş · language<br>Okuma-yazma sürecinde yumuşak g içeren kelimelerde harf atlıyor; konuşmada ğ'den önceki ünlünün uzadığını fark etmiyor. | hece, öğrencili, sınır vaka | Türkçede başta /ğ/ olmaz: imkânsız pozisyonu fark edip geçersiz hece uydurmaması, ortada doğru heceler vermesi. | targetSounds: /ğ/ · positions: initial, medial · level: syllable · itemCount: 10 |
| art-06 | Yusuf Demir (art-yusuf)<br>6 yaş · speech<br>Dudak-damak yarığı onarımı sonrası (2 yaşında opere). /r/ ve /k/ seslerinde gırtlaktan (glottal) üretim eğilimi var. | hece, öğrencili, uzun liste | Dudak-damak yarığı sonrası /r/: üç pozisyonda 25 hece (uzun çıktı), yarığa özgü klinik notlar. | targetSounds: /r/ · positions: initial, medial, final · level: syllable · itemCount: 25 |
| art-07 | Zeynep Kaya (art-zeynep)<br>6 yaş · speech<br>Dişler arası (interdental) sigmatizm: /s/ ve /z/ üretiminde dil ucu dişlerin arasından çıkıyor. | kelime, öğrencili | Kelimeler bankadan gelir; model yalnız not yazar. Dişler arası sigmatizme özgü uzman notu ve items'ı boş bırakma talimatına uyum. | targetSounds: /s/ · positions: initial, medial · level: word · itemCount: 15 |
| art-08 | — | kelime, öğrencisiz, sınır vaka | Nadir ses /j/: bankada istenen 25'ten az kelime var; öğrenci bilgisi olmadan doğru ve genel geçer notlar. | targetSounds: /j/ · positions: initial, medial, final · level: word · itemCount: 25 |
| art-09 | Mert Özdemir (art-mert)<br>5 yaş · speech<br>Down sendromu. Genel konuşma anlaşılırlığı düşük; /k/ ve /g/ seslerini /t/ ve /d/ ile değiştiriyor. Ağız çevresi kaslarında düşük tonus var. | kelime, öğrencili, çok sesli | Down sendromunda /k/ ve /g/: düşük tonusu ve anlaşılırlığı hesaba katan notlar; iki sesi birlikte ele alma. | targetSounds: /k/, /g/ · positions: initial · level: word · itemCount: 20 |
| art-10 | Elif Yıldız (art-elif)<br>9 yaş · speech<br>Rotasizm: /r/ sesini gırtlaktan (uvular) üretiyor. Kelime başı ve ortasında düzeldi, kelime sonunda hatalar sürüyor. | cümle, öğrencili | Sonda /r/: banka kelimesini doğal bir cümlede kullanma, 9 yaşa uygun cümle uzunluğu. | targetSounds: /r/ · positions: final · level: sentence · itemCount: 10 |
| art-11 | Can Arslan (art-can)<br>4 yaş · speech<br>Fonolojik bozukluk. Henüz iki-üç kelimelik cümleler kuruyor; dikkat süresi kısa. | cümle, öğrencili, çok sesli | 4 yaşında iki-üç kelimelik cümle kuran çocuk: 20 cümlenin gerçekten kısa ve basit kalması. | targetSounds: /k/, /g/ · positions: initial, medial · level: sentence · itemCount: 20 |
| art-12 | Nehir Koç (art-nehir)<br>11 yaş · speech<br>Lateral sigmatizm: /ç/, /ş/ ve /c/ seslerinde hava yanlardan çıkıyor. Nehir sınıfta sesli okumaktan çekiniyor. | cümle, öğrencili, uzun liste | En uzun istek (30 cümle): token tavanına yaklaşma; tanı metninde geçen adın rumuzlanıp geri konması. | targetSounds: /ç/ · positions: initial, medial, final · level: sentence · itemCount: 30 |
| art-13 | — | cümle, öğrencisiz, sınır vaka | Başta /l/ bankada 12 kelime: 15 istenince eksik listeyi doğru işleme; öğrencisiz genel cümleler. | targetSounds: /l/ · positions: initial · level: sentence · itemCount: 15 |
| art-14 | Berk Aydın (art-berk)<br>12 yaş · speech<br>Lateral sigmatizm düzelme sürecinde; hedef, sesin kendiliğinden konuşmaya genellenmesi. Futbol ve bilgisayar oyunlarıyla ilgileniyor. | bağlam, öğrencili | 12 yaşında genelleme hedefi: ilgi alanına (futbol, oyun) uygun, /ş/ yoğun, yaşa uygun paragraflar. | targetSounds: /ş/ · positions: initial, medial · level: contextual · itemCount: 10 |
| art-15 | Selin Güneş (art-selin)<br>34 yaş · speech<br>Yetişkin rotasizm. /r/ sesini kelime içinde doğru üretebiliyor ama akıcı konuşmada ve iş toplantılarında hatalar artıyor. | bağlam, öğrencili, uzun liste | Yetişkin (34 yaş), iş hayatı bağlamı: 15 paragraf ile en ağır çıktı yükü; yetişkine uygun üslup. | targetSounds: /r/ · positions: medial, final · level: contextual · itemCount: 15 |
| art-16 | — | bağlam, öğrencisiz | Öğrencisiz /z/ paragrafları: üç pozisyonda hedef ses yoğunluğu ve doğal Türkçe. | targetSounds: /z/ · positions: initial, medial, final · level: contextual · itemCount: 10 |

### Ev ödevi materyali (Studio) — `studio/homework` (4 vaka)

| Vaka | Öğrenci | Etiketler | Neyi sınıyor | Gövde |
|---|---|---|---|---|
| hw-01 | Ela Şahin (stu-ela)<br>6 yaş · language<br>Otizm spektrum bozukluğu, hafif düzey; ifade edici dil gecikmesi. Rutin değişikliklerinde kaygı. | öğrencili, zengin bağlam, egzersiz, temel veli | OSB + ifade edici dil: son oturum planındaki 'üç kelimeli cümleyi eve taşı' hedefinin ödeve girmesi; ilgi alanı (dinozor/tren) ile 15 dk'ya sığan adımlar; temel düzeyde teknik terim yok. | targetArea: Üç kelimeli istek cümlesi (ben + nesne + istiyorum) · duration: 15 · parentLevel: basic · materialType: exercise |
| hw-02 | Ecem Tuncer (stu-ecem)<br>12 yaş · language<br>Gelişimsel dil bozukluğu; anlatı becerilerinde ve karmaşık cümle kurmada zorluk. Okuduğunu anlama sınıf düzeyinin iki yıl gerisinde. | öğrencili, gözlem formu, detaylı veli, 12 yaş | Gözlem formu türü: veliye yapılacak iş değil GÖZLEMLENECEK davranış listesi; 12 yaşa uygun anlatı hedefi; detaylı düzeyde terim izinli ama açıklamalı. | targetArea: Günlük olayları sırayla ve nedensel bağlaçla anlatma · duration: 20 · parentLevel: detailed · materialType: observation · extraNote: Ecem sözlü yanıt baskısında kapanıyor; gözlem onu sıkıştırmasın. |
| hw-03 | Yiğit Aras (stu-yigit)<br>4 yaş · speech<br>Fonolojik süreç: öne alma (/k/→/t/, /g/→/d/). Anlaşılırlık yabancılarca yaklaşık %60. | öğrencili, günlük aktivite, 4 yaş, kısa bağlam | 4 yaş + 5 dk masa toleransı: rutine gömülü (banyo/yemek) kısa etkinlik; /k/ sesi için 'öne alma' bilgisini veliye terimsiz aktarma. | targetArea: /k/ sesini kelime başında üretme · duration: 10 · parentLevel: basic · materialType: daily_activity |
| hw-04 | Sibel Ünal (stu-sibel)<br>34 yaş · speech<br>Sol hemisfer inmesi sonrası hafif dizartri (8 ay önce). Konuşma hızı yavaş, /r/ ve /l/ zayıf, uzun cümlelerde nefes yetersiz. | öğrencili, yetişkin, egzersiz, detaylı | Yetişkin dizartri: 'veli' yerine uygun muhatap (kendisi/eşi), çocuk dili yok; nefes-ses koordinasyonu için 20 dk'lık uygulanabilir plan. | targetArea: Nefes desteğiyle uzun cümle okuma ve konuşma hızı · duration: 20 · parentLevel: detailed · materialType: exercise · extraNote: İşe dönüş hedefi: sınıfta sesli okuma. |

### Oturum özeti (Studio) — `studio/session-summary` (4 vaka)

| Vaka | Öğrenci | Etiketler | Neyi sınıyor | Gövde |
|---|---|---|---|---|
| ozet-01 | Ela Şahin (stu-ela)<br>6 yaş · language<br>Otizm spektrum bozukluğu, hafif düzey; ifade edici dil gecikmesi. Rutin değişikliklerinde kaygı. | bireysel, iki hedef, zengin bağlam | Girilen yüzde/ipucu düzeyine sadakat; davranış gözleminin (kulak kapatma) analize ve veli notuna damgalamadan girmesi. | sessionDate: 2026-10-08 · duration: 40 · sessionType: individual · overallPerformance: progressing · goals: (goalId: g1, goalTitle: Üç kelimeli istek cümlesi, accuracy: 60, cueLevel: Minimum İpucu); (goalId: g2, goalTitle: Sıra alma (dinozor oyunu), accuracy: 80, cueLevel: Bağımsız) · behaviorNotes: Bekleme salonundan sonra ilk 5 dk kulaklarını kapattı; sakin köşede toparlandı. · nextSessionNotes: Geçiş kartını eve ver. |
| ozet-02 | Defne Korkmaz (stu-defne)<br>7 yaş · hearing<br>İki taraflı ileri derecede sensörinöral işitme kaybı; 2 yaşında koklear implant (sağ), solda işitme cihazı. /s/–/ş/ ve /t/–/k/ ayrımında zorlanıyor. | grup, üç hedef, işitme | Grup oturumu ucu: bireysel özetin grup bağlamına uyarlanması; işitme kaybında gürültü değişkeninin analize girmesi; üç hedefin ayrı ayrı yorumlanması. | sessionDate: 2026-10-07 · duration: 30 · sessionType: group · overallPerformance: on_target · goals: (goalId: g1, goalTitle: /s/ kelime başı (sessiz ortam), accuracy: 70, cueLevel: Orta İpucu); (goalId: g2, goalTitle: /s/–/ş/ işitsel ayrım, accuracy: 60, cueLevel: Maksimum İpucu); (goalId: g3, goalTitle: Grupta sıra bekleme, accuracy: 90, cueLevel: Bağımsız) |
| ozet-03 | Kerem Ateş (stu-kerem)<br>9 yaş · speech<br>Artikülasyon bozukluğu: /r/ sesini /l/ ile değiştiriyor (araba → alaba). Kekemelik yok. | değerlendirme, not_assessed, boş bağlam | Değerlendirme oturumu + 'değerlendirme yapılamadı': %0 + Tam Destek girildi; veri uydurmama, ilerleme iddiası yok, sonraki plan değerlendirmenin tamamlanması. | sessionDate: 2026-10-06 · duration: 60 · sessionType: assessment · overallPerformance: not_assessed · goals: (goalId: g1, goalTitle: /r/ sesi tarama (kelime düzeyi), accuracy: 0, cueLevel: Tam Destek) · behaviorNotes: İlk 20 dk iş birliği yapmadı; sonra oyunla katıldı. |
| ozet-04 | Ecem Tuncer (stu-ecem)<br>12 yaş · language<br>Gelişimsel dil bozukluğu; anlatı becerilerinde ve karmaşık cümle kurmada zorluk. Okuduğunu anlama sınıf düzeyinin iki yıl gerisinde. | veli görüşmesi, needs_support, 12 yaş | Veli görüşmesi türü: özet velinin duyduğu bilgiyi yansıtır; 'ek destek gerekiyor' için somut, damgalamayan öneri; veli notunun 3–5 cümle bütçesi. | sessionDate: 2026-10-09 · duration: 20 · sessionType: parent_meeting · overallPerformance: needs_support · goals: (goalId: g1, goalTitle: Okuduğunu anlama: neden-sonuç soruları, accuracy: 40, cueLevel: Orta İpucu) · nextSessionNotes: Sınıf öğretmeniyle görsel düzenleyici paylaş. |

### Haftalık çalışma planı (Studio) — `studio/weekly-plan` (4 vaka)

| Vaka | Öğrenci | Etiketler | Neyi sınıyor | Gövde |
|---|---|---|---|---|
| hp-01 | Ela Şahin (stu-ela)<br>6 yaş · language<br>Otizm spektrum bozukluğu, hafif düzey; ifade edici dil gecikmesi. Rutin değişikliklerinde kaygı. | 3 ders, ai, zengin bağlam | Son oturum özetindeki 'sonraki hedef'in ilk derse alınması; dinozor/tren ilgi alanı; geçiş kartı rutininin derslere gömülmesi; 40 dk'lık gerçekçi süre dağılımı. | weekStart: 2026-10-12 · sessionsPerWeek: 3 · sessionDuration: 40 · focusAreas: Üç kelimeli istek cümlesi, Sıra alma · planApproach: ai · daySchedule: (dayName: Pazartesi, lessonCount: 1); (dayName: Çarşamba, lessonCount: 1); (dayName: Cuma, lessonCount: 1) |
| hp-02 | Ecem Tuncer (stu-ecem)<br>12 yaş · language<br>Gelişimsel dil bozukluğu; anlatı becerilerinde ve karmaşık cümle kurmada zorluk. Okuduğunu anlama sınıf düzeyinin iki yıl gerisinde. | 12 ders, bütçe, guided, 12 yaş | 12 derslik üst sınır (6 gün × 2): şişmeden tam yapı, tekrar etmeyen progresyon, tamamlanmış hedef kodlarının (4.2, 4.3) yeniden planlanmaması. | weekStart: 2026-10-12 · sessionsPerWeek: 12 · sessionDuration: 30 · focusAreas: Nedensel bağlaçlar, Okuduğunu anlama, Anlatı sıralama · planApproach: guided · daySchedule: (dayName: Pazartesi, lessonCount: 2); (dayName: Salı, lessonCount: 2); (dayName: Çarşamba, lessonCount: 2); (dayName: Perşembe, lessonCount: 2); (dayName: Cuma, lessonCount: 2); (dayName: Cumartesi, lessonCount: 2) |
| hp-03 | Defne Korkmaz (stu-defne)<br>7 yaş · hearing<br>İki taraflı ileri derecede sensörinöral işitme kaybı; 2 yaşında koklear implant (sağ), solda işitme cihazı. /s/–/ş/ ve /t/–/k/ ayrımında zorlanıyor. | 4 ders, guided, işitme, ek not | İşitme kaybı + gürültü değişkeni: son özetteki 'arka plan gürültüsünü kademeli ekle' planının derslere yayılması; ek notun (cihaz yorgunluğu) dikkate alınması. | weekStart: 2026-10-19 · sessionsPerWeek: 4 · sessionDuration: 45 · focusAreas: /s/–/ş/ ayrımı, Gürültüde dinleme · planApproach: guided · daySchedule: (dayName: Salı, lessonCount: 2); (dayName: Perşembe, lessonCount: 2) · extraNote: Uzun oturumlarda cihazı çıkarmak istiyor; ikinci dersi oyun ağırlıklı tut. |
| hp-04 | Yiğit Aras (stu-yigit)<br>4 yaş · speech<br>Fonolojik süreç: öne alma (/k/→/t/, /g/→/d/). Anlaşılırlık yabancılarca yaklaşık %60. | 2 ders, ai, 4 yaş, boş özet | 4 yaş + 5 dk masa toleransı + 20 dk ders: hareketli, kısa bloklu etkinlikler; son özet olmadan plan kurma (uydurma geçmiş yok). | weekStart: 2026-10-12 · sessionsPerWeek: 2 · sessionDuration: 20 · focusAreas: /k/ sesi kelime başı · planApproach: ai · daySchedule: (dayName: Pazartesi, lessonCount: 1); (dayName: Perşembe, lessonCount: 1) |

### İletişim panosu (Studio, AAC) — `studio/comm-board` (4 vaka)

| Vaka | Öğrenci | Etiketler | Neyi sınıyor | Gövde |
|---|---|---|---|---|
| pano-01 | Ela Şahin (stu-ela)<br>6 yaş · language<br>Otizm spektrum bozukluğu, hafif düzey; ifade edici dil gecikmesi. Rutin değişikliklerinde kaygı. | öğrencili, temel ihtiyaçlar, 6, ızgara | OSB + iki kelimelik istek: hücrelerin 'ben … istiyorum' cümlesine genişletilebilir olması; dinozor/tren ilgi alanının bir hücreye girmesi; Fitzgerald renkleri doğru. | boardType: basic_needs · symbolCount: 6 · layout: grid · textMode: word_sentence · colorCoding: true |
| pano-02 | — | öğrencisiz, özel kategori, 12, yalnız kelime | 'Özel' kategori + 12 hücre ucu: tema dışına çıkmadan 12 farklı sembol; metin modu yalnız kelime (cümle alanı boş kalmalı); öğrencisiz genel materyal. | boardType: custom · customCategory: Dinozor oyunu · symbolCount: 12 · layout: grid · textMode: word_only · colorCoding: true |
| pano-03 | Defne Korkmaz (stu-defne)<br>7 yaş · hearing<br>İki taraflı ileri derecede sensörinöral işitme kaybı; 2 yaşında koklear implant (sağ), solda işitme cihazı. /s/–/ş/ ve /t/–/k/ ayrımında zorlanıyor. | öğrencili, duygular, 9, şerit, renk yok | Duygular panosu şerit düzende, renk kodu kapalı: yoğunluk basamaklı duygular (biraz/çok), işitme kaybına uygun yüz ifadesi görselleri. | boardType: emotions · symbolCount: 9 · layout: strip · textMode: word_sentence · colorCoding: false |
| pano-04 | Sibel Ünal (stu-sibel)<br>34 yaş · speech<br>Sol hemisfer inmesi sonrası hafif dizartri (8 ay önce). Konuşma hızı yavaş, /r/ ve /l/ zayıf, uzun cümlelerde nefes yetersiz. | öğrencili, yetişkin, istek, 4 | Yetişkin dizartri: çocuk dili ve çizgi film görseli yok; sınıf/işe dönüş bağlamında 4 işlevsel istek. | boardType: requests · symbolCount: 4 · layout: grid · textMode: word_sentence · colorCoding: true |

### Kelime eşleştirme oyunu (Studio) — `studio/matching-game` (4 vaka)

| Vaka | Öğrenci | Etiketler | Neyi sınıyor | Gövde |
|---|---|---|---|---|
| es-01 | Ecem Tuncer (stu-ecem)<br>12 yaş · language<br>Gelişimsel dil bozukluğu; anlatı becerilerinde ve karmaşık cümle kurmada zorluk. Okuduğunu anlama sınıf düzeyinin iki yıl gerisinde. | öğrencili, eş anlamlı, 10, orta, tema | 12 yaş gelişimsel dil bozukluğu + okul teması: eş anlam çiftlerinin tek-eşlemeli (belirsiz çift yok) ve okul temalı olması; zorlanılabilecek çiftlerde (varsa) kısa, yazılı olarak da kullanılabilen ipucu. | matchType: synonym · pairCount: 10 · difficulty: medium · theme: okul |
| es-02 | — | öğrencisiz, resim açıklaması, 8, kolay, görsel | Görselli tür: TÜM çiftlerde somut nesne + İngilizce görsel tanımı; mutfak teması; öğrencisiz genel materyal. | matchType: image_desc · pairCount: 8 · difficulty: easy · theme: mutfak |
| es-03 | Ela Şahin (stu-ela)<br>6 yaş · language<br>Otizm spektrum bozukluğu, hafif düzey; ifade edici dil gecikmesi. Rutin değişikliklerinde kaygı. | öğrencili, kategori, 6, kolay, müfredat hedefi | 6 yaş OSB + müfredat hedefi: kategori çiftlerinin hedefe hizalanması (aynı kategoriye giren birkaç kelime beklenir, kategori kartı tekrar edebilir); dinozor/tren ilgisinin kullanımı; soyut kategoriden kaçınma; görsel ya hepsinde ya hiçbirinde. | matchType: category · pairCount: 6 · difficulty: easy · goalTitle: Nesneleri işlevine göre gruplar (yiyecek, taşıt, hayvan) |
| es-04 | Kerem Ateş (stu-kerem)<br>9 yaş · speech<br>Artikülasyon bozukluğu: /r/ sesini /l/ ile değiştiriyor (araba → alaba). Kekemelik yok. | öğrencili, cümle tamamlama, 12, zor, bütçe | 12 çift + zor + cümle tamamlama: çıktı bütçesi ve boşluklu cümle biçimi. Öğrenci /r/ hedefli artikülasyon öğrencisi ama araç bir dil aracıdır: cümlelerin /r/ içermesi şart DEĞİL, hakem içermemeyi ya da aşırı zorlamayı cezalandırmasın. | matchType: sentence · pairCount: 12 · difficulty: hard |

### Sesletim oyunu (Studio) — `studio/phonation` (4 vaka)

| Vaka | Öğrenci | Etiketler | Neyi sınıyor | Gövde |
|---|---|---|---|---|
| ses-01 | Yiğit Aras (stu-yigit)<br>4 yaş · speech<br>Fonolojik süreç: öne alma (/k/→/t/, /g/→/d/). Anlaşılırlık yabancılarca yaklaşık %60. | öğrencili, ses avı, /k/, 4 yaş, tema | 4 yaş öne alma (/k/→/t/): mutfak sahnesinde /k/'li nesneler + /t/'li çeldiriciler (minimal çift mantığı); kısa yönerge. | targetSounds: /k/ · activityType: sound_hunt · difficulty: easy · itemCount: 10 · theme: mutfak |
| ses-02 | — | öğrencisiz, tombala, 4×4, /s/ | Tombala 16 hücre (4×4): tüm hücreler hedef sesli ve bankadan; öğrencisiz genel materyal. Kelimeler sistemin olduğundan yapıyı (4×4 ızgara, sahne/nesne boş, yönerge) değerlendir. | targetSounds: /s/ · activityType: bingo · difficulty: medium · itemCount: 16 |
| ses-03 | Kerem Ateş (stu-kerem)<br>9 yaş · speech<br>Artikülasyon bozukluğu: /r/ sesini /l/ ile değiştiriyor (araba → alaba). Kekemelik yok. | öğrencili, yılan–merdiven, /r/, 20 | Yılan–merdiven 20 hücre (4×5): merdiven/yılan dağılımı (bitiş karesinde yok), /r/→/l/ değişimine özgü uzman notu; 9 yaşa uygun oyun kuralı. | targetSounds: /r/ · activityType: snakes_ladders · difficulty: medium · itemCount: 20 |
| ses-04 | Defne Korkmaz (stu-defne)<br>7 yaş · hearing<br>İki taraflı ileri derecede sensörinöral işitme kaybı; 2 yaşında koklear implant (sağ), solda işitme cihazı. /s/–/ş/ ve /t/–/k/ ayrımında zorlanıyor. | öğrencili, labirent, /ş/, 25, bütçe, işitme | Labirent 25 öğe üst sınır (max_tokens 4096 kesilme riski): girişten çıkışa çözülebilir doğru yol, hedef/çeldirici dengesi, işitme kaybında /s/–/ş/ çeldiricisi; kesilirse sert hata görünür. | targetSounds: /ş/ · activityType: sound_maze · difficulty: hard · itemCount: 25 |

### Öğrenme kartı üreticisi (Studio) — `studio/cards` (4 vaka)

| Vaka | Öğrenci | Etiketler | Neyi sınıyor | Gövde |
|---|---|---|---|---|
| kart-01 | Ela Şahin (stu-ela)<br>6 yaş · language<br>Otizm spektrum bozukluğu, hafif düzey; ifade edici dil gecikmesi. Rutin değişikliklerinde kaygı. | öğrencili, dil, kolay, 3-6, zengin bağlam | Son kartlarla (dinozor sıra alma, üç kelimeli istek) tekrar etmeyen, tamamlanmış 2.1 hedefini atlayan, AI profilindeki 'model olma ve genişletme' tekniğini kullanan kart. | category: language · difficulty: easy · ageGroup: 3-6 · focusArea: Üç kelimeli istek cümlesini oyun içinde bağımsız üretme |
| kart-02 | — | öğrencisiz, konuşma, orta, 7-12 | Öğrencisiz genel kart: /r/ kelime başı için 'Adım N' biçimi, 1–4 egzersiz, ölçülebilir ilerleme göstergeleri; uydurma öğrenci bağlamı yok. | category: speech · difficulty: medium · ageGroup: 7-12 · focusArea: /r/ sesi kelime başında üretim |
| kart-03 | Ecem Tuncer (stu-ecem)<br>12 yaş · language<br>Gelişimsel dil bozukluğu; anlatı becerilerinde ve karmaşık cümle kurmada zorluk. Okuduğunu anlama sınıf düzeyinin iki yıl gerisinde. | öğrencili, dil, zor, 7-12, tamamlanmış hedef | 12 yaş DLD + tamamlanmış 4.2/4.3: pekiştirme düzeyi; yazılı taslak tercihini (uzman notu) kullanan egzersiz. Ödünleşim: son kartlardan biri (2 Ekim) zaten çizgi roman temasını kullanıyor, kural 2a (tema tekrarı yok) geçerli; çizgi roman yerine 'kediler' ilgisini ya da yeni bir açıyı kullanmak ödüllendirilir. | category: language · difficulty: hard · ageGroup: 7-12 · focusArea: Nedensel bağlaçla dört olaylı anlatı |
| kart-04 | Sibel Ünal (stu-sibel)<br>34 yaş · speech<br>Sol hemisfer inmesi sonrası hafif dizartri (8 ay önce). Konuşma hızı yavaş, /r/ ve /l/ zayıf, uzun cümlelerde nefes yetersiz. | öğrencili, konuşma, orta, yetişkin | Yetişkin dizartri: 'adult' yaş grubu; çocuk oyunu/çıkartma yok; nefes–ses koordinasyonu, işe dönüş hedefi (sınıfta sesli okuma). | category: speech · difficulty: medium · ageGroup: adult · focusArea: Nefes desteğiyle 10 kelimelik cümle okuma |

### AI öğrenci profili (Studio) — `studio/ai-profile` (4 vaka)

| Vaka | Öğrenci | Etiketler | Neyi sınıyor | Gövde |
|---|---|---|---|---|
| profil-01 | Ela Şahin (stu-ela)<br>6 yaş · language<br>Otizm spektrum bozukluğu, hafif düzey; ifade edici dil gecikmesi. Rutin değişikliklerinde kaygı. | zengin bağlam, OSB, müfredat | OSB + ifade edici dil gecikmesi + Pragmatik dil modülü: klinik açıklama doğru, 6 yaş beklentisi, uzman notlarındaki (kulak kapatma, görsel sıra) somut öneriye dönüşmesi. | modulSayisi: 1 |
| profil-02 | Kerem Ateş (stu-kerem)<br>9 yaş · speech<br>Artikülasyon bozukluğu: /r/ sesini /l/ ile değiştiriyor (araba → alaba). Kekemelik yok. | boş bağlam, artikülasyon | Not/müfredat olmadan: yalnız tanıdan (/r/→/l/) uydurmadan profil; 'bilinmiyor' alanlarını dürüstçe boş bırakma. | modulSayisi: 0 |
| profil-03 | Defne Korkmaz (stu-defne)<br>7 yaş · hearing<br>İki taraflı ileri derecede sensörinöral işitme kaybı; 2 yaşında koklear implant (sağ), solda işitme cihazı. /s/–/ş/ ve /t/–/k/ ayrımında zorlanıyor. | işitme, müfredat | Koklear implant + işitsel algı modülü: işitme kaybına özgü (cihaz, gürültü, dudak okuma) öneriler; uzmanın işitme alanındaki rolü. | modulSayisi: 1 |
| profil-04 | Sibel Ünal (stu-sibel)<br>34 yaş · speech<br>Sol hemisfer inmesi sonrası hafif dizartri (8 ay önce). Konuşma hızı yavaş, /r/ ve /l/ zayıf, uzun cümlelerde nefes yetersiz. | yetişkin, dizartri | 34 yaş inme sonrası dizartri: 'bu yaş grubunda beklenen gelişim' bölümünün yetişkine uyarlanması (çocuk gelişimi yazmaması); aile yerine eş/iş bağlamı. | modulSayisi: 0 |

## Atölye

### BEP hedef taslağı (Atölye) — `atolye/bep` (4 vaka)

| Vaka | Öğrenci | Etiketler | Neyi sınıyor | Gövde |
|---|---|---|---|---|
| bep-01 | Arda Yılmaz (case-arda)<br>8 yaş · ilkokul_1_4<br>disleksi, dehb_dikkat · orta | disleksi+dehb, iki alan, zengin bağlam | Eştanıda iki alanın (okuma + dikkat) ayrı ayrı ölçülebilir hedeflenmesi; ilgi alanının (futbol/lego) yönteme girmesi; iki alanın birbirini tekrarlamaması. | alanlar: okuma, dikkat · guclukAlanlari: Hece birleştirmede yavaş; b/d harflerini karıştırıyor; 10 dakikadan uzun okumada dikkat dağılıyor; okuduğunu anlatırken ayrıntılar eksik. · ekNotlar: Takım maç sonuçlarını okumaya istekli; lego yönergelerini takip edebiliyor. |
| bep-02 | Arda Yılmaz (case-arda)<br>8 yaş · ilkokul_1_4<br>disleksi, dehb_dikkat · orta | disleksi+dehb, MEB kodu | MEB hedef koduna (3.2.5: tanıtılan sesi hece ve sözcük içinde okur) demirleme; kısa dönem hedeflerin yanında kod parantezi; kaba/öğretim öncesi değerlendirme dili. | alanlar: okuma · guclukAlanlari: Tanıtılan sesleri tek başına okuyor; hece içinde okurken takılıyor, sözcük içinde ses atlıyor. · mebHedefKod: 3.2.5 · mebDavranisKodlari: [] |
| bep-03 | Mina Güneş (case-mina)<br>12 yaş · ortaokul_5_8<br>diskalkuli · belirgin | diskalkuli, belirgin, boş bağlam | Güçlü yönü ve geçmişi olmayan öğrencide özgüllük; matematikte somut→soyut basamağı; 12 yaşa/ortaokula uygun hedef dili. | alanlar: matematik · guclukAlanlari: Sayı doğrusunda konumlandıramıyor; eldeli toplamada basamak kaydırıyor; problem metnini işleme çeviremiyor; parmakla sayıyor. |
| bep-04 | Mina Güneş (case-mina)<br>12 yaş · ortaokul_5_8<br>diskalkuli · belirgin | diskalkuli, üç alan, bütçe | Üç alanda (matematik + yürütücü işlev + öz-düzenleme) çıktı bütçesi: her alan tam yapıyla ama şişmeden; alanlar arası tekrar olmaması. | alanlar: matematik, yurutucu_islev, oz_duzenleme · guclukAlanlari: Çok adımlı yönergeleri sıralayamıyor; ödev başlangıcını erteliyor; hata yapınca bırakıyor; çarpım tablosunu ezberleyemiyor. · gucluYonler: Resimle anlatınca kavramları hatırlıyor; kedisine bakma sorumluluğunu aksatmıyor. |

### Seans planı (Atölye) — `atolye/seans-plani` (4 vaka)

| Vaka | Öğrenci | Etiketler | Neyi sınıyor | Gövde |
|---|---|---|---|---|
| seans-01 | Arda Yılmaz (case-arda)<br>8 yaş · ilkokul_1_4<br>disleksi, dehb_dikkat · orta | okuma, 40 dk, MEB kodu, son seans notu | Önceki seans notunun devamı (son seans notu 7/10 → ölçüt (%80) karşılanmadı: aynı ses grubu yeni sözcüklerle sürer, üç heceliye GEÇİLMEZ); MEB 3.2.5'e hizalı ana etkinlik; futbol ilgisinin etkinliğe taşınması; süre dağılımı 40 dk. | alan: okuma · seansHedefi: Tanıtılan seslerden oluşan iki heceli sözcükleri %80 doğrulukla okuma · sureDk: 40 · sonSeansNotu: 10 sözcükten 7'si doğru; 'ba-' hecesinde takıldı, saha oyununu sevdi. · mebHedefKod: 3.2.5 |
| seans-02 | Efe Kaplan (case-efe)<br>5 yaş · okul_oncesi<br>dehb_hiperaktif · hafif | dikkat, 30 dk, okul öncesi, materyal kısıtı | Okul öncesi + Dikkat alanı + yalnız kâğıt-kalem kısıtı: materyalsiz, hareketli, kısa bloklu 30 dk; süre toplamı 30. | alan: dikkat · seansHedefi: Yönergeyle başlayıp 5 dakika masada kalma · sureDk: 30 · materyalKisiti: Yalnız kâğıt ve kalem; oyuncak yok. |
| seans-03 | Tolga Aksoy (case-tolga)<br>15 yaş · lise_9_uzeri<br>dehb_kombine, diskalkuli · belirgin | matematik, 60 dk, lise, eştanı | Lise + Matematik alanı, 60 dk: kademeye uygun (çocuksu olmayan) etkinlik, uzun seansı kısa bloklara bölme, basketbol/oyun tasarımı ilgisinin taşınması. | alan: matematik · seansHedefi: Yüzde problemlerini adım kutularıyla çözme · sureDk: 60 |
| seans-04 | Melis Acar (case-melis)<br>11 yaş · ortaokul_5_8<br>disleksi · hafif | öğrenmeye hazırlık, 15 dk, boş bağlam | İlgi alanı ve geçmiş olmadan 15 dk'lık en kısa seans: uydurma bağlam yok; süre toplamı 15. | alan: ogrenmeye_hazirlik · seansHedefi: Çalışma masasını hazırlama ve görev listesini takip etme · sureDk: 15 |

### Davranış destek planı (Atölye) — `atolye/davranis` (4 vaka)

| Vaka | Öğrenci | Etiketler | Neyi sınıyor | Gövde |
|---|---|---|---|---|
| dav-01 | Efe Kaplan (case-efe)<br>5 yaş · okul_oncesi<br>dehb_hiperaktif · hafif | okul öncesi, hiperaktif, sınıf, sıklık verisi | Sıklık verisine dayalı ABC ve tek, savunulabilir işlev hipotezi (kaçınma + dikkat); dinozor/şarkı ilgisinin yerine koyma davranışına taşınması; ceza yok. | hedefDavranis: Etkinlik geçişinde yere yatma ve bağırma · ortam: sinif · siklikSure: Günde 3–4 kez, 2–5 dk; en çok oyun→masa geçişinde |
| dav-02 | Arda Yılmaz (case-arda)<br>8 yaş · ilkokul_1_4<br>disleksi, dehb_dikkat · orta | disleksi+dehb, seans, kaçınma | Okuma görevinde kaçınma davranışı: işlev hipotezinin okuma güçlüğüne bağlanması (davranışı 'yaramazlık' saymama); 10 dk'lık bloklarla önleyici düzenleme. | hedefDavranis: Okuma kartı gelince masadan kalkıp dolaşma · ortam: seans |
| dav-03 | Tolga Aksoy (case-tolga)<br>15 yaş · lise_9_uzeri<br>dehb_kombine, diskalkuli · belirgin | lise, ev, veri yok | 15 yaş + ev ortamı + sıklık verisi yok: varsayım üretmek yerine veri toplama önerisi; öz-izleme aracının yaşa uygunluğu; aile–okul tutarlılığı. | hedefDavranis: Ödev saatinde telefona yönelme ve ödevi yarım bırakma · ortam: ev |
| dav-04 | Zeynep Kocaman (case-zeynep)<br>9 yaş · ilkokul_1_4<br>disgrafi · orta | disgrafi, genel, duygusal | Yazma kaygısına bağlı davranış: işlev = kaçınma/hayal kırıklığı; yerine koyma davranışında güçlü yön (sözel anlatım) kullanımı; cezasız pekiştirme. | hedefDavranis: Yazı yazarken kâğıdı buruşturma ve ağlama · ortam: genel · siklikSure: Haftada 2–3 kez, yazma ödevlerinde |

### Okuma akıcılık seti (Atölye) — `atolye/okuma` (4 vaka)

| Vaka | Öğrenci | Etiketler | Neyi sınıyor | Gövde |
|---|---|---|---|---|
| oku-01 | Arda Yılmaz (case-arda)<br>8 yaş · ilkokul_1_4<br>disleksi, dehb_dikkat · orta | kelime, disleksi+dehb, MEB kodu, takılınan desen | b/d karışıklığı ve hece birleştirmeyi hedefleyen hece-ses çalışması; futbol temalı özgün kısa parça; 40 kelime/dk hedefine rubrik; MEB 3.2.5 hizası. | okumaDuzeyi: kelime · hedefAkicilik: 40 doğru kelime/dk · takilanDesenler: b/d karıştırma; hece birleştirmede yavaşlık · mebHedefKod: 3.2.5 |
| oku-02 | Melis Acar (case-melis)<br>11 yaş · ortaokul_5_8<br>disleksi · hafif | paragraf, hafif, boş bağlam, ortaokul | 11 yaş hafif disleksi, ilgi alanı yok: yaşa uygun paragraf, çocuksu olmayan metin; ilgi alanı uydurmama. | okumaDuzeyi: paragraf |
| oku-03 | Efe Kaplan (case-efe)<br>5 yaş · okul_oncesi<br>dehb_hiperaktif · hafif | hece, okul öncesi, hiperaktif | 5 yaş erken okuryazarlık: hece düzeyinde kısa, hareketli, şarkılı çalışma; 'okuma parçası' bölümünün hece/ses oyununa uyarlanması; prozodi ölçütünün yaşa uyarlanması. | okumaDuzeyi: hece |
| oku-04 | Zeynep Kocaman (case-zeynep)<br>9 yaş · ilkokul_1_4<br>disgrafi · orta | cümle, disgrafi, satır atlama | Okuması akıcı disgrafili öğrencide 'satır atlama' deseni: görsel takip desteği; okuma değil yazma güçlüğü olduğunun farkında kalma; at/resim ilgisi. | okumaDuzeyi: cumle · takilanDesenler: Satır atlama, uzun cümlede yerini kaybetme |

### Matematik destek seti (Atölye) — `atolye/matematik` (4 vaka)

| Vaka | Öğrenci | Etiketler | Neyi sınıyor | Gövde |
|---|---|---|---|---|
| mat-01 | Mina Güneş (case-mina)<br>12 yaş · ortaokul_5_8<br>diskalkuli · belirgin | diskalkuli, işlem akıcılığı, somut, MEB kodu | Eldeli toplamada basamak kaydırma hatasına özgü hata analizi; somuttan başlayan CRA; MEB 5.1.14 hizası; resim ilgisinin materyalde kullanımı; aritmetik doğruluğu. | alanProfili: islem_akiciligi · kazanimKonu: Eldeli toplama (iki basamaklı) · somutlukDuzeyi: somut · mebHedefKod: 5.1.14 |
| mat-02 | Tolga Aksoy (case-tolga)<br>15 yaş · lise_9_uzeri<br>dehb_kombine, diskalkuli · belirgin | lise, problem çözme, soyut, eştanı | 15 yaş + soyut başlangıç: CRA'nın yaşa uygun kurulması (çocuksu manipülatif yok, adım kutuları); DEHB için çok adımlı problemde adım atlamaya müdahale; basketbol bağlamlı problemler. | alanProfili: problem_cozme · kazanimKonu: Yüzde problemleri (indirim, artış) · somutlukDuzeyi: soyut |
| mat-03 | Efe Kaplan (case-efe)<br>5 yaş · okul_oncesi<br>dehb_hiperaktif · hafif | okul öncesi, sayı hissi, somut | 5 yaş sayı hissi: hareketli, dinozorlu somut sayma; 1–10 aralığında aritmetik doğruluğu; dikkat süresine uygun kısa alıştırma. | alanProfili: sayi_hissi · kazanimKonu: 1–10 arası sayma ve birebir eşleme · somutlukDuzeyi: somut |
| mat-04 | Mina Güneş (case-mina)<br>12 yaş · ortaokul_5_8<br>diskalkuli · belirgin | diskalkuli, sayı–büyüklük, yarı-somut, belirgin | Sayı doğrusunda konumlandırma güçlüğü için yarı-somut başlangıç (CRA yarı-somuttan soyuta); 12 yaşa uygun, çocuksu olmayan sayı doğrusu; parmakla sayma gibi yaygın desenlere müdahale ipucu. | alanProfili: sayi_buyukluk · kazanimKonu: 0–100 sayı doğrusunda konumlandırma ve karşılaştırma · somutlukDuzeyi: yari_somut |

### Çok duyulu materyal (Atölye) — `atolye/materyal` (4 vaka)

| Vaka | Öğrenci | Etiketler | Neyi sınıyor | Gövde |
|---|---|---|---|---|
| mtr-01 | Zeynep Kocaman (case-zeynep)<br>9 yaş · ilkokul_1_4<br>disgrafi · orta | disgrafi, çalışma yaprağı, kolay+orta, cevap anahtarı | b–d harf biçimleri için çok duyulu (kum tepsisi, kabartma) çalışma yaprağı; iki varyant; cevap anahtarı; at/resim ilgisi. | materyalTuru: calisma_yapragi · konu: b–d harf biçimleri ve yönü · zorlukVaryanti: kolay_orta · cevapAnahtari: true |
| mtr-02 | Arda Yılmaz (case-arda)<br>8 yaş · ilkokul_1_4<br>disleksi, dehb_dikkat · orta | disleksi+dehb, okuma metni, tek, anahtar yok | Tek düzey futbol temalı iki heceli sözcük metni; cevap anahtarı İSTENMEDİ (eklenmemeli); disleksi dostu biçim notları. | materyalTuru: okuma_metni · konu: Tanıtılan seslerle iki heceli sözcüklerden kısa metin · zorlukVaryanti: tek · cevapAnahtari: false |
| mtr-03 | Mina Güneş (case-mina)<br>12 yaş · ortaokul_5_8<br>diskalkuli · belirgin | diskalkuli, alıştırma, üç varyant, MEB kodu, bütçe | Üç varyantlı alıştırma seti (bütçe): her varyant gerçekten farklı zorlukta; cevap anahtarı doğru; MEB 5.1.16 (çıkarma, onluk bozarak). | materyalTuru: alistirma · konu: Onluk bozarak çıkarma · zorlukVaryanti: kolay_orta_ileri · cevapAnahtari: true · mebHedefKod: 5.1.16 |
| mtr-04 | Efe Kaplan (case-efe)<br>5 yaş · okul_oncesi<br>dehb_hiperaktif · hafif | okul öncesi, etkinlik, dikkat | 5 yaş etkinlik: aynı–farklı bulma; hareket + ses + dokunma kanalları; cevap anahtarı 'doğru yanıt' biçiminde kısa. | materyalTuru: etkinlik · konu: Aynı–farklı bulma ile dikkat · zorlukVaryanti: tek · cevapAnahtari: true |

### Uyarlama önerisi (Atölye) — `atolye/uyarlama` (4 vaka)

| Vaka | Öğrenci | Etiketler | Neyi sınıyor | Gövde |
|---|---|---|---|---|
| uy-01 | Arda Yılmaz (case-arda)<br>8 yaş · ilkokul_1_4<br>disleksi, dehb_dikkat · orta | disleksi+dehb, kaynaştırma, Türkçe | Türkçe dersinde okuma + dikkat için sunum/yanıt/zaman/sınav uyarlamaları; her maddede gerekçe; güçlü sözel ifadenin yanıt uyarlamasında kullanılması. | ders: Türkçe · ortam: kaynastirma |
| uy-02 | Tolga Aksoy (case-tolga)<br>15 yaş · lise_9_uzeri<br>dehb_kombine, diskalkuli · belirgin | lise, kaynaştırma, matematik, sınav | Lise matematik sınav uyarlaması: DEHB+diskalkuli gerekçeleri (ek süre, formül kartı, bölünmüş sınav); yaşa uygun özerklik. | ders: Matematik · ortam: kaynastirma |
| uy-03 | Efe Kaplan (case-efe)<br>5 yaş · okul_oncesi<br>dehb_hiperaktif · hafif | okul öncesi, ev, ders yok | Ders verilmeden ev ortamı: günlük rutin uyarlamaları (geçiş, oyun, uyku); 'sınav uyarlaması' bölümünün okul öncesine uyarlanması (değerlendirme = gözlem). | ortam: ev |
| uy-04 | Melis Acar (case-melis)<br>11 yaş · ortaokul_5_8<br>disleksi · hafif | hafif disleksi, destek eğitim odası, fen, boş bağlam | Destek eğitim odasında fen dersi: ilgi alanı olmadan içerik; hafif düzeyde aşırı uyarlamadan kaçınma (gerekçeli, ölçülü). | ders: Fen Bilimleri · ortam: destek_egitim_odasi |

### Sosyal öykü (Atölye) — `atolye/sosyal-oyku` (4 vaka)

| Vaka | Öğrenci | Etiketler | Neyi sınıyor | Gövde |
|---|---|---|---|---|
| so-01 | Efe Kaplan (case-efe)<br>5 yaş · okul_oncesi<br>dehb_hiperaktif · hafif | okul öncesi, hiperaktif, birinci kişi | 5 yaş sıra bekleme: 5–8 cümle, 'beklemek zor gelir ve bu normaldir' çerçevesi, dinozor ilgisiyle somut sahne. | durum: Oyun sırasında sıramı beklemek · bakisAcisi: birinci_kisi |
| so-02 | Arda Yılmaz (case-arda)<br>8 yaş · ilkokul_1_4<br>disleksi, dehb_dikkat · orta | disleksi+dehb, birinci kişi, hedef beceri | Okurken hata yapınca bırakma: hatayı normalleştirip devam etme becerisi; futbol benzetmesi; 'kötü' çerçevesi yok. | durum: Sesli okurken hata yapınca okumayı bırakmak istiyorum · bakisAcisi: birinci_kisi · hedefBeceri: Hatayı fark edip düzelterek okumaya devam etme |
| so-03 | Tolga Aksoy (case-tolga)<br>15 yaş · lise_9_uzeri<br>dehb_kombine, diskalkuli · belirgin | lise, üçüncü kişi, sınav kaygısı | 15 yaş üçüncü kişi anlatımı: çocuksu olmayan dil; sınav paniğinde baş etme adımları; 'ben' dili olmamalı. | durum: Sınavda ilk soruyu yapamayınca panikleme · bakisAcisi: ucuncu_kisi · hedefBeceri: Nefes alıp kolay soruya geçme |
| so-04 | Melis Acar (case-melis)<br>11 yaş · ortaokul_5_8<br>disleksi · hafif | hafif disleksi, boş bağlam, birinci kişi | İlgi alanı olmadan sınıfta sesli okuma kaygısı: uydurma hobi yok; 11 yaşa uygun kısa öykü. | durum: Sınıfta sesli okuma sırası bana gelince kaygılanmak · bakisAcisi: birinci_kisi |

### Veli mektubu (Atölye) — `atolye/veli-mektubu` (4 vaka)

| Vaka | Öğrenci | Etiketler | Neyi sınıyor | Gövde |
|---|---|---|---|---|
| vm-01 | Arda Yılmaz (case-arda)<br>8 yaş · ilkokul_1_4<br>disleksi, dehb_dikkat · orta | disleksi+dehb, ev etkinliği, uzman notu | 3–5 somut ev etkinliği (hece kartları, 10 dk okuma); güçlü yönlerle (sözel anlatım, futbol) açılış; teknik terimsiz. | amac: ev_etkinligi · notlar: Hece kartları eve verildi; günde 10 dk birlikte okuma. |
| vm-02 | Mina Güneş (case-mina)<br>12 yaş · ortaokul_5_8<br>diskalkuli · belirgin | diskalkuli, bilgilendirme, MEB kodu yazılmamalı | MEB kodu verildiği hâlde mektupta resmî kod YOK; 'çocuğunuz diskalkulidir' etiketi yok; güçlü yön bilinmediğinde uydurmadan sıcak açılış. | amac: bilgilendirme · mebHedefKod: 5.1.14 |
| vm-03 | Tolga Aksoy (case-tolga)<br>15 yaş · lise_9_uzeri<br>dehb_kombine, diskalkuli · belirgin | lise, görüşme özeti | Görüşme özeti: uzman notundaki konuların (sınav uyarlamaları, çalışma düzeni) veli diliyle özetlenmesi; 15 yaşın özerkliğine saygılı dil; somut sonraki adımlar. | amac: gorusme_ozeti · notlar: Sınav uyarlamaları (ek süre, formül kartı) ve basketbol öncesi 20 dk çalışma düzeni konuşuldu. |
| vm-04 | Efe Kaplan (case-efe)<br>5 yaş · okul_oncesi<br>dehb_hiperaktif · hafif | okul öncesi, hiperaktif, bilgilendirme | Okul öncesi hiperaktif profil: 'yaramaz/haylaz' etiketinden kaçınma; şarkı/hareket güçlü yönleriyle başlama; gerçekçi beklenti. | amac: bilgilendirme |

### Ev ödevi programı (Atölye) — `atolye/ev-odevi` (4 vaka)

| Vaka | Öğrenci | Etiketler | Neyi sınıyor | Gövde |
|---|---|---|---|---|
| eo-01 | Arda Yılmaz (case-arda)<br>8 yaş · ilkokul_1_4<br>disleksi, dehb_dikkat · orta | disleksi+dehb, 3 gün, ek not | 3 günlük program: her gün 15 dk'lık dilim, akşam yemeği sonrası ve kardeşin evde olduğu rutine yerleşme; futbol temalı oyun tabanlı pekiştirme (puan/ödül tablosu yok); B planı. | hedefKonu: İki heceli sözcükleri okuma · gunSayisi: 3 · ekstraNot: Akşam yemeğinden sonra 15 dk; kardeşi de evde. |
| eo-02 | Mina Güneş (case-mina)<br>12 yaş · ortaokul_5_8<br>diskalkuli · belirgin | diskalkuli, 5 gün, MEB kodu | 5 gün eldeli toplama: günler birbirini tekrarlamadan basamaklanıyor mu; MEB 5.1.14 hizası; resim ilgisi. | hedefKonu: Eldeli toplama · gunSayisi: 5 · mebHedefKod: 5.1.14 |
| eo-03 | Efe Kaplan (case-efe)<br>5 yaş · okul_oncesi<br>dehb_hiperaktif · hafif | okul öncesi, 2 gün | 2 günlük okul öncesi program: oyun temelli ve hareketli, dilimin alt ucunda (15 dk, kısa bloklar); sıra bekleme ve iki adımlı yönerge oyunları; ebeveyn bilgilendirmesi sade. | hedefKonu: Sıra bekleme ve iki adımlı yönerge takibi · gunSayisi: 2 |
| eo-04 | Tolga Aksoy (case-tolga)<br>15 yaş · lise_9_uzeri<br>dehb_kombine, diskalkuli · belirgin | lise, 7 gün, bütçe | 7 günlük üst sınır (bütçe): şişmeden her gün ayrı; 15 yaşın öz-düzenlemesine uygun (ebeveyn denetimi yerine öz-izleme); 15–20 dk dilim. | hedefKonu: Haftalık ders çalışma planı ve zaman yönetimi · gunSayisi: 7 |

### İlerleme çizelgesi (Atölye) — `atolye/ilerleme-cizelgesi` (4 vaka)

| Vaka | Öğrenci | Etiketler | Neyi sınıyor | Gövde |
|---|---|---|---|---|
| ic-01 | Arda Yılmaz (case-arda)<br>8 yaş · ilkokul_1_4<br>disleksi, dehb_dikkat · orta | disleksi+dehb, MEB kodu, BEP hedefi | BEP'teki ölçülebilir hedefin bileşenlere ayrılması; boş tablo; MEB 3.2.5; iki haftalık okuma ölçümü sıklığı. | hedefMetni: Tanıtılan seslerden oluşan iki heceli 10 sözcüğü resim desteğiyle üç ardışık oturumda 8/10 doğrulukla okur · mebHedefKod: 3.2.5 |
| ic-02 | Efe Kaplan (case-efe)<br>5 yaş · okul_oncesi<br>dehb_hiperaktif · hafif | okul öncesi, davranış hedefi | Davranış hedefi için sıklık ölçümü (yüzde değil); sonuç hücreleri boş. | hedefMetni: Etkinlik geçişinde görsel uyarıdan sonra 2 dakika içinde yönergeye uyar; 5 günün 4'ünde |
| ic-03 | Mina Güneş (case-mina)<br>12 yaş · ortaokul_5_8<br>diskalkuli · belirgin | diskalkuli, işlem | İşlem doğruluğu hedefi: 10 soruluk setle yüzde ölçümü; Not sütununun hata türü kaydına uygun kurgulanması; uydurma veri yok. | hedefMetni: Eldeli toplama içeren 10 soruluk sette %80 doğruluk, iki ardışık ölçümde |
| ic-04 | Zeynep Kocaman (case-zeynep)<br>9 yaş · ilkokul_1_4<br>disgrafi · orta | disgrafi, yazma | Yazma hedefi için gözlenebilir bileşenler (satır içinde kalma, okunaklılık); ölçüm yöntemi (örnek yazı kıyası). | hedefMetni: 15 dakikalık yazma görevinde satır içinde kalarak okunaklı 3 cümle yazar; 3 oturumda %90 |

Toplam: 21 araç, 96 vaka (88 öğrencili, 8 öğrencisiz).
