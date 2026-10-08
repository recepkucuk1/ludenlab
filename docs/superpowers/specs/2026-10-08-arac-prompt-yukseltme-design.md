# Araç prompt'larının yükseltilmesi — tasarım

Tarih: 2026-10-08 · Durum: onaylandı (sohbet), uygulama planı bekliyor · Dal: `prompt/arac-prompt-yukseltme`

## Amaç

Studio ve Atölye'deki 19 AI aracının (+ öğrenme kartı üreticisi + öğrenci AI profili) sistem ve
kullanıcı prompt'larını tek bir standarda çekip çıktı kalitesini üç eksende yükseltmek:

1. **Öğrenciye özgülük:** aynı parametrelerle hep aynı şablon çıkmasın; yaş, tanı, güçlü yön,
   ilgi alanı ve geçmiş üretimler çıktıya somut olarak yansısın.
2. **Klinik/pedagojik derinlik:** uzmanın seansta olduğu gibi kullanabileceği, kanıt temelli,
   kalıp cümlesiz içerik.
3. **Biçim ve tutarlılık:** araçlar arası ve aynı aracın üretimleri arası ton, uzunluk ve yapı
   tutarlı; PDF'e düzgün otursun.

Kısıtlar (kullanıcı kararları):

- **Aynı çıktı bütçesi.** Araç başına ortalama çıktı token'ı tabana göre ±%20 içinde kalır.
  Derinlik hacimden değil özgüllükten gelir. (Maliyetin %88–92'si çıktı token'ı; marj ince.)
- **Tek prompt, iki model.** Her araç için tek yeni prompt yazılır; Sonnet ve Haiku 5.5 üzerinde
  ölçülür. Model başına ayrı prompt seti yok.
- **Çevrimdışı geliştirme.** Sitenin API hesabında bakiye yok. Değerlendirme Claude Code
  alt-ajanlarıyla koşar; API kredisi harcanmaz. **Canlıya alma kararı bu tasarımın dışında**,
  en sonda ayrıca konuşulacak.
- **Ölçmeden değiştirme yok.** Her prompt değişikliği kör hakem + kullanıcının kör oyuyla
  tabana karşı puanlanır. Pilotlar daha önce yanılttı (Sonnet 5: pilot 0,75 → tam koşu 0,23).

## Kapsam

| Modül | Araçlar | Çıktı | Çağrı yolu |
|---|---|---|---|
| Studio | sosyal hikâye, artikülasyon, ev ödevi, oturum özeti, haftalık plan, iletişim panosu, eşleştirme, sesletim | JSON (prompt'a gömülü şema) | `createToolHandler` → `@studio/lib/anthropic` |
| Studio | öğrenme kartı üreticisi (`cards/generate`), öğrenci AI profili (`generateProfile`) | tool_use / Markdown | doğrudan `anthropic.messages.create` |
| Atölye | BEP, seans planı, davranış, okuma, matematik, materyal, uyarlama, sosyal öykü, veli mektubu, ev ödevi, ilerleme çizelgesi | Markdown | `runToolStreaming` → `definePrompt` → `@ludenlab/ai` `runPrompt` |

Kapsam dışı (bu turda yapılmaz, canlıya alma konuşmasına kalır): araç başına model seçimi ve
Haiku parametre uyarlaması ürün kodunda; yapısal çıktıya (`tool_use` / `output_config.format`)
geçiş (çevrimdışı sınanamaz); fiyat tablosu düzeltmeleri; API ile Sonnet 4.6 tabanına karşı
doğrulama koşusu.

## Bölüm A — Üründe değişenler

### A1. Ortak prompt standardı

Her aracın **sistem prompt'u** sabittir, önbellekten okunur ve şu iskeleti izler:

1. **Rol ve kitle.** Modelin kim olduğu, çıktıyı kimin okuyacağı (uzman / veli / çocuk), kayıt.
2. **Araca özgü klinik çerçeve.** Sosyal hikâye: Carol Gray cümle tipleri ve oranları. Atölye
   araçları: MEB ÖRGM Öğrenme Güçlüğü Destek Eğitim Programı (Mart 2025) ve ölçme aşamaları.
   Artikülasyon: izole→hece→kelime→cümle→bağlam hiyerarşisi. İletişim panosu: Fitzgerald
   anahtarı + çekirdek sözcük dengesi. Matematik: somut→yarı somut→soyut (CRA). BEP:
   gözlenebilir davranış + ölçüt + koşul formülü. Davranış: işlev analizi (ABC) + önleyici
   stratejiler. Okuma: fonolojik farkındalık çekirdeği.
3. **Özgüllük kuralları.** Her öneri, profildeki en az bir somut veriye (yaş, tanı, güçlü yön,
   ilgi alanı, geçmiş üretim, uzman notu) açıkça bağlanır; bağlanamayan öneri yazılmaz. İlgi
   alanı verilmişse en az iki yerde malzeme olarak kullanılır. **Yasak kalıp listesi** (ortak
   blok, başlangıç): "çok duyulu yaklaşım kullanın", "bireysel farklılıklara dikkat edin",
   "sabırlı olun", "olumlu pekiştirme yapın", "düzenli tekrar önemlidir", "motivasyonu yüksek
   tutun", "uygun ortam sağlayın", "gelişimini takip edin" — bunlar yalnız somut bir eylemle
   birlikte yazılabilir ("…ayna karşısında, dil ucunu alt dişlerin arkasına…").
4. **Karşıt örnek çifti.** Araç başına bir zayıf/iyi mini örnek (toplam ≤120 kelime): aynı
   alanın jenerik ve özgül hâli. Derinliği hacim artırmadan çıpalar; Haiku için özellikle gerekli.
5. **Biçim sözleşmesi.** Studio'da JSON şeması (bugünkü alan adları korunur; istemci ve PDF
   kodu değişmez) + alan başına cümle/kelime bütçesi. Atölye'de Markdown iskeleti (`##`/`###`,
   tablo kuralları) + bölüm başına bütçe.
