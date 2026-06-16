import { notFound, redirect } from "next/navigation";
import { auth } from "@atolye/auth";
import { getCaseWithDocs } from "@atolye/lib/cases";
import { CaseDetail } from "@atolye/components/CaseDetail";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const { caseId } = await params;
  const kase = await getCaseWithDocs(session.user.id, caseId);
  if (!kase) notFound();

  return (
    <CaseDetail
      kase={{
        id: kase.id,
        code: kase.code,
        kademe: kase.kademe,
        mebBolumler: kase.mebBolumler,
        notes: kase.notes ?? "",
        documents: kase.documents.map((d) => ({
          id: d.id,
          type: d.type,
          content: d.content,
          model: d.model,
          credits: d.credits,
          createdAt: d.createdAt.toISOString(),
        })),
      }}
    />
  );
}
