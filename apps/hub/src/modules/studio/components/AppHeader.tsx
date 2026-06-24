"use client";

import Link from "next/link";
import { Logo } from "@ludenlab/ui";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@studio/lib/utils";
import { ThemeToggle } from "@studio/components/ThemeToggle";

const NAV_ITEMS = [
  { href: "/studio/dashboard", label: "Dashboard" },
  { href: "/studio/students", label: "Öğrenciler" },
  { href: "/studio/calendar", label: "Takvim" },
  { href: "/studio/cards", label: "Kartlar" },
  { href: "/studio/generate", label: "Kart Üret" },
];

export function AppHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
      if (mobileRef.current && !mobileRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  // Sayfa değişince mobil menüyü kapat
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Mobil menü açıldığında background scroll'u kilitle
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <header className="sticky top-0 z-40 bg-[#023435]">
      {/* Ana bar */}
      <div className="px-6 py-3">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-4">
          {/* Sol: Logo */}
          <Link href="/studio/dashboard" className="shrink-0">
            <Logo tone="onDark" height={40} />
          </Link>

          {/* Orta: Nav — masaüstü */}
          <nav className="hidden sm:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive(item.href)
                    ? "text-[#FE703A] font-semibold hover:bg-white/10"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )}
              >
                {item.label}
              </Link>
            ))}
            {session?.user?.role === "admin" && (
              <Link
                href="/studio/admin/users"
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive("/admin")
                    ? "text-[#FE703A] font-semibold hover:bg-white/10"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )}
              >
                Admin
              </Link>
            )}
          </nav>

          {/* Sağ: Kullanıcı dropdown + hamburger */}
          <div className="flex items-center gap-2">
            <ThemeToggle
              variant="segmented"
              className="hidden sm:inline-flex bg-white/10 border-white/20 [&_button]:text-white/70 [&_button:hover]:text-white [&_button[aria-checked=true]]:bg-white/20 [&_button[aria-checked=true]]:text-white"
            />
            <ThemeToggle
              variant="compact"
              className="sm:hidden text-white/70 hover:text-white hover:bg-white/10"
            />
            {session?.user && (
              <div className="relative hidden sm:block" ref={dropdownRef}>
                <button
                  onClick={() => setOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white/80 hover:bg-white/10 transition-colors"
                >
                  <span className="max-w-[120px] truncate">{session.user.name}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-zinc-400 transition-transform duration-150",
                      open && "rotate-180"
                    )}
                  />
                </button>

                {open && (
                  <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-zinc-200 bg-white shadow-lg py-1.5">
                    {session.user.role === "admin" && (
                      <Link
                        href="/studio/admin/users"
                        onClick={() => setOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-[#023435] dark:text-foreground font-medium hover:bg-[#023435]/5 dark:hover:bg-accent/30 transition-colors"
                      >
                        Admin Panel
                      </Link>
                    )}
                    <Link
                      href="/studio/profile"
                      onClick={() => setOpen(false)}
                      className="flex items-center px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                    >
                      Profil
                    </Link>
                    <button
                      disabled
                      className="flex w-full items-center justify-between px-4 py-2 text-sm text-zinc-400 cursor-not-allowed"
                    >
                      <span>Ayarlar</span>
                      <span className="text-xs text-zinc-300">Yakında</span>
                    </button>
                    <button
                      disabled
                      className="flex w-full items-center justify-between px-4 py-2 text-sm text-zinc-400 cursor-not-allowed"
                    >
                      <span>Üyelik</span>
                      <span className="text-xs text-zinc-300">Yakında</span>
                    </button>
                    <button
                      disabled
                      className="flex w-full items-center justify-between px-4 py-2 text-sm text-zinc-400 cursor-not-allowed"
                    >
                      <span>Kullanım</span>
                      <span className="text-xs text-zinc-300">Yakında</span>
                    </button>
                    <div className="my-1 border-t border-zinc-100" />
                    <button
                      onClick={() => {
                        setOpen(false);
                        signOut({ callbackUrl: "/giris" });
                      }}
                      className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Çıkış Yap
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Hamburger butonu — sadece mobil */}
            <div className="sm:hidden" ref={mobileRef}>
              <button
                onClick={() => setMobileOpen((v) => !v)}
                className="rounded-lg p-2 text-white/70 hover:bg-white/10 transition-colors"
                aria-label="Menüyü aç"
              >
                {mobileOpen ? (
                  /* X ikonu */
                  <X className="h-5 w-5" />
                ) : (
                  /* Hamburger ikonu */
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobil menü */}
      {mobileOpen && (
        <div className="sm:hidden fixed top-[64px] inset-x-0 bottom-0 z-40 bg-[#023435]/95 backdrop-blur-md px-4 pb-6 pt-4 space-y-1 overflow-y-auto overscroll-contain animate-in fade-in slide-in-from-top-4 duration-300">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "text-[#FE703A] bg-white/5"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              {item.label}
            </Link>
          ))}
          {session?.user && (
            <>
              <div className="h-px bg-white/10 my-1" />
              {session.user.role === "admin" && (
                <Link
                  href="/studio/admin/users"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-4 py-2.5 text-sm font-medium text-[#FE703A] hover:bg-white/10 transition-colors"
                >
                  Admin Panel
                </Link>
              )}
              <Link
                href="/studio/profile"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                Profil
              </Link>
              <button
                onClick={() => { setMobileOpen(false); signOut({ callbackUrl: "/giris" }); }}
                className="block w-full text-left rounded-lg px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-white/5 transition-colors"
              >
                Çıkış Yap
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
