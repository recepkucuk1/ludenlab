# LudenLab — Tanıtım & Pazarlama (GTM) Brief'i

> **Bu belgenin amacı:** Bu metni yeni bir Claude (veya başka bir AI) sohbetine yapıştırıp, aşağıda tanımlı **tam bir Go-To-Market (GTM) paketi** ürettirmek. Sohbet bizim kod tabanımızı göremez; bu yüzden ihtiyaç duyacağı her şey burada. Pazar Türkiye, dil Türkçe.
> **Hazırlanma tarihi:** 18 Haziran 2026 · **Durum:** lansman öncesi.

---

## 0. SANA GÖREV (Claude Chat'e talimat)

Sen deneyimli bir **B2B + B2C SaaS pazarlama stratejistisin** ve Türkiye eğitim/sağlık-teknolojisi (EdTech / sağlık-bitişik) pazarını biliyorsun. Aşağıdaki bağlamı kullanarak **LudenLab için tam bir GTM paketi** hazırla.

Dikkat edilecek iki ayrı satış hattı (motion) var:
- **LudenLab Stüdyo + Atölye → B2C**: bireysel uzmanlara self-servis (terapist, özel eğitim öğretmeni). Ücretsiz kredi → ücretli abonelik funnel'ı.
- **BRY Takip → B2B**: özel eğitim/rehabilitasyon **kurumlarına** (merkez sahibi/müdür) satış; lisans/abonelik.

Bütçe gerçekliği: **sınırlı ücretli reklam + güçlü organik** (bootstrap; küçük ekip). Plan bu kısıtla uygulanabilir olmalı — "100.000₺ reklam bütçesi" varsayma.

