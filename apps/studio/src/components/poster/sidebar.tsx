"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Home,
  Users,
  CalendarDays,
  Layers,
  Wand2,
  ChevronsRight,
  Settings,
  LogOut,
  Menu,
  X,
  CreditCard,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Sidebar = () => {
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [planLabel, setPlanLabel] = useState<string>("");

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/profile")
        .then((res) => res.json())
        .then((data) => {
          if (data.therapist?.avatarUrl) {
            setAvatarUrl(data.therapist.avatarUrl);
          }
          const pt: string | undefined = data.therapist?.planType;
          if (pt) {
            const label =
              pt === "FREE" ? "Ücretsiz"
              : pt === "PRO" ? "Pro Plan"
              : pt === "ADVANCED" ? "Advanced Plan"
              : pt === "ENTERPRISE" ? "Enterprise"
              : pt;
            setPlanLabel(label);
          }
        })
        .catch(console.error);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navItems = [
    { icon: Home,         title: "Dashboard",  href: "/dashboard"    },
    { icon: Wand2,        title: "Araçlar",    href: "/tools"        },
    { icon: Users,        title: "Öğrenciler", href: "/students"     },
    { icon: Layers,       title: "Kütüphane",  href: "/cards"        },
    { icon: CalendarDays, title: "Takvim",     href: "/calendar"     },
    { icon: CreditCard,   title: "Abonelik",   href: "/subscription" },
  ];

  const adminItems = [
    { icon: Settings, title: "Admin Panel", href: "/admin/users" },
  ];

  // open: 80vw cap on narrow phones (≤320px), 256px elsewhere; collapsed: 72
  const width = open ? "clamp(220px, 80vw, 256px)" : 72;

  return (
    <>
      {/* Mobile header */}
      <div
        className="md:hidden flex"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: "var(--poster-panel)",
          borderBottom: "2px solid var(--poster-ink)",
          fontFamily: "var(--font-display)",
        }}
      >
        <Logo size="small" />
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={mobileOpen}
          aria-controls="sidebar-nav"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: "2px solid var(--poster-ink)",
            background: "var(--poster-panel)",
            color: "var(--poster-ink)",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            boxShadow: "2px 2px 0 var(--poster-ink)",
          }}
        >
          {mobileOpen ? <X style={{ width: 18, height: 18 }} /> : <Menu style={{ width: 18, height: 18 }} />}
        </button>
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(14, 30, 38, 0.55)",
            zIndex: 40,
          }}
          className="md:hidden"
        />
      )}

      {/* Sidebar */}
      <nav
        id="sidebar-nav"
        aria-label="Ana navigasyon"
        className={`poster-scope fixed md:sticky top-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        style={{
          height: "100dvh",
          maxHeight: "100dvh",
          overflowY: "auto",
          flexShrink: 0,
          width,
          background: "var(--poster-panel)",
          borderRight: "2px solid var(--poster-ink)",
          padding: 10,
          fontFamily: "var(--font-display)",
          transition: "width 300ms, transform 300ms",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <TitleSection open={open} userName={session?.user?.name || "Kullanıcı"} userImage={avatarUrl || session?.user?.image} planLabel={planLabel} />

        <div
          className="no-scrollbar"
          style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, overflowY: "auto", paddingBottom: 12 }}
        >
          {navItems.map((item) => (
            <Option
              key={item.href}
              Icon={item.icon}
              title={item.title}
              href={item.href}
              currentPath={pathname}
              open={open}
            />
          ))}

          {session?.user?.role === "admin" &&
            adminItems.map((item) => (
              <Option
                key={item.href}
                Icon={item.icon}
                title={item.title}
                href={item.href}
                currentPath={pathname}
                open={open}
              />
            ))}
        </div>

        <div
          style={{
            borderTop: "2px solid var(--poster-ink)",
            paddingTop: 10,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {open ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "2px 8px 4px" }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: "var(--poster-ink-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>
                Tema
              </span>
              <ThemeToggle variant="segmented" className="w-full justify-between" />
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "center", padding: "2px 0" }}>
              <ThemeToggle variant="compact" />
            </div>
          )}
          <Option
            Icon={Settings}
            title="Profil"
            href="/profile"
            currentPath={pathname}
            open={open}
          />
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              height: 44,
              borderRadius: 10,
              border: "2px solid transparent",
              background: "transparent",
              color: "var(--poster-ink-2)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 700,
              transition: "all 0.1s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--poster-bg-2)";
              e.currentTarget.style.color = "var(--poster-ink)";
              e.currentTarget.style.borderColor = "var(--poster-ink)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--poster-ink-2)";
              e.currentTarget.style.borderColor = "transparent";
            }}
            title="Çıkış Yap"
          >
            <div style={{ display: "grid", width: 48, height: "100%", placeContent: "center" }}>
              <LogOut style={{ width: 16, height: 16 }} />
            </div>
            {open && <span>Çıkış Yap</span>}
          </button>
          <ToggleClose open={open} setOpen={setOpen} />
        </div>
      </nav>
    </>
  );
};

interface OptionProps {
  Icon: React.ElementType;
  title: string;
  href: string;
  currentPath: string;
  open: boolean;
}

const Option = ({ Icon, title, href, currentPath, open }: OptionProps) => {
  const isSelected = currentPath === href || currentPath.startsWith(href + "/");

  return (
    <Link
      href={href}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        height: 44,
        width: "100%",
        borderRadius: 10,
        border: isSelected ? "2px solid var(--poster-ink)" : "2px solid transparent",
        background: isSelected ? "var(--poster-accent)" : "transparent",
        color: isSelected ? "var(--poster-ink)" : "var(--poster-ink-2)",
        textDecoration: "none",
        fontWeight: isSelected ? 800 : 700,
        fontSize: 13,
        boxShadow: isSelected ? "3px 3px 0 var(--poster-ink)" : "none",
        transition: "all 0.1s",
      }}
    >
      <div style={{ display: "grid", width: 48, height: "100%", placeContent: "center" }}>
        <Icon style={{ width: 16, height: 16 }} />
      </div>
      {open && <span>{title}</span>}
    </Link>
  );
};

const TitleSection = ({ open, userName, userImage, planLabel }: { open: boolean; userName: string; userImage?: string | null; planLabel?: string }) => {
  return (
    <div style={{ marginBottom: 14, borderBottom: "2px solid var(--poster-ink)", paddingBottom: 12 }}>
      <Link
        href="/dashboard"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: 6,
          borderRadius: 10,
          textDecoration: "none",
        }}
      >
        {userImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={userImage}
            alt={userName}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              objectFit: "cover",
              border: "2px solid var(--poster-ink)",
              background: "var(--poster-panel)",
              flexShrink: 0,
            }}
          />
        ) : (
          <Logo />
        )}
        {open && (
          <div style={{ minWidth: 0, flex: 1 }}>
            <span
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 800,
                color: "var(--poster-ink)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {userName}
            </span>
            <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--poster-ink-3)" }}>
              {planLabel || "—"}
            </span>
          </div>
        )}
      </Link>
    </div>
  );
};

const Logo = ({ size = "normal" }: { size?: "small" | "normal" }) => {
  const dim = size === "small" ? 32 : 40;
  return (
    <div
      style={{
        display: "grid",
        placeContent: "center",
        width: dim,
        height: dim,
        borderRadius: 10,
        border: "2px solid var(--poster-ink)",
        background: "var(--poster-accent)",
        flexShrink: 0,
      }}
    >
      <svg
        width={size === "small" ? 16 : 20}
        height={size === "small" ? 12 : 16}
        viewBox="0 0 50 39"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ fill: "var(--poster-ink)" }}
      >
        <path d="M16.4992 2H37.5808L22.0816 24.9729H1L16.4992 2Z" />
        <path d="M17.4224 27.102L11.4192 36H33.5008L49 13.0271H32.7024L23.2064 27.102H17.4224Z" />
      </svg>
    </div>
  );
};

const ToggleClose = ({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) => {
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className="hidden md:flex"
      style={{
        alignItems: "center",
        width: "100%",
        height: 40,
        borderRadius: 10,
        border: "2px solid var(--poster-ink)",
        background: "var(--poster-panel)",
        color: "var(--poster-ink)",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 12,
        fontWeight: 700,
        boxShadow: "2px 2px 0 var(--poster-ink)",
      }}
    >
      <div style={{ display: "grid", width: 44, height: "100%", placeContent: "center" }}>
        <ChevronsRight
          style={{
            width: 14,
            height: 14,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 300ms",
          }}
        />
      </div>
      {open && <span>Daralt</span>}
    </button>
  );
};
