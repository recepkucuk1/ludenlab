import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MateryalTool } from "@atolye/components/MateryalTool";

export const metadata: Metadata = {
  title: "Çok Duyulu Materyal Üreteci — LudenLab Atölye",
  description:
    "Öğrencinin güçlük profiline ve kademesine göre çok duyulu çalışma yaprağı / etkinlik taslağı üretir.",
};

export default async function MateryalPage() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  return (
    <>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)", margin: "0 0 0.4rem" }}>
          Çok Duyulu Materyal Üreteci
        </h1>
        <p style={{ color: "var(--poster-ink-2)", maxWidth: 620, margin: 0 }}>
          Öğrenci profilini ve konuyu girin; güçlük profiline uyarlanmış, çok duyulu bir materyal
          taslağı üretilsin.
        </p>
      </header>
      <MateryalTool />
    </>
  );
}
