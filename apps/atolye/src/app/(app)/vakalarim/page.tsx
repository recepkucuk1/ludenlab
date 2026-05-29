import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PBadge, PCard } from "@ludenlab/ui";
import { auth } from "@/auth";
import { listCases } from "@/lib/cases";
import { KADEME, type Kademe } from "@/lib/bep";

export const metadata: Metadata = { title: "Vakalarım — LudenLab Atölye" };

export default async function VakalarimPage() {
  const session = await auth();
  if (!session?.user) redirect("/giris");

  const cases = await listCases(session.user.id);

  return (
    <>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)", margin: "0 0 0.4rem" }}>Vakalarım</h1>
        <p style={{ color: "var(--poster-ink-2)", margin: 0 }}>
          Kaydettiğin taslaklar rumuza göre vakalarda toplanır.
        </p>
      </header>

      {cases.length === 0 ? (
        <PCard>
          <p style={{ margin: "0 0 0.75rem", color: "var(--poster-ink-2)" }}>
            Henüz kayıtlı vakan yok. Bir araçla taslak üretip “Vakaya kaydet” deyince burada görünür.
          </p>
          <Link className="p-btn p-btn--accent p-btn--md" href="/">
            Araçlara git
          </Link>
        </PCard>
      ) : (
        <section
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          }}
        >
          {cases.map((c) => (
            <Link key={c.id} href={`/vakalarim/${c.id}`} style={{ textDecoration: "none" }}>
              <PCard style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "1.1rem", color: "var(--poster-ink)" }}>{c.code}</strong>
                  <PBadge tone="blue">{c._count.documents} taslak</PBadge>
                </div>
                <span style={{ color: "var(--poster-ink-2)", fontSize: "0.9rem" }}>
                  {KADEME[c.kademe as Kademe] ?? c.kademe}
                </span>
                <span style={{ color: "var(--poster-ink-3)", fontSize: "0.8rem" }}>
                  Güncelleme: {c.updatedAt.toLocaleDateString("tr-TR")}
                </span>
              </PCard>
            </Link>
          ))}
        </section>
      )}
    </>
  );
}
