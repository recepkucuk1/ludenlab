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
import { type MatematikInput } from "@/lib/matematik";

export function MatematikTool() {
  const [profil, setProfil] = useState<ProfilState>(emptyProfil);
  const [alanProfili, setAlanProfili] = useState<MatematikInput["alanProfili"]>("sayi_hissi");
  const [kazanimKonu, setKazanimKonu] = useState("");
  const [somutlukDuzeyi, setSomutlukDuzeyi] = useState<MatematikInput["somutlukDuzeyi"]>("somut");
  const [meb, setMeb] = useState<MebHedefState>(emptyMebHedef);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolResultData | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!profil.rumuz.trim()) return setError("Öğrenci seçin.");
    if (profil.taniProfili.length === 0) return setError("En az bir güçlük alanı seçin.");
    if (!kazanimKonu.trim()) return setError("Kazanım/konu gerekli.");

    setLoading(true);
    setResult(null);
    try {
      const payload = {
        ...profilPayload(profil),
        alanProfili,
        kazanimKonu: kazanimKonu.trim(),
        somutlukDuzeyi,
        ...mebHedefPayload(meb),
      };
      const res = await fetch("/api/matematik", {
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

        <PSection title="Matematik ayarları">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <PField label="Alan profili" htmlFor="mat-alan">
              <PSelect
                id="mat-alan"
                value={alanProfili}
                onChange={(e) => setAlanProfili(e.target.value as MatematikInput["alanProfili"])}
              >
                <option value="sayi_hissi">Sayı hissi</option>
                <option value="sayi_buyukluk">Sayı-büyüklük ilişkisi</option>
                <option value="islem_akiciligi">İşlem akıcılığı</option>
                <option value="problem_cozme">Problem çözme</option>
              </PSelect>
            </PField>

            <PField label="Kazanım / konu" hint="Çalışılacak kazanım." htmlFor="mat-konu">
              <PInput
                id="mat-konu"
                value={kazanimKonu}
                onChange={(e) => setKazanimKonu(e.target.value)}
                placeholder="iki basamaklı toplama (eldeli)…"
                maxLength={200}
              />
            </PField>

            <PField label="Başlangıç somutluk düzeyi" htmlFor="mat-somut">
              <PSelect
                id="mat-somut"
                value={somutlukDuzeyi}
                onChange={(e) => setSomutlukDuzeyi(e.target.value as MatematikInput["somutlukDuzeyi"])}
              >
                <option value="somut">Somut</option>
                <option value="yari_somut">Yarı-somut</option>
                <option value="soyut">Soyut</option>
              </PSelect>
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
            <>Matematik seti üret →</>
          )}
        </PButton>
      </form>

      <ToolResult
        result={result}
        loading={loading}
        title="Matematik destek seti"
        emptyHint="Soldaki profili ve kazanımı girip “Matematik seti üret” deyin."
        saveType="matematik_destek_seti"
        code={profil.rumuz}
        kademe={profil.kademe}
        mebHedef={mebHedefPayload(meb)}
      />
    </div>
  );
}
