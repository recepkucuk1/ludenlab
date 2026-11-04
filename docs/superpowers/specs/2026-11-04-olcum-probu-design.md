# Ölçüm Probu (Studio artikülasyon) — Tasarım

Tarih: 2026-11-04
Modül: Studio (`apps/hub`, `@studio/*`)
Durum: Tasarım onaylandı, uygulama planı bekliyor
Kaynak: 2026-11-03 eğitim-felsefesi değerlendirmesi — Faz 1'in ilk parçası ("veri döngüsü açık:
ürün üretir ama ölçmez"). Kardeşleri: veli geri bildirim bağlantısı, hedef denetçisi (ayrı spec'ler).

## 1. Amaç

Uzman, seans içinde telefon ya da bilgisayardan bir "prob" koşturur: bankadan seçilmiş sabit 10 kelime
tek tek gösterilir, her kelimeye tek dokunuşla doğru/yanlış (isteğe bağlı "ipucuyla") işaretlenir,
sonuç tarihli bir yüzde olarak kaydedilir ve öğrenci sayfasında seri hâlinde grafiğe dönüşür. Böylece
ürün ilk kez "işe yarıyor mu" sorusuna veriyle cevap verir; hedef takibinin dört durumlu etiketi ve
oturum özetinin kart içinde kalan yüzdeleri bir zaman serisine bağlanır.

Ölçüm modeli (`ProbeSeries` + `ProbeRun`) genel tutulur (`kind` alanı): sonraki araçlar (dil örneği
analizi, akıcılık sayımı, Atölye okuma hızı) aynı tablolara yazar.

## 2. Kararlar (beyin fırtınası, 2026-11-04)

