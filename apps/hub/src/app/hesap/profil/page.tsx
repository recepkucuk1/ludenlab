import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProfilForm } from "./ProfilForm";
import { BillingProfileForm } from "@/components/BillingProfileForm";

export const dynamic = "force-dynamic";

export default async function HesapProfil() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris?callbackUrl=/hesap/profil");

  return (
    <div style={{ padding: "clamp(1.2rem,4vh,2.5rem) clamp(1rem,4vw,2.5rem)", maxWidth: 620 }}>
      <span className="p-eyebrow">PROFİL</span>
      <h1 className="p-h3" style={{ margin: "6px 0 22px", fontSize: "1.7rem" }}>Profil & güvenlik</h1>
      <ProfilForm initialName={session.user.name ?? ""} email={session.user.email ?? ""} />

      <h2 className="p-h3" style={{ margin: "34px 0 6px", fontSize: "1.25rem" }}>Fatura bilgileri</h2>
      <p className="p-small" style={{ color: "var(--poster-ink-3)", margin: "0 0 16px", lineHeight: 1.5 }}>
        Ödemelerine kesilecek e-Arşiv/e-Fatura için kullanılır. İlk ödemede bir kez istenir;
        buradan güncelleyebilirsin.
      </p>
      <BillingProfileForm />
    </div>
  );
}
