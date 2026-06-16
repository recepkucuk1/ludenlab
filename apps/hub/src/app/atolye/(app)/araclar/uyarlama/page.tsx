import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UyarlamaTool } from "@atolye/components/UyarlamaTool";

export const metadata: Metadata = {
  title: "Bireysel Uyarlama Önericisi — LudenLab Atölye",
  description:
    "Tanı profiline, derse ve ortama göre sunum/yanıt/ortam/değerlendirme uyarlamaları listesi üretir.",
};

export default async function UyarlamaPage() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  return (
    <>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)", margin: "0 0 0.4rem" }}>
          Bireysel Uyarlama Önericisi
        </h1>
        <p style={{ color: "var(--poster-ink-2)", maxWidth: 620, margin: 0 }}>
          Profili, dersi ve ortamı girin; sınıf-içi uyarlama önerileri (gerekçeleriyle) üretilsin.
        </p>
      </header>
      <UyarlamaTool />
    </>
  );
}
