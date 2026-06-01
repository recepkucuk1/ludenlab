import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SosyalOykuTool } from "@/components/SosyalOykuTool";

export const metadata: Metadata = {
  title: "Sosyal Öykü Üreteci — LudenLab Atölye",
  description:
    "Günlük durumlar için kısa, somut, duygu-düzenleme odaklı sosyal öykü taslağı üretir.",
};

export default async function SosyalOykuPage() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  return (
    <>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)", margin: "0 0 0.4rem" }}>
          Sosyal Öykü Üreteci
        </h1>
        <p style={{ color: "var(--poster-ink-2)", maxWidth: 620, margin: 0 }}>
          Bir durum girin; duyguyu adlandıran, somut ve olumlu bir sosyal öykü taslağı üretilsin.
        </p>
      </header>
      <SosyalOykuTool />
    </>
  );
}
