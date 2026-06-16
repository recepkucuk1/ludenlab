import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getEntitlement } from "@/lib/entitlement";
import { PCard } from "@ludenlab/ui";

export const runtime = "nodejs";

type ModuleKey = "STUDIO" | "ATOLYE";

const MODULES: { key: ModuleKey; name: string; desc: string; color: string; path: string }[] = [
  { key: "STUDIO", name: "Stüdyo", desc: "Dil-konuşma-işitme (DKT) AI araçları", color: "var(--poster-deep-teal)", path: "/studio" },
  { key: "ATOLYE", name: "Atölye", desc: "Özgül öğrenme güçlüğü & DEHB araçları", color: "var(--poster-accent)", path: "/atolye" },
];

const intervalTr = (i: string) => (i === "YEARLY" ? "yıl" : "ay");

// Poster aksiyon linkleri (server component → <a>; PButton bir <button> olduğu için <a> içine konmaz).
const btnPrimary: React.CSSProperties = {
  display: "inline-block", padding: "9px 16px", borderRadius: 10, fontWeight: 600,
  background: "var(--poster-accent)", color: "#fff", textDecoration: "none", fontSize: "0.92rem",
};
const btnOutline: React.CSSProperties = {
  display: "inline-block", padding: "9px 16px", borderRadius: 10, fontWeight: 600,
  border: "1.5px solid var(--poster-ink-4)", color: "var(--poster-ink-1)", textDecoration: "none", fontSize: "0.92rem",
};

export default async function HesapPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris?callbackUrl=/hesap");
  const accountId = session.user.id;

  const plans = await prisma.billingPlan.findMany({
    where: { module: { in: ["STUDIO", "ATOLYE"] }, active: true },
    orderBy: [{ module: "asc" }, { price: "asc" }],
    select: { module: true, code: true, interval: true, name: true, price: true },
  });

  const entEntries = await Promise.all(
    MODULES.map(async (m) => [m.key, await getEntitlement(accountId, m.key)] as const),
  );
  const entitlements = new Map(entEntries);

  return (
    <div style={{ maxWidth: 860, margin: "clamp(1.5rem,5vh,3.5rem) auto", padding: "0 1rem" }}>
      <div style={{ marginBottom: 26 }}>
        <span className="p-eyebrow">HESABIM</span>
        <h1 className="p-h3" style={{ margin: "6px 0 4px", fontSize: "1.9rem" }}>
          Merhaba{session.user.name ? `, ${session.user.name}` : ""}
        </h1>
        <p className="p-body" style={{ color: "var(--poster-ink-3)" }}>
          Kullanmak istediğin modülü seç — ücretsiz başla ya da abone ol.
        </p>
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        {MODULES.map((m) => {
          const ent = entitlements.get(m.key)!;
          const modulePlans = plans.filter((p) => p.module === m.key);
          return (
            <PCard key={m.key} style={{ borderTop: `4px solid ${m.color}` }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div>
                  <h2 className="p-h3" style={{ margin: "0 0 2px", color: m.color }}>{m.name}</h2>
                  <p className="p-body" style={{ margin: 0, color: "var(--poster-ink-3)" }}>{m.desc}</p>
                </div>
                <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 700, color: "#fff", background: ent.active ? m.color : "var(--poster-ink-4)" }}>
                  {ent.active ? "Aktif abonelik" : "Ücretsiz"}
                </span>
              </div>

              <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 10 }}>
                <a href={m.path} style={btnOutline}>{m.name} →</a>
                {!ent.active &&
                  modulePlans.map((p) => (
                    <a key={`${p.code}-${p.interval}`} href={`/odeme?module=${m.key}&code=${p.code}&interval=${p.interval}`} style={btnPrimary}>
                      {p.name} · {Number(p.price).toLocaleString("tr-TR")}₺/{intervalTr(p.interval)}
                    </a>
                  ))}
              </div>
            </PCard>
          );
        })}
      </div>

      <p style={{ marginTop: 22, fontSize: "0.9rem", color: "var(--poster-ink-3)" }}>
        Tek hesap, modül-bazlı abonelik. İstediğin an ikinci modülü ekleyebilir veya planını değiştirebilirsin.
      </p>
    </div>
  );
}
