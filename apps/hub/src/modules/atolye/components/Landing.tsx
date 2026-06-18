"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Sparkles } from "lucide-react";
import { PLAN_KEYS, PLAN_CONFIG, formatKurus } from "@atolye/lib/plans";
import { IyzicoBadge } from "@/components/IyzicoBadge";

/* LudenLab Atölye — pazarlama landing'i (Claude Design "poster_refresh" Yön A).
   Tasarım yapısı korundu; içerik atölye'nin ÖÖB/DEHB ürünüyle eşlendi. */

function Brand({ color = "var(--poster-deep-teal)" }: { color?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
      <svg width={30} height={30} viewBox="0 0 32 32" fill="none" stroke="var(--poster-accent)" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
        <ellipse cx="16" cy="16" rx="13" ry="6" transform="rotate(34 16 16)" />
        <ellipse cx="16" cy="16" rx="13" ry="6" transform="rotate(-34 16 16)" />
      </svg>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 21, color, letterSpacing: "-0.02em" }}>
        LudenLab Atölye
      </span>
    </span>
  );
}

function Blob({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 600 600" style={style} aria-hidden>
      <path
        fill="var(--poster-yellow)"
        opacity={0.42}
        d="M437,304Q406,371,344,414Q282,457,210,433Q138,409,110,338Q82,267,121,201Q160,135,231,111Q302,87,366,127Q430,167,442,233Q454,300,437,304Z"
      />
    </svg>
  );
}

const tileStyle: React.CSSProperties = {
  width: 50,
  height: 50,
  borderRadius: 14,
  background: "var(--poster-bg)",
  border: "2px solid var(--poster-ink)",
  boxShadow: "0 2px 0 var(--poster-ink)",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  fontSize: 24,
};

const TOOLS = [
  { e: "📝", t: "BEP & Rapor Asistanı", d: "Alan bazında ölçülebilir BEP hedef taslağı." },
  { e: "🗓️", t: "Seans Planı Üreteci", d: "Isınma → ana etkinlik → kapanış akışlı plan." },
  { e: "🧩", t: "Çok Duyulu Materyal", d: "Güçlük profiline göre çalışma yaprağı." },
  { e: "🎯", t: "DEHB Davranış Destek Planı", d: "ABC analizi + olumlu pekiştirme planı." },
  { e: "📖", t: "Okuma-Akıcılık Seti", d: "Disleksi için seviyeli okuma + hece çalışması." },
  { e: "🔢", t: "Matematik Destek Seti", d: "Diskalkuli için somut → soyut (CRA) ilerleme." },
  { e: "💬", t: "Sosyal Öykü Üreteci", d: "Duygu-düzenleme odaklı kısa, somut öykü." },
  { e: "🛠️", t: "Bireysel Uyarlama Önericisi", d: "Gerekçeli sınıf-içi uyarlama listesi." },
  { e: "💌", t: "Veli/Ev Destek Mektubu", d: "Aileye sıcak, somut ev önerileri." },
  { e: "📈", t: "İlerleme İzleme Çizelgesi", d: "Hedefi doldurulabilir veri çizelgesine böler." },
];

const STEPS = [
  { c: "var(--poster-green)", t: "Öğrenciyi tanımlayın", d: "Ad, kademe, güçlük profili ve hedefi bir kez girin." },
  { c: "var(--poster-accent)", t: "Aracı seçip üretin", d: "AI dakikalar içinde MEB uyumlu bir taslak hazırlar." },
  { c: "var(--poster-plum)", t: "Atayın ve takip edin", d: "Öğrenciye atayın, PDF indirin, ilerlemeyi görün." },
];

const FAQ: [string, string][] = [
  ["Verilerim güvende mi?", "Öğrenci kayıtlarınız ayrı ve izole bir veritabanında, yalnız sizin hesabınıza görünür biçimde, şifreli bağlantı üzerinden tutulur."],
  ["Ücretsiz sürümde neler var?", "100 kredi ile başlarsınız; süre sınırı yok, kart gerekmez. Her araç üretimi yaklaşık 10 kredidir."],
  ["MEB programıyla uyumlu mu?", "Evet. Çıktılar MEB destek eğitim çerçevesindeki hedeflerle hizalıdır — her biri uzman onayı gerektiren bir taslaktır."],
  ["Araç tanı koyar mı?", "Hayır. Araçlar tanı koymaz; eğitsel taslaklar üretir. Tanı çocuk-ergen psikiyatristine, eğitsel değerlendirme RAM'a aittir."],
];

