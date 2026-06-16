"use client";

import { PBtn } from "@studio/components/poster";

const NAV_ITEMS: Array<{ href: string; label: string }> = [
  { href: "/studio/admin/users",    label: "Kullanıcılar" },
  { href: "/studio/admin/revenue",  label: "Gelir" },
  { href: "/studio/admin/usage",    label: "AI Kullanım" },
  { href: "/studio/admin/webhooks", label: "Webhook'lar" },
  { href: "/studio/admin/audit",    label: "Audit" },
  { href: "/studio/admin/health",   label: "Sağlık" },
];

/**
 * Tüm admin sayfalarının üst-sağ navigasyonu. `current` ile aktif sayfa
 * vurgulanır (accent variant) — diğerleri "white" olarak link gibi durur.
 * Sayfada özgü ekstra butonlar (Yenile, vb.) AdminNav'ın etrafında render edilir.
 */
export function AdminNav({ current }: { current: string }) {
  return (
    <>
      {NAV_ITEMS.map((item) => (
        <PBtn
          key={item.href}
          as="a"
          href={item.href}
          variant={item.href === current ? "accent" : "white"}
          size="md"
          aria-current={item.href === current ? "page" : undefined}
        >
          {item.label}
        </PBtn>
      ))}
    </>
  );
}
