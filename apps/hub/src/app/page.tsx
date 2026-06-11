"use client";

/* ============================================================
   LudenLab Hub — Yön B (tam sayfa landing)
   Poster kartları · responsive · hover/focus/tap accordion
   Claude Design handoff'undan port edildi (SSR-safe).
   ============================================================ */
import { useEffect, useState, type CSSProperties } from "react";
import { PRODUCTS, HubIcon, Wordmark, StatusPill, Mock, INK, type Product } from "./_landing/shared";

/* media-query hook — yalnız etkileşim guard'ları için; layout tamamen CSS'te (SSR/CLS güvenli) */
function useMQ(q: string) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(q);
    setM(mq.matches);
    const fn = (e: MediaQueryListEvent) => setM(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [q]);
  return m;
}

/* ---------- Üst bar ---------- */
function TopBar() {
  return (
    <header className="yb-bar">
      <Wordmark height={26} />
      <nav className="yb-nav">
        {PRODUCTS.map((p) => (
          <a key={p.id} href={p.href} target="_blank" rel="noopener" className="yb-navlink">{p.name}</a>
        ))}
      </nav>
      <span className="yb-pill">
        <span className="yb-dot" /> Tek hesap · üç ürün
      </span>
    </header>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section className="yb-hero">
      <svg className="yb-blob" viewBox="0 0 600 600" aria-hidden="true">
        <path fill="#FFCE52" opacity="0.5" d="M421,303Q394,366,338,408Q282,450,212,430Q142,410,116,341Q90,272,124,206Q158,140,225,113Q292,86,357,123Q422,160,438,230Q454,300,421,303Z" />
      </svg>
      <svg className="yb-squiggle" viewBox="0 0 400 30" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,15 Q25,2 50,15 T100,15 T150,15 T200,15 T250,15 T300,15 T350,15 T400,15" fill="none" stroke={INK} strokeWidth="2.5" opacity="0.18" />
      </svg>
      <div className="yb-hero-in">
        <div className="yb-eyebrow">ÖZEL EĞİTİM YAZILIMLARI</div>
        <h1 className="yb-h1">Özel eğitimin her aşaması için <span className="yb-mark">tek çatı.</span></h1>
        <p className="yb-sub">
          Terapiden eğitime, planlamadan takibe — yapay zekâ destekli araçlar. Tek hesap, üç güçlü ürün.
        </p>
        <div className="yb-chips">
          {["KVKK uyumlu", "MEB çerçevesi", "Çıktılar: taslak — uzman onayı"].map((c) => (
            <span key={c} className="yb-chip">{c}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Ürün kartı ---------- */
interface CardProps {
  p: Product;
  active: boolean;
  dim: boolean;
  tilt: number;
  onEnter: () => void;
  onLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onClick: () => void;
}

function Card({ p, active, dim, tilt, onEnter, onLeave, onFocus, onBlur, onClick }: CardProps) {
  const Icon = HubIcon[p.mock];
  return (
    <div
      className={"yb-card" + (active ? " is-active" : "") + (dim ? " is-dim" : "")}
      style={{ "--clr": p.color, "--tilt": `${tilt}deg` } as CSSProperties}
      onMouseEnter={onEnter} onMouseLeave={onLeave}
      onFocus={onFocus} onBlur={onBlur} onClick={onClick}
      role="link" tabIndex={0}
      aria-label={`${p.full} — ${p.host} sitesine git`}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
    >
      <svg className="yb-card-blob" viewBox="0 0 300 300" aria-hidden="true">
        <path fill={p.color} d="M243,168Q230,216,188,243Q146,270,99,250Q52,230,40,180Q28,130,58,92Q88,54,138,48Q188,42,222,80Q256,118,243,168Z" />
      </svg>
      <div className="yb-card-rule" />

      <div className="yb-card-in">
        <div className="yb-card-top">
          <span className="yb-icontile">{Icon({ c: "#fff", size: 28 })}</span>
          <span className="yb-num">{p.num} / 03</span>
        </div>

        <div className="yb-status"><StatusPill p={p} /></div>
        <h3 className="yb-card-name">{p.full}</h3>
        <p className="yb-card-tag">{p.tagline}</p>
        <div className="yb-swap">
          <p className="yb-card-val">{p.value}</p>
          <div className="yb-reveal">
            <div className="yb-reveal-in">
              <div className="yb-feat-wrap">
                <div className="yb-feats">
                  {p.features.map((f, k) => (
                    <div key={k} className="yb-feat">
                      <span className="yb-check">{HubIcon.check({ c: "#fff", size: 12 })}</span>{f}
                    </div>
                  ))}
                </div>
                <div className="yb-who-lbl">KİMLER İÇİN</div>
                <div className="yb-who">{p.who}</div>
              </div>
              <div className="yb-mock"><Mock kind={p.mock} w={240} /></div>
            </div>
          </div>
        </div>
        <div className="yb-card-foot">
          <span className="yb-host">{p.host}</span>
          <a className="yb-open" href={p.href} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>
            Aç {HubIcon.arrow({ c: "#fff", size: 19 })}
          </a>
        </div>
      </div>
    </div>
  );
}

/* ---------- Sayfa ---------- */
export default function HomePage() {
  const narrow = useMQ("(max-width: 980px)");
  const [active, setActive] = useState<number | null>(null); // desktop hover/focus
  const tilts = [-2.2, 1.6, -1.4];

  const go = (p: Product) => window.open(p.href, "_blank", "noopener");

  // Mobil/dar: tüm kartlar CSS ile her zaman açık (JS'siz de doğru render), tek dokunuş = siteye git.
  // Desktop: hover/focus ile accordion (is-active class'ı, görsel durum globals.css'te).
  return (
    <div className="yb-root">
      <TopBar />
      <Hero />
      <main className="yb-cards">
        {PRODUCTS.map((p, i) => (
          <Card key={p.id} p={p} tilt={tilts[i]}
            active={!narrow && active === i}
            dim={!narrow && active !== null && active !== i}
            onEnter={() => { if (!narrow) setActive(i); }}
            onLeave={() => { if (!narrow) setActive(null); }}
            onFocus={() => { if (!narrow) setActive(i); }}
            onBlur={() => { if (!narrow) setActive(null); }}
            onClick={() => go(p)}
          />
        ))}
      </main>
      <footer className="yb-foot">
        <span className="yb-foot-copy">© 2026 LudenLab · Made in Türkiye</span>
        <nav className="yb-foot-legal">
          <a href="/kvkk">KVKK</a>
          <a href="/gizlilik">Gizlilik</a>
          <a href="/kosullar">Kullanım koşulları</a>
        </nav>
        <a href="mailto:info@ludenlab.com" className="yb-foot-mail">info@ludenlab.com</a>
      </footer>
    </div>
  );
}
