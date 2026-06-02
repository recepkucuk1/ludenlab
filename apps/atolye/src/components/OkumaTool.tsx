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
import { MebHedefSelect } from "@/components/MebHedefSelect";
import { emptyMebHedef, mebHedefPayload, type MebHedefState } from "@/lib/meb-hedef";
import { type OkumaInput } from "@/lib/okuma";

export function OkumaTool() {
  const [profil, setProfil] = useState<ProfilState>(emptyProfil);
  const [okumaDuzeyi, setOkumaDuzeyi] = useState<OkumaInput["okumaDuzeyi"]>("kelime");
  const [hedefAkicilik, setHedefAkicilik] = useState("");
  const [takilanDesenler, setTakilanDesenler] = useState("");
  const [meb, setMeb] = useState<MebHedefState>(emptyMebHedef);

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
        okumaDuzeyi,
        hedefAkicilik: hedefAkicilik.trim() || undefined,
        takilanDesenler: takilanDesenler.trim() || undefined,
        ...mebHedefPayload(meb),
      };
      const res = await fetch("/api/okuma", {
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

        <PSection title="Okuma ayarları">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <PField label="Çalışma düzeyi" htmlFor="o-duzey">
              <PSelect
                id="o-duzey"
                value={okumaDuzeyi}
                onChange={(e) => setOkumaDuzeyi(e.target.value as OkumaInput["okumaDuzeyi"])}
              >
                <option value="hece">Hece</option>
                <option value="kelime">Kelime</option>
                <option value="cumle">Cümle</option>
                <option value="paragraf">Paragraf</option>
              </PSelect>
            </PField>

            <PField label="Hedef akıcılık" hint="opsiyonel" htmlFor="o-hedef">
              <PInput
                id="o-hedef"
                value={hedefAkicilik}
                onChange={(e) => setHedefAkicilik(e.target.value)}
                placeholder="45 → 70 kelime/dk"
                maxLength={120}
              />
            </PField>

            <PField label="Takılınan desenler" hint="opsiyonel" htmlFor="o-desen">
              <PInput
                id="o-desen"
                value={takilanDesenler}
                onChange={(e) => setTakilanDesenler(e.target.value)}
                placeholder="b-d karışımı, çift ünsüz, uzun heceler…"
                maxLength={300}
              />
            </PField>
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
            <>Okuma seti üret →</>
          )}
        </PButton>
      </form>

      <ToolResult
        result={result}
        loading={loading}
        title="Okuma-akıcılık seti"
        emptyHint="Soldaki profili girip “Okuma seti üret” deyin."
        saveType="okuma_akicilik_seti"
        code={profil.rumuz}
        kademe={profil.kademe}
        mebHedef={mebHedefPayload(meb)}
      />
    </div>
  );
}
