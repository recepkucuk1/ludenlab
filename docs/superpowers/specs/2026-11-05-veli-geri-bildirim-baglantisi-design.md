# Veli Geri Bildirim Bağlantısı (Studio) — Tasarım

Tarih: 2026-11-05
Modül: Studio (`apps/hub`, `@studio/*`)
Durum: Tasarım onaylandı, uygulama planı bekliyor
Kaynak: 2026-11-03 eğitim-felsefesi değerlendirmesi — Faz 1'in ikinci parçası ("çocuk ve veli yüzeyi
yok: veli tek yönlü alıcı, geri bildirim kanalı yok"). Kardeşleri: ölçüm probu (TAMAM, 2026-11-05),
hedef denetçisi (ayrı spec).

## 1. Amaç

Uzman, öğrenci sayfasından çocuğa özel bir bağlantı/QR üretir ve veliye verir. Veli, hesap açmadan,
telefonda bir dakikada üç soruyu yanıtlar: evde kaç gün çalışıldı, ne kolay / ne zor geldi, kısa not.
Yanıt uzmanın gözlem günlüğüne "Veli" kaynaklı bir gözlem olarak düşer, Asistan sekmesinde görünür
ve öğrenci bağlam bloğuna ayrı bir satır olarak girerek tüm AI araçlarına ulaşır. Böylece evdeki
uygulama verisi ürüne geri döner; veli tek yönlü alıcı olmaktan çıkar.

AI üretimi yok, kredi yok, plan kapısı yok (gözlem düzenle/sil gibi).

## 2. Kararlar (beyin fırtınası, 2026-11-05)

| Konu | Karar |
|---|---|
| Veli formu | 3 sabit soru + kısa not: gün sayısı (0–7), kolay/zor çipleri, not ≤300 |
| Bağlantı ömrü | Çocuk başına SÜREKLİ bağlantı; uzman iptal eder / yeniler |
| Kötüye kullanım | Yalnız iptal/yenile + rate limit; hCaptcha YOK; yanıt sayısı sınırsız |
| Kimlik | Sayfada yalnız uzman adı; çocuk adı/etiketi YOK |
| KVKK | Yalnız aydınlatma metni; onay kutusu YOK |
| Uzman tarafı | Asistan sekmesinde "Veli" rozeti + bağlamda ayrı "Veli geri bildirimi" satırı (uzman gözlemlerini itmez) |
| QR yeri | Öğrenci başlığında "Veli bağlantısı" düğmesi → modal (QR + kopyala + iptal/yenile) |
| Yaklaşım | A: `StudentObservation` + `source`/`meta` sütunları + yeni `ParentLink` tablosu |

Bilinçli risk: sürekli bağlantı + sınırsız yanıt, sızan linkte istenmeyen yanıt üretebilir. Karşılığı:
token tahmin edilemez (192 bit), sayfada çocuk verisi yok, uzman tek tıkla yeniler, IP + token rate
limit, her yanıt silinebilir.

## 3. Kapsam

Dahil:
- Migration `0021_parent_link.sql`: `ParentLink` tablosu + `StudentObservation.source`/`meta`.
- Açık sayfa `/veli/[token]` ve açık API `/api/veli/[token]` (GET/POST).
- Uzman rotaları `students/[id]/parent-link` (GET/POST/DELETE).
- Öğrenci başlığında "Veli bağlantısı" düğmesi + `ParentLinkModal` (QR, URL, kopyala, iptal, yenile).
- Asistan sekmesi: `source=parent` satırlar "Veli" rozetli, düzenleme kapalı, silme açık.
- Bağlam bloğu: "Veli geri bildirimi" alanı; "Son gözlemler" yalnız `source=therapist`.
- Günlük asistan kotası yalnız uzman gözlemlerini sayar.
- Gizlilik sayfasına "Veli geri bildirimi" paragrafı.
- `qrcode` paketi (istemcide SVG üretimi).

Hariç (sonraki fazlar):
- Ev ödevi PDF'ine QR basma.
- Veli yanıtlarından grafik/özet (gün sayısı trendi).
- Uzmana yeni yanıt bildirimi (e-posta/push).
- Çok dilli veli sayfası.

## 4. Veri modeli

Migration `apps/hub/prisma/sql/0021_parent_link.sql` (0019/0020 kalıbı: idempotent, RLS, Cascade,
"ÖNCE SQL SONRA kod"; `db push` KULLANMA).

