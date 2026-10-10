# Araç değerlendirme düzeneği

Spec: `docs/superpowers/specs/2026-10-08-arac-prompt-yukseltme-design.md` (Bölüm B). Planlar: `docs/superpowers/plans/2026-10-08-arac-prompt-yukseltme-faz1a.md`
(çekirdek) ve `docs/superpowers/plans/2026-10-09-arac-prompt-yukseltme-faz1b.md` (21 araca yaygınlaştırma).

**İçindekiler**

- **Kullanım:** Komutlar · Araçlar · Akış dizini · Özet · Vaka listesi · Yeni araç eklemek
- **Orkestratör:** Dosya protokolü · Alt-ajan tanımı (`eval-model`) · Çevrimdışı (subagent) döngüsü
- **Ölçüm ilkeleri:** Sadakat sınırları · Puanlayıcı ilkesi · UI'den türeyen kurallar · Bilgi asimetrisi · Beklenen taban sert hataları · Bilinen ürün hatası: banka kaybı
- **İç yapı:** Tohumlu rastgelelik · Kart üreticisi: tool_use taklidi · Fikstürler · Artikülasyon referansları · PII maskesi · Ortak Atölye katmanı

## Kullanım

### Komutlar (apps/hub içinden)

Önce kabuk fonksiyonunu tanımla (zsh ve bash'te çalışır; kalıcı olması için `~/.zshrc`'ye de eklenebilir,
ama yol göreli olduğundan yalnız `apps/hub` içinden çağrıldığında çalışır). Fonksiyon, ortam değişkenlerini
komut önekiyle (`EVAL_TOOL=… ev …`) alır:

```bash
ev() { node_modules/.bin/vitest run --config vitest.eval.config.ts "$@"; }

# Öz-testler / kapı (API/alt-ajan yok)
ev evals/lib evals/tools evals/runner.selftest.eval.ts

# Bir aracı bir kolda koştur (varsayılan arka uç: subagent); kimlikler aşağıdaki "Araçlar" tablosunda
EVAL_TOOL=studio/homework EVAL_VARIANT=baseline ev evals/run.eval.ts
EVAL_TOOL=studio/homework EVAL_VARIANT=v1 ev evals/run.eval.ts              # referans: baseline
EVAL_TOOL=studio/homework EVAL_VARIANT=v2 EVAL_REF=v1 ev evals/run.eval.ts  # Haiku ↔ yeni-Sonnet
EVAL_TOOL=atolye/seans-plani EVAL_VARIANT=baseline EVAL_CASES=seans-02 ev evals/run.eval.ts  # tek vaka

# Hakem kontrolleri (önce baseline koşmuş olmalı)
EVAL_TOOL=studio/homework ev evals/judgeControls.eval.ts

# Tüm araç × kol özet tablosu → <akış>/ozet.md (bkz. "Özet"); başka dizin: EVAL_FLOW=<mutlak yol>
ev evals/summary.eval.ts

# Vaka listesi (cases.json'lardan onay dokümanı üretir; bkz. "Vaka listesi")
ev evals/vakaListesi.eval.ts

# API arka ucu (bakiye gerektirir)
EVAL_BACKEND=api EVAL_BUDGET_USD=5 EVAL_TOOL=atolye/bep EVAL_VARIANT=baseline ev evals/run.eval.ts
```

Ortam: `EVAL_TOOL` (zorunlu), `EVAL_VARIANT` (zorunlu; baseline|v1|v2; `run.eval.ts` için), `EVAL_BACKEND`
subagent|api, `EVAL_REF` (referans kolu `<variant>[@<tag>]`; varsayılan etiketsiz baseline), `EVAL_TAG` (tur
etiketi: aynı varyantı temiz dizinde yeniden koşmak için; kol dizini `<variant>@<tag>`, hakem kontrollerinde
`controls@<tag>`; referansı SEÇMEZ — `EVAL_REF=baseline@<tag>` ile eşleşir: yeni turun tabanını referans yapmak
için önce `EVAL_VARIANT=baseline EVAL_TAG=r2 EVAL_REF=baseline@r2`, sonra `v1` için `EVAL_TAG=r2 EVAL_REF=baseline@r2`;
`EVAL_REF` verilmezse `v1@r2` eski tabana karşı ölçülür; kullanılan referans her sonuç satırına `ref` olarak yazılır ve özet tablosu tabanı o alandan okur, bkz. "Özet"), `EVAL_REPS` (1), `EVAL_CASES` (virgüllü; koşulacak
vakaların listesi — hakem kontrolleri tek vaka alır), `EVAL_CONCURRENCY` (4), `EVAL_TIMEOUT_S` (900),
`EVAL_BUDGET_USD` (yalnız api), `JUDGE_ORDERS` 1|2 (subagent'ta 1, api'de 2), `EVAL_FLOW` (akış dizini; mutlak yol ver).

Tip denetimi (apps/hub içinden): `npm run typecheck:evals`; lint: `node_modules/.bin/eslint evals`.

`ev`'i yol süzgeci OLMADAN çalıştırma: `vitest.eval.config.ts` `evals/**/*.eval.ts`'in tamamını toplar; bunların içinde model koşturan
(`run.eval.ts`, `judgeControls.eval.ts`) ve dosya yazan (`summary.eval.ts` → `ozet.md`, `vakaListesi.eval.ts` → onay dokümanı) betikler var.
Kapı komutu yalnız öz-testleri (`evals/lib`, `evals/tools`, `evals/runner.selftest.eval.ts`) seçer.

