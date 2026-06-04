"use client";

import { useState } from "react";
import { PButton } from "@ludenlab/ui";
import { SubscriptionCheckoutModal } from "@/components/subscription/CheckoutModal";

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