6. **Öz-denetim listesi.** Çıktıdan önce 4–6 evet/hayır maddesi: hedef ses her kelimede var mı,
   ödül/puan/çıkartma yok mu, "hasta/terapist" yok mu, uzunluk bütçesi içinde mi, her öneri
   profildeki bir veriye bağlı mı, JSON tek parça ve geçerli mi. Liste çıktıya yazılmaz.
7. **Ortak etik sınır ve dil kuralı bloğu.** İki modül aynı metni paylaşır: tıbbi tanı koymama,
   kimlik bilgisi üretmeme, damgalamayan dil, "öğrenci/uzman" terminolojisi, içsel motivasyon,
   rumuz notu (öğrenciden yalnız verilen adla bahset). Bugün Atölye'de `ATOLYE_SYSTEM` içinde,
   Studio'da araç başına dağınık; `apps/hub/src/lib/prompts/ortakBloklar.ts`'e taşınır.

**Kullanıcı prompt'u** değişken kısımdır, sırayla: (a) öğrenci bağlam bloğu (A2), (b) araç
parametreleri (bugünkü gibi, etiketli), (c) koddan türetilen tek satırlık odak ("süre 10 dk →
en çok 4 adım", "12 ders → her derste 2 hedef"), (d) o araç için en kritik iki kuralın son
hatırlatması.

Üslup **Haiku-öncelikli**: açık, örnekli, örtük beklenti yok, "yapma" yerine "yap". Bu üslup
Sonnet'e de yarar; iki ayrı prompt seti tutulmaz. Haiku'ya özel bir ek, yalnız eval o araçta
gerektirirse ve o araca özel olarak eklenebilir (`PromptDef`/`ToolConfig` üzerinde isteğe bağlı
`modelAddenda`); bu turda yazılmaz.

Sistem prompt'u hedef uzunluğu araç başına 1.200–2.000 token. Bugünkü 400–900 token'lık
prompt'lar önbellek eşiğinin altında kaldığı için `cache_control` fiilen işlemiyor olabilir;
yeni uzunlukta önbellek devreye girer (API koşusunda `cache_read_input_tokens` ile doğrulanır).

### A2. Ortak öğrenci bağlam katmanı

**Studio.** `apps/hub/src/modules/studio/lib/studentContext.ts`:
`buildStudentContextBlock({ studentId, therapistId, nameMap })` → rumuzlu, bütçeli metin bloğu.
`createToolHandler` bunu bir kez kurar ve `ToolPromptContext.studentBlock` olarak her aracın
`buildUserPrompt`'una verir; araçlar bloğu olduğu gibi gömer. Öğrencisiz çalışabilen dört araç
(artikülasyon, pano, eşleştirme, sesletim) öğrenci seçildiğinde aynı bloğu alır.

Alanlar ve kırpma sırası (toplam ≤ 2.400 karakter ≈ 700 token; alanlar bu öncelikle doldurulur,
bütçe dolunca sonrakiler atlanır):

| # | Alan | Kaynak | Sınır |
|---|---|---|---|
| 1 | Kimlik: rumuz, yaş, çalışma alanı, tanı | `Student` | kesilmez |
| 2 | Uzman notları | `Student.notes` | ≤ 400 karakter |
| 3 | AI profilinin yalnız "Öncelikli Çalışma Alanları" ve "Dikkat Edilmesi Gereken Noktalar" bölümleri | `Student.aiProfile` (başlıkla ayrıştırılır) | ≤ 800 karakter |
| 4 | Son 5 kart: başlık, araç türü, tarih | `Card` | başlık ≤ 80 karakter |
| 5 | Son oturum özeti: genel değerlendirme + sonraki plan | son `SESSION_SUMMARY` kartı | ≤ 400 karakter |
| 6 | Tamamlanmış hedef kodları + sürmekte olan hedef başlıkları | `StudentProgress` | ≤ 10 madde |

Her alan `scrub` ile rumuzlanır (kart başlıkları ve profil gerçek adla kaydedilmiş olabilir).
Haftalık planın kendi sorguları ve `cards/generate`'in `StudentContext` kurulumu bu katmana
taşınır (tek kaynak). Bağlam sorgusu başarısız olursa blok atlanır, uyarı loglanır, üretim
sürer; bağlam hiçbir zaman üretimi engellemez.

**Atölye.** `runTool`, rumuzlamadan önce `Case`'i `code = input.rumuz` ile bulur (saveDocument
ile aynı anahtar) ve `generate(safeInput, ctx)`'e `ctx.gecmisBlok` verir:

