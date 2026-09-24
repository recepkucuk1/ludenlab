import Link from "next/link";
import { PaymentBadge } from "@/components/PaymentBadge";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ödeme Hatası — LudenLab",
  robots: { index: false, follow: false },
};


export const dynamic = "force-dynamic";

// /odeme/sonuc ödeme hatalarında buraya yönlendirir (?reason=...). Bilinen kodlar → TR mesaj.
const REASONS: Record<string, string> = {
  missing_token: "Ödeme bilgisi alınamadı. Lütfen tekrar deneyin.",
  payment_failed: "Ödeme tamamlanamadı. Kartınız veya bankanız işlemi onaylamadı.",
  user_not_found: "Hesap bulunamadı. Lütfen giriş yapıp tekrar deneyin.",
  plan_not_found: "Seçilen plan bulunamadı. Modül sayfasından tekrar seçin.",
  duplicate_subscription:
    "Bu modülde zaten aktif bir aboneliğiniz vardı; ikinci ödemenin yenilemesi iptal edildi ve mevcut aboneliğiniz aynen sürüyor. Bu ödemenin iadesi için info@ludenlab.com adresine yazın.",
  invalid_token: "Ödeme bilgisi geçersiz. Lütfen tekrar deneyin.",
  rate_limited: "Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar deneyin.",
  payment_pending:
    "Ödemeniz henüz onaylanmadı. Onaylandığında aboneliğiniz otomatik olarak etkinleşir; birkaç dakika sonra abonelik sayfanızı kontrol edin. Tekrar ödeme yapmayın.",
  internal_error: "Ödeme sonucu işlenirken bir sorun oluştu. Tutar tahsil edildiyse aboneliğiniz en geç 24 saat içinde otomatik olarak etkinleşir.",
};

export default async function OdemeHata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const reasonRaw = typeof sp.reason === "string" ? sp.reason : undefined;
  // Yalnız BİLİNEN kodlar gösterilir: bilinmeyen `reason` sayfaya basılmaz — serbest metin
  // taşıyan bir link ödeme sayfamızda istenen yazıyı gösterebiliyordu (2026-09 denetimi #25).
  const message = (reasonRaw && REASONS[reasonRaw]) || "Ödeme sırasında bir hata oluştu.";
  const pending = reasonRaw === "payment_pending";

  return (
    <div style={{ maxWidth: 480, margin: "clamp(2rem,8vh,5rem) auto", padding: "0 1rem", textAlign: "center" }}>
      <span className="p-eyebrow" style={{ color: pending ? "var(--poster-ink-3)" : "var(--poster-danger)" }}>
        {pending ? "ÖDEME ONAY BEKLİYOR" : "ÖDEME BAŞARISIZ"}
      </span>
      <h1 className="p-h3" style={{ margin: "8px 0 6px" }}>
        {pending ? "Ödemeniz işleniyor" : "Ödeme tamamlanamadı"}
      </h1>
      <p className="p-body" style={{ color: "var(--poster-ink-3)", marginBottom: 8 }}>{message}</p>
      <p className="p-body" style={{ color: "var(--poster-ink-3)", marginBottom: 24 }}>
        {pending ? "" : "Tutar tahsil edilmediyse tekrar deneyebilirsin. "}Sorun sürerse{" "}
        <a href="mailto:info@ludenlab.com" className="p-link">info@ludenlab.com</a>.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/hesap/abonelik" className="p-btn p-btn--accent">Aboneliğe dön</Link>
        <Link href="/hesap" className="p-btn p-btn--ghost">Hesabım</Link>
      </div>
      <PaymentBadge style={{ marginTop: 28 }} />
    </div>
  );
}
