# Ops nöbetçisi + haftalık nabız — tasarım

Tarih: 2026-09-19 · Durum: onaylandı (sohbet), uygulama planı bekliyor

## Amaç

İki sessiz başarısızlık sınıfını kapatmak ve ilk kez düzenli ölçüm almak:

1. **Nöbetçi (günlük):** canlıdaki sorunu, kullanıcı fark etmeden önce bize söylemek.
   Geçmiş olaylar: cron'lar 8+ gün sessizce 401 aldı; `next build` sessizce düştü ve eski
   sürüm canlı kaldı; 12–15 Eylül'de 3 gün her istek 500 döndü ve kimse fark etmedi.
2. **Nabız (haftalık):** kayıt, kullanım, dönüşüm ve maliyeti iç ve dış kullanıcıyı
   ayırarak her pazartesi raporlamak.

İkisi de **salt okunur**. Hiçbir veriyi değiştirmez, kod yazmaz, düzeltme yapmaz.

## Mimari

```
Claude bulut rutini (Anthropic bulutu, Hostinger dışında)
  ├─ repo klonu → ops/routines/<rutin>.md prompt'unu okur, origin/main commit'ini alır
  ├─ HTTPS + Bearer (proxy ekler) → ludenlab.com/api/ops/health | /api/ops/pulse
  ├─ HTTPS + API anahtarı (proxy ekler) → api.umami.is   (yalnız nabız)
  └─ Gmail bağlayıcısı → recepkucuk1@gmail.com
```

- İzleyen, izlenen sistemin **dışındadır**: Hostinger çökerse uç noktanın yanıt vermemesi
  alarmın kendisidir.
- Rutin prod'un sırlarını görmez. Tek bildiği `OPS_READ_TOKEN`'dır ve o da proxy tarafından
  eklenir. Token sızsa bile yalnızca toplu sayılar okunabilir.
- **Kararlar kodda, yorum Claude'da.** Eşikler deterministik ve testlidir. Claude yanıtı
  okur, bağlam ekler ve e-postayı yazar.

## Bileşen 1 — Sunucu uç noktaları (apps/hub)

### Ortak kurallar

- `Authorization: Bearer <OPS_READ_TOKEN>`; karşılaştırma `crypto.timingSafeEqual` ile
  yapılır.
- `OPS_READ_TOKEN` tanımlı değilse **503** döner (kapalı başarısızlık). Token yanlışsa
  **401** döner ve gövde ayrıntı vermez.
- `Cache-Control: no-store`.
- Her kontrol kendi `try/catch`'i ve 5 sn zaman aşımıyla çalışır. Patlayan kontrol
  `{status:"fail", detail:"<hata sınıfı>"}` olur, yanıtın geri kalanı yine döner.
- Yanıtta **kişisel veri yoktur**: e-posta, ad, rumuz, hesap kimliği bulunmaz. Yalnızca
  sayı, durum ve etiket vardır.
- Her kontrolün biçimi: `{ key, status: "ok"|"warn"|"fail", value, detail }`, üst düzeyde
  `overall` (en kötü durum) ve `checkedAt`.

### `GET /api/ops/health`

| key | Kaynak | ok / warn / fail |
|---|---|---|
| `deploy` | build damgası (`/api/version` ile aynı: commit, builtAt) | Her zaman `ok`. Değerlendirmeyi rutin yapar (aşağıya bak). |
| `db.hub`, `db.studio`, `db.atolye` | `SELECT 1` | hata → `fail` |
| `cron.studio-cleanup` | studio AuditLog son `cron.subscription-cleanup` + `cron.log` son satırı | son başarılı koşu > 26 sa **veya** son HTTP kodu 2xx değil → `fail` |
| `cron.atolye-cleanup` | atölye AuditLog son `cron.subscription-cleanup` + `cron.log` | aynı |
| `cron.iyzico-sweep` | yalnızca `cron.log` (sweep heartbeat yazmıyor) | aynı |
| `cron.brytakip` | yalnızca `cron.log`, cron.log'da yer alıyorsa | aynı. Satır yoksa kontrol yanıttan çıkarılır. |
| `errors.24h` | `console.log` son ~2 MB, son 24 saatteki hata satırları + en sık 5 etiket (`[tag]`) | **İlk sürümde en fazla `warn`**: sayı > `OPS_ERROR_WARN` (varsayılan 50) ise `warn`. Taban çizgisi bir hafta gözlendikten sonra `fail` eşiği eklenir. |
| `storage` | Supabase `storage.objects` toplam boyutu (depolama hangi projedeyse; plan aşamasında netleşecek) / 1 GB | ≥ %80 `warn`, ≥ %95 `fail` |
| `billing.staleActive` | hub `Subscription` ACTIVE ve dönem sonu < şimdi − 2 gün | ≥ 1 → `fail` |
| `billing.webhookFailed24h` | son 24 saatte `failed` durumlu webhook'lar | ≥ 1 → `warn` |

