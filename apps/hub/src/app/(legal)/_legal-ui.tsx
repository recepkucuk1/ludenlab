/* Yasal sayfalar için paylaşılan sunum bileşenleri + şirket sabitleri.
   Sunum amaçlı (hook yok) → server component. Atölye'nin yasal sistemiyle
   aynı poster dili; ancak içerik TEK ÇATI: ludenlab.com üzerinden satılan
   Stüdyo · Atölye ürünlerinin ORTAK yasal metni. */
import type { ReactNode } from "react";

export const COMPANY = {
  legalName: "Luden Eğitim Danışmanlık Organizasyon ve Ticaret Limited Şirketi",
  shortName: "Luden Eğitim Danışmanlık Org. Tic. Ltd. Şti.",
  mersis: "0609120901300001",
  sicil: "237834",
  address: "Aydınlıkevler Mah. 6782/5 Sk. No:15 Çiğli / İzmir",
  email: "destek@ludenlab.com",
  phone: "0530 886 67 82",
  platform: "ludenlab.com",
  updated: "09.06.2026",
} as const;

/* ÖDEME TEK DOMAIN — ludenlab.com altındaki iki ürün; bu metinler hepsini kapsar. */
export const PRODUCTS = [
  {
    name: "LudenLab Stüdyo",
    host: "ludenlab.com/studio",
    audience: "dil ve konuşma terapistleri, odyologlar",
    desc: "dil, konuşma, ses, akıcılık ve işitme alanlarında yapay zeka destekli terapi materyali ve seans planı üretimi",
  },
  {
    name: "LudenLab Atölye",
    host: "ludenlab.com/atolye",
    audience: "özel eğitim öğretmenleri, ÖÖG ve DEHB uzmanları",
    desc: "özgül öğrenme güçlüğü (ÖÖG) ve DEHB alanında yapay zeka destekli BEP, eğitim materyali ve seans planlama",
  },
] as const;

const DOT = { color: "var(--poster-accent)", marginRight: 10, flexShrink: 0, fontWeight: 700 } as const;
const PANEL = {
  border: "var(--poster-border)",
  borderRadius: 14,
  background: "var(--poster-bg-2)",
  padding: "14px 18px",
} as const;

export function Mail() {
  return (
    <a href={`mailto:${COMPANY.email}`} style={{ color: "var(--poster-accent)", fontWeight: 600 }}>
      {COMPANY.email}
    </a>
  );
}

export function LegalTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div style={{ marginBottom: 34 }}>
      <span className="p-eyebrow">{eyebrow}</span>
      <h1 className="p-h1" style={{ fontSize: "clamp(1.55rem, 3.4vw, 2.1rem)", margin: "10px 0 18px" }}>
        {title}
      </h1>
      <div style={{ ...PANEL, fontSize: "0.85rem", lineHeight: 1.75, color: "var(--poster-ink-2)" }}>
        <div>
          <strong style={{ color: "var(--poster-ink)" }}>Platform:</strong> {COMPANY.platform}
        </div>
        <div>
          <strong style={{ color: "var(--poster-ink)" }}>Kapsam:</strong> LudenLab Stüdyo ve LudenLab Atölye
        </div>
        <div>
          <strong style={{ color: "var(--poster-ink)" }}>İşletme:</strong> {COMPANY.shortName}
        </div>
        <div>
          <strong style={{ color: "var(--poster-ink)" }}>E-posta:</strong> <Mail />
        </div>
        <div>
          <strong style={{ color: "var(--poster-ink)" }}>Son güncelleme:</strong> {COMPANY.updated}
        </div>
      </div>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 30 }}>
      <h2
        className="p-h3"
        style={{ fontSize: "1.12rem", margin: "0 0 14px", paddingBottom: 8, borderBottom: "2px solid var(--poster-ink-faint)" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

export function SubSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h3 className="p-h4" style={{ fontSize: "0.98rem", margin: "0 0 10px" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p className="p-body" style={{ color: "var(--poster-ink-2)", margin: "0 0 12px", lineHeight: 1.7 }}>
      {children}
    </p>
  );
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul style={{ listStyle: "none", margin: "0 0 12px", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((it, i) => (
        <li
          key={i}
          style={{ display: "flex", alignItems: "flex-start", color: "var(--poster-ink-2)", lineHeight: 1.65, fontSize: "0.94rem" }}
        >
          <span aria-hidden style={DOT}>
            ●
          </span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

export function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div style={{ ...PANEL, display: "flex", flexDirection: "column", gap: 8, fontSize: "0.9rem", color: "var(--poster-ink-2)", lineHeight: 1.6 }}>
      {children}
    </div>
  );
}

export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start" }}>
      <span aria-hidden style={DOT}>
        ●
      </span>
      <span>
        <strong style={{ color: "var(--poster-ink)", fontWeight: 700 }}>{label}:</strong> {children}
      </span>
    </div>
  );
}

/* İki ürünü tek bakışta gösteren kart şeridi — giriş bölümlerinde kullanılır. */
export function ProductGrid() {
  return (
    <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", margin: "4px 0 12px" }}>
      {PRODUCTS.map((p) => (
        <div key={p.host} style={{ ...PANEL, padding: "13px 16px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.98rem", color: "var(--poster-ink)" }}>
            {p.name}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--poster-accent)", margin: "2px 0 7px" }}>
            {p.host}
          </div>
          <div style={{ fontSize: "0.82rem", lineHeight: 1.5, color: "var(--poster-ink-2)" }}>{p.desc}.</div>
        </div>
      ))}
    </div>
  );
}
