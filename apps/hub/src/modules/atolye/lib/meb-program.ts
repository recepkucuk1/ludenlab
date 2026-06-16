/* MEB ÖRGM "Öğrenme Güçlüğü Olan Bireyler İçin Destek Eğitim Programı" (Mart 2025)
   hedef taksonomisi — 4 SEVİYE: Modül → Bölüm → Hedef → Hedef Davranış.
   Kaynak: programın "Hedef ve Hedef Davranışlar" bölümü (resmî kodlarla).

   • Client + server paylaşır (server-only kod YOK) — ogrenci-profili.ts gibi.
   • `kod` = resmî kazanım kodu (ör. "6.1.1"); BEP/ilerleme izlenebilirliğinin omurgası.
   • `duzey` yalnız Modül 5 (Matematik) hedef davranışlarında dolu (Düzey 1–4 ≈ kademe ilerlemesi).
   • `aciklama` bu sürümde boş bırakıldı (programdaki pedagojik notlar sonra eklenebilir).

   TAMAMLANDI: 6 modül · 30 bölüm · 172 hedef · 1079 hedef davranış
   (Modül 5'in 399 davranışı Düzey 1–4 etiketli). */

export interface MebHedefDavranis {
  /** Resmî kod, ör. "6.1.1.1". */
  kod: string;
  metin: string;
  /** Yalnız Modül 5: Düzey 1–4. */
  duzey?: 1 | 2 | 3 | 4;
  /** Programdaki açıklama/örnek notu (opsiyonel — bu sürümde boş). */
  aciklama?: string;
}

export interface MebHedef {
  /** Resmî kod, ör. "6.1.1". */
  kod: string;
  metin: string;
  hedefDavranislar: MebHedefDavranis[];
}

export interface MebBolum {
  /** Resmî kod, ör. "6.1". */
  kod: string;
  ad: string;
  /** MEB ders saati. */
  saat: number;
  hedefler: MebHedef[];
}

export interface MebModul {
  no: number;
  ad: string;
  amac: string;
  /** MEB toplam ders saati. */
  saat: number;
  bolumler: MebBolum[];
}

/* Modül 5 (Matematik) hedef davranışları `duzey` (Düzey 1–4) taşır, ör:
   {
     kod: "5.1.1", metin: "Ritmik sayar.",
     hedefDavranislar: [
       { kod: "5.1.1.1", metin: "0'dan 100'e kadar ileri doğru birer ritmik sayar.", duzey: 1 },
       { kod: "5.1.1.8", metin: "100'den geriye doğru ikişer ritmik sayar.",        duzey: 2 },
       ...
     ],
   }                                                                                              */

