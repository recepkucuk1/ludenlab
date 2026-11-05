"use client";
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { PBtn, PModal, PSpinner, PInput } from "@studio/components/poster";
import { formatDate } from "@studio/lib/utils";
import type { ParentLinkDto } from "@studio/lib/parentLink/schema";

/* Veli bağlantısı modalı (spec §7): oluştur / QR + URL + kopyala / yenile / iptal. QR sabit beyaz zemin + siyah modül
   (taranabilirlik; koyu temada da). */
interface Props { studentId: string; open: boolean; onClose: () => void }

export function ParentLinkModal({ studentId, open, onClose }: Props) {
  const [link, setLink] = useState<ParentLinkDto | null | undefined>(undefined);
  const [svg, setSvg] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"renew" | "revoke" | null>(null);
  const base = `/studio/api/students/${studentId}/parent-link`;

  const load = useCallback(async () => {
    try {
      const r = await fetch(base);
      if (!r.ok) throw new Error();
      setLink(((await r.json()).link ?? null) as ParentLinkDto | null);
    } catch { toast.error("Bağlantı bilgisi yüklenemedi"); setLink(null); }
  }, [base]);

  useEffect(() => { if (open) void load(); }, [open, load]);
  useEffect(() => {
    if (!link) { setSvg(""); return; }
    QRCode.toString(link.url, { type: "svg", margin: 1, width: 200, color: { dark: "#000000", light: "#ffffff" } }).then(setSvg).catch(() => setSvg(""));
  }, [link]);

  async function olustur() {
    setBusy(true);
    try {
      const r = await fetch(base, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(d.error ?? "Bağlantı oluşturulamadı"); if (r.status === 409) await load(); return; }
      setLink(d.link as ParentLinkDto);
      toast.success(confirm === "renew" ? "Bağlantı yenilendi" : "Bağlantı oluşturuldu");
    } catch { toast.error("Bağlantı oluşturulamadı"); } finally { setBusy(false); setConfirm(null); }
  }
  async function iptal() {
    setBusy(true);
    try {
      const r = await fetch(base, { method: "DELETE" });
      if (!r.ok && r.status !== 404) { toast.error("İptal edilemedi"); return; }
      setLink(null); toast.success("Bağlantı iptal edildi");
    } catch { toast.error("İptal edilemedi"); } finally { setBusy(false); setConfirm(null); }
  }
  async function kopyala() {
    if (!link) return;
    try { await navigator.clipboard.writeText(link.url); toast.success("Kopyalandı"); } catch { toast.error("Kopyalanamadı; bağlantıyı elle seçin"); }
  }

  return (
    <PModal open={open} onClose={() => { if (!busy) onClose(); }} title="Veli bağlantısı">
      {link === undefined ? <PSpinner label="Yükleniyor…" /> : link === null ? (
        <div style={{ display: "grid", gap: 12 }}>
          <p style={{ fontSize: 13, margin: 0 }}>Veli, bu bağlantıdan hesap açmadan haftalık geri bildirim gönderir. Sayfada çocuğun adı görünmez; yanıtlar gözlem günlüğüne &quot;Veli&quot; etiketiyle düşer.</p>
          <PBtn as="button" variant="accent" size="sm" onClick={olustur} disabled={busy}>Bağlantı oluştur</PBtn>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {svg && (
            <div role="img" aria-label="Veli bağlantısı QR kodu" style={{ width: 200, height: 200, margin: "0 auto", background: "#ffffff", padding: 6, borderRadius: 12, border: "2px solid var(--poster-ink)" }} dangerouslySetInnerHTML={{ __html: svg }} />
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <PInput readOnly value={link.url} aria-label="Veli bağlantısı" onFocus={(e) => e.currentTarget.select()} />
            <PBtn as="button" variant="white" size="sm" onClick={kopyala}>Kopyala</PBtn>
          </div>
          <p style={{ fontSize: 12, color: "var(--poster-ink-3)", margin: 0 }}>
            Yanıt: {link.answerCount}{link.lastAnsweredAt ? ` · son: ${formatDate(link.lastAnsweredAt, "short")}` : ""} · oluşturma: {formatDate(link.createdAt, "short")}
          </p>
          <p style={{ fontSize: 12, color: "var(--poster-ink-2)", margin: 0 }}>Bağlantıyı velinin telefonuna gönderin ya da ekrandan taratın. Sızdığını düşünürseniz yenileyin.</p>
          {confirm ? (
            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ fontSize: 13, margin: 0 }}>{confirm === "renew" ? "Eski bağlantı geçersiz olur; veliye yenisini göndermeniz gerekir. Devam edilsin mi?" : "Bağlantı iptal edilecek; veli artık yanıt gönderemez. Devam edilsin mi?"}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <PBtn as="button" variant="accent" size="sm" onClick={confirm === "renew" ? olustur : iptal} disabled={busy}>{confirm === "renew" ? "Yenile" : "İptal et"}</PBtn>
                <PBtn as="button" variant="white" size="sm" onClick={() => setConfirm(null)} disabled={busy}>Vazgeç</PBtn>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <PBtn as="button" variant="white" size="sm" onClick={() => setConfirm("renew")} disabled={busy}>Yenile</PBtn>
              <PBtn as="button" variant="white" size="sm" onClick={() => setConfirm("revoke")} disabled={busy}>İptal et</PBtn>
            </div>
          )}
        </div>
      )}
    </PModal>
  );
}
