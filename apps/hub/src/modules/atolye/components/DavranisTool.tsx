"use client";

import { useState } from "react";
import { PAlert, PButton, PField, PInput, PSection, PSelect, PSpinner, PTextarea } from "@ludenlab/ui";
import {
  OgrenciProfilForm,
  emptyProfil,
  profilPayload,
  type ProfilState,
} from "@atolye/components/OgrenciProfilForm";
import { ToolResult, type ToolResultData } from "@atolye/components/ToolResult";
import { MebHedefSelect } from "@atolye/components/MebHedefSelect";
import { emptyMebHedef, mebHedefPayload, type MebHedefState } from "@atolye/lib/meb-hedef";
import { type DavranisInput } from "@atolye/lib/davranis";

export function DavranisTool() {
  const [profil, setProfil] = useState<ProfilState>(emptyProfil);
  const [hedefDavranis, setHedefDavranis] = useState("");
  const [ortam, setOrtam] = useState<DavranisInput["ortam"]>("sinif");
  const [siklikSure, setSiklikSure] = useState("");
  const [meb, setMeb] = useState<MebHedefState>(emptyMebHedef);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolResultData | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!profil.rumuz.trim()) return setError("Öğrenci seçin.");
    if (profil.taniProfili.length === 0) return setError("En az bir güçlük alanı seçin.");
    if (!hedefDavranis.trim()) return setError("Hedef davranış gerekli.");

    setLoading(true);
    setResult(null);
    try {
      const payload = {
        ...profilPayload(profil),
        hedefDavranis: hedefDavranis.trim(),
        ortam,
        siklikSure: siklikSure.trim() || undefined,
        ...mebHedefPayload(meb),
      };
      const res = await fetch("/api/davranis", {
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

        <PSection title="Davranış">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <PField
              label="Hedef davranış"
              hint="Gözlenen, azaltılmak/artırılmak istenen davranış."
              htmlFor="d-hedef"
            >
              <PTextarea
                id="d-hedef"
                value={hedefDavranis}
                onChange={(e) => setHedefDavranis(e.target.value)}
                placeholder="Sıra beklerken yerinden kalkıyor, arkadaşının sözünü kesiyor…"
                style={{ minHeight: "4.5rem" }}
              />
            </PField>

            <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "1fr 1fr" }}>
              <PField label="Ortam" htmlFor="d-ortam">
                <PSelect
                  id="d-ortam"
                  value={ortam}
                  onChange={(e) => setOrtam(e.target.value as DavranisInput["ortam"])}
                >
                  <option value="sinif">Sınıf</option>
                  <option value="ev">Ev</option>
                  <option value="seans">Seans</option>
                  <option value="genel">Genel</option>
                </PSelect>
              </PField>
              <PField label="Sıklık / süre" hint="gözlem notu (ops.)" htmlFor="d-siklik">
                <PInput
                  id="d-siklik"
                  value={siklikSure}
                  onChange={(e) => setSiklikSure(e.target.value)}
                  placeholder="günde 4-5 kez, ~2 hafta"
                />
              </PField>
            </div>
          </div>
        </PSection>

        <MebHedefSelect value={meb} onChange={setMeb} oneriler={profil.mebBolumler} />

        {error && <PAlert tone="error">{error}</PAlert>}

        <PButton type="submit" size="lg" disabled={loading}>
          {loading ? (
            <>
              <PSpinner /> Üretiliyor…
            </>
          ) : (
            <>Destek planı üret →</>
          )}
        </PButton>
      </form>

      <ToolResult
        result={result}
        loading={loading}
        title="Davranış destek planı"
        emptyHint="Soldaki profili ve hedef davranışı girip “Destek planı üret” deyin."
        saveType="davranis_destek_plani"
        code={profil.rumuz}
        kademe={profil.kademe}
        mebHedef={mebHedefPayload(meb)}
      />
    </div>
  );
}
