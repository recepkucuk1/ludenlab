import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Teslimat ve İade Politikası — LudenLab",
  description: "LudenLab dijital hizmet teslimat ve iade koşulları.",
};

const DOT = <span className="mr-2 text-[#FE703A]">●</span>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-[#023435] dark:text-foreground mb-4 pb-2 border-b border-[#023435]/10">{title}</h2>
      {children}
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-base font-semibold text-[#023435] dark:text-foreground mb-3">{title}</h3>
      {children}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-600 leading-relaxed mb-3">{children}</p>;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 mb-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start text-gray-600 leading-relaxed">
          {DOT}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function DeliveryReturnPage() {
  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-4xl mx-auto py-16 px-4">

        {/* Başlık */}
        <div className="text-center mb-12">
          <div className="text-2xl font-bold mb-1">
            <span className="text-[#023435] dark:text-foreground">Luden</span>
            <span className="text-[#FE703A]">Lab</span>
          </div>
          <h1 className="text-2xl font-bold text-[#023435] dark:text-foreground mt-4 mb-6">
            Teslimat ve İade Politikası
          </h1>
          <div className="inline-block text-left bg-[#023435]/5 rounded-xl px-6 py-4 text-sm text-gray-600 space-y-1">
            <p><span className="font-medium text-[#023435] dark:text-foreground">Platform:</span> ludenlab.com</p>
            <p><span className="font-medium text-[#023435] dark:text-foreground">İşletme:</span> Luden Eğitim Danışmanlık Org. Tic. Ltd. Şti.</p>
            <p><span className="font-medium text-[#023435] dark:text-foreground">E-posta:</span>{" "}
              <a href="mailto:info@ludenlab.com" className="text-[#FE703A] hover:underline">info@ludenlab.com</a>
            </p>
            <p><span className="font-medium text-[#023435] dark:text-foreground">Son Güncelleme:</span> 04.04.2026</p>
          </div>
        </div>

        {/* 1. Hizmet Tanımı */}
        <Section title="1. Hizmet Tanımı">
          <P>
            LudenLab, dil, konuşma ve işitme alanlarında çalışan özel eğitim uzmanlarına yönelik dijital bir platformdur.
            Platform üzerinden sunulan hizmetler tamamen dijital niteliktedir ve fiziksel ürün teslimatı söz konusu değildir.
          </P>
          <SubSection title="1.1. Sunulan Dijital Hizmetler">
            <BulletList items={[
              "Yapay zeka destekli eğitim materyali (öğrenme kartı) üretimi",
              "Öğrenci profili oluşturma ve yönetimi",
              "MEB müfredatına uygun içerik kişiselleştirme",
              "Materyal kütüphanesi ve arşivleme",
              "PDF olarak materyal indirme",
              "Takvim ve ders planlama",
              "Öğrenci ilerleme takibi",
            ]} />
          </SubSection>
        </Section>

        {/* 2. Teslimat Koşulları */}
        <Section title="2. Teslimat Koşulları">
          <SubSection title="2.1. Dijital Hizmet Teslimatı">
            <P>
              LudenLab tamamen dijital bir platform olup fiziksel teslimat yapılmamaktadır.
              Hizmet teslimatı aşağıdaki şekilde gerçekleşir:
            </P>
            <BulletList items={[
              "Abonelik ödemesi onaylandıktan sonra ilgili plan kapsamındaki tüm özellikler anında aktif hale gelir",
              "Kredi bakiyesi, ödeme onayı ile birlikte hesaba otomatik olarak yüklenir",
              "Platform erişimi, internet bağlantısı olan herhangi bir cihazdan 7/24 sağlanır",
              "Üretilen materyaller anında görüntülenebilir ve indirilebilir",
            ]} />
          </SubSection>

          <SubSection title="2.2. Teslimat Süresi">
            <P>
              Ödeme işlemi X tarafından onaylandıktan sonra abonelik ve kredi aktivasyonu anlık olarak gerçekleşir.
              Teknik bir aksaklık durumunda en geç 24 saat içinde aktivasyon sağlanır. Gecikme yaşanması halinde{" "}
              <a href="mailto:info@ludenlab.com" className="text-[#FE703A] hover:underline">info@ludenlab.com</a>{" "}
              adresinden destek alınabilir.
            </P>
          </SubSection>
        </Section>

        {/* 3. Abonelik Planları ve Kredi Sistemi */}
        <Section title="3. Abonelik Planları ve Kredi Sistemi">
          <div className="overflow-x-auto rounded-xl border border-[#023435]/10 mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#023435] text-white">
                  <th className="px-4 py-3 text-left font-semibold">Özellik</th>
                  <th className="px-4 py-3 text-center font-semibold">Free</th>
                  <th className="px-4 py-3 text-center font-semibold">Pro</th>
                  <th className="px-4 py-3 text-center font-semibold">Advanced</th>
                  <th className="px-4 py-3 text-center font-semibold">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#023435]/10">
                {[
                  ["Aylık Fiyat", "Ücretsiz", "449 TL", "1.999 TL", "İletişim"],
                  ["Kredi", "40", "2.000", "10.000", "Özel"],
                  ["Öğrenci Limiti", "2", "200", "Sınırsız", "Özel"],
                  ["PDF İndirme", "Hayır", "Evet", "Evet", "Evet"],
                ].map(([feature, free, pro, advanced, enterprise], i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#023435]/[0.02]"}>
                    <td className="px-4 py-3 font-medium text-[#023435] dark:text-foreground">{feature}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{free}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{pro}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{advanced}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <P>
            Her materyal üretimi 20 kredi, her eğitim profili oluşturma 20 kredi harcar. Krediler abonelik dönemi
            boyunca geçerlidir ve bir sonraki döneme devretmez.
          </P>
        </Section>

        {/* 4. İade ve Cayma Hakkı */}
        <Section title="4. İade ve Cayma Hakkı">
          <SubSection title="4.1. Cayma Hakkı">
            <P>
              6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği kapsamında, dijital
              içerik ve hizmetlerde cayma hakkı aşağıdaki koşullara tabidir:
            </P>
            <BulletList items={[
              "Abonelik satın alımından itibaren 14 gün içinde cayma hakkınızı kullanabilirsiniz",
              "Cayma hakkını kullanmak için info@ludenlab.com adresine yazılı bildirimde bulunmanız yeterlidir",
              "Cayma hakkının kullanılabilmesi için ilgili dönemde platform üzerinden kredi kullanılmamış (materyal üretimi yapılmamış) olması gerekmektedir",
            ]} />
          </SubSection>

          <SubSection title="4.2. İade Koşulları">
            <P>Dijital hizmet niteliği gereği aşağıdaki iade koşulları geçerlidir:</P>
            <BulletList items={[
              "Kredi kullanılmamışsa: Abonelik bedelinin tamamı iade edilir",
              "Kredi kısmen kullanılmışsa: Kullanılan kredi oranına göre kalan tutar iade edilir",
              "Kredi tamamen kullanılmışsa: İade yapılmaz, abonelik dönem sonuna kadar aktif kalır",
            ]} />
          </SubSection>

          <SubSection title="4.3. İade Süreci">
            <P>İade talepleriniz aşağıdaki süreçle değerlendirilir:</P>
            <BulletList items={[
              "info@ludenlab.com adresine iade talebinizi e-posta ile iletiniz",
              "Talebiniz en geç 3 iş günü içinde değerlendirilir",
              "Onaylanan iadeler, ödeme yönteminize bağlı olarak 5-10 iş günü içinde hesabınıza yansır",
              "İade işlemi X ödeme altyapısı üzerinden gerçekleştirilir",
            ]} />
          </SubSection>

          <SubSection title="4.4. İade Yapılmayacak Durumlar">
            <P>Aşağıdaki durumlarda iade talebi kabul edilmez:</P>
            <BulletList items={[
              "Abonelik dönemi içinde tüm krediler kullanılmışsa",
              "14 günlük cayma süresi geçmişse ve hizmet kullanılmışsa",
              "Kullanıcı hesabı, platform kullanım kurallarının ihlali nedeniyle askıya alınmışsa",
            ]} />
          </SubSection>
        </Section>

        {/* 5. Abonelik İptali */}
        <Section title="5. Abonelik İptali">
          <P>Kullanıcılar, aboneliklerini istedikleri zaman iptal edebilir:</P>
          <BulletList items={[
            "İptal talebi info@ludenlab.com adresine iletilir",
            "İptal işlemi, mevcut abonelik döneminin sonunda geçerli olur",
            "İptal tarihine kadar olan süre için iade yapılmaz",
            "İptal sonrası hesap, Free plana düşürülür ve mevcut veriler korunur",
            "Otomatik yenileme, iptal talebiyle birlikte durdurulur",
          ]} />
        </Section>

        {/* 6. Hizmet Kesintisi ve Telafi */}
        <Section title="6. Hizmet Kesintisi ve Telafi">
          <P>Platform tarafından kaynaklanan teknik sorunlar nedeniyle hizmet kesintisi yaşanması halinde:</P>
          <BulletList items={[
            "24 saatten kısa kesintiler için telafi yapılmaz",
            "24 saatten uzun kesintilerde, kesinti süresine orantılı olarak abonelik süresi uzatılır",
            "Planlı bakım çalışmaları en az 24 saat öncesinden duyurulur",
          ]} />
        </Section>

        {/* 7. Uyuşmazlık Çözümü */}
        <Section title="7. Uyuşmazlık Çözümü">
          <P>
            İşbu politikadan doğan uyuşmazlıklarda 6502 sayılı Tüketicinin Korunması Hakkında Kanun hükümleri uygulanır.
            Uyuşmazlık halinde Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir.
          </P>
        </Section>

        {/* 8. İletişim */}
        <Section title="8. İletişim">
          <P>Teslimat ve iade süreçleri hakkında soru, görüş ve talepleriniz için:</P>
          <div className="bg-[#023435]/5 rounded-xl px-6 py-4 space-y-2 text-gray-600 text-sm">
            <p className="flex items-start">{DOT}<span><span className="font-medium text-[#023435] dark:text-foreground">E-posta:</span>{" "}
              <a href="mailto:info@ludenlab.com" className="text-[#FE703A] hover:underline">info@ludenlab.com</a>
            </span></p>
            <p className="flex items-start">{DOT}<span><span className="font-medium text-[#023435] dark:text-foreground">Kurum:</span>{" "}
              Luden Eğitim Danışmanlık Org. Tic. Ltd. Şti.</span></p>
            <p className="flex items-start">{DOT}<span><span className="font-medium text-[#023435] dark:text-foreground">Adres:</span> Aydınlıkevler Mah. 6782/5 Sk. No:15 Çiğli / İzmir</span></p>
          </div>
        </Section>

      </div>
    </div>
  );
}
