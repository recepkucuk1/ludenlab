"use client";

import { useState } from "react";
import { PAlert, PButton, PField, PSection, PSelect, PSpinner, PTextarea } from "@ludenlab/ui";
import {
  OgrenciProfilForm,
  emptyProfil,
  profilPayload,
  type ProfilState,
} from "@/components/OgrenciProfilForm";
import { ToolResult, type ToolResultData } from "@/components/ToolResult";
import { type VeliMektubuInput } from "@/lib/veli-mektubu";

export function VeliMektubuTool() {
  const [profil, setProfil] = useState<ProfilState>(emptyProfil);
  const [amac, setAmac] = useState<VeliMektubuInput["amac"]>("bilgilendirme");
  const [notlar, setNotlar] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolResultData | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!profil.rumuz.trim()) return setError("Öğrenci seçin.");
    if (profil.taniProfili.length === 0) return setError("En az bir güçlük alanı seçin.");

    setLoading(true);
    setResult(null);
    try {
      const payload = {
        ...profilPayload(profil),
        amac,
        notlar: notlar.trim() || undefined,
      };
      const res = await fetch("/api/veli-mektubu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as ToolResultData | { error: string };
      if (!res.ok || "error" in data) {
        setError(("error" in data && data.error) || "Bir hata oluştu.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="poster-tool-grid"
      style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}
    >
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
        <PSection title="Öğrenci profili">
          <OgrenciProfilForm value={profil} onChange={setProfil} />
        </PSection>

        <PSection title="Mektup">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <PField label="Amaç" htmlFor="v-amac">
              <PSelect
                id="v-amac"
                value={amac}
                onChange={(e) => setAmac(e.target.value as VeliMektubuInput["amac"])}
              >
                <option value="bilgilendirme">Bilgilendirme</option>
                <option value="ev_etkinligi">Ev etkinliği önerisi</option>
                <option value="gorusme_ozeti">Görüşme özeti</option>
              </PSelect>
            </PField>

            <PField label="Uzman notları" hint="opsiyonel — mektuba yansısın" htmlFor="v-notlar">
              <PTextarea
                id="v-notlar"
                value={notlar}
                onChange={(e) => setNotlar(e.target.value)}
                placeholder="Bu dönem okuma akıcılığına odaklandık; evde 10 dk sesli okuma…"
                style={{ minHeight: "4rem" }}
              />
            </PField>
          </div>
        </PSection>

        {error && <PAlert tone="error">{error}</PAlert>}

        <PButton type="submit" size="lg" disabled={loading}>
          {loading ? (
            <>
              <PSpinner /> Üretiliyor…
            </>
          ) : (
            <>Mektup üret →</>
          )}
        </PButton>
      </form>

      <ToolResult
        result={result}
        loading={loading}
        title="Veli/ev destek mektubu"
        emptyHint="Soldaki profili girip “Mektup üret” deyin."
        saveType="veli_mektubu"
        code={profil.rumuz}
        kademe={profil.kademe}
      />
    </div>
  );
}