İstenen çıktının tam listesi belgenin sonunda (**Bölüm 12**). Önce bağlamı oku, sonra üret. Emin olmadığın pazar verisi için (ör. Türkiye'deki terapist sayısı) varsayım uydurma — "araştırılacak / doğrulanacak" diye işaretle veya bana sor.

---

## 1. Çatı: LudenLab kimdir?

**LudenLab**, Türkiye merkezli, özel eğitim ve terapi uzmanlarına **AI destekli profesyonel araçlar** sunan bir yazılım markası. Tek tüzel kişi, tek alan adı (`ludenlab.com`), "Made in Türkiye".

- **Misyon:** Özel eğitim ve terapi uzmanlarının evrak/hazırlık yükünü AI ile dakikalara indirip, onların asıl işine — çocukla geçen kaliteli zamana — dönmesini sağlamak.
- **Kurucu (kritik anlatı varlığı):** **Recep Küçük** — yazılımcı **ve** İzmir'de **Luden Keşif** adlı özel eğitim merkezinin sahibi. Yani ürünler "dışarıdan bir teknoloji firması" tarafından değil, **sektörü içeriden yaşayan biri** tarafından yapılıyor. Kendi kurumu canlı test ortamı; sektörde kurum sahipleriyle doğrudan (WhatsApp) iletişim ağı var. Bu, tüm markanın güven/özgünlük temeli.
- **Marka kişiliği / ton:** sıcak ama profesyonel; abartısız; uzmana "asistan" olarak konumlanır, onun yerini almaz. Klinik/pedagojik ciddiyet + erişilebilir Türkçe.
- **Ortak teknik güven unsurları:** veri güvenliği ve KVKK ön planda; AI çıktıları **"uzman onayı gerektiren taslak"**; araçlar **tanı koymaz**.

**Portföy bir bakışta:**

| Ürün | Kime | Ne | Model | Durum |
|---|---|---|---|---|
| **Stüdyo** | Dil-konuşma terapistleri, odyologlar | DKT (dil-konuşma-işitme) için kart tabanlı AI terapi materyali | B2C, freemium kredi | Canlı |
| **Atölye** | ÖÖB & DEHB uzmanları, özel eğitim öğretmenleri | BEP/rapor, seans planı, çok duyulu materyal (10–11 araç) | B2C, freemium kredi | Yeni · Beta |
| **BRY Takip** | Özel eğitim/rehabilitasyon **merkezleri** | BKDS biyometrik giriş-çıkış canlı takibi + ders saati hesabı | B2B, lisans/abonelik | Lansman öncesi |

---

## 2. Ürün — LudenLab Stüdyo (B2C, canlı)

**Tek cümle:** Dil, konuşma ve işitme terapistleri için, hedefe özel terapi materyalini dakikalar içinde üreten AI araç kütüphanesi.

- **Kime:** Dil ve konuşma terapistleri (DKT), odyologlar, özel eğitimde dil-konuşma alanında çalışanlar.
- **Çözdüğü acı:** Her öğrenciye özel kart/etkinlik/ev ödevi hazırlamak saatler alıyor; uzman akşamları evrak hazırlıyor. Genel AI (ChatGPT) ne MEB müfredatını ne terapi disiplinini bilir.
- **Araçlar:** Öğrenme Kartı · Artikülasyon kartı · Sesletim (nefes/rezonans) · Ev Ödevi (veliye teslime hazır) · Sosyal Öykü · Haftalık Plan · Eşleştirme Oyunu · İletişim Panosu · Hedef Takip (dönem boyu ilerleme tablosu + rapor) · Seans Özeti.
- **Farklılaştırıcılar:**
  - **MEB Talim ve Terbiye Kurulu müfredat hedefleriyle hizalı** çıktı (jenerik değil, hedef koduna bağlı).
  - **Öğrenci bağlamı hafızası:** geçmiş kartlar, tamamlanmış hedefler, AI eğitim profili → tekrarsız, ilerlemeli içerik.
  - **Pedagojik kural seti:** yalnız **içsel motivasyon** (yıldız/ödül/puan üretmez), yaş grubuna göre süre/dil ayarı.
  - Öğrenci yönetimi, takvim, **PDF dışa aktarma** (Pro+), uzman notu + veli notu + genelleme önerisi her çıktıda.
- **Fiyat (₺, aylık; yıllıkta ~%15 indirim):** Ücretsiz (2 öğrenci, 40 kredi) · **Pro 449₺** (200 öğrenci, 2.000 kredi/ay, PDF) · **Gelişmiş 1.999₺** (sınırsız öğrenci, 10.000 kredi/ay) · Kurumsal (özel). Üretim başına ~20 kredi. Ödeme: iyzico.
- **Adres:** `ludenlab.com/studio`.

---

## 3. Ürün — LudenLab Atölye (B2C, yeni · beta)

**Tek cümle:** Özgül öğrenme bozukluğu (ÖÖB) ve DEHB ile çalışan uzmanlar için BEP, rapor, seans planı ve çok duyulu materyal üreten AI araç seti.

- **Kime:** Özel eğitim öğretmenleri, ÖÖB (disleksi/diskalkuli) ve DEHB uzmanları, RAM/özel eğitim merkezi öğretmenleri.
- **Çözdüğü acı:** BEP yazımı, ilerleme raporu, aile özeti, bireye özel materyal hazırlamak çok zaman alır; standart şablonlar çocuğa özel değildir.
- **Araçlar (10–11):** BEP & Rapor Asistanı (ölçülebilir hedef taslağı) · Seans Planı Üreteci (ısınma→ana etkinlik→kapanış) · Çok Duyulu Materyal · DEHB Davranış Destek Planı (ABC analizi + olumlu pekiştirme) · Okuma-Akıcılık Seti (disleksi, hece/b-d ayrımı) · Matematik Destek Seti (diskalkuli, somut→soyut/CRA) · Sosyal Öykü Üreteci · Bireysel Uyarlama Önericisi · Veli/Ev Destek Mektubu · İlerleme İzleme Çizelgesi. (+ öğrenci/vaka yönetimi, kütüphane, takvim.)
- **Farklılaştırıcılar:** **MEB destek eğitim çerçevesine hizalı**; öğrenci profili (kademe, güçlük profili, hedef) bir kez girilir, tüm araçlar buradan beslenir; klinik veri **ayrı ve izole veritabanında**, çocuk adı yerine kod/rumuz.
- **Fiyat:** Ücretsiz (**100 kredi**, tüm araçlar, öğrenci yönetimi, takvim — kart gerekmez, süre sınırı yok) · **Pro 449₺/ay** (2.000 kredi, PDF, öncelikli üretim) · **Gelişmiş 1.999₺/ay** (10.000 kredi, sınırsız öğrenci) · Kurumsal. Üretim başına ~10 kredi.
- **Durum:** Ücretsiz/yakın-beta; ücretli plana geçiş lansmanla. **Adres:** `ludenlab.com/atolye`.

---

## 4. Ürün — BRY Takip (B2B, lansman öncesi)

**Tek cümle:** Özel eğitim/rehabilitasyon merkezleri için, devletin zorunlu kıldığı BKDS biyometrik giriş-çıkış sistemini **telefondan canlı** takip ettiren ve ders saati ödeneğini doğru hesaplayan uygulama.

- **Pazar:** Türkiye'de **~3.500 özel eğitim/rehabilitasyon merkezi**.
- **Sektör bağlamı (neden şimdi):** **Mayıs 2026'da MEB**, tüm merkezlere **INNOVA** firmasının **BKDS (Biyometrik Kimlik Doğrulama Sistemi)** kullanımını **zorunlu** kıldı (giriş/çıkış kameraları + yerel sunucu + "BRY" web arayüzü). **Merkezin devletten alacağı ödenek bu kayıtlara bağlı** — yani doğru takip = doğru para. Pazar zamanlaması güçlü: zorunluluk yeni, herkes çözüm arıyor.
- **Çözdüğü acı:** INNOVA'nın arayüzü mobil değil; kurum sahibi anlık veriyi görmek için **PC başında durmak** zorunda; telefon erişimi yok; kameralar bazen yanlış okuyor. Sonuç: yorucu, ölçeksiz, ödenek riski.
- **Çözüm:** INNOVA'nın yerel BRY verisini **çok daha iyi UX** ile telefona + modern masaüstü uygulamaya taşır. Kur, BRY bilgilerini bir kez gir, telefondan tüm kuruma anlık bak; ders saatini (MEB kuralına göre 0/1/2/3 ders) otomatik hesaplar; yeni giriş-çıkışta yerel bildirim.
- **Farklılaştırıcılar / kırmızı çizgiler:**
  - **Veri kurum dışına çıkmaz** — tamamen **yerel ağ** mimarisi (cloud yok, Web Push yok). KVKK için güçlü argüman; öğrenci fotoğrafları/engel kodu hassas veri.
  - **"Müdahalesizlik" felsefesi:** kullanıcıdan karar istemez, otomatik çalışır; teknik bilgisi sınırlı kurum sahibi için tasarlandı.
  - Masaüstü (Mac/Windows) + telefonda PWA; arka planda her zaman açık; otomatik güncelleme altyapısı.
- **Konumlandırma inceliği (önemli):** INNOVA'nın **yerini almaz, üstüne eklenen tamamlayıcı araçtır**. Pazarlama dili bunu netçe söylemeli (tedarikçiyle çatışmamak için).
- **İş modeli / fiyat:** Lisanslı yerel kurulum + freemium. **Lite ücretsiz** (temel görüntüleme) · **Standart 299₺/ay** (~2.990₺/yıl) · **Pro 599₺/ay** (çoklu kullanıcı + raporlar).
- **Güçlü dağıtım avantajı:** kurucu sektörden; kurum sahipleriyle WhatsApp ağı + kendi kurumu referans → hızlı pilot.
- **Durum/risk:** Lansman öncesi (Mac sürümü çalışır, Windows derlemesi ve kod imzalama, lisans sistemi yapım aşamasında). **Adres planı:** `bry.ludenlab.com` (+ kurum paneli). `<doğrulanacak: kesin lansman tarihi>`.

---

## 5. Pazar & Personalar

### B2C (Stüdyo + Atölye)
- **Pazar bağlamı:** Türkiye'de dil-konuşma terapistleri, odyologlar, özel eğitim öğretmenleri, RAM ve özel eğitim/rehabilitasyon merkezi çalışanları. Kesin sayılar `<araştırılacak>` (Claude Chat: meslek odası/üniversite kontenjanı/MEB verisinden tahmin üret).
- **Persona B2C-1 — "Yorgun Uzman":** 25–40 yaş, kurumda tam zamanlı, akşam evde evrak/materyal hazırlıyor. Acı: zaman. Kazanç: akşamını geri almak.
- **Persona B2C-2 — "Yeni Mezun":** deneyimi az, "doğru BEP/kart nasıl olur" güvensizliği var. Kazanç: MEB-hizalı, kaliteli taslakla güven.
- **Persona B2C-3 — "Bağımsız/Klinik sahibi terapist":** kendi danışan portföyü; profesyonel görünüm (PDF, veli raporu) önemli. Kazanç: prestij + verim.
- **Satın alma davranışı:** Instagram/TikTok'ta mesleki içerik tüketir; meslek grupları (Facebook/WhatsApp/Telegram), kongre/sertifika eğitimleri etkili; öneriyle (peer) gelir.

### B2B (BRY Takip)
- **Persona B2B-1 — "Kurum Sahibi/Müdür":** 35–55 yaş, teknik bilgisi sınırlı, çoğunlukla Windows, kurumda 8–12 saat, telefonu sürekli yanında, WhatsApp aktif, KVKK konusunda (haklı olarak) temkinli. Karar verici **ve** kullanıcı. Acı: ödenek riski + PC'ye bağlı kalmak. Kazanç: huzur + para güvenliği.

---

## 6. Konumlandırma & Mesaj Direkleri

**Çatı değer önermesi (LudenLab):** "Özel eğitimi içeriden bilen ekibin yaptığı, Türkiye'ye özel AI araçları — evrak sende değil, çocukta kalsın."

**Ortak farklılaştırıcılar (Stüdyo/Atölye):**
1. **MEB müfredatına hizalı** (genel AI değil, alana özel).
2. **Uzman onaylı taslak** — yerini almaz, hızlandırır; tanı koymaz.
3. **Türkçe-yerel + KVKK** — veri güvenliği, izole klinik veri, kod/rumuz.
4. **Pedagojik derinlik** — içsel motivasyon, yaşa/güçlüğe göre uyarlama.
5. **Zaman geri kazanımı** — saatlik hazırlık → dakikalar.
6. **İçeriden yapıldı** — kurucu özel eğitim merkezi sahibi.

**BRY Takip mesaj direkleri:** (1) Ödeneğini garanti altına al (doğru ders saati). (2) Telefondan, PC başında durmadan. (3) Veri kurumdan çıkmaz (KVKK). (4) INNOVA'yı tamamlar, değiştirmez. (5) Kurmak/kullanmak kolay, sektörden biri yaptı.

**Marka sesi yapılacak/yapılmayacak:**
- ✅ Somut fayda, sıcak Türkçe, uzmana saygı, kanıt/örnek çıktı.
- ❌ Klinik **sonuç/iyileşme vaadi**, "tanı", abartılı "AI mucizesi" dili, çocuk verisiyle reklam.

---

## 7. Alternatif / Rekabet Bağlamı

- **Stüdyo / Atölye (B2C):** asıl rakip **mevcut alışkanlık** — manuel hazırlık, Word/PDF şablonları, hazır kaynak kitapçıkları, ve **genel amaçlı ChatGPT**. Konumlandırma: "ChatGPT alana özel değil, MEB-hizalı değil, öğrenci hafızası yok, KVKK güvencesi yok." Yerli/yabancı özel eğitim materyal platformları `<araştırılacak>`.
- **BRY Takip (B2B):** **EÇOP** (17 yıllık pazar lideri, kurum yönetim yazılımı — muhasebe/kayıt/raporlama, BKDS'e özel değil), **RemSis.net** (freemium kurum yönetimi), **Fast Yazılım** (yerel). **Hiçbiri BKDS-spesifik mobil/canlı takip sunmuyor** — niş burası.
- **BRY için risk:** INNOVA tepkisi (API değişimi / yasal). Önlem: "tamamlayıcı araç" dili + adapter mimarisi (hızlı uyum) + ileride başka BKDS markalarına genişleme. Pazarlama bu riski tetiklemeyecek tonda olmalı.

---

## 8. Fiyatlandırma & Funnel Mantığı

- **B2C (Stüdyo/Atölye):** **freemium kredi** — ücretsiz kredi ile değer kanıtlanır (ilk üretim = "aha" anı), kredi/öğrenci limiti dolunca Pro'ya dönüşür. Funnel: Ziyaret → Ücretsiz kayıt (kart yok) → **İlk üretim (aktivasyon)** → kredi tükenmesi/PDF ihtiyacı → Pro 449₺ → Gelişmiş. Yıllıkta %15 indirim retention kaldıracı.
- **B2B (BRY):** Lite (ücretsiz, alışkanlık + güven) → Standart 299₺ (asıl ürün) → Pro 599₺ (çoklu kullanıcı/rapor; muhasebeci+müdür+öğretmen). Satış: WhatsApp/birebir + pilot + referans. Düşük aylık bedel, yüksek "ödenek güvenliği" değeri → kolay evet.

---

## 9. Hedefler & Başarı Metrikleri (öneri — Chat netleştirsin)

- **B2C kuzey yıldızı:** haftalık **aktif üretim yapan uzman** sayısı.
- Huni metrikleri: kayıt → aktivasyon (ilk üretim) oranı → ücretliye dönüşüm → MRR → churn.
- **B2B kuzey yıldızı:** **ödeme yapan kurum** sayısı; pilot→ücretli dönüşüm; aylık yinelenen lisans geliri.
- İlk lansman hedef aralıkları `<seninle netleştir>` — BRY iç yol haritası referansı: ilk 5–10 pilot → 30–50 → 100–200 kurum kademeleri.

---

## 10. Lansman Durumu & Zamanlama

- **Genel durum:** lansman öncesi (Haziran 2026). Stüdyo canlı; Atölye beta→ücretli geçişte; BRY teknik olarak son düzlükte (Windows derleme + kod imzalama + lisans sistemi).
- **Pazarlama açısından bilinen eksikler/hazırlık (üst düzey):** marka görsel kimliği ve sosyal kanalların kurulması, örnek çıktı/demo içerikleri, yasal/KVKK metinlerinin nihaileşmesi, og:image/sosyal kart görselleri. (Bu brief pazarlamaya odaklı; teknik go-live blokerları ayrı izleniyor.)
- `<doğrulanacak: hedef lansman tarihi / kampanya başlangıcı>`.

---

## 11. Marka Varlıkları & Kanallar

- **Alan adı:** `ludenlab.com` (Stüdyo `/studio`, Atölye `/atolye`), `bry.ludenlab.com` (planlı). **E-posta:** `destek@ludenlab.com`.
- **Ödeme:** iyzico.
- **Mevcut sosyal hesaplar:** `<doğrulanacak — varsa Instagram/TikTok/YouTube/LinkedIn handle'ları>`.
- **Görsel kimlik:** "poster" tasarım dili (kalın konturlu, sıcak krem/turuncu-teal paleti, oyuncu ama profesyonel). Logo: LudenLab wordmark + mark.
- **Dağıtım avantajı:** kurucunun sektör ağı + WhatsApp toplulukları + kendi merkezi (referans/vaka kaynağı).

---

## 12. SENDEN İSTENEN ÇIKTI (GTM paketi)

Aşağıdakilerin tamamını, **iki motion'u ayrı ayrı** ele alarak üret. Türkçe, uygulanabilir, sınırlı-bütçe gerçekçi:

1. **Konumlandırma & mesaj evi** — çatı (LudenLab) + her ürün için: değer önermesi, 3–5 mesaj direği, tek-cümle "elevator pitch", tagline adayları.
2. **Persona kartları** — yukarıdakileri derinleştir; her persona için kanal, itiraz, tetikleyici mesaj.
3. **Kanal stratejisi** — B2C için (organik sosyal, içerik/SEO, meslek toplulukları, e-posta, mikro-influencer/uzman iş birlikleri, kongre) + B2B için (birebir/WhatsApp, pilot programı, referans, demo, sektör etkinlikleri). Her kanala **sınırlı bütçe** önceliklendirmesi.
4. **İçerik planı** — ilk **90 gün** için somut içerik takvimi (format + tema + kanal), örnek başlıklar; "örnek AI çıktısı" temalı içerik fikirleri.
5. **Lansman kampanyası** — faz faz (yumuşak beta → resmi lansman), her ürün için; ücretsiz kredi/erken-kullanıcı kancası.
6. **Ücretli reklam planı** — sınırlı bütçeyle Meta/Google: kampanya yapısı, hedefleme, 5–10 reklam metni/creative açısı, test bütçesi dağılımı.
7. **Funnel & dönüşüm** — landing→kayıt→aktivasyon→ücretli için optimizasyon önerileri, e-posta/onboarding akışı, BRY için pilot→ücretli akışı.
8. **Fiyat/paketleme görüşü** — mevcut planlara dair iyileştirme/itiraz; varsa kampanya/indirim mekaniği.
9. **KPI & ölçüm çerçevesi** — kuzey yıldızı + huni metrikleri + gerçekçi 90/180 günlük hedef aralıkları + takip yöntemi.
10. **Risk & kırmızı çizgiler** — KVKK/klinik dil sınırları (Stüdyo/Atölye), INNOVA hassasiyeti (BRY) ile uyumlu mesaj kuralları.
11. **30-60-90 gün uygulama yol haritası** — kim/ne/ne zaman, küçük ekip varsayımıyla önceliklendirilmiş.

**Format:** başlıklı bölümler, tablolar ve madde işaretleriyle; her bölüm doğrudan uygulanabilir olsun. Eksik veri için varsayım uydurma; "doğrulanacak" diye işaretle ve gerekiyorsa bana sorularını en sonda topla.

---

### Ek: Hızlı doğrulama listesi (ben — Recep — dolduracağım)
- [ ] Hedef lansman tarihi / kampanya başlangıcı
- [ ] Mevcut sosyal medya hesapları ve takipçi durumu
- [ ] Sınırlı reklam bütçesinin yaklaşık aylık üst sınırı
- [ ] İlk dönem somut hedef (ör. ilk 100 kayıt / ilk 10 ücretli kurum)
- [ ] BRY Takip kesin lansman/lisans tarihi
