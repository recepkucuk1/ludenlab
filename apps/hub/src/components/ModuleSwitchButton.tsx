"use client";

import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";

/**
 * İki modüle de üye olan kullanıcıların dashboard'dan diğer modüle geçmesi için
 * paylaşılan poster-stili buton. Studio sidebar (collapsed destekli) ve Atölye footer
 * (her zaman açık) ortak kullanır. Görünürlük çağıran tarafta entitlement ile gate'lenir
 * — bu bileşen yalnızca sunumdan sorumludur.
 *
 * Hedef modül kök rotası (`/studio` | `/atolye`); oturum geçerliyse ilgili dashboard'a
 * yönlendirir, modül hesabı yoksa o modülün landing'ini gösterir (savunmacı).
 */
export function ModuleSwitchButton({
  href,
  label,
  collapsed = false,
}: {
  href: string;
  label: string;
  collapsed?: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        height: 44,
        borderRadius: 10,
        border: "2px solid var(--poster-ink)",
        background: "var(--poster-bg-2)",
        color: "var(--poster-ink)",
        textDecoration: "none",
        fontFamily: "inherit",
        fontSize: 13,
        fontWeight: 800,
        boxShadow: "2px 2px 0 var(--poster-ink)",
        transition: "transform 0.1s, box-shadow 0.1s, background 0.1s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--poster-accent)";
        e.currentTarget.style.transform = "translate(-1px, -1px)";
        e.currentTarget.style.boxShadow = "3px 3px 0 var(--poster-ink)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--poster-bg-2)";
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "2px 2px 0 var(--poster-ink)";
      }}
    >
      <div
        style={{
          display: "grid",
          width: collapsed ? 44 : 48,
          height: "100%",
          placeContent: "center",
          flexShrink: 0,
        }}
      >
        <ArrowLeftRight style={{ width: 16, height: 16 }} />
      </div>
      {!collapsed && <span style={{ paddingRight: 12, whiteSpace: "nowrap" }}>{label}</span>}
    </Link>
  );
}