| # | Alan | Kaynak | Sınır |
|---|---|---|---|
| 1 | Profil | `profilToPrompt` (mevcut) | değişmez |
| 2 | Son 3 belge: tür, tarih, ilk başlık satırı veya ilk 200 karakter | `GeneratedDocument` | ≤ 3 belge |
| 3 | Çalışılan MEB bölümleri | `Case.mebBolumler` | hepsi |

Toplam ≤ 1.600 karakter ≈ 500 token. `pseudonymizeDeep` ile rumuzlanır. `Case.okul`,
`veliIletisim`, `notes` bugünkü gibi **AI'a gitmez**. `Case` yoksa (ilk üretim) blok boştur.

### A3. Çıktı bütçesi

Taban koşusu araç başına mevcut ortalama çıktı uzunluğunu kaydeder. Yeni prompt'lar bütçeyi alan
bazında açıkça yazar (ör. `expertNotes` ≤ 4 cümle). Düzenek tahmini çıktı token'ı tabanın
+%20'sini aşan aracı işaretler; aşan prompt kabul edilmez.

### A4. Ürün kodunda değişmeyenler

JSON alan adları, istemci bileşenleri, PDF şablonları, `extractJson`, rumuz kapısı, kredi
rezervasyonu, SSE-heartbeat. Model kimliği (`claude-sonnet-4-6`) ve sıcaklık değişmez.

## Bölüm B — Nasıl ölçeceğiz

### B1. Düzenek genellemesi (`apps/hub/evals/`)

Artikülasyon düzeneği araç-bağımsız bir çekirdek + araç başına adaptör olur:

```
evals/
  lib/            ortak: koşturucu, shim, dosya alışverişi, hakem, jsonl, maliyet/tahmin
  fixtures/       sentetik öğrenciler (studio.json, atolye.json)
  tools/<modül>/<araç>/  adapter.ts · cases.json · checks.ts · (checks.selftest.eval.ts)
  run.eval.ts     EVAL_TOOL=studio/social-story EVAL_VARIANT=baseline|v1|v2 EVAL_BACKEND=api|subagent
```

Adaptör arayüzü:

