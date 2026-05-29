import type { Metadata } from "next";
import { SeansPlaniTool } from "@/components/SeansPlaniTool";

export const metadata: Metadata = {
  title: "Seans Planı Üreteci — LudenLab Atölye",
  description:
    "Bir seansın hedefinden ısınma → ana etkinlik → tekrar → kapanış akışlı, çok duyulu bir seans planı taslağı üretir.",
};

export default function SeansPlaniPage() {
  return (
    <>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)", margin: "0 0 0.4rem" }}>
          Seans Planı Üreteci
        </h1>
        <p style={{ color: "var(--poster-ink-2)", maxWidth: 620, margin: 0 }}>
          Bu seansın hedefini girin; çok duyulu, süre dağılımlı bir taslak plan üretilsin.
        </p>
      </header>
      <SeansPlaniTool />
    </>
  );
}
