"use client";

import React, { useEffect } from "react";
import { Logo } from "@ludenlab/ui";

/**
 * Merkezi (apex) auth kabuğu — Studio'nun split-screen poster tasarımının
 * modül-FARKINDA, generic versiyonu. Tek/birleşik /giris + /kayit bunu kullanır.
 * Sol panel ?module'e göre temalanır (studio teal · atolye turuncu · generic LudenLab);
 * mobilde gizli. Sağ = form (children, maks 420px). @studio bağımlılığı YOK.
 */
export type AuthModule = "studio" | "atolye" | "generic";

type Stat = { label: string; value: string; note?: string; green?: boolean };
type Theme = {
  accent: string;
  eyebrow: string;
  panelBg: string;
  tagline: string;
  sub: string;
  stats: [Stat, Stat];
  footnote: string;
};

const THEME: Record<AuthModule, Theme> = {
  studio: {
    accent: "var(--poster-deep-teal)",
    eyebrow: "Studio · DKT",
    panelBg: "var(--poster-bg-2)",
    tagline: "Dil, konuşma ve işitme uzmanları için akıllı platform",
    sub: "Öğrenci takibi, müfredat planlama ve kişiselleştirilmiş öğrenme kartları — hepsi tek yerde.",
    stats: [
      { label: "Bugün", value: "3 öğrenci seansı", note: "· 42 kart tamamlandı" },
      { label: "Gelişim", value: "+18%", note: "bu hafta", green: true },
    ],
    footnote: "Dil, konuşma ve işitme uzmanları için.",
  },
  atolye: {
    accent: "var(--poster-accent)",
    eyebrow: "Atölye · ÖÖG & DEHB",
    panelBg: "var(--poster-bg-2)",
    tagline: "Özgül öğrenme güçlüğü ve DEHB için araç atölyesi",
    sub: "Vaka yönetimi, BEP, materyal üretimi ve seans planlama — hepsi tek yerde.",
    stats: [
      { label: "Bu hafta", value: "12 aktif vaka", note: "· 8 materyal" },
      { label: "Üretim", value: "240+", note: "kart & doküman", green: true },
    ],
    footnote: "Özgül öğrenme güçlüğü ve DEHB uzmanları için.",
  },
  generic: {
    accent: "var(--poster-accent)",
    eyebrow: "LudenLab",
    panelBg: "var(--poster-bg-2)",
    tagline: "Uzmanlar için akıllı platform",
    sub: "Studio (dil-konuşma-işitme) ve Atölye (ÖÖG & DEHB) — tek hesapla, tek yerde.",
    stats: [
      { label: "Studio", value: "DKT araçları", note: "· AI kart üretimi" },
      { label: "Atölye", value: "ÖÖG & DEHB", note: "· vaka & materyal", green: true },
    ],
    footnote: "Terapi ve özel eğitim uzmanları için.",
  },
};

function StatCard({ stat, rotate }: { stat: Stat; rotate: number }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        maxWidth: 220,
        borderRadius: 18,
        background: stat.green ? "var(--poster-green)" : "#fff",
        color: stat.green ? "#fff" : "var(--poster-ink)",
        border: "2px solid var(--poster-ink)",
        boxShadow: "0 5px 0 var(--poster-ink)",
        transform: `rotate(${rotate}deg)`,
        fontFamily: "var(--font-display)",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", opacity: stat.green ? 0.9 : 1, color: stat.green ? "#fff" : "var(--poster-accent)" }}>
        {stat.label}
      </div>
      <div style={{ marginTop: 6, fontSize: stat.green ? 20 : 15, fontWeight: stat.green ? 800 : 600 }}>{stat.value}</div>
      {stat.note && <div style={{ marginTop: 2, fontSize: 12, opacity: stat.green ? 0.9 : 1, color: stat.green ? "#fff" : "var(--poster-ink-2)" }}>{stat.note}</div>}
    </div>
  );
}