```sql
CREATE TABLE IF NOT EXISTS public."ParentLink" (
  "id"             TEXT PRIMARY KEY,
  "studentId"      TEXT NOT NULL,
  "therapistId"    TEXT NOT NULL,
  "token"          TEXT NOT NULL,                 -- 24 bayt rastgele, base64url (32 karakter)
  "active"         BOOLEAN NOT NULL DEFAULT TRUE,
  "answerCount"    INTEGER NOT NULL DEFAULT 0,
  "lastAnsweredAt" TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt"      TIMESTAMP(3),
  CONSTRAINT "ParentLink_studentId_fkey"   FOREIGN KEY ("studentId")   REFERENCES public."Student"("id")   ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ParentLink_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES public."Therapist"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ParentLink_token_key" ON public."ParentLink" ("token");
CREATE INDEX IF NOT EXISTS "ParentLink_studentId_active_idx" ON public."ParentLink" ("studentId", "active");
CREATE INDEX IF NOT EXISTS "ParentLink_therapistId_idx" ON public."ParentLink" ("therapistId");
-- Öğrenci başına tek AKTİF bağlantı (yenilemede eski pasifleşir + yenisi açılır, tek işlem; eşzamanlı çift gönderim → P2002 → 409)
CREATE UNIQUE INDEX IF NOT EXISTS "ParentLink_student_active_uidx" ON public."ParentLink" ("studentId") WHERE "active";
ALTER TABLE public."ParentLink" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."StudentObservation" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'therapist';
ALTER TABLE public."StudentObservation" ADD COLUMN IF NOT EXISTS "meta" JSONB;
CREATE INDEX IF NOT EXISTS "StudentObservation_studentId_source_createdAt_idx" ON public."StudentObservation" ("studentId", "source", "createdAt");
```

Prisma (`prisma/studio/schema.prisma`): `model ParentLink` aynı alanlarla (`token @unique`,
`@@index([studentId, active])`, `@@index([therapistId])`; kısmi tekil indeks Prisma'da ifade edilemez,
doc yorumunda not); `StudentObservation`'a `source String @default("therapist")` ve `meta Json?`;
`Student`/`Therapist` ilişki listelerine `parentLinks ParentLink[]`.

Token neden düz saklanıyor: bağlantı süresizdir ve modal QR'ı her açılışta yeniden göstermelidir;
özet (hash) saklansa URL yeniden üretilemezdi. Token yalnız rumuzlu bir forma yanıt yazma hakkı verir,
hiçbir okuma hakkı vermez. DB sızıntısında zaten gözlemlerin kendisi açığa çıkar.

`meta` biçimi (zod ile kilitli): `{ days: 0..7, easy: string[], hard: string[] }`; çip anahtarları
§6'daki sabit listelerden (serbest metin değil).

Hesap silme: `accountDeletion.ts` `therapist.deleteMany` → Cascade; öğrenci silme → Cascade. Ek kod yok.

## 5. Token ve bağlantı yaşam döngüsü

- Üretim: `crypto.randomBytes(24).toString("base64url")` (32 karakter, 192 bit). Saf yardımcı
  `src/modules/studio/lib/parentLink/token.ts`: `generateToken(rng?)`, `isTokenShape(s)` (regex
  `^[A-Za-z0-9_-]{32}$`; sayfa ve API biçimsiz token'ı DB'ye sormadan 404 verir).
- URL: `${getBaseUrl()}/veli/${token}` (`@studio/lib/baseUrl`).
- Durumlar: aktif → (iptal) pasif. "Yenile" = tek `$transaction`: `updateMany({studentId, active:true}
  → active:false, revokedAt)` + `create`. Kısmi tekil indeks çift aktif bağlantıyı engeller (P2002 → 409
  "Bağlantı az önce oluşturuldu; sayfayı yenileyin").
- Pasif token'la gelen GET/POST → 404 (varlık bilgisi sızdırmaz); sayfa "Bu bağlantı artık geçerli
  değil. Lütfen uzmanınızdan yeni bağlantı isteyin." gösterir.
- Yanıt geldiğinde `answerCount += 1`, `lastAnsweredAt = now()` (gözlem oluşturma ile aynı
  `$transaction`).

## 6. Veli sayfası ve açık API

### Sayfa `/veli/[token]`

- Konum: `apps/hub/src/app/veli/[token]/page.tsx` (+ `layout.tsx`). `/studio` dışında olduğu için
  middleware oturum kapısına takılmaz (matcher `/studio`, `/atolye`, `/api`); `(legal)/layout.tsx`
  kalıbında sade kabuk: Logo + başlık, poster token'ları kök layout'tan gelir (`body.poster-scope`),
  `studio/layout` KULLANILMAZ (ThemeProvider/Auth yok). Açık tema; `prefers-color-scheme` ile koyu
  tema desteklenmez (sade, tutarlı).
