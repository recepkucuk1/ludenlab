# Faz 0 — Ödül Dili Kararı ve Atölye'nin Ortak Kapanış Bloğuna Bağlanması — Tasarım

Tarih: 2026-11-03
Modüller: Atölye (sistem prompt'u, iki araç prompt'u, SSS) · Studio (pano, haftalık istatistik, SSS) · eval (davranış)
Durum: Tasarım onaylandı, uygulama planı bekliyor
Kaynak: 2026-11-03 eğitim-felsefesi değerlendirmesi (sohbette; repoda yok). Bu, sekiz araç ve iki mimari
işten oluşan programın ilk parçasıdır (Faz 0). Sonraki parçalar kendi spec'lerini alır.

## 1. Amaç

Ürünün iki modülü iki ayrı pedagojik rejimle çalışıyor: Studio'nun her aracı dışsal ödül önermeyi
yasaklıyor (ortak kapanış bloğu, `DIL_KURALI`); Atölye bu bloğa bağlı değil, ev ödevi prompt'u
"ödül tabanlı bitiriş", davranış planı "pekiştireç örnekleri" istiyor. Studio panosu ise uzmana
"Günlük Seri" (alev) kartıyla, çocuğa yasaklanan dışsal motivasyonu uyguluyor. Bu faz kararı verir,
yazar ve kilitler: iki modül aynı kapanış bloğunu kullanır; tek istisna davranış destek planıdır ve
istisna sınırlarıyla birlikte prompt'ta, SSS'de ve eval'de açıkça yazılıdır.

## 2. Karar: iki rejim, bilinçli

- Studio'nun ve Atölye'nin bütün pedagojik araçları dışsal ödül (ödül, puan, çıkartma, yıldız
  tablosu) önermez. Kural tek yerde yaşar: `apps/hub/src/lib/prompts/ortakBloklar.ts` içindeki
  `ORTAK_SON_BLOK`.
- Tek istisna Atölye Davranış Destek Planı'dır. Olumlu davranışsal destek yaklaşımı işlev-temelli
  pekiştirme kullanır; bu araçta pekiştirme yalnız 6. bölümde, işlev hipotezine bağlı, önce doğal ve
  sosyal, somut ödül yalnız gerekçesiyle ve geçici olmak koşuluyla, her pekiştireç için sönümlenme
  basamağıyla yazılır. İstisna sistem prompt'unda değil, yalnız o aracın kullanıcı prompt'unda durur.
- Uzmana dönük dışsal motivasyon öğesi olan "Günlük Seri" pano kartı kaldırılır; yerine uzmanın
  işine bakan bir sayı gelir.
- Duruş kullanıcıya açıkça anlatılır: iki landing'e SSS maddesi, davranış planı çıktısına sabit not.

## 3. Kapsam

Dahil:
- `apps/hub/src/modules/atolye/lib/atolye-system.ts`: satır içi "ETİK SINIR" çıkar, `ORTAK_SON_BLOK`
  kapanış olarak girer.
- `apps/hub/src/modules/atolye/lib/davranis-prompts.ts` + `davranis.ts`: pekiştirme bölümü ve istisna
  cümlesi; sabit not `PEKISTIRME_NOTU`.
- `apps/hub/src/modules/atolye/lib/ev-odevi-prompts.ts`: "Ödül veya oyun tabanlı bitiriş" satırı.
- `apps/hub/src/app/studio/api/stats/weekly/route.ts` + `apps/hub/src/app/studio/(main)/dashboard/page.tsx`:
  seri kaldırılır, "Çalışılan Hedef" gelir.
- SSS maddesi: `apps/hub/src/modules/studio/components/landing/StudioLanding.tsx` (`FAQ_ITEMS`) ve
  `apps/hub/src/modules/atolye/components/Landing.tsx` (`FAQ`).
- Testler (§9) ve davranış eval'i (§10).
- `ortakBloklar.ts` üst yorumundaki "Atölye bağlantısı Faz 3" notu güncellenir.

Hariç (bilinçli):
- Atölye'nin 11 prompt'unun Studio iskeletine (`studioSistemPromptu`) taşınması. Bu, prompt yükseltme
  programının Faz 3'üdür; ayrı spec.
- Rozet sistemi (`badges.ts`: `streak_3/7/30`, `/studio/api/stats/badges`). `calculateStreak` orada
  kullanıldığı için `badges.ts`'te kalır. Rozetlerin kaldırılması ayrı karar (§12).
- Atölye panosu (seri kartı yok), hub landing'i, KVKK/yasal metinler.
- Veri modeli: migration yok.

## 4. Prompt bağlantısı — `ATOLYE_SYSTEM`

Yeni kurulum (dizi birleşimi, iki boş satırla):