export const MEB_MODULLER: MebModul[] = [
  {
    no: 1,
    ad: "Öğrenmeye Destek",
    amac:
      "Öğrenme güçlüğü olan bireylerin görsel algı ve bellek, işitsel algı ve bellek, dokunsal algı ve bellek, motor planlama ve duyusal algı, kendini düzenleme/yönetme ile ilgili öğrenmeye hazırlanması amaçlanmaktadır.",
    saat: 150,
    bolumler: [
      {
        kod: "1.1",
        ad: "Görsel Algı ve Bellek",
        saat: 35,
        hedefler: [
          {
            kod: "1.1.1",
            metin: "Şekil, harf, rakam ve sözcükleri eşler.",
            hedefDavranislar: [
              { kod: "1.1.1.1", metin: "Şekilleri eşler." },
              { kod: "1.1.1.2", metin: "Harfleri eşler." },
              { kod: "1.1.1.3", metin: "Rakamları eşler." },
              { kod: "1.1.1.4", metin: "Sözcükleri eşler." },
            ],
          },
          {
            kod: "1.1.2",
            metin: "Şekil, harf, rakam ve sözcükleri ayırt eder.",
            hedefDavranislar: [
              { kod: "1.1.2.1", metin: "Şekli ayırt eder." },
              { kod: "1.1.2.2", metin: "Harfi ayırt eder." },
              { kod: "1.1.2.3", metin: "Rakamı ayırt eder." },
              { kod: "1.1.2.4", metin: "Sözcüğü ayırt eder." },
            ],
          },
          {
            kod: "1.1.3",
            metin: "Verilen şekil, harf, rakam ve sözcükleri istenen özelliğine göre gruplar.",
            hedefDavranislar: [
              { kod: "1.1.3.1", metin: "Aynı türde/renkte/büyüklükte olan şekil, harf, rakam ve sözcükleri istenen özellik açısından gruplar." },
              { kod: "1.1.3.2", metin: "Farklı türde/renkte/büyüklükte olan şekil, harf, rakam ve sözcükleri istenen özellik açısından gruplar." },
            ],
          },
          {
            kod: "1.1.4",
            metin: "Farklı türde/renkte/büyüklükte/konumda olan şekil, harf, rakam ve sözcüklerden oluşturulmuş örüntüyü tamamlar.",
            hedefDavranislar: [
              { kod: "1.1.4.1", metin: "Farklı türde/renkte/büyüklükte/konumda olan şekil, harf, rakam ve sözcüklerden oluşturulmuş örüntünün altına aynı örüntüyü oluşturur." },
              { kod: "1.1.4.2", metin: "Farklı türde/renkte/büyüklükte/konumda olan şekil, harf, rakam ve sözcüklerden oluşturulmuş örüntüyü aynı şekilde devam ettirir." },
              { kod: "1.1.4.3", metin: "Farklı türde/renkte/büyüklükte/konumda olan şekil, harf, rakam ve sözcüklerden oluşturulmuş örüntünün farklı bölümlerinde (baş-orta-son) eksik bırakılan ögeyi bulur." },
            ],
          },
          {
            kod: "1.1.5",
            metin: "Resim ve şeklin parça-bütün ilişkisini kurar.",
            hedefDavranislar: [
              { kod: "1.1.5.1", metin: "Bir resim ve şeklin eksik bırakılan parçasını bulur." },
              { kod: "1.1.5.2", metin: "Bir kısmı gösterilen nesne ve şekil resmindeki nesnenin ve şeklin adını söyler." },
              { kod: "1.1.5.3", metin: "Bir nesne ve şekil resminin parçalarını birleştirerek bütününü oluşturur." },
              { kod: "1.1.5.4", metin: "Bir resmin ve şeklin istendiğinde parçasına, istendiğinde bütününe bakar." },
            ],
          },
          {
            kod: "1.1.6",
            metin: "Resimleri, şekilleri, harfleri, sözcükleri zemininden ayırt eder.",
            hedefDavranislar: [
              { kod: "1.1.6.1", metin: "Çeşitli çizgiler, şekiller, resimler içerisine yerleştirilmiş resimleri, şekilleri, harfleri ve sözcükleri gösterir." },
              { kod: "1.1.6.2", metin: "Çeşitli çizgiler, şekiller, resimler içerisine yerleştirilmiş resimlerin, şekillerin, harflerin ve sözcüklerin üzerinden çizer." },
              { kod: "1.1.6.3", metin: "Çeşitli çizgiler, şekiller, resimler içerisine yerleştirilmiş resimler, şekiller, harfler ve sözcüklerden olanları aynı bulur." },
            ],
          },
          {
            kod: "1.1.7",
            metin: "Nesnelerin, harflerin ve sözcüklerin mekânsal konumlarını ve birbirlerine göre konumlarını ayırt eder.",
            hedefDavranislar: [
              { kod: "1.1.7.1", metin: "Noktalardan oluşan bir düzlem üzerinde çizilen çizgileri/şekilleri başka bir noktalı düzlem üzerine kopyalar." },
              { kod: "1.1.7.2", metin: "Harf, şekil ve boşluklardan oluşturulan bir dizide hangilerinin birbirlerine göre önce veya sonra olduğunu söyler." },
              { kod: "1.1.7.3", metin: "Harf, şekil ve boşluklardan oluşturulan bir hedef dizi ile aynı olan diziyi eşler." },
              { kod: "1.1.7.4", metin: "Harf, şekil ve boşluklardan oluşturulan bir diziyi yazarak kopyalar." },
            ],
          },
          {
            kod: "1.1.8",
            metin: "Gösterildikten sonra saklanan/kapatılan nesne, şekil, harf, rakam ve sözcükleri söyler.",
            hedefDavranislar: [
              { kod: "1.1.8.1", metin: "Kendisine gösterilen bir grup nesne, şekil, harf veya sözcükleri saklandıktan/kapatıldıktan sonra isimlerini söyler." },
              { kod: "1.1.8.2", metin: "Bir dizi hâlinde gösterilen nesne, şekil, harf, rakam ve sözcüğün saklandıktan/kapatıldıktan sonra sırasıyla isimlerini söyler." },
              { kod: "1.1.8.3", metin: "Nesne, şekil, harf veya rakamlarla oluşturulan diziyi saklandıktan/kapatıldıktan sonra aynı sırayla oluşturur." },
              { kod: "1.1.8.4", metin: "Kendisine gösterilen sonra saklanıp/kapatılan ve bir tanesi çıkarılarak tekrar gösterilen bir grup nesne, şekil, harf veya rakamdan eksik olanı söyler." },
              { kod: "1.1.8.5", metin: "Kendisine gösterilen bir deseni kapatıldıktan sonra aynı şekilde oluşturur." },
            ],
          },
        ],
      },
      {
        kod: "1.2",
        ad: "İşitsel Algı ve Bellek",
        saat: 35,
        hedefler: [
          {
            kod: "1.2.1",
            metin: "Sesleri ayırt eder.",
            hedefDavranislar: [
              { kod: "1.2.1.1", metin: "Dinletilen sesin adını söyler." },
              { kod: "1.2.1.2", metin: "Sesin geldiği yönü söyler." },
              { kod: "1.2.1.3", metin: "Dinletilen sesin özelliklerini söyler." },
              { kod: "1.2.1.4", metin: "Dinletilen 3-4 ses arasından farklı olan sesi söyler." },
              { kod: "1.2.1.5", metin: "Aynı anda dinletilen iki sesten baskın olanı söyler." },
            ],
          },
          {
            kod: "1.2.2",
            metin: "Söylenen rakam, sözcük dizisini ve cümleyi tekrar eder.",
            hedefDavranislar: [
              { kod: "1.2.2.1", metin: "Üç ve daha fazla rakamı söylenen sıra ile tekrar eder." },
              { kod: "1.2.2.2", metin: "Aynı kategoriye ait üç ve daha fazla sözcüğü söylenen sıra ile tekrar eder." },
              { kod: "1.2.2.3", metin: "Farklı kategoriye ait üç ve daha fazla sözcüğü söylenen sıra ile tekrar eder." },
              { kod: "1.2.2.4", metin: "Üç ve daha fazla anlamsız sözcüğü söylenen sıra ile tekrar eder." },
              { kod: "1.2.2.5", metin: "Söylenen en az üç sözcüklü cümleyi tekrar eder." },
              { kod: "1.2.2.6", metin: "Söylenen 10 sözcükten 6 sözcüğü söyler." },
              { kod: "1.2.2.7", metin: "Dinlediği rakam/sözcük dizisini ilgisiz başka bir görevden sonra, söylenen sıra ile tekrar eder." },
              { kod: "1.2.2.8", metin: "Dinlediği rakam dizisini sondan başa doğru söyler." },
              { kod: "1.2.2.9", metin: "Dinlediği sözcük dizisini sondan başa doğru söyler." },
              { kod: "1.2.2.10", metin: "Verilen ve belirli bir özellik açısından karşılaştırması istenen nesne çiftlerinin sonunda söylenen rakamları, nesne çiftleri söylendikten sonra duyduğu sıra ile söyler." },
            ],
          },
          {
            kod: "1.2.3",
            metin: "Yönergeleri söyleniş sırasına göre yerine getirir.",
            hedefDavranislar: [
              { kod: "1.2.3.1", metin: "Basit cümlelerle verilen iki ve daha fazla aşamalı yönergeyi söyleniş sırasına göre yerine getirir." },
              { kod: "1.2.3.2", metin: "Birleşik ve sıralı cümlelerle verilen iki ve daha fazla aşamalı yönergeyi söyleniş sırasına göre yerine getirir." },
            ],
          },
          {
            kod: "1.2.4",
            metin: "Dinlediği sesleri, sözcükleri ve konuşmaları ayırt eder.",
            hedefDavranislar: [
              { kod: "1.2.4.1", metin: "Seslerle oluşturulan örüntüyü tekrar eder." },
              { kod: "1.2.4.2", metin: "Hedef sözcüğü duyduğunda belirli davranışları yerine getirir." },
              { kod: "1.2.4.3", metin: "Dinlediği konuşmada/hikâyede bağlama/olay akışına uymayan bir konuşmayı ya da bilgileri söyler." },
              { kod: "1.2.4.4", metin: "Kendisine verilen sorulara yanıtları konuşmayı dinlerken ya da hikâyeyi dinlerken uygun bağlamda söyler." },
            ],
          },
          {
            kod: "1.2.5",
            metin: "Sözel zincir niteliğindeki bilgileri sıralar.",
            hedefDavranislar: [
              { kod: "1.2.5.1", metin: "Günleri sırasıyla söyler." },
              { kod: "1.2.5.2", metin: "Mevsimleri sırasıyla söyler." },
              { kod: "1.2.5.3", metin: "Ayları sırasıyla söyler." },
              { kod: "1.2.5.4", metin: "Sayıları sırasıyla söyler." },
              { kod: "1.2.5.5", metin: "Alfabeyi sırasıyla söyler." },
            ],
          },
        ],
      },
      {
        kod: "1.3",
        ad: "Dokunsal Algı ve Bellek",
        saat: 30,
        hedefler: [
          {
            kod: "1.3.1",
            metin: "Dokunduğu farklı boyut, şekil ve dokudaki nesneleri eşler.",
            hedefDavranislar: [
              { kod: "1.3.1.1", metin: "Nesneler arasından aynı olanları eşler." },
              { kod: "1.3.1.2", metin: "Nesneler arasından aynı boyutta olanları eşler." },
              { kod: "1.3.1.3", metin: "Nesneler arasından aynı şekilde olanları eşler." },
              { kod: "1.3.1.4", metin: "Nesneler arasından aynı doku özelliğinde olanları eşler." },
            ],
          },
          {
            kod: "1.3.2",
            metin: "Dokunduğu farklı boyut, şekil ve dokudaki nesneleri ayırt eder.",
            hedefDavranislar: [
              { kod: "1.3.2.1", metin: "Farklı nesneler arasından istenen nesneyi verir." },
              { kod: "1.3.2.2", metin: "Farklı boyuttaki nesneler arasından istenen boyuttaki nesneyi verir." },
              { kod: "1.3.2.3", metin: "Farklı şekildeki nesneler arasından istenen şekildeki nesneyi verir." },
              { kod: "1.3.2.4", metin: "Farklı doku özelliği bulunan nesneler arasından istenen doku özelliğine sahip nesneyi verir." },
            ],
          },
          {
            kod: "1.3.3",
            metin: "Dokunduğu nesneleri gruplar.",
            hedefDavranislar: [
              { kod: "1.3.3.1", metin: "Aynı olan nesneleri gruplandırır." },
              { kod: "1.3.3.2", metin: "Aynı boyutta olan nesneleri gruplandırır." },
              { kod: "1.3.3.3", metin: "Aynı şekilde olan nesneleri gruplandırır." },
              { kod: "1.3.3.4", metin: "Aynı doku özelliğinde olan nesneleri gruplandırır." },
            ],
          },
          {
            kod: "1.3.4",
            metin: "Dokunduğu farklı nesneleri dokunduğu sırayla söyler.",
            hedefDavranislar: [
              { kod: "1.3.4.1", metin: "İki farklı nesneyi dokunduğu sıra ile söyler." },
              { kod: "1.3.4.2", metin: "Üç farklı nesneyi dokunduğu sıra ile söyler." },
              { kod: "1.3.4.3", metin: "Dört farklı nesneyi dokunduğu sıra ile söyler." },
              { kod: "1.3.4.4", metin: "İki farklı nesneyi sondan başa doğru sıra ile söyler." },
              { kod: "1.3.4.5", metin: "Üç farklı nesneyi sondan başa doğru sıra ile söyler." },
              { kod: "1.3.4.6", metin: "Dört farklı nesneyi sondan başa doğru sıra ile söyler." },
            ],
          },
          {
            kod: "1.3.5",
            metin: "Vücudunun farklı bölümlerine çizilen şekilleri ayırt eder.",
            hedefDavranislar: [
              { kod: "1.3.5.1", metin: "Vücudunun herhangi bir bölgesine parmak veya kalem başı ile çizilen şeklin adını söyler." },
              { kod: "1.3.5.2", metin: "Vücudunun herhangi bir bölgesine parmak veya kalem başı ile çizilen şeklin aynısını çizer." },
            ],
          },
          {
            kod: "1.3.6",
            metin: "Dokunduğu nesnenin özelliklerini söyler.",
            hedefDavranislar: [
              { kod: "1.3.6.1", metin: "Dokunduğu nesnelerin özelliklerini söyler." },
              { kod: "1.3.6.2", metin: "Dokunduğu nesnelerin adını tahmin eder." },
            ],
          },
        ],
      },
      {
        kod: "1.4",
        ad: "Motor Planlama ve Duyusal Algı",
        saat: 30,
        hedefler: [
          {
            kod: "1.4.1",
            metin: "Gözleri açık ve kapalı iken vücudunun farkında olur.",
            hedefDavranislar: [
              { kod: "1.4.1.1", metin: "Gözleri açık iken vücut pozisyonunun farkında olur." },
              { kod: "1.4.1.2", metin: "Gözleri açık iken hareket ettirilen vücut bölümlerini söyler." },
              { kod: "1.4.1.3", metin: "Gözleri açık iken vücut hareketlerinin biçim ve yönünü söyler." },
              { kod: "1.4.1.4", metin: "Gözleri kapalı iken vücut pozisyonunun farkında olur." },
              { kod: "1.4.1.5", metin: "Gözleri kapalı iken hareket ettirilen vücut bölümlerini söyler." },
              { kod: "1.4.1.6", metin: "Gözleri kapalı iken vücut hareketlerinin biçim ve yönünü söyler." },
              { kod: "1.4.1.7", metin: "Değişik vücut bölümleri üzerine uygun kuvvet aktarır." },
            ],
          },
          {
            kod: "1.4.2",
            metin: "Farklı dokunsal uyarılara uygun tepki verir.",
            hedefDavranislar: [
              { kod: "1.4.2.1", metin: "Dokunsal uyarı uygulanan vücut bölümlerini gösterir/söyler." },
              { kod: "1.4.2.2", metin: "Farklı dokunsal uyarılar verildiğinde istenen vücut hareketlerini yapar." },
              { kod: "1.4.2.3", metin: "Dokunsal uyarı yardımıyla yaptırılan vücut hareketlerini söyler." },
            ],
          },
          {
            kod: "1.4.3",
            metin: "Mekânsal-uzamsal algıyı gerektiren etkinlikleri yerine getirir.",
            hedefDavranislar: [
              { kod: "1.4.3.1", metin: "Kendi bedeninde yönleri gösterir." },
              { kod: "1.4.3.2", metin: "Karşısındakinin bedeninde yönleri gösterir." },
              { kod: "1.4.3.3", metin: "Mekânda bulunan nesnelerin kendi bedenine göre konumlarını/yönlerini söyler." },
              { kod: "1.4.3.4", metin: "Mekânda bulunan iki nesnenin birbirlerine göre konumlarını/yönlerini söyler." },
              { kod: "1.4.3.5", metin: "Mekânda bulunan nesnelerden yakında/uzakta olanı söyler." },
              { kod: "1.4.3.6", metin: "İki nesnenin birbirlerine olan mesafesini tahmin ederek söyler." },
              { kod: "1.4.3.7", metin: "Farklı mesafelerdeki nesnenin boyutunu tahmin ederek söyler." },
              { kod: "1.4.3.8", metin: "Mekândaki nesnenin bedenine olan mesafesini tahmin ederek söyler." },
              { kod: "1.4.3.9", metin: "Mekânda bulunan nesnelerden başta/ortada/sonda olanı söyler." },
              { kod: "1.4.3.10", metin: "Mekânda gözleri kapalı bir şekilde istenen konuma gider." },
            ],
          },
          {
            kod: "1.4.4",
            metin: "Nesnelerle yapılan aktivitelerde bedenini koordineli şekilde hareket ettirir.",
            hedefDavranislar: [
              { kod: "1.4.4.1", metin: "Farklı doku, ağırlık ve boyuttaki nesneleri elle/ayakla hedefe atar." },
              { kod: "1.4.4.2", metin: "Kendisine atılan farklı doku, ağırlık ve boyuttaki nesneyi yakalar." },
              { kod: "1.4.4.3", metin: "Topu zıplatır." },
              { kod: "1.4.4.4", metin: "Sınırlandırılmış alanlar içinde farklı doku, ağırlık ve boyuttaki nesneleri ayağı ile sürer." },
              { kod: "1.4.4.5", metin: "Çift eliyle attığı farklı doku, ağırlık ve boyuttaki nesneyi çift eliyle yakalar." },
              { kod: "1.4.4.6", metin: "Tek eliyle attığı farklı doku, ağırlık ve boyuttaki nesneyi sektikten sonra çift yöndeki eliyle yakalar." },
            ],
          },
          {
            kod: "1.4.5",
            metin: "Farklı yüzeylerde ve aktiviteler sırasında dengesini korur.",
            hedefDavranislar: [
              { kod: "1.4.5.1", metin: "Engebeli, eğimli ve farklı yükseklikteki yüzeylerde dengesini korur." },
              { kod: "1.4.5.2", metin: "Farklı pozisyonlarda trambolin, yumuşak minder, yüksek denge aleti vb. araçlar üzerinde hareket eder." },
              { kod: "1.4.5.3", metin: "Farklı pozisyonlarda salıncakta sallanırken dengesini korur." },
              { kod: "1.4.5.4", metin: "Tek ayak üzerinde durur pozisyonunda gözler açık iken dengesini korur." },
              { kod: "1.4.5.5", metin: "Tek ayak üzerinde durur pozisyonunda gözler kapalı iken dengesini korur." },
              { kod: "1.4.5.6", metin: "Ardışık hareketler yaparken dengesini korur." },
            ],
          },
          {
            kod: "1.4.6",
            metin: "Motor taklit yapar.",
            hedefDavranislar: [
              { kod: "1.4.6.1", metin: "Çeşitli motor hareketleri taklit eder." },
              { kod: "1.4.6.2", metin: "Vücut hatlarıyla paralel taklit yapar." },
              { kod: "1.4.6.3", metin: "Orta hattı çaprazlama yapar." },
            ],
          },
          {
            kod: "1.4.7",
            metin: "El-göz koordinasyonu becerilerini gerçekleştirir.",
            hedefDavranislar: [
              { kod: "1.4.7.1", metin: "Küçük nesneleri bir araya getirmek, birbirinden ayırmak ve kaptan kaba aktarmak için çeşitli büyüklüklerdeki nesneleri kullanır." },
              { kod: "1.4.7.2", metin: "Yoğurma maddeleriyle istenen şekli oluşturur." },
              { kod: "1.4.7.3", metin: "Çeşitli nesnelerden yeni şekiller/modeller oluşturur." },
              { kod: "1.4.7.4", metin: "Kâğıdı yırtarak istenen şekli oluşturur." },
              { kod: "1.4.7.5", metin: "Kâğıdı katlayarak istenen şekli oluşturur." },
              { kod: "1.4.7.6", metin: "Kâğıtta verilen şekli makasla keser." },
            ],
          },
          {
            kod: "1.4.8",
            metin: "Günlük yaşam aktivitelerinde nesneleri büyüklüğüne, ağırlığına ve yapısına uygun şekilde tutar.",
            hedefDavranislar: [
              { kod: "1.4.8.1", metin: "Farklı şekil ve büyüklükteki nesneleri uygun pozisyonda tutar." },
              { kod: "1.4.8.2", metin: "Farklı şekil ve büyüklükteki nesneleri uygun pozisyonda istemli bırakır." },
              { kod: "1.4.8.3", metin: "Nesneleri yeterli kuvvetle tutar/bırakır." },
              { kod: "1.4.8.4", metin: "Nesneleri uygun şekilde tutar." },
              { kod: "1.4.8.5", metin: "Nesneleri uygun temas alanlarıyla tutar." },
              { kod: "1.4.8.6", metin: "Nesneleri, vücut düzgünlüğünü koruyarak tutar." },
              { kod: "1.4.8.7", metin: "Her iki eliyle birlikte büyük ve ağır bir nesneyi taşır." },
              { kod: "1.4.8.8", metin: "Tek eliyle farklı ağırlıktaki nesneleri taşır." },
            ],
          },
          {
            kod: "1.4.9",
            metin: "Kalemle basit çizimler yapar.",
            hedefDavranislar: [
              { kod: "1.4.9.1", metin: "Sınırlı alan boyar." },
              { kod: "1.4.9.2", metin: "Noktaların üzerinden giderek çizgileri birleştirir." },
              { kod: "1.4.9.3", metin: "Temel çizgileri çizer." },
              { kod: "1.4.9.4", metin: "Eksik resmi çizerek tamamlar." },
              { kod: "1.4.9.5", metin: "Geometrik şekilleri çizerek kopya eder." },
              { kod: "1.4.9.6", metin: "Nesnelerin/varlıkların resimlerini çizer." },
              { kod: "1.4.9.7", metin: "Nesneleri farklı konumlarda çizer." },
              { kod: "1.4.9.8", metin: "Cetvelle çeşitli çizimler yapar." },
              { kod: "1.4.9.9", metin: "Karmaşık labirentlerde yolu bularak çizer." },
            ],
          },
        ],
      },
      {
        kod: "1.5",
        ad: "Kendini Düzenleme/Yönetme",
        saat: 20,
        hedefler: [
          {
            kod: "1.5.1",
            metin: "Günlük yaşamını düzenler.",
            hedefDavranislar: [
              { kod: "1.5.1.1", metin: "Gün içinde yapacağı işleri/görevleri planlar." },
              { kod: "1.5.1.2", metin: "Gün içinde yapacağı işleri/görevleri önem sırasına göre sıralar." },
              { kod: "1.5.1.3", metin: "Gün içinde yapacağı işlerin/görevlerin saatini ve süresini belirler." },
              { kod: "1.5.1.4", metin: "Gün içinde yapacağı işleri/görevleri zamanında yapar." },
              { kod: "1.5.1.5", metin: "Başladığı işi/görevi tamamlar." },
              { kod: "1.5.1.6", metin: "İşlerini/görevlerini yerine getireceği ortamları düzenler." },
              { kod: "1.5.1.7", metin: "İşleri/görevleri için ihtiyacı olan materyalleri hazırlar." },
              { kod: "1.5.1.8", metin: "İşleri/görevleri engelleyen herhangi bir problemle karşılaştığında problem çözme aşamalarını kullanır." },
              { kod: "1.5.1.9", metin: "Gün içinde yapacağı işleri/görevleri işlem basamaklarına uygun yerine getirir." },
            ],
          },
          {
            kod: "1.5.2",
            metin: "Okul programına uyar.",
            hedefDavranislar: [
              { kod: "1.5.2.1", metin: "Okul ders programını izler." },
              { kod: "1.5.2.2", metin: "Çantasını okul ders programına uygun hazırlar." },
              { kod: "1.5.2.3", metin: "Okul içinde zaman planlamasına uyar." },
              { kod: "1.5.2.4", metin: "Çantasını, sırasını, okul dolabını düzenli tutar." },
            ],
          },
          {
            kod: "1.5.3",
            metin: "Ödevlerini yapar.",
            hedefDavranislar: [
              { kod: "1.5.3.1", metin: "Ödevini tam ve doğru alır." },
              { kod: "1.5.3.2", metin: "Yapacağı ödevler ile ilgili sıralama yapar." },
              { kod: "1.5.3.3", metin: "Ödevlerin işlem basamaklarını belirler." },
              { kod: "1.5.3.4", metin: "Ödeve başlama saatini belirler." },
              { kod: "1.5.3.5", metin: "Ödevin süresini belirler." },
              { kod: "1.5.3.6", metin: "Ödevlerini yapacağı ortamı düzenler." },
              { kod: "1.5.3.7", metin: "Ödevleri için ihtiyacı olan materyalleri hazırlar." },
              { kod: "1.5.3.8", metin: "Ödevlerini işlem basamaklarına uygun yerine getirir." },
              { kod: "1.5.3.9", metin: "Yapacağı ödevleri zamanında yapar." },
              { kod: "1.5.3.10", metin: "Ödevini tam yapar." },
              { kod: "1.5.3.11", metin: "Ödevini doğru yapar." },
              { kod: "1.5.3.12", metin: "Ödevini özenli yapar." },
              { kod: "1.5.3.13", metin: "Başladığı ödevi tamamlar." },
              { kod: "1.5.3.14", metin: "Ödevlerini yapmayı ya da tamamlamayı engelleyen ödevle ilgili bir problemle karşılaştığında problemi çözmek için başvuru kaynaklarını kullanır." },
              { kod: "1.5.3.15", metin: "Ödevlerini yapmayı ya da tamamlamayı engelleyen dışsal etmenlerle ilgili bir problemle karşılaştığında problemi çözer." },
              { kod: "1.5.3.16", metin: "Ödevini zamanında teslim eder." },
            ],
          },
          {
            kod: "1.5.4",
            metin: "Uygun çalışma becerilerini kullanır.",
            hedefDavranislar: [
              { kod: "1.5.4.1", metin: "Günlük ve haftalık çalışma planı hazırlar." },
              { kod: "1.5.4.2", metin: "Ders çalışma saatini ve süresini belirler." },
              { kod: "1.5.4.3", metin: "Her gün işlenen dersleri tekrar eder." },
              { kod: "1.5.4.4", metin: "İşlenecek derslerle ilgili ön hazırlık yapar." },
              { kod: "1.5.4.5", metin: "Sınava hazırlanmak için konuları tekrar eder." },
              { kod: "1.5.4.6", metin: "Ders dinlerken dikkatini sürdürür." },
              { kod: "1.5.4.7", metin: "Ders anlatılırken önemli uyarılara dikkatini verir." },
              { kod: "1.5.4.8", metin: "Ders anlatılan konuların önemli yerlerini not alır." },
              { kod: "1.5.4.9", metin: "Test çözme stratejilerini kullanır." },
              { kod: "1.5.4.10", metin: "Açık uçlu sorulara yazılı olarak cevap verme stratejilerini kullanır." },
            ],
          },
          {
            kod: "1.5.5",
            metin: "Başvuru kaynaklarını kullanır.",
            hedefDavranislar: [
              { kod: "1.5.5.1", metin: "Sözlük kullanır." },
              { kod: "1.5.5.2", metin: "Yazım kılavuzu kullanır." },
              { kod: "1.5.5.3", metin: "Atlas kullanır." },
              { kod: "1.5.5.4", metin: "Kaynağa erişmek amacı ile internet kullanır." },
              { kod: "1.5.5.5", metin: "Kaynak kitaplar kullanır." },
            ],
          },
        ],
      },
    ],
  },
  {
    no: 2,
    ad: "Dil ve İletişim",
    amac:
      "Öğrenme güçlüğü olan bireylerin sesletim, sözcük dağarcığı, dilin biçim, anlam ve kullanım ve iletişimin işlevlerine dair becerilerini geliştirmek amaçlanmaktadır.",
    saat: 150,
    bolumler: [
      {
        kod: "2.1",
        ad: "Sesletim",
        saat: 45,
        hedefler: [
          {
            kod: "2.1.1",
            metin: "Konuşmasında ünsüzleri doğru olarak sesletir.",
            hedefDavranislar: [
              { kod: "2.1.1.1", metin: "Kapantılı ünsüzleri sesletir." },
              { kod: "2.1.1.2", metin: "Açık ünsüzlerden dar ses yolunda oluşan ünsüzleri sesletir." },
              { kod: "2.1.1.3", metin: "Açık ünsüzlerden açık ses yolunda oluşan ünsüzleri sesletir." },
            ],
          },
        ],
      },
      {
        kod: "2.2",
        ad: "Sözcük Dağarcığı",
        saat: 45,
        hedefler: [
          {
            kod: "2.2.1",
            metin: "Sözcük dağarcığını geliştirir.",
            hedefDavranislar: [
              { kod: "2.2.1.1", metin: "Sık kullanılan sözcüklerle oluşturulan ifadelere uygun tepkiler verir." },
              { kod: "2.2.1.2", metin: "Sık kullanılan sözcükleri uygun bağlamlarda kullanır." },
              { kod: "2.2.1.3", metin: "Az kullanılan sözcüklerle oluşturulan ifadelere uygun tepkiler verir." },
              { kod: "2.2.1.4", metin: "Az kullanılan sözcükleri uygun bağlamlarda kullanır." },
              { kod: "2.2.1.5", metin: "Yan anlamlı sözcüklerin cümleye kattığı anlamı söyler." },
              { kod: "2.2.1.6", metin: "Yan anlamlı sözcüklerle cümle kurar." },
              { kod: "2.2.1.7", metin: "Yan anlamlı sözcüklerle oluşturulan ifadelere uygun tepkiler verir." },
              { kod: "2.2.1.8", metin: "Konuşmasında yan anlamlı sözcükleri doğru bağlamda kullanır." },
              { kod: "2.2.1.9", metin: "Mecaz anlamlı sözcüklerin cümleye kattığı anlamı söyler." },
              { kod: "2.2.1.10", metin: "Mecaz anlamlı sözcüklerle cümle kurar." },
              { kod: "2.2.1.11", metin: "Mecaz anlamlı sözcüklerle oluşturulan ifadelere uygun tepkiler verir." },
              { kod: "2.2.1.12", metin: "Konuşmasında mecaz anlamlı sözcükleri doğru bağlamda kullanır." },
              { kod: "2.2.1.13", metin: "Terimlerin anlamını söyler." },
              { kod: "2.2.1.14", metin: "Terimlerle cümle kurar." },
              { kod: "2.2.1.15", metin: "Terimlerle oluşturulan ifadelere uygun tepkiler verir." },
              { kod: "2.2.1.16", metin: "Konuşmasında terimleri doğru bağlamda kullanır." },
            ],
          },
          {
            kod: "2.2.2",
            metin: "Deyimler ve atasözlerini konuşma içinde kullanır.",
            hedefDavranislar: [
              { kod: "2.2.2.1", metin: "Deyimlerin anlamlarını açıklar." },
              { kod: "2.2.2.2", metin: "Deyimlerle cümle kurar." },
              { kod: "2.2.2.3", metin: "Deyim içeren ifadelere uygun tepkiler verir." },
              { kod: "2.2.2.4", metin: "Konuşmasında deyimleri uygun bağlamda kullanır." },
              { kod: "2.2.2.5", metin: "Atasözlerin anlamlarını açıklar." },
              { kod: "2.2.2.6", metin: "Atasözleri ile cümle kurar." },
              { kod: "2.2.2.7", metin: "Atasözlerini içeren ifadelere uygun tepkiler verir." },
              { kod: "2.2.2.8", metin: "Konuşmasında atasözlerini doğru bağlamda kullanır." },
            ],
          },
        ],
      },
      {
        kod: "2.3",
        ad: "Biçim, Anlam ve Kullanım",
        saat: 30,
        hedefler: [
          {
            kod: "2.3.1",
            metin: "Konuşmasında ekleri kullanır.",
            hedefDavranislar: [
              { kod: "2.3.1.1", metin: "İsim çekim eklerinin cümleye kattığı anlama göre uygun tepki verir." },
              { kod: "2.3.1.2", metin: "İsim çekim eklerini uygun şekilde kullanır." },
              { kod: "2.3.1.3", metin: "Fiil çekim eklerinin cümleye kattığı anlama göre uygun tepki verir." },
              { kod: "2.3.1.4", metin: "Fiil çekim eklerini uygun şekilde kullanır." },
            ],
          },
          {
            kod: "2.3.2",
            metin: "Çeşitli anlamda ve yapıda cümleleri bağlamına uygun kullanır.",
            hedefDavranislar: [
              { kod: "2.3.2.1", metin: "Olumsuzluk bildiren cümlelere uygun tepkiler verir." },
              { kod: "2.3.2.2", metin: "Olumsuzluk bildiren cümleleri bağlamına uygun olarak kullanır." },
              { kod: "2.3.2.3", metin: "Soru cümlelerine uygun tepkiler verir." },
              { kod: "2.3.2.4", metin: "Soru cümlelerini uygun bağlamda kullanır." },
              { kod: "2.3.2.5", metin: "Sıralı cümlelere uygun tepki verir." },
              { kod: "2.3.2.6", metin: "Sıralı cümle kurar." },
              { kod: "2.3.2.7", metin: "Bağlı cümlelere uygun tepki verir." },
              { kod: "2.3.2.8", metin: "Bağlı cümle kurar." },
            ],
          },
          {
            kod: "2.3.3",
            metin: "Konuşmalarını ve anlatılarını uygun sözcükler kullanarak, söz dizimine ve olay sıralamasına dikkat ederek ve uygun vurgu/tonlama/mimiklerle akıcı bir şekilde yapar.",
            hedefDavranislar: [
              { kod: "2.3.3.1", metin: "Konuşmalarında ve anlatılarında uygun sözcükler kullanır." },
              { kod: "2.3.3.2", metin: "Konuşmalarında ve anlatılarında söz dizimine uygun cümleler kurar." },
              { kod: "2.3.3.3", metin: "Bir olayı sırasıyla anlatır." },
              { kod: "2.3.3.4", metin: "Konuşmalarında ve anlatılarında uygun vurgu ve tonlama ve mimikleri kullanır." },
              { kod: "2.3.3.5", metin: "Konuşmalarını ve anlatılarını akıcı bir şekilde yapar." },
            ],
          },
        ],
      },
      {
        kod: "2.4",
        ad: "İletişimin İşlevleri",
        saat: 30,
        hedefler: [
          {
            kod: "2.4.1",
            metin: "Kendini ve kendi haklarını korumak, davranışlarını ve isteklerini haklı göstermek ve başkalarını eleştirmek için dili kullanır.",
            hedefDavranislar: [
              { kod: "2.4.1.1", metin: "Kendini korumak için dili kullanır." },
              { kod: "2.4.1.2", metin: "Kendi haklarını korumak için dili kullanır." },
              { kod: "2.4.1.3", metin: "Davranışlarını ve isteklerini haklı göstermek için dili kullanır." },
              { kod: "2.4.1.4", metin: "Başkalarını eleştirmek için dili kullanır." },
            ],
          },
          {
            kod: "2.4.2",
            metin: "Kendini ve başkalarının hareketlerini yönetmek ve onlarla iş birliği içinde çalışmak için dili kullanır.",
            hedefDavranislar: [
              { kod: "2.4.2.1", metin: "Kendi hareketlerini yönetmek için dili kullanır." },
              { kod: "2.4.2.2", metin: "Başkalarının hareketlerini yönetmek için dili kullanır." },
              { kod: "2.4.2.3", metin: "Başkaları ile iş birliği içinde çalışmak için dili kullanır." },
            ],
          },
          {
            kod: "2.4.3",
            metin: "Olayları, sırasını ve olayların detaylarını duygu ve deneyim katarak anlatır.",
            hedefDavranislar: [
              { kod: "2.4.3.1", metin: "Olayları anlatır." },
              { kod: "2.4.3.2", metin: "Olayları sırasına göre anlatır." },
              { kod: "2.4.3.3", metin: "Detaylar vererek olayları anlatır." },
              { kod: "2.4.3.4", metin: "Olayları deneyimlerini ve duygularını katarak anlatır." },
            ],
          },
          {
            kod: "2.4.4",
            metin: "Olayları, eylem ve olayların ayrıntılarını, bir dizi olay, problemlerin olası çözümlerini, birçok eylem biçimi arasından seçenekleri ve eylemlerin ya da olayların sonuçlarını tahmin eder.",
            hedefDavranislar: [
              { kod: "2.4.4.1", metin: "Olayları tahmin eder." },
              { kod: "2.4.4.2", metin: "Eylemlerin ve olayların ayrıntılarını tahmin eder." },
              { kod: "2.4.4.3", metin: "Bir dizi olayı tahmin eder." },
              { kod: "2.4.4.4", metin: "Problemleri ve olası çözümlerini tahmin eder." },
              { kod: "2.4.4.5", metin: "Birçok eylem biçimi arasından seçenekleri tahmin eder." },
              { kod: "2.4.4.6", metin: "Eylemlerin ya da olayların sonuçlarını tahmin eder." },
            ],
          },
          {
            kod: "2.4.5",
            metin: "Nedensel ve bağlantısal ilişkileri, sorunları ve bunların çözümlerini tanımlamak, düşünce ve eylemlerini haklı çıkarmak için mantık yürütür, ilkeleri tanımlamak için mantık yürütür.",
            hedefDavranislar: [
              { kod: "2.4.5.1", metin: "Nedensel ve bağlantısal ilişkileri tanımlamak için mantık yürütür." },
              { kod: "2.4.5.2", metin: "Sorunları ve bunların çözümlerini tanımlamak için mantık yürütür." },
              { kod: "2.4.5.3", metin: "Düşünce ve eylemlerini haklı çıkarmak için mantık yürütür." },
              { kod: "2.4.5.4", metin: "İlkeleri tanımlamak için mantık yürütür." },
            ],
          },
          {
            kod: "2.4.6",
            metin: "Başkalarının yaşantılarının, duygularının ve tepkilerinin içine kendini koyarak yansıtma yapar.",
            hedefDavranislar: [
              { kod: "2.4.6.1", metin: "Başkalarının yaşantılarının yerine kendini koyarak yansıtır." },
              { kod: "2.4.6.2", metin: "Başkalarının duygularının yerine kendini koyarak duygularını yansıtır." },
              { kod: "2.4.6.3", metin: "Başkalarının tepkilerinin yerine kendini koyarak tepkisini yansıtır." },
            ],
          },
        ],
      },
    ],
  },
  {
    no: 3,
    ad: "Okuma ve Yazma",
    amac:
      "Öğrenme güçlüğü olan bireylerin erken okuryazarlık, ilk okuma ve yazma, akıcı okuma ve okuduğunu anlama, dinlediğini anlama, yazılı anlatım, dil bilgisi becerilerinin desteklenmesi hedeflenmektedir.",
    saat: 300,
    bolumler: [
      {
        kod: "3.1",
        ad: "Erken Okuryazarlık",
        saat: 50,
        hedefler: [
          {
            kod: "3.1.1",
            metin: "Sözcüklerin ses özelliklerini ayırt eder.",
            hedefDavranislar: [
              { kod: "3.1.1.1", metin: "Söylenen sözcük çiftlerinin aynı/farklı olduğunu söyler." },
              { kod: "3.1.1.2", metin: "Söylenen sözcüklerin uyaklı olup olmadığını söyler." },
              { kod: "3.1.1.3", metin: "Söylenen sözcükler arasından uyaklı olanları söyler." },
              { kod: "3.1.1.4", metin: "Söylenen bir sözcükle uyaklı bir sözcük üretir." },
            ],
          },
          {
            kod: "3.1.2",
            metin: "Sözcüklerin hece özelliklerini ayırt eder.",
            hedefDavranislar: [
              { kod: "3.1.2.1", metin: "Söylenen sözcükleri hecelerine ayırır." },
              { kod: "3.1.2.2", metin: "Söylenen bir sözcüğün ilk hecesini söyler." },
              { kod: "3.1.2.3", metin: "Söylenen bir sözcüğün son hecesini söyler." },
            ],
          },
          {
            kod: "3.1.3",
            metin: "Sözcüklerin sesbirim özelliklerini ayırt eder.",
            hedefDavranislar: [
              { kod: "3.1.3.1", metin: "Söylenen iki sözcüğün aynı sesle başlayıp başlamadığını söyler." },
              { kod: "3.1.3.2", metin: "Söylenen iki sözcüğün aynı sesle bitip bitmediğini söyler." },
              { kod: "3.1.3.3", metin: "Söylenen üç sözcük arasından aynı sesle başlayan sözcükleri söyler." },
              { kod: "3.1.3.4", metin: "Söylenen sözcükler arasından aynı sesle biten sözcükleri söyler." },
              { kod: "3.1.3.5", metin: "Söylenen sözcükle aynı sesle başlayan bir sözcük söyler." },
              { kod: "3.1.3.6", metin: "Söylenen sözcüğün ilk sesini söyler." },
              { kod: "3.1.3.7", metin: "Söylenen sözcükle aynı sesle biten bir sözcük söyler." },
              { kod: "3.1.3.8", metin: "Söylenen sözcüğün son sesini söyler." },
              { kod: "3.1.3.9", metin: "Söylenen bir sözcüğün başına veya sonuna ses ekleyerek oluşturduğu yeni sözcüğü söyler." },
              { kod: "3.1.3.10", metin: "Söylenen bir sözcükteki bir sesi başka bir ses ile değiştirerek oluşturduğu yeni sözcüğü söyler." },
              { kod: "3.1.3.11", metin: "Söylenen sözcüğün ilk veya son sesini atarak oluşturduğu yeni sözcüğü söyler." },
              { kod: "3.1.3.12", metin: "Seslerine ayrılarak söylenen kısa bir sözcüğü söyler." },
              { kod: "3.1.3.13", metin: "Söylenen kısa bir sözcüğü seslerine ayırır." },
            ],
          },
          {
            kod: "3.1.4",
            metin: "Yazının özelliklerini ayırt eder.",
            hedefDavranislar: [
              { kod: "3.1.4.1", metin: "Yazının soldan sağa olan yönünü gösterir." },
              { kod: "3.1.4.2", metin: "Yazıdaki satırların aşağıya doğru akış yönünü gösterir." },
              { kod: "3.1.4.3", metin: "Yazılı olarak verilen ve 2-5 sözcük içeren bir cümledeki sözcük sayısını söyler." },
              { kod: "3.1.4.4", metin: "Harfleri, harf benzeri başka şekiller arasından gösterir." },
              { kod: "3.1.4.5", metin: "Yazılı olarak verilen ve 2-6 harf içeren bir sözcükteki harf sayısını söyler." },
              { kod: "3.1.4.6", metin: "Yazı içinde büyük bir harfi gösterir." },
              { kod: "3.1.4.7", metin: "Yazı içinde küçük bir harfi gösterir." },
              { kod: "3.1.4.8", metin: "Yazılı olarak verilen 2-4 cümle içeren kısa bir metnin içindeki cümle sayısını söyler." },
              { kod: "3.1.4.9", metin: "Yazı içinde temel noktalama işaretlerini gösterir." },
              { kod: "3.1.4.10", metin: "Yazılı olarak sunulan sözcükler arasından gösterilen bir sözcük ile aynı olan sözcüğü gösterir." },
              { kod: "3.1.4.11", metin: "Sözcük içinde harfleri gösterir." },
              { kod: "3.1.4.12", metin: "Söylenen sözcüğü farklı uzunluklardaki sözcüklerin yazılı hâli arasından gösterir." },
            ],
          },
          {
            kod: "3.1.5",
            metin: "Harflerin isimlerini ve seslerini söyler.",
            hedefDavranislar: [
              { kod: "3.1.5.1", metin: "Kendisine söylenen harfi dört büyük harf arasından gösterir." },
              { kod: "3.1.5.2", metin: "Kendisine söylenen harfi dört küçük harf arasından gösterir." },
              { kod: "3.1.5.3", metin: "Kendisine gösterilen büyük harfin adını söyler." },
              { kod: "3.1.5.4", metin: "Kendisine gösterilen küçük harfin adını söyler." },
              { kod: "3.1.5.5", metin: "Kendisine söylenen sesi dört büyük harf arasından gösterir." },
              { kod: "3.1.5.6", metin: "Kendisine söylenen sesi dört küçük harf arasından gösterir." },
              { kod: "3.1.5.7", metin: "Kendisine gösterilen büyük harfin sesini söyler." },
              { kod: "3.1.5.8", metin: "Kendisine gösterilen küçük harfin sesini söyler." },
            ],
          },
        ],
      },
      {
        kod: "3.2",
        ad: "İlk Okuma ve Yazma",
        saat: 70,
        hedefler: [
          {
            kod: "3.2.1",
            metin: "Tanıtılan sesi ayırt eder.",
            hedefDavranislar: [
              { kod: "3.2.1.1", metin: "Tanıtılan sesle başlayan sözcüklerin görsellerini gösterir." },
              { kod: "3.2.1.2", metin: "Tanıtılan sesle başlayan sözcüklerin görsellerini söyler." },
              { kod: "3.2.1.3", metin: "Tanıtılan sesle biten sözcüklerin görsellerini gösterir." },
              { kod: "3.2.1.4", metin: "Tanıtılan sesle biten sözcüklerin görsellerini söyler." },
            ],
          },
          {
            kod: "3.2.2",
            metin: "Tanıtılan sesi okur.",
            hedefDavranislar: [
              { kod: "3.2.2.1", metin: "Tanıtılan sesin küçük harfini okur." },
              { kod: "3.2.2.2", metin: "Tanıtılan sesin büyük harfini okur." },
            ],
          },
          {
            kod: "3.2.3",
            metin: "Tanıtılan sesi diğer harfler arasından gösterir.",
            hedefDavranislar: [
              { kod: "3.2.3.1", metin: "Tanıtılan sesin küçük harfini diğer sesler arasından gösterir." },
              { kod: "3.2.3.2", metin: "Tanıtılan sesin küçük harfini sözcükler içinde gösterir." },
              { kod: "3.2.3.3", metin: "Tanıtılan sesin büyük harfini diğer sesler arasından gösterir." },
              { kod: "3.2.3.4", metin: "Tanıtılan sesin büyük harfini sözcükler içinde gösterir." },
            ],
          },
          {
            kod: "3.2.4",
            metin: "Tanıtılan sesi dik temel harfle yazar.",
            hedefDavranislar: [
              { kod: "3.2.4.1", metin: "Tanıtılan sesin küçük harfini modele bakarak dik temel harfle yazar." },
              { kod: "3.2.4.2", metin: "Tanıtılan sesin büyük harfini modele bakarak dik temel harfle yazar." },
              { kod: "3.2.4.3", metin: "Tanıtılan sesi söylendiğinde yazar." },
            ],
          },
          {
            kod: "3.2.5",
            metin: "Tanıtılan sesi, hece ve sözcük içinde okur.",
            hedefDavranislar: [
              { kod: "3.2.5.1", metin: "Tanıtılan seslerden oluşturulan heceleri okur." },
              { kod: "3.2.5.2", metin: "Tanıtılan seslerden oluşan sözcükleri okur." },
              { kod: "3.2.5.3", metin: "Okuduğu sözcüklerin resimlerini gösterir." },
            ],
          },
          {
            kod: "3.2.6",
            metin: "Tanıtılan sesi, hece ve sözcük içinde dik temel harflerle yazar.",
            hedefDavranislar: [
              { kod: "3.2.6.1", metin: "Tanıtılan seslerden oluşturulan heceleri bakarak yazar." },
              { kod: "3.2.6.2", metin: "Tanıtılan seslerden oluşturulan heceleri söylendiğinde yazar." },
              { kod: "3.2.6.3", metin: "Tanıtılan seslerden oluşan sözcükleri bakarak yazar." },
              { kod: "3.2.6.4", metin: "Tanıtılan seslerden oluşan sözcükleri söylendiğinde yazar." },
            ],
          },
          {
            kod: "3.2.7",
            metin: "Sesi, cümle ve metin içinde okur.",
            hedefDavranislar: [
              { kod: "3.2.7.1", metin: "Tanıtılan seslerden oluşan cümleleri okur." },
              { kod: "3.2.7.2", metin: "Tanıtılan seslerden oluşan metinleri okur." },
            ],
          },
          {
            kod: "3.2.8",
            metin: "Sesi, cümle içinde dik temel harflerle yazar.",
            hedefDavranislar: [
              { kod: "3.2.8.1", metin: "Tanıtılan seslerden oluşan cümleleri bakarak yazar." },
              { kod: "3.2.8.2", metin: "Tanıtılan seslerden oluşan cümleleri söylendiğinde yazar." },
            ],
          },
          {
            kod: "3.2.9",
            metin: "Düzenli yazar.",
            hedefDavranislar: [
              { kod: "3.2.9.1", metin: "Satır takibi yaparak yazar." },
              { kod: "3.2.9.2", metin: "Sözcükler arasında uygun boşluk bırakarak yazar." },
              { kod: "3.2.9.3", metin: "Harfler arasında uygun boşluk bırakarak yazar." },
              { kod: "3.2.9.4", metin: "Cümleler arasında uygun boşluk bırakarak metin yazar." },
            ],
          },
          {
            kod: "3.2.10",
            metin: "Tanıtılan sesin bulunduğu cümle ve metin hakkında sorulan sorulara cevap verir.",
            hedefDavranislar: [
              { kod: "3.2.10.1", metin: "Tanıtılan seslerin bulunduğu cümleleri okuduktan sonra cümle ile ilgili basit sorulara cevap verir." },
              { kod: "3.2.10.2", metin: "Tanıtılan seslerin bulunduğu metinleri okuduktan sonra metinle ilgili basit sorulara cevap verir." },
            ],
          },
        ],
      },
      {
        kod: "3.3",
        ad: "Akıcı Okuma ve Okuduğunu Anlama",
        saat: 50,
        hedefler: [
          {
            kod: "3.3.1",
            metin: "Metni doğru ve akıcı olarak sesli okur.",
            hedefDavranislar: [
              { kod: "3.3.1.1", metin: "Heceleyerek okur." },
              { kod: "3.3.1.2", metin: "Metinde yer alan sözcükleri doğru okur." },
              { kod: "3.3.1.3", metin: "Akıcı okur." },
            ],
          },
          {
            kod: "3.3.2",
            metin: "Metin yapılarındaki ögeleri belirler.",
            hedefDavranislar: [
              { kod: "3.3.2.1", metin: "Kurgusal metin ana karakterini/karakterlerini belirler." },
              { kod: "3.3.2.2", metin: "Kurgusal metin yardımcı karakterlerini belirler." },
              { kod: "3.3.2.3", metin: "Kurgusal metindeki olayın geçtiği yeri belirler." },
              { kod: "3.3.2.4", metin: "Kurgusal metindeki olayın geçtiği zamanı belirler." },
              { kod: "3.3.2.5", metin: "Kurgusal metindeki olayları belirler." },
              { kod: "3.3.2.6", metin: "Bilgi veren metinde tanımlama yapılan bölümleri belirler." },
              { kod: "3.3.2.7", metin: "Bilgi veren metinde neden-sonuç ilişkisi bulunan bölümleri belirler." },
              { kod: "3.3.2.8", metin: "Bilgi veren metinde karşılaştırma yapılan bölümleri belirler." },
              { kod: "3.3.2.9", metin: "Bilgi veren metinde sıralama yapılan bölümleri belirler." },
              { kod: "3.3.2.10", metin: "Bilgi veren metinde problem-çözüm bölümlerini belirler." },
            ],
          },
          {
            kod: "3.3.3",
            metin: "Okuma öncesi metin anlama stratejilerini uygular.",
            hedefDavranislar: [
              { kod: "3.3.3.1", metin: "Okuma öncesinde okuma amacını belirler." },
              { kod: "3.3.3.2", metin: "Metindeki resimden yola çıkarak metnin içeriği hakkında tahminlerde bulunur." },
              { kod: "3.3.3.3", metin: "Metnin başlığından yola çıkarak metnin içeriği hakkında tahminlerde bulunur." },
            ],
          },
          {
            kod: "3.3.4",
            metin: "Okuma sırası metin anlama stratejilerini uygular.",
            hedefDavranislar: [
              { kod: "3.3.4.1", metin: "Metindeki önemli bilgileri önemsiz bilgilerden ayırır." },
              { kod: "3.3.4.2", metin: "Her bir paragraf okuduktan sonra sonraki paragraf içeriği hakkında tahminde bulunur." },
              { kod: "3.3.4.3", metin: "Anlamadığı kısımları okumasını yavaşlatarak tekrar okur." },
            ],
          },
          {
            kod: "3.3.5",
            metin: "Okuma sonrası metin anlama stratejilerini uygular.",
            hedefDavranislar: [
              { kod: "3.3.5.1", metin: "Metin hakkında tartışır." },
              { kod: "3.3.5.2", metin: "Kendi tahminleriyle metin içeriği arasında karşılaştırma yapar." },
              { kod: "3.3.5.3", metin: "Metin hakkında sorular üretir." },
              { kod: "3.3.5.4", metin: "Metni sözlü olarak anlatır." },
              { kod: "3.3.5.5", metin: "Metnin özetini yazar." },
            ],
          },
          {
            kod: "3.3.6",
            metin: "Okuduğunu anlamak için görselleri kullanır.",
            hedefDavranislar: [
              { kod: "3.3.6.1", metin: "Metindeki grafikleri kullanır." },
              { kod: "3.3.6.2", metin: "Metindeki tabloları kullanır." },
              { kod: "3.3.6.3", metin: "Metindeki şekilleri kullanır." },
            ],
          },
          {
            kod: "3.3.7",
            metin: "Metnin ana fikrini ve konusunu söyler.",
            hedefDavranislar: [
              { kod: "3.3.7.1", metin: "Metnin konusunu söyler." },
              { kod: "3.3.7.2", metin: "Ana fikri destekleyen yardımcı fikirleri söyler." },
              { kod: "3.3.7.3", metin: "Metnin ana fikrini söyler." },
            ],
          },
          {
            kod: "3.3.8",
            metin: "Metinde yeni öğrendiği sözcük ve sözcük gruplarını anlamına uygun olarak kullanır.",
            hedefDavranislar: [
              { kod: "3.3.8.1", metin: "Anlamını bilmediği sözcükleri işaretler." },
              { kod: "3.3.8.2", metin: "Anlamını bilmediği sözcüklerin/sözcük gruplarının anlamlarını görsellerden hareketle tahmin eder." },
              { kod: "3.3.8.3", metin: "Anlamını bilmediği sözcüklerin/sözcük gruplarının anlamlarını ilgili paragraftan yola çıkarak tahmin eder." },
              { kod: "3.3.8.4", metin: "Anlamını bilmediği sözcüklerin/sözcük gruplarının anlamını sözlükten bulur." },
              { kod: "3.3.8.5", metin: "Yeni öğrendiği sözcükleri/sözcük gruplarını anlamına uygun olarak kullanır." },
            ],
          },
        ],
      },
      {
        kod: "3.4",
        ad: "Dinlediğini Anlama",
        saat: 30,
        hedefler: [
          {
            kod: "3.4.1",
            metin: "Dinleme kurallarına uyar.",
            hedefDavranislar: [
              { kod: "3.4.1.1", metin: "Dinleme sırasında konuşan kişiyi sessizce dinler." },
              { kod: "3.4.1.2", metin: "Dinleme sırasında konuşan kişi ile göz teması kurar." },
              { kod: "3.4.1.3", metin: "Konuşan kişinin söylediklerine dikkatini verir." },
              { kod: "3.4.1.4", metin: "Konuşan kişinin söylediklerine dikkatini sürdürür." },
            ],
          },
          {
            kod: "3.4.2",
            metin: "Betimlenen nesneyi, nesne resmini, eylem ve olay resmini gösterir.",
            hedefDavranislar: [
              { kod: "3.4.2.1", metin: "Betimlenen nesneyi gösterir." },
              { kod: "3.4.2.2", metin: "Betimlenen nesne resmini gösterir." },
              { kod: "3.4.2.3", metin: "Betimlenen eylem resmini gösterir." },
              { kod: "3.4.2.4", metin: "Betimlenen olay resmini gösterir." },
            ],
          },
          {
            kod: "3.4.3",
            metin: "Günlük rutin içinde verilen yönergeleri yerine getirir.",
            hedefDavranislar: [
              { kod: "3.4.3.1", metin: "Günlük rutin içinde kendisine verilen yönergeleri sıra ile yerine getirir." },
              { kod: "3.4.3.2", metin: "Günlük rutin içinde gruba verilen yönergeleri yerine getirir." },
            ],
          },
          {
            kod: "3.4.4",
            metin: "Dinleme ve takip becerileri gerektiren yönergeleri söylendiği sıra ile yerine getirir.",
            hedefDavranislar: [
              { kod: "3.4.4.1", metin: "Kaba motor becerileri içeren yönergeleri söylendiği sıra ile yerine getirir." },
              { kod: "3.4.4.2", metin: "Çizim becerileri içeren yönergeleri söylendiği sıra ile yerine getirir." },
            ],
          },
          {
            kod: "3.4.5",
            metin: "Resimleri gösterilen çeşitli türde anlatıları dinledikten sonra anlatır.",
            hedefDavranislar: [
              { kod: "3.4.5.1", metin: "Kurgusal türde anlatıları dinledikten sonra anlatır." },
              { kod: "3.4.5.2", metin: "Bilgi veren türde anlatıları dinledikten sonra anlatır." },
            ],
          },
          {
            kod: "3.4.6",
            metin: "Resimleri gösterilen çeşitli türde anlatıları dinledikten sonra ilgili sorulara cevap verir.",
            hedefDavranislar: [
              { kod: "3.4.6.1", metin: "Kurgusal türde anlatıları dinledikten sonra ilgili sorulara cevap verir." },
              { kod: "3.4.6.2", metin: "Bilgi veren türde anlatıları dinledikten sonra ilgili sorulara cevap verir." },
            ],
          },
          {
            kod: "3.4.7",
            metin: "Dinlediği cümle ve metinler arasındaki farkları söyler.",
            hedefDavranislar: [
              { kod: "3.4.7.1", metin: "Dinlediği iki cümle arasındaki farkları söyler." },
              { kod: "3.4.7.2", metin: "Dinlediği 3-4 cümlelik iki kısa metin arasındaki farkları söyler." },
            ],
          },
          {
            kod: "3.4.8",
            metin: "Dinleme öncesi stratejileri kullanır.",
            hedefDavranislar: [
              { kod: "3.4.8.1", metin: "Dinleme amacını belirler." },
              { kod: "3.4.8.2", metin: "Görsellerden hareketle dinleyeceği metin hakkında tahminde bulunur." },
              { kod: "3.4.8.3", metin: "Başlıktan hareketle dinleyeceği metin hakkında tahminde bulunur." },
            ],
          },
          {
            kod: "3.4.9",
            metin: "Dinleme sırası stratejileri kullanır.",
            hedefDavranislar: [
              { kod: "3.4.9.1", metin: "Konuşan kişinin sözlü olmayan mesajlarına uygun tepki verir." },
              { kod: "3.4.9.2", metin: "Sunulan bilginin yapısına yönelik ipuçlarını takip ederek vurgulanan bilgi birimlerini söyler." },
              { kod: "3.4.9.3", metin: "Sözel vurgulara dikkat ederek vurgulanan bilgilere yönelik sorulara cevap verir." },
              { kod: "3.4.9.4", metin: "Dinlediklerinden yola çıkarak olayların gelişimi hakkında tahminde bulunur." },
              { kod: "3.4.9.5", metin: "Dinlediklerinden yola çıkarak olayların sonucu hakkında tahminde bulunur." },
              { kod: "3.4.9.6", metin: "Dinlediği anlatılarda bilmediği sözcüklerin anlamını tahmin eder." },
              { kod: "3.4.9.7", metin: "Dinlediği anlatının ana hatlarını not alır." },
            ],
          },
          {
            kod: "3.4.10",
            metin: "Dinleme sonrası stratejileri kullanır.",
            hedefDavranislar: [
              { kod: "3.4.10.1", metin: "Dinlediği anlatının konusunu söyler." },
              { kod: "3.4.10.2", metin: "Dinledikleriyle ilgili görüşlerini söyler." },
              { kod: "3.4.10.3", metin: "Dinlediklerinin özetini anlatır." },
            ],
          },
        ],
      },
      {
        kod: "3.5",
        ad: "Yazılı Anlatım",
        saat: 50,
        hedefler: [
          {
            kod: "3.5.1",
            metin: "Cümle oluşturarak yazar.",
            hedefDavranislar: [
              { kod: "3.5.1.1", metin: "Verilen görsele uygun cümle yazar." },
              { kod: "3.5.1.2", metin: "Verilen sözcüklerden kurallı ve anlamlı cümle oluşturarak yazar." },
              { kod: "3.5.1.3", metin: "Hatalı verilen cümleyi kurallı ve anlamlı olacak şekilde düzelterek yazar." },
              { kod: "3.5.1.4", metin: "Eksik bırakılan cümleyi kurallı ve anlamlı olacak şekilde tamamlayarak yazar." },
            ],
          },
          {
            kod: "3.5.2",
            metin: "Görsellerden yararlanarak anlamlı kurallı cümleler yazar.",
            hedefDavranislar: [
              { kod: "3.5.2.1", metin: "Bir olay içeren resimli kart verildiğinde olayı anlatan basit kurallı cümleler yazar." },
              { kod: "3.5.2.2", metin: "Belli bir uygulama sırasını takip eden etkinlikleri anlatan resimli kartlar verildiğinde her bir kartı anlatan bir veya daha fazla cümle yazar." },
              { kod: "3.5.2.3", metin: "Basit tek olaylı bir öykü içeren resimli kart verildiğinde bir kartı anlatan bir ya da iki cümle yazar." },
              { kod: "3.5.2.4", metin: "Bir yer/varlık vb. resimde verilen yer/varlık vb. özelliklerini basit cümlelerle yazar." },
              { kod: "3.5.2.5", metin: "Sıralı olarak verilen resimli kartlar verildiğinde her bir kartı anlatan bir ya da iki cümle yazar." },
              { kod: "3.5.2.6", metin: "Problem çözüm ve sonucunu anlatan resimli kartlar verildiğinde, her bir kartı anlatan bir ya da iki cümle yazar." },
            ],
          },
          {
            kod: "3.5.3",
            metin: "Metni yazma öncesi planlar.",
            hedefDavranislar: [
              { kod: "3.5.3.1", metin: "Konu seçer." },
              { kod: "3.5.3.2", metin: "Yazma amacını belirler." },
              { kod: "3.5.3.3", metin: "Okuyucu kitlesini belirler." },
            ],
          },
          {
            kod: "3.5.4",
            metin: "Yazacağı metinle ilgili taslak oluşturur.",
            hedefDavranislar: [
              { kod: "3.5.4.1", metin: "Yazacağı fikirleri belirler." },
              { kod: "3.5.4.2", metin: "Fikirleri, yazacağı metin yapısına göre gruplar." },
            ],
          },
          {
            kod: "3.5.5",
            metin: "Metni yazar.",
            hedefDavranislar: [
              { kod: "3.5.5.1", metin: "Taslağına bakarak fikirleri sıralar." },
              { kod: "3.5.5.2", metin: "Olayı başlatır, geliştirir ve sonlandırır." },
              { kod: "3.5.5.3", metin: "Metindeki tutarlılığı sağlamak için giriş, geçiş ve bağlantı ifadeleri kullanır." },
              { kod: "3.5.5.4", metin: "Söz dizimine uygun cümleler yazar." },
              { kod: "3.5.5.5", metin: "Metin yapısında bulunan ögelere uygun olarak yazar." },
              { kod: "3.5.5.6", metin: "Metne konuyla ilgili başlık yazar." },
            ],
          },
          {
            kod: "3.5.6",
            metin: "Yazdığı metni düzeltir.",
            hedefDavranislar: [
              { kod: "3.5.6.1", metin: "Metne eksik fikirleri ekler." },
              { kod: "3.5.6.2", metin: "Metinde tutarlılığı bozan fikirleri çıkarır." },
              { kod: "3.5.6.3", metin: "Metindeki tutarlılığı bozan fikirlerin yerini değiştirir." },
              { kod: "3.5.6.4", metin: "Yazım hatalarını bulur." },
              { kod: "3.5.6.5", metin: "Yazım hatalarını düzeltir." },
            ],
          },
          {
            kod: "3.5.7",
            metin: "Yazdığı metni paylaşır.",
            hedefDavranislar: [
              { kod: "3.5.7.1", metin: "Hedeflediği okuyucu kitlesine metni okur." },
              { kod: "3.5.7.2", metin: "Yazma amacına uygun metni paylaşır." },
            ],
          },
          {
            kod: "3.5.8",
            metin: "Çeşitli türde metinler yazar.",
            hedefDavranislar: [
              { kod: "3.5.8.1", metin: "Kurgusal metinler yazar." },
              { kod: "3.5.8.2", metin: "Bilgi veren metinler yazar." },
            ],
          },
        ],
      },
      {
        kod: "3.6",
        ad: "Dil Bilgisi",
        saat: 50,
        hedefler: [
          {
            kod: "3.6.1",
            metin: "Harfleri ve harflerin ses bilgisel özelliklerini ayırt eder.",
            hedefDavranislar: [
              { kod: "3.6.1.1", metin: "Sözcükteki harf sayısını söyler." },
              { kod: "3.6.1.2", metin: "Alfabedeki harfleri sırası ile söyler." },
              { kod: "3.6.1.3", metin: "Verilen sözcükleri alfabetik sıraya göre sıralar." },
              { kod: "3.6.1.4", metin: "Harflerin ünlü ve ünsüz harflerden oluştuğunu söyler." },
              { kod: "3.6.1.5", metin: "Ünlü harfleri söyler." },
              { kod: "3.6.1.6", metin: "Ünsüz harfleri söyler." },
              { kod: "3.6.1.7", metin: "Ünlü harfleri kalın ve ince ünlü olarak sınıflandırır." },
              { kod: "3.6.1.8", metin: "Kalın ünlüleri söyler." },
              { kod: "3.6.1.9", metin: "İnce ünlüleri söyler." },
              { kod: "3.6.1.10", metin: "Ünsüz harfleri sert ünsüzler ve yumuşak ünsüzler olarak sınıflandırır." },
              { kod: "3.6.1.11", metin: "Sert ünsüzleri söyler." },
              { kod: "3.6.1.12", metin: "Yumuşak ünsüzleri söyler." },
              { kod: "3.6.1.13", metin: "Verilen sözcük ikililerinden doğru yazılmış sözcükleri belirler." },
            ],
          },
          {
            kod: "3.6.2",
            metin: "Ünlü uyumlarını ayırt eder.",
            hedefDavranislar: [
              { kod: "3.6.2.1", metin: "Sözcükteki ünlü uyumu çeşitlerinin büyük ünlü ve küçük ünlü uyumu olduğunu söyler." },
              { kod: "3.6.2.2", metin: "Büyük ünlü uyumunun özelliklerini söyler." },
              { kod: "3.6.2.3", metin: "Cümle içindeki büyük ünlü uyumuna uygun sözcükleri gösterir." },
              { kod: "3.6.2.4", metin: "Büyük ünlü uyumuna uygun sözcüklere örnek verir." },
              { kod: "3.6.2.5", metin: "Küçük ünlü uyumunun özelliklerini söyler." },
              { kod: "3.6.2.6", metin: "Cümle içindeki küçük ünlü uyumuna uygun sözcükleri gösterir." },
              { kod: "3.6.2.7", metin: "Küçük ünlü uyumuna uygun sözcüklere örnek verir." },
            ],
          },
          {
            kod: "3.6.3",
            metin: "Ses olaylarını ayırt eder.",
            hedefDavranislar: [
              { kod: "3.6.3.1", metin: "Ses olaylarını sınıflandırır." },
              { kod: "3.6.3.2", metin: "İstenen ses olaylarının özelliklerini söyler." },
              { kod: "3.6.3.3", metin: "İstenen ses olayını cümle içerisinde gösterir." },
              { kod: "3.6.3.4", metin: "Cümle içerisinde gösterilen ses olayını söyler." },
            ],
          },
          {
            kod: "3.6.4",
            metin: "Hece özelliklerini ayırt eder.",
            hedefDavranislar: [
              { kod: "3.6.4.1", metin: "Verilen bir sözcüğü hecelerine ayırarak yazar." },
              { kod: "3.6.4.2", metin: "Verilen bir sözcükteki hece sayısını söyler." },
              { kod: "3.6.4.3", metin: "Bir, iki, üç, dört harfli hecelere örnekler verir." },
            ],
          },
          {
            kod: "3.6.5",
            metin: "Cümledeki sözcük türlerini ayırt eder.",
            hedefDavranislar: [
              { kod: "3.6.5.1", metin: "İstenen sözcük türlerini tanımlar." },
              { kod: "3.6.5.2", metin: "İstenen sözcük türünü cümle içerisinde gösterir." },
              { kod: "3.6.5.3", metin: "İstenen sözcük türünü cümle içinde kullanarak yazar." },
              { kod: "3.6.5.4", metin: "Cümledeki boşlukları uygun sözcük türü ile doldurur." },
              { kod: "3.6.5.5", metin: "Sözcük türlerini sınıflandırır." },
            ],
          },
          {
            kod: "3.6.6",
            metin: "Sözcüklerdeki ekleri ayırt eder.",
            hedefDavranislar: [
              { kod: "3.6.6.1", metin: "Ekleri çekim ve yapım ekleri olarak sınıflandırır." },
              { kod: "3.6.6.2", metin: "Çekim eklerini söyler." },
              { kod: "3.6.6.3", metin: "Çekim eklerinin sözcükteki işlevini söyler." },
              { kod: "3.6.6.4", metin: "Çekim eklerini sözcük içerisinde gösterir." },
              { kod: "3.6.6.5", metin: "Çekim eklerini kullanarak sözcük üretir." },
              { kod: "3.6.6.6", metin: "Cümledeki sözcükleri uygun çekim ekleriyle tamamlar." },
              { kod: "3.6.6.7", metin: "Çekim eklerini yazılı anlatımda uygun şekilde kullanır." },
              { kod: "3.6.6.8", metin: "Yapım eklerini söyler." },
              { kod: "3.6.6.9", metin: "Yapım eklerinin sözcükteki işlevini söyler." },
              { kod: "3.6.6.10", metin: "Yapım eklerini sözcük içerisinde gösterir." },
              { kod: "3.6.6.11", metin: "Yapım eklerini kullanarak sözcük üretir." },
              { kod: "3.6.6.12", metin: "Cümledeki sözcükleri uygun yapım ekleriyle tamamlar." },
              { kod: "3.6.6.13", metin: "Yapım eklerini yazılı anlatımda uygun şekilde kullanır." },
            ],
          },
          {
            kod: "3.6.7",
            metin: "Sözcükleri yapısına göre ayırt eder.",
            hedefDavranislar: [
              { kod: "3.6.7.1", metin: "Sözcükleri yapısına göre sınıflar." },
              { kod: "3.6.7.2", metin: "Sözcükleri yapısına göre tanımlar." },
              { kod: "3.6.7.3", metin: "Verilen cümlede istenen yapıdaki sözcüğü gösterir." },
              { kod: "3.6.7.4", metin: "Verilen sözcüğün yapısını söyler." },
              { kod: "3.6.7.5", metin: "İstenen yapısına uygun sözcük örnekleri verir." },
            ],
          },
          {
            kod: "3.6.8",
            metin: "Sözcükleri anlam bakımından ayırt eder.",
            hedefDavranislar: [
              { kod: "3.6.8.1", metin: "Sözcükleri anlam özelliklerine göre sınıflar." },
              { kod: "3.6.8.2", metin: "Sözcükler arası anlam ilişkileri bakımından sözcük türlerini söyler." },
              { kod: "3.6.8.3", metin: "Söz öbeklerinin türlerini söyler." },
              { kod: "3.6.8.4", metin: "Cümle içerisinde gösterilen sözcüklerin taşıdığı anlam özelliğini söyler." },
              { kod: "3.6.8.5", metin: "Cümle içerisinde gösterilen sözcüklerin taşıdığı anlam ilişkisini söyler." },
              { kod: "3.6.8.6", metin: "Cümle içerisinde gösterilen söz öbeğinin türünü söyler." },
              { kod: "3.6.8.7", metin: "İstenen anlam özelliklerini taşıyan sözcükleri cümle içerisinde kullanır." },
              { kod: "3.6.8.8", metin: "İstenen anlam ilişkilerini taşıyan sözcükleri cümle içerisinde gösterir." },
              { kod: "3.6.8.9", metin: "İstenen söz öbeklerini cümle içerisinde gösterir." },
              { kod: "3.6.8.10", metin: "Mecaz anlamda verilen sözcüğün anlamını söyler." },
              { kod: "3.6.8.11", metin: "Verilen söz öbeklerinin anlamını söyler." },
            ],
          },
          {
            kod: "3.6.9",
            metin: "Cümlenin ögelerini ayırt eder.",
            hedefDavranislar: [
              { kod: "3.6.9.1", metin: "Cümlenin ögelerini temel ögeler ve yardımcı ögeler olarak sınıflandırır." },
              { kod: "3.6.9.2", metin: "Cümlenin temel ögelerini söyler." },
              { kod: "3.6.9.3", metin: "Cümlenin yardımcı ögelerini söyler." },
              { kod: "3.6.9.4", metin: "Cümlenin temel ögelerini tanımlar." },
              { kod: "3.6.9.5", metin: "Cümlenin yardımcı ögelerini tanımlar." },
              { kod: "3.6.9.6", metin: "İstenen temel ögeyi cümle içerisinde gösterir." },
              { kod: "3.6.9.7", metin: "İstenen yardımcı ögeyi cümle içerisinde gösterir." },
              { kod: "3.6.9.8", metin: "Verilen yardımcı ögeyi kullanarak cümle kurar." },
              { kod: "3.6.9.9", metin: "Cümleyi ögelerine ayırır." },
            ],
          },
          {
            kod: "3.6.10",
            metin: "Cümle çeşitlerini ayırt eder.",
            hedefDavranislar: [
              { kod: "3.6.10.1", metin: "Cümle çeşitlerini sınıflandırır." },
              { kod: "3.6.10.2", metin: "Yüklemin türüne göre cümle çeşitlerini söyler." },
              { kod: "3.6.10.3", metin: "Yüklemin yerine göre cümle çeşitlerini söyler." },
              { kod: "3.6.10.4", metin: "Anlamlarına göre cümle çeşitlerini söyler." },
              { kod: "3.6.10.5", metin: "Yapısına göre cümle çeşitlerini söyler." },
              { kod: "3.6.10.6", metin: "Cümle çeşitlerinin özelliklerini tanımlar." },
              { kod: "3.6.10.7", metin: "Verilen cümlenin yüklemin türüne göre cümle türünü söyler." },
              { kod: "3.6.10.8", metin: "Verilen cümlenin yüklemin yerine göre cümle türünü söyler." },
              { kod: "3.6.10.9", metin: "Verilen cümlenin anlamına göre cümle türünü söyler." },
              { kod: "3.6.10.10", metin: "Verilen cümlenin yapısına göre cümle türünü söyler." },
              { kod: "3.6.10.11", metin: "İstenen cümle türüne uygun cümle oluşturur." },
            ],
          },
          {
            kod: "3.6.11",
            metin: "Yazılarında yazım kurallarına uyar.",
            hedefDavranislar: [
              { kod: "3.6.11.1", metin: "Büyük harfleri yazım kurallarına uygun yazar." },
              { kod: "3.6.11.2", metin: "Sayıları yazım kurallarına uygun yazar." },
              { kod: "3.6.11.3", metin: "Birleşik sözcükleri yazım kurallarına uygun yazar." },
              { kod: "3.6.11.4", metin: "Kısaltmaları yazım kurallarına uygun yazar." },
              { kod: "3.6.11.5", metin: "“de, ki, ne..ne” bağlaçlarını yazım kurallarına uygun yazar." },
              { kod: "3.6.11.6", metin: "“mi” soru edatını yazım kurallarına uygun yazar." },
              { kod: "3.6.11.7", metin: "İkileme ve pekiştirme sözcüklerini yazım kurallarına uygun yazar." },
            ],
          },
          {
            kod: "3.6.12",
            metin: "Yazılarında noktalama işaretlerine uyar.",
            hedefDavranislar: [
              { kod: "3.6.12.1", metin: "Noktalama işaretlerini sıralar." },
              { kod: "3.6.12.2", metin: "Noktalama işaretlerinin işlevini söyler." },
              { kod: "3.6.12.3", metin: "Verilen metinde boş bırakılan yerleri uygun noktalama işaretleri ile tamamlar." },
              { kod: "3.6.12.4", metin: "Metin yazarken uygun noktalama işaretlerini kullanır." },
            ],
          },
        ],
      },
    ],
  },
  {
    no: 4,
    ad: "Erken Matematik",
    amac:
      "Erken Matematik Modülü ile öğrenme güçlüğü olan bireylerin okul öncesi dönemde matematiğin en temel becerilerini öğrenmelerini sağlamak, ilköğretime hazır bulunuşluk düzeylerini artırmak ve ileri matematik becerilerinde başarılı olmalarını sağlamak amaçlanmaktadır.",
    saat: 200,
    bolumler: [
      {
        kod: "4.1",
        ad: "Nesne Nitelikleri ve Ölçmeye Hazırlık",
        saat: 30,
        hedefler: [
          {
            kod: "4.1.1",
            metin: "Nesneleri/nesne resimlerini ölçülebilir özelliklerine göre eşler.",
            hedefDavranislar: [
              { kod: "4.1.1.1", metin: "Aynı miktarda olan çoklukları eşler." },
              { kod: "4.1.1.2", metin: "Aynı büyüklükte olan nesneleri/nesne resimlerini eşler." },
              { kod: "4.1.1.3", metin: "Aynı uzunlukta olan nesneleri/nesne resimlerini eşler." },
              { kod: "4.1.1.4", metin: "Aynı kalınlıkta olan nesneleri/nesne resimlerini eşler." },
              { kod: "4.1.1.5", metin: "Aynı genişlikte olan nesneleri/nesne resimlerini eşler." },
              { kod: "4.1.1.6", metin: "Aynı ağırlıkta olan nesneleri eşler." },
            ],
          },
          {
            kod: "4.1.2",
            metin: "Nesneleri/nesne resimlerini ölçülebilir özelliklerine göre gruplandırır.",
            hedefDavranislar: [
              { kod: "4.1.2.1", metin: "Çoklukları miktarına göre gruplandırır." },
              { kod: "4.1.2.2", metin: "Nesneleri/nesne resimlerini büyüklüklerine göre gruplandırır." },
              { kod: "4.1.2.3", metin: "Nesneleri/nesne resimlerini uzunluklarına göre gruplandırır." },
            ],
          },
          {
            kod: "4.1.3",
            metin: "Nesneleri/nesne resimlerini ölçülebilir özelliklerine göre karşılaştırır.",
            hedefDavranislar: [
              { kod: "4.1.3.1", metin: "İki çokluk arasından az olanı söyler." },
              { kod: "4.1.3.2", metin: "İki çokluk arasından çok olanı söyler." },
              { kod: "4.1.3.3", metin: "İki nesne/nesne resmi arasından büyük olanı söyler." },
              { kod: "4.1.3.4", metin: "İki nesne/nesne resmi arasından küçük olanı söyler." },
              { kod: "4.1.3.5", metin: "İki nesne/nesne resmi arasından uzun olanı söyler." },
              { kod: "4.1.3.6", metin: "İki nesne/nesne resmi arasından kısa olanı söyler." },
              { kod: "4.1.3.7", metin: "İki nesne/nesne resmi arasından kalın olanı söyler." },
              { kod: "4.1.3.8", metin: "İki nesne/nesne resmi arasından ince olanı söyler." },
              { kod: "4.1.3.9", metin: "İki nesne/nesne resmi arasından geniş olanı söyler." },
              { kod: "4.1.3.10", metin: "İki nesne/nesne resmi arasından dar olanı söyler." },
              { kod: "4.1.3.11", metin: "İki nesne/nesne resmi arasından ağır olanı söyler." },
              { kod: "4.1.3.12", metin: "İki nesne/nesne resmi arasından hafif olanı söyler." },
              { kod: "4.1.3.13", metin: "İki nesne/nesne resmi arasından dolu olanı söyler." },
              { kod: "4.1.3.14", metin: "İki nesne/nesne resmi arasından içi boş olanı söyler." },
            ],
          },
          {
            kod: "4.1.4",
            metin: "Nesneleri/nesne resimlerini ölçülebilir özelliklerine göre sıralar.",
            hedefDavranislar: [
              { kod: "4.1.4.1", metin: "İkiden fazla çokluğu miktarlarına göre sıralar." },
              { kod: "4.1.4.2", metin: "İkiden fazla nesneyi/nesne resmini büyüklüklerine göre sıralar." },
              { kod: "4.1.4.3", metin: "İkiden fazla nesneyi/nesne resmini uzunluklarına göre sıralar." },
              { kod: "4.1.4.4", metin: "İkiden fazla nesneyi/nesne resmini kalınlıklarına göre sıralar." },
              { kod: "4.1.4.5", metin: "İkiden fazla nesneyi/nesne resmini genişliklerine göre sıralar." },
              { kod: "4.1.4.6", metin: "İkiden fazla nesneyi/nesne resmini ağırlıklarına göre sıralar." },
            ],
          },
        ],
      },
      {
        kod: "4.2",
        ad: "Uzamsal İlişkiler",
        saat: 30,
        hedefler: [
          {
            kod: "4.2.1",
            metin: "Nesnenin mekândaki konumunu söyler.",
            hedefDavranislar: [
              { kod: "4.2.1.1", metin: "Bir nesnenin başka bir nesnenin içinde olduğunu söyler." },
              { kod: "4.2.1.2", metin: "Bir nesnenin başka bir nesnenin dışında olduğunu söyler." },
              { kod: "4.2.1.3", metin: "Bir nesnenin başka bir nesnenin üstünde olduğunu söyler." },
              { kod: "4.2.1.4", metin: "Bir nesnenin başka bir nesnenin altında olduğunu söyler." },
              { kod: "4.2.1.5", metin: "Bir nesnenin başka bir nesnenin uzağında olduğunu söyler." },
              { kod: "4.2.1.6", metin: "Bir nesnenin başka bir nesnenin yakınında olduğunu söyler." },
              { kod: "4.2.1.7", metin: "Bir nesnenin başka bir nesnenin önünde olduğunu söyler." },
              { kod: "4.2.1.8", metin: "Bir nesnenin başka bir nesnenin arkasında olduğunu söyler." },
              { kod: "4.2.1.9", metin: "Bir nesnenin başka bir nesnenin sağında olduğunu söyler." },
              { kod: "4.2.1.10", metin: "Bir nesnenin başka bir nesnenin solunda olduğunu söyler." },
              { kod: "4.2.1.11", metin: "Bir nesnenin başka bir nesnenin yanında olduğunu söyler." },
              { kod: "4.2.1.12", metin: "Bir nesnenin diğer iki nesnenin arasında olduğunu söyler." },
              { kod: "4.2.1.13", metin: "Bir nesnenin başka nesneden yüksekte olduğunu söyler." },
              { kod: "4.2.1.14", metin: "Bir nesnenin başka nesneden alçakta olduğunu söyler." },
              { kod: "4.2.1.15", metin: "Bir nesne dizisinde gösterilen/söylenen nesnenin başta olduğunu söyler." },
              { kod: "4.2.1.16", metin: "Bir nesne dizisinde gösterilen/söylenen nesnenin ortada olduğunu söyler." },
              { kod: "4.2.1.17", metin: "Bir nesne dizisinde gösterilen/söylenen nesnenin sonda olduğunu söyler." },
            ],
          },
          {
            kod: "4.2.2",
            metin: "Nesneleri/nesne resimlerini konumlarına göre sıralar.",
            hedefDavranislar: [
              { kod: "4.2.2.1", metin: "Nesneleri/nesne resimlerini uzaklıklarına göre sıralar." },
              { kod: "4.2.2.2", metin: "Nesneleri/nesne resimlerini yakınlıklarına göre sıralar." },
              { kod: "4.2.2.3", metin: "Nesneleri/nesne resimlerini yüksekliklerine göre sıralar." },
              { kod: "4.2.2.4", metin: "Nesneleri/nesne resimlerini alçaklıklarına göre sıralar." },
            ],
          },
        ],
      },
      {
        kod: "4.3",
        ad: "Sayılar",
        saat: 30,
        hedefler: [
          {
            kod: "4.3.1",
            metin: "Ritmik sayar.",
            hedefDavranislar: [
              { kod: "4.3.1.1", metin: "1'den 10'a kadar ileri doğru birer birer sayar." },
              { kod: "4.3.1.2", metin: "10'dan başlayarak geriye doğru birer birer sayar." },
              { kod: "4.3.1.3", metin: "1-10 arası verilen bir sayıdan ileri doğru birer birer sayar." },
              { kod: "4.3.1.4", metin: "1-10 arası verilen bir sayıdan geriye doğru birer birer sayar." },
            ],
          },
          {
            kod: "4.3.2",
            metin: "Nesneleri/nesne resimlerini, sesleri ve hareketleri sayar.",
            hedefDavranislar: [
              { kod: "4.3.2.1", metin: "Yan yana sıralı olan 1-10 arası nesneyi/nesne resmini birer birer sayar." },
              { kod: "4.3.2.2", metin: "Karışık olarak sıralanmış 1-10 arası nesneyi/nesne resmini birer birer sayar." },
              { kod: "4.3.2.3", metin: "1-10 arası tekrar eden belirli bir sesin (davul sesi, zil vuruşu, alkış gibi) sayısını söyler." },
              { kod: "4.3.2.4", metin: "1-10 arası tekrar eden belirli bir hareketin (zıplama, adım gibi) sayısını söyler." },
            ],
          },
          {
            kod: "4.3.3",
            metin: "10'a kadar bir sayıya karşılık gelen çokluğu tane olarak ifade eder.",
            hedefDavranislar: [
              { kod: "4.3.3.1", metin: "1-4 tane nesneyi/nesne resmini saymadan sayısını söyler." },
              { kod: "4.3.3.2", metin: "Bir grup nesneyi sayarak sayısını söyler." },
              { kod: "4.3.3.3", metin: "Resimdeki nesneleri sayarak sayısını söyler." },
              { kod: "4.3.3.4", metin: "Bir grup nesne içinden istenen sayıda nesneyi sayarak ayırır." },
              { kod: "4.3.3.5", metin: "1-5 tane nesne/nesne resmi farklı konumlandırıldığında nesne/nesne resmi sayısının değişmediğini söyler." },
              { kod: "4.3.3.6", metin: "Hiç nesne olmadığında nesne sayısının sıfır olduğunu söyler." },
            ],
          },
          {
            kod: "4.3.4",
            metin: "Rakamları ayırt eder.",
            hedefDavranislar: [
              { kod: "4.3.4.1", metin: "Rakamları okur." },
              { kod: "4.3.4.2", metin: "İstenilen rakamı diğer rakamlar arasından gösterir." },
              { kod: "4.3.4.3", metin: "Rakamları modele bakarak yazar." },
              { kod: "4.3.4.4", metin: "0-9 arasında söylenen bir rakamı yazar." },
            ],
          },
          {
            kod: "4.3.5",
            metin: "Sayıları sembollerle ifade eder.",
            hedefDavranislar: [
              { kod: "4.3.5.1", metin: "10'a kadar olan bir grup nesnenin sayısını rakamla yazar." },
              { kod: "4.3.5.2", metin: "1-10 arası bir sayıyı ifade etmek için o sayı kadar şekil/resim çizer." },
            ],
          },
          {
            kod: "4.3.6",
            metin: "1'den 10'a kadar sayıları sıralar.",
            hedefDavranislar: [
              { kod: "4.3.6.1", metin: "1'den 10'a kadar sayıları sıralı bir şekilde yazar." },
              { kod: "4.3.6.2", metin: "1-10 arası verilen bir sayıdan sonra gelen sayıyı yazar." },
              { kod: "4.3.6.3", metin: "1-10 arası verilen bir sayıdan önce gelen sayıyı yazar." },
              { kod: "4.3.6.4", metin: "1'den 10'a kadar verilen sıralı sayılardan eksik olan sayıyı yazar." },
              { kod: "4.3.6.5", metin: "Karışık sırada verilen 1'den 10'a kadar olan sayıları sıralar." },
              { kod: "4.3.6.6", metin: "1'den 10'a kadar verilen sayı dizisinde eksik bırakılan sayıyı/sayıları tamamlar." },
              { kod: "4.3.6.7", metin: "1'den 10'a kadar verilen sayı dizisinde eksik bırakılan sayıyı/sayıları yazar." },
            ],
          },
          {
            kod: "4.3.7",
            metin: "İki nesne grubunu bire bir eşleyerek, grupların nesne sayıları arasında karşılaştırma yapar.",
            hedefDavranislar: [
              { kod: "4.3.7.1", metin: "1-10 arasında aynı sayıdaki iki nesne grubunu bire bir eşleyerek iki nesne grubunun eşit olduğunu söyler." },
              { kod: "4.3.7.2", metin: "1-10 arasında farklı sayıdaki iki nesne grubunu bire bir eşleyerek bir nesne grubunun diğerinden daha az olduğunu söyler." },
              { kod: "4.3.7.3", metin: "1-10 arasında farklı sayıdaki iki nesne grubunu bire bir eşleyerek bir nesne grubunun diğerinden daha fazla olduğunu söyler." },
            ],
          },
          {
            kod: "4.3.8",
            metin: "1-10 arasındaki iki sayıyı karşılaştırır.",
            hedefDavranislar: [
              { kod: "4.3.8.1", metin: "1-10 arasındaki iki sayıyı karşılaştırarak iki sayının eşit olduğunu söyler." },
              { kod: "4.3.8.2", metin: "1-10 arasındaki iki sayıyı karşılaştırarak büyük olanı söyler." },
              { kod: "4.3.8.3", metin: "1-10 arasındaki iki sayıyı karşılaştırarak küçük olanı söyler." },
            ],
          },
        ],
      },
      {
        kod: "4.4",
        ad: "Parça-Bütün İlişkisi",
        saat: 20,
        hedefler: [
          {
            kod: "4.4.1",
            metin: "Parça-bütün ilişkisini kurar.",
            hedefDavranislar: [
              { kod: "4.4.1.1", metin: "Bütün olan nesneyi/resmi gösterir." },
              { kod: "4.4.1.2", metin: "Yarım olan nesne/resmi gösterir." },
              { kod: "4.4.1.3", metin: "Çeyrek olan nesneyi/resmi gösterir." },
              { kod: "4.4.1.4", metin: "Bir bütünü iki eş parçaya ayırır." },
              { kod: "4.4.1.5", metin: "İki yarımı birleştirerek bir bütün oluşturur." },
              { kod: "4.4.1.6", metin: "Bir bütünün iki eş parçasından birinin yarım olduğunu söyler." },
              { kod: "4.4.1.7", metin: "İki yarımın bir bütün oluşturduğunu söyler." },
              { kod: "4.4.1.8", metin: "Bir bütünün iki yarımdan oluştuğunu söyler." },
              { kod: "4.4.1.9", metin: "Bir bütünü dört eş parçaya ayırır." },
              { kod: "4.4.1.10", metin: "4 çeyreği birleştirerek bütünü oluşturur." },
              { kod: "4.4.1.11", metin: "Bir bütünün 4 eş parçasından birinin çeyrek olduğunu söyler." },
              { kod: "4.4.1.12", metin: "Bir bütünü 4 çeyrekten oluşturur." },
              { kod: "4.4.1.13", metin: "İki çeyrekten bir yarım oluşturur." },
              { kod: "4.4.1.14", metin: "İki çeyreğin bir yarım oluşturduğunu söyler." },
            ],
          },
        ],
      },
      {
        kod: "4.5",
        ad: "Erken Toplama ve Çıkarma",
        saat: 40,
        hedefler: [
          {
            kod: "4.5.1",
            metin: "Toplamı 10'u geçmeyen sayılarla toplama işlemi yapar.",
            hedefDavranislar: [
              { kod: "4.5.1.1", metin: "Nesne grubuna belirtilen sayı kadar nesne ekler." },
              { kod: "4.5.1.2", metin: "Nesne eklediği grubun sayısının arttığını/çoğaldığını söyler." },
              { kod: "4.5.1.3", metin: "Toplamı 10'u geçmeyen toplama işlemlerini gerçek nesnelerle modelleyerek yapar." },
              { kod: "4.5.1.4", metin: "Toplamı 10'u geçmeyen toplama işlemlerini gerçek nesne resimleriyle modelleyerek yapar." },
              { kod: "4.5.1.5", metin: "Toplamı 10'u geçmeyen toplama işlemi gerektiren sözel problemleri nesnelerle/nesne resimleriyle modelleyerek çözer." },
              { kod: "4.5.1.6", metin: "Toplamı 10'u geçmeyen toplama işlemi gerektiren sözel problemleri zihinden toplama yaparak çözer." },
            ],
          },
          {
            kod: "4.5.2",
            metin: "Çıkarma işlemi yapar.",
            hedefDavranislar: [
              { kod: "4.5.2.1", metin: "En az üç farklı nesneden oluşan nesne grubundan çıkarılan bir nesnenin adını söyler." },
              { kod: "4.5.2.2", metin: "Aynı nesnelerin bulunduğu bir gruptan belirtilen sayı kadar nesne ayırır." },
              { kod: "4.5.2.3", metin: "Nesne çıkardığı grubun sayısının azaldığını/eksildiğini söyler." },
              { kod: "4.5.2.4", metin: "1-10 arasındaki sayılarla çıkarma işlemi yapar." },
              { kod: "4.5.2.5", metin: "1-10 arasındaki sayılarla zihinden çıkarma işlemi yapar." },
              { kod: "4.5.2.6", metin: "1-10 arasındaki sayılarla çıkarma işlemi gerektiren sözel problemleri nesnelerle/nesne resimleriyle modelleyerek çözer." },
              { kod: "4.5.2.7", metin: "1-10 arasındaki sayılarla çıkarma gerektiren sözel problemleri zihinden çıkarma yaparak çözer." },
            ],
          },
        ],
      },
      {
        kod: "4.6",
        ad: "Geometri",
        saat: 20,
        hedefler: [
          {
            kod: "4.6.1",
            metin: "Geometrik şekilleri ayırt eder.",
            hedefDavranislar: [
              { kod: "4.6.1.1", metin: "Geometrik şekilleri eşler." },
              { kod: "4.6.1.2", metin: "Geometrik şekiller arasından istenen geometrik şekli gösterir." },
              { kod: "4.6.1.3", metin: "Gösterilen geometrik şeklin adını söyler." },
            ],
          },
        ],
      },
      {
        kod: "4.7",
        ad: "Ölçme",
        saat: 20,
        hedefler: [
          {
            kod: "4.7.1",
            metin: "Standart olmayan ölçme araçlarıyla ölçüm yapar.",
            hedefDavranislar: [
              { kod: "4.7.1.1", metin: "Bir uzunluğu ölçmek için uygun olan standart olmayan ölçme aracını seçer." },
              { kod: "4.7.1.2", metin: "Bir ağırlığı ölçmek için uygun olan standart olmayan ölçme aracını seçer." },
              { kod: "4.7.1.3", metin: "Bir sıvının miktarını ölçmek için uygun olan standart olmayan ölçme aracını seçer." },
              { kod: "4.7.1.4", metin: "Standart olmayan ölçme araçlarıyla belirtilen uzunluğu ölçer." },
              { kod: "4.7.1.5", metin: "Standart olmayan ölçme araçlarıyla belirtilen ağırlığı ölçer." },
              { kod: "4.7.1.6", metin: "Standart olmayan ölçme araçlarıyla belirtilen sıvı miktarını ölçer." },
              { kod: "4.7.1.7", metin: "Bir uzunluğu, standart olmayan birimler cinsinden tahmin eder." },
              { kod: "4.7.1.8", metin: "Bir ağırlığı, standart olmayan birimler cinsinden tahmin eder." },
              { kod: "4.7.1.9", metin: "Bir sıvının miktarını, standart olmayan birimler cinsinden tahmin eder." },
              { kod: "4.7.1.10", metin: "Ölçüm sonuçlarını tahmin ettiği sonuçlarla karşılaştırır." },
            ],
          },
          {
            kod: "4.7.2",
            metin: "Zamanın ölçülebilir nitelik olduğunu ayırt eder.",
            hedefDavranislar: [
              { kod: "4.7.2.1", metin: "Gün içerisinde kısa ve uzun süreli olayları söyler." },
              { kod: "4.7.2.2", metin: "Farklı sürelere sahip olayları/olay resimlerini gruplandırır." },
              { kod: "4.7.2.3", metin: "Farklı iki olayı/olay resmini kısa ya da uzun olmasına göre karşılaştırır." },
              { kod: "4.7.2.4", metin: "Farklı sürelere sahip olayları/olay resimlerini sıralar." },
            ],
          },
          {
            kod: "4.7.3",
            metin: "Zaman bildiren kavramları konuşma içinde bağlama uygun kullanır.",
            hedefDavranislar: [
              { kod: "4.7.3.1", metin: "Bir günün bölümlerini ifade eden kavramları (sabah, öğle, akşam, gece, gündüz vb.) konuşma içinde bağlama uygun kullanır." },
              { kod: "4.7.3.2", metin: "“Dün”, “bugün” ve “yarın” kavramlarını konuşma içinde bağlama uygun kullanır." },
              { kod: "4.7.3.3", metin: "Zaman bildiren ifadeleri (önce, şimdi, sonra, birazdan, vb.) konuşma içinde bağlama uygun kullanır." },
            ],
          },
        ],
      },
      {
        kod: "4.8",
        ad: "Veri",
        saat: 10,
        hedefler: [
          {
            kod: "4.8.1",
            metin: "En çok iki veri grubuna sahip basit tabloları okur.",
            hedefDavranislar: [
              { kod: "4.8.1.1", metin: "Sembol kullanılarak oluşturulmuş basit tabloları okur." },
              { kod: "4.8.1.2", metin: "Rakam kullanılarak oluşturulmuş basit tabloları okur." },
              { kod: "4.8.1.3", metin: "En çok iki veri grubuna sahip basit tablolarla ilgili sorulan sorulara cevap verir." },
            ],
          },
          {
            kod: "4.8.2",
            metin: "En çok iki veri grubuna sahip basit tablolar oluşturur.",
            hedefDavranislar: [
              { kod: "4.8.2.1", metin: "Resimli davranışı/etkinlik tablolarını sembol kullanarak doldurur." },
              { kod: "4.8.2.2", metin: "Resimli davranışı/etkinlik tablolarını rakam kullanarak doldurur." },
              { kod: "4.8.2.3", metin: "Oluşturduğu en çok iki veri grubuna sahip basit tablolarla ilgili sorulan sorulara cevap verir." },
            ],
          },
        ],
      },
    ],
  },
  {
    no: 5,
    ad: "Matematik",
    amac:
      "Matematik Modülü ile öğrenme güçlüğü olan bireylerin okul döneminde matematiğin en temel becerilerini ve ileri matematik becerilerinde başarılı olmalarını sağlamak amaçlanmaktadır.",
    saat: 200,
    bolumler: [
      {
        kod: "5.1",
        ad: "Sayılar ve İşlemler",
        saat: 110,
        hedefler: [
          {
            kod: "5.1.1",
            metin: "Ritmik sayar.",
            hedefDavranislar: [
              { kod: "5.1.1.1", metin: "0'dan 100'e kadar ileri doğru birer ritmik sayar.", duzey: 1 },
              { kod: "5.1.1.2", metin: "1-20 arası verilen bir sayıdan başlayarak ileri doğru birer ritmik sayar.", duzey: 1 },
              { kod: "5.1.1.3", metin: "0'dan 100'e kadar ileri doğru onar ritmik sayar.", duzey: 1 },
              { kod: "5.1.1.4", metin: "0'dan 100'e kadar ileri doğru beşer ritmik sayar.", duzey: 1 },
              { kod: "5.1.1.5", metin: "20'ye kadar ileri doğru ikişer ritmik sayar.", duzey: 1 },
              { kod: "5.1.1.6", metin: "20'den başlayarak geriye doğru birer ritmik sayar.", duzey: 1 },
              { kod: "5.1.1.7", metin: "20'den başlayarak geriye doğru ikişer ritmik sayar.", duzey: 1 },
              { kod: "5.1.1.8", metin: "100'den geriye doğru ikişer ritmik sayar.", duzey: 2 },
              { kod: "5.1.1.9", metin: "0'dan 30'a kadar ileri doğru üçer ritmik sayar.", duzey: 2 },
              { kod: "5.1.1.10", metin: "30'dan 0'a kadar geriye doğru üçer ritmik sayar.", duzey: 2 },
              { kod: "5.1.1.11", metin: "0'dan 40'a kadar ileri doğru dörder ritmik sayar.", duzey: 2 },
              { kod: "5.1.1.12", metin: "40'tan 0'a kadar geriye doğru dörder ritmik sayar.", duzey: 2 },
              { kod: "5.1.1.13", metin: "1-30 arası verilen bir sayıdan başlayarak ileri doğru üçer ritmik sayar.", duzey: 2 },
              { kod: "5.1.1.14", metin: "1-30 arası verilen bir sayıdan başlayarak geriye doğru üçer ritmik sayar.", duzey: 2 },
              { kod: "5.1.1.15", metin: "1-40 arası verilen bir sayıdan başlayarak ileri doğru dörder ritmik sayar.", duzey: 2 },
              { kod: "5.1.1.16", metin: "1-40 arası verilen bir sayıdan başlayarak geriye doğru dörder ritmik sayar.", duzey: 2 },
              { kod: "5.1.1.17", metin: "1'den 60'a kadar ileri doğru altışar ritmik sayar.", duzey: 3 },
              { kod: "5.1.1.18", metin: "1'den 70'e kadar ileri doğru yedişer ritmik sayar.", duzey: 3 },
              { kod: "5.1.1.19", metin: "1'den 80'e kadar ileri doğru sekizer ritmik sayar.", duzey: 3 },
              { kod: "5.1.1.20", metin: "1'den 90'a kadar ileri doğru dokuzar ritmik sayar.", duzey: 3 },
              { kod: "5.1.1.21", metin: "100'den 1000'e kadar ileri doğru yüzer ritmik sayar.", duzey: 3 },
              { kod: "5.1.1.22", metin: "1000'den geriye doğru yüzer ritmik sayar.", duzey: 3 },
              { kod: "5.1.1.23", metin: "1-1000 arası verilen bir sayıdan başlayarak ileri doğru onar ritmik sayar.", duzey: 3 },
              { kod: "5.1.1.24", metin: "1-1000 arası verilen bir sayıdan başlayarak geriye doğru yüzer ritmik sayar.", duzey: 3 },
              { kod: "5.1.1.25", metin: "10.000'e kadar biner ritmik sayar.", duzey: 4 },
            ],
          },
          {
            kod: "5.1.2",
            metin: "Nesneleri/nesne resimlerini sayar.",
            hedefDavranislar: [
              { kod: "5.1.2.1", metin: "Yan yana sıralı olan 1-20 arası sayıda nesneyi/nesne resmini birer birer sayar.", duzey: 1 },
              { kod: "5.1.2.2", metin: "Karışık olarak sıralanmış 1-20 arası sayıda nesneyi/nesne resmini birer birer sayar.", duzey: 1 },
              { kod: "5.1.2.3", metin: "Nesne sayısı 100'e kadar olan bir gruptaki nesneleri/nesne resimlerini birer birer sayar.", duzey: 2 },
              { kod: "5.1.2.4", metin: "Nesne sayısı 100'e kadar olan bir gruptaki nesneleri/nesne resimlerini onar onar sayar.", duzey: 2 },
              { kod: "5.1.2.5", metin: "Nesne sayısı 100'e kadar olan bir gruptaki nesneleri/nesne resimlerini beşer beşer sayar.", duzey: 2 },
              { kod: "5.1.2.6", metin: "Nesne sayısı 100'e kadar olan bir gruptaki nesneleri/nesne resimlerini ikişer ikişer sayar.", duzey: 2 },
              { kod: "5.1.2.7", metin: "Nesne sayısı 30'a kadar olan bir gruptaki nesneleri/nesne resimlerini üçer üçer sayar.", duzey: 2 },
              { kod: "5.1.2.8", metin: "Nesne sayısı 40'a kadar olan bir gruptaki nesneleri/nesne resimlerini dörder dörder sayar.", duzey: 2 },
            ],
          },
          {
            kod: "5.1.3",
            metin: "100'e kadar bir sayıya karşılık gelen çokluğu tane olarak ifade eder.",
            hedefDavranislar: [
              { kod: "5.1.3.1", metin: "1-20 arası bir grup nesneyi sayarak sayısını söyler.", duzey: 1 },
              { kod: "5.1.3.2", metin: "Resimdeki 1-20 arası bir grup nesneyi sayarak sayısını söyler.", duzey: 1 },
              { kod: "5.1.3.3", metin: "1-20 arası bir grup nesne içinden istenen sayıda nesneyi sayarak ayırır.", duzey: 1 },
              { kod: "5.1.3.4", metin: "Resimdeki 20-100 arası bir grup nesneyi sayarak sayısını söyler.", duzey: 2 },
            ],
          },
          {
            kod: "5.1.4",
            metin: "Doğal sayıları yazar.",
            hedefDavranislar: [
              { kod: "5.1.4.1", metin: "Aynı cins 10 varlıktan oluşan çokluğun bir deste olduğunu söyler.", duzey: 1 },
              { kod: "5.1.4.2", metin: "Aynı cins 12 varlıktan oluşan çokluğun bir düzine olduğunu söyler.", duzey: 1 },
              { kod: "5.1.4.3", metin: "10-20 arasında olan bir grup nesneyi/nesne resmini (10 ve 20 dâhil) onluk ve birliklerine ayırır.", duzey: 1 },
              { kod: "5.1.4.4", metin: "10-20 arasında olan bir grup nesnenin/nesne resminin onluk ve birlik sayısını söyler.", duzey: 1 },
              { kod: "5.1.4.5", metin: "Onluk ve birliklerine ayrılan 10-20 arasındaki nesne grubuna karşılık gelen sayıyı yazar.", duzey: 1 },
              { kod: "5.1.4.6", metin: "Onluk ve birliklerine ayrılan 10-20 arasındaki nesne grubuna karşılık gelen sayıyı okur.", duzey: 1 },
              { kod: "5.1.4.7", metin: "1-20 arası sayıları okur.", duzey: 1 },
              { kod: "5.1.4.8", metin: "Söylenen 1-20 arası sayıyı rakamla yazar.", duzey: 1 },
              { kod: "5.1.4.9", metin: "Nesne sayısı 100'den az olan bir çokluğu model kullanarak onluk ve birliklerine ayırır.", duzey: 2 },
              { kod: "5.1.4.10", metin: "Onluk ve birliklerine ayrılan 20-100 arasındaki çokluğun onluk ve birlik sayısını söyler.", duzey: 2 },
              { kod: "5.1.4.11", metin: "Onluk ve birliklerine ayrılan 20-100 arasındaki çokluğa karşılık gelen sayıyı yazar.", duzey: 2 },
              { kod: "5.1.4.12", metin: "Onluk ve birliklerine ayrılan 20-100 arasındaki çokluğa karşılık gelen sayıyı okur.", duzey: 2 },
              { kod: "5.1.4.13", metin: "İki basamaklı doğal sayıları okur.", duzey: 2 },
              { kod: "5.1.4.14", metin: "Söylenen iki basamaklı doğal sayıları rakamla yazar.", duzey: 2 },
              { kod: "5.1.4.15", metin: "Nesne sayısı 100-1000 olan bir çokluğu model kullanarak yüzlük, onluk ve birliklerine ayırır.", duzey: 3 },
              { kod: "5.1.4.16", metin: "Yüzlük, onluk ve birliklerine ayrıldığı çokluğun yüzlük, onluk ve birlik sayısını söyler.", duzey: 3 },
              { kod: "5.1.4.17", metin: "Yüzlük, onluk ve birliklerine ayrıldığı 100-1000 arasındaki çokluğa karşılık gelen sayıyı yazar.", duzey: 3 },
              { kod: "5.1.4.18", metin: "Yüzlük, onluk ve birliklerine ayrıldığı 100-1000 arasındaki çokluğa karşılık gelen sayıyı okur.", duzey: 3 },
              { kod: "5.1.4.19", metin: "Üç basamaklı doğal sayıları okur.", duzey: 3 },
              { kod: "5.1.4.20", metin: "Söylenen üç basamaklı doğal sayıları rakamla yazar.", duzey: 3 },
              { kod: "5.1.4.21", metin: "4, 5 ve 6 basamaklı doğal sayıları okur.", duzey: 4 },
              { kod: "5.1.4.22", metin: "Söylenen 4, 5 ve 6 basamaklı doğal sayıları rakamla yazar.", duzey: 4 },
            ],
          },
          {
            kod: "5.1.5",
            metin: "Doğal sayıların basamak ve basamak değerlerini yazar.",
            hedefDavranislar: [
              { kod: "5.1.5.1", metin: "100'den küçük doğal sayıların basamak adlarını basamak modelleri üzerinde yazar.", duzey: 2 },
              { kod: "5.1.5.2", metin: "100'den küçük doğal sayıların basamak değerlerini yazar.", duzey: 2 },
              { kod: "5.1.5.3", metin: "Üç basamaklı sayıların basamak adlarını basamak modelleri üzerinde yazar.", duzey: 3 },
              { kod: "5.1.5.4", metin: "Üç basamaklı sayıların basamak değerlerini modeller üzerinde yazar.", duzey: 3 },
              { kod: "5.1.5.5", metin: "4, 5 ve 6 basamaklı doğal sayıların basamak adlarını yazar.", duzey: 4 },
              { kod: "5.1.5.6", metin: "4, 5 ve 6 basamaklı doğal sayıların basamak değerlerini yazar.", duzey: 4 },
              { kod: "5.1.5.7", metin: "4, 5 ve 6 basamaklı doğal sayıları basamak değerlerine ayırır.", duzey: 4 },
              { kod: "5.1.5.8", metin: "4, 5 ve 6 basamaklı doğal sayıları çözümler.", duzey: 4 },
            ],
          },
          {
            kod: "5.1.6",
            metin: "Doğal sayıları sıralar.",
            hedefDavranislar: [
              { kod: "5.1.6.1", metin: "1'den 20'ye kadar sayıları sıralı bir şekilde yazar.", duzey: 1 },
              { kod: "5.1.6.2", metin: "1-20 arası verilen bir sayıdan sonra gelen sayıyı yazar.", duzey: 1 },
              { kod: "5.1.6.3", metin: "1-20 arası verilen bir sayıdan önce gelen sayıyı yazar.", duzey: 1 },
              { kod: "5.1.6.4", metin: "Karışık sırada verilen 1'den 20'ye kadar olan sayıları sayma sırasına göre sıralar.", duzey: 1 },
              { kod: "5.1.6.5", metin: "1'den 20'ye kadar verilen sayı dizisinde eksik bırakılan sayıyı/sayıları yazar.", duzey: 1 },
              { kod: "5.1.6.6", metin: "1-100 arası verilen bir sayıdan sonra gelen sayıyı yazar.", duzey: 2 },
              { kod: "5.1.6.7", metin: "1-100 arası verilen bir sayıdan önce gelen sayıyı yazar.", duzey: 2 },
              { kod: "5.1.6.8", metin: "1-100 arasında karışık sırada verilen en çok 4 doğal sayıyı sayma sırasına göre sıralar.", duzey: 2 },
              { kod: "5.1.6.9", metin: "1-100 arası doğal sayılarla oluşturulmuş bir sayı dizisinde eksik bırakılan sayıları yazar.", duzey: 2 },
            ],
          },
          {
            kod: "5.1.7",
            metin: "İki nesne grubunu bire bir eşleyerek, grupların nesne sayıları arasında karşılaştırma yapar.",
            hedefDavranislar: [
              { kod: "5.1.7.1", metin: "1-20 arasında aynı sayıdaki iki nesne grubunu bire bir eşleyerek iki nesne grubunun bire bir eşit olduğunu söyler.", duzey: 1 },
              { kod: "5.1.7.2", metin: "1-20 arasında farklı sayıdaki iki nesne grubunu bire bir eşleyerek bir nesne grubunun diğerinden daha az olduğunu söyler.", duzey: 1 },
              { kod: "5.1.7.3", metin: "1-20 arasında farklı sayıdaki iki nesne grubunu bire bir eşleyerek bir nesne grubunun diğerinden daha fazla olduğunu söyler.", duzey: 1 },
            ],
          },
          {
            kod: "5.1.8",
            metin: "Doğal sayıları karşılaştırır.",
            hedefDavranislar: [
              { kod: "5.1.8.1", metin: "10-20 arasındaki iki sayıyı karşılaştırarak iki sayının eşit olduğunu söyler.", duzey: 1 },
              { kod: "5.1.8.2", metin: "10-20 arasındaki iki sayıyı karşılaştırarak büyük olanı söyler.", duzey: 1 },
              { kod: "5.1.8.3", metin: "10-20 arasındaki iki sayıyı karşılaştırarak küçük olanı söyler.", duzey: 1 },
              { kod: "5.1.8.4", metin: "100'den küçük en çok dört doğal sayıyı karşılaştırarak büyük/en büyük olanı söyler.", duzey: 2 },
              { kod: "5.1.8.5", metin: "100'den küçük en çok dört doğal sayıyı karşılaştırarak küçük/en küçük olanı söyler.", duzey: 2 },
              { kod: "5.1.8.6", metin: "100'den küçük en çok dört doğal sayıyı büyükten küçüğe/küçükten büyüğe sıralar.", duzey: 2 },
              { kod: "5.1.8.7", metin: "1000'den küçük en çok beş doğal sayıyı karşılaştırarak büyük/en büyük olanı söyler.", duzey: 3 },
              { kod: "5.1.8.8", metin: "1000'den küçük en çok beş doğal sayıyı karşılaştırarak küçük/en küçük olanı söyler.", duzey: 3 },
              { kod: "5.1.8.9", metin: "1000'den küçük en çok beş doğal sayıyı '>' ve '<' sembollerini kullanarak büyükten küçüğe/küçükten büyüğe sıralar.", duzey: 3 },
              { kod: "5.1.8.10", metin: "En çok altı basamaklı doğal sayıları büyük/küçük sembolü kullanarak sıralar.", duzey: 4 },
            ],
          },
          {
            kod: "5.1.9",
            metin: "Sayıları sıra bildirmek amacıyla kullanır.",
            hedefDavranislar: [
              { kod: "5.1.9.1", metin: "Bir sıra dizisi içindeki nesnelerin/nesne resimlerinin sırasını gösterir.", duzey: 1 },
              { kod: "5.1.9.2", metin: "Bir sıra dizisi içinde sırası söylenen nesneyi/nesne resmini gösterir.", duzey: 1 },
              { kod: "5.1.9.3", metin: "Sıra bildiren sayıyı okur.", duzey: 1 },
              { kod: "5.1.9.4", metin: "Sıra bildiren sayıyı yazar.", duzey: 1 },
            ],
          },
          {
            kod: "5.1.10",
            metin: "Belli bir kurala göre artan/azalan sayı örüntüsü oluşturur.",
            hedefDavranislar: [
              { kod: "5.1.10.1", metin: "Aralarındaki fark sabit olan sayı örüntüsünün kuralını söyler.", duzey: 2 },
              { kod: "5.1.10.2", metin: "Aralarındaki fark sabit olan sayı örüntüsünün eksik bırakılan ögesini yazar.", duzey: 2 },
              { kod: "5.1.10.3", metin: "Aralarındaki fark sabit olan sayı örüntüsünü en çok 4 adım devam ettirir.", duzey: 3 },
              { kod: "5.1.10.4", metin: "Belli bir kurala göre artan ya da azalan tek kurallı sayı örüntüsü oluşturur.", duzey: 3 },
              { kod: "5.1.10.5", metin: "Belli bir kurala göre artan ya da azalan çift kurallı sayı örüntüsü oluşturur.", duzey: 4 },
              { kod: "5.1.10.6", metin: "Çift kurala göre oluşturduğu sayı örüntüsünün kurallarını söyler.", duzey: 4 },
            ],
          },
          {
            kod: "5.1.11",
            metin: "Doğal sayıları en yakın olduğu onluğa/yüzlüğe/binliğe yuvarlar.",
            hedefDavranislar: [
              { kod: "5.1.11.1", metin: "100'den küçük bir doğal sayının yakın olduğu onluğu söyler.", duzey: 2 },
              { kod: "5.1.11.2", metin: "100'den küçük bir doğal sayıyı yakın olduğu onluğa yuvarlar.", duzey: 2 },
              { kod: "5.1.11.3", metin: "Üç basamaklı bir doğal sayının yakın olduğu onluğu/yüzlüğü söyler.", duzey: 3 },
              { kod: "5.1.11.4", metin: "Üç basamaklı bir doğal sayıyı yakın olduğu onluğa/yüzlüğe yuvarlar.", duzey: 3 },
              { kod: "5.1.11.5", metin: "Dört basamaklı bir doğal sayının yakın olduğu onluğu/yüzlüğü/binliği söyler.", duzey: 4 },
              { kod: "5.1.11.6", metin: "Dört basamaklı bir doğal sayıyı yakın olduğu onluğa/yüzlüğe/binliğe yuvarlar.", duzey: 4 },
            ],
          },
          {
            kod: "5.1.12",
            metin: "Doğal sayıları tek ya da çift olmalarına göre ayırt eder.",
            hedefDavranislar: [
              { kod: "5.1.12.1", metin: "Nesneleri/nesne resimlerini gruplayarak nesne sayısının tek ya da çift olduğunu söyler.", duzey: 3 },
              { kod: "5.1.12.2", metin: "Verilen sayıların tek ya da çift olduğunu söyler.", duzey: 3 },
              { kod: "5.1.12.3", metin: "İki tek doğal sayının toplamının çift olduğunu söyler.", duzey: 3 },
              { kod: "5.1.12.4", metin: "İki çift doğal sayının toplamının çift olduğunu söyler.", duzey: 3 },
              { kod: "5.1.12.5", metin: "Tek ve çift iki doğal sayının toplamının tek olduğunu söyler.", duzey: 3 },
            ],
          },
          {
            kod: "5.1.13",
            metin: "Sayıları Romen rakamlarıyla ifade eder.",
            hedefDavranislar: [
              { kod: "5.1.13.1", metin: "20'ye kadar olan Romen rakamlarını okur.", duzey: 3 },
              { kod: "5.1.13.2", metin: "20'ye kadar olan sayıları Romen rakamlarıyla yazar.", duzey: 3 },
            ],
          },
          {
            kod: "5.1.14",
            metin: "Doğal sayılarla toplama işlemi yapar.",
            hedefDavranislar: [
              { kod: "5.1.14.1", metin: "Nesne grubuna belirtilen sayı kadar nesne ekleyerek grubun sayısının arttığını/çoğaldığını söyler.", duzey: 1 },
              { kod: "5.1.14.2", metin: "Toplamı 20'yi geçmeyen toplama işlemlerini gerçek nesnelerle/nesne resimleriyle modelleyerek yapar.", duzey: 1 },
              { kod: "5.1.14.3", metin: "Toplamı 20'yi geçmeyen toplama işlemlerini gerçek nesnelerle/nesne resimleriyle gösterilen toplama işlemini sayılara dönüştürerek yapar.", duzey: 1 },
              { kod: "5.1.14.4", metin: "Eşittir sembolünü kullanır.", duzey: 1 },
              { kod: "5.1.14.5", metin: "Toplama işlemi sembolünü (+) kullanır.", duzey: 1 },
              { kod: "5.1.14.6", metin: "Toplamı 20'yi geçmeyen sayılarla toplama işlemi yapar.", duzey: 1 },
              { kod: "5.1.14.7", metin: "Toplamı 20'yi geçmeyen üç tane bir basamaklı sayı ile toplama işlemi yapar.", duzey: 1 },
              { kod: "5.1.14.8", metin: "Toplama işleminde toplananların yerleri değiştiğinde toplamın değişmediğini söyler.", duzey: 1 },
              { kod: "5.1.14.9", metin: "Toplamı 20'yi geçmeyen sayılarla yapılan toplama işleminde verilmeyen toplananı yazar.", duzey: 1 },
              { kod: "5.1.14.10", metin: "Toplamı 20'yi geçmeyen sayılar ile zihinden toplama işlemi yapar.", duzey: 1 },
              { kod: "5.1.14.11", metin: "Toplamları 100'ü geçmeyen iki sayı ile eldesiz toplama işlemi yapar.", duzey: 2 },
              { kod: "5.1.14.12", metin: "Toplamları 100'ü geçmeyen iki sayı ile eldeli toplama işlemi yapar.", duzey: 2 },
              { kod: "5.1.14.13", metin: "Toplamları 100'ü geçmeyen iki sayının toplamında verilmeyen toplananı bulur.", duzey: 2 },
              { kod: "5.1.14.14", metin: "Toplamları 100'ü geçmeyen iki sayının toplamını tahmin eder.", duzey: 2 },
              { kod: "5.1.14.15", metin: "Toplamları 100'ü geçmeyen iki sayının toplamındaki tahmini işlem sonucuyla karşılaştırır.", duzey: 2 },
              { kod: "5.1.14.16", metin: "Toplamları 100'ü geçmeyen iki sayıyla zihinden toplama işlemi yapar.", duzey: 2 },
              { kod: "5.1.14.17", metin: "Toplamları 1000'i geçmeyen iki sayı ile eldesiz toplama işlemi yapar.", duzey: 3 },
              { kod: "5.1.14.18", metin: "Toplamları 1000'i geçmeyen iki sayı ile eldeli toplama işlemi yapar.", duzey: 3 },
              { kod: "5.1.14.19", metin: "Toplamları 1000'i geçmeyen iki sayının toplamında verilmeyen toplananı bulur.", duzey: 3 },
              { kod: "5.1.14.20", metin: "Toplamları 1000'i geçmeyen iki sayının toplamını tahmin eder.", duzey: 3 },
              { kod: "5.1.14.21", metin: "Toplamları 1000'i geçmeyen iki sayının toplamındaki tahmini işlem sonucuyla karşılaştırır.", duzey: 3 },
              { kod: "5.1.14.22", metin: "Toplamları 1000'i geçmeyen iki sayıyı zihinden toplar.", duzey: 3 },
              { kod: "5.1.14.23", metin: "En çok dört basamaklı sayılarla eldeli/eldesiz toplama işlemi yapar.", duzey: 4 },
              { kod: "5.1.14.24", metin: "Toplamları en çok dört basamaklı olan iki sayının toplamını tahmin eder.", duzey: 4 },
              { kod: "5.1.14.25", metin: "Toplamları en çok dört basamaklı olan iki sayının toplamındaki tahmini işlem sonucu ile karşılaştırır.", duzey: 4 },
              { kod: "5.1.14.26", metin: "En çok dört basamaklı sayıları 100'ün katlarıyla zihinden toplar.", duzey: 4 },
            ],
          },
          {
            kod: "5.1.15",
            metin: "Toplama işlemi gerektiren problemleri çözer.",
            hedefDavranislar: [
              { kod: "5.1.15.1", metin: "Toplamı 20'yi geçmeyen sayılar ile bir toplama işlemi gerektiren problemleri çözer.", duzey: 1 },
              { kod: "5.1.15.2", metin: "Verilenlere uygun, toplamı 20'yi geçmeyen sayılar ile bir toplama işlemi gerektiren problemler kurar.", duzey: 1 },
              { kod: "5.1.15.3", metin: "Toplamları 100'ü geçmeyen sayılar ile en çok iki işlem gerektiren problemleri çözer.", duzey: 2 },
              { kod: "5.1.15.4", metin: "Verilenlere uygun, toplamı 100'ü geçmeyen sayılarla bir toplama işlemi gerektiren problemler kurar.", duzey: 2 },
              { kod: "5.1.15.5", metin: "Toplamları 1000'i geçmeyen üç basamaklı sayılarla en çok üç işlem gerektiren problemleri çözer.", duzey: 3 },
              { kod: "5.1.15.6", metin: "Verilenlere uygun, en çok iki işlem gerektiren problemler kurar.", duzey: 3 },
              { kod: "5.1.15.7", metin: "En çok dört basamaklı sayılarla en çok üç işlem gerektiren problemleri çözer.", duzey: 4 },
              { kod: "5.1.15.8", metin: "Verilenlere uygun, üç işlem gerektiren problemler kurar.", duzey: 4 },
            ],
          },
          {
            kod: "5.1.16",
            metin: "Doğal sayılarla çıkarma işlemi yapar.",
            hedefDavranislar: [
              { kod: "5.1.16.1", metin: "Nesne grubundan belirtilen sayı kadar nesne çıkararak grubun sayısının azaldığını/eksildiğini söyler.", duzey: 1 },
              { kod: "5.1.16.2", metin: "20'ye kadar olan sayılarla çıkarma işlemlerini gerçek nesnelerle/nesne resimleriyle modelleyerek yapar.", duzey: 1 },
              { kod: "5.1.16.3", metin: "0-20 arasındaki gösterilen çıkarma işlemini sayılara dönüştürerek yapar.", duzey: 1 },
              { kod: "5.1.16.4", metin: "Çıkarma işlemi sembolünü (-) kullanır.", duzey: 1 },
              { kod: "5.1.16.5", metin: "20'ye kadar olan sayılarla çıkarma işlemi yapar.", duzey: 1 },
              { kod: "5.1.16.6", metin: "20'ye kadar olan sayılarla zihinden çıkarma işlemi yapar.", duzey: 1 },
              { kod: "5.1.16.7", metin: "100'e kadar olan sayılar ile onluk bozmadan çıkarma işlemi yapar.", duzey: 2 },
              { kod: "5.1.16.8", metin: "100'e kadar olan sayılar ile onluk bozarak çıkarma işlemi yapar.", duzey: 2 },
              { kod: "5.1.16.9", metin: "20'ye kadar olan sayılarla yapılan çıkarma işleminde verilmeyen eksileni bulur.", duzey: 2 },
              { kod: "5.1.16.10", metin: "20'ye kadar olan sayılarla yapılan çıkarma işleminde verilmeyen çıkanı bulur.", duzey: 2 },
              { kod: "5.1.16.11", metin: "100'e kadar olan iki sayı ile yapılan çıkarma işleminin sonucunu tahmin eder.", duzey: 2 },
              { kod: "5.1.16.12", metin: "100'e kadar olan iki sayı ile yapılan çıkarma işleminin sonucundaki tahmini işlem sonucu ile karşılaştırır.", duzey: 2 },
              { kod: "5.1.16.13", metin: "100 içinde 10'un katı olan iki sayıyı zihinden çıkarır.", duzey: 2 },
              { kod: "5.1.16.14", metin: "En çok üç basamaklı sayılar ile onluk bozmadan çıkarma işlemi yapar.", duzey: 3 },
              { kod: "5.1.16.15", metin: "En çok üç basamaklı sayılar ile onluk bozarak çıkarma işlemi yapar.", duzey: 3 },
              { kod: "5.1.16.16", metin: "100'e kadar olan sayılarla yapılan çıkarma işleminde verilmeyen eksileni bulur.", duzey: 3 },
              { kod: "5.1.16.17", metin: "100'e kadar olan sayılarla yapılan çıkarma işleminde verilmeyen çıkanı bulur.", duzey: 3 },
              { kod: "5.1.16.18", metin: "Üç basamaklı sayılarla yapılan çıkarma işleminin sonucunu tahmin eder.", duzey: 3 },
              { kod: "5.1.16.19", metin: "Üç basamaklı sayılarla yapılan çıkarma işleminin sonucundaki tahmini işlem sonucu ile karşılaştırır.", duzey: 3 },
              { kod: "5.1.16.20", metin: "İki basamaklı bir sayıdan 10'un katı olan iki basamaklı bir sayıyı zihinden çıkarır.", duzey: 3 },
              { kod: "5.1.16.21", metin: "Üç basamaklı ve 100'ün katı olan bir sayıdan 10'un katı olan iki basamaklı bir sayıyı zihinden çıkarır.", duzey: 3 },
              { kod: "5.1.16.22", metin: "En çok dört basamaklı iki sayı ile onluk bozmadan çıkarma işlemi yapar.", duzey: 4 },
              { kod: "5.1.16.23", metin: "En çok dört basamaklı iki sayı ile onluk bozarak çıkarma işlemi yapar.", duzey: 4 },
              { kod: "5.1.16.24", metin: "En çok dört basamaklı sayılarla yapılan çıkarma işleminde verilmeyen eksileni bulur.", duzey: 4 },
              { kod: "5.1.16.25", metin: "100'e kadar olan sayılarla yapılan çıkarma işleminde verilmeyen çıkanı bulur.", duzey: 4 },
              { kod: "5.1.16.26", metin: "En çok dört basamaklı sayılar ile yapılan çıkarma işleminin sonucunu tahmin eder.", duzey: 4 },
              { kod: "5.1.16.27", metin: "En çok dört basamaklı sayılar ile yapılan çıkarma işleminin sonucundaki tahmini işlem sonucu ile karşılaştırır.", duzey: 4 },
              { kod: "5.1.16.28", metin: "Üç basamaklı bir sayıdan 10'un katı olan iki basamaklı bir sayıyı zihinden çıkarır.", duzey: 4 },
              { kod: "5.1.16.29", metin: "100'ün katı olan üç basamaklı sayıları zihinden çıkarır.", duzey: 4 },
            ],
          },
          {
            kod: "5.1.17",
            metin: "Çıkarma işlemi gerektiren problemleri çözer.",
            hedefDavranislar: [
              { kod: "5.1.17.1", metin: "20'ye kadar olan sayılarla bir çıkarma işlemi gerektiren problemleri çözer.", duzey: 1 },
              { kod: "5.1.17.2", metin: "Verilenlere uygun, 1-20 arası sayılar ile bir çıkarma işlemi gerektiren problemler kurar.", duzey: 1 },
              { kod: "5.1.17.3", metin: "0-100 arası sayılar ile toplama ve çıkarma işlemi gerektiren en çok iki işlemli problemleri çözer.", duzey: 2 },
              { kod: "5.1.17.4", metin: "Verilenlere uygun, 0-100 arası sayılar ile toplama ve çıkarma işlemi gerektiren en çok iki işlemli problemler kurar.", duzey: 2 },
              { kod: "5.1.17.5", metin: "0-1000 arası sayılar ile toplama ve çıkarma işlemi gerektiren en çok üç işlemli problemleri çözer.", duzey: 3 },
              { kod: "5.1.17.6", metin: "Verilenlere uygun, 0-1000 arası sayılar ile toplama ve çıkarma işlemi gerektiren en çok iki işlemli problemler kurar.", duzey: 3 },
              { kod: "5.1.17.7", metin: "En çok dört basamaklı sayılar ile toplama ve çıkarma işlemi gerektiren en çok dört işlemli problemleri çözer.", duzey: 4 },
              { kod: "5.1.17.8", metin: "Verilenlere uygun, en çok dört basamaklı sayılarla toplama ve çıkarma işlemi gerektiren en çok üç işlemli problemler kurar.", duzey: 4 },
            ],
          },
          {
            kod: "5.1.18",
            metin: "Doğal sayılarla çarpma işlemi yapar.",
            hedefDavranislar: [
              { kod: "5.1.18.1", metin: "20'ye kadar olan sayılarla çarpma işlemini gerçek nesnelerle/nesne resimleriyle tekrarlı toplama işlemi olarak modeller.", duzey: 2 },
              { kod: "5.1.18.2", metin: "Çarpma işleminin tekrarlı toplama işlemi olduğunu söyler.", duzey: 2 },
              { kod: "5.1.18.3", metin: "Nesneler ile gösterilen çarpma işlemini sayılara dönüştürür.", duzey: 2 },
              { kod: "5.1.18.4", metin: "Çarpma işlemi sembolünü (x) kullanır.", duzey: 2 },
              { kod: "5.1.18.5", metin: "10'a kadar olan sayıları 1, 2, 3, 4, 5 ve 10 ile çarpar.", duzey: 2 },
              { kod: "5.1.18.6", metin: "5'e kadar (5 dâhil) çarpım tablosunu oluşturur.", duzey: 2 },
              { kod: "5.1.18.7", metin: "10'a kadar olan sayıları 6, 7, 8, 9 ile çarpar.", duzey: 3 },
              { kod: "5.1.18.8", metin: "Çarpım tablosunu oluşturur.", duzey: 3 },
              { kod: "5.1.18.9", metin: "100'e kadar olan sayıları 10'a kadar olan sayılarla eldesiz çarpar.", duzey: 3 },
              { kod: "5.1.18.10", metin: "100'e kadar olan sayıları 10'a kadar olan sayılarla eldeli çarpar.", duzey: 3 },
              { kod: "5.1.18.11", metin: "İki basamaklı bir sayıyı bir basamaklı bir sayı ile çarpar.", duzey: 3 },
              { kod: "5.1.18.12", metin: "Üç basamaklı bir sayıyı bir basamaklı bir sayı ile çarpar.", duzey: 3 },
              { kod: "5.1.18.13", metin: "10, 100 ve 1000 sayıları ile 100'e kadar sayıları kısa yoldan çarpma işlemi yapar.", duzey: 3 },
              { kod: "5.1.18.14", metin: "Çarpma işleminde çarpanlardan biri artırıldığında veya azaltıldığında sonuçtaki değişikliği söyler.", duzey: 3 },
              { kod: "5.1.18.15", metin: "Üç basamaklı sayılarla iki basamaklı sayıları çarpar.", duzey: 4 },
              { kod: "5.1.18.16", metin: "Üç doğal sayı ile yapılan çarpma işleminde çarpanların yerinin değişmesinin, sonucu değiştirmediğini söyler.", duzey: 4 },
              { kod: "5.1.18.17", metin: "En çok iki basamaklı doğal sayıları; 10, 100 ve 1000'in en çok dokuz katı olan sayılarla kısa yoldan çarpar.", duzey: 4 },
              { kod: "5.1.18.18", metin: "En çok iki basamaklı doğal sayıları 5, 25 ve 50 ile kısa yoldan çarpar.", duzey: 4 },
              { kod: "5.1.18.19", metin: "En çok iki basamaklı sayıları 10, 100 ve 1000 ile zihinden çarpar.", duzey: 4 },
              { kod: "5.1.18.20", metin: "En çok iki basamaklı bir doğal sayı ile bir basamaklı bir doğal sayının çarpımını tahmin eder.", duzey: 4 },
              { kod: "5.1.18.21", metin: "En çok iki basamaklı bir doğal sayı ile bir basamaklı bir doğal sayının çarpımındaki tahmini işlem sonucu ile karşılaştırır.", duzey: 4 },
            ],
          },
          {
            kod: "5.1.19",
            metin: "Çarpma ile ilgili problemleri çözer.",
            hedefDavranislar: [
              { kod: "5.1.19.1", metin: "1-100 arası sayılar ile bir çarpma işlemi gerektiren problemleri çözer.", duzey: 2 },
              { kod: "5.1.19.2", metin: "1-100 arası sayılar ile biri çarpma işlemi olmak üzere iki işlem gerektiren problemleri çözer.", duzey: 3 },
              { kod: "5.1.19.3", metin: "Çarpma işlemi gerektiren problemler kurar.", duzey: 3 },
              { kod: "5.1.19.4", metin: "En fazla üç basamaklı sayılarla biri çarpma işlemi olmak üzere en çok üç işlem gerektiren problemleri çözer.", duzey: 4 },
              { kod: "5.1.19.5", metin: "En fazla üç basamaklı sayılarla biri çarpma işlemi olmak üzere en çok iki işlem gerektiren problemler kurar.", duzey: 4 },
            ],
          },
          {
            kod: "5.1.20",
            metin: "Doğal sayılarla bölme işlemi yapar.",
            hedefDavranislar: [
              { kod: "5.1.20.1", metin: "20'ye kadar olan sayılarla bölme işlemini gerçek nesneleri/nesne resimlerini gruplama/paylaştırma ile modeller.", duzey: 2 },
              { kod: "5.1.20.2", metin: "20'ye kadar olan sayılarla bölme işlemini gerçek nesnelerini gruplayarak/paylaştırarak ardışık çıkarma işlemi olarak modeller.", duzey: 2 },
              { kod: "5.1.20.3", metin: "0-20 arasındaki nesneler/nesne resimleri ile gösterilen kalansız bölme işlemini sayılara dönüştürür.", duzey: 2 },
              { kod: "5.1.20.4", metin: "Bölme işlemi sembolünü (÷) kullanır.", duzey: 2 },
              { kod: "5.1.20.5", metin: "Bölme işleminde 1'in rolünü söyler.", duzey: 2 },
              { kod: "5.1.20.6", metin: "100'e kadar olan sayıları 10'a kadar olan sayılara kalansız böler.", duzey: 3 },
              { kod: "5.1.20.7", metin: "100'e kadar olan sayıları 10'a kadar olan sayılara kalanlı böler.", duzey: 3 },
              { kod: "5.1.20.8", metin: "100'e kadar sayılarla birler basamağı sıfır olan bir doğal sayıyı 10'a kısa yoldan böler.", duzey: 3 },
              { kod: "5.1.20.9", metin: "Üç basamaklı doğal sayıları en çok iki basamaklı doğal sayılara böler.", duzey: 4 },
              { kod: "5.1.20.10", metin: "En çok dört basamaklı bir sayıyı, tek basamaklı bir sayıya böler.", duzey: 4 },
              { kod: "5.1.20.11", metin: "Son üç basamağında sıfır olan en çok beş basamaklı doğal sayıları 10, 100 ve 1000'e zihinden böler.", duzey: 4 },
              { kod: "5.1.20.12", metin: "Bir bölme işleminin sonucunu tahmin eder.", duzey: 4 },
              { kod: "5.1.20.13", metin: "Bir bölme işleminin sonucundaki tahmini işlem sonucu ile karşılaştırır.", duzey: 4 },
              { kod: "5.1.20.14", metin: "Çarpma ve bölme arasındaki ilişkiyi söyler.", duzey: 4 },
              { kod: "5.1.20.15", metin: "Aralarında eşitlik ilişkisi olan iki matematiksel ifadeden birinde verilmeyen değeri belirleyerek eşitliğin sağlandığını söyler.", duzey: 4 },
              { kod: "5.1.20.16", metin: "Aralarında eşitlik ilişkisi olmayan iki matematiksel ifadenin eşit olması için yapılması gereken işlemleri açıklar.", duzey: 4 },
            ],
          },
          {
            kod: "5.1.21",
            metin: "Bölme işlemi gerektiren problemleri çözer.",
            hedefDavranislar: [
              { kod: "5.1.21.1", metin: "1-20 arası sayılar kullanılarak 2'ye, 3'e, 4'e, en fazla 5'e bölerek bölme işlemi gerektiren problemleri çözer.", duzey: 2 },
              { kod: "5.1.21.2", metin: "100'e kadar olan sayılarla biri bölme olacak şekilde iki işlem gerektiren problemleri çözer.", duzey: 3 },
              { kod: "5.1.21.3", metin: "100'e kadar olan sayılarla bölme işlemi gerektiren problemler kurar.", duzey: 3 },
              { kod: "5.1.21.4", metin: "En fazla dört basamaklı sayılarla biri bölme olacak şekilde en çok üç işlem gerektiren problemleri çözer.", duzey: 4 },
              { kod: "5.1.21.5", metin: "En fazla dört basamaklı sayılarla biri bölme olacak şekilde iki işlem gerektiren problemler kurar.", duzey: 4 },
            ],
          },
          {
            kod: "5.1.22",
            metin: "Bütün, yarım ve çeyrek modellerini ilişkilendirerek kesir gösterimini kullanır.",
            hedefDavranislar: [
              { kod: "5.1.22.1", metin: "Bütün olan nesneyi/nesne resmini gösterir.", duzey: 1 },
              { kod: "5.1.22.2", metin: "Yarım olan nesneyi/nesne resmini gösterir.", duzey: 1 },
              { kod: "5.1.22.3", metin: "Bir bütünün iki eş parçasından birinin yarım olduğunu söyler.", duzey: 1 },
              { kod: "5.1.22.4", metin: "Bütün ile yarımı ilişkilendirir.", duzey: 1 },
              { kod: "5.1.22.5", metin: "Çeyrek olan nesneyi/nesne resmini gösterir.", duzey: 2 },
              { kod: "5.1.22.6", metin: "Bir bütünün dört eş parçasından birinin çeyrek olduğunu söyler.", duzey: 2 },
              { kod: "5.1.22.7", metin: "Bir yarımın iki eş parçasından birinin çeyrek olduğunu söyler.", duzey: 2 },
              { kod: "5.1.22.8", metin: "Çeyrek ile yarımı ilişkilendirir.", duzey: 2 },
              { kod: "5.1.22.9", metin: "Bir bütünün bir yarım ve iki çeyrekten oluştuğunu söyler.", duzey: 2 },
              { kod: "5.1.22.10", metin: "Bütün, yarım ve çeyrek modellerini kesir biçiminde gösterir.", duzey: 3 },
              { kod: "5.1.22.11", metin: "Yarım, çeyrek, bütünü ifade eden kesri söyler.", duzey: 3 },
              { kod: "5.1.22.12", metin: "Kesrin parça-bütün anlamını söyler.", duzey: 3 },
              { kod: "5.1.22.13", metin: "Bir kesri okur.", duzey: 4 },
            ],
          },
          {
            kod: "5.1.23",
            metin: "Birim kesirlerini ayırt eder.",
            hedefDavranislar: [
              { kod: "5.1.23.1", metin: "Bir bütünün eş parçalarından her birini birim kesir biçiminde gösterir.", duzey: 3 },
              { kod: "5.1.23.2", metin: "Bir bütünün eş parçalarından her birinin birim kesir olduğunu söyler.", duzey: 3 },
              { kod: "5.1.23.3", metin: "Paydası 10, 100 olan kesirlerin birim kesirlerini söyler.", duzey: 3 },
              { kod: "5.1.23.4", metin: "Bir çokluğun belirtilen birim kesir kadarını modelleyerek söyler.", duzey: 3 },
              { kod: "5.1.23.5", metin: "Birim kesirleri büyüklük-küçüklük ilişkisine göre karşılaştırır.", duzey: 4 },
              { kod: "5.1.23.6", metin: "Birim kesirleri büyüklük-küçüklük ilişkisine göre sıralar.", duzey: 4 },
            ],
          },
          {
            kod: "5.1.24",
            metin: "Bileşik ve tam sayılı kesri ayırt eder.",
            hedefDavranislar: [
              { kod: "5.1.24.1", metin: "Payı paydasından büyük kesirleri gösterir.", duzey: 3 },
              { kod: "5.1.24.2", metin: "Basit, bileşik ve tam sayılı kesri modelleyerek söyler.", duzey: 4 },
            ],
          },
          {
            kod: "5.1.25",
            metin: "Bir çokluğun belirtilen basit kesir kadarını söyler.",
            hedefDavranislar: [
              { kod: "5.1.25.1", metin: "Payı paydasından küçük kesirleri modelleyerek söyler.", duzey: 3 },
              { kod: "5.1.25.2", metin: "Bir çokluğun belirtilen basit kesir kadarını modelleyerek söyler.", duzey: 4 },
            ],
          },
          {
            kod: "5.1.26",
            metin: "Kesirleri karşılaştırır.",
            hedefDavranislar: [
              { kod: "5.1.26.1", metin: "Verilen bir kesri sayı doğrusu üzerinde gösterir.", duzey: 3 },
              { kod: "5.1.26.2", metin: "Paydaları eşit olan en çok üç kesri büyüklük-küçüklük ilişkisine göre karşılaştırır.", duzey: 4 },
            ],
          },
          {
            kod: "5.1.27",
            metin: "Paydaları eşit kesirlerle toplama ve çıkarma işlemini yapar.",
            hedefDavranislar: [
              { kod: "5.1.27.1", metin: "Paydaları eşit kesirlerle toplama ve çıkarma işlemi yapar.", duzey: 4 },
              { kod: "5.1.27.2", metin: "Paydaları eşit kesirlerle toplama ve çıkarma işlemi gerektiren problemleri çözer.", duzey: 4 },
            ],
          },
        ],
      },
      {
        kod: "5.2",
        ad: "Geometri",
        saat: 30,
        hedefler: [
          {
            kod: "5.2.1",
            metin: "Geometrik şekil ve cisimleri ayırt eder.",
            hedefDavranislar: [
              { kod: "5.2.1.1", metin: "Geometrik şekilleri köşe ve kenar sayılarına göre sınıflandırarak adlandırır.", duzey: 1 },
              { kod: "5.2.1.2", metin: "Üçgen, kare, dikdörtgen, daire ve çemberi modeller.", duzey: 1 },
              { kod: "5.2.1.3", metin: "Günlük hayatta kullanılan basit cisimleri, özelliklerine göre sınıflandırarak geometrik şekillerle ilişkilendirir.", duzey: 1 },
              { kod: "5.2.1.4", metin: "Üçgen, kare, dikdörtgen, daire ve çemberin benzerlik ve farklılıklarını söyler.", duzey: 2 },
              { kod: "5.2.1.5", metin: "Geometrik cisimleri modeller üstünde ayırt eder.", duzey: 2 },
              { kod: "5.2.1.6", metin: "Gösterilen geometrik cismin adını söyler.", duzey: 2 },
              { kod: "5.2.1.7", metin: "Geometrik cisimlerin yüzlerini, köşelerini, ayrıtlarını söyler.", duzey: 3 },
              { kod: "5.2.1.8", metin: "Küp, kare prizma ve dikdörtgen prizmanın benzerlik ve farklılıklarını söyler.", duzey: 3 },
              { kod: "5.2.1.9", metin: "Cetvel kullanarak kare, dikdörtgen ve üçgen çizer.", duzey: 3 },
              { kod: "5.2.1.10", metin: "Kare ve dikdörtgen üzerinde köşegenleri gösterir.", duzey: 3 },
              { kod: "5.2.1.11", metin: "Şekillerin kenar sayılarına göre isimlendirildiklerini söyler.", duzey: 3 },
              { kod: "5.2.1.12", metin: "Üçgen, kare ve dikdörtgenin kenar ve köşelerini isimlendirir.", duzey: 4 },
              { kod: "5.2.1.13", metin: "Kare ve dikdörtgenin kenar özelliklerini söyler.", duzey: 4 },
              { kod: "5.2.1.14", metin: "Üçgenleri kenar uzunluklarına göre sınıflandırır.", duzey: 4 },
              { kod: "5.2.1.15", metin: "Açınımı verilen küpü oluşturur.", duzey: 4 },
            ],
          },
          {
            kod: "5.2.2",
            metin: "Uzamsal ilişkileri ifade eder.",
            hedefDavranislar: [
              { kod: "5.2.2.1", metin: "Uzamsal (durum, yer, yön) ilişkileri söyler.", duzey: 1 },
              { kod: "5.2.2.2", metin: "Yer, yön ve hareket belirtmek için matematiksel dili kullanır.", duzey: 2 },
              { kod: "5.2.2.3", metin: "Çevresindeki simetrik şekilleri ayırt eder.", duzey: 2 },
              { kod: "5.2.2.4", metin: "Verilen simetrik şekli iki eş parça ayıracak şekilde simetri doğrusu çizer.", duzey: 2 },
              { kod: "5.2.2.5", metin: "Birden fazla simetri doğrusuna sahip şekiller üzerinde simetri doğrularını çizer.", duzey: 3 },
              { kod: "5.2.2.6", metin: "Bir parçası verilen simetrik şekli yatay ya da dikey simetri doğrusuna göre çizerek tamamlar.", duzey: 3 },
              { kod: "5.2.2.7", metin: "Ayna simetrisi verilen şekiller üzerinde simetri doğrusu çizer.", duzey: 4 },
              { kod: "5.2.2.8", metin: "Verilen şeklin doğruya göre simetrisini çizer.", duzey: 4 },
            ],
          },
          {
            kod: "5.2.3",
            metin: "Geometrik örüntüler oluşturur.",
            hedefDavranislar: [
              { kod: "5.2.3.1", metin: "En çok üç ögesi olan örüntüyü geometrik cisim ya da şekillerle oluşturur.", duzey: 1 },
              { kod: "5.2.3.2", metin: "Geometrik şekiller veya geometrik cisme benzeyen nesnelerden oluşan bir örüntüdeki kuralı söyler.", duzey: 1 },
              { kod: "5.2.3.3", metin: "Örüntüde eksik bırakılan ögeleri belirleyerek örüntüyü tamamlar.", duzey: 1 },
              { kod: "5.2.3.4", metin: "Tekrarlayan bir geometrik örüntüde eksik bırakılan ögeleri belirleyerek örüntüyü tamamlar.", duzey: 2 },
              { kod: "5.2.3.5", metin: "Bir geometrik örüntüdeki ilişkiyi kullanarak farklı malzemelerle aynı ilişkiye sahip yeni örüntüler oluşturur.", duzey: 2 },
              { kod: "5.2.3.6", metin: "Şekil modelleri kullanarak noktalı ya da kareli kâğıt üzerine belirli bir örüntüye sahip desen çizer.", duzey: 3 },
            ],
          },
          {
            kod: "5.2.4",
            metin: "Geometride temel kavramları ayırt eder.",
            hedefDavranislar: [
              { kod: "5.2.4.1", metin: "Noktayı sembolle göstererek adlandırır.", duzey: 3 },
              { kod: "5.2.4.2", metin: "Doğruyu, ışını ve açıyı söyler.", duzey: 3 },
              { kod: "5.2.4.3", metin: "Çizgi modelleri ile dikey ve eğik konumlu doğru parçaları oluşturur.", duzey: 3 },
              { kod: "5.2.4.4", metin: "Düzlemi söyler.", duzey: 4 },
              { kod: "5.2.4.5", metin: "Açıyı isimlendirerek sembollerle gösterir.", duzey: 4 },
              { kod: "5.2.4.6", metin: "Açıları standart açı ölçme araçlarıyla ölçerek dar, dik, geniş ve doğru açı olarak belirler.", duzey: 4 },
              { kod: "5.2.4.7", metin: "Standart açı ölçme araçları kullanarak verilen ölçüde açı oluşturur.", duzey: 4 },
            ],
          },
        ],
      },
      {
        kod: "5.3",
        ad: "Ölçme",
        saat: 40,
        hedefler: [
          {
            kod: "5.3.1",
            metin: "Uzunluk ölçer.",
            hedefDavranislar: [
              { kod: "5.3.1.1", metin: "Nesneleri uzunlukları yönünden karşılaştırır.", duzey: 1 },
              { kod: "5.3.1.2", metin: "Nesneleri uzunlukları yönünden sıralar.", duzey: 1 },
              { kod: "5.3.1.3", metin: "Bir uzunluğu ölçmek için standart olmayan uygun ölçme aracını seçer.", duzey: 1 },
              { kod: "5.3.1.4", metin: "Bir uzunluğu ölçmek için standart olmayan ölçme aracı ile ölçme yapar.", duzey: 1 },
              { kod: "5.3.1.5", metin: "Standart olmayan uzunluk birimlerinin kullanıldığı problemleri çözer.", duzey: 1 },
              { kod: "5.3.1.6", metin: "Standart olmayan birimin iki ve dörde bölünmüş parçalarıyla (örneğin bir kalemle, sonra yarısıyla) tekrarlı ölçümler yapar.", duzey: 2 },
              { kod: "5.3.1.7", metin: "Standart uzunluk ölçme birimlerini söyler.", duzey: 2 },
              { kod: "5.3.1.8", metin: "Standart uzunluk ölçme birimlerinin kullanım yerlerini söyler.", duzey: 2 },
              { kod: "5.3.1.9", metin: "Standart uzunluk ölçme birimleri ile ölçerek sonucunu söyler.", duzey: 2 },
              { kod: "5.3.1.10", metin: "Uzunlukları standart ölçü birimleri ile tahmin eder.", duzey: 2 },
              { kod: "5.3.1.11", metin: "Tahmin ettiği uzunluk ile ölçüm sonucunu karşılaştırır.", duzey: 2 },
              { kod: "5.3.1.12", metin: "Standart olan veya olmayan uzunluk ölçme birimleriyle uzunluk modelleri oluşturur.", duzey: 2 },
              { kod: "5.3.1.13", metin: "Standart uzunluk birimlerinin kullanıldığı problemleri çözer.", duzey: 3 },
              { kod: "5.3.1.14", metin: "Bir metre, yarım metre, 10 cm ve 5 cm için standart olmayan ölçme oluşturur.", duzey: 3 },
              { kod: "5.3.1.15", metin: "Bir metre, yarım metre, 10 cm ve 5 cm için oluşturduğu standart olmayan ölçme araçlarını kullanarak ölçme yapar.", duzey: 3 },
              { kod: "5.3.1.16", metin: "Standart ölçme birimlerini ilişkilendirir ve birbiri cinsinden yazar.", duzey: 3 },
              { kod: "5.3.1.17", metin: "Standart ölçü birimlerinden metre ve santimetre ile ilgili en çok iki işlem gerektiren problemleri çözer.", duzey: 3 },
              { kod: "5.3.1.18", metin: "Standart uzunluk ölçmenin en küçük biriminin milimetre olduğunu söyler.", duzey: 4 },
              { kod: "5.3.1.19", metin: "Standart uzunluk ölçmenin en küçük birimi milimetrenin kullanım yerlerini söyler.", duzey: 4 },
              { kod: "5.3.1.20", metin: "Standart uzunluk ölçme birimlerini ilişkilendirir.", duzey: 4 },
              { kod: "5.3.1.21", metin: "Doğrudan ölçebileceği uzunlukları uygun bir birime göre tahminlerde bulunur.", duzey: 4 },
              { kod: "5.3.1.22", metin: "Standart ölçü birimlerinin kullanıldığı problemleri çözer.", duzey: 4 },
            ],
          },
          {
            kod: "5.3.2",
            metin: "Çevre uzunluklarını ölçer.",
            hedefDavranislar: [
              { kod: "5.3.2.1", metin: "Nesnelerin çevrelerini gösterir.", duzey: 3 },
              { kod: "5.3.2.2", metin: "Şekillerin çevre uzunluğunu standart olmayan ve standart birimlerden yararlanarak ölçer.", duzey: 3 },
              { kod: "5.3.2.3", metin: "Şekillerin çevre uzunluğunu hesaplar.", duzey: 3 },
              { kod: "5.3.2.4", metin: "Şekillerin çevre uzunlukları ile ilgili problemleri çözer.", duzey: 3 },
              { kod: "5.3.2.5", metin: "Kare ve dikdörtgenin çevre uzunlukları ile kenar uzunluklarını ilişkilendirir.", duzey: 4 },
              { kod: "5.3.2.6", metin: "Aynı çevre uzunluğuna sahip farklı geometrik şekiller oluşturur.", duzey: 4 },
              { kod: "5.3.2.7", metin: "Şekillerin çevre uzunluklarını hesaplamayla ilgili problemleri çözer.", duzey: 4 },
              { kod: "5.3.2.8", metin: "Şekillerin çevre uzunluklarını hesaplamayla ilgili problemler kurar.", duzey: 4 },
            ],
          },
          {
            kod: "5.3.3",
            metin: "Alan uzunluklarını ölçer.",
            hedefDavranislar: [
              { kod: "5.3.3.1", metin: "Şekillerin alanını standart olmayan uygun malzeme ile kaplayarak ölçer.", duzey: 3 },
              { kod: "5.3.3.2", metin: "Belirli bir alanı, standart olmayan alan ölçme birimleriyle tahmin eder.", duzey: 3 },
              { kod: "5.3.3.3", metin: "Şekillerin alanlarını, bu alanı kaplayan birim karelerin sayısı olduğunu söyler.", duzey: 4 },
              { kod: "5.3.3.4", metin: "Kare ve dikdörtgenin alanını toplama ve çarpma işlemleri ile ilişkilendirir.", duzey: 4 },
            ],
          },
          {
            kod: "5.3.4",
            metin: "Para ile ilgili kavramları ayırt eder.",
            hedefDavranislar: [
              { kod: "5.3.4.1", metin: "1, 5, 10, 25, 50 kuruş ve 1, 5, 10, 20, 50 TL değerindeki paraları ayırt eder.", duzey: 1 },
              { kod: "5.3.4.2", metin: "Kuruş ve lirayı ilişkilendirir.", duzey: 2 },
              { kod: "5.3.4.3", metin: "Değeri 100 lirayı geçmeyecek biçimde farklı miktarlardaki paraları büyüklük-küçüklük bakımından karşılaştırır.", duzey: 2 },
              { kod: "5.3.4.4", metin: "Paralar ile ilgili problemleri çözer.", duzey: 2 },
              { kod: "5.3.4.5", metin: "Kuruş ve lirayı ilişkilendirir.", duzey: 3 },
              { kod: "5.3.4.6", metin: "Paralar ile ilgili problemleri çözer.", duzey: 3 },
              { kod: "5.3.4.7", metin: "Paralar ile ilgili problemler kurar.", duzey: 3 },
            ],
          },
          {
            kod: "5.3.5",
            metin: "Zaman ile ilgili kavramları ayırt eder.",
            hedefDavranislar: [
              { kod: "5.3.5.1", metin: "Tam saatleri okur.", duzey: 1 },
              { kod: "5.3.5.2", metin: "Yarım saatleri okur.", duzey: 1 },
              { kod: "5.3.5.3", metin: "Takvim üzerinde günü, haftayı ve ayı belirtir.", duzey: 1 },
              { kod: "5.3.5.4", metin: "Belirli olayları ve durumları referans alarak zamansal sıralamalar yapar.", duzey: 1 },
              { kod: "5.3.5.5", metin: "Çeyrek saatleri okur.", duzey: 2 },
              { kod: "5.3.5.6", metin: "Zaman ölçme birimlerini ilişkilendirir.", duzey: 2 },
              { kod: "5.3.5.7", metin: "Zaman ölçme birimleriyle ilgili problemleri çözer.", duzey: 2 },
              { kod: "5.3.5.8", metin: "Zamanı dakika ve saat cinsinden söyler.", duzey: 3 },
              { kod: "5.3.5.9", metin: "Zaman ölçme birimlerini ilişkilendirir.", duzey: 3 },
              { kod: "5.3.5.10", metin: "Olayların oluş sürelerini karşılaştırır.", duzey: 3 },
              { kod: "5.3.5.11", metin: "Zaman ölçme birimlerinin kullanıldığı problemleri çözer.", duzey: 3 },
              { kod: "5.3.5.12", metin: "Zaman ölçme birimlerini ilişkilendirir.", duzey: 4 },
              { kod: "5.3.5.13", metin: "Zaman ölçme birimlerinin kullanıldığı problemleri çözer.", duzey: 4 },
              { kod: "5.3.5.14", metin: "Zaman ölçme birimlerinin kullanıldığı problemler kurar.", duzey: 4 },
            ],
          },
          {
            kod: "5.3.6",
            metin: "Tartma ile ilgili kavramları ayırt eder.",
            hedefDavranislar: [
              { kod: "5.3.6.1", metin: "Nesneleri kütleleri yönünden karşılaştırır.", duzey: 1 },
              { kod: "5.3.6.2", metin: "Nesneleri kütleleri yönünden sıralar.", duzey: 1 },
              { kod: "5.3.6.3", metin: "Nesneleri standart araçlar kullanarak kilogram cinsinden tartarak karşılaştırır.", duzey: 2 },
              { kod: "5.3.6.4", metin: "Kütle ölçme birimiyle ilgili problemleri çözer.", duzey: 2 },
              { kod: "5.3.6.5", metin: "Nesneleri gram/kilogram cinsinden ölçer.", duzey: 3 },
              { kod: "5.3.6.6", metin: "Bir nesnenin kütlesini tahmin eder.", duzey: 3 },
              { kod: "5.3.6.7", metin: "Ölçme yaparak tahmin ettiği kütlenin doğruluğunu kontrol eder.", duzey: 3 },
              { kod: "5.3.6.8", metin: "Kilogramla/gramla ilgili problemleri çözer.", duzey: 3 },
              { kod: "5.3.6.9", metin: "Yarım ve çeyrek kilogramı gram cinsinden ifade eder.", duzey: 4 },
              { kod: "5.3.6.10", metin: "Kilogram ve gramı kütle ölçerken birlikte kullanır.", duzey: 4 },
              { kod: "5.3.6.11", metin: "Ton ve miligramın kullanıldığı yerleri söyler.", duzey: 4 },
              { kod: "5.3.6.12", metin: "Ton-kilogram, kilogram-gram, gram-miligram birimlerini ilişkilendirir.", duzey: 4 },
              { kod: "5.3.6.13", metin: "Kilogram-gram, gram-miligram birbirine dönüştürür.", duzey: 4 },
              { kod: "5.3.6.14", metin: "Ton, kilogram, gram ve miligram ile ilgili problemleri çözer.", duzey: 4 },
              { kod: "5.3.6.15", metin: "Ton, kilogram, gram ve miligram ile ilgili problemler kurar.", duzey: 4 },
            ],
          },
          {
            kod: "5.3.7",
            metin: "Sıvıları ölçer.",
            hedefDavranislar: [
              { kod: "5.3.7.1", metin: "Standart olmayan birimleri kullanarak sıvıları ölçer.", duzey: 1 },
              { kod: "5.3.7.2", metin: "En az üç özdeş kaptaki sıvı miktarını karşılaştırır.", duzey: 1 },
              { kod: "5.3.7.3", metin: "En az üç özdeş kaptaki sıvı miktarını sıralar.", duzey: 1 },
              { kod: "5.3.7.4", metin: "Standart olmayan sıvı ölçme birimlerini kullanarak sıvıların miktarını ölçerek karşılaştırır.", duzey: 2 },
              { kod: "5.3.7.5", metin: "Standart olmayan sıvı ölçme birimleriyle ilgili problemleri çözer.", duzey: 2 },
              { kod: "5.3.7.6", metin: "Standart sıvı ölçme araç ve birimlerinin gerekliliğini açıklayarak litre veya yarım litre birimleriyle ölçme yapar.", duzey: 3 },
              { kod: "5.3.7.7", metin: "Bir kaptaki sıvının miktarını litre ve yarım litre birimleriyle tahmin eder.", duzey: 3 },
              { kod: "5.3.7.8", metin: "Ölçme yaparak tahmin ettiği sıvı miktarının doğruluğunu kontrol eder.", duzey: 3 },
              { kod: "5.3.7.9", metin: "Litre ile ilgili problemleri çözer.", duzey: 3 },
              { kod: "5.3.7.10", metin: "Mililitrenin kullanım alanlarını söyler.", duzey: 4 },
              { kod: "5.3.7.11", metin: "Litre ve mililitreyi ilişkilendirerek birbirine dönüştürür.", duzey: 4 },
              { kod: "5.3.7.12", metin: "Litre ve mililitreyi miktar belirtmek için bir arada kullanır.", duzey: 4 },
              { kod: "5.3.7.13", metin: "Bir kaptaki sıvının miktarını litre/mililitre birimleriyle tahmin eder.", duzey: 4 },
              { kod: "5.3.7.14", metin: "Tahmin ettiği sıvının miktarını ölçme yaparak kontrol eder.", duzey: 4 },
              { kod: "5.3.7.15", metin: "Litre ve mililitre ile ilgili problemleri çözer.", duzey: 4 },
              { kod: "5.3.7.16", metin: "Litre ve mililitre ile ilgili problemler kurar.", duzey: 4 },
            ],
          },
        ],
      },
      {
        kod: "5.4",
        ad: "Veri İşleme",
        saat: 20,
        hedefler: [
          {
            kod: "5.4.1",
            metin: "Basit tabloları, grafikleri inceleyerek yorum ve tahminlerde bulunur.",
            hedefDavranislar: [
              { kod: "5.4.1.1", metin: "Sembol, rakam kullanılarak oluşturulmuş basit tabloları okur.", duzey: 1 },
              { kod: "5.4.1.2", metin: "En çok iki veri grubuna sahip basit tabloları okur.", duzey: 1 },
              { kod: "5.4.1.3", metin: "Oluşturduğu en çok iki veri grubuna sahip basit tablolarla ilgili sorulan sorulara cevap verir.", duzey: 2 },
              { kod: "5.4.1.4", metin: "Şekil ve nesne grafiğini açıklayarak grafikten çeteleye/sıklık tablosuna dönüşümler yapar.", duzey: 3 },
              { kod: "5.4.1.5", metin: "En çok üç veri grubuna sahip basit tabloları okur.", duzey: 3 },
              { kod: "5.4.1.6", metin: "Sütun grafiğini inceleyerek yorum ve tahminlerde bulunur.", duzey: 4 },
            ],
          },
          {
            kod: "5.4.2",
            metin: "Çetele, sıklık tablosu, nesne, şekil ve sütun grafiği oluşturur.",
            hedefDavranislar: [
              { kod: "5.4.2.1", metin: "Resimli davranışı/etkinlik tablolarını sembol kullanarak doldurur.", duzey: 1 },
              { kod: "5.4.2.2", metin: "Resimli davranışı/etkinlik tablolarını rakam kullanarak doldurur.", duzey: 1 },
              { kod: "5.4.2.3", metin: "Herhangi bir problem ya da bir konuda sorular sorarak veri toplar, sınıflandırır, ağaç şeması, çetele veya sıklık tablosu şeklinde düzenler.", duzey: 2 },
              { kod: "5.4.2.4", metin: "Oluşturduğu en çok iki veri grubuna sahip ağaç şeması, çetele, sıklık tablosu ile ilgili sorulan sorulara cevap verir.", duzey: 2 },
              { kod: "5.4.2.5", metin: "Herhangi bir problem ya da bir konuda sorarak veri toplar, sınıflandırır, nesne ve şekil grafiği oluşturur.", duzey: 2 },
              { kod: "5.4.2.6", metin: "Oluşturduğu en çok iki veri grubuna sahip nesne ve şekil grafiği ile ilgili sorulan sorulara cevap verir.", duzey: 2 },
              { kod: "5.4.2.7", metin: "Herhangi bir problem ya da bir konuda sorarak topladığı verilere uygun sütun grafiği oluşturur.", duzey: 4 },
              { kod: "5.4.2.8", metin: "Elde ettiği veriyi sunmak amacıyla farklı gösterimler kullanır.", duzey: 4 },
              { kod: "5.4.2.9", metin: "Sütun grafiği, tablo ve diğer grafiklere göre tahminlerde bulunur.", duzey: 4 },
            ],
          },
          {
            kod: "5.4.3",
            metin: "Sütun grafiği, tablo ve diğer grafiklerle gösterilen bilgileri kullanarak günlük hayatla ilgili problemleri çözer.",
            hedefDavranislar: [
              { kod: "5.4.3.1", metin: "Verilen grafikleri kullanarak toplama/çıkarma işlemi gerektiren problemleri çözer.", duzey: 3 },
              { kod: "5.4.3.2", metin: "Problemde verilen bilgileri kullanarak grafik oluşturur.", duzey: 3 },
              { kod: "5.4.3.3", metin: "Oluşturduğu grafikleri kullanarak toplama/çıkarma işlemi gerektiren problemleri çözer.", duzey: 3 },
              { kod: "5.4.3.4", metin: "Grafiklerden yararlanarak toplama/çıkarma işlemleri gerektiren problemleri çözer.", duzey: 4 },
              { kod: "5.4.3.5", metin: "Sütun grafiği, tablo ve diğer grafikleri problem çözümünde kullanır.", duzey: 4 },
            ],
          },
        ],
      },
    ],
  },
  {
    no: 6,
    ad: "Sosyal Etkileşim",
    amac:
      "Öğrenme güçlüğü olan bireylerin sözel olmayan iletişim, kişiler arası ilişkiler ve duygu/davranış düzenleme becerilerinin geliştirilmesi amaçlanmaktadır.",
    saat: 100,
    bolumler: [
      {
        kod: "6.1",
        ad: "Sözel Olmayan İletişim",
        saat: 35,
        hedefler: [
          {
            kod: "6.1.1",
            metin: "Temel duyguları ayırt eder.",
            hedefDavranislar: [
              { kod: "6.1.1.1", metin: "Görselde verilen yüz ifadelerini içeren duygunun adını söyler." },
              { kod: "6.1.1.2", metin: "Yaşadığı olaylar sonucunda hissettiği duyguyu söyler." },
              { kod: "6.1.1.3", metin: "Örnek olaylarda/sosyal hikâyelerde verilmek istenen duyguyu söyler." },
              { kod: "6.1.1.4", metin: "Ses tonu ve vurgulamalarla ifade edilen duyguyu söyler." },
            ],
          },
          {
            kod: "6.1.2",
            metin: "İletişimde bulunurken jest, mimik, vurgu ve tonlamaları kullanır.",
            hedefDavranislar: [
              { kod: "6.1.2.1", metin: "Karşısındaki kişinin duygu durumuna uygun jest, mimik, vurgu ve tonlamalar kullanır." },
              { kod: "6.1.2.2", metin: "Ortama uygun jest, mimik, vurgu ve tonlamalar kullanır." },
            ],
          },
          {
            kod: "6.1.3",
            metin: "Karmaşık duyguları ayırt eder.",
            hedefDavranislar: [
              { kod: "6.1.3.1", metin: "Yaşadığı olaylar sonucunda hissettiği duyguyu söyler." },
              { kod: "6.1.3.2", metin: "Örnek olaylar/sosyal hikâyelerde verilmek istenen duyguyu söyler." },
            ],
          },
        ],
      },
      {
        kod: "6.2",
        ad: "Kişiler Arası İlişkiler",
        saat: 35,
        hedefler: [
          {
            kod: "6.2.1",
            metin: "İletişim kurar.",
            hedefDavranislar: [
              { kod: "6.2.1.1", metin: "Biriyle karşılaştığında selamlaşma sözcüklerini kullanır." },
              { kod: "6.2.1.2", metin: "Konuşan kişiyi göz kontağı kurarak dinler." },
              { kod: "6.2.1.3", metin: "Kendisine yöneltilen sorulara uygun cevaplar verir." },
              { kod: "6.2.1.4", metin: "Karşısındaki kişiyle konuşulan konu ile ilgili sorular sorar." },
              { kod: "6.2.1.5", metin: "Karşısındaki kişi ile aynı konu üzerinde sohbet eder." },
            ],
          },
          {
            kod: "6.2.2",
            metin: "İletişim sırasında karşılaştığı durumlara uygun davranır.",
            hedefDavranislar: [
              { kod: "6.2.2.1", metin: "Hoşuna giden durumlarda hoşnutluğunu belirten davranışlar gösterir." },
              { kod: "6.2.2.2", metin: "Hoşuna gitmeyen bir durumla karşılaştığında hoşnutsuzluğunu belirten davranışlar gösterir." },
            ],
          },
          {
            kod: "6.2.3",
            metin: "Kişiler arası ilişkilerde ortaya çıkan problemi çözer.",
            hedefDavranislar: [
              { kod: "6.2.3.1", metin: "Problemi tanımlar." },
              { kod: "6.2.3.2", metin: "Olası çözümleri söyler." },
              { kod: "6.2.3.3", metin: "En iyi çözümü seçer." },
              { kod: "6.2.3.4", metin: "Çözümü uygular." },
              { kod: "6.2.3.5", metin: "Çözümü değerlendirir." },
            ],
          },
          {
            kod: "6.2.4",
            metin: "Oyunu kurallarına uyarak oynar.",
            hedefDavranislar: [
              { kod: "6.2.4.1", metin: "Oyunun kurallarını söyler." },
              { kod: "6.2.4.2", metin: "Oyunda sırasını bekler." },
              { kod: "6.2.4.3", metin: "Sırası geldiğinde oyunun kuralına uygun davranır." },
              { kod: "6.2.4.4", metin: "Oyunda iş birliği yapar." },
              { kod: "6.2.4.5", metin: "Oyunun sonucuna uygun tepkiler verir." },
            ],
          },
          {
            kod: "6.2.5",
            metin: "Bir etkinlik bağlamında etkileşime girer.",
            hedefDavranislar: [
              { kod: "6.2.5.1", metin: "Etkinliğe katılmak istediğini belirtir." },
              { kod: "6.2.5.2", metin: "Etkinlikte görev alır." },
              { kod: "6.2.5.3", metin: "Etkinliği sürdürür." },
              { kod: "6.2.5.4", metin: "Gerektiğinde iş birliği yapar." },
            ],
          },
        ],
      },
      {
        kod: "6.3",
        ad: "Duygu ve Davranış Düzenleme",
        saat: 30,
        hedefler: [
          {
            kod: "6.3.1",
            metin: "Yaşadığı duyguya uygun tepkiler verir.",
            hedefDavranislar: [
              { kod: "6.3.1.1", metin: "Öfkelendiğinde kendini sakinleştirir." },
              { kod: "6.3.1.2", metin: "Hayal kırıklığı yaşadığında hayal kırıklığı ile baş edecek teknikler kullanır." },
              { kod: "6.3.1.3", metin: "Kaygılandığında kaygısıyla baş edecek teknikler kullanır." },
              { kod: "6.3.1.4", metin: "Üzüldüğünde üzüntüsüyle baş edecek teknikler kullanır." },
              { kod: "6.3.1.5", metin: "Mutlu olduğunda aşırı tepkilerini kontrol eder." },
            ],
          },
          {
            kod: "6.3.2",
            metin: "Davranışını sonuçlarına göre düzenler.",
            hedefDavranislar: [
              { kod: "6.3.2.1", metin: "Davranışlarının olası sonuçlarını söyler." },
              { kod: "6.3.2.2", metin: "Davranışlarını olası sonuçlara göre düzenler." },
              { kod: "6.3.2.3", metin: "Davranışın sonucunda karşılaştığı durumlarla baş eder." },
            ],
          },
        ],
      },
    ],
  },
];

