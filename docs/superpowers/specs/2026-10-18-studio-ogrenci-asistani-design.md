# Studio Öğrenci Asistanı — Tasarım

Tarih: 2026-10-18
Modül: Studio (`apps/hub`, `@studio/*`)
Durum: Tasarım onaylandı, uygulama planı bekliyor

## 1. Amaç

Uzman, seans sonrası gözlemini öğrencinin sayfasında tek bir kutuya yazar. Sistem girdiyi
gözlem günlüğüne kaydeder; AI girdiyi okuyup onaylanabilir öneriler çıkarır: hedef durumu
güncelle, profile madde ekle, şu araçla materyal üret. Uzman her öneriyi tek tıkla uygular ya
da geçer. AI hiçbir kaydı kendi başına yazmaz.

Gerekçe: ürünün sorunu araç eksikliği değil kullanım azlığı (2026-09 stratejik değerlendirme).
Bu ekran "not yaz → materyal üret" döngüsünü form gezmeden kapatır. Gözlem günlüğü aynı
zamanda öğrencinin kalıcı hafızasıdır: her araç üretimine ve profil üretimine bağlam olarak
girer.

## 2. Kapsam

Dahil:
- Öğrenci sayfasında yeni "Asistan" sekmesi (girdi kutusu + öneri kartları + günlük).
- `StudentObservation` tablosu ve CRUD.
- Öneri üreten tek AI çağrısı (`POST /studio/api/students/[id]/assistant`).
- Üç öneri türü: `goal_status`, `profile_note`, `generate_tool`.
- Dört aracın formuna URL ile ön-doldurma: artikülasyon, sesletim, eşleştirme, ev ödevi.
- Bağlam katmanına "Son gözlemler" satırı.

Hariç (bilinçli):
- Atölye modülü.
- Yerinde üretim (öğrenci sayfasından ayrılmadan kart üretme).
- Sohbet geçmişi / çok turlu konuşma.
- Sesli giriş, günlüğün PDF/CSV dışa aktarımı.
- Diğer araçlar (sosyal öykü, iletişim panosu, haftalık plan, seans özeti, hedef takibi) için
  ön-doldurma.

## 3. Plan kapısı ve maliyet

- Ücretsiz planda (`planType === "FREE"`) sekme görünür ama kilitlidir: bir satır açıklama ve
  plan sayfasına link. API 403 döner.
- PRO / ADVANCED / ENTERPRISE planlarda kredi düşmez. `CREDIT_COSTS`'a giriş EKLENMEZ.
- Günlük tavan: öğrenci başına 10 girdi / takvim günü (TR saati). Aşımda API 429, arayüzde
  "bugünlük tavan doldu" mesajı. Tavan sayımı `StudentObservation.createdAt` üzerinden;
  rate-limit anahtarı `assistant:<therapistId>` ile ayrıca dakikada 5.
- Onaylanan `generate_tool` önerisi uzmanı araç formuna götürür; üretim orada mevcut kredi
  akışıyla (1 hak) düşer. Bu ekran kendisi hiçbir hak harcamaz.

## 4. Veri

### 4.1 `StudentObservation`

```prisma
model StudentObservation {
  id          String   @id @default(cuid())
  studentId   String
  therapistId String
  text        String   @db.Text   // en fazla 1000 karakter (zod)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  student   Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)
  therapist Therapist @relation(fields: [therapistId], references: [id], onDelete: Cascade)

  @@index([studentId, createdAt])
  @@index([therapistId])
}
```

- Migration: `apps/hub/prisma/sql/0019_student_observation.sql`, raw SQL, additive, idempotent
  (`CREATE TABLE IF NOT EXISTS` + indeksler + FK'lar). `prisma migrate` kullanılmaz (canlı
  proje). Deploy sırası: önce SQL, sonra kod. RLS: mevcut tablolardaki deny-all düzeniyle aynı
  (migration içinde `ENABLE ROW LEVEL SECURITY`).
- Hesap silme orkestrasyonu (`#03`) Cascade ile kapsanır; silme testine bu tablo eklenir.
- Öneri kartları kalıcı DEĞİLDİR: yalnız o yanıtta yaşar. Sayfa yenilenince kaybolur.
  (Gerekçe: kalıcı öneri kuyruğu = ikinci bir "yapılacaklar" yüzeyi; YAGNI.)

### 4.2 Bağlam katmanına ekleme

`studentContext.ts`:
- `StudentContextInput`'a `recentObservations: { text: string; createdAt: Date }[]` eklenir.
- `loadStudentContext` son 5 gözlemi çeker (ikincil sorgu; patlarsa yalnız bu alan atlanır,
  mevcut kuralla aynı).
- `renderStudentBlock` yeni aday alan ekler: `Son gözlemler:` başlığı altında
  `- 14.10: <metin>` satırları; alan tavanı 400 karakter (`BUTCE.gozlem = 400`), her satır
  `scrub`'dan geçer, sığmayan en eski satırlar düşer. A2 sırasında "Uzman notları"nın hemen
  ardına girer (profilden önce), çünkü en taze klinik sinyal budur.
