import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik Politikası — LudenLab",
  description: "LudenLab kişisel verilerin korunması ve gizlilik politikası.",
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

export default function PrivacyPage() {
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
            Gizlilik Politikası ve Kişisel Verilerin Korunması
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

        {/* 1. Giriş */}
        <Section title="1. Giriş">
          <P>
            İşbu Gizlilik Politikası, LudenLab dijital platformu (&ldquo;Platform&rdquo;) üzerinden sunulan yapay zeka destekli eğitim
            materyali üretim hizmetlerinin kullanımı sırasında toplanan, işlenen ve saklanan kişisel verilere ilişkin uygulamaları
            açıklamaktadır. 6698 sayılı Kişisel Verilerin Korunması Kanunu (&ldquo;KVKK&rdquo;) ve ilgili mevzuat hükümleri çerçevesinde
            veri sorumlusu sıfatıyla hareket eden Luden Eğitim Danışmanlık Org. Tic. Ltd. Şti. olarak kişisel
            verilerinizin güvenliğine azami özen göstermekteyiz.
          </P>
        </Section>

        {/* 2. Toplanan Kişisel Veriler */}
        <Section title="2. Toplanan Kişisel Veriler">
          <SubSection title="2.1. Üyelik Bilgileri">
            <BulletList items={[
              "Ad ve soyad",
              "E-posta adresi",
              "Şifre (bcrypt ile şifrelenmiş olarak saklanır)",
              "Telefon numarası (isteğe bağlı)",
              "Kurum/işyeri bilgisi (isteğe bağlı)",
              "Mesleki deneyim ve sertifika bilgileri (isteğe bağlı)",
            ]} />
          </SubSection>

          <SubSection title="2.2. Öğrenci Bilgileri">
            <P>
              Platform üzerinden uzmanlar tarafından girilen öğrenci bilgileri, yalnızca eğitim materyali üretimi
              amacıyla işlenmektedir:
            </P>
            <BulletList items={[
              "Öğrenci adı ve doğum tarihi",
              "Çalışma alanı ve tanı türü",
              "Müfredat modülü seçimleri",
              "Eğitim profili ve ilerleme kayıtları",
            ]} />
          </SubSection>

          <SubSection title="2.3. Kullanım Verileri">
            <BulletList items={[
              "Oturum açma tarihleri ve süreleri",
              "Üretilen materyal sayıları ve türleri",
              "Kredi kullanım geçmişi",
              "Takvim ve ders planlama verileri",
            ]} />
          </SubSection>

          <SubSection title="2.4. Ödeme Bilgileri">
            <P>
              Ödeme işlemleri X altyapısı üzerinden gerçekleştirilmektedir. Kredi kartı bilgileri doğrudan X
              tarafından işlenmekte olup Platform tarafından saklanmamaktadır. Platform yalnızca işlem referans numarası,
              ödeme tutarı ve işlem durumu bilgilerini kaydetmektedir.
            </P>
          </SubSection>
        </Section>

        {/* 3. Verilerin İşlenme Amaçları */}
        <Section title="3. Verilerin İşlenme Amaçları">
          <P>Toplanan kişisel veriler aşağıdaki amaçlarla işlenmektedir:</P>
          <BulletList items={[
            "Üyelik oluşturma ve kimlik doğrulama işlemlerinin yürütülmesi",
            "Yapay zeka destekli eğitim materyali üretim hizmetinin sunulması",
            "Öğrenci profiline özel içerik kişiselleştirmesi",
            "Abonelik ve kredi yönetimi",
            "Ödeme işlemlerinin gerçekleştirilmesi",
            "Platform performansının iyileştirilmesi",
            "Yasal yükümlülüklerin yerine getirilmesi",
            "İletişim ve destek taleplerinin karşılanması",
          ]} />
        </Section>

        {/* 4. Verilerin Saklanması ve Güvenliği */}
        <Section title="4. Verilerin Saklanması ve Güvenliği">
          <P>
            Kişisel verileriniz, Supabase bulut altyapısında (PostgreSQL veritabanı, AB — Frankfurt bölgesi) şifreli olarak
            saklanmaktadır. Aşağıdaki güvenlik önlemleri uygulanmaktadır:
          </P>
          <BulletList items={[
            "Şifreler bcrypt algoritması (12 rounds) ile tek yönlü olarak hashlenmektedir",
            "JWT tabanlı oturum yönetimi ile güvenli kimlik doğrulama",
            "API isteklerinde kimlik doğrulama ve yetkilendirme kontrolü",
            "Zod ile girdi doğrulama",
            "Rate limiting ile kötüye kullanım önleme",
            "hCaptcha ile bot koruma",
            "SSL/TLS şifrelemesi ile veri iletimi",
            "Row Level Security (RLS) ile veritabanı erişim kontrolü",
          ]} />
        </Section>

        {/* 5. Verilerin Paylaşılması */}
        <Section title="5. Verilerin Paylaşılması">
          <P>Kişisel verileriniz, aşağıdaki durumlar dışında üçüncü kişilerle paylaşılmamaktadır:</P>
          <BulletList items={[
            "Ödeme işlemleri kapsamında X ile (yalnızca ödeme işlemi için gerekli bilgiler)",
            "E-posta doğrulama ve bildirim hizmetleri kapsamında Resend ile",
            "Yapay zeka destekli içerik üretimi kapsamında Anthropic (Claude API) ile (yalnızca anonim eğitim parametreleri)",
            "Yasal zorunluluk halinde yetkili kamu kurum ve kuruluşları ile",
          ]} />
          <P>Kişisel verileriniz, reklam veya pazarlama amacıyla üçüncü taraflarla paylaşılmaz ve satılmaz.</P>
        </Section>

        {/* 6. Çerezler */}
        <Section title="6. Çerezler (Cookies)">
          <P>
            Platform, oturum yönetimi için gerekli teknik çerezler kullanmaktadır. Bu çerezler, platformun düzgün çalışması
            için zorunlu olup kişisel tercih ve davranış takibi amacıyla kullanılmamaktadır. Analitik amaçlı anonim
            kullanım verileri toplanabilir.
          </P>
        </Section>

        {/* 7. Veri Sahibi Hakları */}
        <Section title="7. Veri Sahibi Hakları">
          <P>KVKK&apos;nın 11. maddesi kapsamında aşağıdaki haklara sahipsiniz:</P>
          <BulletList items={[
            "Kişisel verilerinizin işlenip işlenmediğini öğrenme",
            "İşlenmişse buna ilişkin bilgi talep etme",
            "İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme",
            "Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme",
            "Eksik veya yanlış işlenmişse düzeltilmesini isteme",
            "KVKK'nın 7. maddesindeki şartlar çerçevesinde silinmesini veya yok edilmesini isteme",
            "Yapılan işlemlerin veri aktarılan üçüncü kişilere bildirilmesini isteme",
            "İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme",
            "Kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme",
          ]} />
          <P>
            Haklarınızı kullanmak için{" "}
            <a href="mailto:info@ludenlab.com" className="text-[#FE703A] hover:underline">info@ludenlab.com</a>{" "}
            adresine başvurabilirsiniz.
          </P>
        </Section>

        {/* 8. Hesap Silme */}
        <Section title="8. Hesap Silme">
          <P>
            Kullanıcılar, hesaplarını silmek istediklerinde{" "}
            <a href="mailto:info@ludenlab.com" className="text-[#FE703A] hover:underline">info@ludenlab.com</a>{" "}
            adresine e-posta göndererek talepte bulunabilir. Hesap silme işlemi ile birlikte kullanıcıya ait tüm
            kişisel veriler, öğrenci kayıtları ve üretilen materyaller kalıcı olarak silinir. Yasal saklama
            yükümlülüğü bulunan veriler, ilgili süre sonunda imha edilir.
          </P>
        </Section>

        {/* 9. Politika Değişiklikleri */}
        <Section title="9. Politika Değişiklikleri">
          <P>
            İşbu Gizlilik Politikası, yasal düzenlemeler veya hizmet kapsamındaki değişiklikler doğrultusunda
            güncellenebilir. Güncellemeler Platform üzerinden yayımlanır ve yürürlük tarihi belirtilir. Önemli
            değişiklikler kayıtlı e-posta adresinize bildirilir.
          </P>
        </Section>

        {/* 10. İletişim */}
        <Section title="10. İletişim">
          <P>Gizlilik politikamız hakkında soru, görüş ve talepleriniz için:</P>
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
