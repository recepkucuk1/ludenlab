import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, User, CreditCard } from "lucide-react";
import { AppSidebar, Logo, type NavItem } from "@ludenlab/ui";
import { auth } from "@/auth";
import { LogoutButton } from "@/components/LogoutButton";

// auth() (cookie okuma) → prerender invariant'ını önle.
export const dynamic = "force-dynamic";

const NAV: NavItem[] = [
  { label: "Genel Bakış", href: "/hesap", exact: true, icon: <LayoutDashboard size={18} aria-hidden /> },
  { label: "Profil", href: "/hesap/profil", icon: <User size={18} aria-hidden /> },
  { label: "Abonelik", href: "/hesap/abonelik", icon: <CreditCard size={18} aria-hidden /> },
];

/** Hesap merkezi kabuğu (A2): sol menü + alt-sayfalar. Auth gate burada. */
export default async function HesapLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris?callbackUrl=/hesap");

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
          href="/hesap"
          style={{ textDecoration: "none", color: "inherit", display: "inline-flex", gap: "0.4rem", alignItems: "center" }}
        >
          <Logo variant="mark" height={22} /> Hesabım
        </Link>
      }
      items={NAV}
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
            <span style={{ fontWeight: 700, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {displayName}
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--poster-ink-3)" }}>LudenLab hesabı</span>
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
