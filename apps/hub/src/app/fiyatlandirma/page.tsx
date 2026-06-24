import Link from "next/link";
import { Logo } from "@ludenlab/ui";
import { AbonelikGrid, type ModuleAbonelik } from "@/app/hesap/abonelik/AbonelikGrid";

export const metadata = {
  title: "Fiyatlandırma — LudenLab",
  description: "Stüdyo ve Atölye planları. Tek hesapla başla, istediğin modüle abone ol.",
};

// Public sayfa — giriş gerekmez. Hesaptaki /hesap/abonelik ile aynı Pricing kartları,
// abonelik durumu yok (active:false → aktif-abonelik banner'ı çıkmaz, tüm planlar seçilebilir).
const MODULES: ModuleAbonelik[] = [
  { key: "STUDIO", name: "Stüdyo", accent: "var(--poster-deep-teal)", active: false, periodEnd: null },
  { key: "ATOLYE", name: "Atölye", accent: "var(--poster-accent)", active: false, periodEnd: null },
];

export default function FiyatlandirmaPage() {
  return (
    <div className="poster-scope" style={{ minHeight: "100vh", background: "var(--poster-bg)" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "14px clamp(16px,5vw,40px)",
          borderBottom: "var(--poster-border)",
        }}
      >
        <Link href="/" aria-label="Ana sayfa" style={{ display: "inline-flex" }}>
          <Logo height={30} />
        </Link>
        <nav style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/giris" className="p-btn p-btn--ghost p-btn--sm">Giriş</Link>
          <Link href="/kayit" className="p-btn p-btn--accent p-btn--sm">Kayıt ol</Link>
        </nav>
      </header>

      <div style={{ textAlign: "center", maxWidth: 680, margin: "0 auto", padding: "clamp(2rem,6vh,3.5rem) 1.5rem 0" }}>
        <span className="p-eyebrow">FİYATLANDIRMA</span>
        <h1 className="p-h3" style={{ margin: "8px 0 10px", fontSize: "clamp(1.8rem,5vw,2.4rem)" }}>
          İhtiyacına uygun planı seç
        </h1>
        <p className="p-body" style={{ color: "var(--poster-ink-3)" }}>
          Stüdyo ve Atölye için planlar — tek hesapla başla, istediğin modüle abone ol, istediğin zaman değiştir.
          Ücretsiz başlamak için kayıt yeterli.
        </p>
      </div>

      <AbonelikGrid modules={MODULES} />

      <footer style={{ textAlign: "center", padding: "1rem 1rem 3rem", color: "var(--poster-ink-3)", fontSize: "0.85rem" }}>
        <Link href="/" className="p-link">← Ana sayfa</Link>
      </footer>
    </div>
  );
}