- Sunucu bileşeni token biçimini denetler, `GET /api/veli/[token]` yerine doğrudan Prisma ile aktif
  bağlantıyı bulur (`select { therapist: { select: { name } } }`); yoksa "geçersiz" ekranı (HTTP 404
  statüsü `notFound()` ile). Çocuk verisi sayfaya GİTMEZ (ad, doğum tarihi, tanı, alias hiçbiri).
- İstemci bileşeni `ParentFeedbackForm` (`src/modules/studio/components/parent/ParentFeedbackForm.tsx`):
  1. "Bu hafta evde kaç gün çalıştınız?" — 0–7 arası 8 büyük düğme (≥44 px), tek seçim, zorunlu.
  2. "Neler kolay, neler zor geldi?" — iki çip grubu, çok seçimli, isteğe bağlı.
     - Kolay (`easy`): `istekle_oturdu` "İstekle oturdu", `soyledi` "Hedef sesi/kelimeleri söyledi",
       `oyunu_sevdi` "Oyunu sevdi", `kendi_basladi` "Kendi başladı".
     - Zor (`hard`): `oturmak_istemedi` "Oturmak istemedi", `zorlandi` "Zorlandı",
       `zaman_bulamadik` "Zaman bulamadık", `anlamadik` "Yönergeyi anlamadık".
  3. "Eklemek istediğiniz bir şey?" — textarea ≤300, isteğe bağlı, sayaç.
  - Aydınlatma metni (düğmenin üstünde, kutu yok): "Yanıtınız çocuğunuzun uzmanına iletilir ve eğitim
    planlamasında kullanılır. Yapay zekâ desteğine çocuğun adı gitmez, takma ad kullanılır. Uzman
    yanıtı silebilir. Ayrıntı: Gizlilik Politikası (/gizlilik)."
  - "Gönder" → `POST /api/veli/[token]`; başarıda teşekkür ekranı ("Teşekkürler, yanıtınız iletildi.")
    + "Yeni yanıt" düğmesi (sınırsız yanıt kararı). 404 → geçersiz ekranı; 429 → "Çok sık yanıt
    gönderildi, biraz sonra tekrar deneyin."; diğer → "Bir hata oluştu, lütfen tekrar deneyin."
  - Mobil öncelikli (390 px), tek sütun, 16 px kenar boşluğu; klavye erişilebilir; `aria-pressed`
    çipler; `fieldset/legend` sorular.

### API `/api/veli/[token]` (`apps/hub/src/app/api/veli/[token]/route.ts`)

