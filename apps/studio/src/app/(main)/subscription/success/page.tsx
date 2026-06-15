import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { PBtn, PCard } from "@/components/poster";

export default function SubscriptionSuccessPage() {
  return (
    <div
      className="poster-scope"
      style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        textAlign: "center",
      }}
    >
      <PCard rounded={20} style={{ maxWidth: 440, width: "100%", padding: 40, background: "var(--poster-panel)" }}>
        <div
          style={{
            width: 72,
            height: 72,
            margin: "0 auto 20px",
            borderRadius: 18,
            background: "var(--poster-green)",
            border: "2px solid var(--poster-ink)",
            boxShadow: "0 4px 0 var(--poster-ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CheckCircle2 style={{ width: 36, height: 36, color: "#fff" }} />
        </div>

        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: "var(--poster-ink)",
            margin: "0 0 10px",
            fontFamily: "var(--font-display)",
            letterSpacing: "-.02em",
          }}
        >
          Tebrikler!
        </h1>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.55,
            color: "var(--poster-ink-2)",
            margin: "0 0 28px",
            fontFamily: "var(--font-display)",
          }}
        >
          Aboneliğiniz başarıyla aktif edildi. Yeni planınızın tüm özelliklerine anında erişebilirsiniz. Kredileriniz hesabınıza yüklendi.
        </p>

        <Link href="/dashboard" style={{ display: "block", textDecoration: "none" }}>
          <PBtn as="a" href="/dashboard" variant="accent" size="md" style={{ width: "100%" }}>
            Panele Dön
          </PBtn>
        </Link>
      </PCard>
    </div>
  );
}