1. Rol cümlesi (değişmez).
2. `ÇERÇEVE VE İLKELER` (beş madde, değişmez; "çocuğun ilgi alanlarını etkinliklere taşı" cümlesi
   burada kalır — `ortakBloklar.ts` yorumunun koruma şartı).
3. `BİÇİM` (değişmez; `⚠️ ${TASLAK_NOTU}` satırı burada kalır).
4. `ORTAK_SON_BLOK` (etik sınır → dil kuralı → rumuz notu → yasak kalıplar), Studio ile aynı sırada,
   en sonda.

Satır içi `ETİK SINIR` bloğu silinir; metni `ETIK_SINIR` sabitiyle zaten aynıdır (yorum bunu söyler,
test bunu doğrular). Sonuçta "ETİK SINIR" başlığı prompt'ta tam bir kez geçer.

Meslek unvanı istisnası (uygulama notu 2026-11-04, kod incelemesi): `DİL KURALI`'nın "terapist yerine uzman"
maddesi uzmanın kendisini ve öğrenciyi adlandırmakla ilgilidir; Atölye'de "dil ve konuşma terapisti",
"odyolog", "çocuk-ergen psikiyatristi", "RAM uzmanı" yönlendirme ve iş birliği bağlamında meşru unvanlardır
(eval zaten `konusmaTerapistiMuaf` ile muaf tutar). Bu yüzden `ÇERÇEVE VE İLKELER`'e altıncı madde eklenir:
"Meslek unvanları (DKT, odyolog, çocuk-ergen psikiyatristi, RAM uzmanı) yönlendirme ve iş birliği bağlamında
yazılabilir; aşağıdaki DİL KURALI'nın "terapist" maddesi uzmanın kendisini ve öğrenciyi adlandırmakla
ilgilidir, meslek unvanıyla değil." Madde "DKT" kısaltmasını kullanır ki yasak sözcük denetimi geçsin.
Çerçevenin ilk beş maddesi değişmez.

Etkisi: her Atölye aracı artık `DİL KURALI` (hasta→öğrenci, terapist→uzman, dışsal ödül önerme,
güçlü-yön dili), `RUMUZ NOTU` ve `JENERİK KALIPLAR` kurallarını alır. Araç kullanıcı prompt'ları,
çıktı şemaları, `definePrompt` ayarları (sıcaklık, token) ve `TASLAK_NOTU` değişmez. Sistem metni
sabit kaldığı için önbellek davranışı aynıdır.

## 5. Davranış destek planı istisnası

`davranis.ts` (client + server güvenli, `TASLAK_NOTU` gibi) yeni sabit:

```ts
export const PEKISTIRME_NOTU =
  "Not: Pekiştirme bu planda geçici bir köprüdür; sönümlenme basamakları uygulanmadan plan tamamlanmış sayılmaz.";
```

`davranis-prompts.ts` kullanıcı prompt'unda 6. madde şu metinle değişir:

> 6. **Pekiştirme planı** — işlev hipotezine bağlı; önce doğal ve sosyal pekiştireç (etkinlik seçimi,
> sorumluluk, somut övgü), somut/nesne ödül yalnız gerekçesiyle ve geçici; kademeli; **her pekiştireç
> için sönümlenme basamağı** (hangi ölçütte seyreltilir, neye devredilir). Bölümün sonuna aynen şu
> satırı ekle: "`${PEKISTIRME_NOTU}`"

`KURALLAR` satırına, mevcut cümlelerin ardına eklenir (uygulama notu 2026-11-04: sistem kuralı birebir
alıntılanır; "puan dili" yerine "sistem", ki 7. bölümdeki öz-izleme puanlaması bastırılmasın):

> Bu araç, DİL KURALI'ndaki "dışsal ödül sistemi ÖNERME" maddesinin tek istisnasıdır; istisna yalnız 6. bölüm
> için ve yukarıdaki sınırlarla geçerlidir, diğer bölümlerde ödül/puan/çıkartma sistemi önerme.

Kullanıcı prompt'u test edilebilsin diye gövde, `davranisKullaniciPromptu(input: DavranisInput): string`
adlı saf fonksiyon olarak dışa açılır; `definePrompt`'un `user` alanı bu fonksiyonu çağırır. Davranış
değişmez.

## 6. Ev ödevi düzeltmesi

`ev-odevi-prompts.ts` günlük plan alt maddesi:

- Eski: `Oyunlaştırma/Pekiştirme (Ödül veya oyun tabanlı bitiriş)`
- Yeni: `Oyunlu kapanış (oyun ya da birlikte yapılan keyifli bir bitiriş; puan, çıkartma, dışsal pekiştireç yok)`

