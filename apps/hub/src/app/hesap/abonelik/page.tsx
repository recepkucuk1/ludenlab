import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEntitlement } from "@/lib/entitlement";
import { AbonelikGrid, type ModuleAbonelik } from "./AbonelikGrid";

export const dynamic = "force-dynamic";

const MODULES = [
  { key: "STUDIO", name: "Stüdyo", accent: "var(--poster-deep-teal)" },
  { key: "ATOLYE", name: "Atölye", accent: "var(--poster-accent)" },
] as const;

export default async function HesapAbonelik() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris?callbackUrl=/hesap/abonelik");
  const accountId = session.user.id;

  // Modül-bazlı merkezi entitlement (aktif mi + yenileme tarihi). Plan kartları client'ta.
  const modules: ModuleAbonelik[] = await Promise.all(
    MODULES.map(async (m) => {
      const ent = await getEntitlement(accountId, m.key);
      return {
        key: m.key,
        name: m.name,
        accent: m.accent,
        active: ent.active,
        periodEnd: ent.currentPeriodEnd ? ent.currentPeriodEnd.toISOString() : null,
      };
    }),
  );

  return (
    <div style={{ padding: "clamp(1.2rem,4vh,2.5rem) clamp(1rem,4vw,1.5rem) 3rem" }}>
      <div style={{ maxWidth: 880, margin: "0 auto 0", padding: "0 8px" }}>
        <span className="p-eyebrow">ABONELİK & FATURALAR</span>
        <h1 className="p-h3" style={{ margin: "6px 0 4px", fontSize: "1.7rem" }}>
          Abonelik
        </h1>
        <p className="p-body" style={{ color: "var(--poster-ink-3)" }}>
          Modül-bazlı abonelik. İstediğin modüle abone ol; planını her an değiştirebilirsin.
        </p>
      </div>

      <AbonelikGrid modules={modules} />
    </div>
  );
}
