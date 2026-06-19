import Link from "next/link";
import { PaymentBadge } from "@/components/PaymentBadge";

export const dynamic = "force-dynamic";

// /odeme/sonuc ödeme hatalarında buraya yönlendirir (?reason=...). Bilinen kodlar → TR mesaj.
const REASONS: Record<string, string> = {
  missing_token: "Ödeme bilgisi alınamadı. Lütfen tekrar deneyin.",
  payment_failed: "Ödeme tamamlanamadı. Kartınız veya bankanız işlemi onaylamadı.",
  user_not_found: "Hesap bulunamadı. Lütfen giriş yapıp tekrar deneyin.",
  plan_not_found: "Seçilen plan bulunamadı. Modül sayfasından tekrar seçin.",
};

export default async function OdemeHata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const reasonRaw = typeof sp.reason === "string" ? sp.reason : undefined;
  const message = (reasonRaw && REASONS[reasonRaw]) || "Ödeme sırasında bir hata oluştu.";
  const showRaw = reasonRaw && !REASONS[reasonRaw];

  return (
    <div style={{ maxWidth: 480, margin: "clamp(2rem,8vh,5rem) auto", padding: "0 1rem", textAlign: "center" }}>
      <span className="p-eyebrow" style={{ color: "var(--poster-danger)" }}>ÖDEME BAŞARISIZ</span>
      <h1 className="p-h3" style={{ margin: "8px 0 6px" }}>Ödeme tamamlanamadı</h1>
      <p className="p-body" style={{ color: "var(--poster-ink-3)", marginBottom: 8 }}>{message}</p>
      {showRaw && (
        <p style={{ fontSize: "0.78rem", color: "var(--poster-ink-4)", marginBottom: 8 }}>
          ({reasonRaw})
        </p>
      )}
      <p className="p-body" style={{ color: "var(--poster-ink-3)", marginBottom: 24 }}>
        Tutar tahsil edilmediyse tekrar deneyebilirsin. Sorun sürerse{" "}
        <a href="mailto:destek@ludenlab.com" className="p-link">destek@ludenlab.com</a>.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/hesap/abonelik" className="p-btn p-btn--accent">Aboneliğe dön</Link>
        <Link href="/hesap" className="p-btn p-btn--ghost">Hesabım</Link>
      </div>
      <PaymentBadge style={{ marginTop: 28 }} />
    </div>
  );
}
