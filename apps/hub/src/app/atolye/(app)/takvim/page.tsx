import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@atolye/auth";
import { listCases } from "@atolye/lib/cases";
import { Calendar } from "@atolye/components/Calendar";

export const metadata: Metadata = { title: "Takvim — LudenLab Atölye" };

export default async function TakvimPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const cases = await listCases(session.user.id);
  const caseOptions = cases.map((c) => ({ id: c.id, code: c.code }));

  return <Calendar caseOptions={caseOptions} />;
}
