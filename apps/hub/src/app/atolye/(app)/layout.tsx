import { redirect } from "next/navigation";
import Link from "next/link";
import { BookMarked, CalendarDays, CreditCard, GraduationCap, LayoutDashboard, Shield, User, Wrench } from "lucide-react";
import { AppSidebar, type NavItem } from "@ludenlab/ui";
import { auth } from "@atolye/auth";
import { isAdmin } from "@atolye/lib/admin";
import { LogoutButton } from "@/components/LogoutButton";
import { reconcileCentralEntitlement } from "@atolye/lib/central-billing";

// Tüm (app) rotaları auth() (cookies) kullanır → statik prerender DENENMESİN.
// (Yoksa next-auth prerender'da "workUnitAsyncStorage" invariant'ı fırlatır.)
export const dynamic = "force-dynamic";

const NAV: NavItem[] = [
  { label: "Panel", href: "/atolye/dashboard", icon: <LayoutDashboard size={18} aria-hidden /> },
  { label: "Araçlar", href: "/atolye/araclar", icon: <Wrench size={18} aria-hidden /> },
  { label: "Öğrencilerim", href: "/atolye/vakalarim", icon: <GraduationCap size={18} aria-hidden /> },
  { label: "Kütüphane", href: "/atolye/kutuphane", icon: <BookMarked size={18} aria-hidden /> },
  { label: "Takvim", href: "/atolye/takvim", icon: <CalendarDays size={18} aria-hidden /> },
  { label: "Abonelik", href: "/atolye/abonelik", icon: <CreditCard size={18} aria-hidden /> },
  { label: "Profil", href: "/atolye/profil", icon: <User size={18} aria-hidden /> },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/giris");

  // Modül-tarafı merkezi billing reconcile (flag'liyken; best-effort, render'ı bozmaz).
  // Apex'te ödenen ATOLYE aboneliğini bu hesabın planType+kredisine yansıtır.
  await reconcileCentralEntitlement(session.user.id);

  const items: NavItem[] = isAdmin(session.user.role)
    ? [...NAV, { label: "Admin", href: "/atolye/admin", icon: <Shield size={18} aria-hidden /> }]
    : NAV;

  const displayName = session.user.name?.trim() || session.user.email?.split("@")[0] || "Kullanıcı";
  const initials =
    displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "K";

  return (
    <AppSidebar
      brand={
        <Link
          href="/atolye/dashboard"
          style={{ textDecoration: "none", color: "inherit", display: "inline-flex", gap: "0.4rem" }}
        >
          <span aria-hidden>🧩</span> Atölye
        </Link>
      }
      items={items}
      userHeader={
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0 0.25rem" }}>
          <span
            aria-hidden
            style={{
              width: 38,
              height: 38,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: "var(--poster-accent)",
              color: "var(--accent-on)",
              fontWeight: 800,
              fontSize: "0.85rem",
              border: "var(--poster-border)",
              boxShadow: "var(--poster-shadow-sm)",
            }}
          >
            {initials}
          </span>
          <span style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontWeight: 700,
                fontSize: "0.9rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--poster-ink-3)" }}>
              Atölye · {isAdmin(session.user.role) ? "Yönetici" : "Üye"}
            </span>
          </span>
        </div>
      }
      footer={
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <span
            style={{
              fontSize: "0.78rem",
              color: "var(--poster-ink-3)",
              padding: "0 0.25rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={session.user.email ?? undefined}
          >
            {session.user.email}
          </span>
          <LogoutButton />
        </div>
      }
    >
      {children}
    </AppSidebar>
  );
}
