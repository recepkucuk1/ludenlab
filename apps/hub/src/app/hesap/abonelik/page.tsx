import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getEntitlement } from "@/lib/entitlement";
import { PCard } from "@ludenlab/ui";

export const dynamic = "force-dynamic";

type ModuleKey = "STUDIO" | "ATOLYE";
const MODULES: { key: ModuleKey; name: string; color: string }[] = [
  { key: "STUDIO", name: "Stüdyo", color: "var(--poster-deep-teal)" },
  { key: "ATOLYE", name: "Atölye", color: "var(--poster-accent)" },
];
const intervalTr = (i: string) => (i === "YEARLY" ? "yıl" : "ay");

export default async function HesapAbonelik() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris?callbackUrl=/hesap/abonelik");
  const accountId = session.user.id;

  const plans = await prisma.billingPlan.findMany({
    where: { module: { in: ["STUDIO", "ATOLYE"] }, active: true },
    orderBy: [{ module: "asc" }, { price: "asc" }],
    select: { module: true, code: true, interval: true, name: true, price: true },
  });
  const entEntries = await Promise.all(
    MODULES.map(async (m) => [m.key, await getEntitlement(accountId, m.key)] as const),
  );
  const ents = new Map(entEntries);

  return (
    <div style={{ padding: "clamp(1.2rem,4vh,2.5rem) clamp(1rem,4vw,2.5rem)", maxWidth: 880 }}>
      <span className="p-eyebrow">ABONELİK & FATURALAR</span>
      <h1 className="p-h3" style={{ margin: "6px 0 4px", fontSize: "1.7rem" }}>Abonelik</h1>
      <p className="p-body" style={{ color: "var(--poster-ink-3)", marginBottom: 22 }}>
        Modül-bazlı abonelik. İstediğin modüle abone ol; planını her an değiştirebilirsin.
      </p>

      <div style={{ display: "grid", gap: 16 }}>
        {MODULES.map((m) => {
          const ent = ents.get(m.key)!;
          const modulePlans = plans.filter((p) => p.module === m.key);
          return (
            <PCard key={m.key} style={{ borderTop: `4px solid ${m.color}` }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <h2 className="p-h3" style={{ margin: 0, color: m.color }}>{m.name}</h2>
                <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 700, color: "#fff", background: ent.active ? m.color : "var(--poster-ink-4)" }}>
                  {ent.active ? "Aktif abonelik" : "Ücretsiz"}
                </span>
              </div>
              <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 10 }}>
                {ent.active ? (
                  <span className="p-body" style={{ color: "var(--poster-ink-3)", fontSize: "0.9rem" }}>
                    Aktif aboneliğin var. Plan değişikliği için destek ile iletişime geç.
                  </span>
                ) : modulePlans.length === 0 ? (
                  <span className="p-body" style={{ color: "var(--poster-ink-3)", fontSize: "0.9rem" }}>
                    Plan bilgisi yakında.
                  </span>
                ) : (
                  modulePlans.map((p) => (
                    <a
                      key={`${p.code}-${p.interval}`}
                      href={`/odeme?module=${m.key}&code=${p.code}&interval=${p.interval}`}
                      className="p-btn p-btn--accent p-btn--sm"
                    >
                      {p.name} · {Number(p.price).toLocaleString("tr-TR")}₺/{intervalTr(p.interval)}
                    </a>
                  ))
                )}
              </div>
            </PCard>
          );
        })}
      </div>
    </div>
  );
}