Yeni satır "ödül" sözcüğünü olumsuzlayarak bile içermez; böylece prompt testi tek bir "ödül geçmez" iddiasıyla
kilitler. Eval'in bölüm regex'leri (`EV_ODEVI_BOLUMLERI`) üst başlıklara bakar, bu alt maddeye bakmaz.
Uygulama notu (2026-11-04): `evals/tools/atolye/ev-odevi/adapter.selftest.eval.ts` eski satırı bilerek
sabitliyordu ("ürün istemi ödül/oyun tabanlı bitişi SERBEST bırakır"); öncül tersine döndüğü için o öz-test
yeni satırı sabitler ve eski satırın yokluğunu doğrular. Hakem ölçütleri Faz 0'da DEĞİŞMEZ (`faz0` ile
`baseline` aynı ölçütle kıyaslansın diye). Kullanıcı prompt'u aynı şekilde `evOdeviKullaniciPromptu(input)` olarak dışa açılır.
Diğer dokuz Atölye aracında ödül dili yoktur (tarama 2026-11-03); dokunulmaz.

## 7. Studio panosu: "Günlük Seri" → "Çalışılan Hedef"

`stats/weekly/route.ts`:
- `allCompleted` sorgusu, `calculateStreak` çağrısı ve import'u, yanıttaki `streak` alanı kalkar.
- Yeni alan `goalsWorked = recentProgress.length`: son yedi günde `updatedAt`'i güncellenen
  `StudentProgress` satırı sayısı. Satırlar `@@unique([studentId, goalId])` olduğundan bu, "kaydı
  güncellenen öğrenci×hedef" sayısıdır (uygulama notu 2026-11-04: `updatedAt` `@updatedAt` olduğu için
  yalnız not düzenlemesi de sayılır; alt yazı "durumu" değil "kaydı" der). Mevcut `studentsWorked` ve
  `cardsCreated` aynen kalır; `goalsCompleted` artık `completed` VE `mastered` durumlarını sayar
  (hedef takibi "mastered" yazar, pano yalnız "completed" sayıyordu — eski sayım hatası; liste
  `studentContext.ts` `TAMAMLANAN_DURUMLAR` ile ortak).
- Yanıt: `{ studentsWorked, goalsCompleted, cardsCreated, goalsWorked }`.

`dashboard/page.tsx`:
- `WeeklyStats` tipinde `streak: number` → `goalsWorked: number`.
- Dördüncü kart: `Icon: Target` (lucide), `label: "Çalışılan Hedef"`, `value: weekly?.goalsWorked ?? 0`,
  `sub: "Bu hafta kaydı güncellenen hedef"`, `tint: var(--poster-pink)`, `suffix` yok. `Flame` import'u
  kalkar. Üçüncü kartın alt yazısı "Bu hafta genel değerlendirme" → "Bu hafta tamamlanan hedef".
- Bekçi testi (kaynak metin): `stats/weekly/weeklyStats.test.ts` — rota `streak`/`calculateStreak`
  içermez, pano "Günlük Seri"/`Flame` içermez.

`stats/badges/route.ts` ve `badges.ts` dokunulmaz.

## 8. SSS metinleri

Studio (`FAQ_ITEMS`, son maddeden önce, "Fatura ve ödeme" maddesinin üstüne):

- q: `Neden ödül, puan ya da yıldız tablosu önermiyorsunuz?`
- a: `Araçlar içsel motivasyona dayanır: oyun, merak ve öğrencinin kendi ilerlemesini fark etmesi.
  Dışsal ödül sistemleri kısa vadede işe yarasa da becerinin kalıcılığını ve öğrencinin özerkliğini
  zayıflatabilir; bu yüzden hiçbir çıktı çıkartma, puan ya da ödül önermez.`

Atölye (`FAQ`, "tanı koyar mı" maddesinin ardına):

- q: `Neden ödül, puan ya da yıldız tablosu önermiyorsunuz?`
- a: `Araçlar içsel motivasyona dayanır: oyun, merak ve öğrencinin kendi ilerlemesini fark etmesi;
  çıktılar çıkartma, puan ya da ödül önermez. Tek istisna Davranış Destek Planı'dır: olumlu davranışsal
  destek yaklaşımı işlev-temelli pekiştirme kullanır. Plan her pekiştireç için sönümlenme basamağı
  yazar ve bunun geçici bir köprü olduğunu açıkça belirtir.`

## 9. Testler

Önce test, sonra kod (TDD). Vitest, `apps/hub`.

- Yasak sözcük taraması `promptIddialari`'ndan ayrıştırılıp `yasakSozcukDenetimi(system: string): void`
  olarak dışa açılır; iki modül paylaştığı için ortak lib'de yaşar: `apps/hub/src/lib/prompts/yasakSozcuk.ts`
  (`YASAK_SOZCUKLER` ile birlikte; uygulama notu 2026-11-04, Atölye → Studio bağımlılığı olmasın diye).
  `iskelet.ts` oradan içe aktarır, `promptIddialari` onu çağırır. Davranış değişmez; `card.prompt.test.ts`
  ve diğer Studio prompt testleri aynen geçer.
