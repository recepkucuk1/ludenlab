import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProfilForm } from "./ProfilForm";

export const dynamic = "force-dynamic";

export default async function HesapProfil() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris?callbackUrl=/hesap/profil");

  return (
    <div style={{ padding: "clamp(1.2rem,4vh,2.5rem) clamp(1rem,4vw,2.5rem)", maxWidth: 620 }}>
      <span className="p-eyebrow">PROFİL</span>
      <h1 className="p-h3" style={{ margin: "6px 0 22px", fontSize: "1.7rem" }}>Profil & güvenlik</h1>
      <ProfilForm initialName={session.user.name ?? ""} email={session.user.email ?? ""} />
    </div>
  );
}