- `BUTCE_TOPLAM` değişmez (2400). Toplam tavan aşımında sondaki alanlar düşer, mevcut davranış.
- Testler: `studentContext.test.ts`'e bütçe/sıra/rumuz vakaları;
  `generateProfile.prompt.test.ts` gözlem satırının profil prompt'unda yer aldığını doğrular.

## 5. API

### 5.1 `POST /studio/api/students/[id]/assistant`

Gövde: `{ text: string }` (1–1000 karakter, `stripHtmlTags`).

Akış:
1. `requireAuth` + `requireStudentOwnership`.
2. Plan kapısı (FREE → 403 `{ error: "Bu özellik ücretli planlarda" , code: "PLAN_REQUIRED" }`).
3. Günlük tavan kontrolü (→ 429) + rate limit.
4. `StudentObservation` INSERT (AI çağrısından ÖNCE; çağrı patlasa da girdi kalır).
5. `ensureStudentAlias` + `loadStudentContext` + hedef listesi + araç kataloğu → prompt.
6. Sonnet 4.6 çağrısı, `streamingJson` sarmalayıcısı içinde (Safari 60 sn).
7. JSON ayrıştır (`extractJson`), zod ile doğrula, geçersiz öneriler sessizce elenir.
8. `restoreNameDeep` ile rumuz geri çevrilir (öneri `reason` metinleri uzmana gerçek adla
   görünür).
9. Yanıt: `{ observation: {id, text, createdAt}, suggestions: Suggestion[], warning?: string }`.
   AI patlarsa 200 + `suggestions: []` + `warning: "Öneri üretilemedi"`; gözlem yine döner.
10. `logUsage` ile maliyet kaydı (`tool: "assistant"`).

### 5.2 Gözlem CRUD

- `GET /studio/api/students/[id]/observations` → son 50, tarih azalan.
- `PATCH /studio/api/observations/[obsId]` → `{ text }`.
- `DELETE /studio/api/observations/[obsId]`.
- Hepsi sahiplik kapılı (`therapistId` eşleşmeli). Düzenleme/silme plan kapısına tabi DEĞİL
  (uzman verisine her zaman erişir; KVKK).

### 5.3 Öneri uygulama

Yeni uç YOK. Arayüz mevcut uçları çağırır:
- `goal_status` → `PUT /studio/api/students/[id]/progress` (mevcut gövde).
- `profile_note` → `PATCH /studio/api/students/[id]` ile `aiProfile` güncellenir (mevcut PATCH
  `aiProfile` alanını kabul etmiyorsa zod gövdesine eklenir, ≤ 20.000 karakter). Arayüz
  bölümü bulur (`profilBolumleriniAyikla` ile aynı başlık sözleşmesi) ve sonuna
  `- <text>` satırı ekler. Profil yoksa bu tür öneri hiç gösterilmez; yerine sabit bir
  "Önce Eğitim Profili üretin" kartı çıkar (AI'sız, arayüzde).
- `generate_tool` → `router.push` ile araç sayfasına, bkz. §7.

## 6. AI çağrısı

### 6.1 Prompt

- Sistem prompt'u `studioSistemPromptu` iskeletiyle, sabit (önbellek). Rol: "gözlemi okur,
  en fazla 4 somut öneri çıkarır; uydurmaz; emin değilse öneri yazmaz".
- Kullanıcı prompt'u: öğrenci bloğu (rumuzlu) + "Yeni gözlem:" satırı + hedef listesi
  (`goalId | kod | başlık | mevcut durum`, yalnız öğrencinin atanmış müfredatlarındaki
  hedefler, en fazla 60 satır) + araç kataloğu (4 araç, her birinin parametre şeması düz
  metin olarak).
- Model: `MODEL` sabiti (Sonnet 4.6). `max_tokens` 1200. Thinking kapalı.

### 6.2 Çıktı şeması

```ts
type Suggestion =
  | { kind: "goal_status"; goalId: string; status: "in_progress" | "consolidating" | "mastered"; reason: string }
  | { kind: "profile_note"; section: "Öncelikli Çalışma Alanları" | "Dikkat Edilmesi Gereken Noktalar" | "Etkili Yaklaşım ve Teknikler"; text: string; reason: string }
  | { kind: "generate_tool"; tool: "articulation" | "phonation" | "matching-game" | "homework"; params: Record<string, unknown>; reason: string };
```

Sunucu doğrulaması:
- `goalId` hedef listesinde olmalı ve önerilen durum mevcut durumdan FARKLI olmalı.
- `profile_note.text` ≤ 300 karakter, `reason` ≤ 200.
- `generate_tool.params` ilgili aracın mevcut `bodySchema`'sından `studentId` düşülmüş
  haliyle doğrulanır (`.partial()` DEĞİL; eksik zorunlu alan = öneri elenir). Araç şemaları
  rota dosyalarından `toolSchemas.ts` adlı ortak modüle taşınır; rotalar oradan import eder.
- En fazla 4 öneri; fazlası kesilir. Aynı türden aynı hedef/araç için tekrar elenir.

### 6.3 PII

- Girdi metni modele gitmeden `scrub` ile öğrencinin adı rumuza çevrilir (mevcut kapı).
- Bilinen sınır: metindeki diğer kişiler (kardeş, veli, başka öğrenci) rumuzlanmaz. Kutunun
  altında sabit uyarı: "Başka çocukların ya da velilerin adını yazmayın."
- Günlük verisi sağlık verisidir; mevcut `notes` ile aynı sınıfta. Yeni bir KVKK kategorisi
  açmaz, ancak gizlilik metnine "seans gözlem notları" ibaresi eklenir.

## 7. Form ön-doldurma

Dört araç sayfası (`tools/articulation`, `tools/phonation`, `tools/matching-game`,
`tools/homework`) açılışta `useSearchParams` okur:

- `?studentId=<id>&prefill=<base64url(JSON)>`.
- Ortak yardımcı `@studio/lib/prefill.ts`: `encodePrefill(obj)`, `decodePrefill(str)` (hatalı
  base64/JSON → `null`, sessiz). 2 KB üstü reddedilir.
- Sayfa, çözülen nesneyi kendi zod şemasıyla (`toolSchemas.ts`) `safeParse` eder; geçerli
  alanları state'e yazar, geçersiz olanları yok sayar. Üret düğmesi, doğrulama, kredi,
  rumuz kapısı aynen.
- Sayfa üstünde bir satır: "Alanlar Asistan önerisiyle dolduruldu; kontrol edip Üret'e basın."
  (`prefill` varsa).
- `generate_tool` kartındaki düğme metni: "Formu aç".

## 8. Arayüz

Öğrenci sayfası sekmeleri: Kartlar | İlerleme | Eğitim Profili | **Asistan**.

Asistan sekmesi, yukarıdan aşağı:
1. Metin kutusu (`PTextarea`, 4 satır, sayaç 1000) + "Gönder" (`PBtn accent`). Enter değil,
   düğme ile gönderim (çok satırlı not).
2. Gönderim sırasında `PSpinner` "Gözlem kaydedildi, öneriler hazırlanıyor…".
3. Öneri kartları (`PCard`): tür rozeti (`PBadge`: Hedef / Profil / Materyal), başlık
   (ör. "3.2 hedefini Pekiştirme'ye al"), `reason`, iki düğme: Uygula / Geç. Uygulanan kart
   yeşil tik alır ve kilitlenir; hata toast ile.
4. "Gözlem günlüğü" başlığı; satırlar: tarih, metin, kalem ve çöp ikonu (lucide). Düzenleme
   satır içi `PTextarea`. Silme `PModal` onayı.
5. FREE planda 1–3 yerine kilit kartı; günlük (4) FREE'de de görünür ama boştur (hiç
   yazamadığı için).