export function AuthShell({ module = "generic", children }: { module?: AuthModule; children: React.ReactNode }) {
  const t = THEME[module] ?? THEME.generic;

  // Auth poster tasarımı her zaman LIGHT (Studio ForceLightTheme deseni): mount'ta
  // <html>'den `.dark`'ı sıyır + geri eklenmesini engelle, unmount'ta eski haline döndür.
  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains("dark");
    const strip = () => html.classList.remove("dark");
    strip();
    const obs = new MutationObserver(strip);
    obs.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => {
      obs.disconnect();
      if (hadDark) html.classList.add("dark");
    };
  }, []);

  return (
    <div className="poster-scope" style={{ minHeight: "100vh", background: "var(--poster-bg)" }}>
      <style>{`
        .auth-grid { display: grid; grid-template-columns: 1fr; min-height: 100vh; }
        .auth-left { display: none; }
        .auth-mobile-logo { display: flex; }
        @media (min-width: 1024px) {
          .auth-grid { grid-template-columns: 1fr 1fr; }
          .auth-left { display: flex; }
          .auth-mobile-logo { display: none; }
        }
      `}</style>

      <div className="auth-grid">
        {/* SOL: poster panel — mobilde gizli */}
        <aside
          className="auth-left"
          style={{
            position: "relative",
            overflow: "hidden",
            padding: 48,
            background: t.panelBg,
            borderRight: "2px solid var(--poster-ink)",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* dekoratif bloblar */}
          <div style={{ position: "absolute", top: -120, right: -100, width: 360, height: 360, borderRadius: "50%", background: "var(--poster-yellow)", opacity: 0.5, filter: "blur(8px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -140, left: -80, width: 320, height: 320, borderRadius: "50%", background: t.accent, opacity: 0.18, filter: "blur(12px)", pointerEvents: "none" }} />

          {/* üst: logo + eyebrow */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <Logo variant="mark" height={48} />
            <div
              style={{
                marginTop: 18,
                display: "inline-block",
                padding: "5px 12px",
                borderRadius: 999,
                background: t.accent,
                border: "2px solid var(--poster-ink)",
                boxShadow: "0 3px 0 var(--poster-ink)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: "#fff",
                fontFamily: "var(--font-display)",
              }}
            >
              {t.eyebrow}
            </div>
          </div>

          {/* orta: başlık + stat kartları */}
          <div style={{ position: "relative", zIndex: 1, maxWidth: 480 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(30px, 4vw, 42px)", letterSpacing: "-.02em", lineHeight: 1.1, color: "var(--poster-ink)", margin: 0 }}>
              {t.tagline}
            </h2>
            <p style={{ marginTop: 14, fontSize: 16, lineHeight: 1.55, color: "var(--poster-ink-2)", fontFamily: "var(--font-display)" }}>{t.sub}</p>
            <div style={{ marginTop: 36, display: "flex", gap: 16 }}>
              <StatCard stat={t.stats[0]} rotate={-4} />
              <StatCard stat={t.stats[1]} rotate={3} />
            </div>
          </div>

          {/* alt: footnote */}
          <div style={{ position: "relative", zIndex: 1, fontSize: 12, color: "var(--poster-ink-3)", fontFamily: "var(--font-display)" }}>
            © {new Date().getFullYear()} LudenLab · {t.footnote}
          </div>
        </aside>

        {/* SAĞ: form */}
        <main style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(24px, 6vw, 48px) clamp(16px, 5vw, 24px)", background: "var(--poster-bg)" }}>
          <div style={{ width: "100%", maxWidth: 420 }}>{children}</div>
        </main>
      </div>
    </div>
  );
}

/* ----------------- poster form primitive'leri (generic) ----------------- */

type AuthInputProps = React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(function AuthInput(
  { style, invalid, onFocus, onBlur, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      {...rest}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 0 var(--poster-accent)";
        e.currentTarget.style.borderColor = "var(--poster-ink)";
        onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = "0 3px 0 var(--poster-ink)";
        e.currentTarget.style.borderColor = invalid ? "#c53030" : "var(--poster-ink)";
        onBlur?.(e);
      }}
      style={{
        width: "100%",
        height: 46,
        padding: "0 14px",
        background: "#fff",
        border: `2px solid ${invalid ? "#c53030" : "var(--poster-ink)"}`,
        borderRadius: 12,
        boxShadow: "0 3px 0 var(--poster-ink)",
        fontFamily: "var(--font-display)",
        fontSize: 15,
        color: "var(--poster-ink)",
        outline: "none",
        transition: "box-shadow .15s, border-color .15s",
        ...style,
      }}
    />
  );
});

export function AuthLabel({
  htmlFor,
  children,
  rightSlot,
  optional,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
      <label htmlFor={htmlFor} style={{ fontSize: 13, fontWeight: 700, color: "var(--poster-ink)", fontFamily: "var(--font-display)" }}>
        {children}
        {optional && <span style={{ fontWeight: 500, color: "var(--poster-ink-3)", marginLeft: 6 }}>(opsiyonel)</span>}
      </label>
      {rightSlot}
    </div>
  );
}

type AlertTone = "error" | "success" | "warning";

export function AuthAlert({ tone, children }: { tone: AlertTone; children: React.ReactNode }) {
  const palette: Record<AlertTone, { bg: string; border: string; text: string }> = {
    error: { bg: "#ffe9e9", border: "#c53030", text: "#7a1414" },
    success: { bg: "#e4f8ec", border: "var(--poster-green)", text: "#0f4f28" },
    warning: { bg: "#fff3d1", border: "#b7791f", text: "#5a3d05" },
  };
  const p = palette[tone];
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: 12,
        background: p.bg,
        border: `2px solid ${p.border}`,
        boxShadow: `0 3px 0 ${p.border}`,
        fontSize: 13,
        lineHeight: 1.5,
        color: p.text,
        fontFamily: "var(--font-display)",
      }}
    >
      {children}
    </div>
  );
}

/** Basit şifre gücü göstergesi (uzunluk + çeşitlilik). @studio/Tailwind bağımlılığı yok. */
export function PasswordMeter({ password }: { password: string }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;
  const level = Math.min(score, 4);
  const meta = [
    { label: "Çok zayıf", color: "#c53030" },
    { label: "Zayıf", color: "#c53030" },
    { label: "Orta", color: "#b7791f" },
    { label: "İyi", color: "var(--poster-green)" },
    { label: "Güçlü", color: "var(--poster-green)" },
  ][level];
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ flex: 1, height: 5, borderRadius: 999, background: i < level ? meta.color : "var(--poster-ink-faint, #e5e0d5)" }} />
        ))}
      </div>
      <div style={{ marginTop: 4, fontSize: 11, color: meta.color, fontWeight: 600, fontFamily: "var(--font-display)" }}>{meta.label}</div>
    </div>
  );
}
