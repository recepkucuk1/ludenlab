// @ts-nocheck
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Veri ────────────────────────────────────────────────────────────────────

const CURRICULA = [
  {
    code: "1.1",
    area: "speech",
    title: "Kekemelik",
    goals: [
      {
        code: "1.0",
        title: "Konuşma sırasında nefes kontrolünü sağlar",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Konuşmaya başlamadan önce nefes alır" },
          { code: "1.2", title: "Nefes verirken konuşur" },
        ],
      },
      {
        code: "2.0",
        title: "Konuşma prozodisini ayarlayarak konuşur",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Konuşma sırasında uygun yerlerde vurgu yapar" },
          { code: "2.2", title: "Konuşma sırasında ses tonundaki iniş-çıkışları uygun şekilde ayarlar" },
          { code: "2.3", title: "Konuşma sırasında uygun hızla konuşur" },
        ],
      },
      {
        code: "3.0",
        title: "Akıcı konuşur",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Heceleri akıcı söyler" },
          { code: "3.2", title: "Giderek artan uzunluktaki sözcükleri akıcı söyler" },
          { code: "3.3", title: "Sözcük gruplarını akıcı söyler" },
          { code: "3.4", title: "Cümle düzeyinde akıcı konuşur" },
        ],
      },
      {
        code: "4.0",
        title: "Akıcı okur",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "Heceleri akıcı okur" },
          { code: "4.2", title: "Giderek artan uzunluktaki sözcükleri akıcı okur" },
          { code: "4.3", title: "Sözcük gruplarını akıcı okur" },
          { code: "4.4", title: "Cümleleri akıcı okur" },
        ],
      },
      {
        code: "5.0",
        title: "Akıcı konuşmayı farklı kişi, ortam ve durumlara geneller",
        isMainGoal: true,
        sub: [
          { code: "5.1", title: "Farklı kişilerle akıcı konuşur" },
          { code: "5.2", title: "Farklı ortamlarda akıcı konuşur" },
          { code: "5.3", title: "Farklı durumlarda akıcı konuşur" },
        ],
      },
      {
        code: "6.0",
        title: "Kekemeliğine yönelik olumsuz duygusal tepkileriyle başa çıkar",
        isMainGoal: true,
        sub: [
          { code: "6.1", title: "Kekemelik davranışlarını tanımlar" },
          { code: "6.2", title: "Kekemelik davranışlarını taklit eder" },
          { code: "6.3", title: "Terapistle konuşurken kekelediğinde olumsuz duygularına rağmen konuşmasını sürdürür" },
          { code: "6.4", title: "Farklı kişilerle konuşurken kekelediğinde olumsuz duygularına rağmen konuşmasını sürdürür" },
          { code: "6.5", title: "Farklı ortamlarda konuşurken kekelediğinde olumsuz duygularına rağmen konuşmasını sürdürür" },
          { code: "6.6", title: "Farklı durumlarda konuşurken kekelediğinde olumsuz duygularına rağmen konuşmasını sürdürür" },
        ],
      },
    ],
  },
  {
    code: "2.1",
    area: "language",
    title: "Söz Öncesi Dönemi",
    goals: [
      {
        code: "1.0",
        title: "Göz kontağı kurar",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Karşısındaki kişinin yüzüne kısa süreli bakar" },
          { code: "1.2", title: "Konuşan kişinin ağzını ve yüzünü izleyerek göz kontağı kurar" },
          { code: "1.3", title: "Adı söylendiğinde kişi ile göz kontağı kurar" },
        ],
      },
      {
        code: "2.0",
        title: "Ortak dikkat kurar",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Dikkatini karşısındaki bireye veya nesneye yöneltir" },
          { code: "2.2", title: "Yetişkinle birlikte nesne veya resimlere bakar" },
          { code: "2.3", title: "Parmakla gösterilen nesneye/resme bakar" },
          { code: "2.4", title: "Çevresinde gördüğü nesneleri işaret ederek yetişkine gösterir" },
        ],
      },
      {
        code: "3.0",
        title: "Sıra alır",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Oyun ortamında yetişkinin hareketini izledikten sonra aynı hareketi yaparak sıra alır" },
          { code: "3.2", title: "Oyun ortamında yetişkini dinledikten sonra aynı sesi çıkararak sıra alır" },
          { code: "3.3", title: "Oyun oynarken sırasını bekler" },
        ],
      },
      {
        code: "4.0",
        title: "Taklit yapar",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "Vücut hareketlerini taklit eder" },
          { code: "4.2", title: "Nesne kullanarak taklit yapar" },
          { code: "4.3", title: "Ağız ve yüz hareketlerini taklit eder" },
          { code: "4.4", title: "Çevresel sesleri taklit eder" },
          { code: "4.5", title: "Konuşma seslerini taklit eder" },
          { code: "4.6", title: "Heceleri taklit eder" },
        ],
      },
      {
        code: "5.0",
        title: "Günlük hayatında yer alan sözcük ve cümlelerin anlamları arasında ilişki kurar",
        isMainGoal: true,
        sub: [
          { code: "5.1", title: "Adı söylenen nesneyi/nesne resmini gösterir" },
          { code: "5.2", title: "Söylenen eylemin resmini gösterir" },
          { code: "5.3", title: "Söylenen eylemin nasıl yapıldığını gösterir" },
          { code: "5.4", title: "Söylenen vücut bölümünü gösterir" },
          { code: "5.5", title: "Yetişkinin kullandığı cümlelerin anlamını kavrayarak bağlama uygun tepkiler verir" },
        ],
      },
      {
        code: "6.0",
        title: "Yönergeleri yerine getirir",
        isMainGoal: true,
        sub: [
          { code: "6.1", title: "Jestlerle birlikte verilen tek eylem içeren yönergeleri yerine getirir" },
          { code: "6.2", title: "Tek eylem içeren yönergeleri yerine getirir" },
          { code: "6.3", title: "İstendiğinde tanıdığı/bildiği bir nesneyi başka bir odadan getirir" },
        ],
      },
      {
        code: "7.0",
        title: "İletişim amaçlı jest kullanır",
        isMainGoal: true,
        sub: [
          { code: "7.1", title: "Dikkat çekme amaçlı jest kullanır" },
          { code: "7.2", title: "Nesne isteme amaçlı jest kullanır" },
          { code: "7.3", title: "Eylem isteme amaçlı jest kullanır" },
          { code: "7.4", title: "Bilgi isteme amaçlı jest kullanır" },
          { code: "7.5", title: "Reddetme amaçlı jest kullanır" },
          { code: "7.6", title: "Selam verme amaçlı jest kullanır" },
          { code: "7.7", title: "Sosyal düzenleme amaçlı jest kullanır" },
          { code: "7.8", title: "Sosyal oyun amaçlı jest kullanır" },
        ],
      },
      {
        code: "8.0",
        title: "Oyun oynar",
        isMainGoal: true,
        sub: [
          { code: "8.1", title: "Keşfetme amaçlı oyun oynar" },
          { code: "8.2", title: "İlişkisel oyun oynar" },
          { code: "8.3", title: "İşlevsel oyun oynar" },
          { code: "8.4", title: "Bir nesneyi başka bir nesne imiş gibi kullanarak oyun oynar (oto-sembolik oyun)" },
          { code: "8.5", title: "Tek aşamalı sembolik oyun oynar" },
          { code: "8.6", title: "Birleştirilmiş sembolik oyun oynar" },
          { code: "8.7", title: "Planlanmış sembolik oyun oynar" },
        ],
      },
    ],
  },
  {
    code: "2.2",
    area: "language",
    title: "Söz Dönemi",
    goals: [
      {
        code: "1.0",
        title: "Sözcükleri farklı durumda/bağlamda ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Söylenen aile üyesine bakar/aile üyesini gösterir" },
          { code: "1.2", title: "Adı sorulduğunda kendini gösterir" },
          { code: "1.3", title: "Günlük yaşantısında sık karşılaştığı sözcüklerin temsil ettiği nesneleri/resimleri gösterir" },
          { code: "1.4", title: "Söylenen eylemi resim üzerinde gösterir" },
          { code: "1.5", title: "Söylenen eylemin nasıl yapıldığını hareketleriyle gösterir" },
        ],
      },
      {
        code: "2.0",
        title: "Sözcükler arası ilişkileri temsil eden nesneyi/resmi gösterir",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Zıt anlamlı sözcüklere uygun olan nesneyi/resmi gösterir" },
          { code: "2.2", title: "Zaman bildiren sözcüklere uygun olan resmi gösterir" },
          { code: "2.3", title: "Yer-yön-durum bildiren sözcüklere uygun olan resmi gösterir" },
          { code: "2.4", title: "Nesneleri/resimleri kategorilerine göre gruplandırır" },
        ],
      },
      {
        code: "3.0",
        title: "Sıralı yönergeleri yerine getirir",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "İki eylem içeren sıralı yönergeleri yerine getirir" },
          { code: "3.2", title: "Üç eylem içeren sıralı yönergeleri yerine getirir" },
        ],
      },
      {
        code: "4.0",
        title: "Tek sözcüklü ifadelerle iletişim kurar",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "Dikkat çekme amaçlı tek sözcük kullanır" },
          { code: "4.2", title: "Nesne talep etme amaçlı tek sözcük kullanır" },
          { code: "4.3", title: "Eylem talep etme amaçlı tek sözcük kullanır" },
          { code: "4.4", title: "Nesneleri reddetme amaçlı tek sözcük kullanır" },
          { code: "4.5", title: "Eylemleri reddetme amaçlı tek sözcük kullanır" },
          { code: "4.6", title: "Selam verme amaçlı tek sözcük kullanır" },
        ],
      },
      {
        code: "5.0",
        title: "İki sözcükten oluşan ifadelerle iletişim kurar",
        isMainGoal: true,
        sub: [
          { code: "5.1", title: "Özne ve nesneden oluşan sözcük öbeklerini kullanır" },
          { code: "5.2", title: "Özne ve eylemden oluşan sözcük öbeklerini kullanır" },
          { code: "5.3", title: "Nesne ve eylemden oluşan sözcük öbeklerini kullanır" },
          { code: "5.4", title: "Sıfat içeren sözcük öbeklerini kullanır" },
          { code: "5.5", title: "Belirteç içeren sözcük öbekleri kullanır" },
          { code: "5.6", title: "Adılları içeren sözcük öbeklerini kullanır" },
          { code: "5.7", title: "İlgeç içeren sözcük öbeklerini kullanır" },
          { code: "5.8", title: "Basit yapıda soru sorar" },
        ],
      },
      {
        code: "6.0",
        title: "Üç veya daha fazla sözcükten oluşan ifadelerle iletişim kurar",
        isMainGoal: true,
        sub: [
          { code: "6.1", title: "Basit ifadeler kullanır" },
          { code: "6.2", title: "Karmaşık ifadeler kullanır" },
          { code: "6.3", title: "Soru sorar" },
        ],
      },
      {
        code: "7.0",
        title: "Yetişkin/akranı ile sohbet eder",
        isMainGoal: true,
        sub: [
          { code: "7.1", title: "Yetişkinin/akranının sohbet başlatma girişimine karşılık verir" },
          { code: "7.2", title: "Yetişkin/akranı ile başlatılan sohbeti sürdürür" },
          { code: "7.3", title: "Yetişkin/akranı ile sohbet sırasında sıra alır" },
          { code: "7.4", title: "Yetişkin/akranı ile sohbet başlatır" },
          { code: "7.5", title: "Yetişkin/akranı ile sohbeti bitirir" },
        ],
      },
      {
        code: "8.0",
        title: "Sohbet sırasında sorulan soruları yanıtlar",
        isMainGoal: true,
        sub: [
          { code: "8.1", title: "Cevabı Evet/Hayır olan sorulara yanıt verir" },
          { code: "8.2", title: "5N1K sorularına yanıt verir" },
          { code: "8.3", title: "Mantık yürütme sorularına yanıt verir" },
          { code: "8.4", title: "Tahmin etme sorularına yanıt verir" },
          { code: "8.5", title: "Yansıtma sorularına yanıt verir" },
        ],
      },
      {
        code: "9.0",
        title: "Soru sorar",
        isMainGoal: true,
        sub: [
          { code: "9.1", title: "Yanıtı evet/hayır olan sorular sorar" },
          { code: "9.2", title: "5N1K soruları sorar" },
        ],
      },
    ],
  },
  {
    code: "3.1",
    area: "acquired_language",
    title: "Afazi",
    goals: [
      {
        code: "1.0",
        title: "İşitsel anlama gerektiren görevleri yerine getirir",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Söylenen komutları yerine getirir" },
          { code: "1.2", title: "İşlevi söylenen nesnenin resmini gösterir" },
          { code: "1.3", title: "Söylenen bir kategoriye ait resmi gösterir" },
          { code: "1.4", title: "Söylenen sözcüklere ait resimleri gösterir" },
          { code: "1.5", title: "Söylenen sözcük öbeklerine ait resimleri gösterir" },
          { code: "1.6", title: "Söylenen basit cümleleri resimleriyle eşler" },
          { code: "1.7", title: "Söylenen karmaşık cümleleri resimleriyle eşler" },
          { code: "1.8", title: "Basit evet-hayır sorularına doğru yanıt verir" },
        ],
      },
      {
        code: "2.0",
        title: "Söylenen ifadeleri tekrar eder",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Söylenen sözcükleri tekrarlar" },
          { code: "2.2", title: "Söylenen sözcük öbeklerini tekrarlar" },
          { code: "2.3", title: "Söylenen cümleleri tekrarlar" },
        ],
      },
      {
        code: "3.0",
        title: "Kendisine yöneltilen sorulara uygun konuşma uzunluğuyla yanıt verir",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Kendisine yönelik bilgi içeren sorulara uygun konuşma uzunluğuyla yanıt verir" },
          { code: "3.2", title: "Çevresine yönelik bilgi içeren sorulara uygun konuşma uzunluğuyla yanıt verir" },
        ],
      },
      {
        code: "4.0",
        title: "Otomatik konuşma ile ilgili görevleri yerine getirir",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "İstenilen sayıya kadar ritmik sayar" },
          { code: "4.2", title: "Haftanın günlerini doğru sırayla sayar" },
          { code: "4.3", title: "Yılın aylarını doğru sırayla sayar" },
          { code: "4.4", title: "Alfabenin harflerini doğru sırayla sayar" },
        ],
      },
      {
        code: "5.0",
        title: "Adlandırma gerektiren görevleri yerine getirir",
        isMainGoal: true,
        sub: [
          { code: "5.1", title: "Verilen bir kategoriye ait sözcükleri sıralar" },
          { code: "5.2", title: "Gösterilen nesne/nesne resmini adlandırır" },
          { code: "5.3", title: "Sorulan sorulara isim/eylem kullanarak yanıt verir" },
        ],
      },
      {
        code: "6.0",
        title: "Okuduğunu anlama gerektiren görevleri yerine getirir",
        isMainGoal: true,
        sub: [
          { code: "6.1", title: "Yazılı olarak verilen komutları yerine getirir" },
          { code: "6.2", title: "Yazılı olarak verilen sözcükleri resimleri ile eşler" },
          { code: "6.3", title: "Yazılı olarak verilen sözcük öbeklerini resimleri ile eşler" },
          { code: "6.4", title: "Yazılı olarak verilen cümleleri resimleri ile eşler" },
          { code: "6.5", title: "Okuduğu metinle ilgili sorulan soruları yanıtlar" },
        ],
      },
      {
        code: "7.0",
        title: "Sesli okuma gerektiren görevleri yerine getirir",
        isMainGoal: true,
        sub: [
          { code: "7.1", title: "Yazılı olarak verilen sayıları okur" },
          { code: "7.2", title: "Yazılı olarak verilen harfleri okur" },
          { code: "7.3", title: "Yazılı olarak verilen sözcükleri okur" },
          { code: "7.4", title: "Yazılı olarak verilen sözcük öbeklerini okur" },
          { code: "7.5", title: "Yazılı olarak verilen cümleleri okur" },
          { code: "7.6", title: "Yazılı olarak verilen metni okur" },
        ],
      },
      {
        code: "8.0",
        title: "Yazma gerektiren görevleri yerine getirir",
        isMainGoal: true,
        sub: [
          { code: "8.1", title: "Sorulan soruların yanıtlarını yazar" },
          { code: "8.2", title: "Söylenen sayıları (rakamla) yazar" },
          { code: "8.3", title: "Söylenen harfleri yazar" },
          { code: "8.4", title: "Söylenen sözcükleri doğru olarak yazar" },
          { code: "8.5", title: "Söylenen cümleleri doğru olarak yazar" },
          { code: "8.6", title: "Yazılı olarak verilen sözcükleri bakarak yazar" },
          { code: "8.7", title: "Yazılı olarak verilen sözcük öbeklerini bakarak yazar" },
          { code: "8.8", title: "Yazılı olarak verilen cümleleri bakarak yazar" },
        ],
      },
      {
        code: "9.0",
        title: "Dil bilgisel yapıları kullanır",
        isMainGoal: true,
        sub: [
          { code: "9.1", title: "İsimlere gelen ekleri üretir" },
          { code: "9.2", title: "Eylemlere gelen ekleri üretir" },
          { code: "9.3", title: "Cümle ögelerini dil bilgisel olarak doğru sıralamayla üretir" },
        ],
      },
    ],
  },
  {
    code: "3.2",
    area: "acquired_language",
    title: "Bilişsel-İletişimsel Bozukluk",
    goals: [
      {
        code: "1.0",
        title: "İçinde bulunduğu yer, zaman, durum ve kişilere ilişkin soruları yanıtlar",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Bulunduğu yeri söyler" },
          { code: "1.2", title: "İçinde bulunduğu zamana ilişkin soruları doğru yanıtlar" },
          { code: "1.3", title: "Kendi durumuna ilişkin soruları doğru yanıtlar" },
          { code: "1.4", title: "Çevresindeki kişilerin kim olduğuna ilişkin soruları doğru yanıtlar" },
        ],
      },
      {
        code: "2.0",
        title: "Artan uzunluktaki rakam, sözcük, cümle ve kısa öyküyü tekrar eder",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Giderek artan uzunluktaki sayı dizilerini tekrarlar" },
          { code: "2.2", title: "Giderek artan uzunluktaki sözcük dizilerini tekrarlar" },
          { code: "2.3", title: "Farklı uzunluktaki cümleleri tekrarlar" },
          { code: "2.4", title: "Dinlediği bir kısa öyküyü tekrar anlatır" },
        ],
      },
      {
        code: "3.0",
        title: "Geçmişine ilişkin sorulara doğru yanıt verir",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Yakın geçmişine ilişkin sorulara yanıt verir" },
          { code: "3.2", title: "Uzak geçmişine ilişkin sorulara yanıt verir" },
        ],
      },
      {
        code: "4.0",
        title: "Cevabı evet-hayır olan sorulara doğru yanıt verir",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "Basit evet-hayır sorularını yanıtlar" },
          { code: "4.2", title: "Karmaşık evet-hayır sorularını yanıtlar" },
        ],
      },
      {
        code: "5.0",
        title: "Problem çözmeye yönelik verilen durumlara uygun yanıt verir",
        isMainGoal: true,
        sub: [
          { code: "5.1", title: "Günlük yaşamda sık karşılaşılan problemlere uygun çözümleri söyler" },
          { code: "5.2", title: "Günlük yaşamda nadiren karşılaşılan problemlere uygun çözümleri söyler" },
        ],
      },
      {
        code: "6.0",
        title: "Verilen durumlarla ilgili düşüncelerini uygun biçimde organize ederek ifade eder",
        isMainGoal: true,
        sub: [
          { code: "6.1", title: "Zamansal sıra izleyen olaylara ilişkin düşüncelerini ifade eder" },
          { code: "6.2", title: "Neden sonuç ilişkisi içeren olay/durumlara ilişkin düşüncelerini ifade eder" },
        ],
      },
      {
        code: "7.0",
        title: "Verilen sayısal problemleri/işlemleri hesaplama yaparak çözer",
        isMainGoal: true,
        sub: [
          { code: "7.1", title: "Verilen basit sayısal işlemleri hesaplama yaparak çözer" },
          { code: "7.2", title: "Verilen karmaşık sayısal işlemleri hesaplama yaparak çözer" },
        ],
      },
      {
        code: "8.0",
        title: "Okuma gerektiren görevleri yapar",
        isMainGoal: true,
        sub: [
          { code: "8.1", title: "Yazılı olarak verilen komutları yerine getirir" },
          { code: "8.2", title: "Yazılı olarak verilen sayıları sesli okur" },
          { code: "8.3", title: "Yazılı olarak verilen harfleri sesli okur" },
          { code: "8.4", title: "Yazılı olarak verilen sözcükleri sesli okur" },
          { code: "8.5", title: "Yazılı olarak verilen sözcük öbeklerini sesli okur" },
          { code: "8.6", title: "Yazılı olarak verilen cümleleri sesli okur" },
          { code: "8.7", title: "Yazılı olarak verilen metni sesli okur" },
          { code: "8.8", title: "Okuduğu metinle ilgili sorulan soruları yanıtlar" },
          { code: "8.9", title: "Yazılı olarak verilen sözcükleri resimleri ile eşler" },
          { code: "8.10", title: "Yazılı olarak verilen sözcük öbeklerini resimleri ile eşler" },
          { code: "8.11", title: "Yazılı olarak verilen cümleleri resimleri ile eşler" },
        ],
      },
      {
        code: "9.0",
        title: "Görsel işlemleme gerektiren görevleri yapar",
        isMainGoal: true,
        sub: [
          { code: "9.1", title: "Harf, rakam ve şekiller arasından benzer/farklı olanları ayırt eder" },
          { code: "9.2", title: "Verilen karışık örüntü içerisinden istenilen harf, rakam ve şekilleri bulur" },
          { code: "9.3", title: "Görsel olarak verilen örüntüye göre harf, rakam ve şekilleri sıralar" },
          { code: "9.4", title: "Görsel olarak verilen harf, rakam ve şekillerin birbirlerine göre konumunu belirtir" },
        ],
      },
      {
        code: "10.0",
        title: "Verilen yazma görevlerini yerine getirir",
        isMainGoal: true,
        sub: [
          { code: "10.1", title: "Sorulan soruların yanıtlarını doğru olarak yazar" },
          { code: "10.2", title: "Söylenen sayıları doğru olarak (rakamla) yazar" },
          { code: "10.3", title: "Söylenen harfleri doğru olarak yazar" },
          { code: "10.4", title: "Söylenen sözcükleri doğru olarak yazar" },
          { code: "10.5", title: "Söylenen cümleleri doğru olarak yazar" },
          { code: "10.6", title: "Yazılı olarak verilen sözcükleri bakarak yazar" },
          { code: "10.7", title: "Yazılı olarak verilen sözcük öbeklerini bakarak yazar" },
          { code: "10.8", title: "Yazılı olarak verilen cümleleri bakarak yazar" },
        ],
      },
    ],
  },
  {
    code: "4.1",
    area: "speech_sound",
    title: "Konuşma Sesi Bozukluğu",
    goals: [
      {
        code: "1.0",
        title: "Konuşma seslerini ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Hedef sesi sesçil olarak en az benzer sesten ayırt eder" },
          { code: "1.2", title: "Hedef sesi, yerine üretilen hatalı sesten ayırt eder" },
          { code: "1.3", title: "Hedef konuşma sesinin sözcük içindeki konumunu gösterir/söyler" },
        ],
      },
      {
        code: "2.0",
        title: "Konuşma seslerini doğru olarak üretir",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Hedef konuşma sesini izole hâlde doğru üretir" },
          { code: "2.2", title: "Hedef konuşma sesini hece başı konumlarda ünlülerle birlikte doğru üretir" },
          { code: "2.3", title: "Hedef konuşma sesini hece sonu konumlarda ünlülerle birlikte doğru üretir" },
          { code: "2.4", title: "Hedef konuşma sesini iki ünlü arasında doğru üretir" },
          { code: "2.5", title: "Hedef konuşma sesini tek heceli sözcükler içinde hece başında doğru üretir" },
          { code: "2.6", title: "Hedef konuşma sesini tek heceli sözcükler içinde hece sonunda doğru üretir" },
          { code: "2.7", title: "Hedef konuşma sesini iki ve daha fazla heceli sözcükler içinde hece başı sözcük başı konumda doğru üretir" },
          { code: "2.8", title: "Hedef konuşma sesini iki ve daha fazla heceli sözcükler içinde hece başı/hece sonu sözcük içi konumda doğru üretir" },
          { code: "2.9", title: "Hedef konuşma sesini iki ve daha fazla heceli sözcükler içinde hece sonu sözcük sonu konumda doğru üretir" },
        ],
      },
      {
        code: "3.0",
        title: "Hedef konuşma sesini sözcük öbekleri ve cümle içinde doğru üretir",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Hedef konuşma sesini cümle içinde doğru üretir" },
          { code: "3.2", title: "Hedef konuşma sesini spontane konuşmada bütün pozisyonlarda doğru üretir" },
          { code: "3.3", title: "Hedef konuşma sesini uygun pozisyonda doğru üretir" },
        ],
      },
      {
        code: "4.0",
        title: "Sesbilgisel farkındalık görevlerini yerine getirir",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "Cümle içinde kaç sözcük olduğunu gösterir/söyler" },
          { code: "4.2", title: "Söylenen çok sözcüklü cümleyi istenen bir sözcüğü söylemeden tekrar eder" },
          { code: "4.3", title: "Söylenen sözcüklerin kafiyeli olup olmadığını söyler" },
          { code: "4.4", title: "Söylenen sözcükle kafiyeli bir sözcük söyler" },
          { code: "4.5", title: "Söylenen sözcüğü hecelerine ayırır" },
          { code: "4.6", title: "Sözcük içinde kaç hece olduğunu gösterir/söyler" },
          { code: "4.7", title: "Verilen heceleri birleştirerek sözcük oluşturur" },
          { code: "4.8", title: "Söylenen çok heceli sözcüğü istenen bir heceyi söylemeden tekrar eder" },
          { code: "4.9", title: "Söylenen heceyi çok heceli sözcük içinde istenen konuma ekleyerek tekrar eder" },
          { code: "4.10", title: "Söylenen sözcüğün ilk ses birimini söyler" },
          { code: "4.11", title: "Söylenen sözcüğün son ses birimini söyler" },
          { code: "4.12", title: "Söylenen konuşma sesi ile başlayan bir sözcük söyler" },
          { code: "4.13", title: "Verilen sözcüğü ses birimlerine ayırır" },
          { code: "4.14", title: "Sözcük içinde kaç ses birimi olduğunu gösterir/söyler" },
          { code: "4.15", title: "Verilen ses birimlerini birleştirerek sözcük oluşturur" },
          { code: "4.16", title: "Söylenen sözcüğü istenen ses birimi söylemeden tekrar eder" },
          { code: "4.17", title: "Söylenen ses birimini sözcük içinde istenen konuma ekleyerek tekrar eder" },
          { code: "4.18", title: "Söylenen sözcüğü oluşturan ses birimlerden birini istenen başka bir sesbirim ile değiştirir" },
          { code: "4.19", title: "Söylenen sese karşılık gelen harfi gösterir" },
        ],
      },
    ],
  },
  {
    code: "4.2",
    area: "speech_sound",
    title: "Çocukluk Çağı Konuşma Apraksisi",
    goals: [
      {
        code: "1.0",
        title: "Farklı uzunluktaki hedef sözcükleri doğru olarak üretir",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Hece sayısı artan hedef sözcükler içindeki ünlüleri tutarlı olarak üretir" },
          { code: "1.2", title: "Hece sayısı artan hedef sözcükler içindeki ünlüleri doğru olarak üretir" },
          { code: "1.3", title: "Hece sayısı artan hedef sözcükler içindeki ünsüzleri tutarlı olarak üretir" },
          { code: "1.4", title: "Hece sayısı artan hedef sözcükler içindeki ünsüzleri doğru olarak üretir" },
          { code: "1.5", title: "Hece sayısı artan hedef sözcükleri doğru olarak taklit eder" },
          { code: "1.6", title: "Hece sayısı artan hedef sözcükleri tutarlı olarak kendiliğinden üretir" },
          { code: "1.7", title: "Hece sayısı artan hedef sözcükleri doğru olarak kendiliğinden üretir" },
        ],
      },
      {
        code: "2.0",
        title: "Konuşma seslerini uygun hız ve sürede ardışık diziler hâlinde üretir",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Aynı heceyi ardışık olarak hızlı şekilde tekrarlar" },
          { code: "2.2", title: "Ünsüzü değişen heceleri ardışık olarak hızlı şekilde tekrarlar" },
        ],
      },
      {
        code: "3.0",
        title: "Konuşmasında doğru vurgu ve ezgiyi kullanır",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Sözcükleri doğru vurgu ve ezgi ile üretir" },
          { code: "3.2", title: "Farklı cümle türlerini doğru vurgu ve ezgi ile üretir" },
        ],
      },
    ],
  },
  {
    code: "5.1",
    area: "motor_speech",
    title: "Dizartri",
    goals: [
      {
        code: "1.0",
        title: "Konuşma üretimi için doğru solunumu gerçekleştirir",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Doğru solunum için uygun vücut pozisyonunu alır" },
          { code: "1.2", title: "Sesleme için doğru solunum yapar" },
          { code: "1.3", title: "Konuşma üretimi boyunca solunum kontrolü yapar" },
        ],
      },
      {
        code: "2.0",
        title: "Konuşma üretimi için doğru seslemeyi gerçekleştirir",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Doğru solunumla aldığı nefesi ses telleri aracılığıyla titreştirir" },
          { code: "2.2", title: "Ses tellerinde titreşerek oluşan sesi yüz çevresinde tınlatır" },
        ],
      },
      {
        code: "3.0",
        title: "Konuşma üretiminde görev alan kas yapılarını yeterli güçte kullanır",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Dinlenme durumunda dudakları simetrik ve kapalıdır" },
          { code: "3.2", title: "Konuşma seslerinin üretimi için gerekli dudak hareketlerini yapar" },
          { code: "3.3", title: "Konuşma seslerinin üretimi için gerekli dil hareketlerini yapar" },
          { code: "3.4", title: "Salya kontrolünü sağlar" },
        ],
      },
      {
        code: "4.0",
        title: "Konuşma seslerini üretir",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "Hedef konuşma sesini izole hâlde üretir" },
          { code: "4.2", title: "Hedef konuşma sesini hece başı konumlarda ünlülerle birlikte üretir" },
          { code: "4.3", title: "Hedef konuşma sesini hece sonu konumlarda ünlülerle birlikte doğru üretir" },
          { code: "4.4", title: "Hedef konuşma sesini iki ünlü arasında doğru üretir" },
          { code: "4.5", title: "Hedef konuşma sesini sözcük içinde tüm pozisyonlarda doğru üretir" },
          { code: "4.6", title: "Hedef konuşma sesini farklı sözcük gruplarında doğru üretir" },
          { code: "4.7", title: "Hedef konuşma sesini cümle içinde doğru üretir" },
          { code: "4.8", title: "Hedef konuşma sesini spontane konuşmada bütün pozisyonlarda doğru üretir" },
        ],
      },
      {
        code: "5.0",
        title: "Konuşmasında doğru vurgu ve ezgiyi kullanır",
        isMainGoal: true,
        sub: [
          { code: "5.1", title: "Sözcükleri doğru vurgu ve ezgi ile üretir" },
          { code: "5.2", title: "Farklı cümle türlerini doğru vurgu ve ezgi ile üretir" },
        ],
      },
    ],
  },
  {
    code: "5.2",
    area: "motor_speech",
    title: "Apraksi",
    goals: [
      {
        code: "1.0",
        title: "Oral motor hareketleri taklit eder",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Dudak hareketlerini taklit eder" },
          { code: "1.2", title: "Çene hareketlerini taklit eder" },
          { code: "1.3", title: "Dil hareketlerini taklit eder" },
        ],
      },
      {
        code: "2.0",
        title: "Çevresel sesleri, işlevsel sesleri ve vokalizasyonları taklit eder",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Çevresel sesleri taklit eder" },
          { code: "2.2", title: "İşlevsel sesleri taklit eder" },
          { code: "2.3", title: "Vokalizasyonları taklit eder" },
        ],
      },
      {
        code: "3.0",
        title: "Konuşma seslerini izole şekilde tutarlı olarak üretir",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Görülebilir sesleri tutarlı olarak üretir" },
          { code: "3.2", title: "Az görülebilir sesleri tutarlı olarak üretir" },
        ],
      },
      {
        code: "4.0",
        title: "Ses birleşimlerini tutarlı olarak doğru üretir",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "Ünsüz ünlü birleşimlerini tutarlı olarak doğru üretir" },
          { code: "4.2", title: "Ünlü ünsüz birleşimlerini tutarlı olarak doğru üretir" },
          { code: "4.3", title: "Ünsüz ünlü ünsüz birleşimlerini tutarlı olarak doğru üretir" },
          { code: "4.4", title: "Farklı ses birleşimlerini tutarlı olarak doğru üretir" },
        ],
      },
      {
        code: "5.0",
        title: "Sözcüklerde sesleri tutarlı olarak doğru üretir",
        isMainGoal: true,
        sub: [
          { code: "5.1", title: "Tek heceli sözcükteki sesleri tutarlı olarak doğru üretir" },
          { code: "5.2", title: "İki heceli sözcükteki sesleri tutarlı olarak doğru üretir" },
          { code: "5.3", title: "Üç heceli sözcükteki sesleri tutarlı olarak doğru üretir" },
          { code: "5.4", title: "Giderek artan uzunluktaki sözcükteki sesleri tutarlı olarak doğru üretir" },
        ],
      },
      {
        code: "6.0",
        title: "Söz öbeklerindeki sesleri tutarlı olarak doğru üretir",
        isMainGoal: true,
        sub: [
          { code: "6.1", title: "Tek heceli sözcüklerden oluşan ikili söz öbeklerindeki sesleri tutarlı olarak doğru üretir" },
          { code: "6.2", title: "Biri tek, biri iki heceli sözcüklerden oluşan söz öbeklerindeki sesleri tutarlı olarak doğru üretir" },
          { code: "6.3", title: "İki heceli sözcüklerden oluşan ikili söz öbeklerindeki sesleri tutarlı olarak doğru üretir" },
          { code: "6.4", title: "İkiden fazla heceden oluşan sözcüklerden oluşan söz öbeklerindeki sesleri tutarlı olarak doğru üretir" },
        ],
      },
      {
        code: "7.0",
        title: "Cümlelerde sesleri tutarlı olarak doğru üretir",
        isMainGoal: true,
        sub: [
          { code: "7.1", title: "İki sözcükten oluşan cümlelerdeki sesleri tutarlı olarak doğru üretir" },
          { code: "7.2", title: "Üç sözcükten oluşan cümlelerdeki sesleri tutarlı olarak doğru üretir" },
          { code: "7.3", title: "Dört sözcükten oluşan cümlelerdeki sesleri tutarlı olarak doğru üretir" },
        ],
      },
      {
        code: "8.0",
        title: "Karşılıklı iletişim sırasında sesleri tutarlı olarak doğru üretir",
        isMainGoal: true,
        sub: [
          { code: "8.1", title: "Söz eylemlerde kullanılan sesleri tutarlı olarak doğru üretir" },
          { code: "8.2", title: "Evet/hayır sözcüklerindeki sesleri tutarlı olarak doğru üretir" },
          { code: "8.3", title: "Açık uçlu sorulara verilen cevaplarda sesleri tutarlı olarak doğru üretir" },
          { code: "8.4", title: "Yapılandırılmış sohbet sırasında sesleri tutarlı olarak doğru üretir" },
          { code: "8.5", title: "Yapılandırılmamış sohbetlerde sesleri tutarlı ve doğru olarak üretir" },
        ],
      },
      {
        code: "9.0",
        title: "Konuşmasında doğru vurgu ve ezgiyi kullanır",
        isMainGoal: true,
        sub: [
          { code: "9.1", title: "Sözcükleri doğru vurgu ve ezgi ile üretir" },
          { code: "9.2", title: "Farklı cümle türlerini doğru vurgu ve ezgi ile üretir" },
        ],
      },
    ],
  },
  {
    code: "6.1",
    area: "resonance",
    title: "Ses Birimine Özgü Nazal Kaçış",
    goals: [
      {
        code: "1.0",
        title: "Yüksek basınçlı sesleri nazal kaçış olmadan ağız yoluyla üretir",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Hedef konuşma sesini izole hâlde üretir" },
          { code: "1.2", title: "Hedef konuşma sesini hece başı konumlarda ünlülerle birlikte üretir" },
          { code: "1.3", title: "Hedef konuşma sesini hece sonu konumlarda ünlülerle birlikte üretir" },
          { code: "1.4", title: "Hedef konuşma sesini iki ünlü arasında üretir" },
          { code: "1.5", title: "Hedef konuşma sesini tek heceli sözcükler içinde hece başında üretir" },
          { code: "1.6", title: "Hedef konuşma sesini tek heceli sözcükler içinde hece sonunda üretir" },
          { code: "1.7", title: "Hedef konuşma sesini iki ve daha fazla heceli sözcükler içinde hece başı-sözcük başı konumda üretir" },
          { code: "1.8", title: "Hedef konuşma sesini iki ve daha fazla heceli sözcükler içinde hece başı-sözcük içi konumda üretir" },
          { code: "1.9", title: "Hedef konuşma sesini iki ve daha fazla heceli sözcükler içinde hece sonu-sözcük içi konumda üretir" },
          { code: "1.10", title: "Hedef konuşma sesini iki ve daha fazla heceli sözcükler içinde hece sonu-sözcük sonu konumda üretir" },
          { code: "1.11", title: "Hedef konuşma sesini sözcük öbekleri içinde üretir" },
          { code: "1.12", title: "Hedef konuşma sesini cümle içinde üretir" },
          { code: "1.13", title: "Hedef konuşma sesini spontane konuşmada bütün pozisyonlarda üretir" },
        ],
      },
    ],
  },
  {
    code: "6.2",
    area: "resonance",
    title: "Hipernazaliteye Bağlı Telafi Sesleri",
    goals: [
      {
        code: "1.0",
        title: "Hipernazalite kaynaklı hatalı seslerin yerine hedef konuşma seslerini üretir",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Hedef konuşma sesini izole hâlde üretir" },
          { code: "1.2", title: "Hedef konuşma sesini hece başı konumlarda ünlülerle birlikte üretir" },
          { code: "1.3", title: "Hedef konuşma sesini hece sonu konumlarda ünlülerle birlikte üretir" },
          { code: "1.4", title: "Hedef konuşma sesini iki ünlü arasında üretir" },
          { code: "1.5", title: "Hedef konuşma sesini tek heceli sözcükler içinde hece başında üretir" },
          { code: "1.6", title: "Hedef konuşma sesini tek heceli sözcükler içinde hece sonunda üretir" },
          { code: "1.7", title: "Hedef konuşma sesini iki ve daha fazla heceli sözcükler içinde hece başı-sözcük başı konumda üretir" },
          { code: "1.8", title: "Hedef konuşma sesini iki ve daha fazla heceli sözcükler içinde hece başı-sözcük içi konumda üretir" },
          { code: "1.9", title: "Hedef konuşma sesini iki ve daha fazla heceli sözcükler içinde hece sonu-sözcük içi konumda üretir" },
          { code: "1.10", title: "Hedef konuşma sesini iki ve daha fazla heceli sözcükler içinde hece sonu-sözcük sonu konumda üretir" },
          { code: "1.11", title: "Hedef konuşma sesini sözcük öbekleri içinde üretir" },
          { code: "1.12", title: "Hedef konuşma sesini cümle içinde üretir" },
          { code: "1.13", title: "Hedef konuşma sesini spontane konuşmada bütün pozisyonlarda üretir" },
        ],
      },
    ],
  },
  {
    code: "7.1",
    area: "voice",
    title: "Solunum (Respirasyon)",
    goals: [
      {
        code: "1.0",
        title: "Doğru solunum için uygun vücut pozisyonunu alır",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Dik durur" },
          { code: "1.2", title: "Omuzlarını ve boynunu rahat bir konumda tutar" },
        ],
      },
      {
        code: "2.0",
        title: "Sesleme için doğru solunum yapar",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Burnundan nefes alır" },
          { code: "2.2", title: "Nefes alırken diyaframını aşağı indirir" },
          { code: "2.3", title: "Aldığı nefesi kontrollü ve yavaş bir şekilde ağzından verir" },
        ],
      },
      {
        code: "3.0",
        title: "Konuşma üretimi sırasında solunum kontrolü yapar",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Konuşurken diyafram solunumunu kullanır" },
          { code: "3.2", title: "Göğüs kafesi ve omuzlarının hareketini kontrol eder" },
        ],
      },
    ],
  },
  {
    code: "7.2",
    area: "voice",
    title: "Sesleme (Fonasyon)",
    goals: [
      {
        code: "1.0",
        title: "Ses üretimi ve kullanımının önemini açıklar",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Doğru ve sağlıklı ses kullanımının önemini açıklar" },
          { code: "1.2", title: "Ses bozukluğuna neden olan faktörleri sıralar" },
        ],
      },
      {
        code: "2.0",
        title: "Ses hijyeni için yapılması gerekenleri açıklar",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Ses hijyeni için yapılması gerekenleri açıklar" },
          { code: "2.2", title: "Sağlıklı ses için gerekli olan uyku düzeninin önemini açıklar" },
          { code: "2.3", title: "Olumsuz çevresel etmenlerin ve zararlı alışkanlıkların ses üzerindeki etkilerini açıklar" },
          { code: "2.4", title: "Sesin yanlış kullanımının ses üzerindeki olumsuz etkilerini açıklar" },
        ],
      },
      {
        code: "3.0",
        title: "Konuşma sırasında ses üretimine uygun vücut pozisyonunu alarak diyafram solunumunu kullanır",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Dik durur" },
          { code: "3.2", title: "Omuzlarını ve boynunu rahat bir konumda tutar" },
        ],
      },
      {
        code: "4.0",
        title: "Ön odaklı bir sesleme gerçekleştirir",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "Doğru solunumla aldığı nefesi ses telleri aracılığıyla titreştirir" },
          { code: "4.2", title: "Ses tellerinde titreşerek oluşan sesi yüz çevresinde tınlatır" },
        ],
      },
      {
        code: "5.0",
        title: "Yaşına ve cinsiyetine uygun ses kullanır",
        isMainGoal: true,
        sub: [
          { code: "5.1", title: "Sesinin perdesini yaşına uygun şekilde kontrol eder" },
          { code: "5.2", title: "Sesinin perdesini cinsiyetine uygun şekilde kontrol eder" },
        ],
      },
      {
        code: "6.0",
        title: "Gündelik konuşmada farklı durum ve ortamlarda doğru seslemeyi kullanır",
        isMainGoal: true,
        sub: [
          { code: "6.1", title: "Gündelik konuşmada sesini sağlıklı şekilde kullanır" },
          { code: "6.2", title: "Konuşurken sesinin şiddetini bulunduğu ortama göre kontrol eder" },
          { code: "6.3", title: "Konuşurken sesinin perdesini bulunduğu ortama göre kontrol eder" },
        ],
      },
    ],
  },
  {
    code: "I.1.1",
    area: "hearing",
    title: "Sesi Fark Etme",
    goals: [
      {
        code: "1.0",
        title: "Verilen farklı seslere tepki verir",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Verilen ev içi seslere tepki verir" },
          { code: "1.2", title: "Çevrede duyulan seslere tepki verir" },
          { code: "1.3", title: "Verilen konuşma seslerine tepki verir" },
          { code: "1.4", title: "Verilen melodilere tepki verir" },
        ],
      },
      {
        code: "2.0",
        title: "Verilen sesin kaynağını arar",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Verilen ev içi seslerin kaynağını arar" },
          { code: "2.2", title: "Verilen ev dışı seslerin kaynağını arar" },
          { code: "2.3", title: "Verilen konuşma seslerinin kaynağını arar" },
          { code: "2.4", title: "Verilen melodilerin kaynağını arar" },
        ],
      },
    ],
  },
  {
    code: "I.1.2",
    area: "hearing",
    title: "Sesi Ayırt Etme",
    goals: [
      {
        code: "1.0",
        title: "Dinlediği iki ses arasındaki ses özelliğini ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Dinlediği seslerden sözel olan ve sözel olmayanı söyler" },
          { code: "1.2", title: "Dinlediği seslerden alçak ve yüksek olanı söyler" },
          { code: "1.3", title: "Dinlediği seslerden uzun ve kısa olanı söyler" },
          { code: "1.4", title: "Dinlediği seslerden ince ve kalın olanı söyler" },
        ],
      },
      {
        code: "2.0",
        title: "Dinlediği sesin kaynağını bulur",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Odanın içinde verilen ev içi seslerin kaynağını söyler" },
          { code: "2.2", title: "Odanın dışında verilen ev içi seslerin kaynağını söyler" },
          { code: "2.3", title: "Odanın içinde verilen çevrede duyulan seslerin kaynağını söyler" },
          { code: "2.4", title: "Odanın dışında verilen çevrede duyulan seslerin kaynağını söyler" },
          { code: "2.5", title: "Odanın içinde konuşan kişiye yönelir" },
          { code: "2.6", title: "Odanın dışında konuşan kişiye yönelir" },
        ],
      },
      {
        code: "3.0",
        title: "Duyguları ses tonundan ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Konuşan kişinin üzgün olduğunu ses tonundan ayırt eder" },
          { code: "3.2", title: "Konuşan kişinin kızgın olduğunu ses tonundan ayırt eder" },
          { code: "3.3", title: "Konuşan kişinin mutlu olduğunu ses tonundan ayırt eder" },
        ],
      },
      {
        code: "4.0",
        title: "Bir kişiden dinlediği müzikal tonlara uygun tepki verir",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "Bir kişiden dinlediği tanıdığı parmak oyunlarına tepki verir" },
          { code: "4.2", title: "Bir kişiden dinlediği tanıdığı tekerlemelere tepki verir" },
          { code: "4.3", title: "Bir kişiden dinlediği tanıdığı şarkıları ayırt eder" },
          { code: "4.4", title: "Bir kişiden dinlediği tanıdığı melodileri ayırt eder" },
        ],
      },
      {
        code: "5.0",
        title: "Kayıtlı sesten dinlediği müzikal tonlara uygun tepki verir",
        isMainGoal: true,
        sub: [
          { code: "5.1", title: "Kayıtlı sesten dinlediği tanıdığı parmak oyunlarına tepki verir" },
          { code: "5.2", title: "Kayıtlı sesten dinlediği tanıdığı tekerlemelere tepki verir" },
          { code: "5.3", title: "Kayıtlı sesten dinlediği tanıdığı şarkıları ayırt eder" },
          { code: "5.4", title: "Kayıtlı sesten dinlediği tanıdığı melodileri ayırt eder" },
        ],
      },
      {
        code: "6.0",
        title: "Sessiz bir ortamda verilen sesin yönünü ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "6.1", title: "Sağ/sol taraftan verilen sesin yönünü söyler" },
          { code: "6.2", title: "Aşağıdan/yukarıdan verilen sesin yönünü söyler" },
          { code: "6.3", title: "Önden/arkadan verilen sesin yönünü söyler" },
        ],
      },
      {
        code: "7.0",
        title: "Gürültülü bir ortamda verilen sesin yönünü ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "7.1", title: "Sağ/sol taraftan verilen sesin yönünü söyler" },
          { code: "7.2", title: "Aşağıdan/yukarıdan verilen sesin yönünü söyler" },
          { code: "7.3", title: "Önden/arkadan verilen sesin yönünü söyler" },
        ],
      },
      {
        code: "8.0",
        title: "Farklı hece uzunluklarındaki sözcükleri ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "8.1", title: "Tek heceli sözcükleri söyler" },
          { code: "8.2", title: "İki heceli sözcükleri söyler" },
          { code: "8.3", title: "Üç heceli sözcükleri söyler" },
        ],
      },
    ],
  },
  {
    code: "I.1.3",
    area: "hearing",
    title: "Sesi Tanıma",
    goals: [
      {
        code: "1.0",
        title: "Dinlediği sesin kime ve neye ait olduğunu ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Verilen ev içi seslere uygun tepki verir" },
          { code: "1.2", title: "Verilen ev dışı seslere uygun tepki verir" },
          { code: "1.3", title: "Birincil bakım verenin sesine uygun tepki verir" },
          { code: "1.4", title: "Aile içindekilerin sesine uygun tepki verir" },
          { code: "1.5", title: "İletişime girdiği tanıdığı kişilerin sesine uygun tepki verir" },
        ],
      },
      {
        code: "2.0",
        title: "Kişilerin adlarını ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Kendi adını duyduğunda uygun tepki verir" },
          { code: "2.2", title: "Birincil bakım verenin adını duyduğunda uygun tepki verir" },
          { code: "2.3", title: "Annesinin adını duyduğunda uygun tepki verir" },
          { code: "2.4", title: "Babasının adını duyduğunda uygun tepki verir" },
          { code: "2.5", title: "Kardeşinin adını duyduğunda uygun tepki verir" },
          { code: "2.6", title: "Yakın çevresindeki kişilerin adlarını duyduğunda uygun tepki verir" },
        ],
      },
      {
        code: "3.0",
        title: "Günlük hayatta kullanılan nesne adlarını tanır",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Günlük hayatta sıklıkla kullanılan nesneyi seçenekler arasından gösterir" },
          { code: "3.2", title: "Günlük hayatta daha az sıklıkla kullanılan nesneyi seçenekler arasından gösterir" },
          { code: "3.3", title: "Günlük hayatta sıklıkla kullanılan nesneyi gösterir" },
          { code: "3.4", title: "Günlük hayatta daha az sıklıkla kullanılan nesneyi gösterir" },
        ],
      },
      {
        code: "4.0",
        title: "Dinlediği eyleme uygun tepki verir",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "Günlük hayatta sıklıkla duyduğu eylemi verilen seçenekler arasından gösterir" },
          { code: "4.2", title: "Günlük hayatta daha az sıklıkla duyduğu eylemi seçenekler arasından gösterir" },
          { code: "4.3", title: "Bulunduğu bağlama uygun olmayan bir durumda günlük hayatta sıklıkla duyduğu eyleme uygun tepki verir" },
          { code: "4.4", title: "Bulunduğu bağlama uygun olmayan bir durumda günlük hayatta daha az sıklıkla duyduğu eyleme uygun tepki verir" },
        ],
      },
      {
        code: "5.0",
        title: "Verilen sözcük ile ilişkili sözcükleri ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "5.1", title: "Belirlenen konu ile ilişkili iki sözcüğü sırası ile söyler" },
          { code: "5.2", title: "Belirlenen konu ile ilişkili üç sözcüğü sırası ile söyler" },
          { code: "5.3", title: "Belirlenen konu ile ilişkili dört ve daha fazla sözcüğü sırası ile söyler" },
        ],
      },
      {
        code: "6.0",
        title: "Dinlediği cümleleri ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "6.1", title: "İki sözcüklü cümleleri seçenekler arasından söyler" },
          { code: "6.2", title: "Üç sözcüklü cümleleri seçenekler arasından söyler" },
          { code: "6.3", title: "Dört ve daha fazla sözcüklü cümleleri seçenekler arasından söyler" },
        ],
      },
      {
        code: "7.0",
        title: "Önündeki nesnelerle ilişkili dinlediği yönergeleri yerine getirir",
        isMainGoal: true,
        sub: [
          { code: "7.1", title: "Tek sözcüklü ilişkili iki yönergeyi sırasıyla yapar" },
          { code: "7.2", title: "İki sözcüklü ilişkili iki yönergeyi sırasıyla yapar" },
          { code: "7.3", title: "Üç sözcüklü ve ilişkili iki yönergeyi sırasıyla yapar" },
          { code: "7.4", title: "Dört ve daha fazla sözcüklü ilişkili yönergeleri sırasıyla yapar" },
        ],
      },
    ],
  },
  {
    code: "I.1.4",
    area: "hearing",
    title: "İşitsel Anlama",
    goals: [
      {
        code: "1.0",
        title: "Dinlediği cümle içindeki eksik sözcüğü tamamlar",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Cümle içindeki eksik sözcüğü seçenek sunularak tamamlar" },
          { code: "1.2", title: "Cümle içindeki eksik sözcüğü seçenek sunulmaksızın tamamlar" },
          { code: "1.3", title: "Cümlenin sonunu cümlenin anlamına uygun olarak tamamlar" },
        ],
      },
      {
        code: "2.0",
        title: "Dinlediği cümlede anlamı bozan sözcüğü ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Üç sözcüklü cümlede anlamı bozan sözcüğü söyler" },
          { code: "2.2", title: "Dört ve daha çok sayıda sözcüklü cümlede anlamı bozan sözcüğü söyler" },
        ],
      },
      {
        code: "3.0",
        title: "Dinlediği cümlede söz dizimini bozan sözcüğü ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Dinlediği üç sözcüklü cümlede söz dizimini bozan sözcüğün yerine uygun sözcüğü söyler" },
          { code: "3.2", title: "Dinlediği dört ve daha fazla sözcüklü cümlede söz dizimini bozan sözcüğün yerine uygun sözcüğü söyler" },
        ],
      },
      {
        code: "4.0",
        title: "İpuçları ile tanımı yapılan varlığı ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "Verilen seçenekler arasından doğrudan ilişkili tanımlaması yapılan varlığı söyler" },
          { code: "4.2", title: "Seçenekler olmadan doğrudan ilişkili tanımlaması yapılan varlığı söyler" },
          { code: "4.3", title: "Verilen seçenekler arasından doğrudan ilişkili olmayan tanımlaması yapılan varlığı söyler" },
          { code: "4.4", title: "Seçenekler olmadan doğrudan ilişkili olmayan tanımlaması yapılan varlığı söyler" },
        ],
      },
      {
        code: "5.0",
        title: "Tanımlayıcı ipuçlarına dayanan tanımlamaları ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "5.1", title: "Verilen seçenekler arasından dinlediği tanımlayıcı ipuçlarına dayanan tanımlamayı söyler" },
          { code: "5.2", title: "Seçenekler olmadan dinlediği tanımlayıcı ipuçlarına dayanan tanımlamayı söyler" },
          { code: "5.3", title: "Verilen seçenekler arasından dinlediği tanımlayıcı ipuçlarına dayanan karmaşık tanımlamayı söyler" },
          { code: "5.4", title: "Seçenekler olmadan dinlediği tanımlayıcı ipuçlarına dayanan karmaşık tanımlamayı söyler" },
        ],
      },
      {
        code: "6.0",
        title: "Dinlediği sözcüğün içinden istenen ses yapılarını ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "6.1", title: "Dinlediği sözcüğü hecelerine ayırarak söyler" },
          { code: "6.2", title: "Dinlediği sözcükteki eksik sesi söyler" },
          { code: "6.3", title: "Dinlediği sözcükteki hatalı sesi söyler" },
          { code: "6.4", title: "Dinlediği sözcüğün ses birimlerini sırası ile söyler" },
          { code: "6.5", title: "Dinlediği sözcükteki hatalı sesin sırasını söyler" },
        ],
      },
      {
        code: "7.0",
        title: "Başka bir etkinlik ile ilgilenirken konuşmalara katılır",
        isMainGoal: true,
        sub: [
          { code: "7.1", title: "Başka bir etkinlik ile ilgilenirken yöneltilen cümlelere bağlama uygun yanıt verir" },
          { code: "7.2", title: "Başka bir etkinlik ile ilgilenirken dinlediği öykü bittiğinde konuşmayı sürdürür" },
          { code: "7.3", title: "Başka bir etkinlik ile ilgilenirken herhangi bir konuya bağlı kalmaksızın sürdürülen konuşmalara katılır" },
        ],
      },
      {
        code: "8.0",
        title: "Telefonda tanıdığı kişilerle iletişimi sürdürür",
        isMainGoal: true,
        sub: [
          { code: "8.1", title: "Telefonda kadın ve erkek sesini ayırt eder" },
          { code: "8.2", title: "Telefonda karşındaki kişiye uygun tepki verir" },
          { code: "8.3", title: "Tanıdığı kişilerle telefonda selamlaşır" },
          { code: "8.4", title: "Tanıdığı kişilerle telefonda günlük konulardan oluşan iletişimi sürdürür" },
          { code: "8.5", title: "Tanıdığı kişilerle telefonda konuyu değiştirerek iletişimi sürdürür" },
        ],
      },
      {
        code: "9.0",
        title: "Telefonda tanımadığı kişilerle iletişimi sürdürür",
        isMainGoal: true,
        sub: [
          { code: "9.1", title: "Tanımadığı kişilerle telefonda selamlaşır" },
          { code: "9.2", title: "Tanımadığı kişilerle telefonda günlük konulardan oluşan iletişimi sürdürür" },
          { code: "9.3", title: "Tanımadığı kişilerle telefonda konuyu değiştirerek iletişimi sürdürür" },
        ],
      },
    ],
  },
  // ── İşitme: Dil Eğitimi ───────────────────────────────────────────────
  {
    code: "I.2.1",
    area: "hearing_language",
    title: "Söz Öncesi İletişim",
    goals: [
      {
        code: "1.0",
        title: "Göz kontağı kurar",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Etkileşim sırasında kısa süreli göz kontağı kurar" },
          { code: "1.2", title: "Etkileşim sırasında uzun süreli göz kontağı kurar" },
        ],
      },
      {
        code: "2.0",
        title: "Sıra alır",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Etkileşim sırasında vokal sıra alır" },
          { code: "2.2", title: "Etkileşim sırasında motor hareketlerde sıra alır" },
        ],
      },
      {
        code: "3.0",
        title: "Ortak ilgi kurar",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Yapılmakta olan etkinlik veya materyale bakar" },
          { code: "3.2", title: "Yapılmakta olan etkinlik veya materyale jest ve mimikleriyle katılır" },
          { code: "3.3", title: "Yapılmakta olan etkinlik veya materyale sözel olarak katılır" },
        ],
      },
      {
        code: "4.0",
        title: "Tonlamalara ve basit sözlü ifadelere uygun tepki verir",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "Konuşan herhangi bir kişiye tepki verir" },
          { code: "4.2", title: "Kendi adına tepki verir" },
          { code: "4.3", title: "Ses tonuna uygun tepki verir" },
          { code: "4.4", title: "Adı söylenen aile üyesini ortamda arar" },
          { code: "4.5", title: "Bay bay, alkış gibi ifadelere uygun tepki verir" },
          { code: "4.6", title: "\"Hayır\" ifadesini duyduğunda uygun tepki verir" },
          { code: "4.7", title: "Tanıdığı nesnenin adı söylendiğinde o nesneye yönelir" },
        ],
      },
      {
        code: "5.0",
        title: "Basit sözcükleri ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "5.1", title: "Adı söylenen nesneyi verir" },
          { code: "5.2", title: "Adı söylenen kişiyi gösterir" },
          { code: "5.3", title: "Söylenen basit sıfatlara/zarflara uygun tepki verir" },
        ],
      },
      {
        code: "6.0",
        title: "Basit tek eylemli yönergeyi yerine getirir",
        isMainGoal: true,
        sub: [
          { code: "6.1", title: "Basit tek eylemli olumlu yönergeyi yerine getirir" },
          { code: "6.2", title: "Basit tek eylemli olumsuz yönergeyi yerine getirir" },
        ],
      },
      {
        code: "7.0",
        title: "Çeşitli konuşma sesleri üretir",
        isMainGoal: true,
        sub: [
          { code: "7.1", title: "Ünlü-ünsüz ses birleşimleriyle mırıldanır" },
          { code: "7.2", title: "Ünlü-ünsüz ses birleşimleri üretir" },
          { code: "7.3", title: "Ünsüz-ünlü ses birleşimleri üretir" },
        ],
      },
      {
        code: "8.0",
        title: "Babıldar",
        isMainGoal: true,
        sub: [
          { code: "8.1", title: "Doğal ortamda ünlü-ünsüz ses birleşimlerini ardışık olarak üretir" },
          { code: "8.2", title: "Doğal ortamda dudak ve patlayıcı sesleri içeren hareketleri yapar" },
          { code: "8.3", title: "Doğal ortamda sürüntülü seslerin olduğu ünlü-ünsüz birleşimlerini üretir" },
        ],
      },
      {
        code: "9.0",
        title: "Mırıldanır",
        isMainGoal: true,
        sub: [
          { code: "9.1", title: "Doğal ortamda tekrarlı heceleri uzun zincir şeklinde üretir" },
          { code: "9.2", title: "Doğal ortamda nazal ve durak seslerinin yer aldığı heceleri üretir" },
          { code: "9.3", title: "Doğal ortamda ünlü-ünsüz ses birleşimlerini farklı tonlamalarla üretir" },
          { code: "9.4", title: "Doğal ortamda cümleye benzer tonlamalarla farklı sesleri birleştirir" },
        ],
      },
    ],
  },
  {
    code: "I.2.2",
    area: "hearing_language",
    title: "Söz Dönemi",
    goals: [
      {
        code: "1.0",
        title: "Kendine söylenen varlıkları ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "İsmi söylenilen varlıkların kendisini gösterir" },
          { code: "1.2", title: "İsmi söylenilen varlıkların resmini gösterir" },
        ],
      },
      {
        code: "2.0",
        title: "Varlıkların ismini söyler",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Gösterilen varlığın ismini söyler" },
          { code: "2.2", title: "Resmi gösterilen varlığın ismini söyler" },
        ],
      },
      {
        code: "3.0",
        title: "Eylemleri yerine getirir",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Günlük hayatında sık karşılaştığı eylemleri yerine getirir" },
          { code: "3.2", title: "Günlük hayatta az karşılaştığı eylemleri yerine getirir" },
        ],
      },
      {
        code: "4.0",
        title: "Günlük hayatında kullanılan eylemleri söyler",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "Günlük hayatında sık karşılaştığı eylemleri söyler" },
          { code: "4.2", title: "Günlük hayatta az karşılaştığı eylemleri söyler" },
        ],
      },
      {
        code: "5.0",
        title: "Sıfatları/zarfları kullanır",
        isMainGoal: true,
        sub: [
          { code: "5.1", title: "Günlük hayatında sık karşılaştığı sıfat/zarfları söyler" },
          { code: "5.2", title: "Günlük hayatta az karşılaştığı sıfat/zarfları söyler" },
        ],
      },
      {
        code: "6.0",
        title: "Zamirleri kullanır",
        isMainGoal: true,
        sub: [
          { code: "6.1", title: "Günlük hayatında sık karşılaştığı zamirleri söyler" },
          { code: "6.2", title: "Günlük hayatta az karşılaştığı zamirleri söyler" },
        ],
      },
      {
        code: "7.0",
        title: "Basit/karmaşık cümleler kurar",
        isMainGoal: true,
        sub: [
          { code: "7.1", title: "Olumlu cümle kurar" },
          { code: "7.2", title: "Olumsuz cümle kurar" },
          { code: "7.3", title: "İsim cümlesi kurar" },
          { code: "7.4", title: "Eylem cümlesi kurar" },
          { code: "7.5", title: "Soru cümlesi kurar" },
        ],
      },
      {
        code: "8.0",
        title: "Mecaz ve deyimleri cümle içinde kullanır",
        isMainGoal: true,
        sub: [
          { code: "8.1", title: "Sözcükleri mecaz anlamlarıyla cümle içinde kullanır" },
          { code: "8.2", title: "Deyimleri cümle içinde kullanır" },
        ],
      },
      {
        code: "9.0",
        title: "Çekim eklerini kullanır",
        isMainGoal: true,
        sub: [
          { code: "9.1", title: "Çoğul ekini kullanır" },
          { code: "9.2", title: "Zaman eklerini kullanır" },
          { code: "9.3", title: "Soru ekini kullanır" },
          { code: "9.4", title: "Olumsuzluk ekini kullanır" },
          { code: "9.5", title: "Kişi eklerini kullanır" },
          { code: "9.6", title: "Hâl (durum) ekini kullanır" },
        ],
      },
      {
        code: "10.0",
        title: "Verilen resimle ilgili hikâye oluşturur",
        isMainGoal: true,
        sub: [
          { code: "10.1", title: "Resimle ilgili bir öyküyü giriş cümlesiyle başlatır" },
          { code: "10.2", title: "Resimle ilgili bir öyküyü gelişme cümlesiyle devam ettirir" },
          { code: "10.3", title: "Resimle ilgili bir öyküyü sonuç cümlesiyle tamamlar" },
        ],
      },
      {
        code: "11.0",
        title: "Dili farklı durumlarda kullanır",
        isMainGoal: true,
        sub: [
          { code: "11.1", title: "Bildirme cümleleri kurar" },
          { code: "11.2", title: "Tahmin cümleleri kurar" },
          { code: "11.3", title: "Neden-sonuç cümleleri kurar" },
          { code: "11.4", title: "Yansıtma cümleleri kurar" },
          { code: "11.5", title: "Yönetme cümleleri kurar" },
        ],
      },
      {
        code: "12.0",
        title: "Verilen konu hakkında konuşur",
        isMainGoal: true,
        sub: [
          { code: "12.1", title: "Günlük yaşamda karşılaştığı olayla ilgili konuşur" },
          { code: "12.2", title: "Yarım bırakılan olayı/hikâyeyi tamamlar" },
          { code: "12.3", title: "Verilen bir konu hakkında düşüncelerini söyler" },
          { code: "12.4", title: "Konu başlığı verilen olay hakkında konuşur" },
          { code: "12.5", title: "Verilen tartışma konusu hakkında düşüncelerini söyler" },
          { code: "12.6", title: "Verilen varsayım hakkında düşüncelerini söyler" },
        ],
      },
    ],
  },
  {
    code: "I.2.3",
    area: "hearing_language",
    title: "Alternatif İletişim",
    goals: [
      {
        code: "1.0",
        title: "Teknolojiye dayalı alternatif iletişim araçları kullanarak iletişim kurar",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Alternatif iletişim aracı kullanarak nesne, eylem, bilgi talep eder" },
          { code: "1.2", title: "Alternatif iletişim aracı kullanarak soruları cevaplar" },
          { code: "1.3", title: "Alternatif iletişim aracı kullanarak duygu ve düşüncelerini ifade eder" },
        ],
      },
    ],
  },
  // ── İşitme: Sosyal İletişim ───────────────────────────────────────────
  {
    code: "I.3.1",
    area: "hearing_social",
    title: "Kişiler Arası İlişkiler",
    goals: [
      {
        code: "1.0",
        title: "Kişilerle iletişim kurar",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Biriyle karşılaştığında selamlaşma sözcüklerini kullanır" },
          { code: "1.2", title: "İlk tanıştığı kişilere kendisini tanıtır" },
          { code: "1.3", title: "Kendisine yöneltilen sorulara uygun cevaplar verir" },
          { code: "1.4", title: "Karşısındaki kişiye konuyla ilgili sorular sorar" },
          { code: "1.5", title: "Gereksinim duyduğunda sohbete uygun şekilde ara verir" },
          { code: "1.6", title: "Sohbet bittiğinde vedalaşma sözcüklerini kullanır" },
        ],
      },
      {
        code: "2.0",
        title: "Duygu ve düşüncelerini ifade eder",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Verilen yüz ifadelerini içeren duyguyu ve düşünceyi ifade eder" },
          { code: "2.2", title: "Örnek olaylarda ve hikâyelerde verilmek istenen duyguyu ve düşünceyi ifade eder" },
          { code: "2.3", title: "Yaşadığı olaylar karşısındaki duygu ve düşüncelerini ifade eder" },
        ],
      },
      {
        code: "3.0",
        title: "Belli durumlara uygun söz öbeklerini kullanır",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Kendisine yardım edildiğinde \"Teşekkür ederim.\" der" },
          { code: "3.2", title: "Hatalı davrandığında \"Özür dilerim.\" der" },
          { code: "3.3", title: "Hasta olan birine \"Geçmiş olsun.\" der" },
          { code: "3.4", title: "Bir şey istediğinde \"Lütfen.\" der" },
        ],
      },
      {
        code: "4.0",
        title: "Karşısındaki kişinin duygu ve düşüncelerine uygun tepkiler verir",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "Karşısındaki kişinin duygu ve düşüncelerine jest ve mimikleriyle tepki verir" },
          { code: "4.2", title: "Karşısındaki kişinin duygu ve düşüncelerine sözel olarak tepki verir" },
        ],
      },
      {
        code: "5.0",
        title: "Gerektiği durumlarda yardım eder",
        isMainGoal: true,
        sub: [
          { code: "5.1", title: "Yardım edeceği durumları fark eder" },
          { code: "5.2", title: "Nasıl yardım edeceğini ifade eder" },
        ],
      },
      {
        code: "6.0",
        title: "Bir gruba katılmaya istekli olur",
        isMainGoal: true,
        sub: [
          { code: "6.1", title: "Gruba katılmaya istekli olduğunu jest ve mimikleriyle belli eder" },
          { code: "6.2", title: "Gruba katılmaya istekli olduğunu sözel olarak ifade eder" },
        ],
      },
      {
        code: "7.0",
        title: "Grup çalışmalarında sorumluluğunu yerine getirir",
        isMainGoal: true,
        sub: [
          { code: "7.1", title: "Grup çalışmalarına katılır" },
          { code: "7.2", title: "Grup çalışmalarının kurallarına uyar" },
          { code: "7.3", title: "Grup çalışmalarının kurallarına uymayanları uyarır" },
          { code: "7.4", title: "Grup içerisindeki sorumluluğunu yerine getirir" },
        ],
      },
    ],
  },
  {
    code: "I.3.2",
    area: "hearing_social",
    title: "Kendini Yönetme",
    goals: [
      {
        code: "1.0",
        title: "Zamanı verimli kullanır",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Kendisine verilen bir görevi istenilen zamanda bitirir" },
          { code: "1.2", title: "Kendisine verilen görevleri öncelik sıralaması yaparak zamanı verimli kullanır" },
          { code: "1.3", title: "Sorumluluklarını yerine getirmek için zamanı verimli kullanır" },
        ],
      },
      {
        code: "2.0",
        title: "Olumsuz durumlar ile karşılaştığında duygu ve düşüncelerini sözel olarak ifade eder",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Yapmak istemediği bir şey kendisinden istendiğinde uygun şekilde reddeder" },
          { code: "2.2", title: "Kendisine yapılmasını istemediği davranışları ifade eder" },
          { code: "2.3", title: "Haksız bir durumla karşılaştığında kendisini savunur" },
        ],
      },
    ],
  },
  // ── İşitme: Öğrenmeye Destek ──────────────────────────────────────────
  {
    code: "I.4.1",
    area: "hearing_learning",
    title: "İşitsel Dikkat ve Bellek",
    goals: [
      {
        code: "1.0",
        title: "İşitsel dikkatini sessiz ortamda sürdürür",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Etkinlik içerisinde verilen uyaranları dinleyerek işitsel dikkatini 5 dakika boyunca sürdürür" },
          { code: "1.2", title: "Etkinlik içerisinde verilen uyaranları dinleyerek işitsel dikkatini 5-10 dakika sürdürür" },
          { code: "1.3", title: "Etkinlik boyunca işitsel dikkatini sürdürür" },
        ],
      },
      {
        code: "2.0",
        title: "İşitsel dikkatini gürültülü ortamda sürdürür",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Etkinlik içerisinde verilen uyaranları dinleyerek işitsel dikkatini 5 dakika sürdürür" },
          { code: "2.2", title: "Etkinlik içerisinde verilen uyaranları dinleyerek işitsel dikkatini 5-10 dakika sürdürür" },
          { code: "2.3", title: "Etkinlik süresince işitsel dikkatini sürdürür" },
        ],
      },
      {
        code: "3.0",
        title: "Sözcüğü dinledikten sonra benzer şekilde tekrar eder",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Konuşma sesini dinledikten sonra benzer şekilde söyler" },
          { code: "3.2", title: "Heceyi dinledikten sonra benzer şekilde söyler" },
          { code: "3.3", title: "Sözcüğü dinledikten sonra benzer şekilde söyler" },
        ],
      },
      {
        code: "4.0",
        title: "Söylenen rakam, sözcük dizisi ve cümleyi tekrar eder",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "Söylenen 3 ve daha fazla rakamı söylenen sıra ile tekrar eder" },
          { code: "4.2", title: "Söylenen aynı kategoriye ait 3 ve daha fazla sözcüğü söylenen sıra ile tekrar eder" },
          { code: "4.3", title: "Söylenen farklı kategoriye ait 3 ve daha fazla sözcüğü söylenen sıra ile tekrar eder" },
          { code: "4.4", title: "Söylenen en az üç sözcüklü cümleyi tekrar eder" },
          { code: "4.5", title: "Kendisine söylenen 10 sözcükten 6 sözcüğü söyler" },
          { code: "4.6", title: "Dinlediği rakam dizisini sondan başa söyler" },
        ],
      },
    ],
  },
  {
    code: "I.4.2",
    area: "hearing_learning",
    title: "Görsel Dikkat ve Bellek",
    goals: [
      {
        code: "1.0",
        title: "Sunulan materyal üzerinde görsel dikkatini sürdürür",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Sunulan materyal üzerinde görsel dikkatini 5 dakika sürdürür" },
          { code: "1.2", title: "Sunulan materyal üzerinde görsel dikkatini 5-10 dakika sürdürür" },
          { code: "1.3", title: "Sunulan materyal üzerinde etkinlik boyunca görsel dikkatini sürdürür" },
        ],
      },
      {
        code: "2.0",
        title: "Aynı özellikteki nesneleri bir araya getirir",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Aynı özellikteki iki nesneyi birbiri ile eşler" },
          { code: "2.2", title: "Aynı özellikteki iki nesneyi verilen seçenekler arasından eşler" },
          { code: "2.3", title: "Aynı özellikteki üç nesneyi bir araya getirir" },
          { code: "2.4", title: "Aynı özellikteki üç nesneyi verilen seçenekler arasından bir araya getirir" },
        ],
      },
      {
        code: "3.0",
        title: "Aynı nesneler arasında farklı olan nesneyi ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Üç nesne arasından farklı olanı gösterir" },
          { code: "3.2", title: "Dört ve daha fazla nesne arasından farklı olanı gösterir" },
        ],
      },
      {
        code: "4.0",
        title: "Aynı nesnelerde farkları ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "Tek fark içeren iki nesne arasındaki farkı söyler" },
          { code: "4.2", title: "İki ve daha fazla fark içeren iki nesne arasındaki farkı söyler" },
        ],
      },
      {
        code: "5.0",
        title: "Örüntü oluşturur",
        isMainGoal: true,
        sub: [
          { code: "5.1", title: "İki farklı materyalle oluşturulmuş örüntüyü devam ettirir" },
          { code: "5.2", title: "İkiden fazla farklı materyalle oluşturulmuş örüntüyü devam ettirir" },
        ],
      },
      {
        code: "6.0",
        title: "Belirli bir süre gösterilip kapatılan nesnelerin farklılıklarını söyler",
        isMainGoal: true,
        sub: [
          { code: "6.1", title: "Belirli bir süre gösterilip kapatılan aralarında tek farklılık içeren nesnelerin farkını söyler" },
          { code: "6.2", title: "Belirli bir süre gösterilip kapatılan iki ve daha fazla fark içeren nesnelerin farkını söyler" },
        ],
      },
      {
        code: "7.0",
        title: "Resimler arasındaki farklılıkları bulur",
        isMainGoal: true,
        sub: [
          { code: "7.1", title: "Tek fark içeren iki resim arasındaki farkı söyler" },
          { code: "7.2", title: "İki ve daha fazla fark içeren iki resim arasındaki farkı söyler" },
          { code: "7.3", title: "Belirli bir süre gösterilip kapatılan tek farklılık içeren iki resim arasındaki farkı söyler" },
          { code: "7.4", title: "Belirli bir süre gösterilip kapatılan iki veya daha fazla farklılık içeren iki resim arasındaki farkı söyler" },
        ],
      },
      {
        code: "8.0",
        title: "Resim ve şeklin parça-bütün ilişkisini kurar",
        isMainGoal: true,
        sub: [
          { code: "8.1", title: "Bir resim ve şeklin eksik bırakılan parçasını bulur" },
          { code: "8.2", title: "Bir kısmı gösterilen nesne ve şekil resmindeki nesnenin ne olduğunu söyler" },
          { code: "8.3", title: "Bir nesne ve şekil resminin parçalarını birleştirerek bütünü yapar" },
          { code: "8.4", title: "Bir resmin ve şeklin istenildiğinde parçasına ve bütününe bakar" },
        ],
      },
      {
        code: "9.0",
        title: "Resimde gizlenmiş nesne resmini ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "9.1", title: "Resimde gizlenmiş tek nesneyi söyler" },
          { code: "9.2", title: "Resmin konusuna uygun olmayan iki veya ikiden fazla nesneyi söyler" },
          { code: "9.3", title: "Resmin konusuna uygun olan tek nesneyi söyler" },
          { code: "9.4", title: "Resmin konusuna uygun olan iki veya ikiden fazla nesneyi söyler" },
        ],
      },
      {
        code: "10.0",
        title: "Gösterildikten sonra kapatılan/saklanan nesneleri/resimleri söyler",
        isMainGoal: true,
        sub: [
          { code: "10.1", title: "Gösterilen ve daha sonra kapatılan/saklanan iki nesneyi sırasıyla söyler" },
          { code: "10.2", title: "Gösterilen ve daha sonra kapatılan/saklanan üç ve daha fazla nesneyi söyler" },
        ],
      },
      {
        code: "11.0",
        title: "Şekil, harf, rakam ve sözcükleri ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "11.1", title: "Şekli ayırt eder" },
          { code: "11.2", title: "Harfi ayırt eder" },
          { code: "11.3", title: "Rakamı ayırt eder" },
          { code: "11.4", title: "Sözcüğü ayırt eder" },
        ],
      },
    ],
  },
  {
    code: "I.4.3",
    area: "hearing_learning",
    title: "Kavramlar",
    goals: [
      {
        code: "1.0",
        title: "Renkleri ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Ana renkleri söyler" },
          { code: "1.2", title: "Ara renkleri söyler" },
        ],
      },
      {
        code: "2.0",
        title: "Giysileri ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Kış mevsiminde giyilen giysileri söyler" },
          { code: "2.2", title: "Yaz mevsiminde giyilen giysileri söyler" },
          { code: "2.3", title: "İlkbahar mevsiminde giyilen giysileri söyler" },
          { code: "2.4", title: "Sonbahar mevsiminde giyilen giysileri söyler" },
        ],
      },
      {
        code: "3.0",
        title: "Hayvanları ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Yürüyen hayvanları söyler" },
          { code: "3.2", title: "Uçan hayvanları söyler" },
          { code: "3.3", title: "Yüzen hayvanları söyler" },
        ],
      },
      {
        code: "4.0",
        title: "Yiyecekleri ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "Meyveleri söyler" },
          { code: "4.2", title: "Sebzeleri söyler" },
        ],
      },
    ],
  },
  // ── İşitme: Okuma ve Yazma ────────────────────────────────────────────
  {
    code: "I.5.1",
    area: "hearing_literacy",
    title: "Erken Okuryazarlık",
    goals: [
      {
        code: "1.0",
        title: "Sözcüklerin ses özelliklerini ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Söylenen sözcük çiftlerinin aynı mı farklı mı olduğunu söyler" },
          { code: "1.2", title: "Söylenen sözcüklerin uyaklı olup olmadığını söyler" },
          { code: "1.3", title: "Söylenen sözcükler arasından uyaklı olanları söyler" },
          { code: "1.4", title: "Söylenen bir sözcükle uyaklı bir sözcük söyler" },
        ],
      },
      {
        code: "2.0",
        title: "Sözcüklerin hece özelliklerini ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Söylenen sözcükleri hecelerine ayırır" },
          { code: "2.2", title: "Söylenen bir sözcüğün ilk hecesini söyler" },
          { code: "2.3", title: "Söylenen bir sözcüğün son hecesini söyler" },
        ],
      },
      {
        code: "3.0",
        title: "Sözcüklerin sesbirim özelliklerini ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Söylenen iki sözcüğün aynı sesle başlayıp başlamadığını söyler" },
          { code: "3.2", title: "Söylenen iki sözcüğün aynı sesle bitip bitmediğini söyler" },
          { code: "3.3", title: "Söylenen üç sözcük arasından aynı sesle başlayan sözcükleri söyler" },
          { code: "3.4", title: "Söylenen üç sözcük arasından aynı sesle biten sözcükleri söyler" },
          { code: "3.5", title: "Söylenen sözcükle aynı sesle başlayan bir sözcük söyler" },
          { code: "3.6", title: "Söylenen sözcüğün ilk sesini söyler" },
          { code: "3.7", title: "Söylenen sözcüğün son sesini söyler" },
          { code: "3.8", title: "Seslerine ayrılarak söylenen kısa bir sözcüğün ne olduğunu söyler" },
          { code: "3.9", title: "Söylenen kısa bir sözcüğü seslerine ayırır" },
        ],
      },
      {
        code: "4.0",
        title: "Yazılı sözcüğü/sözcük gruplarını tanır",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "Verilen resim-yazı ile resim-yazıyı eşler" },
          { code: "4.2", title: "Verilen resim-yazı ile yazıyı eşler" },
          { code: "4.3", title: "Verilen resim ile yazıyı eşler" },
        ],
      },
      {
        code: "5.0",
        title: "Yazının özelliklerini ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "5.1", title: "Yazının soldan sağa olan yönünü gösterir" },
          { code: "5.2", title: "Yazıdaki satırların aşağıya akış yönünü gösterir" },
          { code: "5.3", title: "Yazı içinde büyük bir harfi gösterir" },
          { code: "5.4", title: "Yazı içinde küçük bir harfi gösterir" },
        ],
      },
    ],
  },
  {
    code: "I.5.2",
    area: "hearing_literacy",
    title: "İlk Okuma ve Yazma",
    goals: [
      {
        code: "1.0",
        title: "Tanıtılan sesi ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Tanıtılan sesle başlayan sözcüklerin görsellerini gösterir" },
          { code: "1.2", title: "Tanıtılan sesle başlayan sözcüklerin hangi sesle başladığını söyler" },
          { code: "1.3", title: "Tanıtılan sesle biten sözcüklerin görsellerini gösterir" },
          { code: "1.4", title: "Tanıtılan sesle biten sözcüklerin hangi sesle bittiğini söyler" },
        ],
      },
      {
        code: "2.0",
        title: "Tanıtılan sesi okur",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Tanıtılan sesin küçük harfini okur" },
          { code: "2.2", title: "Tanıtılan sesin büyük harfini okur" },
        ],
      },
      {
        code: "3.0",
        title: "Tanıtılan sesi diğer harfler arasından gösterir",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Tanıtılan sesin küçük harfini diğer sesler arasından gösterir" },
          { code: "3.2", title: "Tanıtılan sesin küçük harfini sözcükler içinde gösterir" },
          { code: "3.3", title: "Tanıtılan sesin büyük harfini diğer sesler arasından gösterir" },
          { code: "3.4", title: "Tanıtılan sesin büyük harfini sözcükler içinde gösterir" },
        ],
      },
      {
        code: "4.0",
        title: "Tanıtılan sesi dik temel harflerle yazar",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "Tanıtılan sesin küçük harfini modele bakarak dik temel harfle yazar" },
          { code: "4.2", title: "Tanıtılan sesin büyük harfini yazar" },
          { code: "4.3", title: "Tanıtılan sesi söylendiğinde yazar" },
        ],
      },
      {
        code: "5.0",
        title: "Tanıtılan sesi hece ve sözcük içinde okur",
        isMainGoal: true,
        sub: [
          { code: "5.1", title: "Tanıtılan seslerden oluşturulan heceleri okur" },
          { code: "5.2", title: "Tanıtılan seslerin bulunduğu hecelerden oluşan sözcükleri okur" },
          { code: "5.3", title: "Okuduğu sözcüklerin resimlerini gösterir" },
        ],
      },
      {
        code: "6.0",
        title: "Tanıtılan sesi hece ve sözcük içinde dik temel harflerle yazar",
        isMainGoal: true,
        sub: [
          { code: "6.1", title: "Tanıtılan seslerden oluşturulan heceleri bakarak yazar" },
          { code: "6.2", title: "Tanıtılan seslerden oluşturulan heceleri söylendiğinde yazar" },
          { code: "6.3", title: "Tanıtılan seslerin bulunduğu hecelerden oluşan sözcükleri bakarak yazar" },
          { code: "6.4", title: "Tanıtılan seslerin bulunduğu hecelerden oluşan sözcükleri söylendiğinde yazar" },
        ],
      },
      {
        code: "7.0",
        title: "Sesi cümle ve metin içinde okur",
        isMainGoal: true,
        sub: [
          { code: "7.1", title: "Tanıtılan seslerden oluşturulan cümleleri okur" },
          { code: "7.2", title: "Tanıtılan seslerden oluşturulan metinleri okur" },
        ],
      },
      {
        code: "8.0",
        title: "Sesi cümle içinde dik temel harflerle yazar",
        isMainGoal: true,
        sub: [
          { code: "8.1", title: "Tanıtılan seslerin bulunduğu cümleleri bakarak yazar" },
          { code: "8.2", title: "Tanıtılan seslerin bulunduğu cümleleri söylendiğinde yazar" },
        ],
      },
      {
        code: "9.0",
        title: "Düzgün/okunaklı yazar",
        isMainGoal: true,
        sub: [
          { code: "9.1", title: "Satır takibi yaparak yazar" },
          { code: "9.2", title: "Harfler arasında uygun boşluk bırakarak sözcük yazar" },
          { code: "9.3", title: "Sözcükler arasında uygun boşluk bırakarak cümle yazar" },
          { code: "9.4", title: "Cümleler arasında uygun boşluk bırakarak metin yazar" },
        ],
      },
      {
        code: "10.0",
        title: "Tanıtılan sesin bulunduğu cümle ve metin hakkında sorulan sorulara cevap verir",
        isMainGoal: true,
        sub: [
          { code: "10.1", title: "Tanıtılan seslerin bulunduğu cümleleri okuduktan sonra cümle ile ilgili basit soruya cevap verir" },
          { code: "10.2", title: "Tanıtılan seslerin bulunduğu metinleri okuduktan sonra metinle ilgili basit sorulara cevap verir" },
        ],
      },
    ],
  },
  {
    code: "I.5.3",
    area: "hearing_literacy",
    title: "Dil Bilgisi",
    goals: [
      {
        code: "1.0",
        title: "Hece özelliklerini ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Verilen bir sözcüğü hecelerine ayırarak yazar" },
          { code: "1.2", title: "Verilen bir sözcükteki hece sayısını söyler" },
          { code: "1.3", title: "Bir iki üç dört harfli hecelere örnekler verir" },
        ],
      },
      {
        code: "2.0",
        title: "Cümledeki sözcük türlerini ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "İstenen sözcük türünü cümle içinde gösterir" },
          { code: "2.2", title: "İstenen sözcük türünü cümle içinde kullanır" },
          { code: "2.3", title: "Cümledeki boşlukları uygun sözcük türü ile doldurur" },
          { code: "2.4", title: "İstenen sözcük türlerini tanımlar" },
          { code: "2.5", title: "Sözcük türlerini sınıflar" },
        ],
      },
      {
        code: "3.0",
        title: "Sözcüklerdeki ekleri ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Çekim eklerini sözcük içerisinde gösterir" },
          { code: "3.2", title: "Yapım eklerini sözcük içerisinde gösterir" },
          { code: "3.3", title: "Cümledeki sözcükleri uygun çekim ekleriyle tamamlar" },
          { code: "3.4", title: "Cümledeki sözcükleri uygun yapım ekleriyle tamamlar" },
          { code: "3.5", title: "İstenen çekim eki ile cümle kurar" },
          { code: "3.6", title: "İstenen yapım eki ile cümle kurar" },
          { code: "3.7", title: "Çekim ve yapım eklerini sınıflandırır" },
        ],
      },
      {
        code: "4.0",
        title: "Sözcükleri yapısına göre ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "İstenen yapıdaki sözcüğü cümle içinden gösterir" },
          { code: "4.2", title: "Verilen sözcüğün hangi yapıda olduğunu söyler" },
          { code: "4.3", title: "İstenen yapıya uygun sözcük örnekleri verir" },
          { code: "4.4", title: "Sözcük yapılarını tanımlar" },
          { code: "4.5", title: "Cümle/metindeki sözcükleri yapısına göre sınıflar" },
        ],
      },
      {
        code: "5.0",
        title: "Sözcükleri anlam bakımından ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "5.1", title: "Anlam bakımından istenen sözcükleri gösterir" },
          { code: "5.2", title: "Sözcükler arası anlam ilişkileri bakımından istenen sözcükleri gösterir" },
          { code: "5.3", title: "İstenen söz öbeklerini gösterir" },
          { code: "5.4", title: "Cümledeki boşlukları anlam bakımından uygun sözcük ile tamamlar" },
          { code: "5.5", title: "Cümledeki boşlukları sözcükler arası anlam ilişkileri bakımından uygun sözcük ile tamamlar" },
          { code: "5.6", title: "Cümledeki boşlukları anlama uygun söz öbekleri ile tamamlar" },
          { code: "5.7", title: "Anlam bakımından istenen sözcük ile cümle kurar" },
          { code: "5.8", title: "Sözcükler arası anlam ilişkileri bakımından istenen sözcük ile cümle kurar" },
          { code: "5.9", title: "İstenen söz öbekleri ile cümle kurar" },
          { code: "5.10", title: "Sözcükleri anlam özellikleri bakımından sınıflar" },
        ],
      },
      {
        code: "6.0",
        title: "Cümlenin ögelerini ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "6.1", title: "Cümlede yüklemi gösterir" },
          { code: "6.2", title: "Cümlede özneyi gösterir" },
          { code: "6.3", title: "Cümlede nesneyi gösterir" },
          { code: "6.4", title: "Cümlede tümleci gösterir" },
          { code: "6.5", title: "Cümledeki boşlukları uygun yüklem ile tamamlar" },
          { code: "6.6", title: "Cümledeki boşlukları uygun özne ile tamamlar" },
          { code: "6.7", title: "Cümledeki boşlukları uygun nesne ile tamamlar" },
          { code: "6.8", title: "Cümledeki boşlukları uygun tümleç ile tamamlar" },
        ],
      },
      {
        code: "7.0",
        title: "Cümle çeşitlerini ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "7.1", title: "İstenen cümle çeşidini gösterir" },
          { code: "7.2", title: "İstenen cümle çeşidi ile cümleyi tamamlar" },
          { code: "7.3", title: "Cümle çeşitlerini sınıflandırır" },
          { code: "7.4", title: "İstenen cümle çeşidine uygun cümle kurar" },
        ],
      },
      {
        code: "8.0",
        title: "Yazılarında yazım kurallarına uyar",
        isMainGoal: true,
        sub: [
          { code: "8.1", title: "Cümleye büyük harfle başlar" },
          { code: "8.2", title: "Özel isimlerin ilk harflerini büyük harfle yazar" },
          { code: "8.3", title: "Sayıları yazım kurallarına uygun yazar" },
          { code: "8.4", title: "\"mi\" soru ekini sözcükten ayrı yazar" },
          { code: "8.5", title: "Kısaltmaları yazım kurallarına uygun yazar" },
        ],
      },
      {
        code: "9.0",
        title: "Yazılarında uygun noktalama işaretlerini kullanır",
        isMainGoal: true,
        sub: [
          { code: "9.1", title: "Cümle sonuna anlamına uygun noktalama işaretlerini yerleştirir" },
          { code: "9.2", title: "Özel isme gelen ekleri kesme işareti ile ayırır" },
          { code: "9.3", title: "Cümle içine uygun noktalama işaretlerini yerleştirir" },
          { code: "9.4", title: "Konuşma bildiren ifadelere uygun noktalama işaretlerini yerleştirir" },
        ],
      },
    ],
  },
  {
    code: "I.5.4",
    area: "hearing_literacy",
    title: "Okuduğunu Anlama",
    goals: [
      {
        code: "1.0",
        title: "Metin yapılarındaki ögeleri belirler",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Öykülerde ana karakteri/karakterleri belirler" },
          { code: "1.2", title: "Öykülerde yardımcı karakterleri belirler" },
          { code: "1.3", title: "Öykülerde olayın geçtiği yeri belirler" },
          { code: "1.4", title: "Öykülerde olayın geçtiği zamanı belirler" },
          { code: "1.5", title: "Öykülerin ana olaylarını belirler" },
          { code: "1.6", title: "Bilgi verici metinde tanımlama yapılan bölümleri belirler" },
          { code: "1.7", title: "Bilgi verici metinde neden-sonuç ilişkisi bulunan bölümleri belirler" },
          { code: "1.8", title: "Bilgi verici metinde karşılaştırma yapılan bölümleri belirler" },
          { code: "1.9", title: "Bilgi verici metinde sıralama yapılan bölümleri belirler" },
          { code: "1.10", title: "Bilgi verici metinde problem çözüm bölümlerini belirler" },
        ],
      },
      {
        code: "2.0",
        title: "Okuma öncesi okuduğunu anlama stratejilerini uygular",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Metnin başlığından yola çıkarak metnin içeriği hakkında tahminlerde bulunur" },
          { code: "2.2", title: "Metindeki resimden yola çıkarak metnin içeriği hakkında tahminlerde bulunur" },
        ],
      },
      {
        code: "3.0",
        title: "Okuma sırasında okuduğunu anlama stratejilerini uygular",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Metni okurken sonraki olaylar hakkında tahminde bulunur" },
          { code: "3.2", title: "Metni okurken olaylar arasında neden-sonuç ilişkisi kurar" },
          { code: "3.3", title: "Metni okurken anlama ulaşmak amacıyla kendine soru sorar" },
          { code: "3.4", title: "Metni okurken bilmediği sözcüklerin anlamlarını tahmin eder" },
        ],
      },
      {
        code: "4.0",
        title: "Okuma sonrası okuduğunu anlama stratejilerini uygular",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "Metni sözlü olarak anlatır" },
          { code: "4.2", title: "Metinle ilişkili sözlü sorulara cevap verir" },
          { code: "4.3", title: "Metinle ilişkili yazılı sorulara cevap verir" },
        ],
      },
      {
        code: "5.0",
        title: "Metnin konusunu ve ana fikrini söyler",
        isMainGoal: true,
        sub: [
          { code: "5.1", title: "Metnin konusunu söyler" },
          { code: "5.2", title: "Metnin ana fikrini söyler" },
          { code: "5.3", title: "Ana fikri destekleyen yardımcı fikirleri söyler" },
        ],
      },
      {
        code: "6.0",
        title: "Metinde yeni öğrendiği sözcük ve sözcük gruplarını anlamına uygun kullanır",
        isMainGoal: true,
        sub: [
          { code: "6.1", title: "Anlamını bilmediği sözcüklerin anlamlarını görselden hareketle tahmin eder" },
          { code: "6.2", title: "Anlamını bilmediği sözcüklerin anlamlarını ilgili paragraftan yola çıkarak tahmin eder" },
          { code: "6.3", title: "Yeni öğrendiği sözcüklerle anlamına uygun cümle kurar" },
        ],
      },
    ],
  },
  {
    code: "I.5.5",
    area: "hearing_literacy",
    title: "Dinlediğini Anlama",
    goals: [
      {
        code: "1.0",
        title: "Resimleri paylaşılan olayları anlatır",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Resimleri paylaşılan hikâyedeki olayları anlatır" },
          { code: "1.2", title: "Resimleri paylaşılan bilgi verici olayları anlatır" },
        ],
      },
      {
        code: "2.0",
        title: "Resimleri paylaşılan olaylara ilişkin sorulara cevap verir",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Cevabı resimlerde doğrudan görünen sorulara cevap verir" },
          { code: "2.2", title: "Olayları tahmin etmeye yönelik sorulara cevap verir" },
          { code: "2.3", title: "Olaylar arasında ilişki kurmaya yönelik sorulara cevap verir" },
          { code: "2.4", title: "Olaylar ile ilgili yaşantısına yönelik sorulara cevap verir" },
        ],
      },
      {
        code: "3.0",
        title: "Dinleme öncesi dinlediğini anlama stratejilerini uygular",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Kitabın adından/başlıktan yola çıkarak dinleyeceği metin hakkında tahminde bulunur" },
          { code: "3.2", title: "Kitabın kapak resminden yola çıkarak dinleyeceği metin hakkında tahminde bulunur" },
        ],
      },
      {
        code: "4.0",
        title: "Dinleme sırasında dinlediğini anlama stratejilerini uygular",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "Dinleme sırasında sonraki olaylar hakkında tahminde bulunur" },
          { code: "4.2", title: "Dinleme sırasında olaylar arasında neden-sonuç ilişkisi kurar" },
          { code: "4.3", title: "Dinleme sırasında bilmediği sözcüklerin anlamlarını tahmin eder" },
        ],
      },
      {
        code: "5.0",
        title: "Dinleme sonrası dinlediğini anlama stratejilerini uygular",
        isMainGoal: true,
        sub: [
          { code: "5.1", title: "Dinlediği metni sözlü olarak anlatır" },
          { code: "5.2", title: "Dinlediği metinle ilişkili sözlü sorulara cevap verir" },
          { code: "5.3", title: "Dinlediği metinde ilk kez karşılaştığı sözcüklerin anlamlarını söyler" },
        ],
      },
      {
        code: "6.0",
        title: "Dinlediği kitabın konusunu ve ana fikrini söyler",
        isMainGoal: true,
        sub: [
          { code: "6.1", title: "Dinlediği kitabın konusunu söyler" },
          { code: "6.2", title: "Dinlediği kitabın ana fikrini söyler" },
          { code: "6.3", title: "Ana fikri destekleyen yardımcı fikirleri söyler" },
        ],
      },
    ],
  },
  {
    code: "I.5.6",
    area: "hearing_literacy",
    title: "Yazılı Anlatım",
    goals: [
      {
        code: "1.0",
        title: "Paylaşılan etkinlikten yola çıkarak olayları/duygu ve düşüncelerini yazar",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Resimleri paylaşılan olayları yazar" },
          { code: "1.2", title: "Dinlediği olayları yazar" },
        ],
      },
      {
        code: "2.0",
        title: "Yazma sürecini uygular",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Yazma öncesi konu seçer" },
          { code: "2.2", title: "Yazısına taslak çıkarır" },
          { code: "2.3", title: "Metni yazar" },
          { code: "2.4", title: "Yazdığı metni gözden geçirir ve düzeltir" },
          { code: "2.5", title: "Yazısını paylaşır" },
        ],
      },
    ],
  },
  // ── İşitme: Erken Matematik ───────────────────────────────────────────
  {
    code: "I.6.1",
    area: "hearing_early_math",
    title: "Nesne Nitelikleri",
    goals: [
      {
        code: "1.0",
        title: "Nesneleri ölçülebilir özelliklerine göre karşılaştırır",
        isMainGoal: true,
        sub: [
          { code: "1.1",  title: "İki çokluk arasından az olanı söyler" },
          { code: "1.2",  title: "İki çokluk arasından çok olanı söyler" },
          { code: "1.3",  title: "İki nesne arasından büyük olanı söyler" },
          { code: "1.4",  title: "İki nesne arasından küçük olanı söyler" },
          { code: "1.5",  title: "İki nesne arasından uzun olanı söyler" },
          { code: "1.6",  title: "İki nesne arasından kısa olanı söyler" },
          { code: "1.7",  title: "İki nesne arasından kalın olanı söyler" },
          { code: "1.8",  title: "İki nesne arasından ince olanı söyler" },
          { code: "1.9",  title: "İki nesne arasından geniş olanı söyler" },
          { code: "1.10", title: "İki nesne arasından dar olanı söyler" },
          { code: "1.11", title: "İki nesne arasından ağır olanı söyler" },
          { code: "1.12", title: "İki nesne arasından hafif olanı söyler" },
          { code: "1.13", title: "İki nesne arasından içi dolu olanı söyler" },
          { code: "1.14", title: "İki nesne arasından içi boş olanı söyler" },
        ],
      },
      {
        code: "2.0",
        title: "Nesneleri ölçülebilir özelliklerine göre sıralar",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "İkiden fazla çokluğu miktarlarına göre sıralar" },
          { code: "2.2", title: "İkiden fazla nesneyi büyüklüklerine göre sıralar" },
          { code: "2.3", title: "İkiden fazla nesneyi uzunluklarına göre sıralar" },
          { code: "2.4", title: "İkiden fazla nesneyi kalınlıklarına göre sıralar" },
          { code: "2.5", title: "İkiden fazla nesneyi genişliklerine göre sıralar" },
          { code: "2.6", title: "İkiden fazla nesneyi ağırlıklarına göre sıralar" },
        ],
      },
    ],
  },
  {
    code: "I.6.2",
    area: "hearing_early_math",
    title: "Uzamsal İlişkiler",
    goals: [
      {
        code: "1.0",
        title: "Nesnenin mekândaki konumunu söyler",
        isMainGoal: true,
        sub: [
          { code: "1.1",  title: "Bir nesnenin başka bir nesnenin içinde olduğunu söyler" },
          { code: "1.2",  title: "Bir nesnenin başka bir nesnenin dışında olduğunu söyler" },
          { code: "1.3",  title: "Bir nesnenin başka bir nesnenin üstünde olduğunu söyler" },
          { code: "1.4",  title: "Bir nesnenin başka bir nesnenin altında olduğunu söyler" },
          { code: "1.5",  title: "Bir nesnenin başka bir nesnenin uzağında olduğunu söyler" },
          { code: "1.6",  title: "Bir nesnenin başka bir nesnenin yakınında olduğunu söyler" },
          { code: "1.7",  title: "Bir nesnenin başka bir nesnenin önünde olduğunu söyler" },
          { code: "1.8",  title: "Bir nesnenin başka bir nesnenin arkasında olduğunu söyler" },
          { code: "1.9",  title: "Bir nesnenin başka bir nesnenin sağında olduğunu söyler" },
          { code: "1.10", title: "Bir nesnenin başka bir nesnenin solunda olduğunu söyler" },
          { code: "1.11", title: "Bir nesnenin başka bir nesnenin yanında olduğunu söyler" },
          { code: "1.12", title: "Bir nesnenin diğer iki nesnenin arasında olduğunu söyler" },
          { code: "1.13", title: "Bir nesnenin başka bir nesneden yüksekte olduğunu söyler" },
          { code: "1.14", title: "Bir nesnenin başka bir nesneden alçakta olduğunu söyler" },
          { code: "1.15", title: "Bir nesne dizisinde nesnenin başta olduğunu söyler" },
          { code: "1.16", title: "Bir nesne dizisinde nesnenin ortada olduğunu söyler" },
          { code: "1.17", title: "Bir nesne dizisinde nesnenin sonda olduğunu söyler" },
        ],
      },
      {
        code: "2.0",
        title: "Nesneleri konumlarına göre sıralar",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Nesneleri uzaklıklarına göre sıralar" },
          { code: "2.2", title: "Nesneleri yakınlıklarına göre sıralar" },
          { code: "2.3", title: "Nesneleri yüksekliklerine göre sıralar" },
          { code: "2.4", title: "Nesneleri alçaklıklarına göre sıralar" },
        ],
      },
    ],
  },
  {
    code: "I.6.3",
    area: "hearing_early_math",
    title: "Sayılar",
    goals: [
      {
        code: "1.0",
        title: "Ritmik sayar",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "0'dan 10'a kadar ileri doğru birer ritmik sayar" },
          { code: "1.2", title: "10'dan başlayarak geriye doğru birer ritmik sayar" },
          { code: "1.3", title: "0-10 arası verilen bir sayıdan başlayarak 10'a kadar ileri doğru birer ritmik sayar" },
        ],
      },
      {
        code: "2.0",
        title: "10'a kadar bir sayıya karşılık gelen çokluğu tane olarak ifade eder",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "1-4 tane nesneyi saymadan kaç tane nesne olduğunu söyler" },
          { code: "2.2", title: "Bir grup nesneyi sayarak kaç tane nesne olduğunu söyler" },
          { code: "2.3", title: "Resimdeki nesneleri sayarak kaç tane nesne olduğunu söyler" },
          { code: "2.4", title: "Bir grup nesne içinden istenilen sayıda nesneyi sayarak ayırır" },
          { code: "2.5", title: "1-5 tane nesne farklı konumlandırıldığında nesne sayısının değişmediğini söyler" },
          { code: "2.6", title: "Hiç nesne olmadığında nesne sayısının sıfır olduğunu söyler" },
        ],
      },
      {
        code: "3.0",
        title: "Rakamları okur ve yazar",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Rakamları okur" },
          { code: "3.2", title: "İstenilen rakamı diğer rakamlar arasından gösterir" },
          { code: "3.3", title: "Rakamları modele bakarak yazar" },
          { code: "3.4", title: "0-9 arasında söylenen bir rakamı yazar" },
        ],
      },
      {
        code: "4.0",
        title: "Sayıları sembollerle ifade eder",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "10'a kadar olan bir grup nesnenin sayısını rakamla yazar" },
          { code: "4.2", title: "1-10 arası bir sayıyı ifade etmek için o sayı kadar şekil/resim çizer" },
        ],
      },
      {
        code: "5.0",
        title: "1'den 10'a kadar sayıları sıralar",
        isMainGoal: true,
        sub: [
          { code: "5.1", title: "1'den 10'a kadar sayıları sıralı bir şekilde yazar" },
          { code: "5.2", title: "1-10 arası verilen bir sayıdan sonra gelen sayıyı yazar" },
          { code: "5.3", title: "1-10 arası verilen bir sayıdan önce gelen sayıyı yazar" },
          { code: "5.4", title: "1'den 10'a kadar verilen sıralı sayılardan eksik olan sayıyı yazar" },
          { code: "5.5", title: "Karışık sırada verilen sayıları sıralı şekilde yazar" },
          { code: "5.6", title: "1'den 10'a kadar verilen sayı dizisinde eksik bırakılan sayıları verilen sayılarla tamamlar" },
          { code: "5.7", title: "1'den 10'a kadar verilen sayı dizisinde eksik bırakılan sayıyı yazar" },
        ],
      },
      {
        code: "6.0",
        title: "İki nesne grubunu bire bir eşleyerek karşılaştırma yapar",
        isMainGoal: true,
        sub: [
          { code: "6.1", title: "1-10 arasında aynı sayıdaki iki nesne grubunu bire bir eşleyerek eşit olduğunu söyler" },
          { code: "6.2", title: "1-10 arasında farklı sayıdaki iki nesne grubunu bire bir eşleyerek fazla olanı söyler" },
          { code: "6.3", title: "1-10 arasında farklı sayıdaki iki nesne grubunu bire bir eşleyerek az olanı söyler" },
        ],
      },
      {
        code: "7.0",
        title: "0-10 arasındaki iki sayıyı karşılaştırır",
        isMainGoal: true,
        sub: [
          { code: "7.1", title: "0-10 arasındaki iki sayıyı karşılaştırarak eşit olduğunu söyler" },
          { code: "7.2", title: "0-10 arasındaki iki sayıyı karşılaştırarak hangisinin büyük olduğunu söyler" },
          { code: "7.3", title: "0-10 arasındaki iki sayıyı karşılaştırarak hangisinin küçük olduğunu söyler" },
        ],
      },
    ],
  },
  {
    code: "I.6.4",
    area: "hearing_early_math",
    title: "Parça-Bütün",
    goals: [
      {
        code: "1.0",
        title: "Parça-bütün ilişkisini kurar",
        isMainGoal: true,
        sub: [
          { code: "1.1",  title: "Bütün olan nesneyi/resmi gösterir" },
          { code: "1.2",  title: "Yarım olan nesneyi/resmi gösterir" },
          { code: "1.3",  title: "Çeyrek olan nesneyi/resmi gösterir" },
          { code: "1.4",  title: "Bir bütünü iki eş parçaya ayırır" },
          { code: "1.5",  title: "İki yarımı birleştirerek bir bütün oluşturur" },
          { code: "1.6",  title: "Bir bütünün iki eş parçasından birinin yarım olduğunu söyler" },
          { code: "1.7",  title: "İki yarımın bir bütünü oluşturduğunu söyler" },
          { code: "1.8",  title: "Bir bütünün iki yarımdan oluştuğunu söyler" },
          { code: "1.9",  title: "Bir bütünü dört eş parçaya ayırır" },
          { code: "1.10", title: "Dört çeyreği birleştirerek bütünü oluşturur" },
          { code: "1.11", title: "Bir bütünün 4 eş parçasından birinin çeyrek olduğunu söyler" },
          { code: "1.12", title: "Bir bütünün 4 çeyrekten oluştuğunu söyler" },
          { code: "1.13", title: "İki çeyrekten bir yarımı oluşturur" },
          { code: "1.14", title: "İki çeyreğin bir yarımı oluşturduğunu söyler" },
        ],
      },
    ],
  },
  {
    code: "I.6.5",
    area: "hearing_early_math",
    title: "Toplama-Çıkarma",
    goals: [
      {
        code: "1.0",
        title: "Toplamı 10'u geçmeyen sayılarla toplama işlemi yapar",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Nesne grubuna belirtilen sayı kadar nesne ekler" },
          { code: "1.2", title: "Nesne eklediği grubun sayısının arttığını söyler" },
          { code: "1.3", title: "Toplamı 10'u geçmeyen toplama işlemlerini gerçek nesnelerle modelleyerek yapar" },
          { code: "1.4", title: "Toplamı 10'u geçmeyen toplama işlemlerini zihinden yapar" },
          { code: "1.5", title: "Toplamı 10'u geçmeyen toplama işlemi gerektiren sözel problemleri nesnelerle modelleyerek çözer" },
          { code: "1.6", title: "Toplamı 10'u geçmeyen toplama işlemi gerektiren sözel problemleri zihinden yaparak çözer" },
        ],
      },
      {
        code: "2.0",
        title: "Çıkarma işlemi yapar",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "En az üç farklı nesneden oluşan gruptan çıkarılan bir nesnenin adını söyler" },
          { code: "2.2", title: "Aynı nesnelerin bulunduğu bir gruptan belirtilen sayı kadar nesne ayırır" },
          { code: "2.3", title: "Nesne çıkardığı grubun sayısının azaldığını söyler" },
          { code: "2.4", title: "0-10 arasındaki sayılarla gerçek nesnelerle modelleyerek çıkarma işlemi yapar" },
          { code: "2.5", title: "0-10 arasındaki sayılarla zihinden çıkarma işlemi yapar" },
          { code: "2.6", title: "0-10 arasındaki sayılarla çıkarma işlemi gerektiren sözel problemleri nesnelerle modelleyerek çözer" },
          { code: "2.7", title: "0-10 arasındaki sayılarla çıkarma gerektiren sözel problemleri zihinden yaparak çözer" },
        ],
      },
    ],
  },
  {
    code: "I.6.6",
    area: "hearing_early_math",
    title: "Geometri",
    goals: [
      {
        code: "1.0",
        title: "Geometrik şekilleri tanır",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Geometrik şekilleri eşler" },
          { code: "1.2", title: "Geometrik şekiller arasından istenilen geometrik şekli gösterir" },
          { code: "1.3", title: "Gösterilen geometrik şeklin adını söyler" },
          { code: "1.4", title: "İki veya daha fazla geometrik şekli birleştirerek bir geometrik şekil oluşturur" },
          { code: "1.5", title: "İki veya daha fazla geometrik şekli birleştirerek oluşturulan geometrik şeklin adını söyler" },
        ],
      },
    ],
  },
  {
    code: "I.6.7",
    area: "hearing_early_math",
    title: "Ölçme",
    goals: [
      {
        code: "1.0",
        title: "Standart olmayan ölçme araçlarıyla ölçüm yapar",
        isMainGoal: true,
        sub: [
          { code: "1.1",  title: "Bir uzunluğu ölçmek için standart olmayan uygun ölçme aracını seçer" },
          { code: "1.2",  title: "Bir ağırlığı ölçmek için standart olmayan uygun ölçme aracını seçer" },
          { code: "1.3",  title: "Bir sıvının miktarını ölçmek için standart olmayan uygun ölçme aracını seçer" },
          { code: "1.4",  title: "Standart olmayan ölçme araçlarıyla belirtilen uzunluğu ölçer" },
          { code: "1.5",  title: "Standart olmayan ölçme araçlarıyla belirtilen ağırlığı ölçer" },
          { code: "1.6",  title: "Standart olmayan ölçme araçlarıyla belirtilen sıvı miktarını ölçer" },
          { code: "1.7",  title: "Bir uzunluğu standart olmayan birimler cinsinden tahmin eder" },
          { code: "1.8",  title: "Bir ağırlığı standart olmayan birimler cinsinden tahmin eder" },
          { code: "1.9",  title: "Bir sıvının miktarını standart olmayan birimler cinsinden tahmin eder" },
          { code: "1.10", title: "Ölçüm sonuçlarını tahmin ettiği sonuçlarla karşılaştırır" },
        ],
      },
      {
        code: "2.0",
        title: "Zamanın ölçülebilir bir nitelik olduğunu ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Gün içerisinde kısa ve uzun süreli olayları söyler" },
          { code: "2.2", title: "Farklı sürelere sahip olayları/olay resimlerini gruplandırır" },
          { code: "2.3", title: "Farklı iki olayı/olay resmini kısa ya da uzun süreli olmasına göre karşılaştırır" },
          { code: "2.4", title: "Farklı sürelere sahip olayları/olay resimlerini sıralar" },
        ],
      },
    ],
  },
  {
    code: "I.6.8",
    area: "hearing_early_math",
    title: "Veri",
    goals: [
      {
        code: "1.0",
        title: "En çok iki veri grubuna sahip basit tabloları okur",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Sembol kullanılarak oluşturulmuş basit tabloları okur" },
          { code: "1.2", title: "Rakam kullanılarak oluşturulmuş basit tabloları okur" },
          { code: "1.3", title: "En çok iki veri grubuna sahip basit tablolarla ilgili sorulara cevap verir" },
        ],
      },
      {
        code: "2.0",
        title: "En çok iki veri grubuna sahip basit tablolar oluşturur",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Resimli davranış/etkinlik tablolarını sembol kullanarak doldurur" },
          { code: "2.2", title: "Resimli davranış/etkinlik tablolarını rakam kullanarak doldurur" },
          { code: "2.3", title: "Oluşturduğu en çok iki veri grubuna sahip basit tablolarla ilgili sorulara cevap verir" },
        ],
      },
    ],
  },
  // ── İşitme: Matematik ─────────────────────────────────────────────────
  {
    code: "I.7.1",
    area: "hearing_math",
    title: "Sayılar ve İşlemler",
    goals: [
      {
        code: "1.0",
        title: "Ritmik sayar",
        isMainGoal: true,
        sub: [
          { code: "1.1",  title: "1'den 100'e kadar ileri doğru birer ritmik sayar" },
          { code: "1.2",  title: "1-20 arası verilen bir sayıdan başlayarak ileri doğru birer ritmik sayar" },
          { code: "1.3",  title: "1'den 100'e kadar ileri doğru onar ritmik sayar" },
          { code: "1.4",  title: "1'den 100'e kadar ileri doğru beşer ritmik sayar" },
          { code: "1.5",  title: "20'ye kadar ileri doğru ikişer ritmik sayar" },
          { code: "1.6",  title: "20'den başlayarak geriye doğru birer ritmik sayar" },
          { code: "1.7",  title: "20'den başlayarak geriye doğru ikişer ritmik sayar" },
          { code: "1.8",  title: "100'e kadar geriye doğru ikişer ritmik sayar" },
          { code: "1.9",  title: "1'den 30'a kadar ileri doğru üçer ritmik sayar" },
          { code: "1.10", title: "1'den 30'a kadar geriye doğru üçer ritmik sayar" },
          { code: "1.11", title: "1'den 40'a kadar ileri doğru dörder ritmik sayar" },
          { code: "1.12", title: "1'den 40'a kadar geriye doğru dörder ritmik sayar" },
          { code: "1.13", title: "1-30 arası verilen bir sayıdan başlayarak ileri doğru üçer ritmik sayar" },
          { code: "1.14", title: "1-30 arası verilen bir sayıdan başlayarak geriye doğru üçer ritmik sayar" },
          { code: "1.15", title: "1-40 arası verilen bir sayıdan başlayarak ileri doğru dörder ritmik sayar" },
          { code: "1.16", title: "1-40 arası verilen bir sayıdan başlayarak geriye doğru dörder ritmik sayar" },
          { code: "1.17", title: "1'den 60'a kadar ileri doğru altışar ritmik sayar" },
          { code: "1.18", title: "1'den 70'e kadar ileri doğru yedişer ritmik sayar" },
          { code: "1.19", title: "1'den 80'e kadar ileri doğru sekizer ritmik sayar" },
          { code: "1.20", title: "1'den 90'a kadar ileri doğru dokuzar ritmik sayar" },
          { code: "1.21", title: "100'den 1000'e kadar ileri doğru yüzer ritmik sayar" },
          { code: "1.22", title: "1000'den geriye doğru yüzer ritmik sayar" },
          { code: "1.23", title: "1-1000 arası verilen bir sayıdan başlayarak ileri doğru onar ritmik sayar" },
          { code: "1.24", title: "1-1000 arası verilen bir sayıdan başlayarak ileri doğru yüzer ritmik sayar" },
          { code: "1.25", title: "10.000'e kadar biner ritmik sayar" },
        ],
      },
      {
        code: "2.0",
        title: "Nesneleri/nesne resimlerini sayar",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Yan yana sıralı olan 1-20 arası nesne/nesne resimlerini birer birer sayar" },
          { code: "2.2", title: "Karışık olarak sıralanmış nesne/nesne resimlerini birer birer sayar" },
          { code: "2.3", title: "Nesne sayısı 100'e kadar olan bir gruptaki nesne/nesne resimlerini birer birer sayar" },
          { code: "2.4", title: "Nesne sayısı 100'e kadar olan bir gruptaki nesne/nesne resimlerini onar onar sayar" },
          { code: "2.5", title: "Nesne sayısı 100'e kadar olan bir gruptaki nesne/nesne resimlerini beşer beşer sayar" },
          { code: "2.6", title: "Nesne sayısı 100'e kadar olan bir gruptaki nesne/nesne resimlerini ikişer ikişer sayar" },
          { code: "2.7", title: "Nesne sayısı 30'a kadar olan bir gruptaki nesne/nesne resimlerini üçer üçer sayar" },
          { code: "2.8", title: "Nesne sayısı 40'a kadar olan bir gruptaki nesne/nesne resimlerini dörder dörder sayar" },
        ],
      },
      {
        code: "3.0",
        title: "100'e kadar bir sayıya karşılık gelen çokluğu tane olarak ifade eder",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "1-20 arası bir grup nesneyi sayarak kaç tane nesne olduğunu söyler" },
          { code: "3.2", title: "Resimdeki 1-20 arası bir grup nesneyi sayarak kaç tane nesne olduğunu söyler" },
          { code: "3.3", title: "1-20 arası bir grup nesne içinden istenilen sayıda nesneyi sayarak ayırır" },
          { code: "3.4", title: "Resimdeki 20-100 arası bir grup nesneyi sayarak kaç tane nesne olduğunu söyler" },
        ],
      },
      {
        code: "4.0",
        title: "Doğal sayıları okur ve yazar",
        isMainGoal: true,
        sub: [
          { code: "4.1",  title: "Aynı cins 10 varlıktan oluşan çokluğun bir deste olduğunu söyler" },
          { code: "4.2",  title: "Aynı cins 12 varlıktan oluşan çokluğun bir düzine olduğunu söyler" },
          { code: "4.3",  title: "10-20 arasında olan bir grup nesneyi onluk ve birliklerine ayırır" },
          { code: "4.4",  title: "10-20 arasında olan bir grup nesnenin kaç onluk ve kaç birlikten oluştuğunu söyler" },
          { code: "4.5",  title: "Onluk ve birliklerine ayırdığı 10-20 arasındaki nesne grubuna karşılık gelen sayıyı yazar" },
          { code: "4.6",  title: "Onluk ve birliklerine ayırdığı 10-20 arasındaki nesne grubuna karşılık gelen sayıyı okur" },
          { code: "4.7",  title: "1-20 arası sayıları okur" },
          { code: "4.8",  title: "Söylenen 1-20 arası bir sayıyı rakamla yazar" },
          { code: "4.9",  title: "Nesne sayısı 100'den az olan bir çokluğu model kullanarak onluk ve birliklerine ayırır" },
          { code: "4.10", title: "Onluk ve birlik gruplarına ayırdığı çokluğun kaç onluk ve kaç birlikten oluştuğunu söyler" },
          { code: "4.11", title: "Onluk ve birliklerine ayırdığı 20-100 arasındaki bir çokluğa karşılık gelen sayıyı yazar" },
          { code: "4.12", title: "Onluk ve birliklerine ayırdığı 20-100 arasındaki bir çokluğa karşılık gelen sayıyı okur" },
          { code: "4.13", title: "İki basamaklı doğal sayıları okur" },
          { code: "4.14", title: "Söylenen iki basamaklı doğal sayıları rakamla yazar" },
          { code: "4.15", title: "Nesne sayısı 100-1000 olan bir çokluğu model kullanarak yüzlük, onluk ve birliklerine ayırır" },
          { code: "4.16", title: "Yüzlük, onluk ve birliklerine ayırdığı çokluğun kaç yüzlük, kaç onluk ve kaç birlikten oluştuğunu söyler" },
          { code: "4.17", title: "Yüzlük, onluk ve birliklerine ayırdığı 100-1000 arasındaki bir çokluğa karşılık gelen sayıyı yazar" },
          { code: "4.18", title: "Yüzlük, onluk ve birliklerine ayırdığı 100-1000 arasındaki bir çokluğa karşılık gelen sayıyı okur" },
          { code: "4.19", title: "Üç basamaklı doğal sayıları okur" },
          { code: "4.20", title: "Söylenen üç basamaklı doğal sayıları rakamla yazar" },
          { code: "4.21", title: "4, 5 ve 6 basamaklı doğal sayıları okur" },
          { code: "4.22", title: "Söylenen 4, 5 ve 6 basamaklı doğal sayıları rakamla yazar" },
        ],
      },
      {
        code: "5.0",
        title: "Doğal sayıların basamak ve basamak değerlerini söyler ve yazar",
        isMainGoal: true,
        sub: [
          { code: "5.1", title: "100'den küçük doğal sayıların basamak adlarını modeller üzerinde yazar" },
          { code: "5.2", title: "100'den küçük doğal sayıların basamak değerlerini yazar" },
          { code: "5.3", title: "Üç basamaklı sayıların basamak adlarını modeller üzerinde yazar" },
          { code: "5.4", title: "Üç basamaklı sayıların basamak değerlerini modeller üzerinde yazar" },
          { code: "5.5", title: "4, 5 ve 6 basamaklı doğal sayıların basamak adlarını yazar" },
          { code: "5.6", title: "4, 5 ve 6 basamaklı doğal sayıların basamak değerlerini yazar" },
          { code: "5.7", title: "4, 5 ve 6 basamaklı sayıları bölüklerine ayırır" },
          { code: "5.8", title: "4, 5 ve 6 basamaklı sayıları çözümler" },
        ],
      },
      {
        code: "6.0",
        title: "Doğal sayıları sıralar",
        isMainGoal: true,
        sub: [
          { code: "6.1", title: "1'den 20'ye kadar sayıları sıralı bir şekilde yazar" },
          { code: "6.2", title: "1-20 arası verilen bir sayıdan sonra gelen sayıyı yazar" },
          { code: "6.3", title: "1-20 arası verilen bir sayıdan önce gelen sayıyı yazar" },
          { code: "6.4", title: "Karışık sırada verilen sayıları sırasına göre sıralar" },
          { code: "6.5", title: "1'den 20'ye kadar verilen sayı dizisinde eksik bırakılan sayıyı yazar" },
          { code: "6.6", title: "1-100 arası verilen bir sayıdan sonra gelen sayıyı yazar" },
          { code: "6.7", title: "1-100 arası verilen bir sayıdan önce gelen sayıyı yazar" },
          { code: "6.8", title: "1-100 arasında karışık sırada verilen en çok 4 doğal sayıyı sayma sırasına göre sıralar" },
          { code: "6.9", title: "100'den küçük doğal sayılarla oluşturulmuş bir sayı dizisinde eksik bırakılan sayıları yazar" },
        ],
      },
      {
        code: "7.0",
        title: "İki nesne grubunu bire bir eşleyerek karşılaştırma yapar",
        isMainGoal: true,
        sub: [
          { code: "7.1", title: "1-20 arasında aynı sayıdaki iki nesne grubunu bire bir eşleyerek eşit olduğunu söyler" },
          { code: "7.2", title: "1-20 arasında farklı sayıdaki iki nesne grubunu bire bir eşleyerek fazla olanı söyler" },
          { code: "7.3", title: "1-20 arasında farklı sayıdaki iki nesne grubunu eşleyerek bir grubun diğerinden daha fazla olduğunu söyler" },
        ],
      },
      {
        code: "8.0",
        title: "Sayıları sıra bildirmek amacıyla kullanır",
        isMainGoal: true,
        sub: [
          { code: "8.1", title: "Bir sıra dizisi içindeki nesne/nesne resimlerinin sırasını söyler" },
          { code: "8.2", title: "Bir sıra dizisi içinde sırası söylenen nesneyi/nesne resmini gösterir" },
          { code: "8.3", title: "Sıra bildiren sayıyı okur" },
          { code: "8.4", title: "Sıra bildiren sayıyı yazar" },
        ],
      },
      {
        code: "9.0",
        title: "Belli bir kurala göre artan/azalan sayı örüntüsü oluşturur",
        isMainGoal: true,
        sub: [
          { code: "9.1", title: "Aralarındaki fark sabit olan sayı örüntüsünün kuralını söyler" },
          { code: "9.2", title: "Aralarındaki fark sabit olan sayı örüntüsünün eksik bırakılan ögesini bulur" },
          { code: "9.3", title: "Aralarındaki fark sabit olan sayı örüntüsünü en çok 4 adım devam ettirir" },
          { code: "9.4", title: "Belli bir kurala göre artan ya da azalan sayı örüntüsü oluşturur" },
          { code: "9.5", title: "Belli bir kurala göre artan ya da azalan çift kurallı sayı örüntüsü oluşturur" },
          { code: "9.6", title: "Çift kurala göre oluşturduğu sayı örüntüsünün kurallarını söyler" },
        ],
      },
      {
        code: "10.0",
        title: "Doğal sayıları en yakın olduğu onluğa/yüzlüğe/binliğe yuvarlar",
        isMainGoal: true,
        sub: [
          { code: "10.1", title: "100'den küçük bir doğal sayının hangi onluğa yakın olduğunu söyler" },
          { code: "10.2", title: "100'den küçük bir doğal sayıyı yakın olduğu onluğa yuvarlar" },
          { code: "10.3", title: "Üç basamaklı bir doğal sayının hangi onluğa/yüzlüğe yakın olduğunu söyler" },
          { code: "10.4", title: "Üç basamaklı bir doğal sayıyı yakın olduğu onluğa/yüzlüğe yuvarlar" },
          { code: "10.5", title: "Dört basamaklı bir doğal sayının hangi onluğa/yüzlüğe/binliğe yakın olduğunu söyler" },
          { code: "10.6", title: "Dört basamaklı bir doğal sayıyı yakın olduğu onluğa/yüzlüğe/binliğe yuvarlar" },
        ],
      },
      {
        code: "11.0",
        title: "Doğal sayıları tek ya da çift olmalarına göre ayırt eder",
        isMainGoal: true,
        sub: [
          { code: "11.1", title: "Nesneleri gruplayarak nesne sayısının tek ya da çift olduğunu söyler" },
          { code: "11.2", title: "Verilen sayıların tek ya da çift olduğunu söyler" },
          { code: "11.3", title: "İki tek doğal sayının toplamının çift olduğunu söyler" },
          { code: "11.4", title: "İki çift doğal sayının toplamının çift olduğunu söyler" },
          { code: "11.5", title: "Tek ve çift iki doğal sayının toplamının tek olduğunu söyler" },
        ],
      },
      {
        code: "12.0",
        title: "Sayıları Romen rakamlarıyla ifade eder",
        isMainGoal: true,
        sub: [
          { code: "12.1", title: "20'ye kadar olan Romen rakamlarını okur" },
          { code: "12.2", title: "20'ye kadar olan sayıları Romen rakamlarıyla yazar" },
        ],
      },
      {
        code: "13.0",
        title: "Doğal sayılarla toplama işlemi yapar",
        isMainGoal: true,
        sub: [
          { code: "13.1",  title: "Nesne grubuna belirtilen sayı kadar nesne ekleyerek grubun sayısının arttığını söyler" },
          { code: "13.2",  title: "Toplamı 20'yi geçmeyen toplama işlemlerini gerçek nesnelerle modelleyerek yapar" },
          { code: "13.3",  title: "Toplamı 20'yi geçmeyen nesne/nesne resimleri ile gösterilen toplama işlemini sayılara dönüştürür" },
          { code: "13.4",  title: "Eşittir sembolünü kullanır" },
          { code: "13.5",  title: "Toplama işlemi sembolünü (+) kullanır" },
          { code: "13.6",  title: "Toplamı 20'yi geçmeyen sayılarla toplama işlemi yapar" },
          { code: "13.7",  title: "Toplamı 20'yi geçmeyen üç tane bir basamaklı sayı ile toplama işlemi yapar" },
          { code: "13.8",  title: "Toplama işleminde toplananların yerleri değiştiğinde toplamın değişmediğini söyler" },
          { code: "13.9",  title: "Toplamı 20'yi geçmeyen sayılarla yapılan toplama işleminde verilmeyen toplananı yazar" },
          { code: "13.10", title: "Toplamı 20'yi geçmeyen sayılar ile zihinden toplama işlemi yapar" },
          { code: "13.11", title: "Toplamları 100'ü geçmeyen iki sayı ile eldesiz toplama işlemi yapar" },
          { code: "13.12", title: "Toplamları 100'ü geçmeyen iki sayı ile eldeli toplama işlemi yapar" },
          { code: "13.13", title: "Toplamları 100'ü geçmeyen iki sayının toplamında verilmeyen toplananı bulur" },
          { code: "13.14", title: "Toplamları 100'ü geçmeyen iki sayının toplamını tahmin eder" },
          { code: "13.15", title: "Toplamları 100'ü geçmeyen iki sayıyla zihinden toplama işlemi yapar" },
          { code: "13.16", title: "Toplamları 1000'i geçmeyen iki sayı ile eldesiz toplama işlemi yapar" },
          { code: "13.17", title: "Toplamları 1000'i geçmeyen iki sayı ile eldeli toplama işlemi yapar" },
          { code: "13.18", title: "Toplamları 1000'i geçmeyen iki sayının toplamında verilmeyen toplananı bulur" },
          { code: "13.19", title: "Toplamları 1000'i geçmeyen iki sayının toplamını tahmin eder" },
          { code: "13.20", title: "Toplamları 1000'i geçmeyen iki sayıyı zihinden toplar" },
          { code: "13.21", title: "En çok dört basamaklı sayıları parçalama stratejisiyle toplar" },
          { code: "13.22", title: "Toplamları en çok dört basamaklı iki sayının toplamını tahmin eder" },
          { code: "13.23", title: "En çok dört basamaklı sayıları 100'ün katlarıyla zihinden toplar" },
        ],
      },
      {
        code: "14.0",
        title: "Toplama işlemi gerektiren problemleri çözer",
        isMainGoal: true,
        sub: [
          { code: "14.1", title: "Toplamı 20'yi geçmeyen sayılar ile bir toplama işlemi gerektiren problemi çözer" },
          { code: "14.2", title: "Verilenlere uygun toplamı gerektiren problem kurar" },
          { code: "14.3", title: "Toplamları 100'ü geçmeyen sayılar ile en çok iki işlem gerektiren problemleri çözer" },
          { code: "14.4", title: "Verilenlere uygun toplamı gerektiren problem kurar" },
          { code: "14.5", title: "Toplamları 1000'i geçmeyen üç basamaklı sayılarla en çok üç işlem gerektiren problemleri çözer" },
          { code: "14.6", title: "Verilenlere uygun en çok iki işlem gerektiren problem kurar" },
          { code: "14.7", title: "En çok dört basamaklı sayılarla en çok dört işlem gerektiren problem çözer" },
          { code: "14.8", title: "Verilenlere uygun üç işlem gerektiren problem kurar" },
        ],
      },
      {
        code: "15.0",
        title: "Doğal sayılarla çıkarma işlemi yapar",
        isMainGoal: true,
        sub: [
          { code: "15.1",  title: "Nesne grubundan belirtilen sayı kadar nesne çıkararak grubun sayısının azaldığını söyler" },
          { code: "15.2",  title: "20'ye kadar olan sayılarla çıkarma işlemlerini gerçek nesnelerle modelleyerek yapar" },
          { code: "15.3",  title: "0-20 arasındaki nesne/nesne resimleri ile gösterilen çıkarma işlemini sayılara dönüştürür" },
          { code: "15.4",  title: "Çıkarma işlemi sembolünü (-) kullanır" },
          { code: "15.5",  title: "20'ye kadar olan sayılarla çıkarma işlemi yapar" },
          { code: "15.6",  title: "20'ye kadar olan sayılarla zihinden çıkarma işlemi yapar" },
          { code: "15.7",  title: "100'e kadar olan sayılar ile onluk bozmadan çıkarma işlemi yapar" },
          { code: "15.8",  title: "100'e kadar olan sayılar ile onluk bozarak çıkarma işlemi yapar" },
          { code: "15.9",  title: "20'ye kadar olan sayılarla yapılan çıkarma işleminde verilmeyen eksileni bulur" },
          { code: "15.10", title: "20'ye kadar olan sayılarla yapılan çıkarma işleminde verilmeyen çıkanı bulur" },
          { code: "15.11", title: "100'e kadar olan iki sayı ile yapılan çıkarma işleminin sonucunu tahmin eder" },
          { code: "15.12", title: "100 içinde 10'un katı olan iki sayıyı zihinden çıkarır" },
          { code: "15.13", title: "En çok üç basamaklı sayılar ile onluk bozmadan çıkarma işlemi yapar" },
          { code: "15.14", title: "En çok üç basamaklı sayılar ile onluk bozarak çıkarma işlemi yapar" },
          { code: "15.15", title: "100'e kadar olan sayılarla yapılan çıkarma işleminde verilmeyen eksileni bulur" },
          { code: "15.16", title: "100'e kadar olan sayılarla yapılan çıkarma işleminde verilmeyen çıkanı bulur" },
          { code: "15.17", title: "Üç basamaklı sayılarla yapılan çıkarma işleminin sonucunu tahmin eder" },
          { code: "15.18", title: "İki basamaklı bir sayıdan sayıyı zihinden çıkarır" },
          { code: "15.19", title: "Üç basamaklı 100'ün katı olan bir sayıdan 10'un katı olan iki basamaklı bir sayıyı zihinden çıkarır" },
          { code: "15.20", title: "En çok dört basamaklı iki sayı ile onluk bozmadan çıkarma işlemi yapar" },
          { code: "15.21", title: "En çok dört basamaklı iki sayı ile onluk bozarak çıkarma işlemi yapar" },
          { code: "15.22", title: "En çok dört basamaklı sayılarla yapılan çıkarma işleminde verilmeyen eksileni bulur" },
          { code: "15.23", title: "En çok dört basamaklı sayılarla yapılan çıkarma işleminde verilmeyen çıkanı bulur" },
          { code: "15.24", title: "En çok dört basamaklı sayılar ile yapılan çıkarma işleminin sonucunu tahmin eder" },
          { code: "15.25", title: "Üç basamaklı bir sayıdan sayıyı zihinden çıkarır" },
          { code: "15.26", title: "100'ün katı olan üç basamaklı sayıları zihinden çıkarır" },
        ],
      },
      {
        code: "16.0",
        title: "Çıkarma işlemi gerektiren problemleri çözer",
        isMainGoal: true,
        sub: [
          { code: "16.1", title: "20'ye kadar olan sayılar ile bir çıkarma işlemi gerektiren problemi çözer" },
          { code: "16.2", title: "100'e kadar olan sayılarla biri çıkarma olmak üzere iki işlem gerektiren problemleri çözer" },
          { code: "16.3", title: "100'e kadar olan sayılarla çıkarma işlemi gerektiren problem kurar" },
          { code: "16.4", title: "En fazla dört basamaklı sayılarla biri çıkarma olmak üzere en çok üç işlem gerektiren problemleri çözer" },
          { code: "16.5", title: "En fazla dört basamaklı sayılarla biri çıkarma olmak üzere iki işlem gerektiren problem kurar" },
        ],
      },
      {
        code: "17.0",
        title: "Doğal sayılarla çarpma işlemi yapar",
        isMainGoal: true,
        sub: [
          { code: "17.1",  title: "20'ye kadar olan sayılarla tekrarlı toplama işlemini modeller" },
          { code: "17.2",  title: "Çarpma işleminin tekrarlı toplama işlemi olduğunu söyler" },
          { code: "17.3",  title: "Nesne/nesne resimleri ile gösterilen çarpma işlemini sayılara dönüştürür" },
          { code: "17.4",  title: "Çarpma işlemi sembolünü (x) kullanır" },
          { code: "17.5",  title: "10'a kadar olan sayıları 1, 2, 3, 4 ve 5 ile çarpar" },
          { code: "17.6",  title: "5'e kadar çarpım tablosu oluşturur" },
          { code: "17.7",  title: "10'a kadar olan sayıları 6, 7, 8, 9 ve 10 ile çarpar" },
          { code: "17.8",  title: "Çarpım tablosunu oluşturur" },
          { code: "17.9",  title: "100'e kadar olan sayıları çarpar" },
          { code: "17.10", title: "100'e kadar olan sayıları çarpar" },
          { code: "17.11", title: "İki basamaklı bir sayıyı iki basamaklı bir sayı ile çarpar" },
          { code: "17.12", title: "Üç basamaklı bir sayıyı bir basamaklı bir sayı ile çarpar" },
          { code: "17.13", title: "10 ve 100 sayıları ile çarpma işlemi yapar" },
          { code: "17.14", title: "Çarpma işleminde çarpanlardan biri arttırıldığında sonucun nasıl değiştiğini söyler" },
          { code: "17.15", title: "Üç basamaklı sayılarla iki basamaklı sayıları çarpar" },
          { code: "17.16", title: "Üç doğal sayı ile yapılan çarpma işleminde çarpanların yerinin değişmesinin sonucu değiştirmediğini söyler" },
          { code: "17.17", title: "En çok üç basamaklı doğal sayıları 10, 100 ve 1000'in en çok dokuz katı olan sayılarla kısa yoldan çarpar" },
          { code: "17.18", title: "En çok iki basamaklı doğal sayıları 5, 25 ve 50 ile kısa yoldan çarpar" },
          { code: "17.19", title: "En çok üç basamaklı sayıları 10, 100 ve 1000 ile zihinden çarpar" },
          { code: "17.20", title: "En çok iki basamaklı bir doğal sayı ile bir basamaklı bir doğal sayının çarpımını tahmin eder" },
        ],
      },
      {
        code: "18.0",
        title: "Çarpma işlemi gerektiren problemleri çözer",
        isMainGoal: true,
        sub: [
          { code: "18.1", title: "1-100 arası sayılar ile bir çarpma işlemi gerektiren problemi çözer" },
          { code: "18.2", title: "1-100 arası sayılar ile biri çarpma işlemi olmak üzere iki işlem gerektiren problemleri çözer" },
          { code: "18.3", title: "Çarpma işlemi gerektiren problem kurar" },
          { code: "18.4", title: "En fazla üç basamaklı sayılarla biri çarpma işlemi olmak üzere en çok üç işlem gerektiren problemleri çözer" },
          { code: "18.5", title: "En fazla üç basamaklı sayılarla biri çarpma işlemi olmak üzere en çok iki işlem gerektiren problem kurar" },
        ],
      },
      {
        code: "19.0",
        title: "Doğal sayılarla bölme işlemi yapar",
        isMainGoal: true,
        sub: [
          { code: "19.1",  title: "20'ye kadar olan sayılarla bölme işlemini gerçek nesne/nesne resimlerini gruplama ile modeller" },
          { code: "19.2",  title: "20'ye kadar olan sayılarla bölme işlemini gerçek nesne/nesne resimlerini paylaştırarak modeller" },
          { code: "19.3",  title: "0-20 arasındaki nesne/nesne resimleri ile gösterilen kalansız bölme işlemini sayılara dönüştürür" },
          { code: "19.4",  title: "Bölme işlemi sembolünü (÷) kullanır" },
          { code: "19.5",  title: "Bölme işleminde 1'in rolünü söyler" },
          { code: "19.6",  title: "100'e kadar olan sayıları böler" },
          { code: "19.7",  title: "100'e kadar olan sayıları bölenden küçük sayılara böler" },
          { code: "19.8",  title: "100'e kadar sayılarla birler basamağı sıfır olan bir doğal sayıyı böler" },
          { code: "19.9",  title: "Üç basamaklı doğal sayıları en çok iki basamaklı doğal sayılara böler" },
          { code: "19.10", title: "En çok dört basamaklı bir sayıyı tek basamaklı bir sayıya böler" },
          { code: "19.11", title: "Son üç basamağında sıfır olan en çok beş basamaklı doğal sayıları 10, 100 ve 1000'e zihinden böler" },
          { code: "19.12", title: "Bir bölme işleminin sonucunu tahmin eder" },
          { code: "19.13", title: "Çarpma ve bölme arasındaki ilişkiyi söyler" },
          { code: "19.14", title: "Aralarında eşitlik ilişkisi olan iki matematiksel ifadeden birinde verilmeyen değeri belirler" },
          { code: "19.15", title: "Aralarında eşitlik ilişkisi olmayan iki matematiksel ifadenin eşit olması için yapılması gereken işlemleri açıklar" },
        ],
      },
      {
        code: "20.0",
        title: "Bölme işlemi gerektiren problemleri çözer",
        isMainGoal: true,
        sub: [
          { code: "20.1", title: "1-20 arası sayılar kullanılarak 2'ye, 3'e, 4'e en fazla 5'e bölme işlemi gerektiren problemi çözer" },
          { code: "20.2", title: "100'e kadar olan sayılarla biri bölme olacak şekilde iki işlem gerektiren problemleri çözer" },
          { code: "20.3", title: "100'e kadar olan sayılarla bölme işlemi gerektiren problem kurar" },
          { code: "20.4", title: "En fazla dört basamaklı sayılarla biri bölme olacak şekilde en çok üç işlem gerektiren problemleri çözer" },
          { code: "20.5", title: "En fazla dört basamaklı sayılarla biri bölme olacak şekilde iki işlem gerektiren problem kurar" },
        ],
      },
      {
        code: "21.0",
        title: "Bütün, yarım ve çeyrek modellerini ilişkilendirerek kesir gösterimini kullanır",
        isMainGoal: true,
        sub: [
          { code: "21.1",  title: "Bütün olan nesne/nesne resmini gösterir" },
          { code: "21.2",  title: "Yarım olan nesne/nesne resmini gösterir" },
          { code: "21.3",  title: "Bir bütünün iki eş parçasından birinin yarım olduğunu söyler" },
          { code: "21.4",  title: "Bütün ile yarımı ilişkilendirir" },
          { code: "21.5",  title: "Çeyrek olan nesneyi/nesne resmini gösterir" },
          { code: "21.6",  title: "Bir bütünün dört eş parçasından birinin çeyrek olduğunu söyler" },
          { code: "21.7",  title: "Bir yarımın iki eş parçasından birinin çeyrek olduğunu söyler" },
          { code: "21.8",  title: "Çeyrek ile yarımı ilişkilendirir" },
          { code: "21.9",  title: "Bir bütünün bir yarım ve iki çeyrekten oluştuğunu söyler" },
          { code: "21.10", title: "Bütün, yarım ve çeyrek modellerini kesir biçiminde gösterir" },
          { code: "21.11", title: "Yarımı, çeyreği, bütünü ifade eden kesri söyler" },
          { code: "21.12", title: "Kesrin parça-bütün anlamını söyler" },
          { code: "21.13", title: "Bir kesri okur" },
        ],
      },
      {
        code: "22.0",
        title: "Birim kesirleri gösterir, karşılaştırır ve sıralar",
        isMainGoal: true,
        sub: [
          { code: "22.1", title: "Bir bütünün eş parçalarını gösterir" },
          { code: "22.2", title: "Bir bütünün eş parçalarından her birinin birim kesir olduğunu söyler" },
          { code: "22.3", title: "Paydası 10, 100 olan kesirlerin birim kesirlerini söyler" },
          { code: "22.4", title: "Bir çokluğun belirtilen birim kesir kadarını modelleyerek söyler" },
          { code: "22.5", title: "Birim kesirleri büyüklük-küçüklük ilişkisine göre karşılaştırır" },
          { code: "22.6", title: "Birim kesirleri büyüklük-küçüklük ilişkisine göre sıralar" },
        ],
      },
      {
        code: "23.0",
        title: "Bileşik ve tam sayılı kesri ayırt eder ve modeller",
        isMainGoal: true,
        sub: [
          { code: "23.1", title: "Payı paydasından büyük kesirleri gösterir" },
          { code: "23.2", title: "Basit, bileşik ve tam sayılı kesri modelleyerek söyler" },
        ],
      },
      {
        code: "24.0",
        title: "Kesirleri karşılaştırır",
        isMainGoal: true,
        sub: [
          { code: "24.1", title: "Verilen bir kesri sayı doğrusu üzerinde gösterir" },
          { code: "24.2", title: "Paydaları eşit olan en çok üç kesri büyüklük-küçüklük ilişkisine göre sıralar" },
        ],
      },
    ],
  },
  {
    code: "1.2",
    area: "speech",
    title: "Hızlı Bozuk Konuşma",
    goals: [
      {
        code: "1.0",
        title: "Hızlı-bozuk konuştuğunu belirtir",
        isMainGoal: true,
        sub: [
          { code: "1.1", title: "Konuşma hızındaki değişiklikleri ayırt eder" },
          { code: "1.2", title: "Hızlı-bozuk konuşmayı normal konuşmadan ayırt eder" },
        ],
      },
      {
        code: "2.0",
        title: "Konuşma sırasında doğru nefes kontrolünü sağlar",
        isMainGoal: true,
        sub: [
          { code: "2.1", title: "Konuşmaya başlamadan önce nefes alır" },
          { code: "2.2", title: "Nefes verirken konuşur" },
        ],
      },
      {
        code: "3.0",
        title: "Konuşma prozodisini ayarlayarak konuşur",
        isMainGoal: true,
        sub: [
          { code: "3.1", title: "Konuşma sırasında uygun yerlerde vurgu yapar" },
          { code: "3.2", title: "Konuşma sırasında ses tonundaki iniş-çıkışları uygun şekilde ayarlar" },
          { code: "3.3", title: "Konuşma sırasında uygun hızla konuşur" },
        ],
      },
      {
        code: "4.0",
        title: "Tam ve anlaşılır konuşur",
        isMainGoal: true,
        sub: [
          { code: "4.1", title: "Giderek artan uzunluktaki sözcükleri tam ve anlaşılır söyler" },
          { code: "4.2", title: "Sözcük gruplarını tam ve anlaşılır söyler" },
          { code: "4.3", title: "Cümle düzeyinde tam ve anlaşılır konuşur" },
          { code: "4.4", title: "Anlatı düzeyinde tam ve anlaşılır konuşur" },
          { code: "4.5", title: "Terapistle tam ve anlaşılır konuşarak sohbet eder" },
        ],
      },
      {
        code: "5.0",
        title: "Tam ve anlaşılır konuşmayı farklı kişi, ortam ve durumlara geneller",
        isMainGoal: true,
        sub: [
          { code: "5.1", title: "Farklı kişilerle tam ve anlaşılır konuşur" },
          { code: "5.2", title: "Farklı ortamlarda tam ve anlaşılır konuşur" },
          { code: "5.3", title: "Farklı durumlarda tam ve anlaşılır konuşur" },
        ],
      },
    ],
  },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function main() {
  let curriculumCount = 0;
  let goalCount = 0;

  for (const c of CURRICULA) {
    const allGoals: { code: string; title: string; isMainGoal: boolean }[] = [];
    for (const g of c.goals) {
      allGoals.push({ code: g.code, title: g.title, isMainGoal: true });
      for (const s of g.sub) {
        allGoals.push({ code: s.code, title: s.title, isMainGoal: false });
      }
    }

    const existing = await prisma.curriculum.findFirst({
      where: { code: c.code },
      select: { id: true, _count: { select: { goals: true } } },
    });

    if (existing) {
      // Curriculum var ama henüz hedefi yoksa hedefleri ekle
      if (existing._count.goals === 0 && allGoals.length > 0) {
        await prisma.curriculumGoal.createMany({
          data: allGoals.map((g) => ({ ...g, curriculumId: existing.id })),
        });
        goalCount += allGoals.length;
        console.log(`  ➕  Curriculum ${c.code} — ${allGoals.length} hedef eklendi`);
      } else {
        console.log(`  ⏭  Curriculum ${c.code} zaten mevcut, atlandı.`);
      }
      continue;
    }

    await prisma.curriculum.create({
      data: {
        code: c.code,
        area: c.area,
        title: c.title,
        goals: { create: allGoals },
      },
    });

    curriculumCount++;
    goalCount += allGoals.length;
    console.log(`  ✓  Curriculum ${c.code} "${c.title}" — ${allGoals.length} hedef`);
  }

  console.log("\n─────────────────────────────────");
  console.log(`  Curriculum   : ${curriculumCount}`);
  console.log(`  Hedef (Goal) : ${goalCount}`);
  console.log("─────────────────────────────────");

  // En eski terapisti admin yap
  const oldest = await prisma.therapist.findFirst({ orderBy: { createdAt: "asc" } });
  if (oldest) {
    await prisma.therapist.update({ where: { id: oldest.id }, data: { role: "admin" } });
    console.log(`\n  ★  Admin: ${oldest.name} (${oldest.email})`);
  }

  // ─── Plan verileri ──────────────────────────────────────────────────────────
  console.log("\n─── Planlar ─────────────────────────────────────────────────────");
  const PLANS = [
    { type: "FREE"     as const, studentLimit: 2,   creditAmount: 40,    monthlyPrice: 0,      yearlyPrice: 0,      pdfEnabled: false },
    { type: "PRO"      as const, studentLimit: 200,  creditAmount: 2000,  monthlyPrice: 37900,  yearlyPrice: 386580,  pdfEnabled: true  },
    { type: "ADVANCED" as const, studentLimit: -1,   creditAmount: 10000, monthlyPrice: 149900, yearlyPrice: 1528980, pdfEnabled: true  },
    { type: "ENTERPRISE" as const, studentLimit: -1, creditAmount: -1,    monthlyPrice: 0,      yearlyPrice: 0,      pdfEnabled: true  },
  ];

  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { type: plan.type },
      create: plan,
      update: plan,
    });
    console.log(`  ✓  Plan ${plan.type}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
