import { redirect } from "next/navigation";
import Link from "next/link";
import { BookMarked, CalendarDays, CreditCard, GraduationCap, LayoutDashboard, Shield, Wrench } from "lucide-react";
import { AppSidebar, type NavItem } from "@ludenlab/ui";
import { auth } from "@atolye/auth";
import { isAdmin } from "@atolye/lib/admin";
import { LogoutButton } from "@atolye/components/LogoutButton";
import { reconcileCentralEntitlement } from "@atolye/lib/central-billing";

// Tüm (app) rotaları auth() (cookies) kullanır → statik prerender DENENMESİN.
// (Yoksa next-auth prerender'da "workUnitAsyncStorage" invariant'ı fırlatır.)
export const dynamic = "force-dynamic";

const NAV: NavItem[] = [
  { label: "Panel", href: "/dashboard", icon: <LayoutDashboard size={18} aria-hidden /> },
  { label: "Araçlar", href: "/araclar", icon: <Wrench size={18} aria-hidden /> },
  { label: "Öğrencilerim", href: "/vakalarim", icon: <GraduationCap size={18} aria-hidden /> },
  { label: "Kütüphane", href: "/kutuphane", icon: <BookMarked size={18} aria-hidden /> },
  { label: "Takvim", href: "/takvim", icon: <CalendarDays size={18} aria-hidden /> },
  { label: "Abonelik", href: "/abonelik", icon: <CreditCard size={18} aria-hidden /> },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/giris");

  // Modül-tarafı merkezi billing reconcile (flag'liyken; best-effort, render'ı bozmaz).
  // Apex'te ödenen ATOLYE aboneliğini bu hesabın planType+kredisine yansıtır.
  await reconcileCentralEntitlement(session.user.id);

  const items: NavItem[] = isAdmin(session.user.role)
    ? [...NAV, { label: "Admin", href: "/admin", icon: <Shield size={18} aria-hidden /> }]
    : NAV;

  return (
    <AppSidebar
      brand={
        <Link
          href="/dashboard"
          style={{ textDecoration: "none", color: "inherit", display: "inline-flex", gap: "0.4rem" }}
        >
          <span aria-hidden>🧩</span> Atölye
        </Link>
      }
      items={items}
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
