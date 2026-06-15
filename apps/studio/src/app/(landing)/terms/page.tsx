import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mesafeli Satış Sözleşmesi — LudenLab",
  description: "LudenLab dijital platform aboneliği mesafeli satış sözleşmesi.",
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

export default function TermsPage() {
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
            Mesafeli Satış Sözleşmesi
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

        {/* 1. Taraflar */}
        <Section title="1. Taraflar">
          <SubSection title="1.1. Satıcı Bilgileri">
            <div className="bg-[#023435]/5 rounded-xl px-6 py-4 space-y-2 text-sm text-gray-600">
              <p className="flex items-start">{DOT}<span><span className="font-medium text-[#023435] dark:text-foreground">Ticaret Unvanı:</span>{" "}
                Luden Eğitim Danışmanlık Organizasyon ve Ticaret Limited Şirketi</span></p>
              <p className="flex items-start">{DOT}<span><span className="font-medium text-[#023435] dark:text-foreground">MERSİS No:</span> 0609120901300001</span></p>
              <p className="flex items-start">{DOT}<span><span className="font-medium text-[#023435] dark:text-foreground">Ticaret Sicil No:</span> 237834</span></p>
              <p className="flex items-start">{DOT}<span><span className="font-medium text-[#023435] dark:text-foreground">Adres:</span>{" "}
                Aydınlıkevler Mahallesi 6782/5 Sk. No:15 Çiğli / İzmir</span></p>
              <p className="flex items-start">{DOT}<span><span className="font-medium text-[#023435] dark:text-foreground">E-posta:</span>{" "}
                <a href="mailto:info@ludenlab.com" className="text-[#FE703A] hover:underline">info@ludenlab.com</a></span></p>
              <p className="flex items-start">{DOT}<span><span className="font-medium text-[#023435] dark:text-foreground">Telefon:</span> 0530 886 67 82</span></p>
            </div>
          </SubSection>

          <SubSection title="1.2. Alıcı Bilgileri">
            <P>
              Alıcı bilgileri, üyelik kaydı sırasında beyan edilen bilgilerden oluşmaktadır. Alıcı, beyan ettiği
              bilgilerin doğruluğunu kabul ve taahhüt eder.
            </P>
          </SubSection>
        </Section>

        {/* 2. Sözleşme Konusu */}
        <Section title="2. Sözleşme Konusu">
          <P>
            İşbu sözleşmenin konusu, Satıcı&apos;nın LudenLab dijital platformu (ludenlab.com) üzerinden sunduğu yapay zeka
            destekli eğitim materyali üretim hizmetlerinin elektronik ortamda satışına ilişkin olarak 6502 sayılı
            Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların
            hak ve yükümlülüklerinin belirlenmesidir.
          </P>
        </Section>

        {/* 3. Sözleşme Konusu Hizmet */}
        <Section title="3. Sözleşme Konusu Hizmet">
          <SubSection title="3.1. Hizmetin Temel Nitelikleri">
            <BulletList items={[
              "Hizmet Adı: LudenLab Dijital Eğitim Platformu Aboneliği",
              "Hizmet Türü: Dijital içerik ve SaaS (Software as a Service) hizmeti",
              "Açıklama: Dil, konuşma ve işitme alanlarında çalışan uzmanlar için yapay zeka destekli öğrenme materyali üretim platformu",
              "Fiziksel teslimat söz konusu değildir",
            ]} />
          </SubSection>

          <SubSection title="3.2. Abonelik Planları ve Fiyatları">
            <div className="overflow-x-auto rounded-xl border border-[#023435]/10 mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#023435] text-white">
                    <th className="px-4 py-3 text-left font-semibold">Plan</th>
                    <th className="px-4 py-3 text-left font-semibold">Fiyat</th>
                    <th className="px-4 py-3 text-left font-semibold">Kredi</th>
                    <th className="px-4 py-3 text-left font-semibold">Öğrenci</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#023435]/10">
                  {[
                    ["Free", "Ücretsiz", "40", "2"],
                    ["Pro", "449 TL/ay", "2.000", "200 + PDF indirme"],
                    ["Advanced", "1.999 TL/ay", "10.000", "Sınırsız + PDF indirme"],
                    ["Enterprise", "Özel fiyatlandırma", "Özel", "Özel"],
                  ].map(([plan, price, credit, student], i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#023435]/[0.02]"}>
                      <td className="px-4 py-3 font-medium text-[#023435] dark:text-foreground">{plan}</td>
                      <td className="px-4 py-3 text-gray-600">{price}</td>
                      <td className="px-4 py-3 text-gray-600">{credit}</td>
                      <td className="px-4 py-3 text-gray-600">{student}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <BulletList items={[
              "Yıllık ödemelerde %15 indirim uygulanır",
              "Tüm fiyatlara KDV dahildir",
            ]} />
          </SubSection>

          <SubSection title="3.3. Kredi Kullanımı">
            <P>Her materyal üretimi 20 kredi, her eğitim profili oluşturma 20 kredi harcar.</P>
          </SubSection>
        </Section>

        {/* 4. Ödeme Şekli ve Koşulları */}
        <Section title="4. Ödeme Şekli ve Koşulları">
          <BulletList items={[
            "Ödemeler X ödeme altyapısı üzerinden kredi kartı veya banka kartı ile gerçekleştirilir",
            "Kredi kartı bilgileri doğrudan X tarafından işlenir, Platform tarafından saklanmaz",
            "Abonelik ödemeleri aylık veya yıllık periyotlarla otomatik olarak yenilenir",
            "Ödeme onayı ile birlikte hizmet anında aktif hale gelir",
            "3D Secure güvenlik protokolü uygulanır",
          ]} />
        </Section>

        {/* 5. Hizmetin Teslimi */}
        <Section title="5. Hizmetin Teslimi">
          <BulletList items={[
            "Dijital hizmet olması sebebiyle fiziksel teslimat bulunmamaktadır",
            "Ödeme onayından sonra abonelik ve kredi bakiyesi anında aktif edilir",
            "Platform erişimi 7/24 internet bağlantısı olan her cihazdan sağlanır",
            "Teknik aksaklık durumunda en geç 24 saat içinde aktivasyon tamamlanır",
          ]} />
        </Section>

        {/* 6. Cayma Hakkı */}
        <Section title="6. Cayma Hakkı">
          <P>
            6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği&apos;nin 15. maddesi
            kapsamında:
          </P>
          <BulletList items={[
            "Alıcı, satın alma tarihinden itibaren 14 gün içinde herhangi bir gerekçe göstermeksizin cayma hakkını kullanabilir",
            "Cayma bildiriminin info@ludenlab.com adresine yazılı olarak iletilmesi gerekmektedir",
            "Cayma hakkının kullanılabilmesi için ilgili abonelik döneminde platform üzerinden kredi kullanılmamış olması şarttır",
            "Dijital içeriğin ifasına (kredi kullanımına) başlanmış olması halinde, Alıcı'nın önceden onay vermesi koşuluyla cayma hakkı sona erer",
            "Cayma hakkı kapsamındaki iadeler, ödeme yönteminize bağlı olarak 14 gün içinde gerçekleştirilir",
          ]} />
        </Section>

        {/* 7. İade Koşulları */}
        <Section title="7. İade Koşulları">
          <BulletList items={[
            "Kredi kullanılmamışsa: Abonelik bedelinin tamamı iade edilir",
            "Kredi kısmen kullanılmışsa: Kullanılan kredi oranına göre kalan tutar iade edilir",
            "Kredi tamamen kullanılmışsa: İade yapılmaz, abonelik dönem sonuna kadar aktif kalır",
            "İade talepleri info@ludenlab.com adresine iletilir",
            "Talepler en geç 3 iş günü içinde değerlendirilir",
            "Onaylanan iadeler 5-10 iş günü içinde hesaba yansır",
          ]} />
        </Section>

        {/* 8. Tarafların Hak ve Yükümlülükleri */}
        <Section title="8. Tarafların Hak ve Yükümlülükleri">
          <SubSection title="8.1. Satıcı'nın Yükümlülükleri">
            <BulletList items={[
              "Hizmeti sözleşme koşullarına uygun olarak sunmak",
              "Platformun güvenli ve kesintisiz çalışmasını sağlamak için gerekli teknik altyapıyı sağlamak",
              "Alıcı'nın kişisel verilerini KVKK kapsamında korumak",
              "Abonelik kapsamındaki tüm özellikleri eksiksiz sunmak",
              "Planlı bakım çalışmalarını en az 24 saat öncesinden duyurmak",
            ]} />
          </SubSection>

          <SubSection title="8.2. Alıcı'nın Yükümlülükleri">
            <BulletList items={[
              "Kayıt sırasında doğru ve güncel bilgi vermek",
              "Platform kullanım kurallarına uymak",
              "Hesap bilgilerinin güvenliğini sağlamak ve üçüncü kişilerle paylaşmamak",
              "Platformu yalnızca yasal amaçlarla kullanmak",
              "Ödeme yükümlülüklerini zamanında yerine getirmek",
            ]} />
          </SubSection>
        </Section>

        {/* 9. Gizlilik */}
        <Section title="9. Gizlilik">
          <P>
            Alıcı&apos;ya ait kişisel veriler, LudenLab Gizlilik Politikası ve 6698 sayılı KVKK kapsamında korunmaktadır.
            Detaylı bilgi için{" "}
            <Link href="/privacy" className="text-[#FE703A] hover:underline">ludenlab.com/privacy</Link>{" "}
            adresini ziyaret edebilirsiniz.
          </P>
        </Section>

        {/* 10. Uyuşmazlık Çözümü */}
        <Section title="10. Uyuşmazlık Çözümü">
          <P>
            İşbu sözleşmeden doğan uyuşmazlıklarda Gümrük ve Ticaret Bakanlığı&apos;nca belirlenen parasal sınırlar
            dahilinde Alıcı&apos;nın veya Satıcı&apos;nın yerleşim yerindeki Tüketici Hakem Heyetleri, bu sınırları aşan
            durumlarda Tüketici Mahkemeleri yetkilidir.
          </P>
        </Section>

        {/* 11. Yürürlük */}
        <Section title="11. Yürürlük">
          <P>
            Alıcı, işbu sözleşmenin tüm koşullarını okuduğunu, anladığını ve kabul ettiğini beyan eder. Sözleşme,
            ödeme işleminin tamamlanması ile yürürlüğe girer.
          </P>
          <div className="mt-6 bg-[#023435]/5 rounded-xl px-6 py-4 text-sm text-gray-600 space-y-1">
            <p><span className="font-medium text-[#023435] dark:text-foreground">Satıcı:</span>{" "}
              Luden Eğitim Danışmanlık Organizasyon ve Ticaret Limited Şirketi</p>
            <p><span className="font-medium text-[#023435] dark:text-foreground">Tarih:</span>{" "}
              Ödeme tarihi itibarıyla geçerlidir.</p>
          </div>
        </Section>

      </div>
    </div>
  );
}
