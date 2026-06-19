import type { Metadata } from "next";
import { COMPANY, LegalTitle, Section, SubSection, P, Bullets, InfoBox, InfoRow, Mail, ProductGrid } from "../_legal-ui";

export const metadata: Metadata = {
  title: "Gizlilik Politikası — LudenLab",
  description:
    "LudenLab (Stüdyo ve Atölye) kişisel verilerin korunması ve gizlilik politikası.",
};

export default function GizlilikPage() {
  return (
    <>
      <LegalTitle eyebrow="YASAL" title="Gizlilik Politikası ve Kişisel Verilerin Korunması" />

      <Section title="1. Giriş">
        <P>{`İşbu Gizlilik Politikası, ${COMPANY.legalName} ("Şirket") tarafından ${COMPANY.platform} çatısı altında tek hesapla sunulan dijital hizmetlerin kullanımı sırasında toplanan, işlenen ve saklanan kişisel verilere ilişkin uygulamaları açıklar. Üyelik ve ödeme işlemleri merkezi olarak ${COMPANY.platform} üzerinden yürütülür ve bu politika aşağıdaki iki modülün tamamı için ortaktır:`}</P>
        <ProductGrid />
        <P>{`6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") ve ilgili mevzuat çerçevesinde veri sorumlusu sıfatıyla hareket eden Şirket olarak kişisel verilerinizin güvenliğine azami özen gösteriyoruz. Bu metinde geçen "Platform" ifadesi, aksi belirtilmedikçe bu iki modülün tamamını ifade eder.`}</P>
      </Section>

      <Section title="2. Toplanan Kişisel Veriler">
        <SubSection title="2.1. Üyelik Bilgileri (tüm modüller — tek hesap)">
          <Bullets
            items={[
              "Ad ve soyad",
              "E-posta adresi",
              "Şifre (tek yönlü olarak şifrelenmiş/hash'lenmiş biçimde saklanır)",
              "Telefon numarası (isteğe bağlı)",
              "Kurum/işyeri bilgisi (isteğe bağlı)",
              "Mesleki deneyim ve sertifika bilgileri (isteğe bağlı)",
            ]}
          />
        </SubSection>

        <SubSection title="2.2. Danışan / Öğrenci Bilgileri (Stüdyo ve Atölye)">
          <P>{`Uzmanlar tarafından girilen danışan/öğrenci bilgileri, yalnızca terapi/eğitim materyali ve plan üretimi amacıyla işlenir:`}</P>
          <Bullets
            items={[
              "Danışan/öğrenci adı ve doğum tarihi",
              "Çalışma alanı ve tanı türü (dil-konuşma-işitme / ÖÖG / DEHB vb.)",
              "MEB / müfredat modülü ve hedef seçimleri",
              "Terapi/eğitim profili ve ilerleme kayıtları",
            ]}
          />
        </SubSection>

        <SubSection title="2.3. Kullanım Verileri">
          <Bullets
            items={[
              "Oturum açma tarihleri ve süreleri",
              "Üretilen materyal sayıları ve türleri (Stüdyo ve Atölye)",
              "Kredi kullanım geçmişi (Stüdyo ve Atölye)",
              "Takvim ve seans planlama verileri",
            ]}
          />
        </SubSection>

        <SubSection title="2.4. Ödeme Bilgileri (merkezi — ludenlab.com)">
          <P>{`Her iki modülün ödemeleri ${COMPANY.platform} üzerinden Paynkolay altyapısı ile gerçekleştirilir. Kredi kartı bilgileri doğrudan Paynkolay tarafından işlenir ve Platform tarafından saklanmaz. Platform yalnızca işlem referans numarası, ödeme tutarı ve işlem durumu bilgilerini kaydeder.`}</P>
        </SubSection>
      </Section>

      <Section title="3. Verilerin İşlenme Amaçları">
        <P>{`Toplanan kişisel veriler aşağıdaki amaçlarla işlenir:`}</P>
        <Bullets
          items={[
            "Tek hesapla üyelik oluşturma ve kimlik doğrulama işlemlerinin yürütülmesi",
            "Yapay zeka destekli BEP, terapi/eğitim materyali ve seans planı üretim hizmetinin sunulması (Stüdyo ve Atölye)",
            "Danışan/öğrenci profiline özel içerik kişiselleştirmesi",
            "Merkezi abonelik, plan ve kredi yönetimi",
            "Ödeme işlemlerinin ludenlab.com üzerinden gerçekleştirilmesi",
            "Platform performansının iyileştirilmesi",
            "Yasal yükümlülüklerin yerine getirilmesi",
            "İletişim ve destek taleplerinin karşılanması",
          ]}
        />
      </Section>

      <Section title="4. Verilerin Saklanması ve Güvenliği">
        <P>{`Kişisel verileriniz, Supabase bulut altyapısında (PostgreSQL veritabanı, AB — Frankfurt bölgesi) saklanır. Uygulanan başlıca güvenlik önlemleri:`}</P>
        <Bullets
          items={[
            "Şifrelerin tek yönlü (geri döndürülemez) algoritmalarla hash'lenmesi",
            "Oturum tabanlı güvenli kimlik doğrulama",
            "API isteklerinde kimlik doğrulama ve yetkilendirme kontrolü",
            "Girdi doğrulama ile hatalı/zararlı veri önleme",
            "SSL/TLS şifrelemesi ile güvenli veri iletimi",
            "Erişim denetimi ile veritabanı koruması",
          ]}
        />
      </Section>

      <Section title="5. Verilerin Paylaşılması">
        <P>{`Kişisel verileriniz, aşağıdaki durumlar dışında üçüncü kişilerle paylaşılmaz:`}</P>
        <Bullets
          items={[
            "Ödeme işlemleri kapsamında Paynkolay ile (yalnızca ödeme için gerekli bilgiler)",
            "Yapay zeka destekli içerik üretimi kapsamında Anthropic (Claude API) ile (yalnızca üretim için gerekli parametreler — Stüdyo ve Atölye)",
            "E-posta doğrulama ve bildirim hizmetleri kapsamında e-posta altyapı sağlayıcımız ile",
            "Yasal zorunluluk halinde yetkili kamu kurum ve kuruluşları ile",
          ]}
        />
        <P>{`Kişisel verileriniz reklam veya pazarlama amacıyla üçüncü taraflarla paylaşılmaz ve satılmaz.`}</P>
      </Section>

      <Section title="6. Çerezler (Cookies)">
        <P>{`Platform, oturum yönetimi için gerekli teknik çerezleri kullanır. Bu çerezler platformun düzgün çalışması için zorunlu olup kişisel tercih veya davranış takibi amacıyla kullanılmaz. Analitik amaçlı anonim kullanım verileri toplanabilir.`}</P>
      </Section>

      <Section title="7. Veri Sahibi Hakları">
        <P>{`KVKK'nın 11. maddesi kapsamında aşağıdaki haklara sahipsiniz:`}</P>
        <Bullets
          items={[
            "Kişisel verilerinizin işlenip işlenmediğini öğrenme",
            "İşlenmişse buna ilişkin bilgi talep etme",
            "İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme",
            "Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme",
            "Eksik veya yanlış işlenmişse düzeltilmesini isteme",
            "KVKK'nın 7. maddesindeki şartlar çerçevesinde silinmesini veya yok edilmesini isteme",
            "Yapılan işlemlerin, verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme",
            "Münhasıran otomatik sistemlerle analiz sonucu aleyhinize bir sonuç çıkmasına itiraz etme",
            "Kanuna aykırı işleme sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme",
          ]}
        />
        <P>
          {`Haklarınızı kullanmak için `}
          <Mail />
          {` adresine başvurabilirsiniz.`}
        </P>
      </Section>

      <Section title="8. Hesap Silme">
        <P>
          {`Tek hesabınızı silmek istediğinizde `}
          <Mail />
          {` adresine e-posta göndererek talepte bulunabilirsiniz. Hesap silme ile birlikte iki modüle ait tüm kişisel veriler, danışan/öğrenci kayıtları ve üretilen materyaller kalıcı olarak silinir. Yasal saklama yükümlülüğü bulunan veriler, ilgili süre sonunda imha edilir.`}
        </P>
      </Section>

      <Section title="9. Politika Değişiklikleri">
        <P>{`İşbu Gizlilik Politikası, yasal düzenlemeler veya hizmet kapsamındaki değişiklikler doğrultusunda güncellenebilir. Güncellemeler Platform üzerinden yayımlanır ve yürürlük tarihi belirtilir. Önemli değişiklikler kayıtlı e-posta adresinize bildirilir.`}</P>
      </Section>

      <Section title="10. İletişim">
        <P>{`Gizlilik politikamız hakkında soru, görüş ve talepleriniz için:`}</P>
        <InfoBox>
          <InfoRow label="E-posta">
            <Mail />
          </InfoRow>
          <InfoRow label="Kurum">{COMPANY.legalName}</InfoRow>
          <InfoRow label="Adres">{COMPANY.address}</InfoRow>
        </InfoBox>
      </Section>
    </>
  );
}
