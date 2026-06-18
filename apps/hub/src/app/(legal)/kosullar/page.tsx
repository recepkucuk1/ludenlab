import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY, LegalTitle, Section, SubSection, P, Bullets, InfoBox, InfoRow, Mail, ProductGrid } from "../_legal-ui";

export const metadata: Metadata = {
  title: "Kullanım Koşulları ve Mesafeli Satış Sözleşmesi — LudenLab",
  description:
    "ludenlab.com üzerinden satılan LudenLab Stüdyo ve Atölye dijital abonelikleri için kullanım koşulları ve mesafeli satış sözleşmesi.",
};

// Fiyatlar iyzico ürün/plan eşlemesiyle uyumludur (bkz. bootstrap-iyzico).
const PLANS: [string, string, string, string][] = [
  ["LudenLab Stüdyo", "Pro", "449 ₺", "4.579,80 ₺"],
  ["LudenLab Stüdyo", "Gelişmiş", "1.999 ₺", "20.389,80 ₺"],
  ["LudenLab Atölye", "Pro", "449 ₺", "4.579,80 ₺"],
  ["LudenLab Atölye", "Gelişmiş", "1.999 ₺", "20.389,80 ₺"],
];

function PlanTable() {
  const cell = { padding: "10px 14px", fontSize: "0.88rem", textAlign: "left" as const };
  return (
    <div style={{ overflowX: "auto", border: "var(--poster-border)", borderRadius: 14, marginBottom: 14 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 460 }}>
        <thead>
          <tr style={{ background: "var(--poster-ink)", color: "var(--poster-bg)" }}>
            <th style={{ ...cell, fontWeight: 700 }}>Ürün</th>
            <th style={{ ...cell, fontWeight: 700 }}>Plan</th>
            <th style={{ ...cell, fontWeight: 700 }}>Aylık</th>
            <th style={{ ...cell, fontWeight: 700 }}>Yıllık</th>
          </tr>
        </thead>
        <tbody>
          {PLANS.map(([product, plan, monthly, yearly]) => (
            <tr key={`${product}-${plan}`} style={{ borderTop: "2px solid var(--poster-ink-faint)" }}>
              <td style={{ ...cell, fontWeight: 700, color: "var(--poster-ink)" }}>{product}</td>
              <td style={{ ...cell, color: "var(--poster-ink-2)" }}>{plan}</td>
              <td style={{ ...cell, color: "var(--poster-ink-2)" }}>{monthly}</td>
              <td style={{ ...cell, color: "var(--poster-ink-2)" }}>{yearly}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function KosullarPage() {
  return (
    <>
      <LegalTitle eyebrow="YASAL" title="Kullanım Koşulları ve Mesafeli Satış Sözleşmesi" />

      <Section title="1. Taraflar">
        <SubSection title="1.1. Satıcı Bilgileri">
          <InfoBox>
            <InfoRow label="Ticaret Unvanı">{COMPANY.legalName}</InfoRow>
            <InfoRow label="MERSİS No">{COMPANY.mersis}</InfoRow>
            <InfoRow label="Ticaret Sicil No">{COMPANY.sicil}</InfoRow>
            <InfoRow label="Adres">{COMPANY.address}</InfoRow>
            <InfoRow label="E-posta">
              <Mail />
            </InfoRow>
            <InfoRow label="Telefon">{COMPANY.phone}</InfoRow>
          </InfoBox>
        </SubSection>
        <SubSection title="1.2. Alıcı Bilgileri">
          <P>{`Alıcı bilgileri, üyelik kaydı sırasında beyan edilen bilgilerden oluşur. Alıcı, beyan ettiği bilgilerin doğruluğunu kabul ve taahhüt eder.`}</P>
        </SubSection>
      </Section>

      <Section title="2. Sözleşme Konusu ve Kapsam">
        <P>{`İşbu sözleşmenin konusu, Satıcı'nın ${COMPANY.platform} üzerinden tek hesap ve tek ödeme noktası ile sunduğu dijital aboneliklerin elektronik ortamda satışına ilişkin olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerinin belirlenmesidir. Sözleşme, ${COMPANY.platform} çatısı altındaki aşağıdaki iki ürünün tamamını kapsar:`}</P>
        <ProductGrid />
        <P>{`Her iki ürünün ödemeleri ve hizmetleri merkezi olarak ${COMPANY.platform} üzerinden, ortak hesabınıza bağlı olarak sunulur.`}</P>
      </Section>

      <Section title="3. Sözleşme Konusu Hizmet">
        <SubSection title="3.1. Hizmetin Temel Nitelikleri">
          <Bullets
            items={[
              "Hizmet Türü: Dijital içerik ve SaaS (hizmet olarak yazılım)",
              "LudenLab Stüdyo: dil-konuşma-işitme uzmanları için yapay zeka destekli terapi materyali ve seans planı üretimi",
              "LudenLab Atölye: ÖÖG ve DEHB uzmanları için yapay zeka destekli BEP, materyal ve seans planı üretimi",
              "Fiziksel teslimat söz konusu değildir",
            ]}
          />
        </SubSection>

        <SubSection title="3.2. Abonelik Planları ve Fiyatları">
          <PlanTable />
          <Bullets
            items={[
              "Yıllık ödemelerde aylık fiyata göre yaklaşık %15 indirim uygulanır",
              "Tüm fiyatlara KDV dahildir",
              "Her üründe ücretsiz başlangıç planı sunulabilir; ücretli aboneliğe geçiş Alıcı'nın tercihine bağlıdır",
            ]}
          />
        </SubSection>

        <SubSection title="3.3. Kredi Kullanımı">
          <P>{`LudenLab Stüdyo ve Atölye'de her araç üretimi yaklaşık 10 kredi harcar. Tüm planlarda tüm araçlar açıktır; planlar arasındaki fark dönem başına tanımlı kredi miktarıdır.`}</P>
        </SubSection>
      </Section>

      <Section title="4. Ödeme Şekli ve Koşulları">
        <Bullets
          items={[
            "Tüm ödemeler ludenlab.com üzerinden iyzico ödeme altyapısı ile kredi kartı veya banka kartı kullanılarak gerçekleştirilir",
            "Kredi kartı bilgileri doğrudan iyzico tarafından işlenir, Platform tarafından saklanmaz",
            "Abonelik ödemeleri aylık veya yıllık periyotlarla otomatik olarak yenilenir",
            "Ödeme onayı ile birlikte ilgili ürünün hizmeti anında aktif hale gelir",
            "3D Secure güvenlik protokolü uygulanır",
          ]}
        />
      </Section>

      <Section title="5. Hizmetin Teslimi">
        <Bullets
          items={[
            "Dijital hizmet olması sebebiyle fiziksel teslimat bulunmaz",
            "Ödeme onayından sonra ilgili ürünün aboneliği (ve varsa kredi bakiyesi) ortak hesabınıza anında tanımlanır",
            "Platform erişimi internet bağlantısı olan her cihazdan 7/24 sağlanır",
            "Teknik aksaklık durumunda en geç 24 saat içinde aktivasyon tamamlanır",
          ]}
        />
      </Section>

      <Section title="6. Cayma Hakkı">
        <P>{`6502 sayılı Kanun ve Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesi kapsamında:`}</P>
        <Bullets
          items={[
            "Alıcı, satın alma tarihinden itibaren 14 gün içinde gerekçe göstermeksizin cayma hakkını kullanabilir",
            `Cayma bildiriminin ${COMPANY.email} adresine yazılı olarak iletilmesi gerekir`,
            "Cayma hakkının kullanılabilmesi için ilgili abonelik döneminde kredi kullanılmamış olması şarttır",
            "Dijital içeriğin ifasına (kredi kullanımına) başlanmışsa, Alıcı'nın önceden onayı koşuluyla cayma hakkı sona erer",
            "Cayma kapsamındaki iadeler, ödeme yönteminize bağlı olarak 14 gün içinde gerçekleştirilir",
          ]}
        />
      </Section>

      <Section title="7. İade Koşulları">
        <Bullets
          items={[
            "Kredi tabanlı ürünlerde kredi kullanılmamışsa: abonelik bedelinin tamamı iade edilir",
            "Kredi kısmen kullanılmışsa: kullanılan kredi oranına göre kalan tutar iade edilir",
            "Kredi tamamen kullanılmışsa: iade yapılmaz, abonelik dönem sonuna kadar aktif kalır",
            `İade talepleri ${COMPANY.email} adresine iletilir ve en geç 3 iş günü içinde değerlendirilir`,
            "Onaylanan iadeler 5-10 iş günü içinde hesaba yansır",
          ]}
        />
      </Section>

      <Section title="8. Tarafların Hak ve Yükümlülükleri">
        <SubSection title="8.1. Satıcı'nın Yükümlülükleri">
          <Bullets
            items={[
              "Hizmeti sözleşme koşullarına uygun olarak sunmak",
              "Platformun güvenli ve kesintisiz çalışması için gerekli teknik altyapıyı sağlamak",
              "Alıcı'nın ve hizmet kapsamında işlenen üçüncü kişilerin kişisel verilerini KVKK kapsamında korumak",
              "Abonelik kapsamındaki tüm özellikleri eksiksiz sunmak",
              "Planlı bakım çalışmalarını mümkün olduğunca önceden duyurmak",
            ]}
          />
        </SubSection>
        <SubSection title="8.2. Alıcı'nın Yükümlülükleri">
          <Bullets
            items={[
              "Kayıt sırasında doğru ve güncel bilgi vermek",
              "Platform kullanım kurallarına uymak",
              "Hesap bilgilerinin güvenliğini sağlamak ve üçüncü kişilerle paylaşmamak",
              "Platformu yalnızca yasal amaçlarla kullanmak",
              "Girdiği danışan/öğrenci/personel verileri için gerekli aydınlatma ve rızaları kendi sorumluluğunda temin etmek",
              "Ödeme yükümlülüklerini zamanında yerine getirmek",
            ]}
          />
        </SubSection>
      </Section>

      <Section title="9. Gizlilik">
        <P>
          {`Alıcı'ya ve hizmet kapsamında işlenen kişilere ait kişisel veriler, LudenLab Gizlilik Politikası ve 6698 sayılı KVKK kapsamında korunur. Detaylı bilgi için `}
          <Link href="/gizlilik" style={{ color: "var(--poster-accent)", fontWeight: 600 }}>
            Gizlilik Politikası
          </Link>
          {` ve `}
          <Link href="/kvkk" style={{ color: "var(--poster-accent)", fontWeight: 600 }}>
            KVKK Aydınlatma Metni
          </Link>
          {` sayfalarını ziyaret edebilirsiniz.`}
        </P>
      </Section>

      <Section title="10. Uyuşmazlık Çözümü">
        <P>{`İşbu sözleşmeden doğan uyuşmazlıklarda, ilgili bakanlıkça belirlenen parasal sınırlar dahilinde Alıcı'nın veya Satıcı'nın yerleşim yerindeki Tüketici Hakem Heyetleri, bu sınırları aşan durumlarda Tüketici Mahkemeleri yetkilidir.`}</P>
      </Section>

      <Section title="11. Yürürlük">
        <P>{`Alıcı, işbu sözleşmenin tüm koşullarını okuduğunu, anladığını ve kabul ettiğini beyan eder. Sözleşme, ödeme işleminin tamamlanması ile yürürlüğe girer.`}</P>
        <InfoBox>
          <InfoRow label="Satıcı">{COMPANY.legalName}</InfoRow>
          <InfoRow label="Tarih">Ödeme tarihi itibarıyla geçerlidir.</InfoRow>
        </InfoBox>
      </Section>
    </>
  );
}
