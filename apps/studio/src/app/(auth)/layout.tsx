import type { ReactNode } from "react";
import { ForceLightTheme } from "@/components/ForceLightTheme";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ForceLightTheme />
      <main id="main-content">{children}</main>
    </>
  );
}