### Araçlar

`EVAL_TOOL` değerleri (`evals/tools/registry.ts`; 21 araç, 96 vaka = 16 artikülasyon + 20 × 4). Etiket, hakem prompt'unda okunan araç adıdır
(adaptörün `label`'ı, tam hâliyle). "Öğrenci": vakaların öğrencisi (Studio fikstürü / Atölye vaka fikstürü) zorunlu mu — isteğe bağlı araçlarda en az bir
vaka bilerek öğrencisizdir. Atölye araçlarının hepsi rumuz zorunlu olduğundan her vakası öğrencilidir.

| Kimlik | Modül | Etiket | Vaka (öğrencili) | Öğrenci | Çıktı biçimi |
|---|---|---|---|---|---|
| `studio/social-story` | Studio | Sosyal hikâye (Studio) | 4 (4) | zorunlu | JSON |
| `studio/articulation` | Studio | Artikülasyon alıştırması (Studio) | 16 (12) | isteğe bağlı | JSON |
| `studio/homework` | Studio | Ev ödevi materyali (Studio) | 4 (4) | zorunlu | JSON |
| `studio/session-summary` | Studio | Oturum özeti (Studio) | 4 (4) | zorunlu | JSON |
| `studio/weekly-plan` | Studio | Haftalık çalışma planı (Studio) | 4 (4) | zorunlu | JSON |
| `studio/comm-board` | Studio | İletişim panosu (Studio, AAC) | 4 (3) | isteğe bağlı | JSON |
| `studio/matching-game` | Studio | Kelime eşleştirme oyunu (Studio) | 4 (3) | isteğe bağlı | JSON |
| `studio/phonation` | Studio | Sesletim oyunu (Studio) | 4 (3) | isteğe bağlı | JSON |
| `studio/cards` | Studio | Öğrenme kartı üreticisi (Studio) | 4 (3) | isteğe bağlı | JSON (`tool_use`, bkz. aşağıda) |
| `studio/ai-profile` | Studio | AI öğrenci profili (Studio) | 4 (4) | zorunlu | Markdown |
| `atolye/bep` | Atölye | BEP hedef taslağı (Atölye) | 4 (4) | zorunlu (rumuz) | Markdown |
| `atolye/seans-plani` | Atölye | Seans planı (Atölye) | 4 (4) | zorunlu (rumuz) | Markdown |
| `atolye/davranis` | Atölye | Davranış destek planı (Atölye) | 4 (4) | zorunlu (rumuz) | Markdown |
| `atolye/okuma` | Atölye | Okuma akıcılık seti (Atölye) | 4 (4) | zorunlu (rumuz) | Markdown |
| `atolye/matematik` | Atölye | Matematik destek seti (Atölye) | 4 (4) | zorunlu (rumuz) | Markdown |
| `atolye/materyal` | Atölye | Çok duyulu materyal (Atölye) | 4 (4) | zorunlu (rumuz) | Markdown |
| `atolye/uyarlama` | Atölye | Uyarlama önerisi (Atölye) | 4 (4) | zorunlu (rumuz) | Markdown |
| `atolye/sosyal-oyku` | Atölye | Sosyal öykü (Atölye) | 4 (4) | zorunlu (rumuz) | Markdown |
| `atolye/veli-mektubu` | Atölye | Veli mektubu (Atölye) | 4 (4) | zorunlu (rumuz) | Markdown |
| `atolye/ev-odevi` | Atölye | Ev ödevi programı (Atölye) | 4 (4) | zorunlu (rumuz) | Markdown |
| `atolye/ilerleme-cizelgesi` | Atölye | İlerleme çizelgesi (Atölye) | 4 (4) | zorunlu (rumuz) | Markdown |

Her aracın vakaları `evals/tools/<modül>/<araç>/cases.json`'dadır (`id`, `tags`, `purpose`, `body`, `student`); `purpose` hakem görevine girer.
Vaka gövdesi taban koşusundan sonra değişirse eski referans geçersiz kalır: değişen vakaya YENİ kimlik ver (`hw-02` → `hw-02b`).

### Akış dizini

Komutlar `apps/hub`'tan koşar, ama akış dizini DEPO KÖKÜNE göredir (`evals/lib/core.ts` içinde `FLOW_DIR`):
`.claude/hillclimb/prompt-yukseltme/<tool>/<variant>[@<tag>]/`. İçinde `results.jsonl` (vaka başına satır),
`errors.jsonl`, `pending.json` (yanıt bekleyen istekler), `dispatch.jsonl` (orkestratörün dağıtım notu),
`exchange/` (istek/yanıt dosyaları), `out/` (uygulamanın döndürdüğü içerik), `ref/` (dondurulmuş referans,
vaka başına bir kez), `traces/`, `progress.txt` bulunur. Hakem kontrolleri `<tool>/controls[@<tag>]/`
altına `judge_controls.json`, `pending.json`, `exchange/` yazar. Akış dizininin kökünde özet betiğinin yazdığı `ozet.md` durur. gitignore'da.

### Özet

`ev evals/summary.eval.ts` (`EVAL_FLOW=<mutlak yol>` ile başka akış dizini; dizin yoksa açık hata verir) `<akış>/<modül>/<araç>/<kol>/results.jsonl`
dosyalarını tarar ve araç × kol Markdown tablosunu `<akış>/ozet.md`'ye ve stderr'e yazar. Kol dizin adı `baseline|v1|v2` + isteğe bağlı `@etiket`
(`[A-Za-z0-9._-]`) olmalıdır; hakem kontrolleri (`controls[@etiket]`) sessizce, başka adlar bildirilerek atlanır; sonuçsuz kollar listelenmez.

**Vaka bazlı toplama (etiket karar anında yanlış olmasın).** Satırlar `prompt_id`'ye göre gruplanır: vakanın win'i = tekrarların ortalaması, sert hatası = tekrarlar boyunca
NEDEN KÜMESİ, token'ı = ortalama; kol puanı vaka ortalamalarının ortalamasıdır (çok tekrarlı vaka kolu ezmez). Tekrarlar arasında sert hatalar BİRLEŞTİRİLİR: bir tekrarda bile görülen neden
vakaya sayılır (bilerek tutucu; tek tekrardaki rastgele bir hata da vakayı sert hatalı yapar). Karar, aday ile referansın ORTAK vakaları üzerinden verilir.

**Sütunlar.** `n` = `vakalar×tekrar` (ör. `4×2`); `kapsam` = sonuç veren vaka / beklenen vaka (`4/4`); `win`; `sert hata` = en az bir sert hata içeren VAKA (`1/4`);
`sert hata (neden)` = neden başına vaka sayısı (`dil_kurali: 3/4, rumuz_yok: 1/4`); `talimat`; çıktı token'ı (`~` = alt-ajan tahmini, chars/3,2; `~?` = tahmini ve gerçek karışık;
`—` = kayıt yok); `tabana göre` = ortak vakalarda token farkı % (tahmini ile gerçek token KIYASLANMAZ: "karşılaştırılamaz (~/gerçek)"; taban token'ı yoksa `—`); `kesilen`
(`status: "truncated"` satırları); `karar`. Mutlak maliyet iddiası YOK; yalnız kollar arası göreli karşılaştırma.

**Karar kuralları (spec B6; üç koşul).**

- `v1` — **KABUL ADAYI** için hepsi: kapsam %100 (aday ve taban), win ≥ 0,65 (ortak vakalarda), sert hata NEDEN BAZLI gerilemez (her neden için aday vaka oranı ≤ taban oranı; bir hata türünün
  başka türle takası gerilemedir) ve token ≤ taban +%20. `rumuz_sizintisi` ve `pii` sınıfı neden adayda varsa tabanda da olsa KABUL ADAYI HİÇBİR ZAMAN verilmez. Win tamam ama başka koşul tutmuyorsa
  nedeni söyler: `win tamam; bütçe +27%`, `win tamam; sert hata: rumuz_sizintisi +2/4 (her zaman engel)`, `win tamam; taban token yok`, `win tamam; bütçe karşılaştırılamaz (~/gerçek)`.
- `v2` (Haiku; `EVAL_REF=v1` ile koşulmuş olmalı) — **HAIKU ADAYI**: kapsam %100, win ≥ 0,40 ve TÜM vakalarda sıfır sert hata.
- Etiket verilmeyen durumlar açıkça yazılır: `eksik kapsam 3/4`, `eksik tekrar b rep1 (hata: tool_parse)`, `taban eksik kapsam 3/4`, `taban eksik tekrar …`, `ortak vaka yok`, `baseline yok` / `referans v1 yok`,
  `ref karışık`, `referans v1 değil (baseline) — EVAL_REF=v1 ile yeniden koş` (aşağıda).

**Kapsam.** Beklenen küme = aracın `cases.json`'u (kayıt defterinde çözülürse); araç kayıtsızsa ya da `cases.json` çözülmezse yedek olarak referans/taban kolun vakaları (sonuç satırları ve `ref/` dosyaları),
baseline kolunda kendi vakaları. `cases.json` dışındaki eski kimlikler (ör. `hw-02` → `hw-02b` yeniden adlandırması sonrası tabanda kalan `hw-02` satırı) ne kapsamı engeller ne de karara girer
(sütunlarda kolun kendi satırları görünmeye devam eder). Kapsam %100'den azsa etiket verilmez ve tablonun altında eksik vakalar nedenleriyle listelenir: kolun `pending.json`'ından `bekliyor (üretim|hakem)`,
`errors.jsonl`'dan `hata: <sınıf>`, ikisinde de yoksa `koşulmadı`. Bilerek `EVAL_CASES` ile alt küme koşmak da eksik kapsamdır.
**Eksik tekrar:** bir kolun vakaları farklı sayıda tekrar içeriyorsa (`n` sütununda `4×1–2`) etiket verilmez; eksik tekrarlar `eksik tekrar b rep1 (hata: tool_parse)` biçiminde
tekrar bazlı nedenle (yalnız o tekrarın bekleyeni/hatası) söylenir. Tüm vakaların aynı (daha az) sayıda tekrar koşması eşitsizlik değildir.

**Referans (taban).** Karşılaştırılan kol, koşturucunun sonuç satırına yazdığı `ref` (`refKey`) alanından okunur: win o referansa karşı ölçülmüştür, token/sert hata tabanı da ondan alınır.
Satırda `ref` yoksa (eski sonuçlar) dizin adından çıkarılır: `v1@r2` kendi turunun tabanına (`baseline@r2`, yoksa `baseline`), `v2@r2` → `v1@r2`. İkisi çelişirse karar sütununa
`ref uyumsuz: satır baseline, dizin baseline@r2` notu düşer (satır esas alınır); bir kolun satırları farklı referanslarla koşmuşsa `ref karışık` ve etiket yok.
Referansın TÜRÜ doğru olmalıdır: `v1` yalnız `baseline[@etiket]`'e, `v2` yalnız `v1[@etiket]`'e karşı ölçülmüşse etiket alır; aksi hâlde win başka bir şeyi ölçer ve karar sütunu
`referans v1 değil (baseline) — EVAL_REF=v1 ile yeniden koş` der (etiket farkı — `v1@r2` ↔ `baseline` — yalnız not düşer, etiketi engellemez).
Referansı yalnız dosya olarak bulunan araçta (artikülasyon, bkz. aşağıda) `v1` yalnız win ile gösterilir: "taban sert hata/token bilinmiyor", KABUL ADAYI yok.

**Vaka ayrıntısı ve granülerlik.** Tablonun altında her aday kol (`v1`, `v2`) için vaka tablosu yazılır: vaka, tekrar, win, sert hata nedenleri ve `explanation.win`'in ilk satırı (en düşük win'li tekrardan).
Tek satırlık granülerlik notu, win'in hangi adımlarla değiştiğini söyler: kol win'i `0,5 / (hakem sırası × satır)` adımlarla değişir; ör. 4 vaka × 1 tekrar × 1 sıra → 0,125 adım, yani
"≥ 0,65" pratikte "≥ 0,75" demektir (v2 için "≥ 0,40" → "≥ 0,50"). Bu yüzden eşik civarındaki farklar anlamlı değildir.

