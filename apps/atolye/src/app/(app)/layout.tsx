import { redirect } from "next/navigation";
import Link from "next/link";
import { FolderHeart, LayoutDashboard, Wrench } from "lucide-react";
import { AppSidebar, type NavItem } from "@ludenlab/ui";
import { auth } from "@/auth";
import { LogoutButton } from "@/components/LogoutButton";

const NAV: NavItem[] = [
  { label: "Panel", href: "/dashboard", icon: <LayoutDashboard size={18} aria-hidden /> },
  { label: "Araçlar", href: "/araclar", icon: <Wrench size={18} aria-hidden /> },
  { label: "Vakalarım", href: "/vakalarim", icon: <FolderHeart size={18} aria-hidden /> },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/giris");

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
      items={NAV}
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