- `GET` → `200 { therapistName }` ya da `404 { error }`. Rate limit `veli-get:<ip>` 60/dk.
  (Sayfa SSR'da doğrudan Prisma kullanır; GET istemci yeniden denemeleri için.)
- `POST` gövde (zod, `src/modules/studio/lib/parentLink/schema.ts`):
  `{ days: int 0..7, easy: enum[] (≤4, tekrarsız), hard: enum[] (≤4, tekrarsız), note?: string trim ≤300 }`.
  - Sıra: biçim denetimi → rate limit `veli-post:<token>` 3/saat ve `veli-post:<ip>` 10/saat →
    `readJsonBody` → zod → aktif bağlantı (`findUnique token` + `active`) yoksa 404 → `$transaction`
    [`studentObservation.create({ studentId, therapistId, source:"parent", meta, text })`,
    `parentLink.update({ answerCount: {increment:1}, lastAnsweredAt })`] → `201 { ok: true }`.
  - `text` saf derleyiciden (`src/modules/studio/lib/parentLink/composeText.ts`):
    `Veli: 4 gün çalışıldı. Kolay: istekle oturdu, oyunu sevdi. Zor: zaman bulamadık. Not: …`
    (0 gün → "Veli: bu hafta çalışılamadı."; boş gruplar atlanır; not `stripHtmlTags` + tek satır; toplam
    ≤1000 — not 300 ile zaten sığar).
  - Audit `parentFeedback.receive` (`actorId: null`, `targetType: "student"`, `targetId`,
    `ip: getClientIp`, `diff: { days }` — token ve metin YOK).
- CSRF: middleware'in origin denetimi `/api/*` üzerinde çalışır; sayfa aynı kökenden fetch ettiği için
  geçer. Content-length 512 KB kapısı zaten var.
- Loglama: `logError("POST /api/veli/[token]", error)` — token loglanmaz (mesajlarda yer almaz).

## 7. Uzman tarafı

### Rotalar `apps/hub/src/app/studio/api/students/[id]/parent-link/route.ts`

Hepsi `requireAuth` → `requireStudentOwnership`; rate limit `parent-link:<therapistId>` 30/dk.
- `GET` → `{ link: { id, url, active:true, answerCount, lastAnsweredAt, createdAt } | null }` (aktif
  bağlantı; URL sunucuda `getBaseUrl()` ile kurulur).
- `POST` → yenile/oluştur: `$transaction` [pasifleştir, oluştur] → `201 { link }`; P2002 → 409.
  Audit `parentLink.create` (actor uzman, target student, `diff: { renewed: boolean }`).
- `DELETE` → aktif bağlantıyı pasifleştir (`updateMany … active:false, revokedAt`); 0 satır → 404;
  `200 { success:true }`. Audit `parentLink.revoke`.

### Modal `ParentLinkModal` (`src/modules/studio/components/students/ParentLinkModal.tsx`)

- Öğrenci başlığında, "Düzenle" ile "Kart Üret" arasında `PBtn variant="white" size="sm"`
  "Veli bağlantısı" (ikon `Link2`/`QrCode` lucide). Modal `PModal` başlık "Veli bağlantısı".
- Bağlantı yoksa: açıklama ("Veli, bu bağlantıdan hesap açmadan haftalık geri bildirim gönderir. Sayfada
  çocuğun adı görünmez.") + "Bağlantı oluştur".
- Bağlantı varsa: QR (SVG, `qrcode` paketi `toString(url, { type: "svg", margin: 1 })`, 200×200,
  `role="img" aria-label="Veli bağlantısı QR kodu"`), URL metni (`PInput readOnly` + "Kopyala" →
  `navigator.clipboard.writeText`, toast "Kopyalandı"), "Yanıt: N · son: 14.10.2026" satırı,
  düğmeler "Yenile" (onay: "Eski bağlantı geçersiz olur; veliye yenisini göndermeniz gerekir.") ve
  "İptal et" (onay). Yükleniyor/hata durumları `PSpinner`/toast.
- Koyu tema: QR beyaz zemin + siyah modül (sabit; taranabilirlik için), çevresi panel token'ı; bekçi
  testi `koyuTemaKontrast` listesine eklenir (`active ?` + `#fff` kalıbı yok; QR'daki `#fff` sabit
  SVG `fill`'idir, `active ?` içermediği için kurala takılmaz).

### Asistan sekmesi (`AssistantTab.tsx`)

- `GET .../observations` select'e `source`, `meta` eklenir (`locked`/`quota` aynı).
- Listede `source === "parent"` satır: `PBadge color="blue"` "Veli" + metin; "Düzenle" gizli
  (PATCH uzman metni içindir; sunucu da `source=parent` PATCH'i 400 ile reddeder); "Sil" açık.
- Gözlem gönderme kutusu değişmez. Günlük kota (`dailyCap.ts`) sayımı `where: { source: "therapist" }`.
- Asistan çalıştırma (`run.ts`): değişmez; bağlam bloğu veli satırını zaten taşır.

### Bağlam bloğu (`studentContext.ts`)

- `BUTCE.veli = 300`, `BUTCE.veliSayisi = 2`.
- Sorgular: "Son gözlemler" `where … source: "therapist"`; yeni sorgu `where { studentId, therapistId,
  source: "parent" } orderBy createdAt desc take 2 select { text, createdAt }` (`allSettled` + `yedek`).
- Yeni alan "Veli geri bildirimi (eskiden yeniye):" satırları `- 14.10: <text 'Veli: ' öneki
  kırpılmış>`; "Son ölçümler"den SONRA, profilden ÖNCE; bütçe 300 (gözlem kuralı: başlık sayılmaz,
  sığmayan en eski düşer, tek satır da sığmazsa `kirp`). Metin `scrub` ile rumuzlanır (zaten).
- `BUTCE_TOPLAM` 2400 değişmez; "profil tam not + 5 gözlem + 3 ölçüm + 2 veli ile düşmez" regresyon testi.
- Saf biçimlendirici `src/modules/studio/lib/parentLink/contextLine.ts` (`parentContextLines`).
- `StudentContextInput.recentParentFeedback: { text, createdAt }[]`; `generateProfile.ts` yedeğine `[]`;
  eval mock `studentObservation.findMany` zaten var (yeni sorgu aynı modelde).

## 8. Hukuk ve gizlilik

- `src/app/(legal)/gizlilik/page.tsx`: "Veli geri bildirimi" paragrafı — uzmanın ürettiği bağlantıyla
  velinin gönderdiği yanıtlar (gün sayısı, seçimler, kısa not) uzmanın öğrenci kaydında saklanır,
  yalnız o uzman görür, yapay zekâya takma adla gider, uzman silebilir, öğrenci/hesap silinince silinir;
  veli sayfası çocuk adı içermez.
- `kosullar` §(uzman sorumluluğu) zaten "gerekli aydınlatma ve rızaları temin eder" der; veli sayfası
  aydınlatma metni buna ek.
- Analitik: Umami kök layout'ta yüklenir (çerezsiz, anonim). Veli sayfasının URL'si token taşıdığı
  için yol bilgisi üçüncü tarafa GİTMEMELİ: kök layout `headers()` ile yolu okur ve `/veli/` ile
  başlıyorsa Umami script'ini atlar (plan aşamasında doğrulanır; mümkün değilse `app/veli/layout.tsx`
  script'i `beforeInteractive` kaldırma yerine `next/script` `strategy` ile devre dışı bırakır).
  Çerez bandı yalnız studio layout'unda; veli sayfasında çerez yok. `<meta name="robots"
  content="noindex">`.

## 9. Testler (önce test, sonra kod)

- `src/lib/parentLinkMigration.test.ts`: 0021 kaynak metni — `ParentLink` idempotent, 2 FK CASCADE
  (kısıt bazlı regex, 0020 dersi), token unique, kısmi tekil indeks `WHERE "active"`, RLS,
  `StudentObservation` `source` DEFAULT 'therapist' + `meta` + indeks.
- `parentLink/token.test.ts`: 32 karakter base64url; enjekte rng ile deterministik; `isTokenShape`
  sınırları (31/33 karakter, `+`/`/`, boş).
- `parentLink/schema.test.ts`: days 0–7 sınırı, çip enum dışı red, tekrar red, not 301 red, HTML
  temizliği rota tarafında.
- `parentLink/composeText.test.ts`: 0 gün, tüm gruplar, boş gruplar, not tek satır, uzunluk ≤1000.
- `parentLink/contextLine.test.ts`: tarih artan, "Veli: " öneki kırpma, 2 tavan.
- `api/veli/[token]/veli.test.ts` (taklit Prisma/rateLimit/audit): biçimsiz token 404 (DB'ye sorulmaz),
  pasif 404, zod 400, 201 + `create` verisi (`source`, `meta`, `text`) + `update` sayaç, rate limit 429.
- `students/[id]/parent-link/parentLink.test.ts`: sahiplik 404, GET null/aktif, POST yenile
  (`$transaction` 1 kez, pasifleştir + oluştur, 201 URL `getBaseUrl` ile), P2002 → 409, DELETE 404/200,
  `requireStudentOwnership` argümanları.
- `observations/[obsId]` PATCH: `source=parent` → 400 testi.
- `dailyCap` sayımı `source: "therapist"` filtresi testi.
- `studentContext.test.ts`: yeni alan yeri/bütçe/boş durum; "Son gözlemler" sorgusunda `source` filtresi;
  profil regresyonu (2 veli satırıyla).
- `koyuTemaKontrast.test.ts`: `ParentLinkModal`, `ParentFeedbackForm`.
- Bileşenler tsc + eslint; headless render (modal, veli formu 390 px) kullanıcıya görsel.

## 10. Doğrulama ve yayın

- Birim + eval öz-testleri, `tsc`, lint, `next build`.
- Deploy sırası: ÖNCE `0021_parent_link.sql` (studio DB), SONRA kod. Kod önce giderse: veli sayfası
  500, gözlem GET'i `source` seçimi nedeniyle 500 — bu yüzden sıra ZORUNLU (0020'den farklı: mevcut
  tabloya sütun ekliyor).
- Canlı doğrulama (kullanıcı): bağlantı üret → telefonla QR tarat → yanıt gönder → Asistan'da "Veli"
  rozeti → bir araç prompt'unda "Veli geri bildirimi" satırı → "Yenile" sonrası eski link 404.

## 11. Açık noktalar

- Uzmana yeni yanıt bildirimi (e-posta) — Faz 2 adayı.
- Ev ödevi PDF'ine QR — ev ödevi aracına bağımlı, sonraki parça.
- Veli yanıtlarından gün-sayısı trendi (ölçüm sekmesine mini grafik) — veri birikince.
- Spam/istismar gözlenirse: token başına günlük tavan ya da hCaptcha (altyapı hazır, tek bayrak).
