import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listAllDocuments } from "@/lib/cases";
import { Kutuphane } from "@/components/Kutuphane";

export const metadata: Metadata = { title: "Kütüphane — LudenLab Atölye" };

export default async function KutuphanePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const docs = await listAllDocuments(session.user.id);
  const initial = docs.map((d) => ({
    id: d.id,
    type: d.type,
    credits: d.credits,
    createdAt: d.createdAt.toISOString(),
    caseId: d.case.id,
    code: d.case.code,
    kademe: d.case.kademe,
  }));

  return <Kutuphane initial={initial} />;
}