Dosya okunamazsa (yol ya da yetki sorunu) ilgili kontrol `warn` olur ve detayında
`"log okunamadı"` yazar. Bu durum hiçbir zaman "hata yok" diye raporlanmaz.

Log yolları env ile ezilebilir; varsayılanlar sunucudaki bilinen yollardır:
`OPS_CONSOLE_LOG` (`~/domains/ludenlab.com/hbuilds/current/nodejs/console.log`) ve
`OPS_CRON_LOG` (`~/cron-logs/ludenlab/cron.log`).

**Yaşam işareti:** her başarılı (200) çağrı studio AuditLog'a `ops.health.read` kaydı yazar.
Nabız bunu sayar.

### `GET /api/ops/pulse?days=7`

`days` 1–31 arasında olur, varsayılan 7'dir. Pencere: `[şimdi − days, şimdi)`,
karşılaştırma penceresi hemen öncesindeki eşit uzunluktur.

İç ve dış ayrımı: `OPS_INTERNAL_EMAILS` (virgülle ayrılmış, küçük harfe çevrilir) listesindeki
hesaplar **iç**, geri kalan herkes **dış** sayılır. E-postalar yanıtta yer almaz, yalnızca
sayılar döner.

Her metrik için `{ current: {internal, external}, previous: {internal, external} }` döner:

- `signups` — hub Account oluşturma sayısı
- `activeUsers` — pencerede en az 1 AI çağrısı olan farklı hesaplar (studio + atölye
  `ApiUsageLog`)
- `generationsByTool` — studio: `ApiUsageLog.endpoint`'e göre. Atölye: `ApiUsageLog`'da
  endpoint alanı yok; kaynak plan aşamasında `GeneratedDocument.type` ve kredi
  hareketlerinden seçilecek. Seçilen kaynak, hangi araçları kapsamadığıyla birlikte yanıtta
  `source` alanıyla belirtilir.
- `billing` — yeni ücretli abonelik, başarılı ödeme sayısı ve toplamı (TRY), iptaller
- `aiCost` — toplam `costUsd` (iki DB), üretim başına ortalama, `OPS_USD_TRY` ile ₺ karşılığı
  (varsayılan 48.67)
- `watchdogRuns` — penceredeki `ops.health.read` sayısı

## Bileşen 2 — Rutinler

Prompt'lar repoda tutulur: `ops/routines/nobetci.md`, `ops/routines/nabiz.md`. Paneldeki
prompt yalnızca "`ops/routines/<ad>.md` dosyasını oku ve harfiyen uygula" der.

Her iki rutin için ortak kurallar:

- **Yasak:** dal açmak, commit, push, dosya düzenlemek; e-posta dışında herhangi bir dış
  eylem; yanıtta olmayan veriyi uydurmak.
- **Alıcı:** e-posta yalnızca recepkucuk1@gmail.com adresine gider.
- **Bağlayıcı:** yalnızca Gmail.
- **Ağ:** özel allowlist, yalnızca `ludenlab.com` ve `api.umami.is`.
- **Kimlik bilgileri:** API credentials alanında tutulur (ludenlab.com Bearer, Umami anahtarı).

### Nöbetçi — her gün 07:30 (TR)

1. `git rev-parse origin/main` ve o commit'in zamanını al.
2. `/api/ops/health` çağır.
   - Zaman aşımı, ağ hatası ya da 5xx → konu `[LudenLab nöbet] SİTE YANIT VERMİYOR`, gövdede
     status/hata ve `/api/version` denemesinin sonucu.
   - 503 → `[LudenLab nöbet] ops ucu kapalı (OPS_READ_TOKEN tanımsız)`.
   - 401 → `[LudenLab nöbet] ops token reddedildi`.
