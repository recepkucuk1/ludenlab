import type { Metadata } from "next";
import { COMPANY, LegalTitle, Section, P, Bullets, InfoBox, InfoRow, Mail, ProductGrid } from "../_legal-ui";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni — LudenLab",
  description:
    "6698 sayılı KVKK kapsamında LudenLab (Stüdyo, Atölye ve BRY Takip) kişisel verilerin işlenmesine ilişkin aydınlatma metni.",
};

export default function KvkkPage() {
  return (
    <>
      <LegalTitle eyebrow="YASAL" title="KVKK Aydınlatma Metni" />

      <Section title="1. Veri Sorumlusu">
        <P>{`6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, kişisel verileriniz veri sorumlusu sıfatıyla aşağıdaki tüzel kişi tarafından işlenmektedir:`}</P>
        <InfoBox>
          <InfoRow label="Ticaret Unvanı">{COMPANY.legalName}</InfoRow>
          <InfoRow label="MERSİS No">{COMPANY.mersis}</InfoRow>
          <InfoRow label="Adres">{COMPANY.address}</InfoRow>
          <InfoRow label="E-posta">
            <Mail />
          </InfoRow>
          <InfoRow label="Platform">{COMPANY.platform}</InfoRow>
        </InfoBox>
      </Section>

      <Section title="2. Kapsam — Tek Çatı, Üç Ürün">
        <P>{`İşbu aydınlatma metni, ${COMPANY.platform} çatısı altında sunulan ve tek hesapla erişilen aşağıdaki üç ürünün tamamını kapsar. Üyelik ve ödeme süreçleri merkezi olarak ${COMPANY.platform} üzerinden yürütülür; her ürünün kendi alan adı, ortak hesabınıza bağlıdır:`}</P>
        <ProductGrid />
        <P>{`Bu metinde geçen "Platform" ifadesi, aksi belirtilmedikçe bu üç ürünün tamamını ifade eder.`}</P>
      </Section>

      <Section title="3. İşlenen Kişisel Veri Kategorileri">
        <Bullets
          items={[
            "Kimlik ve iletişim: ad-soyad, e-posta, telefon (isteğe bağlı)",
            "Mesleki bilgi: kurum, unvan, deneyim ve sertifika bilgileri (isteğe bağlı)",
            "Müşteri işlem: abonelik, plan, kredi kullanımı ve işlem geçmişi",
            "Hizmet alıcısı verileri: uzmanların girdiği danışan/öğrenci adı, doğum tarihi, çalışma alanı/tanı türü ve modül/hedef seçimleri (yalnızca materyal ve plan üretimi için — Stüdyo ve Atölye)",
            "Devam/yoklama verileri: merkez personeli ve öğrencilerin giriş-çıkış (BKDS) ve ders saati kayıtları (yalnızca BRY Takip)",
            "İşlem güvenliği: oturum kayıtları ve kimlik doğrulama verileri",
            "Finansal: ödeme tutarı ve işlem referansı (kart verisi X'te işlenir, tarafımızca saklanmaz)",
          ]}
        />
      </Section>

      <Section title="4. Kişisel Verilerin İşlenme Amaçları">
        <Bullets
          items={[
            "Tek hesapla üyelik ve kimlik doğrulama süreçlerinin yürütülmesi",
            "Yapay zeka destekli BEP, terapi/eğitim materyali ve seans planı üretim hizmetinin sunulması (Stüdyo ve Atölye)",
            "Yoklama, giriş-çıkış ve ders saati takip hizmetinin sunulması (BRY Takip)",
            "Merkezi abonelik, plan ve kredi süreçlerinin yönetilmesi",
            "Ödeme süreçlerinin ludenlab.com üzerinden yürütülmesi",
            "Destek ve iletişim taleplerinin karşılanması",
            "Hizmet güvenliğinin ve sürekliliğinin sağlanması",
            "Yasal yükümlülüklerin yerine getirilmesi",
          ]}
        />
      </Section>

      <Section title="5. İşlemenin Hukuki Sebepleri">
        <P>{`Kişisel verileriniz, KVKK'nın 5. ve 6. maddelerinde yer alan aşağıdaki hukuki sebeplere dayanılarak işlenir:`}</P>
        <Bullets
          items={[
            "Bir sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması",
            "Veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi için zorunlu olması",
            "İlgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla, veri sorumlusunun meşru menfaatleri için zorunlu olması",
            "Gerekli hallerde ilgili kişinin açık rızasının bulunması",
          ]}
        />
      </Section>

      <Section title="6. Kişisel Verilerin Toplanma Yöntemi">
        <P>{`Kişisel verileriniz; ${COMPANY.platform} üzerinden üyelik kaydı, platform kullanımı, destek talepleri ve ödeme işlemleri sırasında elektronik ortamda, otomatik ve kısmen otomatik yöntemlerle toplanır.`}</P>
      </Section>

      <Section title="7. Kişisel Verilerin Aktarılması">
        <P>{`Kişisel verileriniz, hizmetin sunulabilmesi için gerekli olduğu ölçüde ve KVKK'nın 8. ve 9. maddelerine uygun biçimde aşağıdaki alıcı gruplarıyla paylaşılabilir:`}</P>
        <Bullets
          items={[
            "Ödeme hizmet sağlayıcısı X (yurt içi) — ludenlab.com üzerinden alınan ödeme işlemleri için",
            "Bulut altyapı sağlayıcısı Supabase (AB — Frankfurt) — verilerin barındırılması için",
            "Yapay zeka hizmet sağlayıcısı Anthropic / Claude API (yurt dışı) — yalnızca içerik üretimi için gerekli parametreler (Stüdyo ve Atölye)",
            "Yetkili kamu kurum ve kuruluşları — yasal zorunluluk halinde",
          ]}
        />
        <P>{`Yurt dışına yapılan aktarımlar, KVKK'nın 9. maddesindeki şartlar çerçevesinde ve gerekli güvenlik tedbirleri alınarak gerçekleştirilir.`}</P>
      </Section>

      <Section title="8. Saklama Süresi">
        <P>{`Kişisel verileriniz, işleme amacının gerektirdiği süre boyunca ve ilgili mevzuatta öngörülen yasal saklama süreleri kadar muhafaza edilir. Sürelerin sona ermesi veya hesabınızı silmeniz halinde verileriniz silinir, yok edilir veya anonim hale getirilir.`}</P>
      </Section>

      <Section title="9. İlgili Kişinin Hakları (KVKK m. 11)">
        <Bullets
          items={[
            "Kişisel verilerinizin işlenip işlenmediğini öğrenme ve işlenmişse bilgi talep etme",
            "İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme",
            "Yurt içinde/yurt dışında aktarıldığı üçüncü kişileri bilme",
            "Eksik/yanlış işlenmişse düzeltilmesini, şartları oluştuysa silinmesini/yok edilmesini isteme",
            "Düzeltme/silme işlemlerinin aktarılan üçüncü kişilere bildirilmesini isteme",
            "Münhasıran otomatik analiz sonucu aleyhinize bir sonuç çıkmasına itiraz etme",
            "Kanuna aykırı işleme nedeniyle zarara uğramanız halinde zararın giderilmesini talep etme",
          ]}
        />
      </Section>

      <Section title="10. Başvuru Yöntemi">
        <P>
          {`KVKK'nın 11. maddesindeki haklarınızı kullanmak için taleplerinizi `}
          <Mail />
          {` adresine iletebilirsiniz. Tek başvuru, üç ürünün tamamı için geçerlidir. Başvurunuz, talebin niteliğine göre en geç 30 gün içinde ücretsiz olarak sonuçlandırılır; işlemin ayrıca bir maliyet gerektirmesi halinde Kurul'ca belirlenen tarifedeki ücret alınabilir.`}
        </P>
      </Section>
    </>
  );
}
