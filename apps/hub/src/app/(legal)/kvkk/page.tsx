import type { Metadata } from "next";
import { COMPANY, LegalTitle, Section, P, Bullets, InfoBox, InfoRow, Mail, ProductGrid } from "../_legal-ui";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni — LudenLab",
  description:
    "6698 sayılı KVKK kapsamında LudenLab (Studio ve Atölye) kişisel verilerin işlenmesine ilişkin aydınlatma metni.",
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

      <Section title="2. Kapsam — Tek Çatı, İki Modül">
        <P>{`İşbu aydınlatma metni, ${COMPANY.platform} çatısı altında sunulan ve tek hesapla erişilen aşağıdaki iki modülün tamamını kapsar. Üyelik, ödeme ve tüm hizmetler merkezi olarak ${COMPANY.platform} üzerinden yürütülür:`}</P>
        <ProductGrid />
        <P>{`Bu metinde geçen "Platform" ifadesi, aksi belirtilmedikçe bu iki modülün tamamını ifade eder.`}</P>
      </Section>

      <Section title="3. İşlenen Kişisel Veri Kategorileri">
        <Bullets
          items={[
            "Kimlik ve iletişim: ad-soyad, e-posta, telefon (isteğe bağlı)",
            "Mesleki bilgi: kurum, unvan, deneyim ve sertifika bilgileri (isteğe bağlı)",
            "Müşteri işlem: abonelik, plan, kullanım hakları ve işlem geçmişi",
            "Hizmet alıcısı verileri: uzmanların girdiği danışan/öğrenci adı, doğum tarihi, çalışma alanı/tanı türü, uzman notları ve modül/hedef seçimleri (yalnızca materyal ve plan üretimi için — Studio ve Atölye). Ad, yapay zeka sağlayıcılarına aktarılmaz; bkz. bölüm 7.",
            "İşlem güvenliği: oturum kayıtları ve kimlik doğrulama verileri",
            "Finansal: ödeme tutarı ve işlem referansı (kart verisi iyzico'da işlenir, tarafımızca saklanmaz)",
            "Faturalama: fatura tipi (bireysel/kurumsal), ad-soyad, TCKN (isteğe bağlı) veya VKN, ünvan, vergi dairesi ve fatura adresi — e-Arşiv/e-Fatura düzenleme yükümlülüğü (VUK) kapsamında, yalnızca ücretli hizmet alan kullanıcılardan alınır",
          ]}
        />
      </Section>

      <Section title="4. Kişisel Verilerin İşlenme Amaçları">
        <Bullets
          items={[
            "Tek hesapla üyelik ve kimlik doğrulama süreçlerinin yürütülmesi",
            "Yapay zeka destekli BEP, terapi/eğitim materyali ve seans planı üretim hizmetinin sunulması (Studio ve Atölye)",
            "Merkezi abonelik, plan ve kullanım haklarının yönetilmesi",
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
            "Ödeme hizmet sağlayıcısı iyzico (yurt içi) — ludenlab.com üzerinden alınan ödeme işlemleri için",
            "Bulut altyapı sağlayıcısı Supabase (AB — Frankfurt) — verilerin barındırılması için",
            "Barındırma sağlayıcısı Hostinger (AB) — uygulama sunucusu ve e-posta gönderimi",
            "Yapay zeka hizmet sağlayıcısı Anthropic / Claude API (yurt dışı) — metin içeriği üretimi için gerekli parametreler; danışan/öğrencinin GERÇEK ADI GÖNDERİLMEZ, yerine yalnızca bizim ürettiğimiz takma ad aktarılır (Studio ve Atölye)",
            "Görsel üretim sağlayıcıları OpenAI (gpt-image) ve fal.ai / Flux (yurt dışı) — yalnızca üretilecek görselin İngilizce sahne/nesne tarifi; danışan/öğrencinin gerçek adı, doğum tarihi veya tanısı GÖNDERİLMEZ (Studio görsel araçları)",
            "Ziyaret istatistiği aracı Umami (yurt dışı) — çerezsiz, anonim sayfa görüntüleme verisi; ad, e-posta, hesap veya danışan bilgisi GÖNDERİLMEZ",
            "Yetkili kamu kurum ve kuruluşları — yasal zorunluluk halinde",
          ]}
        />
        <P>{`Yurt dışına yapılan aktarımlar, KVKK'nın 9. maddesindeki şartlar çerçevesinde ve gerekli güvenlik tedbirleri alınarak gerçekleştirilir.`}</P>
        <P>{`Veri minimizasyonu: yapay zeka sağlayıcılarına yapılan aktarımlarda danışan/öğrencinin gerçek adı yerine, yalnızca Platform içinde tutulan ve o danışana özel sabit bir takma ad kullanılır; gerçek ad ile takma ad arasındaki eşleşme yalnızca bizim sistemlerimizde saklanır ve sağlayıcılarla paylaşılmaz. Uzman, Platform arayüzünde her zaman gerçek adı görmeye devam eder.`}</P>
        <P>{`Şeffaflık notu: takma ad kullanımı verinin anonim hale geldiği anlamına gelmez. Yaş, çalışma alanı/tanı bilgisi ve uzmanın girdiği serbest metin notları — ad çıkarılmış olsa da — içerik üretimi için sağlayıcıya aktarılmaya devam eder ve bu veriler KVKK kapsamında kişisel veri olmayı sürdürür.`}</P>
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
          {` adresine iletebilirsiniz. Tek başvuru, iki modülün tamamı için geçerlidir. Başvurunuz, talebin niteliğine göre en geç 30 gün içinde ücretsiz olarak sonuçlandırılır; işlemin ayrıca bir maliyet gerektirmesi halinde Kurul'ca belirlenen tarifedeki ücret alınabilir.`}
        </P>
      </Section>
    </>
  );
}
