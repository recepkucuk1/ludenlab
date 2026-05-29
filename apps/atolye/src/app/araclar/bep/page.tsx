import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BepAssistant } from "@/components/BepAssistant";

export const metadata: Metadata = {
  title: "BEP & Rapor Asistanı — LudenLab Atölye",
  description:
    "Çocuğun profilinden BEP hedef taslağı, ilerleme raporu ve aile özeti üretir. Çıktılar uzman onayı gerektiren taslaklardır.",
};

export default async function BepPage() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  return (
    <>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)", margin: "0 0 0.4rem" }}>
          BEP &amp; Rapor Asistanı
        </h1>
        <p style={{ color: "var(--poster-ink-2)", maxWidth: 620, margin: 0 }}>
          Çocuğun profilini girin; MEB destek eğitim çerçevesine hizalı bir taslak üretilsin. Çocuk
          adı yerine kod/rumuz kullanın.
        </p>
      </header>
      <BepAssistant />
    </>
  );
}