export function Landing() {
  const [open, setOpen] = useState(0);

  return (
    <>
      {/* Header */}
      <header className="p-appbar">
        <div className="p-appbar__inner" style={{ maxWidth: 1200 }}>
          <Brand />
          <nav className="p-appbar__nav" style={{ marginLeft: 18 }}>
            <a href="#araclar">Araçlar</a>
            <a href="#nasil">Nasıl çalışır</a>
            <a href="#fiyatlar">Fiyatlar</a>
            <a href="#sss">SSS</a>
          </nav>
          <div style={{ flex: 1 }} />
          <Link className="p-btn p-btn--ghost p-btn--sm" href="/giris">Giriş</Link>
          <Link className="p-btn p-btn--accent p-btn--sm" href="/kayit?module=atolye">
            Ücretsiz başla <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section style={{ position: "relative", padding: "64px 24px 88px", overflow: "hidden" }}>
        <Blob style={{ position: "absolute", top: 30, left: -130, width: 520, height: 520, zIndex: 0 }} />
        <div className="lp-hero" style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto" }}>
          <div>
            <span className="p-eyebrow">ÖÖB · DEHB · ÖĞRENME GÜÇLÜĞÜ</span>
            <h1 className="p-h1" style={{ margin: "16px 0 18px" }}>
              Uzmanlar için{" "}
              <span style={{ background: "linear-gradient(180deg, transparent 62%, var(--poster-yellow) 62%)", padding: "0 2px" }}>
                AI destekli
              </span>{" "}
              öğrenme araçları.
            </h1>
            <p className="p-lead" style={{ maxWidth: 520, marginBottom: 28 }}>
              BEP hedeflerini, çalışma materyallerini ve seans planlarını öğrencinize özel, dakikalar
              içinde üretin; uyarlayıp kaydedin. MEB destek eğitim çerçevesine hizalı.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link className="p-btn p-btn--accent p-btn--lg" href="/kayit?module=atolye">
                Ücretsiz başla <ArrowRight size={18} aria-hidden />
              </Link>
              <a className="p-btn p-btn--white p-btn--lg" href="#nasil">Nasıl çalışır?</a>
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 26, fontSize: 13, fontWeight: 700, color: "var(--fg2)", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <Sparkles size={15} aria-hidden style={{ color: "var(--poster-accent)" }} /> Süre sınırı yok
              </span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>100 ücretsiz kredi</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>Kart vermeden</span>
            </div>
          </div>

          {/* Card stack */}
          <div className="lp-stack" style={{ position: "relative", height: 440, width: "100%" }}>
            <div className="p-card" style={{ position: "absolute", top: 0, left: 4, width: 248, transform: "rotate(-6deg)", boxShadow: "var(--shadow-lg)", padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span className="p-badge p-badge--green">Okuma</span>
                <span className="p-mono">3–4. sınıf</span>
              </div>
              <div className="p-h4" style={{ fontSize: 17, lineHeight: 1.2 }}>Hece Birleştirme Seti</div>
              <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
                <span style={tileStyle}>📖</span>
                <div className="p-small" style={{ fontWeight: 600 }}>8 etkinlik · b–d ayrımı · çok duyulu</div>
              </div>
            </div>

            <div className="p-card" style={{ position: "absolute", top: 48, right: 0, width: 250, transform: "rotate(5deg)", boxShadow: "var(--shadow-lg)", padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span className="p-badge p-badge--accent">BEP</span>
                <span className="p-mono">İlkokul</span>
              </div>
              <div className="p-h4" style={{ fontSize: 17, lineHeight: 1.2 }}>Okuma Akıcılığı Hedefi</div>
              <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--poster-bg)", border: "2px dashed var(--poster-ink-faint)", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                “Dakikada 60 doğru sözcüğe %80 doğrulukla ulaşır.”
              </div>
            </div>

            <div className="p-card p-card--ink" style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%) rotate(-2deg)", width: 300, padding: 18 }}>
              <span className="p-eyebrow" style={{ color: "var(--poster-accent)" }}>
                <Sparkles size={14} aria-hidden /> AI önerisi
              </span>
              <p className="p-body" style={{ marginTop: 8, color: "rgba(255,246,233,0.85)", fontSize: 13.5 }}>
                Ali geçen seansta hece birleştirmede zorlandı — bugün b–d ayrımına odaklı bir okuma
                seti hazırlayalım mı?
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="p-btn p-btn--accent p-btn--sm">Hazırla</button>
                <button className="p-btn p-btn--ghost p-btn--sm" style={{ color: "#FFF6E9" }}>Sonra</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tool grid */}
      <section id="araclar" style={{ background: "var(--poster-bg-2)", borderTop: "var(--poster-border)", borderBottom: "var(--poster-border)", padding: "64px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
            <div>
              <span className="p-eyebrow">10 ARAÇ · TEK YERDEN</span>
              <h2 className="p-h2" style={{ marginTop: 8, maxWidth: 560 }}>Her hedef için bir araç.</h2>
            </div>
            <Link className="p-btn p-btn--white p-btn--md" href="/kayit?module=atolye">
              Tümünü kullan <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
          <div className="lp-grid">
            {TOOLS.map((t) => (
              <div key={t.t} className="p-card p-card--hover p-reveal-on-scroll" style={{ padding: 18 }}>
                <span style={tileStyle}>{t.e}</span>
                <div className="p-h4" style={{ fontSize: 16, marginTop: 14 }}>{t.t}</div>
                <p className="p-small" style={{ marginTop: 4 }}>{t.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="nasil" style={{ padding: "72px 24px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <span className="p-eyebrow">NASIL ÇALIŞIR</span>
          <h2 className="p-h2" style={{ margin: "8px 0 36px", maxWidth: 620 }}>Üç adımda uzman pratiği.</h2>
          <div className="lp-3">
            {STEPS.map((s, i) => (
              <div key={i} className="p-card p-reveal-on-scroll" style={{ padding: 24 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: s.c, color: "#fff", border: "2px solid var(--poster-ink)", boxShadow: "0 2px 0 var(--poster-ink)", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22 }}>
                  {i + 1}
                </div>
                <div className="p-mono" style={{ margin: "16px 0 8px" }}>0{i + 1} / 03</div>
                <div className="p-h4" style={{ fontSize: 18, marginBottom: 6 }}>{s.t}</div>
                <p className="p-body">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="fiyatlar" style={{ background: "var(--poster-bg-2)", borderTop: "var(--poster-border)", padding: "72px 24px" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span className="p-eyebrow">PLANLAR · FİYATLAR</span>
            <h2 className="p-h2" style={{ margin: "8px 0 10px" }}>Sana uygun bir plan.</h2>
            <p className="p-lead" style={{ maxWidth: 540, margin: "0 auto" }}>
              100 ücretsiz kredi ile başla, kart vermeden. İhtiyacın büyüdükçe yükselt — istediğin
              zaman iptal et.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 18,
              gridTemplateColumns: "repeat(auto-fit, minmax(232px, 1fr))",
              alignItems: "stretch",
            }}
          >
            {PLAN_KEYS.map((k) => {
              const p = PLAN_CONFIG[k];
              const popular = k === "PRO";
              const price =
                k === "FREE" ? "Ücretsiz" : k === "ENTERPRISE" ? "Özel fiyat" : formatKurus(p.monthlyKurus);
              const icon = k === "FREE" ? "🌱" : k === "PRO" ? "⚡" : k === "ADVANCED" ? "🚀" : "🏢";
              return (
                <div
                  key={k}
                  className="p-card p-reveal-on-scroll"
                  style={{
                    padding: 22,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    position: "relative",
                    border: popular ? "2px solid var(--poster-accent)" : undefined,
                    boxShadow: popular ? "var(--shadow-lg)" : undefined,
                  }}
                >
                  {popular && (
                    <span className="p-badge p-badge--accent" style={{ position: "absolute", top: 16, right: 16 }}>
                      Popüler
                    </span>
                  )}
                  <span style={tileStyle}>{icon}</span>
                  <div className="p-h4" style={{ fontSize: 18 }}>{p.label}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, color: "var(--poster-ink)" }}>
                      {price}
                    </span>
                    {p.monthlyKurus > 0 && <span className="p-small" style={{ fontWeight: 600 }}>/ay</span>}
                  </div>
                  <ul style={{ listStyle: "none", margin: "2px 0 4px", padding: 0, display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
                    {p.features.map((f) => (
                      <li key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13.5, fontWeight: 600, color: "var(--poster-ink-2)" }}>
                        <Check size={16} aria-hidden style={{ color: "var(--poster-green)", flexShrink: 0, marginTop: 2 }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {k === "ENTERPRISE" ? (
                    <a
                      className="p-btn p-btn--white p-btn--md"
                      href="mailto:destek@ludenlab.com?subject=Kurumsal%20Plan%20Talebi"
                      style={{ width: "100%" }}
                    >
                      İletişime Geçin
                    </a>
                  ) : (
                    <Link
                      className={`p-btn ${popular ? "p-btn--accent" : "p-btn--white"} p-btn--md`}
                      href="/kayit?module=atolye"
                      style={{ width: "100%" }}
                    >
                      {k === "FREE" ? "Ücretsiz başla" : "Hemen başla"}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          <p className="p-small" style={{ textAlign: "center", marginTop: 22, color: "var(--poster-ink-3)" }}>
            Her araç üretimi yaklaşık 10 kredi. Tüm planlarda tüm araçlar açıktır.
          </p>
          <IyzicoBadge style={{ marginTop: 24 }} />
        </div>
      </section>

      {/* FAQ */}
      <section id="sss" style={{ background: "var(--poster-bg-2)", borderTop: "var(--poster-border)", padding: "72px 24px" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <span className="p-eyebrow">SSS</span>
          <h2 className="p-h2" style={{ margin: "8px 0 30px" }}>Sıkça sorulan sorular.</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {FAQ.map(([q, a], i) => (
              <div key={i} className="p-card p-reveal-on-scroll" style={{ padding: 0, boxShadow: open === i ? "var(--shadow-lg)" : "var(--shadow-md)" }}>
                <button
                  onClick={() => setOpen(open === i ? -1 : i)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", border: 0, background: "transparent", fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--poster-ink)", cursor: "pointer", textAlign: "left" }}
                >
                  {q}
                  <ChevronDown size={20} aria-hidden style={{ transform: open === i ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />
                </button>
                {open === i && <p className="p-body" style={{ padding: "0 20px 18px" }}>{a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "#0E1B20", color: "#FFF6E9", padding: "48px 24px 30px" }}>
        <div className="lp-foot" style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div>
            <Brand color="#FFF6E9" />
            <p className="p-body" style={{ color: "rgba(255,255,255,0.7)", marginTop: 12, maxWidth: 300 }}>
              Özgül öğrenme güçlüğü (ÖÖB) ve DEHB uzmanları için AI destekli BEP, materyal ve seans
              araçları.
            </p>
          </div>
          {([
            ["Ürün", [["Araçlar"], ["Abonelik"], ["Sürüm notları"]]],
            ["Şirket", [["Hakkımızda"], ["İletişim"]]],
            ["Yasal", [["Gizlilik", "/gizlilik"], ["Koşullar", "/kosullar"], ["KVKK", "/kvkk"]]],
          ] as [string, [string, string?][]][]).map(([t, ls]) => (
            <div key={t}>
              <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--poster-accent)", fontWeight: 800, marginBottom: 14 }}>{t}</div>
              {ls.map(([l, href]) =>
                href ? (
                  <Link key={l} href={href} style={{ display: "block", fontSize: 14, opacity: 0.85, marginBottom: 8, fontWeight: 500, color: "inherit", textDecoration: "none" }}>{l}</Link>
                ) : (
                  <div key={l} style={{ fontSize: 14, opacity: 0.85, marginBottom: 8, fontWeight: 500 }}>{l}</div>
                ),
              )}
            </div>
          ))}
        </div>
        <IyzicoBadge onDark style={{ marginTop: 24 }} />
        <div style={{ maxWidth: 1200, margin: "32px auto 0", paddingTop: 20, borderTop: "2px solid rgba(255,255,255,0.14)", fontSize: 12, opacity: 0.6 }}>
          © {new Date().getFullYear()} LudenLab · Made in Türkiye · Çıktılar uzman onayı gerektiren taslaklardır.
        </div>
      </footer>
    </>
  );
}
