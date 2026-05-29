import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PBadge, PSection } from "@ludenlab/ui";
import { auth } from "@/auth";
import { getCaseWithDocs } from "@/lib/cases";
import { KADEME, type Kademe } from "@/lib/bep";
import { docTypeLabel } from "@/lib/doc-types";
import { Markdown } from "@/components/Markdown";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/giris");

  const { caseId } = await params;
  const kase = await getCaseWithDocs(session.user.id, caseId);
  if (!kase) notFound();

  return (
    <>
      <Link
        href="/vakalarim"
        style={{ color: "var(--poster-ink-3)", fontSize: "0.9rem", textDecoration: "none" }}
      >
        ← Vakalarım
      </Link>
      <header style={{ margin: "0.75rem 0 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <h1 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.1rem)", margin: 0 }}>{kase.code}</h1>
        <PBadge>{KADEME[kase.kademe as Kademe] ?? kase.kademe}</PBadge>
      </header>

      {kase.documents.length === 0 ? (
        <p style={{ color: "var(--poster-ink-3)" }}>Bu vakada henüz taslak yok.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {kase.documents.map((d) => (
            <PSection
              key={d.id}
              title={`${docTypeLabel(d.type)} · ${d.createdAt.toLocaleDateString("tr-TR")}`}
              action={<PBadge tone="blue">~{d.credits} kredi</PBadge>}
            >
              <Markdown>{d.content}</Markdown>
            </PSection>
          ))}
        </div>
      )}
    </>
  );
}
