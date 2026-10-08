# Araç değerlendirme düzeneği

Spec: `docs/superpowers/specs/2026-10-08-arac-prompt-yukseltme-design.md` (Bölüm B).

## Komutlar (apps/hub içinden)

```bash
EV="node_modules/.bin/vitest run --config vitest.eval.config.ts"

# Öz-testler (API/alt-ajan yok)
$EV evals/lib evals/tools evals/runner.selftest.eval.ts

# Bir aracı bir kolda koştur (varsayılan arka uç: subagent)
EVAL_TOOL=studio/social-story EVAL_VARIANT=baseline $EV evals/run.eval.ts
EVAL_TOOL=studio/social-story EVAL_VARIANT=v1 $EV evals/run.eval.ts            # referans: baseline
EVAL_TOOL=studio/social-story EVAL_VARIANT=v2 EVAL_REF=v1 $EV evals/run.eval.ts # Haiku ↔ yeni-Sonnet

# Hakem kontrolleri (önce baseline koşmuş olmalı)
EVAL_TOOL=studio/social-story $EV evals/judgeControls.eval.ts

# API arka ucu (bakiye gerektirir)
EVAL_BACKEND=api EVAL_BUDGET_USD=5 EVAL_TOOL=atolye/bep EVAL_VARIANT=baseline $EV evals/run.eval.ts
```

Ortam: `EVAL_TOOL` (zorunlu), `EVAL_VARIANT` baseline|v1|v2, `EVAL_BACKEND` subagent|api, `EVAL_REF` (varsayılan
baseline), `EVAL_REPS` (1), `EVAL_CASES` (virgüllü), `EVAL_CONCURRENCY` (4), `EVAL_TIMEOUT_S` (900),
`EVAL_BUDGET_USD` (yalnız api), `JUDGE_ORDERS` 1|2 (subagent'ta 1, api'de 2), `EVAL_FLOW` (akış dizini).

Tip denetimi (apps/hub içinden): `npm run typecheck:evals`

## Akış dizini

`.claude/hillclimb/prompt-yukseltme/<tool>/<variant>/` — `results.jsonl` (vaka başına satır), `errors.jsonl`,
`pending.json` (yanıt bekleyen istekler), `exchange/` (istek/yanıt dosyaları), `out/` (uygulamanın döndürdüğü
içerik), `ref/` (dondurulmuş referans, vaka başına bir kez), `traces/`, `progress.txt`. gitignore'da.

## Çevrimdışı (subagent) döngüsü — orkestratör

1. Koştur → `pending.json` dolu çıkar (üretim istekleri).
2. Her satır için Claude Code `Agent` aracı: `subagent_type: "eval-model"`, `model: <agentModel>`,
   prompt: `İstek: <requestMd>\nYanıt: <responseTxt>`. 8'li dalgalar; her dalgayı `dispatch.jsonl`'e
   (vaka, model, ajan kimliği, bildirilen token) not et.
3. Yeniden koştur → üretimler tamamlanır, hakem istekleri `pending.json`'a düşer (`agentModel: opus`).
4. Hakem satırlarını dağıt (aynı biçim), yeniden koştur → `results.jsonl` tamamlanır.
5. Boş/eksik yanıt: bir kez yeniden dağıt; ikinci kez de boşsa `errors.jsonl`'e elle `subagent_error` yaz
   ve vakayı raporda eksik göster. Kenara alınan dosyalar silinmez, `exchange/` içinde kalır:
   - `<key>.<role>.response.stale-<hash>.txt` — istek içeriği (özeti) değiştikten sonra kalan eski yanıt;
     yeni istek için yeniden dağıt.
   - `<key>.<role>.response.empty.txt` — boş/yalnız boşluk içeren yanıt; yanıt dosyası serbest kalır,
     istek bir sonraki koşuda yeniden `pending.json`'a düşer.
   - `<key>.<role>.response.rejected.txt` — tüketicinin kullanamadığı (ör. şemaya uymayan) yanıt; bir
     sonraki koşu aynı isteği yeniden sorar.

   Dosya protokolü: her istek `<key>.<role>.request.json` (makine; `hash` = içerik özeti) ve
   `<key>.<role>.request.md` (alt-ajan okur) olarak yazılır, yanıt `<key>.<role>.response.txt`'e gelir;
   yanıt yalnız json'daki `hash` bugünkü isteğin özetiyle aynıysa geçerlidir.

`.claude/agents/eval-model.md` kaynağı `evals/agents/eval-model.md`'dir; `.claude/` gitignore'da olduğu için
yeni makinede kopyalanması gerekir.

## Sadakat sınırları (rapora da yazılır)

- Alt-ajan ham API çağrısı değildir: sistem talimatı mesaj içindedir, sıcaklık/tavan/yapısal çıktı yoktur,
  Claude Code iskeleti bağlamdadır. Kollar aynı koşulda koştuğu için göreli sıralama anlamlıdır; mutlak
  kalite ve maliyet değildir.
- `sonnet` alt-ajanı Sonnet 5.5'tir; canlıdaki Sonnet 4.6 değil. `usage` alanları tahminidir
  (`usage_estimated: true`, karakter/3,2).
- Fikstürler SENTETİKTİR. Gerçek çocuk verisi asla fikstüre girmez; istekte gerçek ad görülürse koşu durur.

## Yeni araç eklemek

`evals/tools/<modül>/<araç>/` altında `adapter.ts` (ToolAdapter), `checks.ts` (+ `checks.selftest.eval.ts`),
`cases.json` (4 vaka: öğrencili/öğrencisiz, yaş ucu, zengin/boş bağlam, araca özgü uç); `tools/registry.ts`'e
bir satır. Araca özgü hakem ölçütleri spec B5 tablosundan.
