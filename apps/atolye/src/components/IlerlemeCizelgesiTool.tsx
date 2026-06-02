"use client";

import { useState } from "react";
import { PAlert, PButton, PField, PSection, PSpinner, PTextarea } from "@ludenlab/ui";
import {
  OgrenciProfilForm,
  emptyProfil,
  profilPayload,
  type ProfilState,
} from "@/components/OgrenciProfilForm";
import { ToolResult, type ToolResultData } from "@/components/ToolResult";
import { MebHedefSelect } from "@/components/MebHedefSelect";
import { emptyMebHedef, mebHedefPayload, type MebHedefState } from "@/lib/meb-hedef";

export function IlerlemeCizelgesiTool() {
  const [profil, setProfil] = useState<ProfilState>(emptyProfil);
  const [hedefMetni, setHedefMetni] = useState("");
  const [meb, setMeb] = useState<MebHedefState>(emptyMebHedef);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolResultData | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!profil.rumuz.trim()) return setError("Öğrenci seçin.");
    if (profil.taniProfili.length === 0) return setError("En az bir güçlük alanı seçin.");
    if (!hedefMetni.trim()) return setError("Ölçülebilir hedef gerekli.");

    setLoading(true);
    setResult(null);
    try {
      const payload = {
        ...profilPayload(profil),
        hedefMetni: hedefMetni.trim(),
        ...mebHedefPayload(meb),
      };
      const res = await fetch("/api/ilerleme-cizelgesi", {
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

        <PSection title="Hedef">
          <PField
            label="Ölçülebilir hedef"
            hint="Genelde BEP'ten gelir (davranış + ölçüt + koşul)."
            htmlFor="ic-hedef"
          >
            <PTextarea
              id="ic-hedef"
              value={hedefMetni}
              onChange={(e) => setHedefMetni(e.target.value)}
              placeholder="İki sözcüklü yönergeleri %80 doğrulukla, sözel ipucuyla takip eder."
              style={{ minHeight: "5rem" }}
            />
          </PField>
        </PSection>

        <MebHedefSelect value={meb} onChange={setMeb} oneriler={profil.mebBolumler} />

        {error && <PAlert tone="error">{error}</PAlert>}

        <PButton type="submit" size="lg" disabled={loading}>
          {loading ? (
            <>
              <PSpinner /> Üretiliyor…
            </>
          ) : (
            <>Çizelge üret →</>
          )}
        </PButton>
      </form>

      <ToolResult
        result={result}
        loading={loading}
        title="İlerleme izleme çizelgesi"
        emptyHint="Soldaki profili ve ölçülebilir hedefi girip “Çizelge üret” deyin."
        saveType="ilerleme_cizelgesi"
        code={profil.rumuz}
        kademe={profil.kademe}
        mebHedef={mebHedefPayload(meb)}
      />
    </div>
  );
}
