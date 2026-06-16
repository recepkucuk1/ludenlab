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
import { type SosyalOykuInput } from "@atolye/lib/sosyal-oyku";

export function SosyalOykuTool() {
  const [profil, setProfil] = useState<ProfilState>(emptyProfil);
  const [durum, setDurum] = useState("");
  const [bakisAcisi, setBakisAcisi] = useState<SosyalOykuInput["bakisAcisi"]>("birinci_kisi");
  const [hedefBeceri, setHedefBeceri] = useState("");
  const [meb, setMeb] = useState<MebHedefState>(emptyMebHedef);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolResultData | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!profil.rumuz.trim()) return setError("Öğrenci seçin.");
    if (profil.taniProfili.length === 0) return setError("En az bir güçlük alanı seçin.");
    if (!durum.trim()) return setError("Durum/senaryo gerekli.");

    setLoading(true);
    setResult(null);
    try {
      const payload = {
        ...profilPayload(profil),
        durum: durum.trim(),
        bakisAcisi,
        hedefBeceri: hedefBeceri.trim() || undefined,
        ...mebHedefPayload(meb),
      };
      const res = await fetch("/atolye/api/sosyal-oyku", {
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

        <PSection title="Senaryo">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <PField label="Durum" hint="Hangi durum için öykü?" htmlFor="so-durum">
              <PTextarea
                id="so-durum"
                value={durum}
                onChange={(e) => setDurum(e.target.value)}
                placeholder="Sıra beklemek / oyunu kaybetmek / geçişler / arkadaşına dokunmadan konuşmak…"
                style={{ minHeight: "4rem" }}
              />
            </PField>

            <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "1fr 1fr" }}>
              <PField label="Bakış açısı" htmlFor="so-bakis">
                <PSelect
                  id="so-bakis"
                  value={bakisAcisi}
                  onChange={(e) => setBakisAcisi(e.target.value as SosyalOykuInput["bakisAcisi"])}
                >
                  <option value="birinci_kisi">Birinci kişi (ben)</option>
                  <option value="ucuncu_kisi">Üçüncü kişi</option>
                </PSelect>
              </PField>
              <PField label="Hedef beceri" hint="opsiyonel" htmlFor="so-beceri">
                <PInput
                  id="so-beceri"
                  value={hedefBeceri}
                  onChange={(e) => setHedefBeceri(e.target.value)}
                  placeholder="yardım iste, mola al…"
                  maxLength={200}
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
            <>Sosyal öykü üret →</>
          )}
        </PButton>
      </form>

      <ToolResult
        result={result}
        loading={loading}
        title="Sosyal öykü"
        emptyHint="Soldaki profili ve durumu girip “Sosyal öykü üret” deyin."
        saveType="sosyal_oyku"
        code={profil.rumuz}
        kademe={profil.kademe}
        mebHedef={mebHedefPayload(meb)}
      />
    </div>
  );
}
