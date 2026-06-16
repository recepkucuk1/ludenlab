import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DavranisTool } from "@atolye/components/DavranisTool";

export const metadata: Metadata = {
  title: "DEHB Davranış Destek Planı — LudenLab Atölye",
  description:
    "Hedef davranış için ABC analizi, işlev hipotezi, yerine koyma davranışı ve pekiştirme planı taslağı üretir.",
};

export default async function DavranisPage() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  return (
    <>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)", margin: "0 0 0.4rem" }}>
          DEHB Davranış Destek Planı
        </h1>
        <p style={{ color: "var(--poster-ink-2)", maxWidth: 620, margin: 0 }}>
          Bir hedef davranış girin; ABC analizi, yerine koyma davranışı ve pekiştirme planı içeren
          eğitsel bir taslak üretilsin.
        </p>
      </header>
      <DavranisTool />
    </>
  );
}
