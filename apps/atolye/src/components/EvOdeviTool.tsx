"use client";

import { useState } from "react";
import { PAlert, PButton, PField, PInput, PSection, PSelect, PSpinner, PTextarea } from "@ludenlab/ui";
import {
  OgrenciProfilForm,
  emptyProfil,
  profilPayload,
  type ProfilState,
} from "@/components/OgrenciProfilForm";
import { ToolResult, type ToolResultData } from "@/components/ToolResult";
import { MebHedefSelect } from "@/components/MebHedefSelect";
import { emptyMebHedef, mebHedefPayload, type MebHedefState } from "@/lib/meb-hedef";

export function EvOdeviTool() {
  const [profil, setProfil] = useState<ProfilState>(emptyProfil);
  const [hedefKonu, setHedefKonu] = useState("");
  const [gunSayisi, setGunSayisi] = useState("3");
  const [ekstraNot, setEkstraNot] = useState("");
  const [meb, setMeb] = useState<MebHedefState>(emptyMebHedef);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolResultData | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!profil.rumuz.trim()) return setError("Öğrenci seçin.");
    if (profil.taniProfili.length === 0) return setError("En az bir güçlük alanı seçin.");
    if (!hedefKonu.trim()) return setError("Hedef konuyu/beceriyi girin.");

    setLoading(true);
    setResult(null);
    try {
      const payload = {
        ...profilPayload(profil),
        hedefKonu: hedefKonu.trim(),
        gunSayisi: parseInt(gunSayisi) || 3,
        ekstraNot: ekstraNot.trim() || undefined,
        ...mebHedefPayload(meb),
      };
      const res = await fetch("/api/ev-odevi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Bir hata oluştu.");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "2rem", gridTemplateColumns: "minmax(0, 1fr) 400px", alignItems: "start" }}>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <OgrenciProfilForm value={profil} onChange={setProfil}  />

        <PSection title="Ev Ödevi İçeriği">
          <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <PField label="Hedef Konu / Beceri" hint="Öğrencinin çalışması gereken konuyu belirtin (Örn: b-d harf karışıklığı, okuduğunu anlama)">
              <PInput
                value={hedefKonu}
                onChange={(e) => setHedefKonu(e.target.value)}
                placeholder="Örn: Ses farkındalığı çalışmaları"
                required

              />
            </PField>

            <PField label="Program Süresi (Gün)" hint="Kaç günlük bir ev çalışma programı hazırlansın?">
              <PSelect
                value={gunSayisi}
                onChange={(e) => setGunSayisi(e.target.value)}

              >
                <option value="3">3 Günlük</option>
                <option value="5">5 Günlük</option>
                <option value="7">7 Günlük (Tam Hafta)</option>
              </PSelect>
            </PField>

            <PField label="Ekstra Yönergeler" hint="Özel notlar veya dikkat edilmesi gerekenler (Opsiyonel)">
              <PTextarea
                value={ekstraNot}
                onChange={(e) => setEkstraNot(e.target.value)}
                placeholder="Örn: Görsel materyal ağırlıklı olsun, kes-yapıştır etkinlikleri eklensin..."

                rows={3}
              />
            </PField>
          </div>
        </PSection>

        <MebHedefSelect value={meb} onChange={setMeb} oneriler={profil.mebBolumler} />

        {error && <PAlert tone="error">{error}</PAlert>}

        <PButton type="submit" variant="accent"  style={{ alignSelf: "flex-start", marginTop: "1rem" }}>
          {loading ? (
            <>
              <PSpinner /> Üretiliyor...
            </>
          ) : (
            "Program Üret"
          )}
        </PButton>
      </form>

      <div>
        <div style={{ position: "sticky", top: "1.5rem" }}>
          {result ? (
            <ToolResult result={result} loading={loading} title="Ev Ödevi" emptyHint="Program Üret butonuna tıklayın" saveType="ev-odevi" code={profil.rumuz} kademe={profil.kademe} mebHedef={mebHedefPayload(meb)} />
          ) : (
            <div className="p-card" style={{ padding: "3rem 2rem", textAlign: "center", color: "var(--poster-ink-3)", background: "var(--poster-panel)" }}>
              <span style={{ fontSize: 32, opacity: 0.5, display: "block", marginBottom: 16 }}>📋</span>
              <p className="p-body" style={{ margin: 0, fontSize: "0.95rem" }}>
                Sol taraftaki formu doldurup <strong>Program Üret</strong> butonuna tıklayın.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
