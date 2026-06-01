"use client";

import { useState } from "react";
import { PAlert, PButton, PField, PInput, PSection, PSelect, PSpinner } from "@ludenlab/ui";
import {
  OgrenciProfilForm,
  emptyProfil,
  profilPayload,
  type ProfilState,
} from "@/components/OgrenciProfilForm";
import { ToolResult, type ToolResultData } from "@/components/ToolResult";
import { type UyarlamaInput } from "@/lib/uyarlama";

export function UyarlamaTool() {
  const [profil, setProfil] = useState<ProfilState>(emptyProfil);
  const [ders, setDers] = useState("");
  const [ortam, setOrtam] = useState<UyarlamaInput["ortam"]>("kaynastirma");

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
        ders: ders.trim() || undefined,
        ortam,
      };
      const res = await fetch("/api/uyarlama", {
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

        <PSection title="Bağlam">
          <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "1fr 1fr" }}>
            <PField label="Ders" hint="opsiyonel" htmlFor="u-ders">
              <PInput
                id="u-ders"
                value={ders}
                onChange={(e) => setDers(e.target.value)}
                placeholder="matematik, fen, Türkçe…"
                maxLength={120}
              />
            </PField>
            <PField label="Ortam" htmlFor="u-ortam">
              <PSelect
                id="u-ortam"
                value={ortam}
                onChange={(e) => setOrtam(e.target.value as UyarlamaInput["ortam"])}
              >
                <option value="kaynastirma">Kaynaştırma sınıfı</option>
                <option value="ozel_egitim_sinifi">Özel eğitim sınıfı</option>
                <option value="destek_egitim_odasi">Destek eğitim odası</option>
                <option value="ev">Ev</option>
              </PSelect>
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
            <>Uyarlama önerisi üret →</>
          )}
        </PButton>
      </form>

      <ToolResult
        result={result}
        loading={loading}
        title="Bireysel uyarlama önerisi"
        emptyHint="Soldaki profili girip “Uyarlama önerisi üret” deyin."
        saveType="uyarlama_onerisi"
        code={profil.rumuz}
        kademe={profil.kademe}
      />
    </div>
  );
}
