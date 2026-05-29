"use client";

import { signOut } from "next-auth/react";
import { PButton } from "@ludenlab/ui";

export function LogoutButton() {
  return (
    <PButton size="sm" variant="ghost" onClick={() => signOut({ callbackUrl: "/" })}>
      Çıkış
    </PButton>
  );
}
