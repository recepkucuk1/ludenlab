/* ============================================================
   LudenLab Hub — paylaşılan modül verisi, ikonlar, mini-mockup'lar
   Claude Design (Yön B) handoff'undan port edildi.
   ============================================================ */
import type { CSSProperties, ReactElement } from "react";

export const INK = "#0E1E26";
export const CREAM = "#FFF8EC";

export interface Product {
  id: string;
  num: string;
  name: string;
  full: string;
  color: string;
  tint: string;
  href: string;
  host: string;
  status: string;
  statusKind: "live";
  tagline: string;
  value: string;
  features: string[];
  who: string;
  mock: "studio" | "atolye";
}

/* ---------- Modül verisi (tek kaynak) ---------- */
export const PRODUCTS: Product[] = [
  {
    id: "studio",
    num: "01",
    name: "Stüdyo",
    full: "LudenLab Stüdyo",
    color: "#4A90E2",
    tint: "rgba(74,144,226,0.12)",
    href: "/studio",
    host: "ludenlab.com/studio",
    status: "Canlı",
    statusKind: "live",
    tagline: "Dil, konuşma ve işitme için AI destekli terapi araçları.",
    value: "Artikülasyon, dil, akıcılık, ses ve işitme için kart tabanlı materyal ve plan üretin.",
    features: [
      "Kart tabanlı araç kütüphanesi",
      "AI destekli materyal & seans planı",
      "Görsel hedef takibi ve ilerleme",
    ],
    who: "Dil-konuşma terapistleri · odyologlar",
    mock: "studio",
  },
  {
    id: "atolye",
    num: "02",
    name: "Atölye",
    full: "LudenLab Atölye",
    color: "#FE703A",
    tint: "rgba(254,112,58,0.12)",
    href: "/atolye",
    host: "ludenlab.com/atolye",
    status: "Canlı",
    statusKind: "live",
    tagline: "ÖÖB ve DEHB için BEP, rapor ve seans planı araçları.",
    value: "BEP hedefi, ilerleme raporu ve aile özeti (MEB çerçevesi) + çok duyulu seans planı üretin.",
    features: [
      "BEP & Rapor Asistanı — MEB çerçevesi",
      "Seans Planı Üreteci — çok duyulu",
      "Vaka, kütüphane ve takvim",
    ],
    who: "Özel eğitim öğretmenleri · ÖÖB / DEHB uzmanları",
    mock: "atolye",
  },
];

/* ---------- İkonlar (poster stroke = 2.2) ---------- */
type IconProps = { size?: number; c?: string };

export const HubIcon: Record<string, (p?: IconProps) => ReactElement> = {
  studio: (p) => (
    <svg viewBox="0 0 24 24" width={p?.size || 24} height={p?.size || 24} fill="none"
      stroke={p?.c || INK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="13" height="15" rx="2.5" />
      <path d="M8 3.5h11a1.5 1.5 0 0 1 1.5 1.5v12" opacity="0.55" />
      <path d="M6.5 11h6M6.5 15h4" />
    </svg>
  ),
  atolye: (p) => (
    <svg viewBox="0 0 24 24" width={p?.size || 24} height={p?.size || 24} fill="none"
      stroke={p?.c || INK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill={p?.c || INK} stroke="none" />
      <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" />
    </svg>
  ),
  arrow: (p) => (
    <svg viewBox="0 0 24 24" width={p?.size || 20} height={p?.size || 20} fill="none"
      stroke={p?.c || INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  check: (p) => (
    <svg viewBox="0 0 24 24" width={p?.size || 16} height={p?.size || 16} fill="none"
      stroke={p?.c || INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 6.5" />
    </svg>
  ),
};

/* ---------- Wordmark (LudenLab) ---------- */
export function Wordmark({ height = 26, color = INK }: { height?: number; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <img src="/luden-logo-mark.png" alt="LudenLab" style={{ height, width: "auto" }} />
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: height * 0.7, letterSpacing: "-0.025em", color }}>
        LudenLab
      </span>
    </div>
  );
}

/* ---------- Durum rozeti ---------- */
export function StatusPill({ p, onColor = false }: { p: Product; onColor?: boolean }) {
  const live = p.statusKind === "live";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      height: 26, padding: "0 11px", borderRadius: 999,
      border: `2px solid ${INK}`,
      background: onColor ? "rgba(255,248,236,0.92)" : "#fff",
      fontSize: 11.5, fontWeight: 800, color: INK, letterSpacing: "0.01em",
      whiteSpace: "nowrap",
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: 999,
        background: live ? "#2CC069" : "#FE703A",
        boxShadow: live ? "0 0 0 3px rgba(44,192,105,0.25)" : "none",
        animation: live ? "hubPulse 1.8s ease-in-out infinite" : "none",
      }} />
      {p.status}
    </span>
  );
}

/* ============================================================
   MINI MOCKUP'LAR — küçük beyaz poster kartları (ink-on-white)
   ============================================================ */
const cardBase: CSSProperties = {
  background: "#fff", border: `2px solid ${INK}`, borderRadius: 14,
  boxShadow: "0 4px 0 " + INK, padding: 13, fontFamily: "var(--font-body)",
  maxWidth: "100%", // dar kart içinde sabit genişlik taşmasın
};

function StudioMock({ w = 234 }: { w?: number }) {
  return (
    <div style={{ ...cardBase, width: w }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
        <span style={{ display: "inline-flex", height: 22, alignItems: "center", padding: "0 9px", borderRadius: 999, background: "#2CC069", color: "#fff", fontSize: 10.5, fontWeight: 800 }}>Konuşma</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(14,30,38,.55)", fontFamily: "var(--font-mono)" }}>3-6 yaş</span>
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.01em", color: INK }}>
        Mutfak Keşfi — Sözcük Avı
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5, marginTop: 11 }}>
        {["🍞", "🧀", "🍅", "🥒"].map((e, i) => (
          <div key={i} style={{ aspectRatio: "1/1", background: CREAM, border: `2px solid ${INK}`, borderRadius: 8, display: "grid", placeItems: "center", fontSize: 15 }}>{e}</div>
        ))}
      </div>
    </div>
  );
}

function AtolyeMock({ w = 234 }: { w?: number }) {
  return (
    <div style={{ ...cardBase, width: w }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", color: "#FE703A" }}>BEP HEDEFİ</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(14,30,38,.55)", fontFamily: "var(--font-mono)" }}>2.2.3</span>
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.01em", color: INK }}>
        İki sözcüklü yönerge takibi
      </div>
      <div style={{ marginTop: 11, display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ flex: 1, height: 9, borderRadius: 999, background: CREAM, border: `2px solid ${INK}`, overflow: "hidden" }}>
          <div style={{ width: "65%", height: "100%", background: "#FE703A" }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, color: INK, fontFamily: "var(--font-mono)" }}>%65</span>
      </div>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        {["Aile özeti hazır", "İlerleme raporu — taslak"].map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, fontWeight: 600, color: "rgba(14,30,38,.78)" }}>
            <span style={{ width: 16, height: 16, borderRadius: 5, background: i === 0 ? "#FE703A" : CREAM, border: `2px solid ${INK}`, display: "grid", placeItems: "center" }}>
              {i === 0 && HubIcon.check({ c: "#fff", size: 11 })}
            </span>
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Mock({ kind, w }: { kind: Product["mock"]; w?: number }) {
  if (kind === "studio") return <StudioMock w={w} />;
  if (kind === "atolye") return <AtolyeMock w={w} />;
  return null;
}
