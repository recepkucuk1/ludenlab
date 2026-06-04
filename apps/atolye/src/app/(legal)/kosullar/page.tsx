import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY, LegalTitle, Section, SubSection, P, Bullets, InfoBox, InfoRow, Mail } from "../_legal-ui";

export const metadata: Metadata = {
  title: "Kullanım Koşulları ve Mesafeli Satış Sözleşmesi — LudenLab Atölye",
  description: "LudenLab Atölye dijital platform aboneliği kullanım koşulları ve mesafeli satış sözleşmesi.",
};

const PLANS: [string, string, string][] = [
  ["Ücretsiz", "0 TL", "100 kredi"],
  ["Pro", "449 TL/ay", "2.000 kredi"],
  ["Gelişmiş", "1.999 TL/ay", "10.000 kredi"],
  ["Kurumsal", "Özel fiyatlandırma", "Özel"],
];

function PlanTable() {
  const cell = { padding: "10px 14px", fontSize: "0.9rem", textAlign: "left" as const };
  return (
    <div style={{ overflowX: "auto", border: "var(--poster-border)", borderRadius: 14, marginBottom: 14 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 360 }}>
        <thead>
          <tr style={{ background: "var(--poster-ink)", color: "var(--poster-bg)" }}>
            <th style={{ ...cell, fontWeight: 700 }}>Plan</th>
            <th style={{ ...cell, fontWeight: 700 }}>Aylık Fiyat</th>
            <th style={{ ...cell, fontWeight: 700 }}>Kredi</th>
          </tr>
        </thead>
        <tbody>
          {PLANS.map(([plan, price, credit]) => (
            <tr key={plan} style={{ borderTop: "2px solid var(--poster-ink-faint)" }}>
              <td style={{ ...cell, fontWeight: 700, color: "var(--poster-ink)" }}>{plan}</td>
              <td style={{ ...cell, color: "var(--poster-ink-2)" }}>{price}</td>
              <td style={{ ...cell, color: "var(--poster-ink-2)" }}>{credit}</td>
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

      <Section title="2. Sözleşme Konusu">
        <P>{`İşbu sözleşmenin konusu, Satıcı'nın LudenLab Atölye dijital platformu (${COMPANY.platform}) üzerinden sunduğu yapay zeka destekli BEP, eğitim materyali ve seans planlama hizmetlerinin elektronik ortamda satışına ilişkin olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerinin belirlenmesidir.`}</P>
      </Section>

      <Section title="3. Sözleşme Konusu Hizmet">
        <SubSection title="3.1. Hizmetin Temel Nitelikleri">
          <Bullets
            items={[
              "Hizmet Adı: LudenLab Atölye Dijital Eğitim Platformu Aboneliği",
              "Hizmet Türü: Dijital içerik ve SaaS (hizmet olarak yazılım)",
              "Açıklama: ÖÖB ve DEHB alanında çalışan uzmanlar için yapay zeka destekli BEP, materyal ve seans planlama platformu",
              "Fiziksel teslimat söz konusu değildir",
            ]}
          />
        </SubSection>

        <SubSection title="3.2. Abonelik Planları ve Fiyatları">
          <PlanTable />
          <Bullets items={["Yıllık ödemelerde %15 indirim uygulanır", "Tüm fiyatlara KDV dahildir"]} />
        </SubSection>

        <SubSection title="3.3. Kredi Kullanımı">
          <P>{`Her araç üretimi yaklaşık 10 kredi harcar. Tüm planlarda tüm araçlar açıktır; planlar arasındaki fark dönem başına tanımlı kredi miktarıdır.`}</P>
        </SubSection>
      </Section>

      <Section title="4. Ödeme Şekli ve Koşulları">
        <Bullets
          items={[
            "Ödemeler iyzico ödeme altyapısı üzerinden kredi kartı veya banka kartı ile gerçekleştirilir",
            "Kredi kartı bilgileri doğrudan iyzico tarafından işlenir, Platform tarafından saklanmaz",
            "Abonelik ödemeleri aylık veya yıllık periyotlarla otomatik olarak yenilenir",
            "Ödeme onayı ile birlikte hizmet anında aktif hale gelir",
            "3D Secure güvenlik protokolü uygulanır",
          ]}
        />
      </Section>

      <Section title="5. Hizmetin Teslimi">
        <Bullets
          items={[
            "Dijital hizmet olması sebebiyle fiziksel teslimat bulunmaz",
            "Ödeme onayından sonra abonelik ve kredi bakiyesi anında aktif edilir",
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
            "Cayma bildiriminin destek@ludenlab.com adresine yazılı olarak iletilmesi gerekir",
            "Cayma hakkının kullanılabilmesi için ilgili abonelik döneminde platform üzerinden kredi kullanılmamış olması şarttır",
            "Dijital içeriğin ifasına (kredi kullanımına) başlanmışsa, Alıcı'nın önceden onayı koşuluyla cayma hakkı sona erer",
            "Cayma kapsamındaki iadeler, ödeme yönteminize bağlı olarak 14 gün içinde gerçekleştirilir",
          ]}
        />
      </Section>

      <Section title="7. İade Koşulları">
        <Bullets
          items={[
            "Kredi kullanılmamışsa: abonelik bedelinin tamamı iade edilir",
            "Kredi kısmen kullanılmışsa: kullanılan kredi oranına göre kalan tutar iade edilir",
            "Kredi tamamen kullanılmışsa: iade yapılmaz, abonelik dönem sonuna kadar aktif kalır",
            "İade talepleri destek@ludenlab.com adresine iletilir",
            "Talepler en geç 3 iş günü içinde değerlendirilir",
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
              "Alıcı'nın kişisel verilerini KVKK kapsamında korumak",
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
              "Ödeme yükümlülüklerini zamanında yerine getirmek",
            ]}
          />
        </SubSection>
      </Section>

      <Section title="9. Gizlilik">
        <P>
          {`Alıcı'ya ait kişisel veriler, LudenLab Atölye Gizlilik Politikası ve 6698 sayılı KVKK kapsamında korunur. Detaylı bilgi için `}
          <Link href="/gizlilik" style={{ color: "var(--poster-accent)", fontWeight: 600 }}>
            Gizlilik Politikası
          </Link>
          {` sayfasını ziyaret edebilirsiniz.`}
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
