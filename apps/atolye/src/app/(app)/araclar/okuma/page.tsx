import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { OkumaTool } from "@/components/OkumaTool";

export const metadata: Metadata = {
  title: "Okuma-Akıcılık Seti — LudenLab Atölye",
  description:
    "Disleksi için seviyeli okuma parçası, Türkçe hece-ses çalışması ve akıcılık egzersizleri taslağı üretir.",
};

export default async function OkumaPage() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  return (
    <>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)", margin: "0 0 0.4rem" }}>
          Okuma-Akıcılık Seti
        </h1>
        <p style={{ color: "var(--poster-ink-2)", maxWidth: 620, margin: 0 }}>
          Öğrenci profilini girin; seviyeli okuma parçası, hece çalışması ve akıcılık egzersizleri
          içeren bir taslak set üretilsin.
        </p>
      </header>
      <OkumaTool />
    </>
  );
}
