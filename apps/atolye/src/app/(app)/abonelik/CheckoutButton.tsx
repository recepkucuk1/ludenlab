"use client";

import { useState } from "react";
import { PButton } from "@ludenlab/ui";
import { SubscriptionCheckoutModal } from "@/components/subscription/CheckoutModal";

// Merkezi (apex) billing flag: AÇIK → "abone ol" apex /odeme'ye gider (P6); KAPALI → atolye'nin kendi modalı.
const CENTRAL = process.env.NEXT_PUBLIC_CENTRAL_BILLING === "true";
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
  const [open, setOpen] = useState(false);

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

  // P6: merkezi billing açıkken apex checkout'a yönlen (atolye'de iyzico yüzeyi kalmaz).
  if (CENTRAL) {
    // URL'i inline kur — @ludenlab/billing index'i client bundle'a iyzipay(fs) çeker; saf URL yeterli.
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

  return (
    <>
      <PButton
        size="sm"
        variant="accent"
        style={{ marginTop: "auto" }}
        onClick={() => setOpen(true)}
      >
        Yükselt
      </PButton>
      <SubscriptionCheckoutModal
        open={open}
        onClose={() => setOpen(false)}
        planType={plan}
        cycle={cycle}
      />
    </>
  );
}
