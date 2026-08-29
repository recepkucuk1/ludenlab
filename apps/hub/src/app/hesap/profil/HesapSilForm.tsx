"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PAlert, PButton, PCard, PField, PInput } from "@ludenlab/ui";

/**
 * Self-servis hesap silme — "tehlikeli bölge" (2026-08 denetimi #03).
 *
 * Geri alınamaz bir eylem olduğu için arayüz bilerek SÜRTÜNMELİ:
 *   · varsayılan olarak kapalı (önce "Hesabımı silmek istiyorum" denir)
 *   · ne silinip ne kalacağı AÇIKÇA yazılır (fatura kayıtları yasal olarak kalır)
 *   · şifre + sabit onay ifadesi istenir (sunucu da ikisini doğrular)
 */
const CONFIRM_PHRASE = "HESABIMI SİL";

export function HesapSilForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ready = password.length > 0 && confirm.trim() === CONFIRM_PHRASE;

  async function onDelete(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Hesap silinemedi.");
      // Hesap yok; oturum sunucuda kapatıldı → ana sayfaya.
      router.push("/?silindi=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.");
      setLoading(false);
    }
  }

  return (
    <PCard style={{ borderColor: "var(--poster-danger, #c53030)" }}>
      <h3 className="p-h3" style={{ margin: 0, fontSize: "1.05rem", color: "var(--poster-danger, #c53030)" }}>
        Hesabı sil
      </h3>
      <p className="p-small" style={{ color: "var(--poster-ink-3)", margin: "8px 0 0", lineHeight: 1.6 }}>
        Bu işlem <strong>geri alınamaz</strong>. Aboneliğin varsa ödeme sağlayıcısında iptal
        edilir ve bir daha tahsilat yapılmaz.
      </p>
      <ul className="p-small" style={{ color: "var(--poster-ink-3)", margin: "10px 0 0", paddingLeft: "1.1rem", lineHeight: 1.7 }}>
        <li><strong>Silinir:</strong> hesabın, öğrenci/danışan kayıtların, ürettiğin tüm içerik ve fatura profilin (TCKN/adres dâhil).</li>
        <li><strong>Kalır:</strong> geçmiş <strong>ödeme/fatura kayıtları</strong> — vergi mevzuatı (VUK) bunların saklanmasını zorunlu kılar. Bu kayıtlar hesabınla ilişkilendirilmez.</li>
      </ul>

      {!open ? (
        <PButton
          type="button"
          variant="ghost"
          onClick={() => setOpen(true)}
          style={{ marginTop: 16, color: "var(--poster-danger, #c53030)" }}
        >
          Hesabımı silmek istiyorum
        </PButton>
      ) : (
        <form onSubmit={onDelete} style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <PField label="Mevcut şifren">
            <PInput
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </PField>
          <PField label={`Onaylamak için "${CONFIRM_PHRASE}" yaz`}>
            <PInput
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              required
            />
          </PField>

          {error && <PAlert tone="error">{error}</PAlert>}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <PButton type="submit" disabled={!ready || loading}>
              {loading ? "Siliniyor…" : "Hesabımı kalıcı olarak sil"}
            </PButton>
            <PButton
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setPassword("");
                setConfirm("");
                setError(null);
              }}
              disabled={loading}
            >
              Vazgeç
            </PButton>
          </div>
        </form>
      )}
    </PCard>
  );
}
