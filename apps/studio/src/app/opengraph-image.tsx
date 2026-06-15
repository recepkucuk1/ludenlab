import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "LudenLab — AI Destekli Öğrenme Kartı Üreticisi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori CSS-değişkeni okuyamaz; poster token'ları burada hex sabit.
const CREAM = "#fff8ec";
const INK = "#0e1e26";
const ACCENT = "#fe703a";
const YELLOW = "#ffce52";
const BLUE = "#4a90e2";

export default async function Image() {
  // public/ standalone çıktısına server.js yanına kopyalandığı için
  // (favicon/icon'lar da oradan servis ediliyor) bu yol prod'da geçerli.
  const [bold, regular] = await Promise.all([
    readFile(join(process.cwd(), "public/fonts/NotoSans-Bold.ttf")),
    readFile(join(process.cwd(), "public/fonts/NotoSans-Regular.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: CREAM,
          padding: 60,
          fontFamily: "Noto Sans",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            background: "#ffffff",
            border: `8px solid ${INK}`,
            borderRadius: 28,
            boxShadow: `18px 18px 0 ${INK}`,
            padding: "58px 66px",
          }}
        >
          <div style={{ display: "flex" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: ACCENT,
                color: "#ffffff",
                border: `3px solid ${INK}`,
                borderRadius: 999,
                padding: "12px 26px",
                fontSize: 27,
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              DİL · KONUŞMA · İŞİTME
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 152,
                fontWeight: 700,
                color: INK,
                letterSpacing: -5,
                lineHeight: 1,
              }}
            >
              LudenLab
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 22,
                fontSize: 46,
                fontWeight: 400,
                color: "rgba(14, 30, 38, 0.72)",
              }}
            >
              AI Destekli Öğrenme Kartı Üreticisi
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", width: 18, height: 18, borderRadius: 999, background: ACCENT, marginRight: 9 }} />
            <div style={{ display: "flex", width: 18, height: 18, borderRadius: 999, background: YELLOW, marginRight: 9 }} />
            <div style={{ display: "flex", width: 18, height: 18, borderRadius: 999, background: BLUE, marginRight: 20 }} />
            <div style={{ display: "flex", fontSize: 29, fontWeight: 700, color: INK }}>ludenlab.com</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Noto Sans", data: bold, weight: 700, style: "normal" },
        { name: "Noto Sans", data: regular, weight: 400, style: "normal" },
      ],
    }
  );
}
