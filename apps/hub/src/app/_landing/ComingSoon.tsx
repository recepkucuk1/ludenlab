/* ============================================================
   LudenLab Hub — "Pek yakında" (lansman öncesi landing).
   Tam landing FullLanding.tsx'te park ediliyor; launch'ta
   page.tsx tekrar <FullLanding /> render edecek.
   Poster tasarım dili: krem zemin · 2px ink kenar · katı ofset
   gölge · bloblar + squiggle · tek turuncu CTA · Bricolage display.
   ============================================================ */
import { Logo } from "@ludenlab/ui";

const INK = "#0E1E26";
const BLOB =
  "M421,303Q394,366,338,408Q282,450,212,430Q142,410,116,341Q90,272,124,206Q158,140,225,113Q292,86,357,123Q422,160,438,230Q454,300,421,303Z";

export function ComingSoon() {
  return (
    <main className="cs-root">
      {/* dekoratif zemin */}
      <svg className="cs-blob cs-blob--y" viewBox="0 0 600 600" aria-hidden="true">
        <path fill="#FFCE52" opacity="0.55" d={BLOB} />
      </svg>
      <svg className="cs-blob cs-blob--b" viewBox="0 0 600 600" aria-hidden="true">
        <path fill="#4A90E2" opacity="0.38" d={BLOB} />
      </svg>
      <svg className="cs-squiggle" viewBox="0 0 400 30" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M0,15 Q25,2 50,15 T100,15 T150,15 T200,15 T250,15 T300,15 T350,15 T400,15"
          fill="none"
          stroke={INK}
          strokeWidth="2.5"
          opacity="0.16"
        />
      </svg>

      <section className="cs-card">
        <div className="cs-card-rule" />

        <div className="cs-logo">
          <Logo variant="lockup" height={50} />
        </div>

        <span className="cs-pill">
          <span className="cs-pill-dot" /> Lansmana hazırlanıyoruz
        </span>

        <h1 className="cs-h1">
          Pek <span className="cs-mark">yakında.</span>
        </h1>

        <p className="cs-sub">
          Özel eğitimde yapay zekâ destekli öğrenme yönetimi. Studio ve Atölye — neredeyse hazır.
        </p>

        <div className="cs-mods">
          <span className="cs-mod">
            <span className="cs-mod-dot" style={{ background: "#4A90E2" }} /> Studio
          </span>
          <span className="cs-mod">
            <span className="cs-mod-dot" style={{ background: "#FE703A" }} /> Atölye
          </span>
        </div>

        <div className="cs-cta">
          <a
            className="cs-btn"
            href="mailto:info@ludenlab.com?subject=LudenLab%20lansman%20haberi&body=Lansman%20duyurusunu%20almak%20istiyorum."
          >
            Haberdar ol
          </a>
          <span className="cs-contact">
            Sorularınız için <a href="mailto:info@ludenlab.com">info@ludenlab.com</a>
          </span>
        </div>
      </section>

      <footer className="cs-foot">
        <span>© 2026 LudenLab · Made in Türkiye</span>
        <span className="cs-foot-sep">·</span>
        <a href="/kvkk">KVKK</a>
        <a href="/gizlilik">Gizlilik</a>
        <a href="/kosullar">Kullanım koşulları</a>
      </footer>
    </main>
  );
}