```ts
interface ToolAdapter<Body> {
  id: string;                                   // "studio/social-story"
  module: "studio" | "atolye";
  invoke(body: Body, student: Fixture | null): Promise<{ status: number; body: unknown }>;
  extractOutput(resBody: unknown): unknown;     // body.story | body.text …
  renderForJudge(output: unknown, c: CaseDef): string;
  checks(args: { body: Body; output: unknown; rawText: string; alias: string | null }): CheckResult;
  criteria: CriterionDef[];                     // 4 ortak + 1–2 araca özgü
  estimateOutputTokens(rawText: string): number;
}
```

`invoke` gerçek route'u (`POST`) ya da Atölye'de route'un `runToolStreaming` çağrısını
çalıştırır; şema doğrulama, rumuzlama, prompt kurulumu, JSON çıkarma, ad geri koyma,
zenginleştirme değişmeden koşar. Taklit edilenler: oturum, Prisma (öğrenci/vaka/kart/belge
fikstürden), kredi, kullanım kaydı, hız sınırı, görsel önbelleği, banka seçimi (tohumlu).

**Shim tek noktada, iki giriş noktası:** Studio'da `vi.mock("@studio/lib/anthropic")`
(`anthropic.messages.create` → `shim.createMessage`), Atölye'de `vi.mock("@ludenlab/ai")`
kısmi taklidi (`definePrompt` yerine shim'e giden sürüm; `prompt.ts`'in `./client`'a
iç importu paket sınırından etkilenmediği için SDK seviyesinde taklit güvenilir değil).
Hakem `shim.createJudgeMessage` ile çağrılır; API modunda ikisi de gerçek SDK'ya iner.

### B2. Çevrimdışı arka uç (`EVAL_BACKEND=subagent`)

Protokol, `<flow>/<araç>/<varyant>/exchange/` altında dosya alışverişi:

| Rol | İstek | Yanıt |
|---|---|---|
| üretim | `<vaka>_rep<n>.gen.request.json` = `{ model, system, user, max_tokens }` | `<vaka>_rep<n>.gen.response.txt` = modelin ham metni |
| hakem | `<vaka>_rep<n>.judge-ab.request.json` / `…judge-ba…` = `{ model, system, user, schema }` | `….response.txt` = karar JSON'u |

Shim: yanıt dosyası varsa onu `Anthropic.Message` olarak döner (`content: [{type:"text"}]`,
`stop_reason: "end_turn"`, `model: <varyantın model kimliği>`, `usage` tahmini ve `estimated: true`
işaretli); yoksa isteği yazar ve `EvalError("bekliyor","pending")` fırlatır. Koşturucu
`pending`'i hata değil bekleyen olarak `pending.jsonl`'e yazar ve özetler. Sonuç satırına `backend: "subagent"` ve `served_model: "<ajan>@subagent"` yazılır; `servedModelMatches` değişmez. Token tahmini: `karakter / 3,2` (Türkçe, Sonnet 4.6
tokenizer'ına yakın); API koşusunda gerçek sayımla değişir.

Dağıtım (orkestratör = bu oturumdaki Claude): bekleyen istekler 8'li dalgalarla `Agent` aracına
verilir; model = varyantın modeli (`haiku` → Haiku 5.5, `sonnet` → Sonnet 5.5, `opus` → hakem).
Alt-ajan prompt şablonu (`evals/lib/subagentPrompt.ts`): "Bir API çağrısını canlandırıyorsun.
`<system>` ve `<user>` bloklarını aynen uygula; yanıtını OLDUĞU GİBİ, hiçbir açıklama, önsöz
ya da kod çiti eklemeden `<yol>` dosyasına yaz; başka araç kullanma; bitince yalnız `ok` yaz."
`.claude/agents/eval-model.md` tanımı yalnız `Write` aracını açar (çağrı başına bağlam yükünü
küçültmek için; etkisi ilk dalgada ölçülür). Her dağıtım `dispatch.jsonl`'e yazılır (vaka, model,
ajan kimliği, bildirilen token). Boş/eksik yanıt bir kez yeniden dağıtılır; ikinci başarısızlık
`errors.jsonl`'e `subagent_error` olarak düşer.

Sadakat sınırları (rapora yazılır): alt-ajan ham API çağrısı değildir (sistem prompt'u mesaj
içinde, sıcaklık/tavan/yapısal çıktı yok, Claude Code iskeleti bağlamda); kullanım ve süre
gerçek değil; `sonnet` = Sonnet 5.5 ≠ canlıdaki 4.6. Göreli karşılaştırma için yeterli, mutlak
kalite ve maliyet için değil.

