"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "./lib/cn";
import { ThemeToggle } from "./theme";

export interface NavItem {
  label: string;
  href: string;
  icon?: ReactNode;
}

export interface AppSidebarProps {
  brand: ReactNode;
  items: NavItem[];
  /** Üst kullanıcı bağlamı (avatar/ad/plan) — Studio TitleSection eşdeğeri. */
  userHeader?: ReactNode;
  /** Alt kısım: kullanıcı bilgisi / çıkış vb. */
  footer?: ReactNode;
  children: ReactNode;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

/** Studio tarzı sol sidebar kabuğu: sticky nav + mobil overlay + tema. */
export function AppSidebar({ brand, items, userHeader, footer, children }: AppSidebarProps) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  return (
    <div className="p-shell">
      {/* Mobil üst bar */}
      <div className="p-shell__mobilebar">
        <button
          type="button"
          className="p-btn p-btn--ghost p-btn--sm"
          aria-label="Menüyü aç"
          onClick={() => setOpen(true)}
        >
          <Menu size={20} aria-hidden />
        </button>
        <div style={{ flex: 1 }}>{brand}</div>
        <ThemeToggle />
      </div>

      {open && <div className="p-shell__backdrop" onClick={() => setOpen(false)} aria-hidden />}

      <aside className={cn("p-sidebar", open && "p-sidebar--open")}>
        <div className="p-sidebar__head">
          <div className="p-sidebar__brand">{brand}</div>
          <button
            type="button"
            className="p-btn p-btn--ghost p-btn--sm p-sidebar__close"
            aria-label="Menüyü kapat"
            onClick={() => setOpen(false)}
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {userHeader && (
          <div
            style={{
              padding: "0.5rem 0.25rem 0.75rem",
              marginBottom: "0.5rem",
              borderBottom: "var(--poster-border)",
            }}
          >
            {userHeader}
          </div>
        )}

        <nav className="p-sidebar__nav">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(pathname, it.href) ? "page" : undefined}
              className={cn("p-navitem", isActive(pathname, it.href) && "p-navitem--active")}
            >
              {it.icon}
              <span>{it.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-sidebar__footer">
          <div className="p-sidebar__theme">
            <span style={{ fontSize: "0.85rem", color: "var(--poster-ink-3)" }}>Tema</span>
            <ThemeToggle />
          </div>
          {footer}
        </div>
      </aside>

      <main className="p-shell__main" id="main-content">
        {children}
      </main>
    </div>
  );
}
