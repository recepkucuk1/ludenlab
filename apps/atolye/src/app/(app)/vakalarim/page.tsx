import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listCases } from "@/lib/cases";
import { CasesManager } from "@/components/CasesManager";

export const metadata: Metadata = { title: "Vakalar — LudenLab Atölye" };

export default async function VakalarimPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const cases = await listCases(session.user.id);
  const initial = cases.map((c) => ({
    id: c.id,
    code: c.code,
    kademe: c.kademe,
    docs: c._count.documents,
    updatedAt: c.updatedAt.toISOString(),
  }));

  return <CasesManager initial={initial} />;
}
