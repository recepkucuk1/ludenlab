# Araç değerlendirme düzeneği

Spec: `docs/superpowers/specs/2026-10-08-arac-prompt-yukseltme-design.md` (Bölüm B).

## Komutlar (apps/hub içinden)

Önce kabuk fonksiyonunu tanımla (zsh ve bash'te çalışır; kalıcı olması için `~/.zshrc`'ye de eklenebilir,
ama yol göreli olduğundan yalnız `apps/hub` içinden çağrıldığında çalışır). Fonksiyon, ortam değişkenlerini
komut önekiyle (`EVAL_TOOL=… ev …`) alır:

```bash
ev() { node_modules/.bin/vitest run --config vitest.eval.config.ts "$@"; }

# Öz-testler (API/alt-ajan yok)
ev evals/lib evals/tools evals/runner.selftest.eval.ts

# Bir aracı bir kolda koştur (varsayılan arka uç: subagent)
EVAL_TOOL=studio/social-story EVAL_VARIANT=baseline ev evals/run.eval.ts
EVAL_TOOL=studio/social-story EVAL_VARIANT=v1 ev evals/run.eval.ts              # referans: baseline
EVAL_TOOL=studio/social-story EVAL_VARIANT=v2 EVAL_REF=v1 ev evals/run.eval.ts  # Haiku ↔ yeni-Sonnet

# Hakem kontrolleri (önce baseline koşmuş olmalı)
EVAL_TOOL=studio/social-story ev evals/judgeControls.eval.ts

# API arka ucu (bakiye gerektirir)
EVAL_BACKEND=api EVAL_BUDGET_USD=5 EVAL_TOOL=atolye/bep EVAL_VARIANT=baseline ev evals/run.eval.ts
```

Ortam: `EVAL_TOOL` (zorunlu), `EVAL_VARIANT` (zorunlu; baseline|v1|v2; `run.eval.ts` için), `EVAL_BACKEND`
subagent|api, `EVAL_REF` (referans kolu `<variant>[@<tag>]`; varsayılan etiketsiz baseline), `EVAL_TAG` (tur
etiketi: aynı varyantı temiz dizinde yeniden koşmak için; kol dizini `<variant>@<tag>`, hakem kontrollerinde
`controls@<tag>`; referansı SEÇMEZ — `EVAL_REF=baseline@<tag>` ile eşleşir: yeni turun tabanını referans yapmak
için önce `EVAL_VARIANT=baseline EVAL_TAG=r2 EVAL_REF=baseline@r2`, sonra `v1` için `EVAL_TAG=r2 EVAL_REF=baseline@r2`;
`EVAL_REF` verilmezse `v1@r2` eski tabana karşı ölçülür), `EVAL_REPS` (1), `EVAL_CASES` (virgüllü; koşulacak
vakaların listesi — hakem kontrolleri tek vaka alır), `EVAL_CONCURRENCY` (4), `EVAL_TIMEOUT_S` (900),
`EVAL_BUDGET_USD` (yalnız api), `JUDGE_ORDERS` 1|2 (subagent'ta 1, api'de 2), `EVAL_FLOW` (akış dizini; mutlak yol ver).

Tip denetimi (apps/hub içinden): `npm run typecheck:evals`

## Akış dizini

Komutlar `apps/hub`'tan koşar, ama akış dizini DEPO KÖKÜNE göredir (`evals/lib/core.ts` içinde `FLOW_DIR`):
`.claude/hillclimb/prompt-yukseltme/<tool>/<variant>[@<tag>]/`. İçinde `results.jsonl` (vaka başına satır),
`errors.jsonl`, `pending.json` (yanıt bekleyen istekler), `dispatch.jsonl` (orkestratörün dağıtım notu),
`exchange/` (istek/yanıt dosyaları), `out/` (uygulamanın döndürdüğü içerik), `ref/` (dondurulmuş referans,
vaka başına bir kez), `traces/`, `progress.txt` bulunur. Hakem kontrolleri `<tool>/controls[@<tag>]/`
altına `judge_controls.json`, `pending.json`, `exchange/` yazar. gitignore'da.

## Dosya protokolü

Her istek `<key>.<role>.request.json` (makine; `hash` = içerik özeti) ve `<key>.<role>.request.md`
(alt-ajan okur) olarak `exchange/` altına yazılır; yanıt `<key>.<role>.response.txt`'e gelir. Yanıt yalnız
json'daki `hash` bugünkü isteğin özetiyle aynıysa geçerlidir.

## Alt-ajan tanımı (`eval-model`)

`.claude/agents/eval-model.md` kaynağı `evals/agents/eval-model.md`'dir; `.claude/` gitignore'da olduğu için
her yeni worktree'de ve her yeni makinede kopyalanması gerekir (depo kökünden):

```bash
mkdir -p .claude/agents && cp apps/hub/evals/agents/eval-model.md .claude/agents/
```

Claude Code oturumunun yeniden başlatılması yalnız bu komut yeni bir `agents` dizininde İLK dosyayı
yaratıyorsa gerekir; dizin zaten varsa dosya hemen görülür. Kopya kaynakla birebir aynı kalmalıdır.

## Çevrimdışı (subagent) döngüsü — orkestratör

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
6. `judge_parse` (`errors.jsonl`'de hakem yanıtı şemaya uymadı) → bir kez yeniden dağıt: yanıt dosyası
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

Gerçek ad sızıntısında (PII kapısı) durum farklıdır: koşu durur, `pending.json` boş yazılır ve sızıntılı
istek `<key>.gen.request.pii-blocked.{md,json}` olarak kenara alınır — hiçbir alt-ajana verilmez; istek
(prompt/fikstür) düzelince bir sonraki koşu yeniden yazar.

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

## Sadakat sınırları (rapora da yazılır)

- Alt-ajan ham API çağrısı değildir: sistem talimatı mesaj içindedir, sıcaklık/tavan/yapısal çıktı yoktur,
  Claude Code iskeleti bağlamdadır. Kollar aynı koşulda koştuğu için göreli sıralama anlamlıdır; mutlak
  kalite ve maliyet değildir.
- `sonnet` alt-ajanı Sonnet 5.5'tir; canlıdaki Sonnet 4.6 değil. `usage` alanları tahminidir
  (`usage_estimated: true`, karakter/3,2). Çevrimdışı satırlarda yanıtı veren model `<takma ad>@subagent`
  diye etiketlenir (`served_model`: `sonnet@subagent`; `meta.judge_model`: `opus@subagent`), API kimliği değil.
- Fikstürler SENTETİKTİR. Gerçek çocuk verisi asla fikstüre girmez; istekte gerçek ad görülürse koşu durur.

## Yeni araç eklemek

`evals/tools/<modül>/<araç>/` altında `adapter.ts` (ToolAdapter), `checks.ts` (+ `checks.selftest.eval.ts`),
`cases.json` (4 vaka: öğrencili/öğrencisiz, yaş ucu, zengin/boş bağlam, araca özgü uç); `tools/registry.ts`'e
bir satır. Araca özgü hakem ölçütleri spec B5 tablosundan.