**Kör oy (dördüncü koşul).** Spec B6 kabulün dördüncü koşulu — "kullanıcının kör oyu aleyhte değil" — tabloda YOKTUR (kör oylama Faz 4'te elle yapılır). KABUL ADAYI yalnız ilk üç koşulun özetidir;
canlıya alma kararı kör oy sonucuyla birlikte verilir.

### Vaka listesi

`ev evals/vakaListesi.eval.ts` bütün `cases.json` dosyalarından `docs/superpowers/evals/2026-10-vakalar.md` onay dokümanını (araç × vaka × amaç × gövde)
üretir. Doküman elle yazılmaz: düzeltme ilgili `cases.json`'da yapılır, doküman yeniden üretilir. Taban koşusundan sonra değişen vakaya yeni kimlik verilir
(bkz. "Araçlar").

### Yeni araç eklemek

`evals/tools/<modül>/<araç>/` altında:

- `adapter.ts`: `studioAdapter(cfg)` (JSON araçları; `output: "markdown"` ile Markdown) ya da `atolyeAdapter(cfg)` (Markdown araçları) — `lib/adapterFactory.ts`.
  `cfg`: `id`, `label`, `dir`, `route` (Studio'da standart olmayan imza için `send`), istek satırları (`requestLines`), araca özgü hakem ölçütleri (`criteria`),
  (Studio) `responseKey`/`studentRequired` ve JSON araçlarda ZORUNLU `generic` (jenerik aday; yoksa kurulumda `config` hatası; Markdown araçlarında verilmezse `genericMarkdown`), (Atölye) `body`/`sections`;
- `checks.ts` (+ `checks.selftest.eval.ts`): araca özgü ücretsiz kontroller; `talimat` yalnız prompt/UI kuralı bozulunca düşer (bkz. "Puanlayıcı ilkesi");
- `cases.json`: 4 vaka (öğrencili/öğrencisiz, yaş ucu, zengin/boş bağlam, araca özgü uç);
- `adapter.selftest.eval.ts`: Atölye'de `atolyeAdapterSuite`, Studio'da gerçek rotayı alt-ajan düzeneğiyle koşan bağlantı testi;
- `tools/registry.ts`'e bir satır; `tools/registry.selftest.eval.ts`'in sabitleri güncellenir (araç sayısı 21, Studio 10 / Atölye 11, araç başına 4 vaka; artikülasyon 16) ve `ev evals/vakaListesi.eval.ts` ile onay dokümanı yeniden üretilir.

Araca özgü hakem ölçütleri spec B5 tablosundan.

## Orkestratör (çevrimdışı döngü)

### Dosya protokolü

Her istek `<key>.<role>.request.json` (makine; `hash` = içerik özeti) ve `<key>.<role>.request.md`
(alt-ajan okur) olarak `exchange/` altına yazılır; yanıt `<key>.<role>.response.txt`'e gelir. Yanıt yalnız
json'daki `hash` bugünkü isteğin özetiyle aynıysa geçerlidir.

### Alt-ajan tanımı (`eval-model`)

`.claude/agents/eval-model.md` kaynağı `evals/agents/eval-model.md`'dir; `.claude/` gitignore'da olduğu için
her yeni worktree'de ve her yeni makinede kopyalanması gerekir (depo kökünden):

```bash
mkdir -p .claude/agents && cp apps/hub/evals/agents/eval-model.md .claude/agents/
```

Claude Code oturumunun yeniden başlatılması yalnız bu komut yeni bir `agents` dizininde İLK dosyayı
yaratıyorsa gerekir; dizin zaten varsa dosya hemen görülür. Kopya kaynakla birebir aynı kalmalıdır.

### Çevrimdışı (subagent) döngüsü — orkestratör

`pending.json`, `{key, role, agentModel, model, requestMd, responseTxt}` satırlarından oluşan bir dizidir
(`role`: `gen` | `judge`; `requestMd`/`responseTxt` mutlak yoldur).

1. Koştur → `pending.json` dolu çıkar (üretim istekleri).
2. Her satır için Claude Code `Agent` aracı: `subagent_type: "eval-model"`, `model: <satır.agentModel>`,
   prompt: `İstek: <requestMd>\nYanıt: <responseTxt>`. Her `Agent` çağrısında `model` parametresi ZORUNLUDUR
   ve değeri satırın `agentModel` alanıdır (`sonnet`|`haiku`|`opus`); satırdaki `model` alanı değil, o API
   model kimliğidir. Verilmezse kol sessizce orkestratörün kendi modelinde koşar ve sonuç geçersiz olur.
   8'li dalgalar; her dalgayı `<akış>/<tool>/<variant>[@<tag>]/dispatch.jsonl`'e (vaka, model, ajan kimliği,
   bildirilen token) not et.
3. Yeniden koştur → üretimler tamamlanır, hakem istekleri `pending.json`'a düşer (`agentModel: opus`).
4. Hakem satırlarını dağıt (aynı biçim), yeniden koştur → `results.jsonl` tamamlanır.
5. Boş/eksik yanıt: bir kez yeniden dağıt; ikinci kez de boşsa `errors.jsonl`'e elle bir satır yaz ve
   vakayı raporda eksik göster:

   ```json
   {"prompt_id":"ss-01","rep":0,"failure_class":"subagent_error","error":"<kısa neden>"}
   ```

   Elle yazılan satır vakanın `pending.json`'a yeniden düşmesini ENGELLEMEZ (bitmiş sayılma ölçütü
   `results.jsonl`'dir): ya `EVAL_CASES`'e o vaka dışındakileri yaz ya da yeniden listelenmesine izin ver.
6. `judge_parse` (`errors.jsonl`'de hakem yanıtı şemaya uymadı) ya da `tool_parse` (kart üreticisinin üretim yanıtı JSON/şemaya uymadı; bkz. "Kart
   üreticisi: tool_use taklidi") → bir kez yeniden dağıt: yanıt dosyası
   `.response.rejected.txt`'e ayrılır ve istek AYNI koşunun `pending.json`'ında yeniden listelenir (ek koşu
   gerekmez; hata `errors.jsonl`'e yine yazılır, vaka `results.jsonl`'de olmadığı için sonraki koşuda yeniden
   çalışır): yeni satırı dağıt, aynı komutu koştur. İkinci kez de olursa 5. adımdaki gibi ele al.

Bayat, boş ve reddedilmiş yanıtlar kenara alınıp istek otomatik olarak yeniden sıraya girer; orkestratör
yalnız `pending.json`'un listelediğini dağıtır, kenara alınan dosyalarla kendisi uğraşmaz. Kenara alınan
dosyalar silinmez, `exchange/` içinde kalır:

- `<key>.<role>.response.stale-<hash>.txt` — istek içeriği (özeti) değiştikten sonra kalan eski yanıt;
  yeni istek `pending.json`'a düşer.
- `<key>.<role>.response.empty.txt` — boş/yalnız boşluk içeren yanıt; yanıt dosyası serbest kalır,
  istek bir sonraki koşuda yeniden `pending.json`'a düşer.
- `<key>.<role>.response.rejected.txt` — tüketicinin kullanamadığı (ör. şemaya uymayan) yanıt; istek
  yeniden sorulur (hakem yanıtında aynı koşunun `pending.json`'ında, hata yine kaydedilir).

Gerçek ad sızıntısında (PII kapısı; yalnız ÜRETİM isteği taranır) durum farklıdır: koşu durur, `pending.json`
boş yazılır ve sızıntılı istek `<key>.gen.request.pii-blocked.{md,json}` olarak kenara alınır — hiçbir
alt-ajana verilmez; istek (prompt/fikstür) düzelince bir sonraki koşu yeniden yazar.

Hakem kontrolleri (`judgeControls.eval.ts`) aynı döngüyle yürür: istekler `<akış>/<tool>/controls[@<tag>]/`
altındaki `pending.json` ve `exchange/`'e yazılır, satırlar aynı biçimde dağıtılır (hepsi `agentModel: opus`),
dalga notu `dispatch.jsonl` da bu dizinde tutulur. `pending.json` her koşunun başında boşaltılır; bir adayın
hatası (ör. `judge_parse`) `judge_controls.json`'daki `errors`'a yazılır, bekleyen istekler yine listelenir
ve koşu sonunda hata verir. Bitti ölçütü: `judge_controls.json`'da `complete: true`.

Ölçülen yük (2026-10-09, genel amaçlı ajanla — `eval-model` tipi oturum içinde oluşturulduğu için tanınmadı):
Sonnet üretim çağrısı başına ~88–93K bildirilen token, Opus hakem çağrısı ~92–99K; `eval-model` (yalnız
Read+Write) ölçümü yeni oturumda yapılacak.

Pilot taban (sosyal hikâye + BEP): 8/8 vaka, hakem kontrolleri iki araçta geçti (jenerik iki sırada kaybetti,
özdeş iki sırada berabere).

## Ölçüm ilkeleri

### Sadakat sınırları (rapora da yazılır)

- Alt-ajan ham API çağrısı değildir: sistem talimatı mesaj içindedir, sıcaklık/tavan/yapısal çıktı yoktur,
  Claude Code iskeleti bağlamdadır. Kollar aynı koşulda koştuğu için göreli sıralama anlamlıdır; mutlak
  kalite ve maliyet değildir.
- `sonnet` alt-ajanı Sonnet 5.5'tir; canlıdaki Sonnet 4.6 değil. `usage` alanları tahminidir
  (`usage_estimated: true`, karakter/3,2). Çevrimdışı satırlarda yanıtı veren model `<takma ad>@subagent`
  diye etiketlenir (`served_model`: `sonnet@subagent`; `meta.judge_model`: `opus@subagent`), API kimliği değil.
- Fikstürler SENTETİKTİR. Gerçek çocuk verisi asla fikstüre girmez: ÜRETİM isteğinde gerçek ad görülürse koşu
  durur (`pii_leak`); hakem isteği fikstür adını ve bağlamını bilerek taşır — fikstürler bu yüzden SENTETİK
  kalmak zorunda.

### Puanlayıcı ilkesi

`talimat` YALNIZ çıktı, route prompt'unun söylediği ya da arayüzün (UI/PDF) okuduğu bir kuralı bozunca düşer. Prompt'un söylemediği ya da
tasarımın serbest bıraktığı her şey (görsel doluluğu, ipucu sayısı, tema uyumu, süre dağılımı…) `details`'e ya da hakem ölçütüne gider; yani
düşük `talimat` "prompt/UI kuralı çiğnendi" demektir, "çıktı vasat" demek değildir. Bir kontrol gevşetilmez: gerçek bir prompt bulgusunu saklamak yerine
tabloya "beklenen taban sert hatası" olarak yazılır (aşağıda). Sert hata nedenleri (`hard_fail` maddeleri) özet tablosunda ayrı sütundadır.

### UI'den türeyen kurallar

Bazı kurallar prompt'ta YOKTUR; arayüz bunları okuduğu için türetilmiştir. Taban koşusunda bunlarda düşük puan BEKLENİR ve puanlayıcı hatası değildir
(yeni prompt bunları söyleyince yükselmesi beklenir; tür/veri uyuşmazlığı sessizce görünür kalsın diye gevşetilmez):

- sesletim `yol_var`: labirentin girişten çıkışa hedefli hücrelerden dört komşuluklu yolu (arayüz giriş/çıkışı işaretler, yönerge "hedef sesi içeren kelimeleri
  takip ederek çıkışa ulaşın" der); `pozisyon`: konumlar 1..N sırasıyla (yılan–merdiven satırları, labirent giriş/çıkışı, tombala orta karesi konumla kurulur);
- yılan–merdiven bitiş karesi: bitişte yılan/merdiven, başlangıçta yılan anlamsızdır (arayüzün başlangıç/bitiş işaretlerinden türetildi);
- eşleştirme `tur_yankisi`: çıktıdaki `matchType`/`difficulty` modelin yankısı olarak KALIR ve arayüz/PDF başlığı bunları okur; prompt söylemez, UI okur.

### Bilgi asimetrisi

Studio rotaları modele yalnız öğrencinin adını (rumuz), yaşını, çalışma alanını ve tanısını gönderir; haftalık planda ek olarak son kartların başlıklarını ve son
oturum özetinin YALNIZ genel performansını gönderir. Hakem ise fikstürün tamamını görür (notlar, AI profili, son kartlar, son özet). Bu yüzden tabanda
`ozgulluk` ve `gecmis_baglanti` düşüklüğü prompt kalitesinin değil, Faz 2 bağlam katmanının ölçeceği boşluğun işaretidir. Atölye araçlarında hakem görevine
`ATOLYE_GITMEYEN` notu eklenir (MEB bölümleri ve önceki belgeler araca iletilmedi; özgüllüğü yalnız araca giden alanlara göre değerlendir); Studio'da bu not
BİLEREK yoktur (Studio'nun gitmeyen alanı hakemden gizlenmez, boşluk olarak ölçülür).

### Beklenen taban sert hataları

Taban çıktılarında şu sert hatalar BEKLENİR; gerçek prompt/ürün bulgusudur, kontrol gevşetilmez:

- AI profili (`studio/ai-profile`): ürün şablonu "[Terapist için önemli uyarılar…]" der; Studio'nun dil kuralı "terapist" sözcüğünü yasakladığı için profil çıktısı
  `dil_kurali` sert hatası alır. Yeni prompt/şablon 'uzman' demelidir.
- Kart üreticisi (`studio/cards`): sistem prompt'u 'terapist' demeyi yasaklamaz; taban çıktılarında 'terapist' geçince `dil_kurali` sert hatası alınır. Gerçek prompt
  bulgusudur; v1 'uzman' demelidir.

Özet tablosunun `sert hata (neden)` sütunu bunları diğer nedenlerden (`rumuz_sizintisi`, `json_gecersiz`, `cikti_yok`, araca özgü…) ayırır: `v1`'in "sert hata gerilemiyor"
koşulu bu beklenen tabanlara göre okunur.

### Bilinen ürün hatası: banka kaybı

Öğrenci seçiliyken artikülasyon ve sesletim rotaları kelime bankasından seçilen kelimeleri sonradan yazmaz (stash kaybolur): artikülasyonda kelime düzeyinde
`items: []` kalır, cümle/bağlamda ve sesletimde modelin 'geçici' kelimeleri kalır. Düzeltme ayrı dalda yapıldı, bu dalda YOK. Kontroller bunu
`evals/tools/studio/articulation/checks.ts`'teki `BANKA_STASH_KAYBI = true` sabitiyle bilir: artikülasyonda öğrencili kelime düzeyinde boş çıktı beklenir
(`oge_yok` sert hatası sayılmaz); sesletimde öğrencili + bankalı istekte kelime puanları yazılır ama `talimat`a girmez. Düzeltme dala gelince sabit `false`
yapılmalı ve art-07/09 referansları yeniden üretilmelidir; bayat bayrak `banka_kaybi_tutarsiz` sert hatasıyla kendini belli eder (kelimeler bankadan geliyor
ama bayrak hâlâ açık).

## İç yapı

### Tohumlu rastgelelik

Üretim kodu üç yerde rastgele seçim yapar (`articulation.selectWordsMulti`, `selectWords`, sesletim rotasındaki ham `Math.random`).
Eval sürecinde `Math.random` vaka bağlamına (`AsyncLocalStorage`, `lib/evalContext.ts`) duyarlıdır: vaka içindeyse vakanın tohumlu
üretecini, dışındaysa (vitest, öz-testler) özgün `Math.random`'ı kullanır. Yerleştirme `evals/mocks.setup.ts`'te (`installSeededRandom()`) bir kez
kurulur; `run.eval.ts` ve koşturucu öz-testi bu dosyayı İLK satırda içe aktarır.

- Tohum = `fnv1a(seedKey ?? vaka kimliği)` (`lib/seed.ts`). Tekrar numarası (`rep`) tohuma GİRMEZ: aynı vaka her kolda ve her tekrarda AYNI
  kelimeleri alır; tekrarlar kelime seçiminin değil modelin değişkenliğini ölçer.
- `seedKey`: araç adaptörü (`studioAdapter` cfg `seedKey(body)`) vaka kimliği yerine bir anahtardan tohumlanmak isterse verir; `invoke` onu
  route çağrılmadan ÖNCE `CaseStore.seedKey`'e yazar. Üreteç o ana dek kurulmuşsa (ilk çekiliş yapılmışsa) sessizce yok sayılmaz, `harness_error` olur.
  Artikülasyon bunu seçim argümanlarıyla (`[targetSounds, positions, itemCount]`) kullanır: eski düzenekle aynı banka kelimeleri.
- Yeniden deneme beklemesindeki jitter (`core.ts` `withBackoff`) `node:crypto` `randomInt` kullanır ve tohumlu akıma dokunmaz; yoksa deneme sayısı
  sonraki çekimleri kaydırırdı.

### Kart üreticisi: tool_use taklidi

Kart üreticisi (`studio/cards`) modeli `tools: [emit_card], tool_choice: { type: "tool", name: "emit_card" }` ile çağırır; yanıt bir `tool_use` bloğudur.
Alt-ajan (`subagent`) arka ucu bunu `lib/shim.ts`'te taklit eder: tek araç + zorunlu seçim ise istek aracın `input_schema`'sını `<output_schema>`
olarak taşır (şema = `{ ...input_schema, title: <araç adı>, description }`; kimlik şemanın kendi `title`/`description`'ını ezer) ve alt-ajanın yanıtı YALNIZ JSON olmalıdır (kod çitli ya da çıplak; düzyazı yok). Shim JSON'u çözer, nesne olduğunu ve üst düzey `required`
alanlarının bulunduğunu doğrular ve bir `tool_use` bloğu kurar. Çözülemez ya da yapısı yanlışsa yanıt kenara alınır (`.response.rejected.txt`), istek
AYNI koşuda yeniden listelenir ve `tool_parse` hatası yazılır (hakemdeki `judge_parse` deseni). Aynı şema (adı ve açıklamasıyla) içerik özetine (`hash`/`genHash`) İKİ arka uçta da girer: araç şeması değişirse alt-ajanın bayat yanıtı geçersiz sayılır ve istek yeniden yazılır. Çok araçlı, serbest seçimli ya da araçla birlikte
`output_config.format` şeması olan istekler alt-ajanda `harness_error` verir: taklit edilemez. Koşturucu `rawText`'i metin bloklarından alır;
`tool_use` yanıtında metin bloğu olmadığından `responseText` ilk `tool_use` girdisinin JSON'unu döner (iki arka uçta da aynı). Kart prompt'u rumuzu
`- İsim: <rumuz>`, profil prompt'u `Öğrenci adı: <rumuz>` olarak yazar; koşturucunun rumuz deseni ikisini de tanır.

### Fikstürler

Fikstürler SENTETİKTİR; gerçek çocuk verisi asla girmez. `evals/fixtures/`: `studio.json` (6 öğrenci), `atolye.json` (6 vaka fikstürü) ve
`studio-articulation.json` (artikülasyon düzeneğinden taşınan 12 öğrenci; yalın: son kart ve oturum özeti yok). `studioFixtures()` Studio'nun iki
dosyasını birleştirir; aynı kimlik iki dosyada varsa yükleyici `config` hatası verir. Her anahtar kaydın `id`'siyle aynı olmalıdır.

Rumuz kuralı FİKSTÜR İÇİDİR (her vaka tek öğrenci çizer; PII kapısı ve `rumuzYok` yalnız o vakanın adına/rumuzuna bakar). Rumuz üretimde
`pickAlias(ad, { scope: uzmanKimliği, taken: [] })` ile seçilir (taklitte uzman kimliği sabit `eval-uzman`). `lib/fixtures.selftest.eval.ts`
her fikstür için sınar: rumuz (a) kendi gerçek ilk adına eşit olamaz, (b) kendi serbest metinlerinde (ad, tanı, notlar, profil, güçlü yönler,
ilgi alanları, belgeler) tam sözcük olarak geçemez, (c) çocuk materyalinde doğal geçebilecek gündelik bir sözcük olamaz (`GUNLUK_SOZCUK_RUMUZ`;
yalnız `art-zeynep` istisnadır). Yeni fikstürde rumuz çakışırsa fikstürün soyadı değiştirilir; MEVCUT fikstürlerin adları değişmez (1A referanslarını ve gerçek
Sonnet 4.6 artikülasyon referanslarını geçersiz kılar).

### Artikülasyon referansları: gerçek Sonnet 4.6

Artikülasyonun 16 vakasının referansları (`<akış>/studio/articulation/baseline/ref/art-01..16`) alt-ajanla ÜRETİLMEDİ: 2026-10 pilotundaki gerçek
Sonnet 4.6 (API) çıktılarından dönüştürüldü. Bu yüzden o kolda `results.jsonl` yoktur; dizindeki `source.json` kaynağı, dönüşüm tarihini,
banka-kaybı bayrağını (`bank_loss_bug`), bilinen kusuru (art-08: /j/ sesi 'y' yaklaşımlı diye anlatılmış; Türkçe j = /ʒ/) ve `out_tokens`
kaynağını taşır. Dizin gitignore'dadır: yeni makineye/worktree'ye elle taşınır (dönüşüm adımı plan Task 7'dedir). Bu kol özet tablosunda satır olarak (`results.jsonl`
olmadığı için) listelenmez; `v1` kolu ise listelenir ama YALNIZ win ile: taban sert hata/token bilinmediğinden karar sütunu "win tamam; taban sert hata/token bilinmiyor" der ve KABUL ADAYI verilmez (aday kolun kendi `rumuz_sizintisi`/`pii` hataları yine söylenir). Kapsam payı `ref/` dosya adlarından ve `cases.json`'dan gelir. Referanslar `BANKA_STASH_KAYBI` davranışıyla üretildi (bkz. "Bilinen ürün hatası: banka kaybı").

### PII maskesi

Gerçek çocuk adı ÜRETİM isteğinde görülürse koşu durur (`pii_leak`; bkz. "Sadakat sınırları"). Ürün prompt'larının SABİT metninde ad-benzeri örnekler de var
(ör. artikülasyon rotasının `SYSTEM_PROMPT`'unda "Selin sabah erkenden sahile gitti…"); bunlar "Selin" adlı fikstürde sızıntı sanılıp koşuyu durdurmasın diye
`lib/piiMask.ts` bilinen sabit parçaları taramadan ÖNCE maskeler (aynı uzunlukta `_`). Yalnız düzenek metni (sistem prompt'u / kaydedilmiş istek) maskelenir,
kullanıcı metni ASLA. Her parça kaynak dosyada birebir geçmelidir (öz-test doğrular; prompt değişince parça bayatlar ve test düşer).

### Ortak Atölye katmanı

Atölye araçları ortak bir katmanı paylaşır:

- `evals/tools/atolye/ortak.ts`: bölüm ağacı ve madde çözümü (`lib/markdown`dan), "yasaklı şey ÖNERİLİYOR mu" taraması (bitişik olumsuzlama korumalı:
  "ceza KULLANILMAZ" ihlal değildir, "uymazsa ceza verin" ihlaldir) ve hakemin göreceği MEB satırları;
- `evals/tools/atolye/baglanti.ts`: gerçek rotayı (alt-ajan düzeneğiyle, model çağrılmadan) çalıştıran bağlantı testlerinin yardımcıları ve
  `atolyeAdapterSuite(adapter, opts)` — Task 13 göçüyle BEP dışındaki 10 Atölye adaptörünün `adapter.selftest.eval.ts` dosyası bunu çağırır (BEP 1A'dan gelir; öz-testi `checks.selftest.eval.ts`'tedir): vakalar ve fikstürleri çözülür, fikstürsüz çağrı
  `harness_error`, tüm vakalar gerçek rotada şemadan geçer, istek satırları ürün isteminde AYNEN bulunur ve gerçek ad yoktur, fabrika kontrolleri (iyi örnek,
  taslak notu, rumuz sızıntısı, boş çıktı, bölüm eksikliği), hakem çizimi, `notSent`, jenerik aday. Test dosyası `mocks.setup`'ı İLK satırda içe aktarmalıdır;
- `lib/adapterFactory.ts` `atolyeAdapter(cfg)`: route çağrısı, SSE çözme, hakem görevi, ortak kontroller (dil kuralı, rumuz, yasak kalıp, taslak notunun sonda
  olması, tanı cümlesi yokluğu) ve talimat hesabı bir kez, burada; araç yalnız `cfg` (+ araca özgü kontroller, ölçütler, vakalar) verir.