- Yeni `apps/hub/src/modules/atolye/lib/atolye-system.test.ts`:
  - `ATOLYE_SYSTEM`, `ORTAK_SON_BLOK` ile biter.
  - `"ETİK SINIR"` tam bir kez geçer.
  - `"ilgi alanlarını etkinliklere taşı"` ve `TASLAK_NOTU` geçer.
  - `yasakSozcukDenetimi(ATOLYE_SYSTEM)` hata atmaz.
  - Meslek unvanı istisnası maddesi çerçevede (§4).
  - Bekçi: `src/modules/atolye/lib/*-prompts.ts` dosyalarının her biri `system: ATOLYE_SYSTEM` içerir (en az
    11 dosya). Gerekçe: SSS "hiçbir çıktı ödül önermez" diyecek; yeni bir araç ortak bloğu sessizce atlayamaz.
- Yeni `apps/hub/src/modules/atolye/lib/davranis-prompts.test.ts` (sabit fikstür girdi ile):
  - Kullanıcı prompt'u `PEKISTIRME_NOTU`'nu, `"sönümlenme"` sözcüğünü ve `"tek istisnası"` ifadesini
    içerir; `"pekiştireç örnekleri"` artık geçmez.
- Yeni `apps/hub/src/modules/atolye/lib/ev-odevi-prompts.test.ts`:
  - Kullanıcı prompt'u tr-TR küçük harfte `"ödül"` içermez; `"oyunlu kapanış"` içerir.
- `ortakBloklar.test.ts` değişmez (mevcut iddialar yeterli).
- Haftalık rota ve pano için birim test yazılmaz (mevcut rotalarda da yok); tip denetimi ve `next build`
  ile doğrulanır.

## 10. Eval (davranış)

- `apps/hub/evals/tools/atolye/davranis/checks.ts`: deterministik `sonumlenme` kontrolü — pekiştirme
  bölümünün NOT DIŞINDAKİ satırlarında `/sönümlen/` geçer VE metin `PEKISTIRME_NOTU`'nu biçimden bağımsız
  (`notNormalize`, `TASLAK_NOTU` ile aynı yöntem) içerir → 1, aksi hâlde 0. (Notun kendisi "sönümlenme
  basamakları" dediği için not satırı sayılmaz; aksi hâlde boş bölüm de geçerdi.)
- `apps/hub/evals/tools/atolye/davranis/adapter.ts`: yeni hakem ölçütü
  `{ key: "sonumlenme", question: "Pekiştirme planı işlev hipotezine bağlı mı; doğal ve sosyal pekiştireç
  önce mi; her pekiştireç için sönümlenme basamağı (ölçüt + neye devredileceği) yazılmış mı; bölüm
  PEKİSTİRME notuyla bitiyor mu?" }`.
- Koşu: yalnız `atolye/davranis` (4 vaka) ve `atolye/ev-odevi` (4 vaka), mevcut eval düzeneğiyle
  (`apps/hub` içinden `EVAL_TOOL=… EVAL_VARIANT=faz0 ev evals/run.eval.ts`; yanıtlar `eval-model`
  alt-ajanıyla üretilir, API çağrısı yok). Akış dizini ana çalışma kopyasındadır, worktree'de değil:
  `EVAL_FLOW=/Users/recepkucuk/ludenlab/.claude/hillclimb/prompt-yukseltme`. Referans kolu `baseline`
  (iki araç için taban koşusu orada mevcut, etiket `eval-taban-2026-10`).
- Kabul: her iki araçta `dil_kurali` ve `yasak_kalip` sert hatası sıfır; `sonumlenme` kontrolü 4/4;
  hakem ölçütlerinde `faz0` kolu `baseline`'dan düşmez. Düşerse prompt metni bir tur düzeltilir,
  yeniden koşulur; ikinci turda da düşerse kullanıcıya sorulur.

## 11. Doğrulama ve yayın

- `pnpm --filter @ludenlab/hub test` (vitest), `pnpm typecheck`, `next build` yeşil.
- Pano kartı tarayıcıda görülür (dev sunucusu prod veritabanına bakar: yalnız okuma).
- Dal `main`'e merge edilince Hostinger otomatik deploy eder; migration yok, env yok.
- Hafıza notu `egitim-felsefesi-degerlendirmesi-2026-11` "Faz 0 tamam" olarak güncellenir.

## 12. Açık nokta (bu fazda karar verilmedi)

Rozet sistemi (`streak_3`, `streak_7`, `streak_30` ve diğer rozetler) uzmana dönük dışsal motivasyonun
asıl gövdesidir ve bu fazda kalır. Kaldırma ya da "yalnız öğrenci ilerlemesine bağlı rozet" seçeneği,
Faz 1 çıkınca ayrı karar olarak sorulur.