/* ——— Yardımcılar: cascading seçici + prompt projeksiyonu ——— */

/** Modülü numarasıyla bulur. */
export function mebModul(no: number): MebModul | undefined {
  return MEB_MODULLER.find((m) => m.no === no);
}

/** Bölümü koduyla bulur (ör. "6.1"). */
export function mebBolum(bolumKod: string): MebBolum | undefined {
  const modulNo = Number(bolumKod.split(".")[0]);
  return mebModul(modulNo)?.bolumler.find((b) => b.kod === bolumKod);
}

/** Hedefi koduyla bulur (ör. "6.1.1"). */
export function mebHedef(hedefKod: string): MebHedef | undefined {
  const bolumKod = hedefKod.split(".").slice(0, 2).join(".");
  return mebBolum(bolumKod)?.hedefler.find((h) => h.kod === hedefKod);
}

/** Seçilen hedefi okunur Türkçe etikete çevirir: "Modül › Bölüm › Hedef". */
export function mebHedefEtiketi(hedefKod: string): string {
  const m = mebModul(Number(hedefKod.split(".")[0]));
  const b = mebBolum(hedefKod.split(".").slice(0, 2).join("."));
  const h = mebHedef(hedefKod);
  return m && b && h ? `${m.ad} › ${b.ad} › ${h.metin}` : hedefKod;
}

export interface MebHedefSecimi {
  hedefKod: string;
  /** İşaretli hedef davranış kodları (opsiyonel — 4. seviye checklist). Boşsa hepsi alınır. */
  davranisKodlari?: string[];
}

/** Seçimi prompt'a gömülecek Türkçe MEB hedef bloğuna çevirir (geçersizse null). */
export function mebToPrompt(sel: MebHedefSecimi): string | null {
  const h = mebHedef(sel.hedefKod);
  if (!h) return null;
  const secili =
    sel.davranisKodlari && sel.davranisKodlari.length
      ? h.hedefDavranislar.filter((d) => sel.davranisKodlari!.includes(d.kod))
      : h.hedefDavranislar;

  const satirlar = [`- MEB hedef alanı: ${mebHedefEtiketi(sel.hedefKod)} (${h.kod})`];
  if (secili.length) {
    satirlar.push("- Odaklanılacak hedef davranışlar:");
    for (const d of secili) satirlar.push(`  • ${d.kod} ${d.metin}`);
  }
  return satirlar.join("\n");
}
