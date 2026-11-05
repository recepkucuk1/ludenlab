import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@atolye/auth";
import { HedefDenetcisiTool } from "@atolye/components/HedefDenetcisiTool";

export const metadata: Metadata = {
  title: "Hedef Denetçisi — LudenLab Atölye",
  description:
    "Yazdığınız BEP hedefini davranış, ölçüt, koşul, zaman, taban ve MEB uyumu açısından denetler; yeniden yazmaz.",
};

export default async function HedefDenetcisiPage() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  return (
    <>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)", margin: "0 0 0.4rem" }}>Hedef Denetçisi</h1>
        <p style={{ color: "var(--poster-ink-2)", maxWidth: 620, margin: 0 }}>
          Hedefinizi kendiniz yazın; beş bileşen ve MEB uyumu açısından denetlensin. Denetçi hedefi yeniden yazmaz,
          eksik bileşen için size soru sorar. Kredi düşmez.
        </p>
      </header>
      <HedefDenetcisiTool />
    </>
  );
}
