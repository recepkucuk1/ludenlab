import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getEntitlement } from "@/lib/entitlement";
import { PCard } from "@ludenlab/ui";

export const dynamic = "force-dynamic";

type ModuleKey = "STUDIO" | "ATOLYE";
const MODULES: { key: ModuleKey; name: string; desc: string; color: string; path: string }[] = [
  { key: "STUDIO", name: "Studio", desc: "Dil-konuşma-işitme (DKT) AI araçları", color: "var(--poster-deep-teal)", path: "/studio" },
  { key: "ATOLYE", name: "Atölye", desc: "Özgül öğrenme güçlüğü & DEHB araçları", color: "var(--poster-accent)", path: "/atolye" },
];

export default async function HesapGenelBakis() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris?callbackUrl=/hesap");
  const accountId = session.user.id;

  const entEntries = await Promise.all(
    MODULES.map(async (m) => [m.key, await getEntitlement(accountId, m.key)] as const),
  );
  const ents = new Map(entEntries);

  return (
    <div style={{ padding: "clamp(1.2rem,4vh,2.5rem) clamp(1rem,4vw,2.5rem)", maxWidth: 880 }}>
      <span className="p-eyebrow">GENEL BAKIŞ</span>
      <h1 className="p-h3" style={{ margin: "6px 0 4px", fontSize: "1.7rem" }}>
        Merhaba{session.user.name ? `, ${session.user.name}` : ""}
      </h1>
      <p className="p-body" style={{ color: "var(--poster-ink-3)", marginBottom: 22 }}>
        Modüllerine buradan gir. Abonelik ve profil ayarları sol menüde.
      </p>

      <div style={{ display: "grid", gap: 16 }}>
        {MODULES.map((m) => {
          const ent = ents.get(m.key)!;
          return (
            <PCard key={m.key} style={{ borderTop: `4px solid ${m.color}` }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <h2 className="p-h3" style={{ margin: "0 0 2px", color: m.color }}>{m.name}</h2>
                  <p className="p-body" style={{ margin: 0, color: "var(--poster-ink-3)" }}>{m.desc}</p>
                </div>
                <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 700, color: "#fff", background: ent.active ? m.color : "var(--poster-ink-4)" }}>
                  {ent.active ? "Aktif abonelik" : "Ücretsiz"}
                </span>
              </div>
              <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href={m.path} className="p-btn p-btn--accent p-btn--sm">{m.name}&apos;e git →</Link>
                {!ent.active && (
                  <Link href="/hesap/abonelik" className="p-btn p-btn--ghost p-btn--sm">Abonelik planları</Link>
                )}
              </div>
            </PCard>
          );
        })}
      </div>
    </div>
  );
}
