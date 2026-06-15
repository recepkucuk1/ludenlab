import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Çerez Politikası — LudenLab",
  description: "LudenLab çerez (cookie) kullanım politikası.",
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

export default function CookiePolicyPage() {
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
            Çerez (Cookie) Politikası
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

        {/* 1. Çerez Nedir? */}
        <Section title="1. Çerez Nedir?">
          <P>
            Çerezler (cookies), web siteleri tarafından tarayıcınıza yerleştirilen küçük metin dosyalarıdır.
            Bu dosyalar, siteyi bir sonraki ziyaretinizde sizi tanımak, oturum bilgilerinizi korumak ve site
            deneyiminizi iyileştirmek amacıyla kullanılmaktadır.
          </P>
        </Section>

        {/* 2. Kullanılan Çerez Türleri */}
        <Section title="2. Kullanılan Çerez Türleri">
          <P>
            LudenLab platformunda yalnızca aşağıdaki zorunlu (teknik) çerezler kullanılmaktadır:
          </P>
          <div className="overflow-x-auto rounded-xl border border-[#023435]/10 mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#023435] text-white">
                  <th className="px-4 py-3 text-left font-semibold">Çerez Adı</th>
                  <th className="px-4 py-3 text-left font-semibold">Türü</th>
                  <th className="px-4 py-3 text-left font-semibold">Amacı</th>
                  <th className="px-4 py-3 text-left font-semibold">Süre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#023435]/10">
                {[
                  ["next-auth.session-token", "Zorunlu", "Oturum yönetimi ve kimlik doğrulama", "Oturum süresi"],
                  ["next-auth.csrf-token", "Zorunlu", "CSRF saldırılarına karşı koruma", "Oturum süresi"],
                  ["next-auth.callback-url", "Zorunlu", "Giriş sonrası yönlendirme", "Oturum süresi"],
                  ["cookie-consent", "Zorunlu", "Çerez bilgilendirmesi onay durumu", "1 yıl"],
                ].map(([name, type, purpose, duration], i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#023435]/[0.02]"}>
                    <td className="px-4 py-3 font-mono text-xs text-[#023435] dark:text-foreground">{name}</td>
                    <td className="px-4 py-3 text-gray-600">{type}</td>
                    <td className="px-4 py-3 text-gray-600">{purpose}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* 3. Kullanılmayan Çerez Türleri */}
        <Section title="3. Kullanılmayan Çerez Türleri">
          <P>LudenLab platformunda aşağıdaki çerez türleri <strong className="text-[#023435] dark:text-foreground">KULLANILMAMAKTADIR</strong>:</P>
          <BulletList items={[
            "Reklam ve pazarlama çerezleri",
            "Üçüncü taraf izleme çerezleri",
            "Davranışsal hedefleme çerezleri",
            "Sosyal medya çerezleri",
          ]} />
          <P>
            Platform, kullanıcı davranışlarını izlemek veya profil oluşturmak amacıyla herhangi bir çerez kullanmamaktadır.
          </P>
        </Section>

        {/* 4. Çerezlerin Yönetimi */}
        <Section title="4. Çerezlerin Yönetimi">
          <P>
            Tarayıcınızın ayarlarından çerezleri silebilir veya engelleyebilirsiniz. Ancak zorunlu çerezlerin
            engellenmesi durumunda platformun bazı özellikleri (oturum açma, güvenli erişim) düzgün çalışmayabilir.
            Çerez ayarlarını değiştirmek için tarayıcınızın yardım bölümünü inceleyebilirsiniz.
          </P>
        </Section>

        {/* 5. Üçüncü Taraf Hizmetleri */}
        <Section title="5. Üçüncü Taraf Hizmetleri">
          <P>
            Ödeme işlemleri sırasında X ödeme altyapısı kendi çerezlerini kullanabilir. Bu çerezler
            X&apos;in gizlilik politikası kapsamında yönetilmektedir ve LudenLab&apos;ın kontrolü dışındadır.
          </P>
        </Section>

        {/* 6. Politika Değişiklikleri */}
        <Section title="6. Politika Değişiklikleri">
          <P>
            İşbu Çerez Politikası, yasal düzenlemeler veya platform değişiklikleri doğrultusunda güncellenebilir.
            Güncellemeler bu sayfa üzerinden yayımlanır.
          </P>
        </Section>

        {/* 7. İletişim */}
        <Section title="7. İletişim">
          <P>Çerez politikamız hakkında soru ve talepleriniz için:</P>
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