### B3. Kollar ve sıra

| Kol | Prompt | Model (çevrimdışı) | Model (API, ileride) |
|---|---|---|---|
| `baseline` | eski | Sonnet 5.5 | Sonnet 4.6 (worktree'den eski kod) |
| `v1` | yeni | Sonnet 5.5 | Sonnet 4.6 |
| `v2` | yeni | Haiku 5.5 | Haiku 5.5 |

Sıra: Faz 1 bitince, prompt'lara dokunmadan **önce** tüm araçlar için `baseline` çevrimdışı
koşulur, vaka başına referans dondurulur (`baseline/ref/<vaka>`), commit `eval-taban-2026-10`
olarak etiketlenir. Artikülasyonda `.claude/hillclimb/articulation-haiku55/baseline/ref/` içindeki
16 vakalık gerçek Sonnet 4.6 referansı korunur ve kullanılır. Akış dizini
`.claude/hillclimb/prompt-yukseltme/<araç>/` (gitignored). Koşturucu referans kolunu `EVAL_REF=<varyant>`
ile alır (varsayılan `baseline`); Haiku kararı için `EVAL_VARIANT=v2 EVAL_REF=v1`.

### B4. Vakalar ve fikstürler

- Araç başına **4 vaka**: artikülasyon mevcut 16'sını korur; diğer 18 araç + kart üreticisi +
  profil üreticisi = 20 × 4 = **80 yeni vaka**, toplam 96. Her vakada `purpose` (neyi sınıyor),
  `tags`, `body`, `student` (fikstür kimliği ya da null).
- Kapsanan boyutlar: öğrencili/öğrencisiz, yaş uçları (3–4 ve 13+), eştanı, zengin bağlam
  (notlar + geçmiş kartlar/belgeler + son özet) ve boş bağlam, araca özgü uç (MEB kodlu BEP,
  12 derslik haftalık plan, sonda /r/, 12 hücreli pano, "özel" pano kategorisi, grup oturumu).
- Fikstürler sentetik; gerçek çocuk verisi yok. Studio: 6 öğrenci (notlar, AI profili, son kartlar,
  son oturum özeti, ilerleme kayıtları). Atölye: 6 vaka (profil, 2–3 belge, MEB bölümleri).
- Vaka listesini Claude taslaklar; kullanıcı tek turda onaylar/düzeltir (Faz 1 içinde).

### B5. Hakem ve kontroller

**Kör ikili hakem** (Opus: API'de mevcut `JUDGE_MODEL`, çevrimdışı Opus 5.5 alt-ajanı).
Hakem hangi adayın hangi kol olduğunu bilmez; aday metni `<aday_A>/<aday_B>` etiketlerinde
veri olarak verilir. Ortak ölçütler (her araçta):

| Ölçüt | Soru |
|---|---|
| `ozgulluk` | Öneriler profildeki somut verilere (yaş, tanı, güçlü yön, ilgi, geçmiş) bağlı mı; bu öğrenci için mi yazılmış? |
| `klinik_derinlik` | Uzman olduğu gibi kullanabilir mi; kanıt temelli, somut, kalıp cümlesiz mi; klinik hata var mı? |
| `bicim_butce` | Şema/iskelet tam mı; alan bütçeleri aşılmış mı; PDF'e uygun mu? |
| `dil_etik` | öğrenci/uzman; ödül-puan yok; tanı koyma yok; rumuz/gerçek ad sızıntısı yok |

Araca özgü ölçütler (başlangıç listesi; adaptör yazılırken vakalarla birlikte onaya gelir):

| Araç | Ölçütler |
|---|---|
| sosyal hikâye | `gray_oranlari` (tanımlayıcı çoğunluk, "yapabilirim" dili), `gorsel_uyum` |
| artikülasyon | mevcut 5 ölçüt korunur |
| ev ödevi (Studio) | `veli_dili`, `sure_uyumu` |
| oturum özeti | `veri_sadakati` (girilen yüzde/ipucu doğru, uydurma veri yok), `veli_ozeti` |
| haftalık plan | `progresyon`, `gecmis_baglanti` |
| iletişim panosu | `aac_uygunluk` (çekirdek sözcük + iletişim işlevleri), `sembol_netligi` |
| eşleştirme | `cift_kesinligi`, `seviye_uyumu` |
| sesletim | `ses_dogrulugu`, `oyun_uygulanabilirligi` |
| kart üreticisi | `hedef_hizasi`, `progresyon` |
| AI profili | `klinik_dogruluk`, `eyleme_donukluk` |
| BEP | `hedef_olculebilirlik`, `meb_hizasi` |
| seans planı | `akis_sure`, `hedef_hizasi` |
| davranış | `islev_analizi`, `onleyici_strateji` |
| okuma | `fonolojik_temel`, `metin_duzeyi` |
| matematik | `somut_soyut`, `hata_analizi` |
| materyal | `cok_duyulu_somutluk`, `uretilebilirlik` |
| uyarlama | `sinif_uygulanabilirlik`, `olcme_uyarlamasi` |
| sosyal öykü (Atölye) | `duygu_cercevesi`, `kisalik` |
| veli mektubu | `veli_dili`, `somut_oneri` |
| ev ödevi (Atölye) | `rutine_yerlesme`, `sure_uyumu` |
| ilerleme çizelgesi | `veri_sadakati`, `olcut_netligi` |

**Hakem kontrolleri** her araçta (ücretli değil, çevrimdışı): bilinen-jenerik çıktı (yasak kalıp
listesinden kurulmuş) kaybetmeli (win ≤ 0,25); özdeş çift berabere kalmalı. **Konum yanlılığı:**
geliştirme turlarında vaka başına tek rastgele sıra; son turda iki sıra (mevcut `judgePair`).
**Tekrar:** geliştirme turlarında vaka başına 1, son turda 2 (`EVAL_REPS`).
**Sert kontroller** koddan, araç başına `checks.ts`: JSON geçerliliği / Markdown iskeleti,
yasak terimler (hasta, terapist, ödül/puan/çıkartma), rumuz sızıntısı (çıktıda rumuz kalmamalı),
istenen öğe/cümle/ders sayısı, araca özgü zorunlular (hedef ses, cümle tipi dağılımı, ölçülebilir
hedef formülü vb.), tahmini çıktı token'ı. **Kör oylama** (son tur): kullanıcıya araç başına 2
çift, toplam 42; önceki eval'deki veri kapasiteli artifact sayfası yeniden kullanılır.

### B6. Karar kuralları (araç başına)

- **Prompt kabul:** `v1` tabanı hakemde ≥ 0,65 oranla geçer **ve** sert kontroller gerilemez
  **ve** tahmini çıktı token'ı taban +%20 içinde **ve** kullanıcının kör oyu aleyhte değil.
- **Haiku adayı:** `v2`, `v1`'e karşı ≥ 0,40 (belirgin geride değil) **ve** tüm vakalarda sıfır
  sert hata. Adaylar listelenir; karar canlıya alma konuşmasında, API doğrulamasıyla birlikte.
- Araç başına en çok **3 iterasyon turu**. Her turda prompt değişikliği ve gerekçesi
  `_state.json`'a yazılır (tur, değişen bloklar, puanlar).
- Kabul edilmeyen araçta eski prompt kalır; rapor nedenini yazar.

### B7. Fazlar ve teslimatlar

| Faz | İçerik | Çıktı |
|---|---|---|
| 1 Altyapı | ortak bloklar dosyası (metin henüz eski), adaptör arayüzü + 21 adaptör, SDK shim, çevrimdışı arka uç, fikstürler, 80 vaka (kullanıcı onayı), hakem genellemesi + kontroller, `eval-model` ajan tanımı, taban koşusu, etiket | tüm araçlarda dondurulmuş referans |
| 2 Studio | bağlam katmanı (`studentContext.ts`, TDD) + handler entegrasyonu; 8 araç + kart + profil prompt'ları; tur döngüsü | kabul edilen Studio prompt'ları |
| 3 Atölye | `runTool` geçmiş bloğu (TDD); `ATOLYE_SYSTEM` + 11 kullanıcı prompt'u; tur döngüsü | kabul edilen Atölye prompt'ları |
| 4 Kapanış | son tur iki sıralı hakem, kör oylama, sonuç sayfası (artifact), canlıya alma konuşması için aday listesi | rapor + karar gündemi |

Her faz TDD: bağlam katmanı kırpma/bütçe/rumuz, Atölye geçmiş bloğu, her adaptörün `checks`
öz-testi (bilinen iyi/kötü örnek), shim alışveriş turu (kuru mod: istek yaz → sahte yanıt →
yeniden koş), `toolGate.test.ts` korunur (haftalık plan kapı içinde kalır).

## Veri akışı (çevrimdışı tur)

```
run.eval.ts (EVAL_BACKEND=subagent, EVAL_TOOL=…, EVAL_VARIANT=v1)
  └─ adaptör.invoke → gerçek route → shim: yanıt yok → exchange/*.gen.request.json + pending
orkestratör (Claude) → 8'li dalga → Agent(model) → *.gen.response.txt
run.eval.ts (tekrar)
  └─ shim: yanıt var → route devam (JSON çözme, ad geri koyma, zenginleştirme)
     → checks → hakem isteği → exchange/*.judge-*.request.json + pending
orkestratör → Agent(opus) → *.judge-*.response.txt
run.eval.ts (tekrar) → karar JSON çözülür → results.jsonl · traces/ · out/ · progress.txt
```

## Hata yönetimi

- **Bağlam katmanı (ürün):** DB hatası → blok atlanır, `console.warn`, üretim sürer. Bütçe
  aşımı deterministik kırpma (öncelik tablosu), asla istisna değil.
- **Düzenek:** `pending` hata sayılmaz. Alt-ajan boş/eksik dosya → bir yeniden dağıtım, sonra
  `subagent_error`. Hakem JSON'u çözülmezse `judge_parse`, bir yeniden dağıtım. Geçersiz model
  JSON'u (Haiku'da görüldü) **sert hata** olarak sayılır ve kaydedilir; route'un 500'ü vakanın
  `ok=false` sonucudur. Kesilen çıktı (`max_tokens`) çevrimdışı modda oluşmaz; API modunda
  mevcut davranış.
- **Rumuz:** istek dosyalarında gerçek ad geçerse (`real_name_in_request`) koşu durur; bu
  kapıdan sızıntı test hatasıdır.

## Riskler ve açık noktalar

- **Sonnet 5.5 ≠ 4.6.** Tabana karşı kazanım çevrimdışıda proxy ile ölçülür; canlıya alma
  öncesi API doğrulaması gerekir. Artikülasyon istisna (gerçek 4.6 referansı var).
- **Alt-ajan sadakati.** Sistem prompt'u mesaj içinde; Claude Code iskeleti bağlamda. Tüm kollar
  aynı koşulda koştuğu için göreli sıralama korunur; mutlak kalite ölçülmez.
- **Kota.** Tur başına ~330 alt-ajan çağrısı, her biri ~80K bağlam (çoğu önbellek). `eval-model`
  ajan tanımı yükü düşürmezse vaka sayısı 3'e indirilir (kullanıcı seçeneği).
- **Haiku JSON güvenilirliği.** Geçersiz JSON sert hatadır; Haiku adaylığını düşürür. Yapısal
  çıktı API aşamasında ayrıca denenir.
- **Önbellek.** Sistem prompt'u değişince önbellek anahtarı değişir (5 dk TTL, etkisi önemsiz).
  Yeni uzunluk önbellek eşiğini aştığı için canlıda girdi maliyeti düşebilir; API koşusunda
  doğrulanır.
- **Dal durumu.** Eval dalları hiç push edilmedi; bu dal da push edilmez. Push/merge canlıya
  alma konuşmasının parçası.

## Canlıya alma konuşmasına bırakılanlar

1. Araç başına model seçimi (`ToolConfig.model`, `PromptDef.model`) ve Haiku için parametre
   uyarlaması (sıcaklık kaldırma, düşünme ayarı, `content` içinde yalnız `text` bloklarını okuma,
   `max_tokens` ×1,3).
2. API ile doğrulama koşusu: eski prompt Sonnet 4.6 (worktree) ↔ yeni prompt Sonnet 4.6 ↔ yeni
   prompt Haiku 5.5; gerçek maliyet ve süre.
3. Yapısal çıktı (`output_config.format`) ile JSON hatasının kapatılması.
4. `packages/ai/src/usage.ts` fiyat tablosu (Haiku 5.5, Sonnet 5.5) düzeltmeleri.
5. Dalın push'u, CI, deploy.
