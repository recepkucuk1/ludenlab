import React from "react";
import { PosterHeader } from "@/components/landing/poster-header";
import { PosterFooter } from "@/components/landing/poster-footer";
import { ForceLightTheme } from "@/components/ForceLightTheme";

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="poster-scope" style={{ minHeight: "100vh" }}>
      <ForceLightTheme />
      <PosterHeader />
      <main>{children}</main>
      <PosterFooter />
    </div>
  );
}