| Karar | Sonuç |
|---|---|
| Kapsam | Yalnız Studio artikülasyon; Atölye okuma hızı ayrı spec |
| Seri anahtarı | ses + pozisyon + düzey (bu spec'te düzey yalnız `word`) |
| Kelime seti | Öğrenci başına sabit: ilk probda bankadan seçilir, seri boyunca aynı; "Seti yenile" yeni seri açar |
| Yer | Öğrenci sayfasında beşinci sekme "Ölçüm"; sayaç tam ekran kaplama |
| Puanlama | Doğru / yanlış + "ipucuyla" işareti; ipuçlu doğru yüzdeye DOĞRU sayılmaz (bağımsız doğruluk) |
| Sunum | Önbellekteki görsel + kelime; "kelimeyi gizle" ile resim adlandırma; görseli yoksa yalnız kelime |
| Entegrasyon | Bağlam bloğuna "Son ölçümler" satırı; gözlem günlüğüne otomatik kayıt YOK |
| Maliyet / plan | AI çağrısı yok, kredi düşmez, plan kapısı yok (ücretsiz planda da açık) |
| Yaklaşım | A: iki tablo (`ProbeSeries`, `ProbeRun`), raw SQL migration `0020` |

## 3. Kapsam

Dahil:
- `ProbeSeries` ve `ProbeRun` tabloları (Studio DB), migration `apps/hub/prisma/sql/0020_probe.sql`,
  Prisma şemasında modeller (`apps/hub/prisma/studio/schema.prisma`).
- Rotalar: `apps/hub/src/app/studio/api/students/[id]/probes/route.ts` (GET, POST),
  `.../probes/[seriesId]/runs/route.ts` (POST), `.../probes/runs/[runId]/route.ts` (DELETE).
- Saf mantık: `apps/hub/src/modules/studio/lib/probe/` — `schema.ts` (zod + tipler), `score.ts`
  (yüzde), `buildSeries.ts` (bankadan set), `contextLine.ts` (bağlam satırı).
- Arayüz: `apps/hub/src/modules/studio/components/students/ProbeTab.tsx` (sekme), `ProbeRunner.tsx`
  (tam ekran sayaç), `ProbeChart.tsx` (SVG çizgi grafik); öğrenci sayfasına sekme.
- Bağlam katmanı: `studentContext.ts` yeni alan "Son ölçümler".
- Hesap silme: `accountDeletion.ts` Studio tarafında `therapist.deleteMany` ile siler ve tabloları tek
  tek saymaz; yeni tablolar `Therapist` ve `Student` FK'lerinde `ON DELETE CASCADE` taşıdığı için
  kapsanır. Migration dosyası için kaynak-metin testi (iki FK'de `ON DELETE CASCADE`, RLS satırı).
- `toolGate.test.ts` muafiyet listesine üç rota (Claude çağırmaz).

Hariç (bilinçli):
- Atölye (okuma hızı, dakikada doğru kelime) — ayrı spec, ayrı DB.
- İzole/hece/cümle/bağlam düzeyinde prob (`level` alanı ileride; bu spec yalnız `word`).
- Probda görsel ÜRETME (yalnız önbellek; üretim kredi düşürür, prob ücretsiz kalır).
- PDF/CSV dışa aktarma, hedef takibiyle otomatik durum değişimi, asistanda yeni öneri türü.
- Çok sesli prob (bir seri = tek ses).

## 4. Veri modeli

Prisma (`schema.prisma`, Studio):

```prisma
model ProbeSeries {
  id          String   @id @default(cuid())
  studentId   String
  therapistId String
  kind        String   @default("articulation") // ileride "reading" | "fluency"
  sound       String   // "/r/" biçimi (araçlarla aynı)
  position    String   // "initial" | "medial" | "final"
  level       String   @default("word")
  words       Json     // [{ word, syllableBreak, imageUrl: string | null }]
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())

  student   Student    @relation(fields: [studentId], references: [id], onDelete: Cascade)
  therapist Therapist  @relation(fields: [therapistId], references: [id], onDelete: Cascade)
  runs      ProbeRun[]

  @@index([studentId, active])
  @@index([therapistId])
}

model ProbeRun {
  id          String   @id @default(cuid())
  seriesId    String
  therapistId String
  date        DateTime @default(now())
  items       Json     // [{ word, correct: boolean, cued: boolean }]
  correct     Int      // bağımsız doğru sayısı (cued=true DOĞRU sayılmaz)
  total       Int
  pct         Int      // round(100 * correct / total)
  cuedCount   Int      @default(0)
  note        String?  @db.VarChar(300)
  createdAt   DateTime @default(now())

  series    ProbeSeries @relation(fields: [seriesId], references: [id], onDelete: Cascade)
  therapist Therapist   @relation(fields: [therapistId], references: [id], onDelete: Cascade)

  @@index([seriesId, date])
  @@index([therapistId])
}
```

`Student` ve `Therapist` modellerine ters ilişkiler (`probeSeries`, `probeRuns`) eklenir.

Migration `0020_probe.sql`: `0019_student_observation.sql` ile aynı kalıp — `CREATE TABLE IF NOT EXISTS`,
indeksler, FK'ler `ON DELETE CASCADE`, `ENABLE ROW LEVEL SECURITY` (politika yok = anon deny-all),
geri alma notu. Deploy sırası: önce SQL (iki ortama elle), sonra kod. Prisma istemcisi `postinstall`
ile üretilir.

Veri sınıfı: kelime listesi ve doğru/yanlış sonuçları çocuk PII'si değildir; rumuz gerekmez. Bağlam
satırı yalnız ses/pozisyon/yüzde taşır.

## 5. Kelime seti seçimi (`buildSeries.ts`)

- Girdi: `sound` (ör. "/r/"), `position`, `count` (5–20, varsayılan 10).
- `WORD_BANK` + `selectWords(bank, soundToLetter(sound), [position], count, rng)` (mevcut, enjekte
  `rng` ile testlenebilir). Bankada o ses×pozisyon için `count`'tan az kelime varsa olan kadar; 3'ten
  az (ya da hiç) kelime varsa 400 "bu ses ve pozisyon için bankada yeterli kelime yok" (seri açılmaz).
- Her kelime için `lookupCachedWordImage(word)` çağrılır (ücretsiz, yalnız önbellek) ve `imageUrl`
  seriye yazılır; `null` olabilir. Arama paralel (`Promise.all`), biri patlarsa o kelime `null`.
- Aynı öğrenci için aynı `sound+position+level` ile `active=true` bir seri varsa POST onu
  `active=false` yapar ve yeni seriyi açar ("Seti yenile" de bu yoldan). Eski serinin koşuları ve
  grafiği silinmez; sekmede "önceki setler" altında kalır.

## 6. API

Hepsi `requireAuth` + `requireStudentOwnership` (observations rotasındaki desen); AI çağrısı yok, kredi
yok, plan kapısı yok. Gövde `readJsonBody` ile sınırlı; metin alanları `stripHtmlTags`.

- `GET /studio/api/students/[id]/probes` → `{ series: [{ id, sound, position, level, active, words,
  createdAt, runs: [{ id, date, pct, correct, total, cuedCount, note }] }] }`; seriler `active` önce,
  `createdAt` azalan; koşular tarih artan (grafik sırası). Run `items` listede DÖNMEZ (ağır); tek koşu
  ayrıntısı `GET .../probes/runs/[runId]` (opsiyonel, bu spec'te yok — arayüz items'ı göstermiyor).
- `POST /studio/api/students/[id]/probes` gövde `{ sound, position, count? }` (zod: `sound` 1–20 karakter
  "/x/" biçimi, `position` enum, `count` 5–20 varsayılan 10) → 201 `{ series }`.
- `POST /studio/api/students/[id]/probes/[seriesId]/runs` gövde `{ items: [{ word, correct, cued }],
  note? }` → sunucu doğrular: `items` uzunluğu ve kelimeleri serinin `words` listesiyle birebir aynı ve
  aynı sırada (aksi 400); `correct/total/pct/cuedCount` `score.ts` ile hesaplanır (istemciden gelen sayı
  kabul edilmez); seri `active` olmak zorunda değil (eski set üzerinde de ölçüm alınabilir); 201 `{ run }`.
- `DELETE /studio/api/students/[id]/probes/runs/[runId]` → 204; sahiplik `therapistId` üzerinden.
- Hız sınırı: `assistant` rotasındaki `rateLimit` yardımcısıyla dakikada 30 (`probe:<therapistId>`).

`score.ts`: `scoreItems(items) → { correct, total, pct, cuedCount }`; `pct = Math.round(100*correct/total)`;
`cued=true` olan öğe `correct=true` gelse bile bağımsız doğruya SAYILMAZ (ipucu bağımsızlık demek değil),
`cuedCount`'a girer. `total` 0 ise 400 (rota).

## 7. Arayüz

**Sekme.** Öğrenci sayfasındaki sekme listesine `{ key: "probe", label: "Ölçüm", count: null }`
(Asistan'dan sonra). `ProbeTab` yükleme/boş durum: "Henüz ölçüm yok — ilk probu başlat". "Yeni seri" formu:
ses (araçlardaki ses seçicisiyle aynı liste), pozisyon (başta/ortada/sonda), adet (10). Her seri bir
kart: başlık "/r/ · kelime başı · 10 kelime", `ProbeChart`, son koşular tablosu (tarih, %, ipuçlu, not,
sil), düğmeler "Prob başlat", "Seti yenile" (onay: "Yeni set yeni bir seri açar; eski grafik kalır").
Pasif seriler katlanmış "Önceki setler" bölümünde.

**ProbeChart.** Satır içi SVG, kütüphane yok. x: koşu sırası (tarih etiketi gg.aa), y: 0–100; nokta +
çizgi; 80 çizgisi kesikli (geçiş ölçütü göstergesi, metin: "%80 ve üzeri ardışık iki ölçüm: geçiş
düşünülebilir"); tek koşuda yalnız nokta. Renkler poster token'ları; koyu tema kontrastı
`koyuTemaKontrast.test.ts` kalıbıyla doğrulanır.

**ProbeRunner (sayaç).** Tam ekran kaplama (`position: fixed`), telefonda dokunmaya uygun:
- Üstte "4 / 10", kelime adı (gizlenebilir), ortada görsel (yoksa kelime büyük).
- Altta iki büyük düğme "Doğru" (yeşil) / "Yanlış" (turuncu); "ipucuyla" anahtarı (o öğe için);
  "Geri al" (son öğeyi çözer); "Kelimeyi gizle/göster".
- Klavye: `D` doğru, `Y` yanlış, `İ`/`I` ipucu, `Geri` geri al, `Esc` iptal.
- Son öğeden sonra özet: "%70 bağımsız (7/10), 2 ipuçlu", tek satır not (≤300), "Kaydet" / "Vazgeç".
  Vazgeç ya da sayfa kapanması = kayıt yok (yarım prob saklanmaz).
- Kayıt sonrası sekmeye dönülür, grafik güncellenir.

**Erişilebilirlik.** Düğmeler `aria-label`'lı, kaplama `role="dialog"`, odak tuzağı; görsel `alt`
kelimenin kendisi (resim adlandırma modunda `alt` boş, kelime gizliyken ipucu sızmasın).

## 8. Bağlam entegrasyonu

`studentContext.ts`:
- `StudentContextInput`'a `recentProbes: { sound, position, level, runs: { date, pct }[] }[]` (aktif
  seriler, her biri son 3 koşu, tarih artan).
- `renderStudentBlock` yeni aday alan `Son ölçümler:` — seri başına tek satır
  `- /r/ başta kelime: %60 → %70 → %80 (14.10, 21.10, 28.10)`; `BUTCE.olcum = 300`, en çok 3 seri;
  "Son gözlemler"den SONRA, profilden ÖNCE. `contextLine.ts` saf biçimlendirici (test edilebilir).
- `loadStudentContext` ikincil sorgu: aktif seriler + son 3 koşu; patlarsa alan atlanır (mevcut kural).
- `BUTCE_TOPLAM` (2400) değişmez.
- Asistan prompt'u, araç prompt'ları ve profil DEĞİŞMEZ; satır blokta görünür olduğu için kullanılır.

## 9. Testler (önce test, sonra kod)

- `probe/score.test.ts`: yüzde yuvarlama, `cued` dışlaması, boş liste.
- `probe/schema.test.ts`: zod sınırları (count 5–20, position enum, sound biçimi, items uzunluğu).
- `probe/buildSeries.test.ts`: enjekte rng ile deterministik seçim; az kelime → olan kadar; yok → hata;
  `imageUrl` null toleransı (lookup taklit).
- `probe/contextLine.test.ts`: biçim, bütçe kırpma, 3 seri tavanı, tarih sırası.
- `studentContext.test.ts`: yeni alanın sırası (gözlemlerden sonra), bütçe dolunca atlanması.
- Rota testleri (taklit Prisma, `observations` rota testinin deseni): sahiplik 404, kelime listesi
  uyuşmazlığı 400, sunucu taraflı puanlama, aynı anahtarda eski serinin pasifleşmesi, DELETE sahiplik.
- `toolGate.test.ts`: üç rota muafiyet listesinde gerekçeyle.
- `prisma/sql/0020_probe.sql` kaynak-metin testi: iki tabloda `Therapist`/`Student` (ve `ProbeSeries`)
  FK'leri `ON DELETE CASCADE`, `ENABLE ROW LEVEL SECURITY`, `IF NOT EXISTS` (hesap silme kapsamı).
- Arayüz: `ProbeChart` için `renderToStaticMarkup` tabanlı küçük test (nokta sayısı, 80 çizgisi);
  koyu tema kontrast testi.

## 10. Doğrulama ve yayın

- vitest (hub), typecheck, lint, `next build` yeşil.
- Tarayıcı: dev sunucusu PROD veritabanına bakar; prob kaydı YAZMA uçları olduğundan tarayıcıda yalnız
  sekme/sayaç görünümü ve "Vazgeç" yolu denenir, "Kaydet" denenmez (ya da kullanıcı test hesabı verirse
  onun öğrencisinde bir prob kaydedilir ve silinir).
- Deploy: önce `0020_probe.sql` iki DB'ye (prod + varsa staging), sonra `main`'e merge → Hostinger.
- Hafıza notu güncellenir.

## 11. Açık noktalar

- Hedef takibiyle bağ: bir seriyi müfredat hedefine iliştirip "%80 × 2 ardışık" olunca durum önerisi
  (asistan `goal_status`) — sonraki faz.
- Atölye okuma hızı (1 dk doğru kelime) aynı `ProbeRun` modeline `kind="reading"` ile — ayrı spec.
