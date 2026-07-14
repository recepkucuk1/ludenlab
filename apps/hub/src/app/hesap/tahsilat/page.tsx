import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const KIND_TR: Record<string, string> = { INITIAL: "İlk ödeme", RENEWAL: "Yenileme" };

/**
 * Admin tahsilat listesi — fatura kesme kaynağı. Her başarılı Paynkolay tahsilatı
 * (ilk ödeme + cron yenilemesi) Payment tablosuna düşer; burada müşteri fatura
 * profiliyle birlikte listelenir. CSV: ./csv (aynı gate).
 */
export default async function TahsilatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris?callbackUrl=/hesap/tahsilat");
  if (session.user.role !== "admin") redirect("/hesap");

  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      account: { select: { email: true, name: true, billingProfile: true } },
      billingPlan: { select: { name: true } },
    },
  });

  const td: React.CSSProperties = { padding: "0.5rem 0.6rem", whiteSpace: "nowrap" };

  return (
    <div style={{ padding: "clamp(1.2rem,4vh,2.5rem) clamp(1rem,4vw,2.5rem)", maxWidth: 1100 }}>
      <span className="p-eyebrow">ADMİN</span>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", margin: "6px 0 4px" }}>
        <h1 className="p-h3" style={{ margin: 0, fontSize: "1.7rem" }}>Tahsilatlar</h1>
        <a
          href="/hesap/tahsilat/csv"
          className="p-btn p-btn--accent p-btn--sm"
          style={{ textDecoration: "none" }}
        >
          CSV indir
        </a>
      </div>
      <p className="p-body" style={{ color: "var(--poster-ink-3)", marginBottom: 20 }}>
        Fatura kesilecek başarılı tahsilatlar (son 200). CSV tümünü içerir.
      </p>

      {payments.length === 0 ? (
        <p className="p-body" style={{ color: "var(--poster-ink-3)" }}>Henüz tahsilat kaydı yok.</p>
      ) : (
        <div style={{ overflowX: "auto", border: "var(--poster-border)", borderRadius: "var(--poster-radius)", background: "var(--poster-panel)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--poster-ink-3)" }}>
                {["Tarih", "Müşteri", "Fatura kimliği", "Plan", "Tutar", "Tür", "Paynkolay ref"].map((h) => (
                  <th key={h} style={{ ...td, fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const bp = p.account.billingProfile;
                const kimlik = bp
                  ? bp.type === "CORPORATE"
                    ? `${bp.companyName ?? "—"} · VKN ${bp.taxNumber ?? "—"} · ${bp.taxOffice ?? "—"}`
                    : `Bireysel${bp.tckn ? ` · TCKN ${bp.tckn}` : ""} · ${bp.city}`
                  : "⚠ profil yok";
                return (
                  <tr key={p.id} style={{ borderTop: "2px solid var(--poster-ink-faint, #e5e0d5)" }}>
                    <td style={{ ...td, color: "var(--poster-ink-3)" }}>
                      {p.createdAt.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td style={td}>
                      <span style={{ fontWeight: 600 }}>{p.account.name ?? "—"}</span>
                      <span style={{ color: "var(--poster-ink-3)" }}> · {p.account.email}</span>
                    </td>
                    <td style={{ ...td, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis" }} title={kimlik}>
                      {kimlik}
                    </td>
                    <td style={td}>{p.billingPlan?.name ?? p.module}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{Number(p.amount).toLocaleString("tr-TR")} ₺</td>
                    <td style={td}>{KIND_TR[p.kind] ?? p.kind}</td>
                    <td style={{ ...td, fontFamily: "monospace", fontSize: "0.78rem" }}>{p.paynkolayRefCode ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
