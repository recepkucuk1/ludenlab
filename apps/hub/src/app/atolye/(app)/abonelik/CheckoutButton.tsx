"use client";

import { PButton } from "@ludenlab/ui";

// Merkezi apex billing kalıcı: "Yükselt" her zaman apex /odeme checkout'una gider.
const APEX_BASE = process.env.NEXT_PUBLIC_APEX_URL || undefined;

export function CheckoutButton({
  plan,
  isCurrent,
  cycle = "monthly",
}: {
  plan: string;
  isCurrent: boolean;
  cycle?: "monthly" | "yearly";
}) {
  if (isCurrent) {
    return <span className="p-small" style={{ marginTop: "auto" }}>Aktif plan</span>;
  }

  if (plan === "FREE") {
    return (
      <PButton size="sm" variant="ghost" disabled style={{ marginTop: "auto" }}>
        Mevcut Değil
      </PButton>
    );
  }

  // ENTERPRISE: özel fiyat — self-servis checkout yok, satışla iletişim.
  if (plan === "ENTERPRISE") {
    return (
      <a
        href="mailto:destek@ludenlab.com?subject=Kurumsal%20Plan%20Talebi"
        style={{ marginTop: "auto", textDecoration: "none" }}
      >
        <PButton size="sm" variant="ghost" style={{ width: "100%" }}>
          İletişime Geçin
        </PButton>
      </a>
    );
  }

  // PRO / ADVANCED → merkezi apex checkout (modül-tarafı ödeme yüzeyi kaldırıldı).
  const base = (APEX_BASE || "https://ludenlab.com").replace(/\/$/, "");
  const q = new URLSearchParams({
    module: "ATOLYE",
    code: plan, // "PRO" | "ADVANCED" — merkezi BillingPlan.code ile aynı
    interval: cycle === "yearly" ? "YEARLY" : "MONTHLY",
  });
  const url = `${base}/odeme?${q.toString()}`;
  return (
    <a href={url} style={{ marginTop: "auto", textDecoration: "none" }}>
      <PButton size="sm" variant="accent" style={{ width: "100%" }}>
        Yükselt
      </PButton>
    </a>
  );
}
