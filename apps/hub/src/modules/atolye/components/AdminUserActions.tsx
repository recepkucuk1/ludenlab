"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PButton, PSpinner, toast } from "@ludenlab/ui";

/* Admin → hesap detayı eylemleri: rol değiştir + askıya al/kaldır + sil. Kendi hesabında gizli. */

export function AdminUserActions({
  id,
  role,
  suspended,
  isSelf,
}: {
  id: string;
  role: string;
  suspended: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (isSelf) {
    return (
      <span style={{ color: "var(--poster-ink-3)", fontSize: "0.85rem" }}>Bu sizin hesabınız.</span>
    );
  }

  async function patch(body: Record<string, unknown>, ok: string) {
    setBusy(true);
    const res = await fetch(`/atolye/api/admin/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) {
      toast.success(ok);
      router.refresh();
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(d.error ?? "İşlem başarısız");
    }
  }

  async function toggleRole() {
    const next = role === "admin" ? "practitioner" : "admin";
    if (!confirm(`Rol "${next}" olarak değiştirilsin mi?`)) return;
    await patch({ role: next }, "Rol güncellendi");
  }

  async function toggleSuspend() {
    const next = !suspended;
    if (!confirm(next ? "Hesap askıya alınsın mı? Kullanıcı giriş yapamaz." : "Askı kaldırılsın mı?"))
      return;
    await patch({ suspended: next }, next ? "Hesap askıya alındı" : "Askı kaldırıldı");
  }

  async function remove() {
    if (
      !confirm(
        "Bu hesap ve TÜM verileri (öğrenciler, taslaklar, seanslar) kalıcı olarak silinsin mi? Geri alınamaz.",
      )
    )
      return;
    setBusy(true);
    const res = await fetch(`/atolye/api/admin/accounts/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      toast.success("Hesap silindi");
      router.push("/atolye/admin");
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
      <PButton size="sm" variant="ghost" onClick={toggleSuspend} disabled={busy}>
        {suspended ? "Askıyı kaldır" : "Askıya al"}
      </PButton>
      <PButton size="sm" variant="danger" onClick={remove} disabled={busy}>
        Hesabı sil
      </PButton>
    </div>
  );
}
