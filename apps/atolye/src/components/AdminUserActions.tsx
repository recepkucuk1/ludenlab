"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PButton, PSpinner, toast } from "@ludenlab/ui";

/* Admin → hesap detayındaki eylemler: rol değiştir + hesabı sil. Kendi hesabında gizli. */

export function AdminUserActions({
  id,
  role,
  isSelf,
}: {
  id: string;
  role: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (isSelf) {
    return (
      <span style={{ color: "var(--poster-ink-3)", fontSize: "0.85rem" }}>Bu sizin hesabınız.</span>
    );
  }

  async function toggleRole() {
    const next = role === "admin" ? "practitioner" : "admin";
    if (!confirm(`Rol "${next}" olarak değiştirilsin mi?`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    });
    setBusy(false);
    if (res.ok) {
      toast.success("Rol güncellendi");
      router.refresh();
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(d.error ?? "Güncellenemedi");
    }
  }

  async function remove() {
    if (
      !confirm(
        "Bu hesap ve TÜM verileri (öğrenciler, taslaklar, seanslar) kalıcı olarak silinsin mi? Geri alınamaz.",
      )
    )
      return;
    setBusy(true);
    const res = await fetch(`/api/admin/accounts/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      toast.success("Hesap silindi");
      router.push("/admin");
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(d.error ?? "Silinemedi");
    }
  }

  return (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      <PButton size="sm" variant="ghost" onClick={toggleRole} disabled={busy}>
        {busy ? <PSpinner /> : role === "admin" ? "Admin'i kaldır" : "Admin yap"}
      </PButton>
      <PButton size="sm" variant="danger" onClick={remove} disabled={busy}>
        Hesabı sil
      </PButton>
    </div>
  );
}