Mobil: tek sütun, 390 px'te taşma yok (mevcut poster bileşenleri). Koyu tema: poster token'ları.

## 9. Hata ve kenar durumlar

- AI zaman aşımı / 5xx: gözlem kaydedildi, `warning` ile boş öneri; "Tekrar dene" düğmesi
  aynı gözlem için yeni çağrı yapar (yeni gözlem YAZMAZ: `POST …/assistant` gövdesine
  `observationId` verilirse insert atlanır, tavan sayılmaz).
- Öğrencide müfredat yok: `goal_status` üretilmez; prompt'a "hedef listesi boş" yazılır.
- Profil yok: `profile_note` elenir; sabit "Profil üret" kartı.
- Uygula sırasında mevcut uç 4xx: toast + kart açık kalır.
- Aynı öneri iki kez uygulanamaz (kart kilidi; sunucu idempotent zaten: PUT/PATCH).

## 10. Test

- Birim: öneri ayrıştırma + doğrulama (`assistant/parse.test.ts`): geçersiz goalId, aynı
  durum, eksik param, 4'ten fazla, çift öneri, boş JSON.
- Birim: `prefill.test.ts` (encode/decode, bozuk girdi, boyut).
- Birim: `studentContext.test.ts` yeni alan (bütçe, sıra, rumuz, boş liste).
- Birim: `generateProfile.prompt.test.ts` gözlem satırı sözleşmesi.
- Rota: plan kapısı (FREE 403), günlük tavan (11. istek 429), retry (`observationId`) insert
  yapmaz, AI hatasında gözlem yine döner.
- Hesap silme testi: `StudentObservation` cascade.
- Son adım: `next build` (deploy `next build`'tir, `tsc` yetmez).

## 11. Deploy sırası

1. `0019_student_observation.sql` studio DB'de (Supabase `kgbhvruzoaqwwwkhzdex`).
2. Kod main'e → Hostinger otomatik deploy.
3. `/api/version` ile sürüm doğrulama.

## 12. Açık kararlar (uygulama planına taşınan, tasarımı değiştirmeyen)

- Araç kataloğunun prompt'taki düz metin biçimi (şemadan otomatik türetilir mi, elle mi
  yazılır): planda karar verilir, elle yazım tercih edilir (4 araç, stabil).
- `profile_note` ekleme sonrası profilin "yeniden üret" uyarısı gösterilip gösterilmeyeceği:
  gösterilmez; madde doğrudan eklenir.