3. Deploy değerlendirmesi: çalışan commit ≠ `origin/main` **ve** main commit'i 20 dk'dan
   eskiyse `fail` (deploy inmemiş).
4. `overall == ok` ve deploy tutarlıysa **e-posta gönderme.** Özeti oturum kaydına yaz.
5. Aksi halde tek e-posta gönder. Konu en kötü bulguyu taşır; gövdede her `warn`/`fail` için
   ne oldu, olası neden ve ilk adım yer alır. Olası nedenler için
   `ops/routines/bilinen-olaylar.md` dosyasına başvurulur (401-sessiz-cron, çıktısız derleme
   hatası, lsnode/realpath, dönem sonu bayat ACTIVE).

### Nabız — her pazartesi 08:00 (TR)

1. `/api/ops/pulse?days=7` çağır. Erişilemezse bunu raporun en üstüne yaz ve Umami ile devam et.
2. Umami API'den son 7 gün ve önceki 7 günün verisini çek: ziyaretçi, sayfa görüntülenmesi,
   `/kayit` görüntülenmesi, ilk 5 yönlendiren. Anahtar yoksa ya da çağrı başarısızsa bu
   bölüm "Umami: veri yok" olur.
3. E-posta, konu `[LudenLab nabız] <tarih aralığı>`:
   - En üstte `watchdogRuns < 7` ise uyarı satırı.
   - 3 satırlık özet: dış kullanıcıda ne değişti.
   - Tablo: metrik × bu hafta/geçen hafta × dış/iç.
   - Tek soru: "Bu veriye bakınca bu hafta neyi merak etmelisin?"
   - Yorum yalnızca verideki sayılara dayanır; neden tahmini yapılıyorsa öyle işaretlenir.

## Hata yönetimi (özet)

| Durum | Sonuç |
|---|---|
| Token env yok | 503, nöbetçi "uç kapalı" maili |
| Yanlış token | 401, nöbetçi "token reddedildi" maili |
| Tek kontrol patlar | o kontrol `fail`, diğerleri döner |
| Log okunamaz | o kontrol `warn` + "log okunamadı" |
| Site çökük | nöbetçi "SİTE YANIT VERMİYOR" maili |
| Rutin ölür | pazartesi nabzında `watchdogRuns < 7` uyarısı |
| Nabız da ölür | pazartesi maili gelmez, kullanıcının fark etmesi beklenir (kabul edilen risk) |

## Test

- **Birim (TDD, vitest):** eşik değerlendiricileri, console.log ayrıştırıcı (JSON satırı,
  zaman damgası, `[tag]`), cron.log ayrıştırıcı, iç/dış sınıflandırıcı, pencere hesabı,
  token karşılaştırma.
- **Route:** env yoksa 503, yanlış token 401, doğru token 200; bir kontrol fırlatınca yanıt
  yine 200 ve o kontrol `fail`; yanıt gövdesinde `@` karakteri geçmiyor (PII koruması).
- **Canlı:** deploy sonrası `/api/version` ile commit doğrulanır; iki rutin için "Run now";
  nöbetçi bir kez bilerek yanlış token ile çalıştırılır ve alarm mailinin geldiği görülür.

## Kapsam dışı

Metrik geçmişi tablosu, dashboard, Slack, otomatik düzeltme, SSH erişimi, GitHub Actions
yedeği (sonra 5 satırla eklenebilir).

## Kullanıcının yapacakları

1. hPanel'e `OPS_READ_TOKEN` (rastgele 32+ bayt), `OPS_INTERNAL_EMAILS`, isteğe bağlı olarak
   `OPS_USD_TRY` ve `OPS_ERROR_WARN` girip redeploy.
2. Umami Cloud'da API anahtarı oluşturmak.
3. claude.ai/code/routines'te iki rutini kurmak (depo, yalnız Gmail bağlayıcısı, özel ağ
   allowlist'i, API credentials, zamanlama). Adım adım kılavuz: `ops/routines/KURULUM.md`.
