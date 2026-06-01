import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listCases } from "@/lib/cases";
import { CasesManager, type StudentRow } from "@/components/CasesManager";

export const metadata: Metadata = { title: "Öğrenciler — LudenLab Atölye" };

export default async function OgrencilerPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const cases = await listCases(session.user.id);
  const initial: StudentRow[] = cases.map((c) => ({
    id: c.id,
    code: c.code,
    kademe: c.kademe,
    yas: c.yas,
    taniProfili: c.taniProfili,
    guclukDuzeyi: c.guclukDuzeyi,
    gucluYonler: c.gucluYonler,
    ilgiAlanlari: c.ilgiAlanlari,
    okul: c.okul,
    veliIletisim: c.veliIletisim,
    notes: c.notes,
    docs: c._count.documents,
    updatedAt: c.updatedAt.toISOString(),
  }));

  return <CasesManager initial={initial} />;
}
