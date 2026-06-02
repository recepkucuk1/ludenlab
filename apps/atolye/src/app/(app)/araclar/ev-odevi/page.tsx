import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EvOdeviTool } from "@/components/EvOdeviTool";

export const metadata: Metadata = {
  title: "Ev Ödevi Programı (ÖÖG) — LudenLab Atölye",
  description: "Özel Öğrenme Güçlüğü (ÖÖG) profiline uygun ev çalışma programı üretir.",
};

export default async function EvOdeviPage() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  return (
    <>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)", margin: "0 0 0.4rem" }}>
          Ev Ödevi Programı
        </h1>
        <p style={{ color: "var(--poster-ink-2)", maxWidth: 620, margin: 0 }}>
          Özel öğrenme güçlüğü olan öğrencinizin profiline ve hedeflenen beceriye göre
          aile destekli ev çalışma programı hazırlayın.
        </p>
      </header>
      <EvOdeviTool />
    </>
  );
}
