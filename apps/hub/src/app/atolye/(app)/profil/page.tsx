import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { User, KeyRound } from "lucide-react";
import { PButton, PCard, PInput, PSection } from "@ludenlab/ui";
import { auth } from "@atolye/auth";
import { prisma } from "@atolye/lib/db";

export const metadata: Metadata = { title: "Profil — LudenLab Atölye" };

export default async function ProfilPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const account = await prisma.account.findUnique({
    where: { id: session.user.id },
  });

  if (!account) redirect("/giris");

  return (
    <>
      <header style={{ marginBottom: "1.6rem" }}>
        <span className="p-eyebrow">HESAP</span>
        <h1 className="p-h1" style={{ fontSize: "clamp(1.7rem, 3.5vw, 2.3rem)", margin: "8px 0 0.4rem" }}>
          Profil Ayarları
        </h1>
        <p className="p-body" style={{ margin: 0, maxWidth: 560 }}>
          Kişisel bilgilerinizi ve hesap güvenliğinizi yönetin.
        </p>
      </header>

      <PSection title="Kişisel Bilgiler" style={{ marginBottom: "2rem" }}>
        <PCard>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label className="p-small" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>Ad Soyad</label>
              <PInput defaultValue={account.name || ""} placeholder="Ad Soyad" readOnly />
            </div>
            <div>
              <label className="p-small" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>E-posta</label>
              <PInput defaultValue={account.email} readOnly disabled />
            </div>
          </div>
        </PCard>
      </PSection>
      
      <PSection title="Güvenlik">
        <PCard>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p className="p-small">Şifre sıfırlama veya hesap dondurma işlemleri için yöneticiyle iletişime geçin.</p>
            <PButton variant="ghost" disabled>Şifre Değiştir (Yakında)</PButton>
          </div>
        </PCard>
      </PSection>
    </>
  );
}
