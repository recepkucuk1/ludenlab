"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookie-consent")) {
      setVisible(true);
    }
  }, []);

  function handleAccept() {
    localStorage.setItem("cookie-consent", "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#023435] border-t border-white/10 px-4 py-3">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-sm text-white/80 text-center sm:text-left">
          Bu site, oturum yönetimi için zorunlu çerezler kullanmaktadır.
          Detaylı bilgi için{" "}
          <Link href="/cookie-policy" className="text-[#FE703A] underline hover:text-[#FE703A]/80">
            Çerez Politikası
          </Link>
          &apos;nı inceleyebilirsiniz.
        </p>
        <button
          onClick={handleAccept}
          className="shrink-0 bg-[#FE703A] hover:bg-[#FE703A]/90 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
        >
          Tamam
        </button>
      </div>
    </div>
  );
}
