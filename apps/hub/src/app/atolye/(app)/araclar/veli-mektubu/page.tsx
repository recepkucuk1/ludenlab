import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { VeliMektubuTool } from "@atolye/components/VeliMektubuTool";

export const metadata: Metadata = {
  title: "Veli/Ev Destek Mektubu — LudenLab Atölye",
  description:
    "Aileye yönelik sıcak, damgalamayan, somut ev önerileri içeren mektup taslağı üretir.",
};

export default async function VeliMektubuPage() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  return (
    <>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)", margin: "0 0 0.4rem" }}>
          Veli/Ev Destek Mektubu
        </h1>
        <p style={{ color: "var(--poster-ink-2)", maxWidth: 620, margin: 0 }}>
          Amacı seçin; güçlü yönle başlayan, sade ve umut veren bir veli mektubu taslağı üretilsin.
        </p>
      </header>
      <VeliMektubuTool />
    </>
  );
}
